import CodeEditor from './components/CodeEditor'
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  Braces,
  ChevronDown,
  Code2,
  FileCode2,
  Files,
  Folder,
  GitBranch,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Terminal,
  Workflow,
} from 'lucide-react'

type ApiStatus = 'checking' | 'online' | 'offline'

type HealthResponse = {
  status: string
  service: string
  timeStamp: string
}

type WorkspaceView = 'explorer' | 'search' | 'source' | 'compiler'
type BottomPanel = 'terminal' | 'problems' | 'output'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [apiError, setApiError] = useState('')
  const [activeView, setActiveView] = useState<WorkspaceView>('explorer')
  const [activePanel, setActivePanel] = useState<BottomPanel>('terminal')


  const fetchBackendHealth = useCallback(async (): Promise<HealthResponse> => {
    const response = await fetch('/api/health')

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    const data = (await response.json()) as HealthResponse

    if (data.status !== 'ok') {
      throw new Error('Backend health check failed')
    }

    return data
  }, [])

  useEffect(() => {
    let isActive = true

    fetchBackendHealth()
      .then((data) => {
        if (!isActive) return

        setHealth(data)
        setApiStatus('online')
        setApiError('')
      })
      .catch((error: unknown) => {
        if (!isActive) return

        setHealth(null)
        setApiStatus('offline')
        setApiError(
          error instanceof Error
            ? error.message
            : 'Unable to connect to backend',
        )
      })

    return () => {
      isActive = false
    }
  }, [fetchBackendHealth])


  const viewTitles: Record<WorkspaceView, string> = {
    explorer: 'Explorer',
    search: 'Search',
    source: 'Source Control',
    compiler: 'Compiler Lens',
  }

  return (
    <main className="relative flex h-screen min-h-[600px] flex-col overflow-hidden bg-gradient-to-br from-sky-50 via-slate-50 to-blue-100 text-slate-800">

      {/* Soft background lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-300/20 blur-3xl"
      />

      {/* Top navigation */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/70 bg-white/70 px-5 shadow-sm shadow-sky-950/[0.03] backdrop-blur-2xl">

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/25">
            <Code2 size={21} />
          </div>

          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              TraceForge
            </h1>
            <p className="text-[10px] font-medium tracking-[0.18em] text-slate-400">
              DEVELOPMENT STUDIO
            </p>
          </div>

          <div className="mx-3 hidden h-8 w-px bg-slate-200 sm:block" />

          <button className="hidden items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 sm:flex">
            <Folder size={14} className="text-sky-600" />
            traceforge-ide
            <ChevronDown size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">

          <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex ${apiStatus === 'online'
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
            : apiStatus === 'offline'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-white text-slate-500'
            }`}>
            <span className={`h-2 w-2 rounded-full ${apiStatus === 'online'
              ? 'bg-emerald-500'
              : apiStatus === 'offline'
                ? 'bg-rose-500'
                : 'animate-pulse bg-slate-400'
              }`} />
            {apiStatus === 'online'
              ? 'API Connected'
              : apiStatus === 'offline'
                ? 'API Offline'
                : 'Checking API'}
          </div>

          <button
            type="button"

            onClick={() => {
              setApiStatus('checking')
              setApiError('')

              fetchBackendHealth()
                .then((data) => {
                  setHealth(data)
                  setApiStatus('online')
                })
                .catch((error: unknown) => {
                  setHealth(null)
                  setApiStatus('offline')
                  setApiError(
                    error instanceof Error
                      ? error.message
                      : 'Unable to connect to backend',
                  )
                })
            }}

            title="Check backend connection"
            className="rounded-lg border border-white/80 bg-white/70 p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
          >
            <RefreshCw
              size={16}
              className={apiStatus === 'checking' ? 'animate-spin' : ''}
            />
          </button>

          <button
            type="button"
            title="Notifications"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-sky-700"
          >
            <Bell size={17} />
          </button>

          <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white shadow-sm">
            TF
          </div>
        </div>
      </header>

      {/* Main workspace */}
      <div className="relative z-10 flex min-h-0 flex-1 p-3">

        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-[0_12px_45px_rgba(15,50,100,0.08)] backdrop-blur-2xl">

          {/* Activity bar */}
          <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-slate-200/70 bg-white/35 py-4">

            <button
              type="button"
              onClick={() => setActiveView('explorer')}
              title="Explorer"
              className={`rounded-xl p-2.5 transition ${activeView === 'explorer'
                ? 'bg-sky-100 text-sky-700 shadow-sm'
                : 'text-slate-400 hover:bg-white hover:text-sky-700'
                }`}
            >
              <Files size={20} />
            </button>

            <button
              type="button"
              onClick={() => setActiveView('search')}
              title="Search"
              className={`rounded-xl p-2.5 transition ${activeView === 'search'
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-400 hover:bg-white hover:text-sky-700'
                }`}
            >
              <Search size={20} />
            </button>

            <button
              type="button"
              onClick={() => setActiveView('source')}
              title="Source Control"
              className={`rounded-xl p-2.5 transition ${activeView === 'source'
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-400 hover:bg-white hover:text-sky-700'
                }`}
            >
              <GitBranch size={20} />
            </button>

            <button
              type="button"
              onClick={() => setActiveView('compiler')}
              title="Compiler Lens"
              className={`rounded-xl p-2.5 transition ${activeView === 'compiler'
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-400 hover:bg-white hover:text-sky-700'
                }`}
            >
              <Workflow size={20} />
            </button>

            <div className="flex-1" />

            <button
              type="button"
              title="Settings"
              className="rounded-xl p-2.5 text-slate-400 transition hover:bg-white hover:text-sky-700"
            >
              <Settings2 size={20} />
            </button>
          </aside>

          {/* Explorer panel */}
          <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200/70 bg-white/30 md:flex">

            <div className="flex h-12 items-center justify-between px-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {viewTitles[activeView]}
              </span>
              <button
                type="button"
                title="More actions"
                className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-sky-700"
              >
                <Settings2 size={15} />
              </button>
            </div>

            {activeView === 'explorer' ? (
              <div className="space-y-1 px-2 text-sm">

                <div className="flex items-center gap-2 rounded-lg px-2 py-2 font-semibold text-slate-700">
                  <ChevronDown size={14} />
                  <Folder size={15} className="text-sky-600" />
                  apps
                </div>

                <div className="ml-5 space-y-1 border-l border-slate-200 pl-3">

                  <div className="flex items-center gap-2 py-1 text-slate-600">
                    <ChevronDown size={13} />
                    <Folder size={14} className="text-sky-500" />
                    web
                  </div>

                  <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                    <div className="flex items-center gap-2 py-1 text-slate-500">
                      <ChevronDown size={13} />
                      <Folder size={14} className="text-sky-500" />
                      src
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-sky-100/80 px-2 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/70">
                      <FileCode2 size={14} />
                      App.tsx
                    </div>

                    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-500">
                      <Braces size={14} className="text-blue-500" />
                      index.css
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1 text-slate-600">
                    <ChevronDown size={13} />
                    <Folder size={14} className="text-sky-500" />
                    api
                  </div>

                  <div className="ml-4 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-500">
                    <FileCode2 size={14} />
                    index.ts
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-3 rounded-xl border border-white/80 bg-white/60 p-4 shadow-sm">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  {activeView === 'search' && <Search size={18} />}
                  {activeView === 'source' && <GitBranch size={18} />}
                  {activeView === 'compiler' && <Workflow size={18} />}
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {viewTitles[activeView]}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  This workspace panel will be implemented in its upcoming development milestone.
                </p>
              </div>
            )}

            <div className="mt-auto border-t border-slate-200/70 p-3">
              <div className="flex items-center gap-2 rounded-xl bg-sky-50/80 p-3">
                <ShieldCheck size={18} className="text-sky-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Workspace
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Local development
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Editor workspace */}
          <section className="flex min-w-0 flex-1 flex-col">

            {/* Editor toolbar */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/45 px-4">

              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <span className="text-slate-400">traceforge-ide</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-400">apps</span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-sky-700">App.tsx</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Code execution will be enabled after editor and runner integration"
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400"
                >
                  <Play size={13} />
                  Run
                </button>
              </div>
            </div>


            {/* Editor canvas */}
            <div className="flex min-h-0 flex-1 flex-col bg-white/55">

              {/* Editor tabs */}
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/50 px-4">

                <div className="flex h-full items-center gap-2 border-b-2 border-sky-500 px-2 text-xs font-semibold text-slate-700">
                  <FileCode2 size={14} className="text-sky-600" />
                  App.tsx
                  <span className="text-slate-300">×</span>
                </div>

                <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-slate-400">
                  <span>TypeScript React</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>UTF-8</span>
                </div>

              </div>

              {/* Actual CodeMirror editor */}
              <div className="min-h-0 flex-1 overflow-hidden">
                <CodeEditor />
              </div>

            </div>




            {/* Bottom panel */}
            <div className="flex h-56 shrink-0 flex-col border-t border-slate-200/80 bg-white/70 sm:h-48">

              <div className="flex h-10 shrink-0 items-center gap-5 border-b border-slate-100 px-4">

                <button
                  type="button"
                  onClick={() => setActivePanel('terminal')}
                  className={`flex h-full items-center gap-2 border-b-2 text-[11px] font-semibold transition ${activePanel === 'terminal'
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                >
                  <Terminal size={14} />
                  Terminal
                </button>

                <button
                  type="button"
                  onClick={() => setActivePanel('problems')}
                  className={`flex h-full items-center gap-2 border-b-2 text-[11px] font-semibold transition ${activePanel === 'problems'
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                >
                  <Activity size={14} />
                  Problems
                </button>

                <button
                  type="button"
                  onClick={() => setActivePanel('output')}
                  className={`flex h-full items-center gap-2 border-b-2 text-[11px] font-semibold transition ${activePanel === 'output'
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                >
                  <Braces size={14} />
                  Output
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs">

                {activePanel === 'terminal' && (
                  <div className="space-y-2">
                    <p className="text-slate-500">
                      <span className="font-bold text-sky-600">➜</span>
                      {' '}TraceForge development environment
                    </p>

                    <p className="text-slate-500">
                      <span className="text-sky-600">INFO</span>
                      {' '}Frontend workspace initialized.
                    </p>

                    <p className="text-slate-500">
                      <span className={apiStatus === 'online' ? 'text-emerald-600' : 'text-amber-600'}>
                        {apiStatus === 'online' ? 'PASS' : apiStatus === 'checking' ? 'WAIT' : 'ERROR'}
                      </span>
                      {' '}Backend connection: {apiStatus}
                    </p>

                    {apiError && (
                      <p className="text-rose-600">
                        {apiError}
                      </p>
                    )}

                    <p className="text-slate-400">
                      Integrated terminal execution will be connected in a later milestone.
                    </p>
                  </div>
                )}

                {activePanel === 'problems' && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <ShieldCheck size={22} className="text-sky-600" />
                    <p className="font-sans text-sm font-semibold text-slate-700">
                      Diagnostics panel
                    </p>
                    <p className="font-sans text-xs text-slate-400">
                      Editor diagnostics will appear here after editor integration.
                    </p>
                  </div>
                )}

                {activePanel === 'output' && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <Braces size={22} className="text-sky-600" />
                    <p className="font-sans text-sm font-semibold text-slate-700">
                      Build output
                    </p>
                    <p className="font-sans text-xs text-slate-400">
                      Compiler and build results will appear here.
                    </p>
                  </div>
                )}

              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Status bar */}
     <footer className="relative z-10 flex h-7 shrink-0 items-center justify-between border-t border-white/70 bg-white/55 px-4 text-[10px] font-medium text-slate-500 backdrop-blur-xl">

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} />
            main
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <ShieldCheck size={12} className="text-emerald-600" />
            Local workspace
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">TypeScript React</span>
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            {apiStatus === 'online' ? health?.service : 'API status'}
          </span>
        </div>
      </footer>
    </main>
  )
}

export default App
