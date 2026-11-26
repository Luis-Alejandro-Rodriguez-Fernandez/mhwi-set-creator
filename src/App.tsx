import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadData, type GameData } from './logic/data'
import { AppCtx } from './logic/context'
import { computeBuild, emptyBuild, uid, type Build } from './logic/build'
import { buildFromHash, loadBuilds, loadDraft, loadPrefs, saveBuilds, saveDraft, savePrefs, shareUrl, type Prefs } from './logic/storage'
import { EquipmentList } from './components/Equipment'
import { SkillsPanel, StatsPanel } from './components/Summary'
import { Sidebar } from './components/Sidebar'
import { Optimizer } from './components/Optimizer'
import { ARMOR_TYPES } from './types'
import type { OptimizerResult } from './optimizer/core'
import { confirmAsync, showText } from './logic/dialog'
import { DialogHost } from './components/DialogHost'

type Tab = 'builder' | 'optimizer'

// Tema que haya fijado el entorno (p. ej. un visor embebido) antes de que la app lo toque
const hostTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null

export default function App() {
  const [data, setData] = useState<GameData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    loadData().then(setData).catch((e) => setError(String(e.message ?? e)))
  }, [])
  if (error) return <div className="center"><p className="warn">{error}</p></div>
  if (!data) return <div className="center"><div className="spinner" /><p className="muted">Cargando base de datos de MHW: Iceborne…</p></div>
  return <Main data={data} />
}

function Main({ data }: { data: GameData }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [builds, setBuilds] = useState<Build[]>(loadBuilds)
  const [build, setBuild] = useState<Build>(() => {
    const shared = buildFromHash()
    if (shared) {
      history.replaceState(null, '', location.pathname + location.search)
      return shared
    }
    return loadDraft() ?? emptyBuild()
  })
  const [tab, setTab] = useState<Tab>('builder')
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const notify = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast((t) => (t === m ? null : t)), 2500)
  }, [])

  useEffect(() => { saveDraft(build) }, [build])
  useEffect(() => { savePrefs(prefs) }, [prefs])
  useEffect(() => {
    const root = document.documentElement
    const value = prefs.theme === 'auto' ? hostTheme : prefs.theme
    if (value) root.setAttribute('data-theme', value)
    else root.removeAttribute('data-theme')
  }, [prefs.theme])
  useEffect(() => { if (!saveBuilds(builds)) notify('No se pudo guardar en localStorage') }, [builds, notify])

  const update = useCallback((fn: (b: Build) => void) => {
    setBuild((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const computed = useMemo(() => computeBuild(build, data, prefs.lang), [build, data, prefs.lang])
  const savedVersion = builds.find((b) => b.id === build.id)
  const strip = (b: Build) => JSON.stringify({ ...b, updatedAt: 0, createdAt: 0 })
  const dirty = !savedVersion || strip(savedVersion) !== strip(build)

  const save = () => {
    const now = Date.now()
    const b = { ...build, updatedAt: now }
    setBuild(b)
    setBuilds((bs) => (bs.some((x) => x.id === b.id) ? bs.map((x) => (x.id === b.id ? b : x)) : [...bs, b]))
    notify('Build guardada')
  }
  const saveAsNew = () => {
    const now = Date.now()
    const b = { ...structuredClone(build), id: uid(), name: `${build.name} (copia)`, createdAt: now, updatedAt: now }
    setBuild(b)
    setBuilds((bs) => [...bs, b])
    notify('Guardada como nueva build')
  }
  const select = async (b: Build) => {
    if (dirty && build.id !== b.id && (computed.weapon || ARMOR_TYPES.some((t) => build.armor[t].id != null)) && !(await confirmAsync('Hay cambios sin guardar en la build actual. ¿Descartarlos?', { confirmLabel: 'Descartar', danger: true }))) return
    setBuild(structuredClone(b))
    setMenuOpen(false)
    setTab('builder')
  }
  const share = async () => {
    const url = shareUrl(build)
    try {
      await navigator.clipboard.writeText(url)
      notify('Enlace copiado al portapapeles')
    } catch {
      showText('Copia este enlace:', url)
    }
  }
  const applyResult = (r: OptimizerResult) => {
    update((b) => {
      b.charm = r.charm
      b.weapon.decos = r.decos.weapon
      for (const t of ARMOR_TYPES) b.armor[t] = { id: r.armor[t], decos: r.decos.armor[t] }
    })
    setTab('builder')
    notify('Resultado aplicado (recuerda guardar)')
  }
  const rank = prefs.rankFilter
  const setRank = (r: Prefs['rankFilter']) => setPrefs((p) => ({ ...p, rankFilter: r }))

  return (
    <AppCtx.Provider value={{ data, lang: prefs.lang }}>
      <div className="app">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Mis builds">☰</button>
          <div className="brand">
            <span className="logo">⚒</span>
            <div>
              <h1>Forja de Builds</h1>
              <span className="muted tiny">Monster Hunter World: Iceborne</span>
            </div>
          </div>
          <nav className="tabs">
            <button className={tab === 'builder' ? 'on' : ''} onClick={() => setTab('builder')}>Constructor</button>
            <button className={tab === 'optimizer' ? 'on' : ''} onClick={() => setTab('optimizer')}>Optimizador</button>
          </nav>
          <div className="theme" role="group" aria-label="Tema">
            {([['auto', 'Auto', 'Seguir el sistema'], ['light', '☀', 'Tema claro'], ['dark', '☾', 'Tema oscuro']] as const).map(([k, label, title]) => (
              <button key={k} className={prefs.theme === k ? 'on' : ''} title={title} aria-label={title} aria-pressed={prefs.theme === k} onClick={() => setPrefs((p) => ({ ...p, theme: k }))}>{label}</button>
            ))}
          </div>
          <div className="lang">
            <button className={prefs.lang === 'es' ? 'on' : ''} onClick={() => setPrefs((p) => ({ ...p, lang: 'es' }))}>ES</button>
            <button className={prefs.lang === 'en' ? 'on' : ''} onClick={() => setPrefs((p) => ({ ...p, lang: 'en' }))}>EN</button>
          </div>
        </header>

        <div className="layout">
          <div className={`side-wrap${menuOpen ? ' open' : ''}`}>
            <Sidebar
              builds={builds}
              currentId={build.id}
              dirty={dirty}
              onSelect={select}
              onNew={() => { setBuild(emptyBuild()); setMenuOpen(false); setTab('builder') }}
              onDelete={(id) => setBuilds((bs) => bs.filter((b) => b.id !== id))}
              onDuplicate={(b) => {
                const now = Date.now()
                setBuilds((bs) => [...bs, { ...structuredClone(b), id: uid(), name: `${b.name} (copia)`, createdAt: now, updatedAt: now }])
              }}
              onImport={(bs) => setBuilds((prev) => [...prev, ...bs])}
              notify={notify}
            />
          </div>

          <main className="main">
            <div className="card build-bar">
              <input className="build-title" value={build.name} placeholder="Nombre de la build" onChange={(e) => update((b) => { b.name = e.target.value })} />
              <div className="row gap wrap">
                <button className="btn primary" onClick={save}>{savedVersion ? (dirty ? 'Guardar cambios' : 'Guardado ✓') : 'Guardar'}</button>
                {savedVersion && <button className="btn ghost" onClick={saveAsNew}>Guardar como nueva</button>}
                <button className="btn ghost" onClick={share}>Compartir enlace</button>
                <button className="btn ghost" onClick={async () => (await confirmAsync('¿Vaciar todo el equipo de esta build?', { confirmLabel: 'Vaciar', danger: true })) && update((b) => { const e = emptyBuild(b.name); b.weapon = e.weapon; b.armor = e.armor; b.charm = null })}>Vaciar</button>
              </div>
              <textarea className="notes" placeholder="Notas (rotación, objetivo, monstruo…)" value={build.notes} onChange={(e) => update((b) => { b.notes = e.target.value })} rows={1} />
            </div>

            {tab === 'builder' ? (
              <div className="builder">
                <EquipmentList build={build} update={update} computed={computed} rank={rank} setRank={setRank} />
                <div className="summary">
                  <StatsPanel build={build} update={update} computed={computed} />
                  <SkillsPanel computed={computed} />
                </div>
              </div>
            ) : (
              <Optimizer build={build} computed={computed} onApply={applyResult} />
            )}
          </main>
        </div>
        <footer className="footer muted tiny">
          Datos: <a href="https://github.com/gatheringhallstudios/MHWorldData" target="_blank" rel="noreferrer">MHWorldData</a> (MIT) · Las builds se guardan solo en este navegador · Proyecto de fans, sin relación con Capcom.
        </footer>
        {toast && <div className="toast">{toast}</div>}
        <DialogHost />
      </div>
    </AppCtx.Provider>
  )
}
