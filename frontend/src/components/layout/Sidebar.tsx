import { NavLink } from 'react-router-dom'
import {
  BrainCircuit, Briefcase, GitCompareArrows, LayoutDashboard, Target, Users, X, Sparkles,
} from 'lucide-react'

export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/matching', label: 'Matching', icon: Target },
  { to: '/ai', label: 'AI Intelligence', icon: Sparkles },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
]

interface SidebarProps { open: boolean; onClose: () => void }

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Dark overlay behind the drawer on mobile */}
      {open && (
        <div className="fixed inset-0 z-30 animate-fade-in bg-black/60 lg:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#E8E0D3] bg-[#F1EBDD] transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#B8C9E8] text-[#292D38]">
              <BrainCircuit size={20} />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Neural<span className="text-[#829FCF]">Hire</span>
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-[#292D38]/[0.04] lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#DCE6F5] text-[#292D38] ring-1 ring-[#B8C9E8]'
                    : 'text-slate-500 hover:bg-[#FFFDF8] hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-lg border border-[#E4D5E1] bg-[#F2E6EF] p-4">
          <p className="text-xs font-semibold text-[#72546B]">AI-powered screening</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Upload resumes and rank candidates against any job description.
          </p>
        </div>
      </aside>
    </>
  )
}
