import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getErrorMessage } from '../../lib/api'
import {
  EMPLOYMENT_OPTIONS, LIMITS, STATUS_OPTIONS, applyAnalysis, emptyForm, formToPayload, jobToForm, validateJobForm,
} from '../../lib/jobs'
import type { FormErrors, JobFormValues } from '../../lib/jobs'
import { analyzeDescription, createJob, updateJob } from '../../services/jobs'
import type { Job, JobAnalysis } from '../../types/job'
import { ErrorBanner } from '../ui/ErrorBanner'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { TagInput } from '../ui/TagInput'
import { AnalysisPanel } from './AnalysisPanel'

interface JobFormProps {
  job: Job | null // null = create, otherwise edit
  onSaved: (job: Job, mode: 'created' | 'updated') => void
  onCancel: () => void
}

const inputCls = (error?: string) =>
  `w-full rounded-lg border bg-navy-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
    error ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-[#E8E0D3] focus:border-brand-500/50 focus:ring-brand-500/20'
  }`

export function JobForm({ job, onSaved, onCancel }: JobFormProps) {
  const editing = job !== null
  const [values, setValues] = useState<JobFormValues>(job ? jobToForm(job) : emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined })) // clear the error as soon as the user fixes it
  }

  const descriptionLength = values.description.trim().length
  const canAnalyze = descriptionLength >= LIMITS.descriptionMin && !analyzing && !saving

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      setAnalysis(await analyzeDescription(values.description.trim()))
    } catch (err) {
      setAnalysis(null)
      setAnalyzeError(getErrorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const found = validateJobForm(values)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const payload = formToPayload(values)
      const saved = editing ? await updateJob(job.id, payload) : await createJob(payload)
      onSaved(saved, editing ? 'updated' : 'created')
    } catch (err) {
      setServerError(getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Edit job' : 'New job'} onClose={onCancel} locked={saving}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5 p-5">
          {serverError && <ErrorBanner message={serverError} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title *" id="job-title" error={errors.title}>
              <input id="job-title" autoFocus value={values.title} maxLength={LIMITS.title + 50} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior Backend Engineer" className={inputCls(errors.title)} />
            </Field>
            <Field label="Company *" id="job-company" error={errors.company}>
              <input id="job-company" value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. Acme Corp" className={inputCls(errors.company)} />
            </Field>
            <Field label="Department" id="job-department" error={errors.department}>
              <input id="job-department" value={values.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Engineering" className={inputCls(errors.department)} />
            </Field>
            <Field label="Location" id="job-location" error={errors.location}>
              <input id="job-location" value={values.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Bhubaneswar, India or Remote" className={inputCls(errors.location)} />
            </Field>
            <Field label="Employment type" id="job-type">
              <select id="job-type" value={values.employment_type} onChange={(e) => set('employment_type', e.target.value as JobFormValues['employment_type'])} className={inputCls()}>
                {EMPLOYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Status" id="job-status" hint="Only Open jobs are actively hiring.">
              <select id="job-status" value={values.status} onChange={(e) => set('status', e.target.value as JobFormValues['status'])} className={inputCls()}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="job-description" className="text-xs font-medium text-slate-300">Job description *</label>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                title={descriptionLength < LIMITS.descriptionMin ? `Write at least ${LIMITS.descriptionMin} characters first` : undefined}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/40 px-2.5 py-1 text-xs font-medium text-brand-300 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analyzing ? <Spinner size={13} /> : <Sparkles size={13} />} Analyze description
              </button>
            </div>
            <textarea
              id="job-description"
              rows={8}
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={'Paste or write the full description. Headings like "Requirements" and "Nice to have" help the analyzer.'}
              className={`${inputCls(errors.description)} resize-y`}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-rose-400">{errors.description}</span>
              <span className={descriptionLength > LIMITS.descriptionMax ? 'text-rose-400' : 'text-slate-500'}>
                {descriptionLength.toLocaleString()} / {LIMITS.descriptionMax.toLocaleString()}
              </span>
            </div>
          </div>

          {analyzeError && <ErrorBanner message={analyzeError} />}
          {analysis && (
            <AnalysisPanel
              analysis={analysis}
              onDismiss={() => setAnalysis(null)}
              onApply={() => { setValues((v) => applyAnalysis(v, analysis)); setErrors({}); setAnalysis(null) }}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TagInput id="job-required" label="Required skills" values={values.required_skills} onChange={(v) => set('required_skills', v)} placeholder="Type a skill, press Enter" maxItems={LIMITS.skillMax} maxLength={LIMITS.skillLen} error={errors.required_skills} />
            <TagInput id="job-preferred" label="Preferred skills" tone="neutral" values={values.preferred_skills} onChange={(v) => set('preferred_skills', v)} placeholder="Nice-to-have skills" maxItems={LIMITS.skillMax} maxLength={LIMITS.skillLen} error={errors.preferred_skills} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Min. experience (years)" id="job-exp" error={errors.min_experience_years}>
              <input id="job-exp" type="number" min={0} max={LIMITS.experienceMax} step={0.5} inputMode="decimal" value={values.min_experience_years} onChange={(e) => set('min_experience_years', e.target.value)} className={inputCls(errors.min_experience_years)} />
            </Field>
            <TagInput id="job-edu" label="Education requirements" tone="neutral" values={values.education_requirements} onChange={(v) => set('education_requirements', v)} placeholder="e.g. B.Tech in Computer Science" maxItems={LIMITS.educationMax} maxLength={LIMITS.educationLen} error={errors.education_requirements} />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[#E8E0D3] px-5 py-4">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#E8E0D3] px-4 py-2 text-sm text-slate-300 hover:bg-[#292D38]/[0.04] disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-60">
            {saving && <Spinner size={14} />} {editing ? 'Save changes' : 'Create job'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
