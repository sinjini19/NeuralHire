import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../lib/api'
import { listJobs } from '../services/jobs'
import type { EmploymentType, JobListResponse, JobStatus } from '../types/job'

export const JOBS_PAGE_SIZE = 10

interface Filters { search: string; status: JobStatus | 'all'; employmentType: EmploymentType | 'all'; offset: number }

/** Loads jobs from the API; refetches when a filter changes or reload() is called. */
export function useJobs({ search, status, employmentType, offset }: Filters) {
  const [data, setData] = useState<JobListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController() // cancels stale requests when filters change quickly
    setLoading(true)
    setError(null)
    listJobs(
      {
        q: search.trim(),
        status: status === 'all' ? undefined : status,
        employment_type: employmentType === 'all' ? undefined : employmentType,
        limit: JOBS_PAGE_SIZE,
        offset,
      },
      controller.signal,
    )
      .then(setData)
      .catch((err) => { if (!axios.isCancel(err)) setError(getErrorMessage(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [search, status, employmentType, offset, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  return { data, loading, error, reload }
}
