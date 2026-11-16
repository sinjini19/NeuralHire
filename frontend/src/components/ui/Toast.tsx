import { CheckCircle2 } from 'lucide-react'

/** Small success message. The page that shows it clears it after a few seconds. */
export function Toast({ message }: { message: string }) {
  return (
    <div role="status" className="fixed bottom-5 right-5 z-[60] flex animate-fade-up items-center gap-2 rounded-lg border border-emerald-400/30 bg-navy-850 px-4 py-3 text-sm text-emerald-200 shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400" /> {message}
    </div>
  )
}
