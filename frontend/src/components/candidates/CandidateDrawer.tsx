import axios from 'axios'
import { GraduationCap, Mail, Phone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/api'
import { formatDate } from '../../lib/files'
import { getCandidate } from '../../services/candidates'
import type { CandidateDetail } from '../../types/candidate'
import { ErrorBanner } from '../ui/ErrorBanner'
import { Spinner } from '../ui/Spinner'

interface CandidateDrawerProps { candidateId: number; onClose: () => void }

export function CandidateDrawer({ candidateId, onClose }: CandidateDrawerProps) {
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getCandidate(candidateId, controller.signal)
      .then(setCandidate)
      .catch((err) => { if (!axios.isCancel(err)) setError(getErrorMessage(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [candidateId, attempt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Candidate profile"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl animate-fade-in flex-col border-l border-[#E8E0D3] bg-navy-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#E8E0D3] px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Candidate profile</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-[#292D38]/[0.04]" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {loading && <div className="flex justify-center py-20 text-brand-400"><Spinner size={28} /></div>}
          {error && <ErrorBanner message={error} onRetry={() => setAttempt((a) => a + 1)} />}

          {!loading && candidate && (
            <>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{candidate.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-slate-300">
                  <p className="flex items-center gap-2"><Mail size={14} className="text-slate-500" />{candidate.email ?? 'No email found'}</p>
                  <p className="flex items-center gap-2"><Phone size={14} className="text-slate-500" />{candidate.phone ?? 'No phone found'}</p>
                </div>
                <p className="mt-2 text-xs text-slate-500">{candidate.resume_filename} · uploaded {formatDate(candidate.uploaded_at)}</p>
              </div>

              <Section title={`Skills (${candidate.skills.length})`}>
                {candidate.skills.length === 0 ? <Muted>No known skills detected in this resume.</Muted> : (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s) => (
                      <span key={s} className="rounded-lg bg-brand-500/10 px-2 py-1 text-xs text-brand-300 ring-1 ring-brand-500/20">{s}</span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Education">
                {candidate.education.length === 0 ? <Muted>No education details detected.</Muted> : (
                  <ul className="space-y-3">
                    {candidate.education.map((e, i) => (
                      <li key={i} className="flex gap-3">
                        <GraduationCap size={16} className="mt-0.5 shrink-0 text-brand-400" />
                        <div>
                          <p className="text-sm text-slate-900">{e.degree}</p>
                          <p className="text-xs text-slate-400">{[e.institution, e.year].filter(Boolean).join(' · ') || 'Institution not detected'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={`Experience${candidate.experience.total_years > 0 ? ` · ${candidate.experience.total_years} years total` : ''}`}>
                {candidate.experience.entries.length === 0 ? <Muted>No dated work experience detected.</Muted> : (
                  <ul className="space-y-3 border-l border-[#E8E0D3] pl-4">
                    {candidate.experience.entries.map((x, i) => (
                      <li key={i}>
                        <p className="text-sm text-slate-900">{x.title}</p>
                        <p className="text-xs text-slate-400">{x.period}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Extracted resume text">
                <button onClick={() => setShowText((v) => !v)} className="text-xs font-medium text-brand-300 hover:text-brand-400">
                  {showText ? 'Hide text' : 'Show text'}
                </button>
                {showText && (
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-[#E8E0D3] bg-navy-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                    {candidate.resume_text}
                  </pre>
                )}
              </Section>
              <p className="text-[11px] text-slate-500">
                Profile fields are detected automatically from the resume text and can miss unusual layouts.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {children}
    </section>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>
}
