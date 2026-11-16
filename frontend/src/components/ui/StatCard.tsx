import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { StatItem } from '../../types'

interface StatCardProps { stat: StatItem; icon: LucideIcon; delay?: number }

export function StatCard({ stat, icon: Icon, delay = 0 }: StatCardProps) {
  const up = stat.change >= 0
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group animate-fade-up rounded-lg border border-[#E8E0D3] bg-navy-850/80 p-5 transition hover:-translate-y-0.5 hover:border-brand-500/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{stat.label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-500/25">
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 font-medium ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(stat.change)}%
        </span>
        <span className="text-slate-500">{stat.hint}</span>
      </div>
    </div>
  )
}
