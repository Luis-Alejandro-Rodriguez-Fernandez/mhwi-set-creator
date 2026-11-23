// Comprueba que cada resultado del optimizador cumple realmente las habilidades pedidas
// (recalculándolo con computeBuild, que es independiente del optimizador).
import fs from 'node:fs'
import { optimize } from '../src/optimizer/core'
import { indexData } from '../src/logic/data'
import { computeBuild, emptyBuild } from '../src/logic/build'
import { ARMOR_TYPES } from '../src/types'
const raw = JSON.parse(fs.readFileSync(new URL('../public/data/mhw-data.json', import.meta.url), 'utf8'))
const data = indexData(raw)
const weapon = raw.weapons.find((w: any) => w.en === 'Black Fatalis Blade')
let bad = 0, total = 0
const pool = ['Weakness Exploit','Critical Boost','Attack Boost','Critical Eye','Agitator','Handicraft','Health Boost','Divine Blessing','Evade Window','Focus','Earplugs','Constitution','Stamina Surge','Critical Draw','Maximum Might','Latent Power','Peak Performance','Tremor Resistance','Windproof','Partbreaker']
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
for (let trial = 0; trial < 40; trial++) {
  const picks = [...pool].sort(() => rnd() - 0.5).slice(0, 3 + Math.floor(rnd() * 6))
  const targets = picks.map((n) => { const s = raw.skills.find((x: any) => x.en === n); return { skill: s.id, level: 1 + Math.floor(rnd() * (s.max - s.secret)) } })
  const out = optimize(raw, { targets, weaponSlots: weapon.slots, weaponSkill: null, weaponBonus: null, fixed: {}, excluded: [], useCharm: true, ranks: ['MR'], maxResults: 10, timeLimitMs: 15000 })
  for (const r of out.results) {
    total++
    const b = emptyBuild(); b.weapon.id = weapon.id; b.weapon.decos = r.decos.weapon; b.charm = r.charm
    for (const t of ARMOR_TYPES) b.armor[t] = { id: r.armor[t], decos: r.decos.armor[t] }
    const c = computeBuild(b, data)
    const miss = targets.filter((t) => (c.skills.find((s) => s.skill === t.skill)?.level ?? 0) < t.level)
    if (miss.length) { bad++; if (bad < 4) console.log('FALLA', miss, targets) }
  }
  console.log(`#${trial} ${picks.length} habilidades -> ${out.results.length} res, ${out.ms}ms, timeout=${out.timedOut}`)
}
console.log({ total, bad })
if (bad > 0 || total === 0) process.exit(1)
