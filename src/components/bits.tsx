import { nameOf } from '../logic/data'
import { useApp } from '../logic/context'
import type { SkillPair } from '../types'

export const SlotIcon = ({ size, filled }: { size: number; filled?: boolean }) => (
  <span className={`slot-icon s${size}${filled ? ' filled' : ''}`} title={`Ranura nivel ${size}`}><span>{size}</span></span>
)

export const Slots = ({ slots }: { slots: number[] }) => (
  <span className="slots">{slots.length ? slots.map((s, i) => <SlotIcon key={i} size={s} />) : <span className="muted">—</span>}</span>
)

export const Rarity = ({ r }: { r: number }) => <span className={`rarity r${r}`}>R{r}</span>

export function SkillList({ skills, compact }: { skills: SkillPair[]; compact?: boolean }) {
  const { data, lang } = useApp()
  if (!skills.length) return null
  return (
    <span className={`skill-tags${compact ? ' compact' : ''}`}>
      {skills.map(([s, l]) => (
        <span key={s} className="skill-tag">{nameOf(data.skillById.get(s), lang)} <b>{l}</b></span>
      ))}
    </span>
  )
}
