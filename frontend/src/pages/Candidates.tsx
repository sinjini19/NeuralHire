import { ChevronLeft, ChevronRight, SearchX, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { CandidateDrawer } from '../components/candidates/CandidateDrawer'
import { CandidateList } from '../components/candidates/CandidateList'
import { UploadDropzone } from '../components/candidates/UploadDropzone'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Spinner } from '../components/ui/Spinner'
import { PAGE_SIZE, useCandidates } from '../hooks/useCandidates'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function Candidates() {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const { data, loading, error, reload } = useCandidates(debouncedSearch, offset)

  const total = data?.total ?? 0
  const hasItems = (data?.items.length ?? 0) > 0
  const searching = debouncedSearch.trim().length > 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + PAGE_SIZE, total)

  const handleUploaded = () => {
    setOffset(0) // newest candidates appear first
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Candidates</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload PDF resumes. NeuralHire extracts the text and builds a profile for each candidate.
        </p>
      </div>

      <Card title="Upload resumes" subtitle="Files are checked in your browser and again on the server." delay={60}>
        <UploadDropzone onUploaded={handleUploaded} />
      </Card>

      <Card
        title="All candidates"
        subtitle={data ? `${total} candidate${total === 1 ? '' : 's'}` : undefined}
        delay={120}
        action={
          <div className="relative w-48 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
              placeholder="Search name or email"
              maxLength={100}
              className="w-full rounded-lg border border-[#E8E0D3] bg-navy-900 py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        }
      >
        {error && <ErrorBanner message={error} onRetry={reload} />}

        {!error && loading && !data && (
          <div className="flex justify-center py-16 text-brand-400"><Spinner size={28} /></div>
        )}

        {!error && data && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {hasItems ? (
              <CandidateList candidates={data.items} onSelect={setSelectedId} />
            ) : searching ? (
              <EmptyState icon={SearchX} title="No matching candidates" text={`Nothing matches “${debouncedSearch.trim()}”. Try a different name or email.`} />
            ) : (
              <EmptyState icon={Users} title="No candidates yet" text="Upload your first PDF resume above and the candidate will appear here." />
            )}
          </div>
        )}

        {!error && data && total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between border-t border-[#E8E0D3] pt-4 text-xs text-slate-400">
            <span>Showing {from}–{to} of {total}</span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D3] px-2.5 py-1.5 hover:bg-[#292D38]/[0.04] disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E8E0D3] px-2.5 py-1.5 hover:bg-[#292D38]/[0.04] disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {selectedId !== null && <CandidateDrawer candidateId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
