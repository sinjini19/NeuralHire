import { Briefcase, ChevronRight, Mail } from 'lucide-react'
import { formatDate } from '../../lib/files'
import type { Candidate } from '../../types/candidate'

const MAX_VISIBLE_SKILLS = 5

interface CandidateListProps { candidates: Candidate[]; onSelect: (id: number) => void }

export function CandidateList({ candidates, onSelect }: CandidateListProps) {
  return (
    <ul className="divide-y divide-white/[0.05]">
      {candidates.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className="group flex w-full items-center gap-3 rounded-lg px-2 py-3.5 text-left transition hover:bg-[#FFFDF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-semibold text-slate-900">
              {c.name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Briefcase size={12} />
                  {c.experience.total_years > 0 ? `${c.experience.total_years} yrs exp.` : 'Experience not detected'}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                <Mail size={12} className="shrink-0" />
                {c.email ?? 'No email found'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.skills.length === 0 && <span className="text-[11px] text-slate-500">No skills detected</span>}
                {c.skills.slice(0, MAX_VISIBLE_SKILLS).map((s) => (
                  <span key={s} className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[11px] text-brand-300">{s}</span>
                ))}
                {c.skills.length > MAX_VISIBLE_SKILLS && (
                  <span className="rounded-md bg-[#292D38]/[0.04] px-1.5 py-0.5 text-[11px] text-slate-400">
                    +{c.skills.length - MAX_VISIBLE_SKILLS}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="max-w-[10rem] truncate text-xs text-slate-300">{c.resume_filename}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Uploaded {formatDate(c.uploaded_at)}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
          </button>
        </li>
      ))}
    </ul>
  )
}
