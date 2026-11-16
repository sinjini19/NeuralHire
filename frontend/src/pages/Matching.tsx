import { useEffect, useState } from 'react'
import { Activity, Award, BrainCircuit, RefreshCw, Search, Target } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'

type Job = { id: number; title: string; company: string }
type Match = { candidate_id: number; candidate_name: string; score: number; matched_skills: string[]; missing_skills: string[]; details: { skills: { score: number; matched_required: string[]; missing_required: string[]; matched_preferred: string[] }; experience: { score: number; explanation: string }; education: { score: number; explanation: string }; notes: string[] } }
export default function Matching() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState('')
  const [results, setResults] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => { api.get('/api/jobs?limit=100').then(r => setJobs(r.data.items)).catch(e => setError(getErrorMessage(e))) }, [])
  async function run() {
    if (!jobId) return
    setLoading(true); setError('')
    try { const r = await api.post(`/api/matching/jobs/${jobId}/run`, {}); setResults(r.data.results); setSearched(true) }
    catch (e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }
  const filtered = results.filter(r => r.candidate_name.toLowerCase().includes(query.toLowerCase()))
  const selectedJob = jobs.find(j => String(j.id) === jobId)
  return <div className="space-y-6">
    <div><div className="flex items-center gap-2 text-brand-300"><BrainCircuit size={18}/><span className="text-xs font-semibold uppercase tracking-widest">Candidate intelligence</span></div><h1 className="mt-2 text-2xl font-semibold text-slate-900">Candidate matching</h1><p className="mt-1 text-sm text-slate-400">Rank candidates against a job using explainable, skills-first scoring.</p></div>
    <section className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-5">
      <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="matching-job">Select a job</label>
      <div className="flex flex-col gap-3 sm:flex-row"><select id="matching-job" value={jobId} onChange={e => {setJobId(e.target.value);setResults([]);setSearched(false)}} className="min-w-0 flex-1 rounded-lg border border-[#E8E0D3] bg-navy-900 px-3 py-3 text-sm text-slate-900"><option value="">Choose a job opening…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}</select><button onClick={run} disabled={!jobId || loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-brand-500 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>{loading ? 'Matching…' : 'Run matching'}</button></div>
      <p className="mt-3 text-xs text-slate-500">Default weights: required skills 50%, experience 25%, education 15%, preferred skills 10%.</p>
    </section>
    {error && <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
    {searched && <>
      <div className="grid gap-3 sm:grid-cols-3"><Stat icon={Target} label="Candidates evaluated" value={String(results.length)}/><Stat icon={Award} label="Top compatibility" value={results.length ? `${Math.max(...results.map(r=>r.score))}%` : 'N/A'}/><Stat icon={Activity} label="Selected role" value={selectedJob?.title ?? 'Job'}/></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold text-slate-900">Ranked candidates</h2><div className="relative sm:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidates" className="w-full rounded-lg border border-[#E8E0D3] bg-navy-850 py-2 pl-9 pr-3 text-sm text-slate-900"/></div></div>
      {filtered.length === 0 ? <div className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-8 text-center text-sm text-slate-400">{results.length ? 'No candidates match this search.' : 'No candidates have been uploaded yet.'}</div> : <div className="space-y-3">{filtered.map((m,i)=><article key={m.candidate_id} className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-300">#{i+1}</div><div><h3 className="font-semibold text-slate-900">{m.candidate_name}</h3><p className="text-xs text-slate-500">Candidate ID: {m.candidate_id}</p></div></div><div className="text-right"><div className="text-2xl font-bold text-brand-300">{m.score}%</div><div className="text-[11px] uppercase tracking-wider text-slate-500">Match score</div></div></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#292D38]/[0.04]"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{width:`${m.score}%`}}/></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><Breakdown label="Required skills" score={m.details.skills.score}/><Breakdown label="Experience" score={m.details.experience.score}/><Breakdown label="Education" score={m.details.education.score}/></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><SkillList title="Matched skills" items={m.matched_skills} good/><SkillList title="Missing required skills" items={m.missing_skills} good={false}/></div>
      <details className="mt-4 border-t border-[#E8E0D3] pt-3"><summary className="cursor-pointer text-sm font-medium text-brand-300">Why this score?</summary><div className="mt-3 space-y-2 text-xs text-slate-400"><p>{m.details.experience.explanation}</p><p>{m.details.education.explanation}</p>{m.details.notes.map(n=><p key={n}>{n}</p>)}</div></details>
      </article>)}</div>}
    </>}
    {!searched && !loading && !error && <div className="rounded-lg border border-dashed border-[#E8E0D3] p-10 text-center"><BrainCircuit className="mx-auto mb-3 text-slate-600" size={32}/><p className="font-medium text-slate-300">Ready to evaluate candidates</p><p className="mt-1 text-sm text-slate-500">Choose a job and run matching to generate a ranked shortlist.</p></div>}
  </div>
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:string}) { return <div className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={14}/>{label}</div><div className="mt-2 truncate text-lg font-semibold text-slate-900">{value}</div></div> }
function Breakdown({label,score}:{label:string;score:number}) { return <div className="rounded-lg bg-[#FFFDF8] p-3"><div className="flex justify-between text-xs text-slate-400"><span>{label}</span><b className="text-slate-200">{score}%</b></div><div className="mt-2 h-1.5 rounded-full bg-[#292D38]/[0.04]"><div className="h-full rounded-full bg-brand-500" style={{width:`${score}%`}}/></div></div> }
function SkillList({title,items,good}:{title:string;items:string[];good:boolean}) { return <div><p className="mb-2 text-xs font-medium text-slate-400">{title}</p><div className="flex flex-wrap gap-1.5">{items.length ? items.map(x=><span key={x} className={`rounded-md px-2 py-1 text-[11px] ${good?'bg-emerald-500/10 text-emerald-300':'bg-rose-500/10 text-rose-300'}`}>{x}</span>) : <span className="text-xs text-slate-600">None identified</span>}</div></div> }
