import type { Armor, Charm, Decoration, Lang, Named, RawData, SetBonus, Skill, Tool, Weapon } from '../types'

export interface GameData extends RawData {
  skillById: Map<number, Skill>
  bonusById: Map<number, SetBonus>
  armorById: Map<number, Armor>
  decoById: Map<number, Decoration>
  charmById: Map<number, Charm>
  weaponById: Map<number, Weapon>
  toolById: Map<number, Tool>
  /** habilidad -> bonus de set que la otorga (y cuántas piezas) */
  bonusSkill: Map<number, { bonus: number; pieces: number }>
}

export async function loadData(): Promise<GameData> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/mhw-data.json`)
  if (!res.ok) throw new Error(`No se pudo cargar la base de datos (HTTP ${res.status})`)
  const raw = (await res.json()) as RawData
  return indexData(raw)
}

export function indexData(raw: RawData): GameData {
  const by = <T extends { id: number }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]))
  const bonusSkill = new Map<number, { bonus: number; pieces: number }>()
  for (const b of raw.setBonuses) for (const r of b.ranks) bonusSkill.set(r.skill, { bonus: b.id, pieces: r.pieces })
  return {
    ...raw,
    skillById: by(raw.skills),
    bonusById: by(raw.setBonuses),
    armorById: by(raw.armor),
    decoById: by(raw.decorations),
    charmById: by(raw.charms),
    weaponById: by(raw.weapons),
    toolById: by(raw.tools ?? []),
    bonusSkill,
  }
}

export const nameOf = (x: Named | undefined | null, lang: Lang) => (x ? (lang === 'es' ? x.es : x.en) : '')

export const WEAPON_TYPES: { key: string; es: string; en: string; bloat: number; ranged?: boolean }[] = [
  { key: 'great-sword', es: 'Gran espada', en: 'Great Sword', bloat: 4.8 },
  { key: 'long-sword', es: 'Espada larga', en: 'Long Sword', bloat: 3.3 },
  { key: 'sword-and-shield', es: 'Espada y escudo', en: 'Sword & Shield', bloat: 1.4 },
  { key: 'dual-blades', es: 'Espadas dobles', en: 'Dual Blades', bloat: 1.4 },
  { key: 'hammer', es: 'Martillo', en: 'Hammer', bloat: 5.2 },
  { key: 'hunting-horn', es: 'Cornamusa', en: 'Hunting Horn', bloat: 4.2 },
  { key: 'lance', es: 'Lanza', en: 'Lance', bloat: 2.3 },
  { key: 'gunlance', es: 'Lanza pistola', en: 'Gunlance', bloat: 2.3 },
  { key: 'switch-axe', es: 'Hacha espada', en: 'Switch Axe', bloat: 3.5 },
  { key: 'charge-blade', es: 'Hacha cargada', en: 'Charge Blade', bloat: 3.6 },
  { key: 'insect-glaive', es: 'Glaive insecto', en: 'Insect Glaive', bloat: 3.1 },
  { key: 'light-bowgun', es: 'Ballesta ligera', en: 'Light Bowgun', bloat: 1.3, ranged: true },
  { key: 'heavy-bowgun', es: 'Ballesta pesada', en: 'Heavy Bowgun', bloat: 1.5, ranged: true },
  { key: 'bow', es: 'Arco', en: 'Bow', bloat: 1.2, ranged: true },
]
export const weaponTypeInfo = (key: string) => WEAPON_TYPES.find((w) => w.key === key) ?? WEAPON_TYPES[0]

export const ARMOR_TYPE_NAMES = {
  head: { es: 'Cabeza', en: 'Head' },
  chest: { es: 'Torso', en: 'Chest' },
  arms: { es: 'Brazos', en: 'Arms' },
  waist: { es: 'Cintura', en: 'Waist' },
  legs: { es: 'Piernas', en: 'Legs' },
} as const

export const ELEMENT_NAMES: Record<string, string> = {
  Fire: 'Fuego', Water: 'Agua', Thunder: 'Trueno', Ice: 'Hielo', Dragon: 'Dragón',
  Poison: 'Veneno', Paralysis: 'Parálisis', Sleep: 'Sueño', Blast: 'Nitro',
}
export const RES_NAMES = ['Fuego', 'Agua', 'Trueno', 'Hielo', 'Dragón']

/** Normaliza para búsquedas: minúsculas y sin tildes */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
