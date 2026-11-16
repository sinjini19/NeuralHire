import type { EmploymentType, Job, JobAnalysis, JobPayload, JobStatus } from '../types/job'

// Limits mirror backend/app/schemas.py. The server re-checks everything.
export const LIMITS = {
  title: 200, company: 200, department: 100, location: 200,
  descriptionMin: 20, descriptionMax: 20000,
  skillLen: 60, skillMax: 50, educationLen: 200, educationMax: 10, experienceMax: 50,
} as const

export const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

export const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
]

export const employmentLabel = (v: EmploymentType) => EMPLOYMENT_OPTIONS.find((o) => o.value === v)?.label ?? v

/** Form state keeps numbers as strings because that is what <input> gives us. */
export interface JobFormValues {
  title: string
  company: string
  department: string
  location: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: string
  education_requirements: string[]
  employment_type: EmploymentType
  status: JobStatus
}

export type FormErrors = Partial<Record<keyof JobFormValues, string>>

export const emptyForm: JobFormValues = {
  title: '', company: '', department: '', location: '', description: '',
  required_skills: [], preferred_skills: [], min_experience_years: '0',
  education_requirements: [], employment_type: 'full_time', status: 'open',
}

export function jobToForm(job: Job): JobFormValues {
  return {
    title: job.title,
    company: job.company,
    department: job.department ?? '',
    location: job.location ?? '',
    description: job.description,
    required_skills: job.required_skills,
    preferred_skills: job.preferred_skills,
    min_experience_years: String(job.min_experience_years),
    education_requirements: job.education_requirements,
    employment_type: job.employment_type,
    status: job.status,
  }
}

export function formToPayload(v: JobFormValues): JobPayload {
  return {
    title: v.title.trim(),
    company: v.company.trim(),
    department: v.department.trim() || null,
    location: v.location.trim() || null,
    description: v.description.trim(),
    required_skills: v.required_skills,
    preferred_skills: v.preferred_skills,
    min_experience_years: v.min_experience_years.trim() === '' ? 0 : Number(v.min_experience_years),
    education_requirements: v.education_requirements,
    employment_type: v.employment_type,
    status: v.status,
  }
}

/** Case-insensitive union that keeps the first spelling. */
export function mergeUnique(a: string[], b: string[]): string[] {
  const seen = new Set<string>()
  return [...a, ...b].filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function validateJobForm(v: JobFormValues): FormErrors {
  const errors: FormErrors = {}
  const title = v.title.trim(), company = v.company.trim(), description = v.description.trim()

  if (!title) errors.title = 'Title is required.'
  else if (title.length > LIMITS.title) errors.title = `Title must be at most ${LIMITS.title} characters.`

  if (!company) errors.company = 'Company is required.'
  else if (company.length > LIMITS.company) errors.company = `Company must be at most ${LIMITS.company} characters.`

  if (v.department.trim().length > LIMITS.department) errors.department = `At most ${LIMITS.department} characters.`
  if (v.location.trim().length > LIMITS.location) errors.location = `At most ${LIMITS.location} characters.`

  if (description.length < LIMITS.descriptionMin) errors.description = `Description needs at least ${LIMITS.descriptionMin} characters.`
  else if (description.length > LIMITS.descriptionMax) errors.description = `Description must be at most ${LIMITS.descriptionMax} characters.`

  const exp = v.min_experience_years.trim() === '' ? 0 : Number(v.min_experience_years)
  if (!Number.isFinite(exp) || exp < 0 || exp > LIMITS.experienceMax) {
    errors.min_experience_years = `Enter a number from 0 to ${LIMITS.experienceMax}.`
  }

  const required = new Set(v.required_skills.map((s) => s.toLowerCase()))
  const clash = v.preferred_skills.filter((s) => required.has(s.toLowerCase()))
  if (clash.length) errors.preferred_skills = `Already listed as required: ${clash.join(', ')}.`
  if (v.required_skills.length > LIMITS.skillMax) errors.required_skills = `At most ${LIMITS.skillMax} skills.`
  if (v.preferred_skills.length > LIMITS.skillMax) errors.preferred_skills ??= `At most ${LIMITS.skillMax} skills.`
  if (v.education_requirements.length > LIMITS.educationMax) errors.education_requirements = `At most ${LIMITS.educationMax} items.`

  return errors
}

/** Fills the form from an analysis result. Existing entries are kept; required wins over preferred. */
export function applyAnalysis(v: JobFormValues, a: JobAnalysis): JobFormValues {
  const required = mergeUnique(v.required_skills, a.required_skills)
  const requiredKeys = new Set(required.map((s) => s.toLowerCase()))
  const preferred = mergeUnique(v.preferred_skills, a.preferred_skills).filter((s) => !requiredKeys.has(s.toLowerCase()))
  return {
    ...v,
    required_skills: required,
    preferred_skills: preferred,
    min_experience_years: a.min_experience_years !== null ? String(a.min_experience_years) : v.min_experience_years,
    education_requirements: mergeUnique(v.education_requirements, a.education_requirements),
    employment_type: a.employment_type ?? v.employment_type,
  }
}
