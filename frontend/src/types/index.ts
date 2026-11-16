export interface StatItem {
  label: string
  value: string
  change: number // percent vs previous period
  hint: string
}

export interface TrendPoint { day: string; applications: number; shortlisted: number }
export interface ScoreBucket { range: string; candidates: number }
export interface PipelineStage { stage: string; count: number }
export interface SkillDemand { skill: string; demand: number; supply: number }

export interface TopMatch {
  id: number
  name: string
  role: string
  job: string
  score: number
  topSkills: string[]
}
