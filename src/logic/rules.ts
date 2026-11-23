// Reglas de juego que NO vienen en la base de datos de MHWorldData.
// Están centralizadas aquí para que se puedan corregir fácilmente.

export type AugmentKey = 'attack' | 'affinity' | 'defense' | 'slot' | 'health' | 'element'

export interface AugmentRule {
  key: AugmentKey
  es: string
  /** coste en "huecos de aumento" de cada nivel (incremental) */
  cost: number[]
  /** descripción del efecto por nivel (acumulado) */
  effect: string[]
}

// Aumentos de arma de Iceborne (Rango Maestro, rareza 10-12).
// ⚠️ Valores tomados de la wiki comunitaria de memoria; verifícalos en el juego.
export const AUGMENTS: AugmentRule[] = [
  { key: 'attack', es: 'Aumento de ataque', cost: [3, 2, 2, 2], effect: ['+5 ataque', '+10 ataque', '+15 ataque', '+20 ataque'] },
  { key: 'affinity', es: 'Aumento de afinidad', cost: [2, 2, 2, 2], effect: ['+10% afinidad', '+15% afinidad', '+20% afinidad', '+25% afinidad'] },
  { key: 'defense', es: 'Aumento de defensa', cost: [1, 1, 1, 2], effect: ['+10 defensa', '+20 defensa', '+30 defensa', '+50 defensa'] },
  { key: 'slot', es: 'Mejora de ranura', cost: [3, 3, 1], effect: ['Ranura +1', 'Ranura +2', 'Ranura +3'] },
  { key: 'health', es: 'Regeneración de vida', cost: [3, 2, 2], effect: ['Recupera vida al golpear (I)', 'Recupera vida al golpear (II)', 'Recupera vida al golpear (III)'] },
  { key: 'element', es: 'Aumento de elemento/estado', cost: [1, 2, 2], effect: ['Elemento/estado +', 'Elemento/estado ++', 'Elemento/estado +++'] },
]

/** Capacidad de aumentos según rareza (sin / con la ranura extra desbloqueada) */
export const AUGMENT_CAPACITY: Record<number, [number, number]> = {
  10: [5, 6],
  11: [4, 5],
  12: [3, 4],
}

export const augmentCost = (key: AugmentKey, level: number) =>
  AUGMENTS.find((a) => a.key === key)!.cost.slice(0, level).reduce((s, c) => s + c, 0)

/** Bonus numéricos que aplican los aumentos */
export const AUGMENT_BONUS = {
  attackTrue: 5, // ataque real por nivel
  affinity: [0, 10, 15, 20, 25],
  defense: [0, 10, 20, 30, 50],
  elementDisplay: 30, // elemento mostrado por nivel (aprox.)
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
// Iceborne: Bonus ataque a partir de nv4 suma un % del ataque base.
export const ATTACK_BOOST = [
  { flat: 0, pct: 0 },
  { flat: 3, pct: 0 },
  { flat: 6, pct: 0 },
  { flat: 9, pct: 0 },
  { flat: 7, pct: 5 },
  { flat: 8, pct: 6 },
  { flat: 9, pct: 8 },
  { flat: 10, pct: 10 },
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
/** Ataque elemental: [plano mostrado, %] */
export const ELEMENT_ATTACK = [[0, 0], [30, 0], [60, 0], [100, 0], [100, 5], [100, 10], [100, 20]] as const

export const at = <T,>(table: readonly T[], lvl: number): T => table[Math.max(0, Math.min(table.length - 1, lvl))]

export type ConditionKey =
  | 'weakspot' | 'wound' | 'agitator' | 'peak' | 'resentment' | 'offensiveGuard'
  | 'maxMight' | 'latent' | 'critDraw' | 'heroics' | 'coalescence'

export const CONDITIONS: { key: ConditionKey; es: string; skill: string }[] = [
  { key: 'weakspot', es: 'Golpe en punto débil', skill: 'Weakness Exploit' },
  { key: 'wound', es: 'Golpe en herida', skill: 'Weakness Exploit' },
  { key: 'agitator', es: 'Monstruo enfurecido', skill: 'Agitator' },
  { key: 'peak', es: 'Salud completa', skill: 'Peak Performance' },
  { key: 'resentment', es: 'Daño rojo (temporal)', skill: 'Resentment' },
  { key: 'offensiveGuard', es: 'Bloqueo perfecto', skill: 'Offensive Guard' },
  { key: 'maxMight', es: 'Resistencia llena', skill: 'Maximum Might' },
  { key: 'latent', es: 'Poder latente activo', skill: 'Latent Power' },
  { key: 'critDraw', es: 'Ataque al desenfundar', skill: 'Critical Draw' },
  { key: 'heroics', es: 'Salud baja', skill: 'Heroics' },
  { key: 'coalescence', es: 'Coalescencia activa', skill: 'Coalescence' },
]
