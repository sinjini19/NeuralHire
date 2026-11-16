import { useEffect, useState } from 'react'
import { BrainCircuit, Sparkles, MessageSquareText, ClipboardList, RefreshCw } from 'lucide-react'
import { api, getErrorMessage } from '../lib/api'

type Candidate = { id: number; name: string; email?: string | null }
type Job = { id: number; title: string; company: string }
type Report = { id: number; report_type: string; content: Record<string, any>; model: string; created_at: string; cached?: boolean }
type Mode = 'summary' | 'analysis' | 'questions'
export default function AIIntelligence() {
  const [candidates,setCandidates]=useState<Candidate[]>([]), [jobs,setJobs]=useState<Job[]>([])
  const [candidateId,setCandidateId]=useState(''), [jobId,setJobId]=useState(''), [mode,setMode]=useState<Mode>('summary')
  const [report,setReport]=useState<Report|null>(null), [loading,setLoading]=useState(false), [error,setError]=useState('')
  useEffect(()=>{ Promise.all([api.get('/api/candidates?limit=100'),api.get('/api/jobs?limit=100')]).then(([c,j])=>{setCandidates(c.data.items);setJobs(j.data.items)}).catch(e=>setError(getErrorMessage(e))) },[])
  async function generate(force=false){ if(!candidateId || (mode!=='summary' && !jobId)) return; setLoading(true);setError('');setReport(null)
    try { const path=mode==='summary'?`/api/ai/candidates/${candidateId}/summary`:mode==='analysis'?`/api/ai/candidates/${candidateId}/jobs/${jobId}/analysis`:`/api/ai/candidates/${candidateId}/jobs/${jobId}/interview-questions`; const r=await api.post(path,{force_refresh:force});setReport(r.data) }
    catch(e){setError(getErrorMessage(e))} finally{setLoading(false)} }
  const content=report?.content ?? {}
  return <div className="space-y-6">
    <div><div className="flex items-center gap-2 text-brand-300"><Sparkles size={18}/><span className="text-xs font-semibold uppercase tracking-widest">Gemini-powered insights</span></div><h1 className="mt-2 text-2xl font-semibold text-slate-900">AI intelligence</h1><p className="mt-1 text-sm text-slate-400">Evidence-grounded candidate summaries, job-specific analysis and interview questions. AI insights never change deterministic match scores.</p></div>
    <section className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Candidate<select value={candidateId} onChange={e=>{setCandidateId(e.target.value);setReport(null)}} className="mt-2 w-full rounded-lg border border-[#E8E0D3] bg-navy-900 p-3 text-slate-900"><option value="">Choose candidate…</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.name} {c.email?`· ${c.email}`:''}</option>)}</select></label>
      <label className="text-sm text-slate-300">Job (required for job analysis/questions)<select value={jobId} onChange={e=>{setJobId(e.target.value);setReport(null)}} className="mt-2 w-full rounded-lg border border-[#E8E0D3] bg-navy-900 p-3 text-slate-900"><option value="">Choose job…</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}</select></label></div>
      <div className="flex flex-wrap gap-2">{([['summary','Candidate summary',BrainCircuit],['analysis','Job-specific analysis',Sparkles],['questions','Interview questions',MessageSquareText]] as const).map(([v,label,Icon])=><button key={v} onClick={()=>{setMode(v);setReport(null)}} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${mode===v?'bg-brand-600 text-slate-900':'bg-[#292D38]/[0.04] text-slate-300 hover:bg-[#292D38]/[0.06]'}`}><Icon size={15}/>{label}</button>)}</div>
      <button disabled={!candidateId || (mode!=='summary'&&!jobId) || loading} onClick={()=>generate()} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-40"><Sparkles size={16}/>{loading?'Generating…':'Generate with Gemini'}</button>
      <p className="text-xs text-slate-500">Requires GEMINI_API_KEY in backend/.env. Resume text is treated as untrusted input; protected characteristics are excluded.</p>
    </section>
    {error&&<div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
    {report&&<section className="rounded-lg border border-[#E8E0D3] bg-navy-850 p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold text-slate-900">{mode==='summary'?'Candidate summary':mode==='analysis'?'Job-specific analysis':'Suggested interview questions'}</h2><p className="text-xs text-slate-500">{report.model} · {report.cached?'Cached result':'Generated now'} · {new Date(report.created_at).toLocaleString()}</p></div><button onClick={()=>generate(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#E8E0D3] px-3 py-2 text-xs text-slate-300"><RefreshCw size={13}/>Regenerate</button></div>
      {Object.entries(content).map(([key,value])=><div key={key} className="border-t border-[#E8E0D3] pt-3"><h3 className="mb-2 text-sm font-semibold capitalize text-brand-300">{key.replaceAll('_',' ')}</h3>{Array.isArray(value)?<ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{value.map((item:any,i)=><li key={i}>{typeof item==='object'?Object.entries(item).map(([k,v])=>`${k.replaceAll('_',' ')}: ${String(v)}`).join(' · '):String(item)}</li>)}</ul>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{String(value)}</p>}</div>)}
      <p className="text-xs text-amber-300/80">AI-generated decision support. Verify all claims against the original resume. Do not use this report as an automatic hiring or rejection decision.</p></section>}
    {!report&&!loading&&!error&&<div className="rounded-lg border border-dashed border-[#E8E0D3] p-10 text-center"><ClipboardList className="mx-auto mb-3 text-slate-600" size={30}/><p className="font-medium text-slate-300">Choose a candidate to begin</p><p className="mt-1 text-sm text-slate-500">Generate an evidence-based summary or job-specific insights.</p></div>}
  </div>
}
