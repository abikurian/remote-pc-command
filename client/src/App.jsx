import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { Code, Smartphone, Gamepad2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const APPS = [
  { id: 'vscode', label: 'CODE', fullName: 'VS Code', icon: Code },
  { id: 'emulator', label: 'EMULATOR', fullName: 'BlueStacks', icon: Smartphone },
  { id: 'rdr2', label: 'RDR2', fullName: 'RDR2', icon: Gamepad2 },
]

function MetricCard({ label, value, unit }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-4 backdrop-blur-sm transition-colors hover:border-neutral-700/80">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-white font-mono">
          {value !== null && value !== undefined ? value : '--'}
        </span>
        <span className="text-sm font-medium text-neutral-500">{unit}</span>
      </div>
    </div>
  )
}

function ActionGrid({ onLaunch, loadingAppId }) {
  return (
    <section className="pt-2">
      <h2 className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mb-3">
        ACTIONS
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {APPS.map((app) => {
          const Icon = app.icon
          const isLoading = loadingAppId === app.id

          return (
            <button
              key={app.id}
              type="button"
              disabled={loadingAppId !== null}
              onClick={() => onLaunch(app.id)}
              className="aspect-square rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-neutral-700/80"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 text-neutral-300 animate-spin" />
              ) : (
                <Icon className="w-6 h-6 text-neutral-400" />
              )}
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-medium">
                {app.label}
              </span>
            </button>
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
      setLoadingAppId((currentLoadingId) => {
        // Clear loading state if matching current loading ID or generic completion
        if (!data.appId || currentLoadingId === data.appId) {
          return null
        }
        return currentLoadingId
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
    if (loadingAppId) return // Prevent duplicate clicks
    if (!socketRef.current || !isConnected) {
      showToast('Host disconnected', 'error')
      return
    }

    setLoadingAppId(appId)
    socketRef.current.emit('launch_app', { appId })

    // Safety fallback: reset loading state if server does not respond within 6 seconds
    setTimeout(() => {
      setLoadingAppId((curr) => (curr === appId ? null : curr))
    }, 6000)
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col justify-between max-w-md mx-auto selection:bg-neutral-800 relative">
      <header className="space-y-1 pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-100">
            System Telemetry
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-medium tracking-wide uppercase text-neutral-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        <p className="text-xs text-neutral-500">Real-time hardware performance monitor</p>
      </header>

      {/* Middle Container: Telemetry & Actions */}
      <div className="my-auto py-6 space-y-6">
        {/* 2x2 Telemetry Grid */}
        <section className="grid grid-cols-2 gap-3">
          <MetricCard
            label="CPU Usage"
            value={metrics.cpu_percent !== null ? Math.round(metrics.cpu_percent) : null}
            unit="%"
          />
          <MetricCard
            label="RAM Usage"
            value={metrics.ram_percent !== null ? Math.round(metrics.ram_percent) : null}
            unit="%"
          />
          <MetricCard
            label="GPU Load"
            value={
              metrics.gpu_load_percent !== null ? Math.round(metrics.gpu_load_percent) : null
            }
            unit="%"
          />
          <MetricCard
            label="GPU Temp"
            value={metrics.gpu_temp !== null ? Math.round(metrics.gpu_temp) : null}
            unit="°C"
          />
        </section>

        {/* 3-Column Launch Actions */}
        <ActionGrid onLaunch={handleLaunch} loadingAppId={loadingAppId} />
      </div>

      <footer className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-600">
        <span>Host: localhost:5000</span>
        <span>Interval: 2s</span>
      </footer>

      {/* Ultra-minimal Success/Error Toast Pill */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md shadow-2xl text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200 shadow-black/80'
                : 'bg-rose-950/80 border-rose-900/60 text-rose-300 shadow-rose-950/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
