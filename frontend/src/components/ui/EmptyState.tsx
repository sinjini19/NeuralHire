import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps { icon: LucideIcon; title: string; text: string }

export function EmptyState({ icon: Icon, title, text }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
        <Icon size={22} />
      </span>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{text}</p>
    </div>
  )
}
