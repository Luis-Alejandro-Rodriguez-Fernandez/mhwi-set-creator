import { normalizeBuild, uid, type Build } from './build'

const KEY_BUILDS = 'mhw-builder:builds:v1'
const KEY_DRAFT = 'mhw-builder:draft:v1'
const KEY_PREFS = 'mhw-builder:prefs:v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const loadBuilds = (): Build[] => read<Partial<Build>[]>(KEY_BUILDS, []).map(normalizeBuild)
export const saveBuilds = (builds: Build[]) => write(KEY_BUILDS, builds)
export const loadDraft = (): Build | null => {
  const d = read<Partial<Build> | null>(KEY_DRAFT, null)
  return d ? normalizeBuild(d) : null
}
export const saveDraft = (b: Build) => write(KEY_DRAFT, b)

export interface Prefs {
  lang: 'es' | 'en'
  rankFilter: 'MR' | 'HR' | 'ALL'
  theme: 'auto' | 'light' | 'dark'
}
export const loadPrefs = (): Prefs => ({ lang: 'es', rankFilter: 'MR', theme: 'auto', ...read<Partial<Prefs>>(KEY_PREFS, {}) })
export const savePrefs = (p: Prefs) => write(KEY_PREFS, p)

// ---------- Exportar / importar ----------
export function exportBuildsFile(builds: Build[]) {
  const blob = new Blob([JSON.stringify({ app: 'mhw-builder', version: 1, builds }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mhw-builds-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseImport(text: string): Build[] {
  const json = JSON.parse(text)
  const list: Partial<Build>[] = Array.isArray(json) ? json : Array.isArray(json?.builds) ? json.builds : [json]
  return list.filter((b) => b && typeof b === 'object' && 'armor' in b).map((b) => ({ ...normalizeBuild(b), id: uid() }))
}

// ---------- Enlace para compartir (build codificada en el #hash) ----------
const toB64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function shareUrl(b: Build): string {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = b
  return `${location.origin}${location.pathname}#b=${toB64Url(JSON.stringify(rest))}`
}

export function buildFromHash(): Build | null {
  const m = location.hash.match(/#b=([\w-]+)/)
  if (!m) return null
  try {
    return { ...normalizeBuild(JSON.parse(fromB64Url(m[1]))), id: uid() }
  } catch {
    return null
  }
}
