import { Hammer } from 'lucide-react'
import { Card } from '../components/ui/Card'

/** Temporary page for modules that are not built yet. */
export default function ComingSoon({ title, module }: { title: string; module: string }) {
  return (
    <div className="space-y-6">
      <h1 className="animate-fade-up text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <Card>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
            <Hammer size={22} />
          </span>
          <p className="text-sm font-medium text-slate-900">This page is built in {module}</p>
          <p className="max-w-sm text-xs text-slate-400">The route and navigation already work. We fill in the real feature next.</p>
        </div>
      </Card>
    </div>
  )
}
