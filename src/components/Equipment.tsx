import { useCallback, useMemo, useState } from 'react'
import { ARMOR_TYPES, type Armor, type ArmorType, type Charm, type Decoration, type Weapon } from '../types'
import { ARMOR_TYPE_NAMES, ELEMENT_NAMES, WEAPON_TYPES, nameOf, weaponTypeInfo } from '../logic/data'
import { fitDecos, weaponSlots, type Build, type Computed } from '../logic/build'
import { AUGMENTS, AUGMENT_CAPACITY, augmentCost, type AugmentKey } from '../logic/rules'
import { useApp } from '../logic/context'
import { Picker } from './Picker'
import { Rarity, SkillList, SlotIcon, Slots } from './bits'

type Update = (fn: (b: Build) => void) => void
type RankFilter = 'MR' | 'HR' | 'ALL'

function DecoSlots({ slots, decos, onChange }: { slots: number[]; decos: (number | null)[]; onChange: (i: number, d: number | null) => void }) {
  const { data, lang } = useApp()
  const [open, setOpen] = useState<number | null>(null)
  const size = open != null ? slots[open] : 0
  const items = useMemo(
    () => data.decorations.filter((d) => d.size <= size).sort((a, b) => b.size - a.size || nameOf(a, lang).localeCompare(nameOf(b, lang))),
    [data, size, lang],
  )
  const search = useCallback(
    (d: Decoration) => `${d.es} ${d.en} ${d.skills.map(([s]) => `${data.skillById.get(s)?.es} ${data.skillById.get(s)?.en}`).join(' ')}`,
    [data],
  )
  if (!slots.length) return <div className="deco-slots muted small">Sin ranuras</div>
  return (
    <div className="deco-slots">
      {slots.map((s, i) => {
        const d = decos[i] != null ? data.decoById.get(decos[i]!) : undefined
        return (
          <div key={i} className={`deco${d ? ' set' : ''}`}>
            <button className="deco-btn" onClick={() => setOpen(i)} title={d ? nameOf(d, lang) : 'Añadir joya'}>
              <SlotIcon size={s} filled={!!d} />
              <span className="deco-name">{d ? nameOf(d, lang) : <span className="muted">Vacía</span>}</span>
            </button>
            {d && <button className="icon-btn tiny" onClick={() => onChange(i, null)} aria-label="Quitar joya">✕</button>}
          </div>
        )
      })}
      {open != null && (
        <Picker<Decoration>
          title={`Joya para ranura nivel ${size}`}
          items={items}
          getKey={(d) => d.id}
          searchText={search}
          allowClear
          selectedKey={decos[open]}
          onClose={() => setOpen(null)}
          onPick={(d) => { setOpen(null); onChange(open, d?.id ?? null) }}
          render={(d) => (
            <>
              <SlotIcon size={d.size} />
              <span className="pick-name">{nameOf(d, lang)}</span>
              <SkillList skills={d.skills} compact />
            </>
          )}
        />
      )}
    </div>
  )
}

function rankOk(rarity: number, f: RankFilter) {
  return f === 'ALL' || (f === 'MR' ? rarity >= 9 : rarity >= 5)
}
function RankChips({ value, onChange }: { value: RankFilter; onChange: (v: RankFilter) => void }) {
  return (
    <div className="chips">
      {(['MR', 'HR', 'ALL'] as const).map((r) => (
        <button key={r} className={`chip${value === r ? ' on' : ''}`} onClick={() => onChange(r)}>
          {r === 'MR' ? 'Rango Maestro' : r === 'HR' ? 'RA + RM' : 'Todo'}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ Arma
export function WeaponCard({ build, update, computed, rank, setRank }: { build: Build; update: Update; computed: Computed; rank: RankFilter; setRank: (r: RankFilter) => void }) {
  const { data, lang } = useApp()
  const [open, setOpen] = useState(false)
  const [wtype, setWtype] = useState<string>(() => computed.weapon?.type ?? 'great-sword')
  const w = computed.weapon
  const items = useMemo(
    () => data.weapons.filter((x) => x.type === wtype && rankOk(x.rarity, rank)).sort((a, b) => b.rarity - a.rarity || b.attack - a.attack),
    [data, wtype, rank],
  )
  const search = useCallback((x: Weapon) => `${x.es} ${x.en} ${x.elements.map((e) => `${e.type} ${ELEMENT_NAMES[e.type]}`).join(' ')}`, [])
  const isMr = (w?.rarity ?? 0) >= 10
  const cap = w ? AUGMENT_CAPACITY[w.rarity] : undefined

  const setAug = (key: AugmentKey, lv: number) =>
    update((b) => {
      b.weapon.augments[key] = lv
      const ww = b.weapon.id != null ? data.weaponById.get(b.weapon.id) : undefined
      b.weapon.decos = fitDecos(b.weapon.decos, weaponSlots(ww, b), data)
    })

  return (
    <section className="card equip">
      <header className="equip-head">
        <span className="equip-type">Arma</span>
        <button className="equip-pick" onClick={() => setOpen(true)}>
          {w ? (
            <>
              <Rarity r={w.rarity} /> <span className="equip-name">{nameOf(w, lang)}</span>
              <span className="muted small">{lang === 'es' ? weaponTypeInfo(w.type).es : weaponTypeInfo(w.type).en}</span>
            </>
          ) : (
            <span className="muted">Elegir arma…</span>
          )}
        </button>
        {w && <button className="icon-btn" onClick={() => update((b) => { b.weapon.id = null; b.weapon.decos = [] })} aria-label="Quitar arma">✕</button>}
      </header>
      {w && (
        <div className="equip-body">
          <div className="weapon-stats small">
            <span>⚔ {w.attack}</span>
            <span className={w.affinity < 0 ? 'neg' : w.affinity > 0 ? 'pos' : ''}>◎ {w.affinity}%</span>
            {w.elements.map((e) => (
              <span key={e.type} className={w.elementHidden ? 'muted' : ''}>
                {lang === 'es' ? ELEMENT_NAMES[e.type] ?? e.type : e.type} {e.value}{w.elementHidden ? ' (oculto)' : ''}
              </span>
            ))}
            {w.defense > 0 && <span>🛡 +{w.defense}</span>}
            {w.elderseal && <span>Sello {w.elderseal}</span>}
            {w.phial && <span>Vial: {w.phial}</span>}
            {w.shelling && <span>Bombardeo: {w.shelling}</span>}
            {w.kinsect && <span>Kinsecto: {w.kinsect}</span>}
            {w.skill != null && <span>Habilidad: {nameOf(data.skillById.get(w.skill), lang)}</span>}
            {w.bonus != null && <span>Bonus: {nameOf(data.bonusById.get(w.bonus), lang)}</span>}
          </div>
          <DecoSlots slots={computed.weaponSlots} decos={build.weapon.decos} onChange={(i, d) => update((b) => { b.weapon.decos[i] = d })} />

          <details className="sub" open={isMr && Object.values(build.weapon.augments).some((v) => v > 0)}>
            <summary>
              Aumentos {isMr ? '' : <span className="muted small">(solo armas RM rareza 10-12)</span>}
              {isMr && cap && (
                <span className={`badge${computed.augment.over ? ' bad' : ''}`}>{computed.augment.used}/{computed.augment.capacity}</span>
              )}
            </summary>
            {isMr ? (
              <div className="augments">
                {AUGMENTS.map((a) => {
                  const lv = build.weapon.augments[a.key]
                  return (
                    <div key={a.key} className="aug-row">
                      <span className="aug-name">{a.es}</span>
                      <div className="stepper">
                        {Array.from({ length: a.cost.length + 1 }, (_, i) => (
                          <button key={i} className={`step${lv === i ? ' on' : ''}`} onClick={() => setAug(a.key, i)} title={i ? `${a.effect[i - 1]} · coste ${augmentCost(a.key, i)}` : 'Sin aumento'}>
                            {i === 0 ? '–' : ['I', 'II', 'III', 'IV'][i - 1]}
                          </button>
                        ))}
                      </div>
                      <span className="muted small">{lv ? a.effect[lv - 1] : ''}</span>
                    </div>
                  )
                })}
                <label className="check small">
                  <input type="checkbox" checked={build.weapon.extraAugment} onChange={(e) => update((b) => { b.weapon.extraAugment = e.target.checked })} />
                  Ranura de aumento extra desbloqueada
                </label>
                {computed.augment.over && <p className="warn small">Superas la capacidad de aumentos de esta rareza.</p>}
              </div>
            ) : null}
          </details>

          <details className="sub" open={Object.values(build.weapon.custom).some((v) => v !== 0)}>
            <summary>Personalización / ajustes manuales</summary>
            <p className="muted small">Para mejoras personalizadas (Tierras Guía), despertares de Safi'jiiva o cualquier bonus que la base de datos no recoja. Valores tal como los muestra el juego.</p>
            <div className="custom-grid">
              {(['attack', 'affinity', 'element', 'defense'] as const).map((k) => (
                <label key={k}>
                  <span className="small">{{ attack: 'Ataque', affinity: 'Afinidad %', element: 'Elemento', defense: 'Defensa' }[k]}</span>
                  <input type="number" value={build.weapon.custom[k]} onChange={(e) => update((b) => { b.weapon.custom[k] = Number(e.target.value) || 0 })} />
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
      {open && (
        <Picker<Weapon>
          title="Elegir arma"
          items={items}
          getKey={(x) => x.id}
          searchText={search}
          selectedKey={build.weapon.id}
          onClose={() => setOpen(false)}
          toolbar={
            <>
              <div className="chips wrap">
                {WEAPON_TYPES.map((t) => (
                  <button key={t.key} className={`chip${wtype === t.key ? ' on' : ''}`} onClick={() => setWtype(t.key)}>{lang === 'es' ? t.es : t.en}</button>
                ))}
              </div>
              <RankChips value={rank} onChange={setRank} />
            </>
          }
          onPick={(x) =>
            (setOpen(false), update((b) => {
              b.weapon.id = x?.id ?? null
              if (x && x.rarity < 10) b.weapon.augments = { attack: 0, affinity: 0, defense: 0, slot: 0, health: 0, element: 0 }
              b.weapon.decos = x ? fitDecos(b.weapon.decos, weaponSlots(x, b), data) : []
            }))
          }
          render={(x) => (
            <>
              <Rarity r={x.rarity} />
              <span className="pick-name">{nameOf(x, lang)}</span>
              <span className="pick-meta">
                ⚔{x.attack} {x.affinity !== 0 && <span className={x.affinity < 0 ? 'neg' : 'pos'}>{x.affinity}%</span>}{' '}
                {x.elements.map((e) => `${lang === 'es' ? ELEMENT_NAMES[e.type] ?? e.type : e.type} ${e.value}${x.elementHidden ? '*' : ''}`).join(' / ')}
              </span>
              <Slots slots={x.slots} />
            </>
          )}
        />
      )}
    </section>
  )
}

// ------------------------------------------------------------------ Armadura
export function ArmorCard({ type, build, update, piece, rank, setRank }: { type: ArmorType; build: Build; update: Update; piece?: Armor; rank: RankFilter; setRank: (r: RankFilter) => void }) {
  const { data, lang } = useApp()
  const [open, setOpen] = useState(false)
  const items = useMemo(
    () => data.armor.filter((a) => a.type === type && rankOk(a.rarity, rank)).sort((a, b) => b.rarity - a.rarity || b.def[2] - a.def[2]),
    [data, type, rank],
  )
  const search = useCallback(
    (a: Armor) => `${a.es} ${a.en} ${a.set ?? ''} ${a.skills.map(([s]) => `${data.skillById.get(s)?.es} ${data.skillById.get(s)?.en}`).join(' ')} ${a.bonus != null ? data.bonusById.get(a.bonus)?.es : ''}`,
    [data],
  )
  const tName = ARMOR_TYPE_NAMES[type][lang]
  return (
    <section className="card equip">
      <header className="equip-head">
        <span className="equip-type">{tName}</span>
        <button className="equip-pick" onClick={() => setOpen(true)}>
          {piece ? (
            <>
              <Rarity r={piece.rarity} /> <span className="equip-name">{nameOf(piece, lang)}</span>
            </>
          ) : (
            <span className="muted">Elegir {tName.toLowerCase()}…</span>
          )}
        </button>
        {piece && <button className="icon-btn" onClick={() => update((b) => { b.armor[type] = { id: null, decos: [] } })} aria-label="Quitar pieza">✕</button>}
      </header>
      {piece && (
        <div className="equip-body">
          <div className="row-between">
            <SkillList skills={piece.skills} />
            <span className="muted small">🛡 {piece.def[build.defenseMode === 'base' ? 0 : build.defenseMode === 'max' ? 1 : 2]}</span>
          </div>
          {piece.bonus != null && <div className="small bonus-line">✦ {nameOf(data.bonusById.get(piece.bonus), lang)}</div>}
          <DecoSlots slots={piece.slots} decos={build.armor[type].decos} onChange={(i, d) => update((b) => { b.armor[type].decos[i] = d })} />
        </div>
      )}
      {open && (
        <Picker<Armor>
          title={`Elegir ${tName.toLowerCase()}`}
          items={items}
          getKey={(a) => a.id}
          searchText={search}
          allowClear
          selectedKey={build.armor[type].id}
          onClose={() => setOpen(false)}
          toolbar={<RankChips value={rank} onChange={setRank} />}
          onPick={(a) => {
            setOpen(false)
            update((b) => {
              b.armor[type] = a ? { id: a.id, decos: fitDecos(b.armor[type].decos, a.slots, data) } : { id: null, decos: [] }
            })
          }}
          render={(a) => (
            <>
              <Rarity r={a.rarity} />
              <span className="pick-name">{nameOf(a, lang)}</span>
              <SkillList skills={a.skills} compact />
              {a.bonus != null && <span className="pick-meta bonus-line">✦ {nameOf(data.bonusById.get(a.bonus), lang)}</span>}
              <Slots slots={a.slots} />
            </>
          )}
        />
      )}
    </section>
  )
}

// ------------------------------------------------------------------ Amuleto
export function CharmCard({ build, update }: { build: Build; update: Update }) {
  const { data, lang } = useApp()
  const [open, setOpen] = useState(false)
  const c = build.charm != null ? data.charmById.get(build.charm) : undefined
  const items = useMemo(() => [...data.charms].sort((a, b) => nameOf(a, lang).localeCompare(nameOf(b, lang))), [data, lang])
  const search = useCallback((x: Charm) => `${x.es} ${x.en} ${x.skills.map(([s]) => `${data.skillById.get(s)?.es} ${data.skillById.get(s)?.en}`).join(' ')}`, [data])
  return (
    <section className="card equip">
      <header className="equip-head">
        <span className="equip-type">Amuleto</span>
        <button className="equip-pick" onClick={() => setOpen(true)}>
          {c ? <><Rarity r={c.rarity} /> <span className="equip-name">{nameOf(c, lang)}</span></> : <span className="muted">Elegir amuleto…</span>}
        </button>
        {c && <button className="icon-btn" onClick={() => update((b) => { b.charm = null })} aria-label="Quitar amuleto">✕</button>}
      </header>
      {c && <div className="equip-body"><SkillList skills={c.skills} /></div>}
      {open && (
        <Picker<Charm>
          title="Elegir amuleto"
          items={items}
          getKey={(x) => x.id}
          searchText={search}
          allowClear
          selectedKey={build.charm}
          onClose={() => setOpen(false)}
          onPick={(x) => { setOpen(false); update((b) => { b.charm = x?.id ?? null }) }}
          render={(x) => (<><Rarity r={x.rarity} /><span className="pick-name">{nameOf(x, lang)}</span><SkillList skills={x.skills} compact /></>)}
        />
      )}
    </section>
  )
}

export function EquipmentList({ build, update, computed, rank, setRank }: { build: Build; update: Update; computed: Computed; rank: RankFilter; setRank: (r: RankFilter) => void }) {
  return (
    <div className="equipment">
      <WeaponCard build={build} update={update} computed={computed} rank={rank} setRank={setRank} />
      {ARMOR_TYPES.map((t) => (
        <ArmorCard key={t} type={t} build={build} update={update} piece={computed.pieces[t]} rank={rank} setRank={setRank} />
      ))}
      <CharmCard build={build} update={update} />
    </div>
  )
}
