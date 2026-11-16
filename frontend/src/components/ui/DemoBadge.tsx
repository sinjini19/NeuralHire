import { FlaskConical } from 'lucide-react'

/** Rule #4: demo data must always be clearly labeled. */
export function DemoBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <span
      title="Sample values for layout preview. Not real recruitment data."
      className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
    >
      <FlaskConical size={11} /> {label}
    </span>
  )
}
