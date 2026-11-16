import { X } from 'lucide-react'
import { useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

interface TagInputProps {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  hint?: string
  error?: string
  maxItems: number
  maxLength: number
  tone?: 'brand' | 'neutral'
}

/** Type a value and press Enter or comma to add it. Backspace on an empty box removes the last tag. */
export function TagInput({ id, label, values, onChange, placeholder, hint, error, maxItems, maxLength, tone = 'brand' }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  function commit(raw: string) {
    const parts = raw.split(/[,\n]/).map((p) => p.trim().replace(/\s+/g, ' ')).filter(Boolean)
    if (parts.length === 0) return
    let next = [...values]
    for (const part of parts) {
      if (part.length > maxLength) { setLocalError(`“${part.slice(0, 20)}…” is longer than ${maxLength} characters.`); continue }
      if (next.some((v) => v.toLowerCase() === part.toLowerCase())) continue
      if (next.length >= maxItems) { setLocalError(`You can add at most ${maxItems}.`); break }
      next = [...next, part]
      setLocalError(null)
    }
    onChange(next)
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault() // Enter must not submit the surrounding form
      commit(draft)
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (/[,\n]/.test(text)) { e.preventDefault(); commit(text) }
  }

  const chip = tone === 'brand' ? 'bg-brand-500/15 text-brand-300 ring-brand-500/25' : 'bg-[#292D38]/[0.04] text-slate-300 ring-white/10'
  const shownError = error ?? localError

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-300">{label}</label>
      <div className={`flex flex-wrap gap-1.5 rounded-lg border bg-navy-950 p-2 focus-within:ring-2 ${shownError ? 'border-rose-500/50 focus-within:ring-rose-500/20' : 'border-[#E8E0D3] focus-within:border-brand-500/50 focus-within:ring-brand-500/20'}`}>
        {values.map((v) => (
          <span key={v} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1 ${chip}`}>
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded text-slate-400 hover:text-slate-900">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => commit(draft)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      {shownError ? <p className="mt-1 text-xs text-rose-400">{shownError}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
