import axios from 'axios'
import { ChevronLeft, ChevronRight, Plus, Search, SearchX, Briefcase } from 'lucide-react'
import { useEffect, useState } from 'react'
import { JobCard } from '../components/jobs/JobCard'
import { JobForm } from '../components/jobs/JobForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Spinner } from '../components/ui/Spinner'
import { Toast } from '../components/ui/Toast'
import { JOBS_PAGE_SIZE, useJobs } from '../hooks/useJobs'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { EMPLOYMENT_OPTIONS } from '../lib/jobs'
import { deleteJob } from '../services/jobs'
import type { EmploymentType, Job, JobStatus } from '../types/job'

type StatusFilter = JobStatus | 'all'
type FormState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; job: Job }

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
]

export default function Jobs() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [employment, setEmployment] = useState<EmploymentType | 'all'>('all')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState<FormState>({ kind: 'closed' })
  const [toDelete, setToDelete] = useState<Job | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search)
  const { data, loading, error, reload } = useJobs({ search: debouncedSearch, status, employmentType: employment, offset })

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  const total = data?.total ?? 0
  const filtersActive = debouncedSearch.trim() !== '' || status !== 'all' || employment !== 'all'
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + JOBS_PAGE_SIZE, total)

  const changeFilter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setOffset(0) }

  function handleSaved(job: Job, mode: 'created' | 'updated') {
    setForm({ kind: 'closed' })
    setToast(`“${job.title}” ${mode}.`)
    if (mode === 'created') setOffset(0) // newest first
    reload()
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteJob(toDelete.id)
    } catch (err) {
      // Someone else already deleted it. The goal (job gone) is achieved, so don't show an error.
      if (!(axios.isAxiosError(err) && err.response?.status === 404)) throw err
    }
    setToast(`“${toDelete.title}” deleted.`)
    setToDelete(null)
    // If that was the last item on a later page, go back one page
    if (data && data.items.length === 1 && offset > 0) setOffset(Math.max(0, offset - JOBS_PAGE_SIZE))
    else reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Jobs</h1>
          <p className="mt-1 text-sm text-slate-400">Create openings, describe what you need, and keep them organised.</p>
        </div>
        <button
          onClick={() => setForm({ kind: 'create' })}
          className="inline-flex animate-fade-up items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <Plus size={16} /> New job
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by status" className="flex w-full gap-1 overflow-x-auto rounded-lg border border-[#E8E0D3] bg-navy-850 p-1 lg:w-auto">
          {TABS.map((t) => {
            const active = status === t.value
            const count = data?.counts[t.value]
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                onClick={() => changeFilter(setStatus)(t.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${active ? 'bg-brand-500/20 text-slate-900 ring-1 ring-brand-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t.label}
                {count !== undefined && <span className={`rounded-md px-1.5 text-[11px] ${active ? 'bg-brand-500/30 text-brand-200' : 'bg-[#292D38]/[0.04] text-slate-500'}`}>{count}</span>}
              </button>
            )
          })}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-xl lg:justify-end">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => changeFilter(setSearch)(e.target.value)}
              placeholder="Search title or company"
              maxLength={100}
              aria-label="Search jobs by title or company"
              className="w-full rounded-lg border border-[#E8E0D3] bg-navy-850 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select
            value={employment}
            onChange={(e) => changeFilter(setEmployment)(e.target.value as EmploymentType | 'all')}
            aria-label="Filter by employment type"
            className="rounded-lg border border-[#E8E0D3] bg-navy-850 px-3 py-2 text-sm text-slate-200 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">All types</option>
            {EMPLOYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {error && <ErrorBanner message={error} onRetry={reload} />}

      {!error && loading && !data && <div className="flex justify-center py-20 text-brand-400"><Spinner size={30} /></div>}

      {!error && data && (
        <div className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {data.items.length > 0 ? (
            data.items.map((job) => <JobCard key={job.id} job={job} onEdit={(j) => setForm({ kind: 'edit', job: j })} onDelete={setToDelete} />)
          ) : (
            <div className="rounded-lg border border-[#E8E0D3] bg-navy-850/80">
              {filtersActive ? (
                <EmptyState icon={SearchX} title="No jobs match your filters" text="Try a different search, status or employment type." />
              ) : (
                <EmptyState icon={Briefcase} title="No jobs yet" text="Create your first job to start describing what you are hiring for." />
              )}
              {!filtersActive && (
                <div className="flex justify-center pb-8">
                  <button onClick={() => setForm({ kind: 'create' })} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-brand-500">
                    <Plus size={16} /> Create a job
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!error && data && total > JOBS_PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - JOBS_PAGE_SIZE))} className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D3] px-2.5 py-1.5 hover:bg-[#292D38]/[0.04] disabled:opacity-40">
              <ChevronLeft size={14} /> Previous
            </button>
            <button disabled={offset + JOBS_PAGE_SIZE >= total || loading} onClick={() => setOffset(offset + JOBS_PAGE_SIZE)} className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D3] px-2.5 py-1.5 hover:bg-[#292D38]/[0.04] disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {form.kind !== 'closed' && (
        <JobForm job={form.kind === 'edit' ? form.job : null} onSaved={handleSaved} onCancel={() => setForm({ kind: 'closed' })} />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this job?"
          message={`“${toDelete.title}” at ${toDelete.company} will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete job"
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}
