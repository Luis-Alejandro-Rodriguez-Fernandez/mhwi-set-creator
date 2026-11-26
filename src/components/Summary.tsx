import { nameOf, RES_NAMES } from '../logic/data'
import { useApp } from '../logic/context'
import type { Build, Computed } from '../logic/build'
import { CONDITIONS, SHARP_COLORS, SHARP_NAMES } from '../logic/rules'

type Update = (fn: (b: Build) => void) => void

export function SharpnessBar({ bars, full }: { bars: number[]; full?: number[] }) {
  const total = 400
  return (
    <div className="sharp" title={bars.map((v, i) => `${SHARP_NAMES[i]}: ${v}`).join(' · ')}>
      {bars.map((v, i) => v > 0 && <span key={i} style={{ width: `${(v / total) * 100}%`, background: SHARP_COLORS[i] }} />)}
      {full && (() => {
        const extra = full.reduce((a, b) => a + b, 0) - bars.reduce((a, b) => a + b, 0)
        return extra > 0 ? <span className="sharp-extra" style={{ width: `${(extra / total) * 100}%` }} title={`+${extra} con más Artesanía`} /> : null
      })()}
    </div>
  )
}

export function StatsPanel({ build, update, computed }: { build: Build; update: Update; computed: Computed }) {
  const { data, lang } = useApp()
  const s = computed.stats
  const relevant = CONDITIONS.filter((c) => c.skills.some((sk) => computed.skillLevel(sk) > 0))
  return (
    <section className="card stats">
      <h3>Estadísticas</h3>
      {s ? (
        <>
          <div className="stat-grid">
            <div><label>Ataque</label><b>{s.attackDisplay}</b><small className="muted">real {s.trueRaw}</small></div>
            <div><label>Afinidad</label><b className={s.affinity < 0 ? 'neg' : s.affinity > 0 ? 'pos' : ''}>{s.affinity}%</b><small className="muted">crít ×{s.critMult.toFixed(2)}</small></div>
            <div><label>Raw efectivo</label><b className="accent">{s.efr}</b><small className="muted">EFR</small></div>
            <div><label>Defensa</label><b>{computed.defense}</b>
              <select className="mini" value={build.defenseMode} onChange={(e) => update((b) => { b.defenseMode = e.target.value as Build['defenseMode'] })}>
                <option value="base">base</option>
                <option value="max">mejorada</option>
                <option value="augmented">con aumentos</option>
              </select>
            </div>
          </div>
          {s.elements.length > 0 && (
            <div className="elements small">
              {s.elements.map((e) => (
                <span key={e.type} className={`elem ${e.type.toLowerCase()}`}>
                  {lang === 'es' ? { Fire: 'Fuego', Water: 'Agua', Thunder: 'Trueno', Ice: 'Hielo', Dragon: 'Dragón', Poison: 'Veneno', Paralysis: 'Parálisis', Sleep: 'Sueño', Blast: 'Nitro' }[e.type] : e.type}{' '}
                  <b>{e.display}</b>{e.hidden && e.display === 0 ? ' (oculto)' : ''}
                </span>
              ))}
            </div>
          )}
          {s.sharpness && (
            <SharpnessBar bars={s.sharpness} full={computed.weapon?.sharpness ?? undefined} />
          )}
          {s.applied.length > 0 && (
            <div className="applied">
              <span className="small muted">Bonus especiales aplicados:</span>
              <ul>
                {s.applied.map((a) => (
                  <li key={a.label} className="small"><b>{a.label}</b> <span className="muted">{a.detail}</span></li>
                ))}
              </ul>
            </div>
          )}
          {relevant.length > 0 && (
            <div className="conds">
              <span className="small muted">Condiciones activas para el cálculo:</span>
              {relevant.map((c) =>
                c.options ? (
                  <label key={c.key} className="check small">
                    {c.es}:
                    <select id={`cond-${c.key}`} className="mini" value={Number(build.conditions[c.key] ?? 0)} onChange={(e) => update((b) => { b.conditions[c.key] = Number(e.target.value) })}>
                      {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                ) : (
                  <label key={c.key} className="check small">
                    <input id={`cond-${c.key}`} type="checkbox" checked={!!build.conditions[c.key]} onChange={(e) => update((b) => { b.conditions[c.key] = e.target.checked })} />
                    {c.es}
                  </label>
                ),
              )}
            </div>
          )}
        </>
      ) : (
        <div className="stat-grid"><div><label>Defensa</label><b>{computed.defense}</b></div></div>
      )}
      <div className="res small">
        {computed.res.map((r, i) => (
          <span key={i} className={r < 0 ? 'neg' : r > 0 ? 'pos' : ''}>{RES_NAMES[i]} {r > 0 ? '+' : ''}{r}</span>
        ))}
        <span className="muted" title={`Armadura ${computed.resBreakdown.armor} · Habilidades y joyas ${computed.resBreakdown.skills} · Set ${computed.resBreakdown.set}`}>
          Total {computed.resBreakdown.total}
        </span>
      </div>
      <div className="small muted">Ranuras ocupadas: {computed.slots.used}/{computed.slots.total}</div>
      {computed.bonuses.length > 0 && (
        <div className="bonuses">
          {computed.bonuses.map((bn) => {
            const bonus = data.bonusById.get(bn.bonus)!
            return (
              <div key={bn.bonus} className="bonus">
                <b>✦ {nameOf(bonus, lang)}</b> <span className="muted small">({bn.count} piezas)</span>
                {bn.active.map((r) => (
                  <div key={r.skill} className={`small ${r.on ? 'pos' : 'muted'}`}>
                    {r.pieces} pz: {nameOf(data.skillById.get(r.skill), lang)} {r.on ? '✓' : ''}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function SkillsPanel({ computed }: { computed: Computed }) {
  const { data, lang } = useApp()
  return (
    <section className="card skills">
      <h3>Habilidades <span className="muted small">({computed.skills.length})</span></h3>
      {!computed.skills.length && <p className="muted small">Equipa piezas o joyas para ver las habilidades.</p>}
      <ul className="skill-sum">
        {computed.skills.map((s) => {
          const sk = data.skillById.get(s.skill)!
          const over = s.points - s.max
          const desc = s.level > 0 ? sk.levels[s.level - 1]?.[lang] : ''
          return (
            <li key={s.skill} title={`${sk[lang === 'es' ? 'descEs' : 'descEn']}\n\n${s.sources.map((x) => `${x.label}: +${x.points}`).join('\n')}`}>
              <div className="row-between">
                <span className="skill-name">{nameOf(sk, lang)}</span>
                <span className={`lvl${s.level >= s.max ? ' maxed' : ''}`}>
                  {s.level}/{s.max}{over > 0 && <span className="neg"> (+{over})</span>}
                </span>
              </div>
              <div className="pips">
                {Array.from({ length: sk.max }, (_, i) => (
                  <span key={i} className={`pip${i < s.level ? ' on' : ''}${i >= s.max ? ' locked' : ''}`} />
                ))}
              </div>
              {desc && <div className="small muted desc">{desc}</div>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
