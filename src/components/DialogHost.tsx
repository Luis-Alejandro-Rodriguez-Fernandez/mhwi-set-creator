import { useEffect, useState } from 'react'
import { setDialogListener, type DialogRequest } from '../logic/dialog'

export function DialogHost() {
  const [d, setD] = useState<DialogRequest | null>(null)
  useEffect(() => {
    setDialogListener(setD)
    return () => setDialogListener(null)
  }, [])
  useEffect(() => {
    if (!d) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && d.resolve(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [d])
  if (!d) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && d.resolve(false)}>
      <div className="modal dialog" role="alertdialog" aria-label={d.message}>
        <p className="dialog-msg">{d.message}</p>
        {d.text != null && <input id="dialog-text" className="search" readOnly value={d.text} onFocus={(e) => e.target.select()} autoFocus />}
        <div className="row gap dialog-actions">
          {d.text == null ? (
            <>
              <button className="btn ghost" onClick={() => d.resolve(false)}>Cancelar</button>
              <button className={`btn ${d.danger ? 'danger' : 'primary'}`} autoFocus onClick={() => d.resolve(true)}>{d.confirmLabel ?? 'Aceptar'}</button>
            </>
          ) : (
            <button className="btn primary" onClick={() => d.resolve(true)}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  )
}
