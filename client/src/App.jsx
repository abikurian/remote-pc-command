export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-700 text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Remote PC Command</h1>
        <p className="text-slate-400 text-sm">
          Barebones Client UI initialized with Vite, React, and Tailwind CSS.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Client Ready
          </span>
        </div>
      </div>
    </div>
  )
}
