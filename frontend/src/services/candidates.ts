import { api } from '../lib/api'
import type { CandidateDetail, CandidateListResponse } from '../types/candidate'

export async function uploadResume(file: File, onProgress?: (percent: number) => void): Promise<CandidateDetail> {
  const form = new FormData()
  form.append('file', file) // field name must match `file` in the FastAPI endpoint
  const { data } = await api.post<CandidateDetail>('/api/candidates/upload', form, {
    timeout: 60_000, // PDF parsing can take a few seconds
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total))
    },
  })
  return data
}

export async function listCandidates(
  params: { q?: string; limit: number; offset: number },
  signal?: AbortSignal,
): Promise<CandidateListResponse> {
  const { data } = await api.get<CandidateListResponse>('/api/candidates', {
    params: { ...params, q: params.q || undefined },
    signal,
  })
  return data
}

export async function getCandidate(id: number, signal?: AbortSignal): Promise<CandidateDetail> {
  const { data } = await api.get<CandidateDetail>(`/api/candidates/${id}`, { signal })
  return data
}
