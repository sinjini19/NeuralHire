// Mirrors the backend schemas in backend/app/schemas.py
export interface EducationItem { degree: string; institution: string | null; year: number | null }
export interface ExperienceEntry { title: string; period: string }
export interface Experience { total_years: number; entries: ExperienceEntry[] }

export interface Candidate {
  id: number
  name: string
  email: string | null
  phone: string | null
  skills: string[]
  education: EducationItem[]
  experience: Experience
  resume_filename: string
  uploaded_at: string // ISO 8601, UTC
}

export interface CandidateDetail extends Candidate { resume_text: string }

export interface CandidateListResponse {
  items: Candidate[]
  total: number
  limit: number
  offset: number
}
