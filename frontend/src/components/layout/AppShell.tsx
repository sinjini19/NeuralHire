import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useBackendHealth } from '../../hooks/useBackendHealth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/** The persistent frame: sidebar + topbar. Pages render inside <Outlet />. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const health = useBackendHealth()

  return (
    <div className="min-h-full">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} health={health} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
