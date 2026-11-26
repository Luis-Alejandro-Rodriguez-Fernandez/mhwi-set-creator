export type Lang = 'es' | 'en'

export interface Named {
  id: number
  en: string
  es: string
}

export type SkillPair = [skillId: number, level: number]

export interface Skill extends Named {
  descEn: string
  descEs: string
  max: number
  /** niveles bloqueados hasta activar el "Secreto" correspondiente */
  secret: number
  /** si esta habilidad es un "Secreto", id de la habilidad que desbloquea */
  unlocks: number | null
  levels: { es: string; en: string }[]
}

export interface SetBonus extends Named {
  ranks: { skill: number; pieces: number }[]
}

export const ARMOR_TYPES = ['head', 'chest', 'arms', 'waist', 'legs'] as const
export type ArmorType = (typeof ARMOR_TYPES)[number]

export interface Armor extends Named {
  type: ArmorType
  rarity: number
  rank: 'LR' | 'HR' | 'MR'
  slots: number[]
  /** [base, máximo mejorado, máximo con aumentos] */
  def: [number, number, number]
  /** fuego, agua, trueno, hielo, dragón */
  res: number[]
  skills: SkillPair[]
  set: string | null
  setEn: string | null
  bonus: number | null
}

export interface Decoration extends Named {
  size: number
  rarity: number
  skills: SkillPair[]
}

export interface Charm extends Named {
  rarity: number
  prev: number | null
  skills: SkillPair[]
}

export interface Weapon extends Named {
  type: string
  rarity: number
  attack: number
  affinity: number
  defense: number
  elements: { type: string; value: number }[]
  elementHidden: boolean
  elderseal: string | null
  slots: number[]
  sharpness: number[] | null
  sharpnessMaxed: boolean
  skill: number | null
  bonus: number | null
  phial: string | null
  shelling: string | null
  kinsect: string | null
  ammo: string | null
  notes: string | null
  category: string | null
}

export interface Tool extends Named {
  /** 'mantle' (manto) o 'booster' (potenciador) */
  type: string
  slots: number[]
  duration: number
  recharge: number
}

export interface RawData {
  source: { repo: string; commit: string; license: string }
  generatedAt: string
  skills: Skill[]
  setBonuses: SetBonus[]
  armor: Armor[]
  decorations: Decoration[]
  charms: Charm[]
  weapons: Weapon[]
  tools: Tool[]
}
