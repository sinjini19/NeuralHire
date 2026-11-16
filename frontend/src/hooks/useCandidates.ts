import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../lib/api'
import { listCandidates } from '../services/candidates'
import type { CandidateListResponse } from '../types/candidate'

export const PAGE_SIZE = 20

/** Loads the candidate list from the API. Re-fetches when search/page change or reload() is called. */
export function useCandidates(search: string, offset: number) {
  const [data, setData] = useState<CandidateListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // AbortController cancels the in-flight request if the inputs change again,
    // so a slow old response can never overwrite a newer one.
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    listCandidates({ q: search.trim(), limit: PAGE_SIZE, offset }, controller.signal)
      .then(setData)
      .catch((err) => {
        if (axios.isCancel(err)) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [search, offset, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  return { data, loading, error, reload }
}
