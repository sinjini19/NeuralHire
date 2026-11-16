import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { PipelineStage, ScoreBucket, SkillDemand, TrendPoint } from '../../types'
import { chartColors as c, tooltipStyle } from './chartTheme'

const axisProps = { stroke: c.axis, fontSize: 12, tickLine: false, axisLine: false } as const

/** Applications vs shortlisted over time (area chart with gradient fill). */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.violet} stopOpacity={0.5} />
            <stop offset="100%" stopColor={c.violet} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gShort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.cyan} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c.cyan} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Area type="monotone" dataKey="applications" name="Applications" stroke={c.violet} strokeWidth={2} fill="url(#gApps)" />
        <Area type="monotone" dataKey="shortlisted" name="Shortlisted" stroke={c.cyan} strokeWidth={2} fill="url(#gShort)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** How many candidates fall into each match-score range. */
export function ScoreChart({ data }: { data: ScoreBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="range" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="candidates" name="Candidates" radius={[8, 8, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={c.violet} fillOpacity={0.4 + i * 0.15} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Hiring funnel as horizontal bars. */
export function PipelineChart({ data }: { data: PipelineStage[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="stage" width={70} {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Candidates" radius={[0, 8, 8, 0]} fill={c.indigo} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Skills jobs ask for vs skills candidates actually have. */
export function SkillsChart({ data }: { data: SkillDemand[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="skill" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Bar dataKey="demand" name="Demand (jobs)" fill={c.violet} radius={[6, 6, 0, 0]} />
        <Bar dataKey="supply" name="Supply (candidates)" fill={c.cyan} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
