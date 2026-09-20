import React, { useState } from 'react'
import {
  MessageSquare, Users, CheckCircle, Clock, TrendingUp,
  ThumbsUp, Bot, UserCheck, Download, ChevronDown, Star,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, Badge, Button } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'
import { useAnalyticsOverview, useConversationTrends } from '../../lib/hooks'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const SUBNAV = [
  { label: 'Overview', path: '/analytics' },
  { label: 'Dashboards', path: '/analytics/dashboards' },
  { label: 'Reports', path: '/analytics/reports' },
]

const RANGES = ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom']

// ── Mock data ──────────────────────────────────────────────────────────────
const convTrendData = [
  { date: 'Sep 14', conversations: 120, resolved: 98, escalated: 22 },
  { date: 'Sep 15', conversations: 145, resolved: 118, escalated: 27 },
  { date: 'Sep 16', conversations: 98,  resolved: 82,  escalated: 16 },
  { date: 'Sep 17', conversations: 160, resolved: 140, escalated: 20 },
  { date: 'Sep 18', conversations: 175, resolved: 155, escalated: 20 },
  { date: 'Sep 19', conversations: 88,  resolved: 76,  escalated: 12 },
  { date: 'Sep 20', conversations: 65,  resolved: 58,  escalated: 7  },
]

const csatData = [
  { date: 'Sep 14', score: 78 },
  { date: 'Sep 15', score: 82 },
  { date: 'Sep 16', score: 76 },
  { date: 'Sep 17', score: 85 },
  { date: 'Sep 18', score: 88 },
  { date: 'Sep 19', score: 84 },
  { date: 'Sep 20', score: 87 },
]

const topIntentsData = [
  { name: 'Order status', count: 312 },
  { name: 'Delivery issue', count: 245 },
  { name: 'Return request', count: 187 },
  { name: 'Billing query', count: 143 },
  { name: 'Password reset', count: 98 },
  { name: 'Product info', count: 76 },
]

const handoverData = [
  { name: 'Bot resolved', value: 64, fill: '#6366f1' },
  { name: 'Agent handover', value: 22, fill: '#f59e0b' },
  { name: 'Escalated', value: 9, fill: '#ef4444' },
  { name: 'Abandoned', value: 5, fill: '#6b7280' },
]

const agentPerfData = [
  { name: 'Sarah K', resolved: 124, avg_time: '1.2m', csat: 94, online: true },
  { name: 'Mike R',  resolved: 98,  avg_time: '1.8m', csat: 89, online: true },
  { name: 'Tom B',   resolved: 76,  avg_time: '2.1m', csat: 85, online: false },
  { name: 'Anna W',  resolved: 65,  avg_time: '1.5m', csat: 91, online: true },
  { name: 'James O', resolved: 43,  avg_time: '2.8m', csat: 80, online: false },
]

const respTimeData = [
  { hour: '00:00', time: 1.2 },
  { hour: '02:00', time: 1.8 },
  { hour: '04:00', time: 2.4 },
  { hour: '06:00', time: 1.9 },
  { hour: '08:00', time: 0.8 },
  { hour: '10:00', time: 0.6 },
  { hour: '12:00', time: 0.9 },
  { hour: '14:00', time: 0.7 },
  { hour: '16:00', time: 0.8 },
  { hour: '18:00', time: 1.1 },
  { hour: '20:00', time: 1.4 },
  { hour: '22:00', time: 1.6 },
]

const channelData = [
  { name: 'Web', conversations: 383, resolved: 341, color: '#6366f1' },
  { name: 'WhatsApp', conversations: 255, resolved: 221, color: '#22c55e' },
  { name: 'SMS', conversations: 127, resolved: 109, color: '#f59e0b' },
  { name: 'Email', conversations: 86, resolved: 71, color: '#06b6d4' },
]

// ── Sub-components ─────────────────────────────────────────────────────────
function MetricTile({ label, value, change, positive, icon, sub }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ReactNode; sub?: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', positive ? 'text-[var(--success)]' : 'text-[var(--error)]')}>
              <TrendingUp size={11} className={positive ? '' : 'rotate-180'} />
              {change}
            </span>
            <span className="text-xs text-[var(--text-muted)]">vs last period</span>
          </div>
          {sub && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sub}</p>}
        </div>
        <div className="text-[var(--text-muted)]">{icon}</div>
      </div>
    </Card>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
}

export function AnalyticsOverviewPage() {
  const [range, setRange] = useState('Last 7 days')
  const { data: overview } = useAnalyticsOverview()
  const { data: trends } = useConversationTrends()

  // Use API data if available, otherwise fall back to static mock
  const convTrend = (trends && trends.length > 0) ? trends : convTrendData

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Analytics</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Clock size={13} /> {range} <ChevronDown size={11} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {RANGES.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRange(r)}>{r}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Download size={13} /> Export
            </Button>
          </div>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricTile label="Total Conversations" value={String(overview?.totalConversations ?? 851)} change="+12.5%" positive icon={<MessageSquare size={20} />} />
          <MetricTile label="Resolution Rate" value={`${overview?.resolutionRate?.toFixed(1) ?? 91.4}%`} change="+3.2%" positive icon={<CheckCircle size={20} />} sub={`Bot: ${overview?.botHandledPct ?? 64}% · Agent handover`} />
          <MetricTile label="CSAT Score" value={String(overview?.csatScore ?? 84.5)} change="+2.1%" positive icon={<ThumbsUp size={20} />} sub="Out of 100" />
          <MetricTile label="Avg Response Time" value={`${((overview?.avgResponseTimeMs ?? 1400) / 1000).toFixed(1)}s`} change="-18%" positive icon={<Clock size={20} />} sub="Bot: 0.3s · Agent: 48s" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricTile label="Active Users" value={String(overview?.totalContacts ?? 1247)} change="+8.1%" positive icon={<Users size={20} />} />
          <MetricTile label="Bot Handled" value={`${overview?.botHandledPct ?? 64}%`} change="+5.3%" positive icon={<Bot size={20} />} sub={`${Math.round(((overview?.botHandledPct ?? 64) / 100) * (overview?.totalConversations ?? 851))} resolved by bot`} />
          <MetricTile label="Agent Handovers" value="22%" change="-2.4%" positive icon={<UserCheck size={20} />} sub="conversations transferred" />
          <MetricTile label="Escalation Rate" value={`${overview?.escalationRate?.toFixed(1) ?? 9.1}%`} change="-1.2%" positive icon={<TrendingUp size={20} />} sub="escalations this period" />
        </div>

        {/* Row 1: Conversation trend + CSAT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card padding="none" className="xl:col-span-2">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Conversation volume</CardTitle>
              <Badge variant="muted">{range}</Badge>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={convTrend}>
                  <defs>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="conversations" name="Total" stroke="#6366f1" fill="url(#convGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="url(#resolvedGrad)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="escalated" name="Escalated" stroke="#ef4444" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>CSAT score trend</CardTitle>
              <span className="text-sm font-semibold text-[var(--success)]">84.5</span>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={csatData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="score" name="CSAT" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="score" name="Target" stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1} dot={false} strokeOpacity={0.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Row 2: Top intents + handover donut + response time */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Top intents</CardTitle>
              <Badge variant="muted">by volume</Badge>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIntentsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Conversations" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Resolution breakdown</CardTitle>
              <Badge variant="muted">% of total</Badge>
            </CardHeader>
            <div className="flex items-center gap-4 px-4 pb-4 h-[220px]">
              <div className="w-[120px] h-[120px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={handoverData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                      {handoverData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {handoverData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-xs text-[var(--text-secondary)]">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Response time by hour</CardTitle>
              <Badge variant="muted">seconds</Badge>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={respTimeData}>
                  <defs>
                    <linearGradient id="respGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="s" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v}s`} />
                  <Area type="monotone" dataKey="time" name="Avg response" stroke="#f59e0b" fill="url(#respGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Row 3: Channel breakdown + agent performance */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Channel breakdown</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-3">
              {channelData.map((ch) => {
                const pct = Math.round((ch.resolved / ch.conversations) * 100)
                return (
                  <div key={ch.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-primary)] font-medium">{ch.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{ch.conversations.toLocaleString()} · {pct}% resolved</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: ch.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card padding="none" className="xl:col-span-2">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle>Agent performance</CardTitle>
              <Badge variant="muted">{range}</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Agent', 'Status', 'Resolved', 'Avg handle time', 'CSAT', 'Score'].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {agentPerfData.map((a) => {
                    const scoreColor = a.csat >= 90 ? 'text-[var(--success)]' : a.csat >= 80 ? 'text-[var(--warning,#fbbf24)]' : 'text-[var(--error)]'
                    return (
                      <tr key={a.name} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-7 h-7 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[11px] font-semibold text-[var(--accent)]">
                                {a.name.split(' ').map((x) => x[0]).join('')}
                              </div>
                              <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-elevated)]', a.online ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]')} />
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{a.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn('text-xs font-medium', a.online ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>
                            {a.online ? '● Online' : '○ Offline'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-[var(--text-primary)]">{a.resolved}</td>
                        <td className="px-5 py-3 text-[var(--text-secondary)]">{a.avg_time}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <Star size={11} className="text-[var(--warning,#fbbf24)] fill-[var(--warning,#fbbf24)]" />
                            <span className={cn('text-sm font-semibold', scoreColor)}>{a.csat}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="h-1.5 w-24 rounded-full bg-[var(--bg-overlay)]">
                            <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${a.csat}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
