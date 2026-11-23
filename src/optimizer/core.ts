// Optimizador de builds: dado un conjunto de habilidades objetivo, busca combinaciones de
// armadura + amuleto + joyas que las cumplan. Búsqueda en profundidad con poda por
// dominancia (Pareto) y cotas superiores; el reparto de joyas se resuelve con memoización.
import { ARMOR_TYPES, type ArmorType, type RawData } from '../types'

export interface OptimizerInput {
  targets: { skill: number; level: number }[]
  weaponSlots: number[]
  weaponSkill: number | null
  weaponBonus: number | null
  fixed: Partial<Record<ArmorType, number>>
  excluded: number[]
  useCharm: boolean
  ranks: ('LR' | 'HR' | 'MR')[]
  maxResults: number
  timeLimitMs: number
}

export interface OptimizerResult {
  armor: Record<ArmorType, number | null>
  charm: number | null
  decos: { weapon: (number | null)[]; armor: Record<ArmorType, (number | null)[]> }
  freeSlots: number[]
  defense: number
}

export interface OptimizerOutput {
  results: OptimizerResult[]
  explored: number
  combosChecked: number
  timedOut: boolean
  ms: number
  candidateCounts: Record<string, number>
  warnings: string[]
}

interface Cand {
  id: number | null
  pts: number[]
  slots: number[]
  bonus: number | null
  def: number
  slotPot: number[]
  slotAll: number
  value: number
}

type Level = { key: ArmorType | 'charm'; cands: Cand[] }

export function optimize(data: RawData, input: OptimizerInput, onProgress?: (found: number, checked: number) => void): OptimizerOutput {
  const t0 = Date.now()
  const warnings: string[] = []
  const skillById = new Map(data.skills.map((s) => [s.id, s]))
  const bonusSkill = new Map<number, { bonus: number; pieces: number }>()
  for (const b of data.setBonuses) for (const r of b.ranks) bonusSkill.set(r.skill, { bonus: b.id, pieces: r.pieces })

  // --- Normalizar objetivos ---
  const pointTargets = new Map<number, number>()
  const bonusTargets = new Map<number, number>() // bonusId -> piezas requeridas
  for (const t of input.targets) {
    const sk = skillById.get(t.skill)
    if (!sk || t.level <= 0) continue
    const viaBonus = bonusSkill.get(t.skill)
    const obtainableByGear =
      data.armor.some((a) => a.skills.some(([s]) => s === t.skill)) || data.decorations.some((d) => d.skills.some(([s]) => s === t.skill))
    if (viaBonus && !obtainableByGear) {
      bonusTargets.set(viaBonus.bonus, Math.max(bonusTargets.get(viaBonus.bonus) ?? 0, viaBonus.pieces))
      continue
    }
    const unlockMax = sk.max - sk.secret
    pointTargets.set(t.skill, Math.max(pointTargets.get(t.skill) ?? 0, Math.min(t.level, sk.max)))
    if (t.level > unlockMax) {
      const secret = data.skills.find((s) => s.unlocks === t.skill)
      const sb = secret ? bonusSkill.get(secret.id) : undefined
      if (sb) {
        bonusTargets.set(sb.bonus, Math.max(bonusTargets.get(sb.bonus) ?? 0, sb.pieces))
        warnings.push(`${sk.es} nv${t.level} requiere "${secret!.es}": se añadió como requisito.`)
      }
    }
  }
  if (!pointTargets.size && !bonusTargets.size)
    return { results: [], explored: 0, combosChecked: 0, timedOut: false, ms: 0, candidateCounts: {}, warnings: ['Añade al menos una habilidad objetivo.'] }
  const tSkills = [...pointTargets.keys()]
  const tLevels = tSkills.map((s) => pointTargets.get(s)!)
  const T = tSkills.length
  const tIndex = new Map(tSkills.map((s, i) => [s, i]))
  const relevantBonus = new Set<number>(bonusTargets.keys())
  // bonus que dan alguna habilidad objetivo
  const bonusGivesTarget = new Map<number, number[]>()
  for (const b of data.setBonuses)
    for (const r of b.ranks)
      if (tIndex.has(r.skill)) {
        relevantBonus.add(b.id)
        bonusGivesTarget.set(b.id, [...(bonusGivesTarget.get(b.id) ?? []), r.skill])
      }

  const capped = (pairs: [number, number][]) => {
    const v = new Array(T).fill(0)
    for (const [s, l] of pairs) {
      const i = tIndex.get(s)
      if (i != null) v[i] = Math.min(tLevels[i], v[i] + l)
    }
    return v
  }

  // --- Joyas relevantes ---
  const decos = data.decorations
    .map((d) => ({ id: d.id, size: d.size, pts: capped(d.skills) }))
    .filter((d) => d.pts.some((p) => p > 0))
  // máximo de puntos por tamaño de ranura (por habilidad y total)
  const maxPer = Array.from({ length: T }, () => [0, 0, 0, 0, 0])
  const maxAll = [0, 0, 0, 0, 0]
  for (let s = 1; s <= 4; s++)
    for (const d of decos)
      if (d.size <= s) {
        d.pts.forEach((p, i) => (maxPer[i][s] = Math.max(maxPer[i][s], p)))
        maxAll[s] = Math.max(maxAll[s], d.pts.reduce((a, b) => a + b, 0))
      }
  const decosBySkill = tSkills.map((_, i) =>
    decos.filter((d) => d.pts[i] > 0).sort((a, b) => b.pts[i] - a.pts[i] || a.size - b.size || b.pts.reduce((x, y) => x + y) - a.pts.reduce((x, y) => x + y)),
  )

  const mkCand = (id: number | null, pairs: [number, number][], slots: number[], bonus: number | null, def: number): Cand => {
    const pts = capped(pairs)
    const sorted = [...slots].sort((a, b) => b - a)
    const slotPot = tSkills.map((_, i) => sorted.reduce((s, sz) => s + maxPer[i][sz], 0))
    const slotAll = sorted.reduce((s, sz) => s + maxAll[sz], 0)
    const rb = bonus != null && relevantBonus.has(bonus) ? bonus : null
    return { id, pts, slots: sorted, bonus: rb, def, slotPot, slotAll, value: pts.reduce((a, b) => a + b, 0) + slotAll }
  }

  const dominates = (a: Cand, b: Cand) => {
    if (b.bonus != null && a.bonus !== b.bonus) return false
    for (let i = 0; i < T; i++) if (a.pts[i] < b.pts[i]) return false
    for (let i = 0; i < 3; i++) if ((a.slots[i] ?? 0) < (b.slots[i] ?? 0)) return false
    return true
  }
  const pareto = (cands: Cand[]) => {
    const sorted = [...cands].sort((a, b) => b.value - a.value || b.def - a.def)
    const kept: Cand[] = []
    for (const c of sorted) if (!kept.some((k) => dominates(k, c))) kept.push(c)
    return kept
  }

  const excluded = new Set(input.excluded)
  const levels: Level[] = ARMOR_TYPES.map((type) => {
    const fixedId = input.fixed[type]
    const pool = data.armor.filter((a) =>
      a.type === type && (fixedId != null ? a.id === fixedId : input.ranks.includes(a.rank) && !excluded.has(a.id)),
    )
    let cands = pareto(pool.map((a) => mkCand(a.id, a.skills, a.slots, a.bonus, a.def[2] || a.def[1])))
    if (!cands.length) cands = [mkCand(null, [], [], null, 0)]
    return { key: type, cands }
  })
  if (input.useCharm) {
    // solo amuletos de nivel máximo de cada cadena (los anteriores quedan dominados)
    const hasNext = new Set(data.charms.map((c) => c.prev).filter((x) => x != null))
    const pool = data.charms.filter((c) => !hasNext.has(c.id)).map((c) => mkCand(c.id, c.skills, [], null, 0)).filter((c) => c.value > 0)
    levels.push({ key: 'charm', cands: pool.length ? pareto(pool) : [mkCand(null, [], [], null, 0)] })
  }
  levels.sort((a, b) => a.cands.length - b.cands.length)
  const L = levels.length
  const candidateCounts = Object.fromEntries(levels.map((l) => [l.key, l.cands.length]))

  // --- Cotas (sufijos) ---
  const sufSkill = Array.from({ length: L + 1 }, () => new Array(T).fill(0))
  const sufAll = new Array(L + 1).fill(0)
  const sufBonus = Array.from({ length: L + 1 }, () => new Map<number, number>())
  for (let k = L - 1; k >= 0; k--) {
    const cs = levels[k].cands
    for (let i = 0; i < T; i++) sufSkill[k][i] = sufSkill[k + 1][i] + Math.max(...cs.map((c) => c.pts[i] + c.slotPot[i]))
    sufAll[k] = sufAll[k + 1] + Math.max(...cs.map((c) => c.value))
    for (const [b, v] of sufBonus[k + 1]) sufBonus[k].set(b, v)
    for (const b of relevantBonus) if (cs.some((c) => c.bonus === b)) sufBonus[k].set(b, (sufBonus[k].get(b) ?? 0) + 1)
  }
  // un bonus de set puede aportar +1 a una habilidad objetivo
  const bonusSlack = new Array(T).fill(0)
  for (const [, skills] of bonusGivesTarget) for (const s of skills) bonusSlack[tIndex.get(s)!] = 1

  // --- Estado inicial (arma) ---
  const wCand = mkCand(null, input.weaponSkill != null ? [[input.weaponSkill, 1]] : [], input.weaponSlots, input.weaponBonus, 0)
  const cur = [...wCand.pts]
  const curSlotPot = [...wCand.slotPot]
  let curSlotAll = wCand.slotAll
  const slotCounts = [0, 0, 0, 0, 0]
  for (const s of wCand.slots) slotCounts[s]++
  const bonusCount = new Map<number, number>()
  if (wCand.bonus != null) bonusCount.set(wCand.bonus, 1)

  // --- Relleno de joyas (memoizado) ---
  const memo = new Map<string, number[] | null>()
  const fill = (def: number[], counts: number[]): number[] | null => {
    let first = -1
    let sum = 0
    for (let i = 0; i < T; i++) if (def[i] > 0) { sum += def[i]; if (first < 0) first = i }
    if (first < 0) return []
    let cap = 0
    for (let s = 1; s <= 4; s++) cap += counts[s] * maxAll[s]
    if (sum > cap) return null
    const key = def.join(',') + '|' + counts.join(',')
    const hit = memo.get(key)
    if (hit !== undefined) return hit
    let result: number[] | null = null
    for (const d of decosBySkill[first]) {
      let s = d.size
      while (s <= 4 && counts[s] === 0) s++
      if (s > 4) continue
      counts[s]--
      const nd = def.map((v, i) => Math.max(0, v - d.pts[i]))
      const r = fill(nd, counts)
      counts[s]++
      if (r) { result = [d.id, ...r]; break }
    }
    if (memo.size > 2_000_000) memo.clear()
    memo.set(key, result)
    return result
  }

  // --- DFS ---
  const chosen: (Cand | null)[] = new Array(L).fill(null)
  const found: { chosen: Cand[]; decos: number[]; free: number[] }[] = []
  const maxCollect = Math.max(input.maxResults * 50, 2000)
  let explored = 0
  let combosChecked = 0
  let timedOut = false
  let lastProgress = t0

  const feasibleBound = (k: number) => {
    let sumDef = 0
    for (let i = 0; i < T; i++) {
      const d = tLevels[i] - cur[i] - bonusSlack[i]
      if (d <= 0) continue
      if (d > curSlotPot[i] + sufSkill[k][i]) return false
      sumDef += d
    }
    if (sumDef > curSlotAll + sufAll[k]) return false
    for (const [b, need] of bonusTargets) if ((bonusCount.get(b) ?? 0) + (sufBonus[k].get(b) ?? 0) < need) return false
    return true
  }

  const leaf = () => {
    combosChecked++
    for (const [b, need] of bonusTargets) if ((bonusCount.get(b) ?? 0) < need) return
    const def = tLevels.map((lv, i) => lv - cur[i])
    // habilidades de bonus de set
    for (const [b, skills] of bonusGivesTarget) {
      const bonus = data.setBonuses.find((x) => x.id === b)!
      const cnt = bonusCount.get(b) ?? 0
      for (const r of bonus.ranks) if (cnt >= r.pieces && tIndex.has(r.skill) && skills.includes(r.skill)) def[tIndex.get(r.skill)!] -= 1
    }
    const counts = [...slotCounts]
    const res = fill(def.map((d) => Math.max(0, d)), counts)
    if (!res) return
    // ranuras libres
    const free = [...slotCounts]
    const decoSizes = res.map((id) => decos.find((d) => d.id === id)!.size).sort((a, b) => b - a)
    for (const sz of decoSizes) {
      let s = sz
      while (free[s] === 0) s++
      free[s]--
    }
    const freeList: number[] = []
    for (let s = 4; s >= 1; s--) for (let j = 0; j < free[s]; j++) freeList.push(s)
    found.push({ chosen: chosen.map((c) => c!), decos: res, free: freeList })
  }

  const dfs = (k: number) => {
    if (found.length >= maxCollect || timedOut) return
    explored++
    if ((explored & 1023) === 0) {
      const now = Date.now()
      if (now - t0 > input.timeLimitMs) { timedOut = true; return }
      if (onProgress && now - lastProgress > 250) { lastProgress = now; onProgress(found.length, combosChecked) }
    }
    if (k === L) return leaf()
    for (const c of levels[k].cands) {
      chosen[k] = c
      for (let i = 0; i < T; i++) { cur[i] += c.pts[i]; curSlotPot[i] += c.slotPot[i] }
      curSlotAll += c.slotAll
      for (const s of c.slots) slotCounts[s]++
      if (c.bonus != null) bonusCount.set(c.bonus, (bonusCount.get(c.bonus) ?? 0) + 1)

      if (feasibleBound(k + 1)) dfs(k + 1)

      if (c.bonus != null) bonusCount.set(c.bonus, bonusCount.get(c.bonus)! - 1)
      for (const s of c.slots) slotCounts[s]--
      curSlotAll -= c.slotAll
      for (let i = 0; i < T; i++) { cur[i] -= c.pts[i]; curSlotPot[i] -= c.slotPot[i] }
      if (found.length >= maxCollect || timedOut) return
    }
  }
  if (feasibleBound(0)) dfs(0)

  // --- Ordenar y materializar resultados ---
  const score = (f: (typeof found)[number]) => f.free.reduce((a, b) => a + b, 0) * 1000 + f.chosen.reduce((a, c) => a + c.def, 0)
  found.sort((a, b) => score(b) - score(a))

  const results: OptimizerResult[] = found.slice(0, input.maxResults).map((f) => {
    const armor = Object.fromEntries(ARMOR_TYPES.map((t) => [t, null])) as Record<ArmorType, number | null>
    let charm: number | null = null
    levels.forEach((lvl, i) => {
      if (lvl.key === 'charm') charm = f.chosen[i].id
      else armor[lvl.key] = f.chosen[i].id
    })
    // repartir joyas en ranuras reales: de mayor a menor, en la ranura libre más pequeña que quepa
    const slotTable: { owner: 'weapon' | ArmorType; idx: number; size: number; deco: number | null }[] = []
    input.weaponSlots.forEach((size, idx) => slotTable.push({ owner: 'weapon', idx, size, deco: null }))
    for (const t of ARMOR_TYPES) {
      const a = armor[t] != null ? data.armor.find((x) => x.id === armor[t]) : undefined
      a?.slots.forEach((size, idx) => slotTable.push({ owner: t, idx, size, deco: null }))
    }
    const order = [...slotTable].sort((a, b) => a.size - b.size)
    const decoObjs = f.decos.map((id) => decos.find((d) => d.id === id)!).sort((a, b) => b.size - a.size)
    for (const d of decoObjs) {
      const slot = order.find((s) => s.deco == null && s.size >= d.size)
      if (slot) slot.deco = d.id
    }
    const decosOut = {
      weapon: input.weaponSlots.map(() => null as number | null),
      armor: Object.fromEntries(ARMOR_TYPES.map((t) => [t, [] as (number | null)[]])) as Record<ArmorType, (number | null)[]>,
    }
    for (const s of slotTable) {
      if (s.owner === 'weapon') decosOut.weapon[s.idx] = s.deco
      else decosOut.armor[s.owner][s.idx] = s.deco
    }
    return { armor, charm, decos: decosOut, freeSlots: f.free, defense: f.chosen.reduce((a, c) => a + c.def, 0) }
  })

  return { results, explored, combosChecked, timedOut, ms: Date.now() - t0, candidateCounts, warnings }
}
