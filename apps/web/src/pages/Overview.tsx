import React from 'react'
import { MessageSquare, Users, CheckCircle, TrendingUp, Activity, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, Badge } from '@ybot/ui'
import { useAppStore } from '../store/app'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

const conversationData = [
  { date: 'Mon', conversations: 120, resolved: 98, escalated: 22 },
  { date: 'Tue', conversations: 145, resolved: 118, escalated: 27 },
  { date: 'Wed', conversations: 98, resolved: 82, escalated: 16 },
  { date: 'Thu', conversations: 160, resolved: 140, escalated: 20 },
  { date: 'Fri', conversations: 175, resolved: 155, escalated: 20 },
  { date: 'Sat', conversations: 88, resolved: 76, escalated: 12 },
  { date: 'Sun', conversations: 65, resolved: 58, escalated: 7 },
]

const channelData = [
  { name: 'Web', value: 45 },
  { name: 'WhatsApp', value: 30 },
  { name: 'SMS', value: 15 },
  { name: 'Email', value: 10 },
]

interface MetricTileProps {
  label: string
  value: string
  change: string
  positive: boolean
  icon: React.ReactNode
  color: string
}

function MetricTile({ label, value, change, positive, icon, color }: MetricTileProps) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <div className="mt-1 flex items-center gap-1">
          <Badge variant={positive ? 'success' : 'error'} dot>
            {change}
          </Badge>
          <span className="text-xs text-[var(--text-muted)]">vs last week</span>
        </div>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]`} style={{ background: color }}>
        {icon}
      </div>
    </Card>
  )
}

export function OverviewPage() {
  const selectedBot = useAppStore((s) => s.bots.find((b) => b.id === s.selectedBotId))
  const selectedEnv = useAppStore((s) => s.selectedEnv)

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Overview</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {selectedBot?.name ?? 'All bots'} · {selectedEnv === 'sandbox' ? 'Sandbox' : 'Production'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="muted">Last 7 days</Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MetricTile
            label="Total Conversations"
            value="851"
            change="+12.5%"
            positive
            icon={<MessageSquare size={18} className="text-[var(--accent)]" />}
            color="var(--accent-muted)"
          />
          <MetricTile
            label="Resolution Rate"
            value="91.4%"
            change="+3.2%"
            positive
            icon={<CheckCircle size={18} className="text-[var(--success)]" />}
            color="var(--success-muted)"
          />
          <MetricTile
            label="Active Users"
            value="1,247"
            change="+8.1%"
            positive
            icon={<Users size={18} className="text-[var(--info)]" />}
            color="var(--info-muted)"
          />
          <MetricTile
            label="Avg Response Time"
            value="1.4s"
            change="-18%"
            positive
            icon={<Clock size={18} className="text-[var(--warning)]" />}
            color="var(--warning-muted)"
          />
        </div>

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Conversation trend */}
          <Card className="xl:col-span-2" padding="none">
            <CardHeader className="px-4 pt-4">
              <CardTitle>Conversations (7 days)</CardTitle>
              <Badge variant="muted">Daily</Badge>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversationData}>
                  <defs>
                    <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="conversations" stroke="#6366f1" fill="url(#convGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Channel breakdown */}
          <Card padding="none">
            <CardHeader className="px-4 pt-4">
              <CardTitle>By Channel</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent activity stub */}
        <div className="mt-6">
          <Card padding="none">
            <CardHeader className="px-4 pt-4">
              <CardTitle>Recent Activity</CardTitle>
              <Badge variant="muted" dot>Live</Badge>
            </CardHeader>
            <div className="divide-y divide-[var(--border)]">
              {[
                { msg: 'New conversation started on Web channel', time: '2m ago', kind: 'info' },
                { msg: 'Flow "Product FAQ" published to Production', time: '15m ago', kind: 'success' },
                { msg: 'Agent Sarah claimed conversation #4821', time: '32m ago', kind: 'default' },
                { msg: 'WhatsApp template "Order Update" approved', time: '1h ago', kind: 'success' },
                { msg: 'Knowledge source sync completed (284 chunks)', time: '2h ago', kind: 'default' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  <p className="flex-1 text-sm text-[var(--text-secondary)]">{item.msg}</p>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
