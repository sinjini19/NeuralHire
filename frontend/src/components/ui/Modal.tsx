import { X } from 'lucide-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'lg'
  /** Disable closing while a request is running so work isn't lost. */
  locked?: boolean
}

/** Centered dialog. Esc closes it. Backdrop clicks do NOT, so a stray click can't throw away a half-filled form. */
export function Modal({ title, onClose, children, size = 'lg', locked = false }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, locked])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 animate-fade-in bg-black/70" aria-hidden />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative w-full animate-fade-up rounded-lg border border-[#E8E0D3] bg-navy-900 shadow-2xl ${size === 'sm' ? 'max-w-md' : 'max-w-3xl'}`}
        >
          <header className="flex items-center justify-between border-b border-[#E8E0D3] px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              disabled={locked}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#292D38]/[0.04] disabled:opacity-40"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
