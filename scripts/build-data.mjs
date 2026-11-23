// Convierte los CSV de MHWorldData (https://github.com/gatheringhallstudios/MHWorldData, MIT)
// a un único JSON compacto que la app carga en el navegador.
//
// Uso:
//   node scripts/build-data.mjs                 -> descarga los CSV desde GitHub (commit fijado)
//   node scripts/build-data.mjs /ruta/MHWorldData -> usa un clon local
import fs from 'node:fs/promises'
import path from 'node:path'
import Papa from 'papaparse'

const COMMIT = 'be7362213d7d1e30b794e3b58d3f87712035658d'
const RAW = `https://raw.githubusercontent.com/gatheringhallstudios/MHWorldData/${COMMIT}/source_data/`
const localRoot = process.argv[2]
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/data/mhw-data.json')

async function readCsv(rel) {
  let text
  if (localRoot) text = await fs.readFile(path.join(localRoot, 'source_data', rel), 'utf8')
  else {
    const res = await fetch(RAW + rel)
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${rel}`)
    text = await res.text()
  }
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (errors.length) console.warn(rel, errors.slice(0, 3))
  return data
}

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const num = (s) => (s === '' || s == null ? 0 : Number(s))
const translations = (rows, key = 'name_en') => {
  const m = new Map()
  for (const r of rows) m.set(norm(r[key]), r)
  return m
}

const [
  skillBase, skillTr, skillLevels,
  armorBase, armorTr, armorSkills, setBase, setTr, bonusBase, bonusTr,
  decoBase, decoTr, charmBase, charmTr,
  weaponBase, weaponTr, sharpness,
] = await Promise.all([
  'skills/skill_base.csv', 'skills/skill_base_translations.csv', 'skills/skill_levels.csv',
  'armors/armor_base.csv', 'armors/armor_base_translations.csv', 'armors/armor_skills_ext.csv',
  'armors/armorset_base.csv', 'armors/armorset_base_translations.csv',
  'armors/armorset_bonus_base.csv', 'armors/armorset_bonus_base_translations.csv',
  'decorations/decoration_base.csv', 'decorations/decoration_base_translations.csv',
  'charms/charm_base.csv', 'charms/charm_base_translations.csv',
  'weapons/weapon_base.csv', 'weapons/weapon_base_translations.csv', 'weapons/weapon_sharpness.csv',
].map(readCsv))

// ---------- Habilidades ----------
const skillTrM = translations(skillTr)
const levelsBySkill = new Map()
for (const l of skillLevels) {
  const k = norm(l.base_name_en)
  if (!levelsBySkill.has(k)) levelsBySkill.set(k, [])
  levelsBySkill.get(k).push({ level: num(l.level), en: l.description_en, es: l.description_es || l.description_en })
}
const skillId = new Map()
const skills = skillBase.map((s, i) => {
  const name = norm(s.name_en)
  skillId.set(name, i)
  const tr = skillTrM.get(name) ?? {}
  const levels = (levelsBySkill.get(name) ?? []).sort((a, b) => a.level - b.level)
  return {
    id: i,
    en: name,
    es: norm(tr.name_es) || name,
    descEn: tr.description_en ?? '',
    descEs: tr.description_es || tr.description_en || '',
    max: levels.length,
    secret: num(s.secret), // niveles bloqueados hasta activar el "Secreto"
    unlocks: null,
    levels: levels.map((l) => ({ es: l.es, en: l.en })),
  }
})
skillBase.forEach((s, i) => {
  if (s.unlocks) skills[i].unlocks = skillId.get(norm(s.unlocks)) ?? null
})
const sid = (name, ctx) => {
  const n = norm(name)
  if (!n) return null
  const id = skillId.get(n)
  if (id == null) console.warn(`Habilidad desconocida "${n}" en ${ctx}`)
  return id ?? null
}
const skillPairs = (row, ctx, prefix = 'skill', suffix = '_level', max = 2) => {
  const out = []
  for (let i = 1; i <= max; i++) {
    const id = sid(row[`${prefix}${i}_name`], ctx)
    if (id != null) out.push([id, num(row[`${prefix}${i}${suffix}`])])
  }
  return out
}

// ---------- Bonus de set ----------
const bonusTrM = translations(bonusTr)
const bonusId = new Map()
const setBonuses = bonusBase.map((b, i) => {
  const name = norm(b.name_en)
  bonusId.set(name, i)
  return {
    id: i,
    en: name,
    es: norm(bonusTrM.get(name)?.name_es) || name,
    ranks: skillPairs(b, name, 'skill', '_required').map(([skill, pieces]) => ({ skill, pieces })),
  }
})

// ---------- Armadura ----------
const armorTrM = translations(armorTr)
const armorSkillM = translations(armorSkills, 'base_name_en')
const setTrM = translations(setTr)
const pieceSet = new Map()
for (const s of setBase) {
  const info = { set: norm(s.name_en), rank: s.rank, bonus: s.bonus ? bonusId.get(norm(s.bonus)) ?? null : null }
  if (s.bonus && info.bonus == null) console.warn('Bonus desconocido', s.bonus)
  for (const part of ['head', 'chest', 'arms', 'waist', 'legs']) if (s[part]) pieceSet.set(norm(s[part]), info)
}
const rankOf = (r) => (r <= 4 ? 'LR' : r <= 8 ? 'HR' : 'MR')
const armor = armorBase.map((a) => {
  const name = norm(a.name_en)
  const set = pieceSet.get(name)
  const sk = armorSkillM.get(name)
  const rarity = num(a.rarity)
  return {
    id: num(a.id),
    en: name,
    es: norm(armorTrM.get(name)?.name_es) || name,
    type: a.type,
    rarity,
    rank: set?.rank ?? rankOf(rarity),
    slots: [a.slot_1, a.slot_2, a.slot_3].map(num).filter((x) => x > 0),
    def: [num(a.defense_base), num(a.defense_max), num(a.defense_augment_max)],
    res: [a.defense_fire, a.defense_water, a.defense_thunder, a.defense_ice, a.defense_dragon].map(num),
    skills: sk ? skillPairs(sk, name) : [],
    set: set ? norm(setTrM.get(set.set)?.name_es) || set.set : null,
    setEn: set?.set ?? null,
    bonus: set?.bonus ?? null,
  }
})

// ---------- Joyas ----------
const decoTrM = translations(decoTr)
const decorations = decoBase.map((d) => {
  const name = norm(d.name_en)
  return {
    id: num(d.id),
    en: name,
    es: norm(decoTrM.get(name)?.name_es) || name,
    size: num(d.slot),
    rarity: num(d.rarity),
    skills: skillPairs(d, name),
  }
})

// ---------- Amuletos ----------
const charmTrM = translations(charmTr)
const charmIds = new Map(charmBase.map((c) => [norm(c.name_en), num(c.id)]))
const charms = charmBase.map((c) => {
  const name = norm(c.name_en)
  return {
    id: num(c.id),
    en: name,
    es: norm(charmTrM.get(name)?.name_es) || name,
    rarity: num(c.rarity),
    prev: c.previous_en ? charmIds.get(norm(c.previous_en)) ?? null : null,
    skills: skillPairs(c, name),
  }
})

// ---------- Armas ----------
const weaponTrM = new Map(weaponTr.map((w) => [`${w.weapon_type}|${norm(w.name_en)}`, w]))
const sharpM = new Map(sharpness.map((s) => [`${s.weapon_type}|${norm(s.base_name_en)}`, s]))
const weapons = weaponBase.map((w) => {
  const name = norm(w.name_en)
  const key = `${w.weapon_type}|${name}`
  const sh = sharpM.get(key)
  const elements = []
  if (w.element1) elements.push({ type: w.element1, value: num(w.element1_attack) })
  if (w.element2) elements.push({ type: w.element2, value: num(w.element2_attack) })
  return {
    id: num(w.id),
    en: name,
    es: norm(weaponTrM.get(key)?.name_es) || name,
    type: w.weapon_type,
    rarity: num(w.rarity),
    attack: num(w.attack),
    affinity: num(w.affinity),
    defense: num(w.defense),
    elements,
    elementHidden: w.element_hidden === 'TRUE',
    elderseal: w.elderseal || null,
    slots: [w.slot_1, w.slot_2, w.slot_3].map(num).filter((x) => x > 0),
    // Filo con Artesanía al máximo (+50). "maxed" = Artesanía no lo mejora.
    sharpness: sh ? ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'purple'].map((c) => num(sh[c])) : null,
    sharpnessMaxed: sh ? sh.maxed === 'TRUE' : false,
    // La columna "skill" puede ser una habilidad o un bonus de set (p. ej. armas de Kulve Taroth)
    skill: w.skill && skillId.has(norm(w.skill)) ? skillId.get(norm(w.skill)) : null,
    bonus: w.skill && bonusId.has(norm(w.skill)) ? bonusId.get(norm(w.skill)) : null,
    phial: w.phial ? `${w.phial}${w.phial_power ? ' ' + w.phial_power : ''}` : null,
    shelling: w.shelling ? `${w.shelling} ${w.shelling_level}` : null,
    kinsect: w.kinsect_bonus || null,
    ammo: w.ammo_config || null,
    notes: w.notes || null,
    category: w.category || null,
  }
})

const out = {
  source: { repo: 'gatheringhallstudios/MHWorldData', commit: COMMIT, license: 'MIT' },
  generatedAt: new Date().toISOString(),
  skills, setBonuses, armor, decorations, charms, weapons,
}
await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, JSON.stringify(out))
const kb = (await fs.stat(OUT)).size / 1024
console.log(`OK -> ${OUT} (${kb.toFixed(0)} KB)`)
console.log(Object.fromEntries(['skills', 'setBonuses', 'armor', 'decorations', 'charms', 'weapons'].map((k) => [k, out[k].length])))
