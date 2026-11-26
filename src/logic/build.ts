import { ARMOR_TYPES, type ArmorType, type Armor, type Weapon } from '../types'
import type { GameData } from './data'
import { weaponTypeInfo } from './data'
import {
  AGITATOR, ALL_ELEMENTAL_RESISTANCE, ATTACK_BOOST, AUGMENT_BONUS, AUGMENT_CAPACITY, AUGMENT_COSTS, AUGMENT_ORDER, BLUDGEONER,
  COALESCENCE, CRITICAL_BOOST, CRITICAL_DRAW, CRITICAL_EYE, DRAGONVEIN, ELEMENT_ACCELERATION, ELEMENT_ATTACK,
  ELEMENT_CONVERSION, FORTIFY_PCT, FROSTCRAFT, HEROICS, LATENT_POWER, MAXIMUM_MIGHT, NON_ELEMENTAL_BOOST,
  OFFENSIVE_GUARD, PEAK_PERFORMANCE, PUNISHING_DRAW_RAW, RESENTMENT, SHARP_ELEM, SHARP_RAW, TRUE_DRAGONVEIN,
  TRUE_ELEMENT_ACCELERATION, WEAKNESS_EXPLOIT, at, augmentCost, critElementMult, critStatusMult, customBonus,
  sharpnessAt, upgradeSlots, type AugmentKey, type ConditionKey, type CustomKey,
} from './rules'

export interface PieceState {
  id: number | null
  decos: (number | null)[]
}

export type DefenseMode = 'base' | 'max' | 'augmented'

export interface Build {
  id: string
  name: string
  notes: string
  createdAt: number
  updatedAt: number
  weapon: PieceState & {
    augments: Record<AugmentKey, number>
    /** Nivel de aumento del arma (1-4): cada "Huecos extra" desbloqueado sube un nivel */
    augmentLevel: number
    /** Mejoras personalizadas: una opción por nivel (1-7) */
    customUpgrades: (CustomKey | null)[]
    /** Despertares de Safi'jiiva u otros bonus manuales (valores mostrados en el juego) */
    custom: { attack: number; affinity: number; element: number; defense: number }
  }
  armor: Record<ArmorType, PieceState>
  charm: number | null
  defenseMode: DefenseMode
  conditions: Partial<Record<ConditionKey, boolean | number>>
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const emptyAugments = (): Record<AugmentKey, number> => ({ attack: 0, affinity: 0, defense: 0, slot: 0, health: 0, element: 0 })

export function emptyBuild(name = 'Nueva build'): Build {
  const now = Date.now()
  return {
    id: uid(),
    name,
    notes: '',
    createdAt: now,
    updatedAt: now,
    weapon: {
      id: null,
      decos: [],
      augments: emptyAugments(),
      augmentLevel: 1,
      customUpgrades: [null, null, null, null, null, null, null],
      custom: { attack: 0, affinity: 0, element: 0, defense: 0 },
    },
    armor: Object.fromEntries(ARMOR_TYPES.map((t) => [t, { id: null, decos: [] }])) as unknown as Record<ArmorType, PieceState>,
    charm: null,
    defenseMode: 'augmented',
    conditions: { weakspot: true, agitator: true, peak: true, elementConversion: true, dragonvein: true, elemAccel: true, frostcraft: 3 },
  }
}

/** Completa campos que falten (builds antiguas o importadas). */
export function normalizeBuild(b: Partial<Build> & { weapon?: Partial<Build['weapon']> & { extraAugment?: boolean } }): Build {
  const base = emptyBuild(b.name)
  const w: Partial<Build['weapon']> & { extraAugment?: boolean } = b.weapon ?? {}
  const custom = [...(w.customUpgrades ?? [])]
  while (custom.length < 7) custom.push(null)
  return {
    ...base,
    ...b,
    weapon: {
      ...base.weapon,
      ...w,
      augments: { ...base.weapon.augments, ...w.augments },
      augmentLevel: w.augmentLevel ?? (w.extraAugment ? 2 : 1),
      customUpgrades: custom.slice(0, 7),
      custom: { ...base.weapon.custom, ...w.custom },
    },
    armor: Object.fromEntries(ARMOR_TYPES.map((t) => [t, { ...base.armor[t], ...b.armor?.[t] }])) as Record<ArmorType, PieceState>,
    conditions: { ...base.conditions, ...b.conditions },
  } as Build
}

export function weaponSlots(w: Weapon | undefined, b: Build): number[] {
  if (!w) return []
  return upgradeSlots(w.slots, w.rarity >= 10 ? b.weapon.augments.slot : 0)
}

/** Reajusta las joyas para que quepan en las ranuras (al cambiar pieza). */
export function fitDecos(decos: (number | null)[], slots: number[], data: GameData): (number | null)[] {
  return slots.map((size, i) => {
    const d = decos[i]
    if (d == null) return null
    const deco = data.decoById.get(d)
    return deco && deco.size <= size ? d : null
  })
}

/** Ajusta los aumentos al máximo que permite la rareza del arma. */
export function clampAugments(b: Build, w: Weapon | undefined) {
  if (!w || w.rarity < 10) {
    b.weapon.augments = emptyAugments()
    b.weapon.customUpgrades = [null, null, null, null, null, null, null]
    return
  }
  for (const k of AUGMENT_ORDER) {
    const max = augmentMaxLevel(k, w.rarity)
    if (b.weapon.augments[k] > max) b.weapon.augments[k] = max
  }
}
export const augmentMaxLevel = (k: AugmentKey, rarity: number) => AUGMENT_COSTS[rarity]?.[k]?.length ?? 0

export interface SkillTotal {
  skill: number
  points: number
  max: number
  level: number
  sources: { label: string; points: number }[]
}

/** Un bonus aplicado al cálculo, para mostrar de dónde sale cada número */
export interface Applied {
  label: string
  detail: string
}

export interface Computed {
  weapon?: Weapon
  pieces: Record<ArmorType, Armor | undefined>
  weaponSlots: number[]
  skills: SkillTotal[]
  skillLevel: (enName: string) => number
  bonuses: { bonus: number; count: number; active: { skill: number; pieces: number; on: boolean }[] }[]
  defense: number
  res: number[]
  augment: { used: number; capacity: number | null; over: boolean }
  stats: {
    attackDisplay: number
    trueRaw: number
    affinity: number
    critMult: number
    sharpness: number[] | null
    sharpIndex: number
    efr: number
    elements: { type: string; display: number; hidden: boolean; effective: number; isStatus: boolean }[]
    applied: Applied[]
  } | null
  slots: { total: number; used: number }
}

const STATUS = ['Poison', 'Paralysis', 'Sleep', 'Blast']

export function computeBuild(b: Build, data: GameData, lang: 'es' | 'en' = 'es'): Computed {
  const n = (x: { es: string; en: string }) => (lang === 'es' ? x.es : x.en)
  const weapon = b.weapon.id != null ? data.weaponById.get(b.weapon.id) : undefined
  const pieces = Object.fromEntries(
    ARMOR_TYPES.map((t) => [t, b.armor[t].id != null ? data.armorById.get(b.armor[t].id!) : undefined]),
  ) as Record<ArmorType, Armor | undefined>
  const charm = b.charm != null ? data.charmById.get(b.charm) : undefined

  const pts = new Map<number, { points: number; sources: { label: string; points: number }[] }>()
  const add = (skill: number, p: number, label: string) => {
    const e = pts.get(skill) ?? { points: 0, sources: [] }
    e.points += p
    const s = e.sources.find((x) => x.label === label)
    if (s) s.points += p
    else e.sources.push({ label, points: p })
    pts.set(skill, e)
  }

  const wSlots = weaponSlots(weapon, b)
  let totalSlots = 0
  let usedSlots = 0
  const addDecos = (decos: (number | null)[], slots: number[]) => {
    slots.forEach((_, i) => {
      totalSlots++
      const d = decos[i] != null ? data.decoById.get(decos[i]!) : undefined
      if (!d) return
      usedSlots++
      for (const [s, l] of d.skills) add(s, l, n(d))
    })
  }

  if (weapon) {
    if (weapon.skill != null) add(weapon.skill, 1, n(weapon))
    addDecos(b.weapon.decos, wSlots)
  }
  const bonusCount = new Map<number, number>()
  if (weapon?.bonus != null) bonusCount.set(weapon.bonus, 1)
  for (const t of ARMOR_TYPES) {
    const p = pieces[t]
    if (!p) continue
    for (const [s, l] of p.skills) add(s, l, n(p))
    addDecos(b.armor[t].decos, p.slots)
    if (p.bonus != null) bonusCount.set(p.bonus, (bonusCount.get(p.bonus) ?? 0) + 1)
  }
  if (charm) for (const [s, l] of charm.skills) add(s, l, n(charm))

  const bonuses = [...bonusCount.entries()].map(([id, count]) => {
    const bonus = data.bonusById.get(id)!
    const active = bonus.ranks.map((r) => ({ ...r, on: count >= r.pieces }))
    for (const r of active) if (r.on) add(r.skill, 1, `${n(bonus)} (${r.pieces})`)
    return { bonus: id, count, active }
  })

  // Secretos: desbloquean los niveles ocultos. "Herencia" (Fatalis) los desbloquea todos.
  const unlocked = new Set<number>()
  let inheritance = false
  for (const [s] of pts) {
    const sk = data.skillById.get(s)
    if (sk?.unlocks != null) unlocked.add(sk.unlocks)
    if (sk?.en === 'Inheritance') inheritance = true
  }

  const skills: SkillTotal[] = [...pts.entries()]
    .map(([skill, e]) => {
      const sk = data.skillById.get(skill)!
      const max = unlocked.has(skill) || inheritance ? sk.max : sk.max - sk.secret
      return { skill, points: e.points, max, level: Math.min(e.points, max), sources: e.sources }
    })
    .sort((a, b2) => b2.level - a.level || a.skill - b2.skill)

  const byEn = new Map(skills.map((s) => [data.skillById.get(s.skill)!.en, s.level]))
  const lvl = (en: string) => byEn.get(en) ?? 0
  const has = (en: string) => lvl(en) > 0
  const c = b.conditions
  const isMr = (weapon?.rarity ?? 0) >= 10
  const customSum = (key: CustomKey) =>
    b.weapon.customUpgrades.reduce((s, k, i) => (k === key ? s + customBonus(key, i + 1) : s), 0)

  // ---------- Defensa y resistencias ----------
  const defIdx = b.defenseMode === 'base' ? 0 : b.defenseMode === 'max' ? 1 : 2
  let defense = 0
  const res = [0, 0, 0, 0, 0]
  for (const t of ARMOR_TYPES) {
    const p = pieces[t]
    if (!p) continue
    defense += p.def[defIdx] || p.def[1] || p.def[0]
    p.res.forEach((r, i) => (res[i] += r))
  }
  if (weapon) {
    defense += weapon.defense + b.weapon.custom.defense
    if (isMr) defense += at(AUGMENT_BONUS.defense, b.weapon.augments.defense) + customSum('defense')
  }
  // Bonus defensa (Iceborne): plano, % y resistencias a partir de nv4
  const db = lvl('Defense Boost')
  const defFlat = [0, 5, 10, 10, 20, 20, 35, 35][db] ?? 0
  const defPct = [0, 0, 0, 5, 5, 8, 8, 10][db] ?? 0
  const defRes = [0, 0, 0, 0, 3, 3, 5, 5][db] ?? 0
  let elemResDefense = 0
  ;['Fire Resistance', 'Water Resistance', 'Thunder Resistance', 'Ice Resistance', 'Dragon Resistance'].forEach((sk, i) => {
    const l = lvl(sk)
    res[i] += ([0, 6, 12, 20][l] ?? 0) + defRes
    if (l >= 3) elemResDefense += 10
  })
  if (has('All Elemental Resistance')) for (let i = 0; i < 5; i++) res[i] += ALL_ELEMENTAL_RESISTANCE
  defense = Math.round(defense * (1 + defPct / 100) + defFlat + elemResDefense)
  if ((c.fortify as number) > 0 && has('Fortify')) defense = Math.round(defense * (1 + 0.15 * (c.fortify as number)))

  // ---------- Aumentos ----------
  let used = 0
  if (weapon && isMr) for (const k of AUGMENT_ORDER) used += augmentCost(k, b.weapon.augments[k], weapon.rarity)
  const capTable = weapon ? AUGMENT_CAPACITY[weapon.rarity] : undefined
  const cap = capTable ? capTable[Math.max(1, Math.min(4, b.weapon.augmentLevel)) - 1] : null
  const augment = { used, capacity: cap, over: cap != null && used > cap }

  // ---------- Estadísticas ofensivas ----------
  let stats: Computed['stats'] = null
  if (weapon) {
    const applied: Applied[] = []
    const info = weaponTypeInfo(weapon.type)
    const isBowgun = weapon.type === 'light-bowgun' || weapon.type === 'heavy-bowgun'

    // Raw base (real)
    let baseTrue = weapon.attack / info.bloat + b.weapon.custom.attack / info.bloat
    if (isMr) {
      const aug = at(AUGMENT_BONUS.attackTrue, b.weapon.augments.attack)
      const cu = customSum('attack')
      if (aug) applied.push({ label: 'Aumento de ataque', detail: `+${aug} ataque real` })
      if (cu) applied.push({ label: 'Mejoras personalizadas', detail: `+${cu} ataque real` })
      baseTrue += aug + cu
    }

    // Free elem efectivo (habilidad + Aceleración de elemento)
    const accel = c.elemAccel !== false && has('True Element Acceleration') ? TRUE_ELEMENT_ACCELERATION
      : c.elemAccel !== false && has('Element Acceleration') ? ELEMENT_ACCELERATION : null
    const freeElem = Math.max(lvl('Free Elem/Ammo Up'), accel?.freeElem ?? 0)
    const hasElement = weapon.elements.length > 0 && !(weapon.elementHidden && freeElem === 0)

    let pct = 0
    let flat = 0
    const ab = at(ATTACK_BOOST, lvl('Attack Boost'))
    flat += ab.flat
    if (c.agitator) flat += at(AGITATOR, lvl('Agitator'))[0]
    if (c.peak) flat += at(PEAK_PERFORMANCE, lvl('Peak Performance'))
    if (c.resentment) flat += at(RESENTMENT, lvl('Resentment'))
    if (c.coalescence) flat += at(COALESCENCE, lvl('Coalescence'))
    if (has('Punishing Draw')) {
      flat += PUNISHING_DRAW_RAW
      applied.push({ label: 'Pena inmediata', detail: `+${PUNISHING_DRAW_RAW} ataque real` })
    }
    if (c.offensiveGuard) pct += at(OFFENSIVE_GUARD, lvl('Offensive Guard'))
    if (c.heroics) pct += at(HEROICS, lvl('Heroics'))
    const fortify = has('Fortify') ? Math.min(2, Number(c.fortify) || 0) : 0
    if (fortify) {
      pct += FORTIFY_PCT * fortify
      applied.push({ label: 'Bonus de desmayo', detail: `+${FORTIFY_PCT * fortify}% ataque, +${15 * fortify}% defensa` })
    }
    let mult = 1 + pct / 100
    if (has('Non-elemental Boost') && !hasElement) {
      mult *= NON_ELEMENTAL_BOOST
      applied.push({ label: 'Bonus no elemental', detail: '+5% ataque base' })
    }

    // Filo
    const sharpness = weapon.sharpness ? sharpnessAt(weapon.sharpness, weapon.sharpnessMaxed, lvl('Handicraft')) : null
    let sharpIndex = -1
    if (sharpness) sharpness.forEach((v, i) => (v > 0 ? (sharpIndex = i) : null))
    if (has('Bludgeoner') && !info.ranged && sharpIndex >= 0 && sharpIndex <= 3) {
      flat += BLUDGEONER[sharpIndex]
      applied.push({ label: 'Impacto mejorado', detail: `+${BLUDGEONER[sharpIndex]} ataque por filo bajo` })
    }

    // Destreza helada
    const frostStage = has('Frostcraft') ? Math.max(0, Math.min(3, Number(c.frostcraft) || 0)) : 0
    const frostPct = frostStage ? (FROSTCRAFT[weapon.type] ?? FROSTCRAFT.other)[frostStage] : 0
    if (frostPct) applied.push({ label: 'Destreza helada', detail: `+${frostPct}% ataque y elemento (etapa ${frostStage})` })

    const trueRaw = (baseTrue * mult + flat) * (1 + frostPct / 100)

    // Afinidad
    let affinity = weapon.affinity + b.weapon.custom.affinity
    if (isMr) {
      affinity += at(AUGMENT_BONUS.affinity, b.weapon.augments.affinity) + customSum('affinity')
    }
    affinity += ab.aff
    affinity += at(CRITICAL_EYE, lvl('Critical Eye'))
    if (c.weakspot) affinity += at(WEAKNESS_EXPLOIT.weak, lvl('Weakness Exploit'))
    if (c.weakspot && c.wound) affinity += at(WEAKNESS_EXPLOIT.wound, lvl('Weakness Exploit'))
    if (c.agitator) affinity += at(AGITATOR, lvl('Agitator'))[1]
    if (c.maxMight) affinity += at(MAXIMUM_MIGHT, lvl('Maximum Might'))
    if (c.latent) affinity += at(LATENT_POWER, lvl('Latent Power'))
    if (c.critDraw) affinity += at(CRITICAL_DRAW, lvl('Critical Draw'))
    const dv = c.dragonvein !== false && has('True Dragonvein Awakening') ? TRUE_DRAGONVEIN
      : c.dragonvein !== false && has('Dragonvein Awakening') ? DRAGONVEIN : null
    if (dv) {
      affinity += dv.aff
      applied.push({ label: has('True Dragonvein Awakening') ? 'Desvelar dracovena real' : 'Desvelar dracovena', detail: `+${dv.aff}% afinidad, +${dv.element} elemento, +${dv.status} estado` })
    }
    affinity = Math.max(-100, Math.min(100, affinity))

    const critMult = at(CRITICAL_BOOST, lvl('Critical Boost'))
    const sRaw = info.ranged || sharpIndex < 0 ? 1 : SHARP_RAW[sharpIndex]
    const sEl = info.ranged || sharpIndex < 0 ? 1 : SHARP_ELEM[sharpIndex]
    const critFactor = (m: number) => (affinity >= 0 ? 1 + (affinity / 100) * (m - 1) : 1 + (affinity / 100) * 0.25)
    const efr = trueRaw * sRaw * critFactor(critMult)

    // Elemento / estado
    const totalRes = res.reduce((a, r) => a + r, 0)
    const ecActive = has('Element Conversion') && c.elementConversion !== false
    const ecTrue = ecActive ? Math.max(0, totalRes) * (isBowgun ? ELEMENT_CONVERSION.bowgun : ELEMENT_CONVERSION.melee) : 0
    const critEl = has('True Critical Element') ? critElementMult(weapon.type, true) : has('Critical Element') ? critElementMult(weapon.type, false) : 1
    const critSt = has('True Critical Status') ? critStatusMult(weapon.type, true) : has('Critical Status') ? critStatusMult(weapon.type, false) : 1
    if (accel && weapon.elements.length) applied.push({ label: has('True Element Acceleration') ? 'Aceleración de elemento real' : 'Aceleración de elemento', detail: `+${accel.element} elemento, elem. oculto nv${accel.freeElem}` })
    if (critEl > 1 && weapon.elements.some((e) => !STATUS.includes(e.type))) applied.push({ label: has('True Critical Element') ? 'Elemento crítico real' : 'Elemento crítico', detail: `crítico elemental ×${critEl}` })
    if (critSt > 1 && weapon.elements.some((e) => STATUS.includes(e.type))) applied.push({ label: has('True Critical Status') ? 'Estado crítico real' : 'Estado crítico', detail: `crítico de estado ×${critSt}` })

    const elements = weapon.elements.map((e) => {
      const isStatus = STATUS.includes(e.type)
      const skillName = e.type === 'Paralysis' ? 'Paralysis Attack' : `${e.type} Attack`
      const [eFlat, ePct] = at(ELEMENT_ATTACK, lvl(skillName))
      let disp = e.value + b.weapon.custom.element
      if (isMr) disp += at(AUGMENT_BONUS.elementDisplay, b.weapon.augments.element) + customSum('element')
      if (weapon.elementHidden) disp = disp * [0, 0.33, 0.66, 1][Math.min(3, freeElem)]
      const active = disp > 0
      if (active) {
        disp = disp * (1 + ePct / 100) + eFlat
        if (c.coalescence) disp += [0, 30, 60, 90][Math.min(3, lvl('Coalescence'))]
        if (dv) disp += isStatus ? dv.status : dv.element
        if (accel && !isStatus) disp += accel.element
        if (ecTrue && !isStatus) disp += ecTrue * 10
        disp *= 1 + frostPct / 100
      }
      const m = isStatus ? critSt : critEl
      return { type: e.type, display: Math.round(disp), hidden: weapon.elementHidden, isStatus, effective: Math.round((disp / 10) * (isStatus ? 1 : sEl) * (m > 1 ? critFactor(m) : 1)) }
    })
    if (ecActive) {
      applied.push({
        label: 'Conversión elemental',
        detail: elements.some((e) => !e.isStatus)
          ? `+${Math.round(ecTrue * 10)} elemento (resistencia total ${totalRes})`
          : `sin efecto: el arma no tiene elemento (resistencia total ${totalRes})`,
      })
    }

    stats = {
      attackDisplay: Math.round(trueRaw * info.bloat),
      trueRaw: Math.round(trueRaw * 10) / 10,
      affinity,
      critMult,
      sharpness,
      sharpIndex,
      efr: Math.round(efr * 10) / 10,
      elements,
      applied,
    }
  }

  return {
    weapon,
    pieces,
    weaponSlots: wSlots,
    skills,
    skillLevel: lvl,
    bonuses,
    defense,
    res,
    augment,
    stats,
    slots: { total: totalSlots, used: usedSlots },
  }
}
