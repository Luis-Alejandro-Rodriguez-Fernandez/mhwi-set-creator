// Diálogo propio de la página (sustituye a confirm()/prompt(), que algunos visores bloquean).
export interface DialogRequest {
  message: string
  /** texto seleccionable (p. ej. un enlace para copiar a mano) */
  text?: string
  confirmLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

type Listener = (d: DialogRequest | null) => void
let listener: Listener | null = null

export const setDialogListener = (l: Listener | null) => { listener = l }

export function confirmAsync(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(true)
    listener({ message, ...opts, resolve: (ok) => { listener?.(null); resolve(ok) } })
  })
}

export function showText(message: string, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(true)
    listener({ message, text, resolve: (ok) => { listener?.(null); resolve(ok) } })
  })
}
