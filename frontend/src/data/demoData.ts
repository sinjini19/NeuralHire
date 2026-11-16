// ⚠️ DEMO DATA ONLY. Placeholder numbers so the dashboard layout can be
// built and reviewed. In a later module this file is replaced by real
// analytics from the backend API (/api/analytics/*).
import type {
  PipelineStage, ScoreBucket, SkillDemand, StatItem, TopMatch, TrendPoint,
} from '../types'

export const demoStats: StatItem[] = [
  { label: 'Active Jobs', value: '12', change: 8.3, hint: 'open positions' },
  { label: 'Candidates', value: '248', change: 14.2, hint: 'resumes parsed' },
  { label: 'Avg. Match Score', value: '72%', change: 3.1, hint: 'across all jobs' },
  { label: 'Shortlisted', value: '37', change: -2.4, hint: 'this month' },
]

export const demoTrend: TrendPoint[] = [
  { day: 'Mon', applications: 24, shortlisted: 6 },
  { day: 'Tue', applications: 38, shortlisted: 9 },
  { day: 'Wed', applications: 31, shortlisted: 8 },
  { day: 'Thu', applications: 52, shortlisted: 14 },
  { day: 'Fri', applications: 47, shortlisted: 12 },
  { day: 'Sat', applications: 19, shortlisted: 4 },
  { day: 'Sun', applications: 16, shortlisted: 3 },
]

export const demoScores: ScoreBucket[] = [
  { range: '0-20', candidates: 8 },
  { range: '21-40', candidates: 24 },
  { range: '41-60', candidates: 62 },
  { range: '61-80', candidates: 94 },
  { range: '81-100', candidates: 60 },
]

export const demoPipeline: PipelineStage[] = [
  { stage: 'Applied', count: 248 },
  { stage: 'Screened', count: 154 },
  { stage: 'Interview', count: 61 },
  { stage: 'Offer', count: 14 },
]

export const demoSkills: SkillDemand[] = [
  { skill: 'Python', demand: 82, supply: 64 },
  { skill: 'React', demand: 74, supply: 58 },
  { skill: 'SQL', demand: 68, supply: 71 },
  { skill: 'AWS', demand: 55, supply: 31 },
  { skill: 'Docker', demand: 47, supply: 36 },
  { skill: 'TypeScript', demand: 44, supply: 40 },
]

export const demoTopMatches: TopMatch[] = [
  { id: 1, name: 'Aarav Sharma', role: 'Full-Stack Engineer', job: 'Senior React Developer', score: 94, topSkills: ['React', 'TypeScript', 'Node'] },
  { id: 2, name: 'Priya Nair', role: 'ML Engineer', job: 'Data Scientist', score: 91, topSkills: ['Python', 'PyTorch', 'SQL'] },
  { id: 3, name: 'Rohan Mehta', role: 'Backend Engineer', job: 'Python Backend Lead', score: 88, topSkills: ['FastAPI', 'Docker', 'AWS'] },
  { id: 4, name: 'Sneha Patil', role: 'Frontend Engineer', job: 'Senior React Developer', score: 84, topSkills: ['React', 'Tailwind', 'Jest'] },
  { id: 5, name: 'Karthik Iyer', role: 'Data Analyst', job: 'Data Scientist', score: 79, topSkills: ['SQL', 'Python', 'Tableau'] },
]
