import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

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

export default function App() {
  const [metrics, setMetrics] = useState({
    cpu_percent: null,
    ram_percent: null,
    gpu_load_percent: null,
    gpu_temp: null,
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socket = io('http://localhost:5000')

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

    return () => {
      socket.disconnect()
    }
  }, [])

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col justify-between max-w-md mx-auto selection:bg-neutral-800">
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

      {/* 2x2 Telemetry Grid */}
      <section className="my-auto py-6 grid grid-cols-2 gap-3">
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

      <footer className="pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-600">
        <span>Host: localhost:5000</span>
        <span>Interval: 2s</span>
      </footer>
    </main>
  )
}
