import { Briefcase, Building2, CalendarDays, ChevronDown, GraduationCap, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '../../lib/files'
import { employmentLabel } from '../../lib/jobs'
import type { Job, JobStatus } from '../../types/job'

const STATUS_STYLE: Record<JobStatus, string> = {
  open: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
  draft: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
  closed: 'bg-slate-400/10 text-slate-300 ring-slate-400/30',
}

interface JobCardProps { job: Job; onEdit: (job: Job) => void; onDelete: (job: Job) => void }

export function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <article className="rounded-lg border border-[#E8E0D3] bg-navy-850/80 p-5 transition hover:border-brand-500/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{job.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${STATUS_STYLE[job.status]}`}>{job.status}</span>
            <span className="rounded-full bg-[#292D38]/[0.04] px-2 py-0.5 text-[11px] text-slate-300">{employmentLabel(job.employment_type)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Building2 size={13} />{job.company}{job.department ? ` · ${job.department}` : ''}</span>
            {job.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{job.location}</span>}
            <span className="inline-flex items-center gap-1"><Briefcase size={13} />{job.min_experience_years > 0 ? `${job.min_experience_years}+ yrs` : 'No min. experience'}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} />Created {formatDate(job.created_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={() => onEdit(job)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E0D3] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-[#292D38]/[0.04]" aria-label={`Edit ${job.title}`}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => onDelete(job)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10" aria-label={`Delete ${job.title}`}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.required_skills.map((s) => <span key={s} className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[11px] text-brand-300 ring-1 ring-brand-500/25">{s}</span>)}
        {job.preferred_skills.map((s) => <span key={s} className="rounded-md bg-[#292D38]/[0.04] px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-white/10" title="Preferred">{s}</span>)}
        {job.required_skills.length + job.preferred_skills.length === 0 && <span className="text-xs text-slate-500">No skills listed yet. Edit the job to add them.</span>}
      </div>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:text-brand-400">
        {open ? 'Hide details' : 'Show details'} <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-[#E8E0D3] pt-3 text-sm">
          {job.education_requirements.length > 0 && (
            <ul className="space-y-1">
              {job.education_requirements.map((e) => (
                <li key={e} className="flex items-start gap-2 text-slate-300"><GraduationCap size={15} className="mt-0.5 shrink-0 text-brand-400" />{e}</li>
              ))}
            </ul>
          )}
          <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{job.description}</p>
          <p className="text-[11px] text-slate-500">
            <span className="mr-3 inline-block rounded bg-brand-500/15 px-1.5 text-brand-300">required</span>
            <span className="inline-block rounded bg-[#292D38]/[0.04] px-1.5 text-slate-400">preferred</span>
          </p>
        </div>
      )}
    </article>
  )
}
