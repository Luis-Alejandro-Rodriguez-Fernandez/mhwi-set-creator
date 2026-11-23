import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fold } from '../logic/data'

interface Props<T> {
  title: string
  items: T[]
  searchText: (item: T) => string
  render: (item: T) => ReactNode
  getKey: (item: T) => string | number
  onPick: (item: T | null) => void
  onClose: () => void
  toolbar?: ReactNode
  allowClear?: boolean
  selectedKey?: string | number | null
  limit?: number
}

export function Picker<T>({ title, items, searchText, render, getKey, onPick, onClose, toolbar, allowClear, selectedKey, limit = 250 }: Props<T>) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const index = useMemo(() => items.map((it) => fold(searchText(it))), [items, searchText])
  const filtered = useMemo(() => {
    const terms = fold(q).split(/\s+/).filter(Boolean)
    if (!terms.length) return items
    const phrase = terms.join(' ')
    // Prioriza coincidencias al principio del nombre / frase exacta, manteniendo el orden original
    return items
      .map((it, i) => ({ it, i, text: index[i] }))
      .filter((x) => terms.every((t) => x.text.includes(t)))
      .map((x) => {
        const p = x.text.indexOf(phrase)
        return { ...x, score: p === 0 ? 0 : p > 0 ? 1 + p / 1000 : 2 }
      })
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .map((x) => x.it)
  }, [q, items, index])
  const shown = filtered.slice(0, limit)

  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal-tools">
          <input
            ref={input}
            className="search"
            placeholder="Buscar por nombre o habilidad…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
              if (e.key === 'Enter' && shown[active]) onPick(shown[active])
            }}
          />
          {toolbar}
        </div>
        <div className="modal-list">
          {allowClear && (
            <button className="pick-row clear" onClick={() => onPick(null)}>— Quitar —</button>
          )}
          {shown.map((it, i) => (
            <button
              key={getKey(it)}
              className={`pick-row${i === active ? ' active' : ''}${selectedKey === getKey(it) ? ' selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(it)}
            >
              {render(it)}
            </button>
          ))}
          {!filtered.length && <p className="muted pad">Sin resultados.</p>}
          {filtered.length > limit && <p className="muted pad">Mostrando {limit} de {filtered.length}. Afina la búsqueda.</p>}
        </div>
      </div>
    </div>
  )
}
