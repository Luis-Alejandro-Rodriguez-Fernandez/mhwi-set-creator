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

// ---------------- Cantina y consumibles ----------------
// Fuentes: wiki de Fextralife (páginas de cada objeto y "Canteen") y wiki de Fandom "MHWI: Canteen".
// Los bonus de ataque son ataque real (sin multiplicador de arma).

/** Comida de la cantina: carne → ataque, pescado → defensa. 2/4/6 ingredientes = S/M/L */
export const MEAL_SIZES = ['–', 'S', 'M', 'L'] as const
export const MEAL_BONUS = [0, 5, 10, 15]
export const MEAL_INGREDIENTS = 6

export interface ItemOption { key: string; es: string; note?: string; attack?: number; defense?: number; defensePct?: number }
/** Drogas de ataque (no se acumulan entre sí; duran hasta desmayarte) */
export const ATTACK_DRUGS: ItemOption[] = [
  { key: 'none', es: 'Ninguna' },
  { key: 'demondrug', es: 'Droga demoníaca', attack: 5 },
  { key: 'mega', es: 'Megadroga demoníaca', attack: 7 },
]
/** Semillas, polvos y píldoras de ataque (efectos temporales que se sustituyen entre sí) */
export const ATTACK_SEEDS: ItemOption[] = [
  { key: 'none', es: 'Ninguna' },
  { key: 'mightSeed', es: 'Semilla de poder', note: '180 s', attack: 10 },
  { key: 'demonPowder', es: 'Polvo de demonio', note: '180 s, a todo el grupo', attack: 10 },
  { key: 'mightPill', es: 'Píldora de poder', note: '20 s', attack: 25 },
]
export const DEFENSE_DRUGS: ItemOption[] = [
  { key: 'none', es: 'Ninguna' },
  { key: 'armorskin', es: 'Piel de armadura', defense: 15 },
  { key: 'mega', es: 'Piel de armadura+', defense: 25 },
]
export const DEFENSE_SEEDS: ItemOption[] = [
  { key: 'none', es: 'Ninguna' },
  { key: 'adamantSeed', es: 'Semilla armadura', note: '180 s', defense: 20 },
  { key: 'hardshell', es: 'Polvo de cáscara', note: '180 s, a todo el grupo', defense: 20 },
  { key: 'adamantPill', es: 'Píldora armadura', note: '20 s', defensePct: 30 },
]
/** Amuletos y garras: basta con llevarlos en la bolsa y se acumulan entre sí */
export const CHARM_ITEMS = {
  powercharm: { es: 'Amuleto de poder', attack: 6 },
  powertalon: { es: 'Garra de poder', attack: 9 },
  armorcharm: { es: 'Amuleto armadura', defense: 12 },
  armortalon: { es: 'Garra armadura', defense: 18 },
} as const
export type CharmItemKey = keyof typeof CHARM_ITEMS

/** Habilidades felyne de la cantina que cambian el daño o la defensa (máximo 3 activas) */
export const FOOD_SKILLS = [
  { key: 'booster', es: 'Felyne potenciador', desc: '+9 ataque y +15 defensa los 10 primeros minutos', attack: 9, defense: 15 },
  { key: 'coolCat', es: 'Felyne relajado', desc: '+9 ataque 30 s tras sentarte 5 s', attack: 9 },
  { key: 'heroics', es: 'Felyne heroico', desc: '+35% ataque y +50% defensa con la salud muy baja', attackPct: 35, defensePct: 50 },
  { key: 'specialist', es: 'Felyne especialista', desc: '+30 al estado anormal del arma', status: 30 },
] as const
export type FoodSkillKey = (typeof FOOD_SKILLS)[number]['key']
export const MAX_FOOD_SKILLS = 3

// ---------------- Herramientas especializadas ----------------
// Se pueden llevar 2. En Iceborne los mantos "+" tienen ranuras de joya: sus joyas
// solo cuentan mientras el manto está activo. Fuente: wikis de Fextralife y Fandom.
export const TOOL_EFFECTS: Record<string, { es: string; dragonMult?: number; dodgeAttackPct?: number }> = {
  'Ghillie Mantle+': { es: 'Te oculta de los monstruos hasta que atacas o te golpean.' },
  'Temporal Mantle+': { es: 'Esquiva automáticamente ataques fuertes (cada esquiva resta 20 s).' },
  'Rocksteady Mantle+': { es: 'Sin retrocesos, viento, rugidos ni temblores; -30% de daño recibido.' },
  'Challenger Mantle+': { es: 'Los monstruos te atacan más a menudo.' },
  'Vitality Mantle+': { es: 'Absorbe una cantidad fija de daño.' },
  'Fireproof Mantle+': { es: '-70% de daño de fuego; anula fuego y nitro.' },
  'Waterproof Mantle+': { es: '-70% de daño de agua; anula agua y barro.' },
  'Iceproof Mantle+': { es: '-70% de daño de hielo; anula hielo y frío.' },
  'Thunderproof Mantle+': { es: '-70% de daño de trueno; anula trueno y parálisis.' },
  'Dragonproof Mantle+': { es: '-70% de daño de dragón; ×1,2 al daño de dragón del arma y sello de dragón alto.', dragonMult: 1.2 },
  'Glider Mantle+': { es: 'Más tiempo en el aire; +20% a la acumulación de montura.' },
  'Evasion Mantle+': { es: 'Más invulnerabilidad al esquivar; +30% de ataque 20 s tras una esquiva perfecta.', dodgeAttackPct: 30 },
  'Impact Mantle+': { es: 'Añade aturdimiento a casi todos los ataques (×1,3 al que ya tengan).' },
  'Apothecary Mantle+': { es: 'El estado se aplica en todos los golpes (con menos acumulación por golpe).' },
  'Immunity Mantle+': { es: 'Anula los estados anormales mientras dura.' },
  'Bandit Mantle+': { es: 'Los monstruos sueltan objetos de intercambio al golpearlos.' },
  "Assassin's Hood+": { es: 'Más velocidad y sigilo; gran daño a un monstruo desprevenido.' },
  'Health Booster+': { es: 'Coloca un humo que regenera vida.' },
  'Cleanser Booster+': { es: 'Coloca un humo que elimina estados y plagas.' },
  'Affinity Booster+': { es: 'Coloca un humo que sube la afinidad (valor no simulado).' },
}
export const MAX_TOOLS = 2
