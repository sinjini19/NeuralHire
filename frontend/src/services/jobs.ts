import { api } from '../lib/api'
import type { EmploymentType, Job, JobAnalysis, JobListResponse, JobPayload, JobStatus } from '../types/job'

export interface JobListParams {
  q?: string
  status?: JobStatus
  employment_type?: EmploymentType
  limit: number
  offset: number
}

export async function listJobs(params: JobListParams, signal?: AbortSignal): Promise<JobListResponse> {
  const { data } = await api.get<JobListResponse>('/api/jobs', {
    params: { ...params, q: params.q || undefined }, // axios drops undefined values
    signal,
  })
  return data
}

export async function createJob(payload: JobPayload): Promise<Job> {
  const { data } = await api.post<Job>('/api/jobs', payload)
  return data
}

export async function updateJob(id: number, payload: JobPayload): Promise<Job> {
  const { data } = await api.put<Job>(`/api/jobs/${id}`, payload)
  return data
}

export async function deleteJob(id: number): Promise<void> {
  await api.delete(`/api/jobs/${id}`)
}

/** Asks the backend to suggest skills / experience / education. Nothing is saved. */
export async function analyzeDescription(description: string): Promise<JobAnalysis> {
  const { data } = await api.post<JobAnalysis>('/api/jobs/analyze', { description })
  return data
}
