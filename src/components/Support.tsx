import type { Build } from '../logic/build'
import {
  ATTACK_DRUGS, ATTACK_SEEDS, CHARM_ITEMS, DEFENSE_DRUGS, DEFENSE_SEEDS, FOOD_SKILLS, MAX_FOOD_SKILLS, MEAL_BONUS,
  MEAL_INGREDIENTS, MEAL_SIZES, type CharmItemKey, type ItemOption,
} from '../logic/rules'

type Update = (fn: (b: Build) => void) => void

const charmValue = (k: CharmItemKey) => {
  const c = CHARM_ITEMS[k] as { attack?: number; defense?: number }
  return c.attack ?? c.defense ?? 0
}

function ItemSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: ItemOption[]; onChange: (v: string) => void }) {
  return (
    <label className="support-field" htmlFor={id}>
      <span className="small muted">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.es}
            {o.attack ? ` (+${o.attack})` : ''}
            {o.defense ? ` (+${o.defense})` : ''}
            {o.defensePct ? ` (+${o.defensePct}%)` : ''}
            {o.note ? ` · ${o.note}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SupportCard({ build, update }: { build: Build; update: Update }) {
  const sp = build.support
  const used = (sp.meal.attack + sp.meal.defense) * 2
  const veggies = MEAL_INGREDIENTS - used
  const summary = [
    sp.meal.attack ? `Carne ${MEAL_SIZES[sp.meal.attack]}` : '',
    sp.meal.defense ? `Pescado ${MEAL_SIZES[sp.meal.defense]}` : '',
    sp.foodSkills.length ? `${sp.foodSkills.length} habilidad${sp.foodSkills.length > 1 ? 'es' : ''} felyne` : '',
  ].filter(Boolean).join(' · ')

  const mealRow = (key: 'attack' | 'defense', label: string, stat: string) => (
    <div className="aug-row">
      <span className="aug-name">{label}</span>
      <div className="stepper">
        {MEAL_SIZES.map((sz, i) => {
          const other = key === 'attack' ? sp.meal.defense : sp.meal.attack
          const fits = (i + other) * 2 <= MEAL_INGREDIENTS
          return (
            <button key={sz} className={`step${sp.meal[key] === i ? ' on' : ''}`} disabled={!fits}
              title={i ? `${i * 2} ingredientes: +${MEAL_BONUS[i]} ${stat}` : 'Sin bonus'}
              onClick={() => update((b) => { b.support.meal[key] = i })}>{sz}</button>
          )
        })}
      </div>
      <span className="muted small">{sp.meal[key] ? `+${MEAL_BONUS[sp.meal[key]]} ${stat}` : ''}</span>
    </div>
  )

  return (
    <section className="card equip support">
      <details open={used > 0 || sp.foodSkills.length > 0 || sp.attackDrug !== 'none' || sp.attackSeed !== 'none'}>
        <summary className="equip-head">
          <span className="equip-type">Apoyo</span>
          <span className="support-title">Cantina y objetos {summary && <span className="muted small">· {summary}</span>}</span>
        </summary>
        <div className="equip-body support-body">
          <div>
            <h4>Comida de la cantina</h4>
            <p className="muted small">Cada 2 ingredientes del mismo tipo suben un tamaño (S, M, L). Caben {MEAL_INGREDIENTS}: ahora {veggies} irían a verduras o bebidas.</p>
            <div className="augments">
              {mealRow('attack', 'Carne (ataque)', 'ataque')}
              {mealRow('defense', 'Pescado (defensa)', 'defensa')}
            </div>
          </div>

          <div>
            <h4>Habilidades felyne <span className="muted small">({sp.foodSkills.length}/{MAX_FOOD_SKILLS})</span></h4>
            <div className="support-checks">
              {FOOD_SKILLS.map((f) => {
                const on = sp.foodSkills.includes(f.key)
                return (
                  <label key={f.key} className={`check small${!on && sp.foodSkills.length >= MAX_FOOD_SKILLS ? ' disabled' : ''}`}>
                    <input id={`food-${f.key}`} type="checkbox" checked={on} disabled={!on && sp.foodSkills.length >= MAX_FOOD_SKILLS}
                      onChange={(e) => update((b) => {
                        b.support.foodSkills = e.target.checked ? [...b.support.foodSkills, f.key] : b.support.foodSkills.filter((k) => k !== f.key)
                      })} />
                    <span><b>{f.es}</b> <span className="muted">{f.desc}</span></span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <h4>Objetos de ataque</h4>
            <div className="support-grid">
              <ItemSelect id="attack-drug" label="Droga" value={sp.attackDrug} options={ATTACK_DRUGS} onChange={(v) => update((b) => { b.support.attackDrug = v })} />
              <ItemSelect id="attack-seed" label="Semilla, polvo o píldora" value={sp.attackSeed} options={ATTACK_SEEDS} onChange={(v) => update((b) => { b.support.attackSeed = v })} />
            </div>
            <div className="support-checks row-wrap">
              {(['powercharm', 'powertalon'] as CharmItemKey[]).map((k) => (
                <label key={k} className="check small">
                  <input id={`charm-${k}`} type="checkbox" checked={sp.charms[k]} onChange={(e) => update((b) => { b.support.charms[k] = e.target.checked })} />
                  {CHARM_ITEMS[k].es} (+{charmValue(k)})
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4>Objetos de defensa</h4>
            <div className="support-grid">
              <ItemSelect id="defense-drug" label="Piel" value={sp.defenseDrug} options={DEFENSE_DRUGS} onChange={(v) => update((b) => { b.support.defenseDrug = v })} />
              <ItemSelect id="defense-seed" label="Semilla, polvo o píldora" value={sp.defenseSeed} options={DEFENSE_SEEDS} onChange={(v) => update((b) => { b.support.defenseSeed = v })} />
            </div>
            <div className="support-checks row-wrap">
              {(['armorcharm', 'armortalon'] as CharmItemKey[]).map((k) => (
                <label key={k} className="check small">
                  <input id={`charm-${k}`} type="checkbox" checked={sp.charms[k]} onChange={(e) => update((b) => { b.support.charms[k] = e.target.checked })} />
                  {CHARM_ITEMS[k].es} (+{charmValue(k)})
                </label>
              ))}
            </div>
          </div>
          <button className="btn small ghost support-reset" onClick={() => update((b) => {
            b.support = { meal: { attack: 0, defense: 0 }, foodSkills: [], attackDrug: 'none', attackSeed: 'none', defenseDrug: 'none', defenseSeed: 'none', charms: { ...b.support.charms } }
          })}>Quitar comida y consumibles</button>
        </div>
      </details>
    </section>
  )
}
