import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-6xl font-bold text-brand-400">404</p>
      <p className="mt-2 text-slate-400">That page doesn't exist.</p>
      <Link to="/" className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-brand-500">
        Back to dashboard
      </Link>
    </div>
  )
}
