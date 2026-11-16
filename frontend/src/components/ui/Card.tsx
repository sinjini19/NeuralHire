import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number // ms, staggers the entrance animation
}

/** Base surface used by every dashboard panel. */
export function Card({ title, subtitle, action, children, className = '', delay = 0 }: CardProps) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-fade-up rounded-lg border border-[#E8E0D3] bg-[#FFFDF8] p-5 shadow-sm shadow-[#594B3B]/[0.06] ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
