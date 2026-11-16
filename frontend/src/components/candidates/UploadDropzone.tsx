import { CheckCircle2, FileText, UploadCloud, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { getErrorMessage } from '../../lib/api'
import { MAX_FILES_PER_BATCH, MAX_UPLOAD_MB, formatBytes, validatePdf } from '../../lib/files'
import { uploadResume } from '../../services/candidates'
import { Spinner } from '../ui/Spinner'

type Status = 'queued' | 'uploading' | 'done' | 'error'
interface UploadItem {
  id: number
  name: string
  size: number
  status: Status
  progress: number
  message?: string // candidate name on success, reason on error
}

interface UploadDropzoneProps { onUploaded: () => void }

let nextId = 1

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const patch = (id: number, changes: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)))

  async function handleFiles(fileList: FileList | File[]) {
    let files = Array.from(fileList)
    if (files.length === 0 || busy) return

    setNotice(null)
    if (files.length > MAX_FILES_PER_BATCH) {
      setNotice(`Only the first ${MAX_FILES_PER_BATCH} files were taken. Upload the rest in another batch.`)
      files = files.slice(0, MAX_FILES_PER_BATCH)
    }

    // Validate in the browser first. Invalid files show an error row and never hit the server.
    const batch = files.map((file) => {
      const problem = validatePdf(file)
      const item: UploadItem = {
        id: nextId++, name: file.name, size: file.size,
        status: problem ? 'error' : 'queued', progress: 0, message: problem ?? undefined,
      }
      return { file, item, valid: !problem }
    })
    setItems(batch.map((b) => b.item))

    setBusy(true)
    let anySuccess = false
    for (const { file, item, valid } of batch) {
      if (!valid) continue
      patch(item.id, { status: 'uploading' })
      try {
        const candidate = await uploadResume(file, (progress) => patch(item.id, { progress }))
        patch(item.id, { status: 'done', progress: 100, message: candidate.name })
        anySuccess = true
        onUploaded() // refresh the list as soon as each resume is saved
      } catch (err) {
        patch(item.id, { status: 'error', message: getErrorMessage(err) })
      }
    }
    setBusy(false)
    if (anySuccess) onUploaded()
    if (inputRef.current) inputRef.current.value = '' // allows re-selecting the same file
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
          dragging ? 'border-brand-400 bg-brand-500/10' : 'border-[#E8E0D3] bg-navy-900/40 hover:border-brand-500/50 hover:bg-brand-500/5'
        } ${busy ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
          {busy ? <Spinner size={22} /> : <UploadCloud size={22} />}
        </span>
        <p className="text-sm font-medium text-slate-900">
          {busy ? 'Uploading and analysing resumes…' : 'Drop PDF resumes here, or click to browse'}
        </p>
        <p className="text-xs text-slate-400">
          Text-based PDFs only · up to {MAX_UPLOAD_MB} MB each · max {MAX_FILES_PER_BATCH} files at a time
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
      </div>

      {notice && <p className="mt-3 text-xs text-amber-300">{notice}</p>}

      {items.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {items.map((it) => (
            <li key={it.id} className="rounded-lg border border-[#E8E0D3] bg-navy-900/60 px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <FileText size={16} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{it.name}</p>
                  <p className={`truncate text-xs ${it.status === 'error' ? 'text-rose-300' : it.status === 'done' ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {it.status === 'queued' && `Waiting · ${formatBytes(it.size)}`}
                    {it.status === 'uploading' && (it.progress < 100 ? `Uploading ${it.progress}%` : 'Extracting text and building profile…')}
                    {it.status === 'done' && `Added ${it.message}`}
                    {it.status === 'error' && it.message}
                  </p>
                </div>
                {it.status === 'uploading' && <Spinner size={16} className="text-brand-400" />}
                {it.status === 'done' && <CheckCircle2 size={18} className="text-emerald-400" />}
                {it.status === 'error' && <XCircle size={18} className="text-rose-400" />}
              </div>
              {it.status === 'uploading' && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#292D38]/[0.04]">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${it.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
