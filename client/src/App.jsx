import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const APPS = [
  { id: 'davinci', name: 'DaVinci Resolve', category: 'Video Editor' },
  { id: 'blender', name: 'Blender', category: '3D Workspace' },
  { id: 'antigravity', name: 'Antigravity', category: 'AI Agent' },
]

function MetricCard({ label, value, unit, highlight = false }) {
  return (
    <div className="flex flex-col justify-between rounded-[18px] border border-[#2a2a2a] bg-[#1e1e1e] p-4 transition-all hover:border-[#383838]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {highlight && (
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-gray-100 font-mono">
          {value !== null && value !== undefined ? value : '--'}
        </span>
        <span className="text-xs font-medium text-gray-500">{unit}</span>
      </div>
    </div>
  )
}

function QuickLaunchCard({ onLaunch, loadingAppId }) {
  return (
    <section className="rounded-[20px] bg-[#1a1a1a] border border-[#2a2a2a] p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold tracking-wider uppercase text-gray-400">
            Quick Launch
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Control panel & workspace triggers</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#242424] border border-[#303030]">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-orange-400 font-medium">Ready</span>
        </div>
      </div>

      <div className="divide-y divide-[#2a2a2a]">
        {APPS.map((app, index) => {
          const isLoading = loadingAppId === app.id
          const isAnyLoading = loadingAppId !== null

          return (
            <div
              key={app.id}
              className={`flex items-center justify-between py-3.5 ${
                index === 0 ? 'pt-1' : ''
              } ${index === APPS.length - 1 ? 'pb-1 border-b-0' : ''}`}
            >
              {/* Row Left */}
              <div className="flex flex-col">
                <span className="text-sm font-medium tracking-tight text-gray-100">
                  {app.name}
                </span>
                <span className="text-[11px] text-gray-500 tracking-wide font-normal">
                  {app.category}
                </span>
              </div>

              {/* Row Right: Status Dot + Launch Button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isLoading
                        ? 'bg-orange-500 animate-ping'
                        : 'bg-orange-500/80 shadow-[0_0_4px_rgba(249,115,22,0.6)]'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  disabled={isAnyLoading}
                  onClick={() => onLaunch(app.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 min-w-[94px] disabled:opacity-60 disabled:cursor-not-allowed ${
                    isLoading
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-white text-black hover:bg-gray-100 shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                      <span>Launching...</span>
                    </>
                  ) : (
                    <span>Launch</span>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function App() {
  const [metrics, setMetrics] = useState({
    cpu_percent: null,
    ram_percent: null,
    gpu_load_percent: null,
    gpu_temp: null,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [loadingAppId, setLoadingAppId] = useState(null)
  const [toast, setToast] = useState(null)
  const socketRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, type })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  useEffect(() => {
    const socket = io('http://localhost:5000')
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('system_metrics', (data) => {
      if (data) {
        setMetrics({
          cpu_percent: data.cpu_percent,
          ram_percent: data.ram_percent,
          gpu_load_percent: data.gpu_load_percent,
          gpu_temp: data.gpu_temp,
        })
      }
    })

    socket.on('launch_status', (data) => {
      setLoadingAppId((curr) => {
        if (!data.appId || curr === data.appId) return null
        return curr
      })

      if (data.status === 'success') {
        const appName = data.name || data.appId?.toUpperCase() || 'Application'
        showToast(`${appName} Initialized`, 'success')
      } else {
        showToast(data.message || 'Launch failed', 'error')
      }
    })

    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
      socket.disconnect()
    }
  }, [])

  const handleLaunch = (appId) => {
    if (loadingAppId) return
    if (!socketRef.current || !isConnected) {
      showToast('Host disconnected', 'error')
      return
    }

    setLoadingAppId(appId)
    socketRef.current.emit('launch_app', { appId })

    // Safety fallback
    setTimeout(() => {
      setLoadingAppId((curr) => (curr === appId ? null : curr))
    }, 8000)
  }

  return (
    <main className="min-h-screen bg-[#121212] text-gray-100 p-6 flex flex-col justify-between max-w-md mx-auto selection:bg-orange-500/20 relative font-sans antialiased">
      {/* Top Header */}
      <header className="space-y-1 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
              HOST ONLINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-medium tracking-wide uppercase text-gray-400">
              {isConnected ? 'Telemetry Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-100 pt-1">
          System Command
        </h1>
        <p className="text-xs text-gray-500">Live hardware telemetry & remote control</p>
      </header>

      {/* Middle Content */}
      <div className="my-auto py-6 space-y-6">
        {/* 2x2 Telemetry Grid styled with deep dark theme */}
        <section className="grid grid-cols-2 gap-3">
          <MetricCard
            label="CPU Load"
            value={metrics.cpu_percent !== null ? Math.round(metrics.cpu_percent) : null}
            unit="%"
            highlight
          />
          <MetricCard
            label="Memory"
            value={metrics.ram_percent !== null ? Math.round(metrics.ram_percent) : null}
            unit="%"
          />
          <MetricCard
            label="GPU Compute"
            value={
              metrics.gpu_load_percent !== null ? Math.round(metrics.gpu_load_percent) : null
            }
            unit="%"
            highlight
          />
          <MetricCard
            label="GPU Temp"
            value={metrics.gpu_temp !== null ? Math.round(metrics.gpu_temp) : null}
            unit="°C"
          />
        </section>

        {/* Quick Launch Menu Card */}
        <QuickLaunchCard onLaunch={handleLaunch} loadingAppId={loadingAppId} />
      </div>

      {/* Footer Info */}
      <footer className="pt-4 border-t border-[#242424] flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-gray-600" />
          <span>Stream: 2000ms</span>
        </span>
        <span className="font-mono text-[10px] text-gray-600">v1.2.0 • LOCALHOST</span>
      </footer>

      {/* Subtle Toast Notification Pill */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-2xl text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-[#1e1e1e]/95 border-[#333333] text-gray-100 shadow-black/80'
                : 'bg-rose-950/90 border-rose-900/60 text-rose-300 shadow-rose-950/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </main>
  )
}
