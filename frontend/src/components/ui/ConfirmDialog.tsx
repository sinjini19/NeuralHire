import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../lib/api'
import { ErrorBanner } from './ErrorBanner'
import { Modal } from './Modal'
import { Spinner } from './Spinner'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

/** Destructive-action confirmation. Stays open and shows the error if the request fails. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onCancel} size="sm" locked={busy}>
      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-400">
            <AlertTriangle size={20} />
          </span>
          <p className="pt-1 text-sm text-slate-300">{message}</p>
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={busy} className="rounded-lg border border-[#E8E0D3] px-4 py-2 text-sm text-slate-300 hover:bg-[#292D38]/[0.04] disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            autoFocus
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-rose-500 disabled:opacity-60"
          >
            {busy && <Spinner size={14} />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
