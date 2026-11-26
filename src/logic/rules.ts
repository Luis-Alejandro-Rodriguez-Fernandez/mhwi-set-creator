// Reglas de juego que NO vienen en la base de datos de MHWorldData.
// Están centralizadas aquí para que se puedan corregir fácilmente.

export type AugmentKey = 'attack' | 'affinity' | 'defense' | 'slot' | 'health' | 'element'

// Aumentos de arma de Rango Maestro (rareza 10-12).
// Fuente: wiki de Fandom "MHWI: Augments" (costes acumulados en huecos por nivel).
export const AUGMENT_NAMES: Record<AugmentKey, string> = {
  attack: 'Aumento de ataque',
  affinity: 'Aumento de afinidad',
  defense: 'Aumento de defensa',
  slot: 'Mejora de ranura',
  health: 'Regeneración de vida',
  element: 'Aumento de elemento/estado',
}
export const AUGMENT_ORDER: AugmentKey[] = ['attack', 'affinity', 'defense', 'slot', 'health', 'element']

/** Huecos usados (acumulados) por nivel de cada aumento, según rareza */
export const AUGMENT_COSTS: Record<number, Record<AugmentKey, number[]>> = {
  10: { attack: [3, 5, 7, 9], affinity: [2, 4, 6, 8], defense: [1, 2, 3, 5], slot: [3, 6, 7, 8], health: [3, 5, 7, 9], element: [1, 3, 5, 7] },
  11: { attack: [3, 5, 7], affinity: [2, 4, 6, 8], defense: [1, 2, 3, 5], slot: [3, 6, 7, 8], health: [3, 5, 7], element: [1, 3, 5, 7] },
  12: { attack: [3, 6], affinity: [2, 4, 6], defense: [1, 2, 3, 5], slot: [3, 5], health: [3, 5], element: [1, 3, 5] },
}
/** Huecos de aumento según rareza y nivel de aumento (1-4, se sube con "Huecos extra") */
export const AUGMENT_CAPACITY: Record<number, number[]> = {
  10: [5, 7, 9, 10],
  11: [4, 5, 6, 8],
  12: [3, 4, 5, 6],
}

export const augmentCost = (key: AugmentKey, level: number, rarity: number) =>
  level <= 0 ? 0 : AUGMENT_COSTS[rarity]?.[key]?.[level - 1] ?? 0

/** Bonus por nivel de aumento (índice = nivel) */
export const AUGMENT_BONUS = {
  attackTrue: [0, 5, 10, 15, 25],
  affinity: [0, 10, 15, 20, 25],
  defense: [0, 15, 25, 35, 50],
  elementDisplay: [0, 30, 60, 90, 120],
}
export const AUGMENT_EFFECT: Record<AugmentKey, (lv: number) => string> = {
  attack: (lv) => `+${AUGMENT_BONUS.attackTrue[lv]} ataque real`,
  affinity: (lv) => `+${AUGMENT_BONUS.affinity[lv]}% afinidad`,
  defense: (lv) => `+${AUGMENT_BONUS.defense[lv]} defensa`,
  slot: (lv) => `Ranura de nivel ${lv}`,
  health: (lv) => `Recupera vida al golpear (${['', 'I', 'II', 'III', 'IV'][lv]})`,
  element: (lv) => `+${AUGMENT_BONUS.elementDisplay[lv]} elemento/estado`,
}

// Mejoras personalizadas (Tierras Guía): 7 niveles, cada uno con una opción.
export type CustomKey = 'attack' | 'affinity' | 'element' | 'defense'
export const CUSTOM_NAMES: Record<CustomKey, string> = { attack: 'Ataque', affinity: 'Afinidad', element: 'Elemento', defense: 'Defensa' }
/** Bonus de una mejora personalizada según el nivel en que se aplica (1-7) */
export function customBonus(key: CustomKey, level: number): number {
  if (key === 'attack') return level === 7 ? 3 : 1 // ataque real
  if (key === 'affinity') return level === 7 ? 3 : 1 // %
  return 10 // elemento mostrado / defensa
}

/** Aplica "Mejora de ranura": añade una ranura nueva o sube la más pequeña. */
export function upgradeSlots(base: number[], level: number): number[] {
  const slots = [...base]
  if (level <= 0) return slots
  if (slots.length < 3) slots.push(Math.min(4, level))
  else {
    const i = slots.indexOf(Math.min(...slots))
    slots[i] = Math.min(4, slots[i] + level)
  }
  return slots
}

// ---------------- Filo ----------------
export const SHARP_COLORS = ['#d92c2c', '#e8812c', '#e8d22c', '#5ec92f', '#2f76e8', '#f0f0f0', '#b04ef0']
export const SHARP_NAMES = ['Rojo', 'Naranja', 'Amarillo', 'Verde', 'Azul', 'Blanco', 'Morado']
export const SHARP_RAW = [0.5, 0.75, 1.0, 1.05, 1.2, 1.32, 1.39]
export const SHARP_ELEM = [0.25, 0.5, 0.75, 1.0, 1.0625, 1.15, 1.25]

/**
 * MHWorldData guarda el filo con Artesanía 5. Devuelve las barras para un nivel de Artesanía dado.
 */
export function sharpnessAt(full: number[], maxed: boolean, handicraft: number): number[] {
  if (maxed) return [...full]
  let remove = 50 - Math.min(5, handicraft) * 10
  const bars = [...full]
  for (let i = bars.length - 1; i >= 0 && remove > 0; i--) {
    const r = Math.min(bars[i], remove)
    bars[i] -= r
    remove -= r
  }
  return bars
}

// ---------------- Efectos de habilidades para el cálculo de daño ----------------
// Bonus ataque (Kiranico, datos del juego v15.11): +3 por nivel; desde nv4, +5% afinidad.
export const ATTACK_BOOST = [
  { flat: 0, aff: 0 }, { flat: 3, aff: 0 }, { flat: 6, aff: 0 }, { flat: 9, aff: 0 },
  { flat: 12, aff: 5 }, { flat: 15, aff: 5 }, { flat: 18, aff: 5 }, { flat: 21, aff: 5 },
]
export const CRITICAL_EYE = [0, 5, 10, 15, 20, 25, 30, 40]
export const CRITICAL_BOOST = [1.25, 1.3, 1.35, 1.4]
export const WEAKNESS_EXPLOIT = { weak: [0, 10, 15, 30], wound: [0, 5, 15, 20] }
export const AGITATOR = [
  [0, 0], [4, 5], [8, 5], [12, 7], [16, 7], [20, 10], [24, 15], [28, 20],
] as const
export const PEAK_PERFORMANCE = [0, 5, 10, 20]
export const RESENTMENT = [0, 5, 10, 15, 20, 25]
export const OFFENSIVE_GUARD = [0, 5, 10, 15]
export const MAXIMUM_MIGHT = [0, 10, 20, 30, 40, 40]
export const LATENT_POWER = [0, 10, 20, 30, 40, 50, 50, 60]
export const CRITICAL_DRAW = [0, 30, 60, 100]
export const HEROICS = [0, 0, 5, 5, 10, 15, 25, 40]
export const COALESCENCE = [0, 12, 15, 18]
export const NON_ELEMENTAL_BOOST = 1.05 // Iceborne
export const BLUDGEONER = [30, 30, 25, 15] // rojo, naranja, amarillo, verde
export const PUNISHING_DRAW_RAW = 5
export const FORTIFY_PCT = 10 // por desmayo, hasta 2
/** Conversión elemental: % del total de resistencias que se suma como elemento real */
export const ELEMENT_CONVERSION = { melee: 0.05, bowgun: 0.02 }
export const ALL_ELEMENTAL_RESISTANCE = 20
export const DRAGONVEIN = { aff: 20, element: 80, status: 80 }
export const TRUE_DRAGONVEIN = { aff: 40, element: 150, status: 120 }
export const ELEMENT_ACCELERATION = { element: 60, freeElem: 2 }
export const TRUE_ELEMENT_ACCELERATION = { element: 150, freeElem: 3 }
/** Destreza helada: % por etapa (0-3) según arma */
export const FROSTCRAFT: Record<string, number[]> = {
  'great-sword': [0, 5, 15, 30], hammer: [0, 5, 15, 30], 'heavy-bowgun': [0, 10, 20, 30], other: [0, 5, 20, 25],
}
/** Multiplicador de crítico elemental / de estado por tipo de arma */
const HEAVY = ['great-sword', 'hammer', 'hunting-horn', 'heavy-bowgun']
export const critElementMult = (type: string, trueVersion: boolean) =>
  HEAVY.includes(type) ? (trueVersion ? 1.7 : 1.5) : type === 'light-bowgun' ? (trueVersion ? 1.4 : 1.25) : trueVersion ? 1.55 : 1.35
export const critStatusMult = (type: string, trueVersion: boolean) =>
  HEAVY.includes(type) ? (trueVersion ? 1.6 : 1.4) : trueVersion ? 1.4 : 1.2
/** Ataque elemental: [plano mostrado, %] */
export const ELEMENT_ATTACK = [[0, 0], [30, 0], [60, 0], [100, 0], [100, 5], [100, 10], [100, 20]] as const

export const at = <T,>(table: readonly T[], lvl: number): T => table[Math.max(0, Math.min(table.length - 1, lvl))]

export type ConditionKey =
  | 'weakspot' | 'wound' | 'agitator' | 'peak' | 'resentment' | 'offensiveGuard'
  | 'maxMight' | 'latent' | 'critDraw' | 'heroics' | 'coalescence'
  | 'elementConversion' | 'dragonvein' | 'elemAccel' | 'frostcraft' | 'fortify'

export interface Condition {
  key: ConditionKey
  es: string
  /** habilidades (nombre en inglés) que hacen relevante esta condición */
  skills: string[]
  /** si existe, la condición es un valor numérico a elegir en lugar de sí/no */
  options?: { value: number; label: string }[]
}

export const CONDITIONS: Condition[] = [
  { key: 'weakspot', es: 'Golpe en punto débil', skills: ['Weakness Exploit'] },
  { key: 'wound', es: 'Golpe en herida', skills: ['Weakness Exploit'] },
  { key: 'agitator', es: 'Monstruo enfurecido', skills: ['Agitator'] },
  { key: 'peak', es: 'Salud completa', skills: ['Peak Performance'] },
  { key: 'resentment', es: 'Daño rojo (temporal)', skills: ['Resentment'] },
  { key: 'offensiveGuard', es: 'Bloqueo perfecto', skills: ['Offensive Guard'] },
  { key: 'maxMight', es: 'Resistencia llena', skills: ['Maximum Might'] },
  { key: 'latent', es: 'Poder latente activo', skills: ['Latent Power'] },
  { key: 'critDraw', es: 'Ataque al desenfundar', skills: ['Critical Draw'] },
  { key: 'heroics', es: 'Salud baja', skills: ['Heroics'] },
  { key: 'coalescence', es: 'Coalescencia activa', skills: ['Coalescence'] },
  { key: 'elementConversion', es: 'Conversión elemental cargada', skills: ['Element Conversion'] },
  { key: 'dragonvein', es: 'Dracovena activa (arma desenvainada)', skills: ['Dragonvein Awakening', 'True Dragonvein Awakening'] },
  { key: 'elemAccel', es: 'Aceleración de elemento activa', skills: ['Element Acceleration', 'True Element Acceleration'] },
  {
    key: 'frostcraft', es: 'Destreza helada', skills: ['Frostcraft'],
    options: [0, 1, 2, 3].map((v) => ({ value: v, label: v ? `Etapa ${v}` : 'Sin carga' })),
  },
  {
    key: 'fortify', es: 'Bonus de desmayo', skills: ['Fortify'],
    options: [0, 1, 2].map((v) => ({ value: v, label: v ? `${v} desmayo${v > 1 ? 's' : ''}` : 'Sin desmayos' })),
  },
]
