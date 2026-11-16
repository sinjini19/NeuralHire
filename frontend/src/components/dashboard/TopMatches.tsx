import type { TopMatch } from '../../types'

function scoreColor(score: number) {
  if (score >= 90) return 'text-emerald-400 bg-emerald-400/10 ring-emerald-400/30'
  if (score >= 80) return 'text-brand-300 bg-brand-500/10 ring-brand-500/30'
  return 'text-amber-300 bg-amber-400/10 ring-amber-400/30'
}

export function TopMatches({ matches }: { matches: TopMatch[] }) {
  return (
    <ul className="divide-y divide-white/[0.05]">
      {matches.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-semibold text-slate-900">
            {m.name.split(' ').map((p) => p[0]).join('')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{m.name}</p>
            <p className="truncate text-xs text-slate-400">{m.role} · for {m.job}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.topSkills.map((s) => (
                <span key={s} className="rounded-md bg-[#292D38]/[0.04] px-1.5 py-0.5 text-[10px] text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          <span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ring-1 ${scoreColor(m.score)}`}>
            {m.score}%
          </span>
        </li>
      ))}
    </ul>
  )
}
