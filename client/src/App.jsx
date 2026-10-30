import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Layers,
  Activity,
  Flame,
  ArrowUpRight,
} from 'lucide-react'

const APPS = [
  {
    id: 'davinci',
    name: 'DaVinci Resolve',
    category: 'Video Workspace',
    powerLevel: 6,
    totalDots: 8,
    pulseSpeed: '0.8s',
  },
  {
    id: 'blender',
    name: 'Blender',
    category: '3D Studio',
    powerLevel: 5,
    totalDots: 8,
    pulseSpeed: '1.2s',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    category: 'AI Agent Interface',
    powerLevel: 7,
    totalDots: 8,
    pulseSpeed: '0.6s',
  },
]

// Animated SVG Radial Gauge with radiating dashed segments
function RadialGauge({ value, stressLevel }) {
  const totalTicks = 48
  const radius = 78
  const center = 96
  const activeTicks = Math.round((Math.max(0, Math.min(100, value)) / 100) * totalTicks)

  // Generate radiating tick lines
  const ticks = useMemo(() => {
    return Array.from({ length: totalTicks }, (_, i) => {
      const angle = (i * 360) / totalTicks - 90
      const rad = (angle * Math.PI) / 180
      const innerR = radius - 10
      const outerR = radius

      const x1 = center + innerR * Math.cos(rad)
      const y1 = center + innerR * Math.sin(rad)
      const x2 = center + outerR * Math.cos(rad)
      const y2 = center + outerR * Math.sin(rad)

      const isActive = i <= activeTicks
      return { id: i, x1, y1, x2, y2, isActive }
    })
  }, [activeTicks])

  // Dynamic glow and pulse based on total stress
  const glowIntensity = stressLevel > 70 ? 'shadow-[0_0_30px_rgba(249,115,22,0.45)]' : 'shadow-[0_0_15px_rgba(249,115,22,0.15)]'
  const pulseSpeed = stressLevel > 70 ? 'duration-500' : stressLevel > 40 ? 'duration-1000' : 'duration-2000'

  return (
    <div className={`relative flex items-center justify-center w-52 h-52 mx-auto rounded-full transition-all ${pulseSpeed} ${glowIntensity}`}>
      {/* Outer subtle rotating ring */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none transition-transform ${
          stressLevel > 70 ? 'animate-spin [animation-duration:8s]' : 'animate-slow-rotate'
        }`}
        viewBox="0 0 192 192"
      >
        <circle
          cx="96"
          cy="96"
          r="89"
          fill="none"
          stroke="#262626"
          strokeWidth="1"
          strokeDasharray="4 8"
          strokeOpacity="0.6"
        />
      </svg>

      {/* Radiating Ticks Gauge */}
      <svg className="w-48 h-48" viewBox="0 0 192 192">
        {ticks.map((t) => (
          <line
            key={t.id}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isActive ? '#f97316' : '#262626'}
            strokeWidth={t.isActive ? 2.8 : 1.8}
            strokeLinecap="round"
            className="transition-colors duration-300"
            style={{
              filter: t.isActive && stressLevel > 60 ? 'drop-shadow(0 0 2px #f97316)' : 'none',
            }}
          />
        ))}
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-medium tracking-[0.25em] text-neutral-500 uppercase">
          Total Load
        </span>
        <div className="flex items-baseline gap-0.5 mt-0.5">
          <span className="text-4xl font-semibold text-white tracking-tight font-mono transition-transform duration-300">
            {value}
          </span>
          <span className="text-sm font-medium text-orange-500">%</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              stressLevel > 75
                ? 'bg-rose-500 animate-ping'
                : stressLevel > 40
                ? 'bg-orange-500'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
            {stressLevel > 75 ? 'Heavy Load' : stressLevel > 40 ? 'Moderate' : 'Optimal'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Left Card: Telemetry & Detailed Metric Rows
function TelemetryCard({ metrics, totalLoad }) {
  const items = [
    {
      label: 'CPU Usage',
      raw: metrics.cpu_percent,
      value: metrics.cpu_percent !== null ? `${Math.round(metrics.cpu_percent)}%` : '--',
      icon: Cpu,
      status: (metrics.cpu_percent ?? 0) > 80 ? 'Heavy' : (metrics.cpu_percent ?? 0) > 40 ? 'Active' : 'Normal',
      statusColor: (metrics.cpu_percent ?? 0) > 80 ? 'text-rose-400 bg-rose-500/10' : 'text-neutral-400 bg-neutral-800/60',
    },
    {
      label: 'RAM Allocation',
      raw: metrics.ram_percent,
      value: metrics.ram_percent !== null ? `${Math.round(metrics.ram_percent)}%` : '--',
      icon: Layers,
      status: (metrics.ram_percent ?? 0) > 85 ? 'High' : 'Normal',
      statusColor: (metrics.ram_percent ?? 0) > 85 ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 bg-neutral-800/60',
    },
    {
      label: 'GPU Compute',
      raw: metrics.gpu_load_percent,
      value: metrics.gpu_load_percent !== null ? `${Math.round(metrics.gpu_load_percent)}%` : '--',
      icon: Activity,
      status: (metrics.gpu_load_percent ?? 0) > 75 ? 'Spike' : 'Normal',
      statusColor: (metrics.gpu_load_percent ?? 0) > 75 ? 'text-orange-400 bg-orange-500/10' : 'text-neutral-400 bg-neutral-800/60',
    },
    {
      label: 'GPU Core Temp',
      raw: metrics.gpu_temp,
      value: metrics.gpu_temp !== null ? `${Math.round(metrics.gpu_temp)}°C` : '--',
      icon: Flame,
      status: (metrics.gpu_temp ?? 0) > 75 ? 'Warm' : 'Cool',
      statusColor: (metrics.gpu_temp ?? 0) > 75 ? 'text-rose-400 bg-rose-500/10' : 'text-neutral-400 bg-neutral-800/60',
    },
  ]

  return (
    <div className="rounded-3xl bg-[#161616] border border-[#232323] p-6 flex flex-col justify-between shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
            Telemetry & Resources
          </h2>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">0.5 HZ SYNC</span>
      </div>

      {/* Center Radial Dial */}
      <div className="py-6">
        <RadialGauge value={totalLoad} stressLevel={totalLoad} />
      </div>

      {/* Granular Breakdown List */}
      <div className="space-y-2.5 pt-2">
        {items.map((m) => {
          const Icon = m.icon
          return (
            <div
              key={m.label}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#1b1b1b] border border-[#252525] hover:border-[#333333] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#222222] border border-[#2e2e2e] flex items-center justify-center text-neutral-400">
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-200">{m.label}</div>
                  <div className="text-[10px] text-neutral-500">Real-time sensor</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-white tracking-tight">
                  {m.value}
                </span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${m.statusColor}`}
                >
                  {m.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Right Card: Interactive Quick Launch & Power Animations
function ActionCard({ onLaunch, loadingAppId, totalLoad, onReset }) {
  return (
    <div className="rounded-3xl bg-[#161616] border border-[#232323] p-6 flex flex-col justify-between shadow-2xl transition-all duration-300">
      {/* Top Header & Dynamic Progress Indicator */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
              ACTIONS
            </h2>
          </div>
          <span className="text-[10px] text-orange-400 uppercase font-mono tracking-wider">
            {loadingAppId ? 'Process Spawning' : 'Standing By'}
          </span>
        </div>

        {/* Live progress indicator bar tied to system/launcher activity */}
        <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden mb-6 border border-[#282828]">
          <div
            className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-all duration-700 rounded-full"
            style={{ width: `${Math.max(12, Math.min(100, totalLoad))}%` }}
          />
        </div>

        {/* Pulsing Action List */}
        <div className="space-y-3">
          {APPS.map((app) => {
            const isLoading = loadingAppId === app.id
            const isAnyLoading = loadingAppId !== null

            return (
              <div
                key={app.id}
                className="p-4 rounded-2xl bg-[#1b1b1b] border border-[#252525] hover:border-[#333333] transition-all flex items-center justify-between group"
              >
                {/* Left: Names & micro-label */}
                <div>
                  <div className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors">
                    {app.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 tracking-wide mt-0.5">
                    {app.category}
                  </div>
                </div>

                {/* Right: Dotted Indicator Dots + Launch Button */}
                <div className="flex items-center gap-4">
                  {/* Flowing animated dots indicating app power level */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: app.totalDots }).map((_, dotIdx) => {
                      const isLit = dotIdx < app.powerLevel
                      return (
                        <span
                          key={dotIdx}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            isLit
                              ? 'bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.6)]'
                              : 'bg-neutral-800'
                          }`}
                          style={{
                            animation: isLit ? `flow-dots ${app.pulseSpeed} infinite ease-in-out` : 'none',
                            animationDelay: `${dotIdx * 0.12}s`,
                          }}
                        />
                      )
                    })}
                  </div>

                  {/* Crisp Pill Launch Button */}
                  <button
                    type="button"
                    disabled={isAnyLoading}
                    onClick={() => onLaunch(app.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 min-w-[88px] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isLoading
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                        : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                        <span className="text-[11px]">Busy...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch</span>
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Large Bottom Primary Reset All / Refresh Button */}
      <div className="pt-6">
        <button
          type="button"
          onClick={onReset}
          className="w-full py-3.5 px-4 rounded-full bg-[#202020] border border-[#2d2d2d] hover:bg-[#252525] text-neutral-300 hover:text-white text-xs font-medium uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 group shadow-lg"
        >
          <RefreshCw className="w-3.5 h-3.5 text-orange-400 group-hover:rotate-180 transition-transform duration-500" />
          <span>+ Reset All / Refresh</span>
        </button>
      </div>
    </div>
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

  // Compute Total Load = (CPU + RAM + GPU Load) / 3
  const totalLoad = useMemo(() => {
    const cpu = metrics.cpu_percent ?? 0
    const ram = metrics.ram_percent ?? 0
    const gpu = metrics.gpu_load_percent ?? 0
    return Math.round((cpu + ram + gpu) / 3)
  }, [metrics])

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
    const socket = io()
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

    // Safety timeout in case backend drops event
    setTimeout(() => {
      setLoadingAppId((curr) => (curr === appId ? null : curr))
    }, 8000)
  }

  const handleResetAll = () => {
    setLoadingAppId(null)
    showToast('Telemetry & controls refreshed', 'success')
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col justify-between selection:bg-orange-500/20 font-sans antialiased relative">
      {/* Top Header: Centered Telemetry Status Pill */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-center pt-2 pb-6">
        {isConnected ? (
          <div className="flex items-center gap-2 rounded-full border border-[#232323] bg-[#161616] px-3.5 py-1 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-medium">
              Telemetry Active
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full border border-[#232323] bg-[#161616] px-3.5 py-1 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
              Telemetry Offline
            </span>
          </div>
        )}
      </header>

      {/* Main Responsive Grid Layout (Left: Telemetry & Resources, Right: Quick Launch & Actions) */}
      <section className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 my-auto">
        <TelemetryCard metrics={metrics} totalLoad={totalLoad} />
        <ActionCard
          onLaunch={handleLaunch}
          loadingAppId={loadingAppId}
          totalLoad={totalLoad}
          onReset={handleResetAll}
        />
      </section>

      {/* Floating Toast Notification Pill */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md shadow-2xl text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-[#1a1a1a]/95 border-[#303030] text-gray-100 shadow-black/80'
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
