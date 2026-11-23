import { useEffect, useMemo, useRef, useState } from 'react'
import { ARMOR_TYPES, type ArmorType, type Skill } from '../types'
import { ARMOR_TYPE_NAMES, nameOf } from '../logic/data'
import { useApp } from '../logic/context'
import { computeBuild, type Build, type Computed } from '../logic/build'
import type { OptimizerInput, OptimizerOutput, OptimizerResult } from '../optimizer/core'
import { Picker } from './Picker'
import { Rarity, SlotIcon } from './bits'

interface Props {
  build: Build
  computed: Computed
  onApply: (r: OptimizerResult) => void
}

interface Target { skill: number; level: number }
const KEY = 'mhw-builder:optimizer:v1'

export function Optimizer({ build, computed, onApply }: Props) {
  const { data, lang } = useApp()
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
  }, [])
  const [targets, setTargets] = useState<Target[]>(saved.targets ?? [])
  const [includeHR, setIncludeHR] = useState<boolean>(saved.includeHR ?? false)
  const [useCharm, setUseCharm] = useState<boolean>(saved.useCharm ?? true)
  const [locked, setLocked] = useState<Partial<Record<ArmorType, boolean>>>({})
  const [picking, setPicking] = useState(false)
  const [running, setRunning] = useState<{ found: number; checked: number } | null>(null)
  const [out, setOut] = useState<OptimizerOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const worker = useRef<Worker | null>(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ targets, includeHR, useCharm })) } catch { /* sin almacenamiento */ }
  }, [targets, includeHR, useCharm])
  useEffect(() => () => worker.current?.terminate(), [])

  // habilidades seleccionables: las que aparecen en equipo, joyas, amuletos o bonus
  const selectable = useMemo(() => {
    const ids = new Set<number>()
    for (const a of data.armor) a.skills.forEach(([s]) => ids.add(s))
    for (const d of data.decorations) d.skills.forEach(([s]) => ids.add(s))
    for (const c of data.charms) c.skills.forEach(([s]) => ids.add(s))
    for (const b of data.setBonuses) b.ranks.forEach((r) => ids.add(r.skill))
    return data.skills.filter((s) => ids.has(s.id)).sort((a, b) => nameOf(a, lang).localeCompare(nameOf(b, lang)))
  }, [data, lang])

  const maxFor = (s: Skill) => s.max
  const run = () => {
    worker.current?.terminate()
    setOut(null)
    setError(null)
    const w = new Worker(new URL('../optimizer/worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    const fixed: Partial<Record<ArmorType, number>> = {}
    for (const t of ARMOR_TYPES) if (locked[t] && build.armor[t].id != null) fixed[t] = build.armor[t].id!
    const input: OptimizerInput = {
      targets,
      weaponSlots: computed.weaponSlots,
      weaponSkill: computed.weapon?.skill ?? null,
      weaponBonus: computed.weapon?.bonus ?? null,
      fixed,
      excluded: [],
      useCharm,
      ranks: includeHR ? ['HR', 'MR'] : ['MR'],
      maxResults: 40,
      timeLimitMs: 20000,
    }
    setRunning({ found: 0, checked: 0 })
    w.onmessage = (e) => {
      const m = e.data
      if (m.type === 'progress') setRunning({ found: m.found, checked: m.checked })
      if (m.type === 'done') { setOut(m.out); setRunning(null); w.terminate() }
      if (m.type === 'error') { setError(m.message); setRunning(null); w.terminate() }
    }
    w.onerror = (e) => { setError(e.message); setRunning(null) }
    w.postMessage({ input, dataUrl: new URL(`${import.meta.env.BASE_URL}data/mhw-data.json`, location.href).href })
  }
  const cancel = () => { worker.current?.terminate(); setRunning(null) }

  const fromCurrent = () =>
    setTargets(computed.skills.filter((s) => s.level > 0).map((s) => ({ skill: s.skill, level: s.level })))

  return (
    <div className="optimizer">
      <section className="card">
        <div className="row-between">
          <h3>Optimizador de builds</h3>
          <div className="row gap">
            <button className="btn small ghost" onClick={fromCurrent} disabled={!computed.skills.length}>Usar habilidades actuales</button>
            <button className="btn small ghost" onClick={() => setTargets([])} disabled={!targets.length}>Limpiar</button>
          </div>
        </div>
        <p className="muted small">
          Elige las habilidades que quieres y el optimizador busca armadura, amuleto y joyas que las cumplan, usando las ranuras de tu arma actual
          {computed.weapon ? <> (<b>{nameOf(computed.weapon, lang)}</b>: {computed.weaponSlots.map((s, i) => <SlotIcon key={i} size={s} />)})</> : ' (sin arma: no se usan ranuras de arma)'}.
          Los resultados priorizan más ranuras libres y más defensa.
        </p>

        <ul className="targets">
          {targets.map((t, i) => {
            const sk = data.skillById.get(t.skill)!
            const bonus = data.bonusSkill.get(t.skill)
            return (
              <li key={t.skill}>
                <span className="skill-name">{nameOf(sk, lang)}{bonus && <span className="muted small"> · bonus {nameOf(data.bonusById.get(bonus.bonus), lang)} ({bonus.pieces} pz)</span>}</span>
                <div className="stepper">
                  {Array.from({ length: maxFor(sk) }, (_, l) => (
                    <button key={l} className={`step${t.level === l + 1 ? ' on' : ''}${l >= sk.max - sk.secret ? ' secret' : ''}`}
                      title={l >= sk.max - sk.secret ? 'Requiere Secreto' : ''}
                      onClick={() => setTargets((ts) => ts.map((x, j) => (j === i ? { ...x, level: l + 1 } : x)))}>{l + 1}</button>
                  ))}
                </div>
                <button className="icon-btn" onClick={() => setTargets((ts) => ts.filter((_, j) => j !== i))} aria-label="Quitar">✕</button>
              </li>
            )
          })}
        </ul>
        <button className="btn" onClick={() => setPicking(true)}>+ Añadir habilidad</button>

        <div className="opt-options">
          <label className="check small"><input type="checkbox" checked={useCharm} onChange={(e) => setUseCharm(e.target.checked)} /> Incluir amuleto</label>
          <label className="check small"><input type="checkbox" checked={includeHR} onChange={(e) => setIncludeHR(e.target.checked)} /> Incluir armaduras de Rango Alto</label>
          <span className="small muted">Fijar piezas actuales:</span>
          {ARMOR_TYPES.map((t) => (
            <label key={t} className={`check small${build.armor[t].id == null ? ' disabled' : ''}`}>
              <input type="checkbox" disabled={build.armor[t].id == null} checked={!!locked[t] && build.armor[t].id != null} onChange={(e) => setLocked((l) => ({ ...l, [t]: e.target.checked }))} />
              {ARMOR_TYPE_NAMES[t][lang]}
            </label>
          ))}
        </div>
        <div className="row gap">
          {running ? (
            <>
              <button className="btn danger" onClick={cancel}>Cancelar</button>
              <span className="small muted">Buscando… {running.found} encontradas, {running.checked.toLocaleString('es-ES')} combinaciones revisadas</span>
            </>
          ) : (
            <button className="btn primary" disabled={!targets.length} onClick={run}>Buscar builds</button>
          )}
        </div>
        {error && <p className="warn small">{error}</p>}
      </section>

      {out && (
        <section className="card">
          <h3>
            {out.results.length ? `${out.results.length} resultado(s)` : 'Sin resultados'}
            <span className="muted small"> · {out.ms} ms · {out.combosChecked.toLocaleString('es-ES')} combinaciones{out.timedOut ? ' · tiempo agotado (resultados parciales)' : ''}</span>
          </h3>
          {out.warnings.map((w) => <p key={w} className="warn small">{w}</p>)}
          {!out.results.length && <p className="muted small">No hay combinación posible. Prueba bajando niveles, incluyendo Rango Alto o desbloqueando piezas.</p>}
          <div className="results">
            {out.results.map((r, i) => <ResultCard key={i} r={r} build={build} targets={targets} onApply={() => onApply(r)} />)}
          </div>
        </section>
      )}

      {picking && (
        <Picker<Skill>
          title="Añadir habilidad objetivo"
          items={selectable.filter((s) => !targets.some((t) => t.skill === s.id))}
          getKey={(s) => s.id}
          searchText={(s) => `${s.es} ${s.en} ${s.descEs}`}
          onClose={() => setPicking(false)}
          onPick={(s) => {
            setPicking(false)
            if (s) setTargets((ts) => [...ts, { skill: s.id, level: Math.max(1, s.max - s.secret) }])
          }}
          render={(s) => (
            <>
              <span className="pick-name">{nameOf(s, lang)}</span>
              <span className="pick-meta muted">máx {s.max}{s.secret ? ` (${s.max - s.secret} sin secreto)` : ''}</span>
              <span className="pick-desc muted small">{lang === 'es' ? s.descEs : s.descEn}</span>
            </>
          )}
        />
      )}
    </div>
  )
}

function ResultCard({ r, build, targets, onApply }: { r: OptimizerResult; build: Build; targets: Target[]; onApply: () => void }) {
  const { data, lang } = useApp()
  const preview = useMemo(() => {
    const b: Build = structuredClone(build)
    b.charm = r.charm
    b.weapon.decos = r.decos.weapon
    for (const t of ARMOR_TYPES) b.armor[t] = { id: r.armor[t], decos: r.decos.armor[t] }
    return computeBuild(b, data, lang)
  }, [r, build, data, lang])
  const targetIds = new Set(targets.map((t) => t.skill))
  const extras = preview.skills.filter((s) => !targetIds.has(s.skill))
  const decoCount = new Map<number, number>()
  for (const d of [...r.decos.weapon, ...ARMOR_TYPES.flatMap((t) => r.decos.armor[t])]) if (d != null) decoCount.set(d, (decoCount.get(d) ?? 0) + 1)
  return (
    <article className="result">
      <div className="result-head">
        <div className="small">
          🛡 <b>{preview.defense}</b>&nbsp;· {r.freeSlots.length} ranuras libres:&nbsp;{r.freeSlots.length ? r.freeSlots.map((s, i) => <SlotIcon key={i} size={s} />) : '—'}
        </div>
        <button className="btn small primary" onClick={onApply}>Aplicar</button>
      </div>
      <ul className="result-pieces small">
        {ARMOR_TYPES.map((t) => {
          const a = r.armor[t] != null ? data.armorById.get(r.armor[t]!) : undefined
          return <li key={t}><span className="muted">{ARMOR_TYPE_NAMES[t][lang]}:</span> {a ? <><Rarity r={a.rarity} /> {nameOf(a, lang)}</> : '—'}</li>
        })}
        <li><span className="muted">Amuleto:</span> {r.charm != null ? nameOf(data.charmById.get(r.charm), lang) : '—'}</li>
      </ul>
      <div className="small deco-summary">
        {[...decoCount.entries()].map(([id, n]) => {
          const d = data.decoById.get(id)!
          return <span key={id} className="skill-tag"><SlotIcon size={d.size} filled /> {nameOf(d, lang)} ×{n}</span>
        })}
      </div>
      {extras.length > 0 && (
        <div className="small muted">Extra: {extras.map((s) => `${nameOf(data.skillById.get(s.skill), lang)} ${s.level}`).join(', ')}</div>
      )}
    </article>
  )
}
