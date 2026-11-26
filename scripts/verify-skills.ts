// Casos concretos de cálculo de habilidades y aumentos (valores de Kiranico / wikis de MHW:IB).
import fs from 'node:fs'
import { indexData } from '../src/logic/data'
import { computeBuild, emptyBuild, normalizeBuild } from '../src/logic/build'
import type { RawData } from '../src/types'

const raw: RawData = JSON.parse(fs.readFileSync(new URL('../public/data/mhw-data.json', import.meta.url), 'utf8'))
const data = indexData(raw)
const armor = (en: string) => raw.armor.find((a) => a.en === en)!.id
const weaponBy = (f: (w: RawData['weapons'][number]) => boolean) => raw.weapons.find(f)!
let fails = 0
const check = (name: string, got: number, want: number) => {
  const ok = Math.abs(got - want) < 0.051
  if (!ok) fails++
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${name}: ${got}${ok ? '' : ` (esperado ${want})`}`)
}

// --- Alatreon: Conversión elemental (+5% del total de resistencias como elemento real) y +20 a todas las resistencias
{
  const w = weaponBy((x) => x.rarity >= 10 && x.type === 'long-sword' && x.elements.length === 1 && x.elements[0].type === 'Fire' && !x.elementHidden)
  const b = emptyBuild()
  b.weapon.id = w.id
  b.armor.head.id = armor('Escadora Wisdom α+')
  b.armor.chest.id = armor('Escadora Soul α+')
  b.armor.arms.id = armor('Escadora Armguards α+')
  const c = computeBuild(b, data)
  const base = raw.armor.filter((a) => ['Escadora Wisdom α+', 'Escadora Soul α+', 'Escadora Armguards α+'].includes(a.en))
  const res = [0, 1, 2, 3, 4].map((i) => base.reduce((s, a) => s + a.res[i], 0) + 20)
  const total = res.reduce((a, r) => a + r, 0)
  check('Alatreon 3 pz: resistencia al fuego (+20)', c.res[0], res[0])
  check(`Alatreon: elemento con Conversión (${w.en}, res total ${total})`, c.stats!.elements[0].display, Math.round(w.elements[0].value + total * 0.05 * 10))
  b.conditions.elementConversion = false
  check('Alatreon: elemento sin cargar Conversión', computeBuild(b, data).stats!.elements[0].display, w.elements[0].value)
}

// --- Bonus ataque nv4: +12 ataque real y +5% afinidad
{
  const w = weaponBy((x) => x.rarity >= 10 && x.type === 'great-sword' && x.slots.filter((z) => z === 4).length >= 2)
  const b = emptyBuild()
  b.weapon.id = w.id
  b.conditions = {}
  const base = computeBuild(b, data).stats!
  const ab = raw.decorations.find((d) => d.en === 'Attack Jewel+ 4')! // Bonus ataque 2
  b.weapon.decos = [ab.id, ab.id]
  const s = computeBuild(b, data).stats!
  check('Bonus ataque nv4: ataque real', s.trueRaw, Math.round((base.trueRaw + 12) * 10) / 10)
  check('Bonus ataque nv4: afinidad', s.affinity, base.affinity + 5)
}

// --- Safi'jiiva 5 piezas: Desvelar dracovena real (+40% afinidad)
{
  const w = weaponBy((x) => x.rarity >= 10 && x.type === 'dual-blades' && x.elements.some((e) => e.type === 'Dragon') && !x.elementHidden)
  const b = emptyBuild()
  b.weapon.id = w.id
  b.conditions = { dragonvein: true }
  const safi = ['Safi Crested Crown α+', 'Safi Crested Chest α+', 'Safi Crested Vambraces α+', 'Safi Crested Belt α+', 'Safi Crested Boots α+']
  ;(['head', 'chest', 'arms', 'waist', 'legs'] as const).forEach((t, i) => (b.armor[t].id = armor(safi[i])))
  const c = computeBuild(b, data)
  const charge = c.skillLevel('Critical Eye') // Safi da habilidades propias; aislamos Dracovena
  const expectedAff = Math.min(100, w.affinity + [0, 5, 10, 15, 20, 25, 30, 40][charge] + 40)
  check('Dracovena real: afinidad', c.stats!.affinity, expectedAff)
}

// --- Aumentos rareza 12: Ataque II cuesta 6 huecos (capacidad nv1 = 3, nv4 = 6) y da +10
{
  const w = weaponBy((x) => x.rarity === 12 && x.type === 'hammer')
  const b = emptyBuild()
  b.weapon.id = w.id
  b.conditions = {}
  const base = computeBuild(b, data).stats!.trueRaw
  b.weapon.augments.attack = 2
  let c = computeBuild(b, data)
  check('R12 Ataque II: huecos usados', c.augment.used, 6)
  check('R12 nivel de aumento 1: capacidad', c.augment.capacity!, 3)
  check('R12 Ataque II supera la capacidad (1 = sí)', c.augment.over ? 1 : 0, 1)
  b.weapon.augmentLevel = 4
  c = computeBuild(b, data)
  check('R12 nivel de aumento 4: capacidad', c.augment.capacity!, 6)
  check('R12 Ataque II: +10 ataque real', c.stats!.trueRaw, Math.round((base + 10) * 10) / 10)
}

// --- Mejoras personalizadas: 7 niveles de ataque = 6×1 + 3 = +9 ataque real
{
  const w = weaponBy((x) => x.rarity >= 10 && x.elements.length === 0)
  const b = emptyBuild()
  b.weapon.id = w.id
  b.conditions = {}
  const base = computeBuild(b, data).stats!.trueRaw
  b.weapon.customUpgrades = ['attack', 'attack', 'attack', 'attack', 'attack', 'attack', 'attack']
  check('Mejoras personalizadas 7× ataque', computeBuild(b, data).stats!.trueRaw, Math.round((base + 9) * 10) / 10)
}

// --- Builds antiguas: "ranura de aumento extra" pasa a nivel de aumento 2
{
  const old = normalizeBuild({ weapon: { extraAugment: true } } as never)
  check('Migración extraAugment → nivel 2', old.weapon.augmentLevel, 2)
}

console.log(fails ? `\n${fails} fallo(s)` : '\nTodo correcto')
if (fails) process.exit(1)
