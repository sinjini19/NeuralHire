import { Menu, Search } from 'lucide-react'
import type { HealthState } from '../../hooks/useBackendHealth'

const healthStyle: Record<HealthState, { dot: string; text: string }> = {
  checking: { dot: 'bg-amber-400 animate-pulse', text: 'Connecting…' },
  online: { dot: 'bg-emerald-400', text: 'API online' },
  offline: { dot: 'bg-rose-500', text: 'API offline' },
}

interface TopbarProps { onMenu: () => void; health: HealthState }

export function Topbar({ onMenu, health }: TopbarProps) {
  const h = healthStyle[health]
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[#E8E0D3] bg-[#F8F3E9] px-4 sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-300 hover:bg-[#292D38]/[0.04] lg:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search candidates, jobs, skills…"
          className="w-full rounded-lg border border-[#E8E0D3] bg-[#FFFDF8] py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#9FB6DF] focus:outline-none focus:ring-2 focus:ring-[#B8C9E8]/40"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 rounded-md border border-[#E8E0D3] bg-[#FFFDF8] px-3 py-1.5 text-xs text-slate-600" role="status">
        <span className={`h-2 w-2 rounded-full ${h.dot}`} />
        {h.text}
      </div>
    </header>
  )
}
