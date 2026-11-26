import { useCallback, useMemo, useState } from 'react'
import { ARMOR_TYPES, type Armor, type ArmorType, type Charm, type Decoration, type Weapon } from '../types'
import { ARMOR_TYPE_NAMES, ELEMENT_NAMES, WEAPON_TYPES, nameOf, weaponTypeInfo } from '../logic/data'
import { augmentMaxLevel, clampAugments, fitDecos, weaponSlots, type Build, type Computed } from '../logic/build'
import { AUGMENT_CAPACITY, AUGMENT_EFFECT, AUGMENT_NAMES, AUGMENT_ORDER, CUSTOM_NAMES, augmentCost, customBonus, type AugmentKey, type CustomKey } from '../logic/rules'
import { useApp } from '../logic/context'
import { Picker } from './Picker'
import { Rarity, SkillList, SlotIcon, Slots } from './bits'
import { SupportCard } from './Support'

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

          {isMr ? (
            <details className="sub" open={Object.values(build.weapon.augments).some((v) => v > 0)}>
              <summary>
                Aumentos
                <span className={`badge${computed.augment.over ? ' bad' : ''}`} title="Huecos de aumento usados / disponibles">{computed.augment.used}/{computed.augment.capacity}</span>
              </summary>
              <div className="augments">
                <div className="aug-row">
                  <span className="aug-name">Nivel de aumento</span>
                  <div className="stepper">
                    {(AUGMENT_CAPACITY[w.rarity] ?? []).map((capN, i) => (
                      <button key={i} className={`step${build.weapon.augmentLevel === i + 1 ? ' on' : ''}`} title={`${capN} huecos`} onClick={() => update((b) => { b.weapon.augmentLevel = i + 1 })}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <span className="muted small">{computed.augment.capacity} huecos (sube con "Huecos extra")</span>
                </div>
                {AUGMENT_ORDER.map((k) => {
                  const lv = build.weapon.augments[k]
                  const max = augmentMaxLevel(k, w.rarity)
                  return (
                    <div key={k} className="aug-row">
                      <span className="aug-name">{AUGMENT_NAMES[k]}</span>
                      <div className="stepper">
                        {Array.from({ length: max + 1 }, (_, i) => (
                          <button key={i} className={`step${lv === i ? ' on' : ''}`} onClick={() => setAug(k, i)} title={i ? `${AUGMENT_EFFECT[k](i)} · ${augmentCost(k, i, w.rarity)} huecos` : 'Sin aumento'}>
                            {i === 0 ? '–' : ['I', 'II', 'III', 'IV'][i - 1]}
                          </button>
                        ))}
                      </div>
                      <span className="muted small">{lv ? `${AUGMENT_EFFECT[k](lv)} · ${augmentCost(k, lv, w.rarity)} huecos` : ''}</span>
                    </div>
                  )
                })}
                {computed.augment.over && <p className="warn small">Superas los huecos de aumento: sube el nivel de aumento o quita alguno.</p>}
              </div>
            </details>
          ) : (
            <p className="muted small">Los aumentos y las mejoras personalizadas solo existen en armas de Rango Maestro (rareza 10-12).</p>
          )}

          {isMr && (
            <details className="sub" open={build.weapon.customUpgrades.some((k) => k != null)}>
              <summary>
                Mejoras personalizadas
                <span className="badge">{build.weapon.customUpgrades.filter((k) => k != null).length}/7</span>
              </summary>
              <p className="muted small">Una mejora por nivel. Ataque +1 (nv7: +3), afinidad +1% (nv7: +3%), elemento +10, defensa +10.</p>
              <div className="augments">
                {build.weapon.customUpgrades.map((cur, i) => (
                  <div key={i} className="aug-row">
                    <span className="aug-name">Nivel {i + 1}</span>
                    <div className="stepper">
                      <button className={`step${cur == null ? ' on' : ''}`} onClick={() => update((b) => { b.weapon.customUpgrades[i] = null })}>–</button>
                      {(Object.keys(CUSTOM_NAMES) as CustomKey[]).map((k) => (
                        <button key={k} className={`step${cur === k ? ' on' : ''}`} onClick={() => update((b) => { b.weapon.customUpgrades[i] = k })}>
                          {CUSTOM_NAMES[k]}
                        </button>
                      ))}
                    </div>
                    <span className="muted small">{cur ? `+${customBonus(cur, i + 1)}${cur === 'affinity' ? '%' : ''}` : ''}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="sub" open={Object.values(build.weapon.custom).some((v) => v !== 0)}>
            <summary>Ajustes manuales</summary>
            <p className="muted small">Para despertares de Safi'jiiva o cualquier bonus que no esté en la base de datos. Valores tal como los muestra el juego.</p>
            <div className="custom-grid">
              {(['attack', 'affinity', 'element', 'defense'] as const).map((k) => (
                <label key={k}>
                  <span className="small">{{ attack: 'Ataque', affinity: 'Afinidad %', element: 'Elemento', defense: 'Defensa' }[k]}</span>
                  <input id={`manual-${k}`} type="number" value={build.weapon.custom[k]} onChange={(e) => update((b) => { b.weapon.custom[k] = Number(e.target.value) || 0 })} />
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
              clampAugments(b, x ?? undefined)
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
      <SupportCard build={build} update={update} />
    </div>
  )
}
