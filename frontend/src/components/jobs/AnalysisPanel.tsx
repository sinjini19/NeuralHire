import { Sparkles } from 'lucide-react'
import { employmentLabel } from '../../lib/jobs'
import type { JobAnalysis } from '../../types/job'

interface AnalysisPanelProps { analysis: JobAnalysis; onApply: () => void; onDismiss: () => void }

/** Shows what the rule-based analyzer found AND why, so the recruiter can trust or correct it. */
export function AnalysisPanel({ analysis: a, onApply, onDismiss }: AnalysisPanelProps) {
  const nothing = a.required_skills.length + a.preferred_skills.length === 0 && a.min_experience_years === null &&
    a.education_requirements.length === 0 && !a.employment_type

  return (
    <div className="rounded-lg border border-brand-500/30 bg-brand-500/[0.06] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-300">
        <Sparkles size={15} /> Analysis of your description
        <span className="rounded-full bg-[#292D38]/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-400">rule-based, not AI</span>
      </div>

      {nothing ? (
        <p className="mt-2 text-sm text-slate-400">Nothing could be detected automatically. You can fill the fields in by hand.</p>
      ) : (
        <dl className="mt-3 space-y-2.5 text-sm">
          <Row label="Required skills">
            {a.required_skills.length ? <Chips items={a.required_skills} tone="brand" /> : <None />}
          </Row>
          <Row label="Preferred skills">
            {a.preferred_skills.length ? <Chips items={a.preferred_skills} tone="neutral" /> : <None />}
          </Row>
          <Row label="Experience">
            {a.min_experience_years === null ? <None /> : <span className="text-slate-200">{a.min_experience_years} {a.min_experience_years === 1 ? 'year' : 'years'} minimum</span>}
          </Row>
          <Row label="Education">
            {a.education_requirements.length ? <ul className="list-disc space-y-0.5 pl-4 text-slate-200">{a.education_requirements.map((e) => <li key={e}>{e}</li>)}</ul> : <None />}
          </Row>
          {a.certifications.length > 0 && (
            <Row label="Certifications">
              <ul className="list-disc space-y-0.5 pl-4 text-slate-200">{a.certifications.map((c) => <li key={c}>{c}</li>)}</ul>
            </Row>
          )}
          <Row label="Employment type">
            {a.employment_type ? <span className="text-slate-200">{employmentLabel(a.employment_type)}</span> : <None />}
          </Row>
        </dl>
      )}

      {a.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-300/90">
          {a.notes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
      )}

      {(a.evidence.length > 0 || a.experience_evidence.length > 0) && (
        <details className="mt-3 text-xs text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-300 hover:text-slate-900">Why did it decide this?</summary>
          <ul className="mt-2 space-y-2">
            {a.evidence.map((e) => (
              <li key={e.skill} className="rounded-lg bg-navy-950/60 p-2">
                <span className="font-medium text-slate-200">{e.skill}</span>{' '}
                <span className={e.category === 'required' ? 'text-brand-300' : 'text-slate-400'}>→ {e.category}</span>
                <p className="mt-0.5">{e.reason}</p>
                <p className="mt-0.5 italic text-slate-500">“{e.line}”</p>
              </li>
            ))}
            {a.experience_evidence.map((line) => (
              <li key={line} className="rounded-lg bg-navy-950/60 p-2">
                <span className="font-medium text-slate-200">Experience</span>
                <p className="mt-0.5 italic text-slate-500">“{line}”</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!nothing && (
          <button type="button" onClick={onApply} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-brand-500">
            Apply to form
          </button>
        )}
        <button type="button" onClick={onDismiss} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-[#292D38]/[0.04]">Dismiss</button>
        {!nothing && <span className="text-[11px] text-slate-500">Existing entries are kept. You can edit everything before saving.</span>}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
const None = () => <span className="text-slate-500">Not detected</span>

function Chips({ items, tone }: { items: string[]; tone: 'brand' | 'neutral' }) {
  const cls = tone === 'brand' ? 'bg-brand-500/15 text-brand-300 ring-brand-500/25' : 'bg-[#292D38]/[0.04] text-slate-300 ring-white/10'
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => <span key={s} className={`rounded-lg px-2 py-0.5 text-xs ring-1 ${cls}`}>{s}</span>)}
    </div>
  )
}
