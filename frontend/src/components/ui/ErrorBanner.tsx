import { AlertTriangle } from 'lucide-react'

interface ErrorBannerProps { message: string; onRetry?: () => void }

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-200">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-400" />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-100 hover:bg-rose-500/30">
          Retry
        </button>
      )}
    </div>
  )
}
