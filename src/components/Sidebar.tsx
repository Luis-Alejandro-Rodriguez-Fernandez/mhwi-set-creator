import { useRef } from 'react'
import { nameOf, weaponTypeInfo } from '../logic/data'
import { useApp } from '../logic/context'
import type { Build } from '../logic/build'
import { exportBuildsFile, parseImport } from '../logic/storage'
import { confirmAsync } from '../logic/dialog'

interface Props {
  builds: Build[]
  currentId: string
  dirty: boolean
  onSelect: (b: Build) => void
  onNew: () => void
  onDelete: (id: string) => void
  onDuplicate: (b: Build) => void
  onImport: (bs: Build[]) => void
  notify: (msg: string) => void
}

export function Sidebar({ builds, currentId, dirty, onSelect, onNew, onDelete, onDuplicate, onImport, notify }: Props) {
  const { data, lang } = useApp()
  const file = useRef<HTMLInputElement>(null)
  const sorted = [...builds].sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <aside className="sidebar card">
      <div className="row-between">
        <h3>Mis builds <span className="muted small">({builds.length})</span></h3>
        <button className="btn small" onClick={onNew}>+ Nueva</button>
      </div>
      {!builds.length && <p className="muted small">Aún no hay builds guardadas. Se guardan en este navegador (localStorage).</p>}
      <ul className="build-list">
        {sorted.map((b) => {
          const w = b.weapon.id != null ? data.weaponById.get(b.weapon.id) : undefined
          return (
            <li key={b.id} className={b.id === currentId ? 'current' : ''}>
              <button className="build-item" onClick={() => onSelect(b)}>
                <span className="build-name">{b.name || 'Sin nombre'}{b.id === currentId && dirty ? ' •' : ''}</span>
                <span className="muted small">
                  {w ? `${weaponTypeInfo(w.type)[lang]} · ${nameOf(w, lang)}` : 'Sin arma'}
                </span>
                <span className="muted tiny">{new Date(b.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </button>
              <div className="build-actions">
                <button className="icon-btn" title="Duplicar" onClick={() => onDuplicate(b)}>⧉</button>
                <button className="icon-btn" title="Eliminar" onClick={async () => (await confirmAsync(`¿Eliminar "${b.name}"? No se puede deshacer.`, { confirmLabel: 'Eliminar', danger: true })) && onDelete(b.id)}>🗑</button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="row gap">
        <button className="btn small ghost" disabled={!builds.length} onClick={() => exportBuildsFile(builds)}>Exportar</button>
        <button className="btn small ghost" onClick={() => file.current?.click()}>Importar</button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              const bs = parseImport(await f.text())
              onImport(bs)
              notify(`${bs.length} build(s) importada(s)`)
            } catch {
              notify('Archivo no válido')
            }
          }}
        />
      </div>
    </aside>
  )
}
