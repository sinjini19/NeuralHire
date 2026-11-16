// Mirrors the Job schemas in backend/app/schemas.py
export type JobStatus = 'draft' | 'open' | 'closed'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance'

export interface JobPayload {
  title: string
  company: string
  department: string | null
  location: string | null
  description: string
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: number
  education_requirements: string[]
  employment_type: EmploymentType
  status: JobStatus
}

export interface Job extends JobPayload {
  id: number
  created_at: string
  updated_at: string
}

export interface JobStatusCounts { all: number; draft: number; open: number; closed: number }

export interface JobListResponse {
  items: Job[]
  total: number
  limit: number
  offset: number
  counts: JobStatusCounts
}

export interface SkillEvidence {
  skill: string
  category: 'required' | 'preferred'
  reason: string
  line: string
}

export interface JobAnalysis {
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: number | null
  education_requirements: string[]
  certifications: string[]
  employment_type: EmploymentType | null
  evidence: SkillEvidence[]
  experience_evidence: string[]
  notes: string[]
}
