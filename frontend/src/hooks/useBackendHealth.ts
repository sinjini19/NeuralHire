import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export type HealthState = 'checking' | 'online' | 'offline'

/** Pings GET /health every 30s so the UI can show whether the API is up. */
export function useBackendHealth(): HealthState {
  const [state, setState] = useState<HealthState>('checking')

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        await api.get('/health', { timeout: 4000 })
        if (!cancelled) setState('online')
      } catch {
        if (!cancelled) setState('offline')
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return state
}
