import { ARMOR_TYPES, type ArmorType, type Armor, type Weapon } from '../types'
import type { GameData } from './data'
import { weaponTypeInfo } from './data'
import {
  AGITATOR, ATTACK_BOOST, AUGMENTS, AUGMENT_BONUS, AUGMENT_CAPACITY, COALESCENCE, CRITICAL_BOOST,
  CRITICAL_DRAW, CRITICAL_EYE, ELEMENT_ATTACK, HEROICS, LATENT_POWER, MAXIMUM_MIGHT, OFFENSIVE_GUARD,
  PEAK_PERFORMANCE, RESENTMENT, SHARP_ELEM, SHARP_RAW, WEAKNESS_EXPLOIT, at, augmentCost, sharpnessAt,
  upgradeSlots, type AugmentKey, type ConditionKey,
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
    extraAugment: boolean
    /** Personalización / despertares / ajustes manuales (valores mostrados en el juego) */
    custom: { attack: number; affinity: number; element: number; defense: number }
  }
  armor: Record<ArmorType, PieceState>
  charm: number | null
  defenseMode: DefenseMode
  conditions: Partial<Record<ConditionKey, boolean>>
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

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
      augments: { attack: 0, affinity: 0, defense: 0, slot: 0, health: 0, element: 0 },
      extraAugment: false,
      custom: { attack: 0, affinity: 0, element: 0, defense: 0 },
    },
    armor: Object.fromEntries(ARMOR_TYPES.map((t) => [t, { id: null, decos: [] }])) as unknown as Record<ArmorType, PieceState>,
    charm: null,
    defenseMode: 'augmented',
    conditions: { weakspot: true, agitator: true, peak: true },
  }
}

/** Completa campos que falten (builds antiguas o importadas). */
export function normalizeBuild(b: Partial<Build>): Build {
  const base = emptyBuild(b.name)
  return {
    ...base,
    ...b,
    weapon: {
      ...base.weapon,
      ...b.weapon,
      augments: { ...base.weapon.augments, ...b.weapon?.augments },
      custom: { ...base.weapon.custom, ...b.weapon?.custom },
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

export interface SkillTotal {
  skill: number
  points: number
  max: number
  level: number
  sources: { label: string; points: number }[]
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
    elements: { type: string; display: number; hidden: boolean; effective: number }[]
  } | null
  slots: { total: number; used: number }
}

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

  // Secretos: desbloquean los niveles ocultos
  const unlocked = new Set<number>()
  for (const [s] of pts) {
    const sk = data.skillById.get(s)
    if (sk?.unlocks != null) unlocked.add(sk.unlocks)
  }

  const skills: SkillTotal[] = [...pts.entries()]
    .map(([skill, e]) => {
      const sk = data.skillById.get(skill)!
      const max = unlocked.has(skill) ? sk.max : sk.max - sk.secret
      return { skill, points: e.points, max, level: Math.min(e.points, max), sources: e.sources }
    })
    .sort((a, b2) => b2.level - a.level || a.skill - b2.skill)

  const byEn = new Map(skills.map((s) => [data.skillById.get(s.skill)!.en, s.level]))
  const lvl = (en: string) => byEn.get(en) ?? 0

  // Defensa y resistencias
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
    if (weapon.rarity >= 10) defense += at(AUGMENT_BONUS.defense, b.weapon.augments.defense)
  }
  // Bonus defensa / resistencias elementales por habilidad
  const defBoost = [0, 5, 10, 10, 20, 20, 35, 35][Math.min(7, lvl('Defense Boost'))] ?? 0
  const defBoostPct = [0, 0, 0, 5, 5, 8, 8, 10][Math.min(7, lvl('Defense Boost'))] ?? 0
  defense = Math.round(defense * (1 + defBoostPct / 100) + defBoost)
  ;['Fire Resistance', 'Water Resistance', 'Thunder Resistance', 'Ice Resistance', 'Dragon Resistance'].forEach((sk, i) => {
    res[i] += [0, 6, 12, 20][Math.min(3, lvl(sk))] ?? 0
  })

  // Aumentos
  let used = 0
  for (const a of AUGMENTS) used += augmentCost(a.key, b.weapon.augments[a.key])
  const cap = weapon && AUGMENT_CAPACITY[weapon.rarity] ? AUGMENT_CAPACITY[weapon.rarity][b.weapon.extraAugment ? 1 : 0] : null
  const augment = { used, capacity: cap, over: cap != null && used > cap }

  // Estadísticas ofensivas
  let stats: Computed['stats'] = null
  if (weapon) {
    const info = weaponTypeInfo(weapon.type)
    const c = b.conditions
    const isMr = weapon.rarity >= 10
    const baseTrue = weapon.attack / info.bloat + (isMr ? AUGMENT_BONUS.attackTrue * b.weapon.augments.attack : 0) + b.weapon.custom.attack / info.bloat
    const ab = at(ATTACK_BOOST, lvl('Attack Boost'))
    let pct = ab.pct
    let flat = ab.flat
    if (c.agitator) flat += at(AGITATOR, lvl('Agitator'))[0]
    if (c.peak) flat += at(PEAK_PERFORMANCE, lvl('Peak Performance'))
    if (c.resentment) flat += at(RESENTMENT, lvl('Resentment'))
    if (c.coalescence) flat += at(COALESCENCE, lvl('Coalescence'))
    if (c.offensiveGuard) pct += at(OFFENSIVE_GUARD, lvl('Offensive Guard'))
    if (c.heroics) pct += at(HEROICS, lvl('Heroics'))
    let mult = 1 + pct / 100
    const hasElement = weapon.elements.length > 0 && !(weapon.elementHidden && lvl('Free Elem/Ammo Up') === 0)
    if (lvl('Non-elemental Boost') > 0 && !hasElement) mult *= 1.1
    const trueRaw = baseTrue * mult + flat

    let affinity = weapon.affinity + b.weapon.custom.affinity + (isMr ? at(AUGMENT_BONUS.affinity, b.weapon.augments.affinity) : 0)
    affinity += at(CRITICAL_EYE, lvl('Critical Eye'))
    if (c.weakspot) affinity += at(WEAKNESS_EXPLOIT.weak, lvl('Weakness Exploit'))
    if (c.weakspot && c.wound) affinity += at(WEAKNESS_EXPLOIT.wound, lvl('Weakness Exploit'))
    if (c.agitator) affinity += at(AGITATOR, lvl('Agitator'))[1]
    if (c.maxMight) affinity += at(MAXIMUM_MIGHT, lvl('Maximum Might'))
    if (c.latent) affinity += at(LATENT_POWER, lvl('Latent Power'))
    if (c.critDraw) affinity += at(CRITICAL_DRAW, lvl('Critical Draw'))
    affinity = Math.max(-100, Math.min(100, affinity))

    const critMult = at(CRITICAL_BOOST, lvl('Critical Boost'))
    const sharpness = weapon.sharpness ? sharpnessAt(weapon.sharpness, weapon.sharpnessMaxed, lvl('Handicraft')) : null
    let sharpIndex = -1
    if (sharpness) sharpness.forEach((v, i) => (v > 0 ? (sharpIndex = i) : null))
    const sRaw = info.ranged || sharpIndex < 0 ? 1 : SHARP_RAW[sharpIndex]
    const sEl = info.ranged || sharpIndex < 0 ? 1 : SHARP_ELEM[sharpIndex]
    const critFactor = affinity >= 0 ? 1 + (affinity / 100) * (critMult - 1) : 1 + (affinity / 100) * 0.25
    const efr = trueRaw * sRaw * critFactor

    const freeElem = lvl('Free Elem/Ammo Up')
    const elements = weapon.elements.map((e) => {
      const skillName = e.type === 'Paralysis' ? 'Paralysis Attack' : `${e.type} Attack`
      const [eFlat, ePct] = at(ELEMENT_ATTACK, lvl(skillName))
      let disp = e.value + b.weapon.custom.element + (isMr ? AUGMENT_BONUS.elementDisplay * b.weapon.augments.element : 0)
      if (weapon.elementHidden) disp = disp * [0, 0.33, 0.66, 1][Math.min(3, freeElem)]
      disp = disp * (1 + ePct / 100) + (disp > 0 ? eFlat : 0)
      if (c.coalescence && disp > 0) disp += [0, 30, 60, 90][Math.min(3, lvl('Coalescence'))]
      const isStatus = ['Poison', 'Paralysis', 'Sleep', 'Blast'].includes(e.type)
      return { type: e.type, display: Math.round(disp), hidden: weapon.elementHidden, effective: Math.round((disp / 10) * (isStatus ? 1 : sEl)) }
    })

    stats = {
      attackDisplay: Math.round(trueRaw * info.bloat),
      trueRaw: Math.round(trueRaw * 10) / 10,
      affinity,
      critMult,
      sharpness,
      sharpIndex,
      efr: Math.round(efr * 10) / 10,
      elements,
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
