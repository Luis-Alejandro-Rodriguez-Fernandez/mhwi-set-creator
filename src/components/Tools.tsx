import { useMemo } from 'react'
import { nameOf } from '../logic/data'
import { useApp } from '../logic/context'
import { emptyTool, fitDecos, type Build } from '../logic/build'
import { TOOL_EFFECTS } from '../logic/rules'
import { DecoSlots } from './Equipment'
import { Slots } from './bits'

type Update = (fn: (b: Build) => void) => void

export function ToolsCard({ build, update }: { build: Build; update: Update }) {
  const { data, lang } = useApp()
  const mantles = useMemo(() => data.tools.filter((t) => t.type === 'mantle').sort((a, b) => nameOf(a, lang).localeCompare(nameOf(b, lang))), [data, lang])
  const boosters = useMemo(() => data.tools.filter((t) => t.type !== 'mantle').sort((a, b) => nameOf(a, lang).localeCompare(nameOf(b, lang))), [data, lang])

  return (
    <section className="card equip tools">
      <header className="equip-head">
        <span className="equip-type">Mantos</span>
        <span className="muted small">Dos herramientas especializadas. Las joyas de un manto solo cuentan mientras está activo.</span>
      </header>
      <div className="equip-body">
        {build.tools.map((ts, i) => {
          const tool = ts.id != null ? data.toolById.get(ts.id) : undefined
          const other = build.tools[1 - i]?.id
          const effect = tool ? TOOL_EFFECTS[tool.en] : undefined
          return (
            <div key={i} className={`tool-row${tool && !ts.active ? ' inactive' : ''}`}>
              <div className="tool-head">
                <select id={`tool-${i}`} aria-label={`Herramienta ${i + 1}`} value={ts.id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null
                    update((b) => {
                      const t = id != null ? data.toolById.get(id) : undefined
                      b.tools[i] = t ? { ...emptyTool(), id, decos: fitDecos(b.tools[i].decos, t.slots, data) } : emptyTool()
                    })
                  }}>
                  <option value="">— Herramienta {i + 1} —</option>
                  <optgroup label="Mantos">
                    {mantles.map((t) => <option key={t.id} value={t.id} disabled={t.id === other}>{nameOf(t, lang)}</option>)}
                  </optgroup>
                  <optgroup label="Potenciadores">
                    {boosters.map((t) => <option key={t.id} value={t.id} disabled={t.id === other}>{nameOf(t, lang)}</option>)}
                  </optgroup>
                </select>
                {tool && <Slots slots={tool.slots} />}
                {tool && (
                  <label className="check small">
                    <input id={`tool-active-${i}`} type="checkbox" checked={ts.active} onChange={(e) => update((b) => { b.tools[i].active = e.target.checked })} />
                    Activo
                  </label>
                )}
              </div>
              {tool && (
                <>
                  <div className="small muted">
                    {effect?.es} <span className="tiny">· dura {tool.duration} s, recarga {tool.recharge} s</span>
                  </div>
                  {effect?.dodgeAttackPct && (
                    <label className="check small">
                      <input id={`tool-dodge-${i}`} type="checkbox" checked={ts.dodge} disabled={!ts.active} onChange={(e) => update((b) => { b.tools[i].dodge = e.target.checked })} />
                      Tras esquiva perfecta (+{effect.dodgeAttackPct}% ataque)
                    </label>
                  )}
                  {tool.slots.length > 0 && (
                    <DecoSlots slots={tool.slots} decos={ts.decos} onChange={(d, deco) => update((b) => { b.tools[i].decos[d] = deco })} />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
