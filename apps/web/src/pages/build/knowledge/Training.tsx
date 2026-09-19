import React, { useState } from 'react'
import {
  Dumbbell, Play, CheckCircle, Clock, AlertCircle,
  Cpu, TrendingUp, RefreshCw, ChevronRight, Settings
} from 'lucide-react'
import { Button, Badge, Card, CardHeader, CardTitle } from '@ybot/ui'
import { SubNav } from '../../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Intents', path: '/build/knowledge/intents' },
  { label: 'Entities', path: '/build/knowledge/entities' },
  { label: 'FAQs', path: '/build/knowledge/faqs' },
  { label: 'Sources', path: '/build/knowledge/sources' },
  { label: 'Training', path: '/build/knowledge/training' },
]

interface TrainingRun {
  id: string
  status: 'success' | 'running' | 'failed'
  triggeredBy: string
  startedAt: string
  duration: string
  intents: number
  entities: number
  accuracy?: number
}

const MOCK_RUNS: TrainingRun[] = [
  { id: '1', status: 'success', triggeredBy: 'admin@acme.com', startedAt: '2h ago', duration: '1m 42s', intents: 5, entities: 3, accuracy: 94.2 },
  { id: '2', status: 'success', triggeredBy: 'dev@acme.com', startedAt: '1d ago', duration: '1m 18s', intents: 4, entities: 3, accuracy: 91.8 },
  { id: '3', status: 'failed', triggeredBy: 'admin@acme.com', startedAt: '3d ago', duration: '0m 12s', intents: 4, entities: 2 },
  { id: '4', status: 'success', triggeredBy: 'dev@acme.com', startedAt: '5d ago', duration: '1m 05s', intents: 3, entities: 2, accuracy: 88.5 },
]

export function TrainingPage() {
  const [runs, setRuns] = useState(MOCK_RUNS)
  const [training, setTraining] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [temperature, setTemperature] = useState('0.3')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful customer support assistant for Acme Corp. Be friendly, concise, and helpful. Always confirm user\'s order number before looking up details.'
  )

  async function handleTrain() {
    setTraining(true)
    await new Promise((r) => setTimeout(r, 2500))
    setRuns((rs) => [{
      id: `run-${Date.now()}`,
      status: 'success',
      triggeredBy: 'admin@acme.com',
      startedAt: 'just now',
      duration: '1m 38s',
      intents: 5,
      entities: 3,
      accuracy: 95.1,
    }, ...rs])
    setTraining(false)
  }

  const latestSuccess = runs.find((r) => r.status === 'success')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 pt-4 pb-0">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Knowledge</h1>
          <Button size="sm" onClick={handleTrain} disabled={training}>
            {training ? (
              <><RefreshCw size={13} className="animate-spin" /> Training…</>
            ) : (
              <><Play size={13} /> Run Training</>
            )}
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* LLM Config */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-[var(--accent)]" />
              <CardTitle>LLM Configuration</CardTitle>
            </div>
          </CardHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Free)</option>
                  <option value="groq/llama-3.1-70b">Llama 3.1 70B via Groq (Free)</option>
                  <option value="ollama/llama3.2">Ollama Llama 3.2 (Local)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-2 w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Precise (0)</span><span>Creative (1)</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">System Prompt</label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary">Save Config</Button>
            </div>
          </div>
        </Card>

        {/* Current model metrics */}
        {latestSuccess && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Intent Accuracy</p>
              <p className="text-2xl font-bold text-[var(--success)] mt-1">{latestSuccess.accuracy}%</p>
              <Badge variant="success" dot className="mt-1">Last training</Badge>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Intents Trained</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{latestSuccess.intents}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Entities Trained</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{latestSuccess.entities}</p>
            </Card>
          </div>
        )}

        {/* Training history */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[var(--accent)]" />
              <CardTitle>Training History</CardTitle>
            </div>
          </CardHeader>
          <div className="divide-y divide-[var(--border)]">
            {runs.map((run) => {
              const StatusIcon = run.status === 'success' ? CheckCircle : run.status === 'running' ? Clock : AlertCircle
              return (
                <div key={run.id} className="flex items-center gap-4 px-4 py-3">
                  <StatusIcon
                    size={15}
                    className={cn(
                      run.status === 'success' ? 'text-[var(--success)]' :
                      run.status === 'running' ? 'text-[var(--warning)] animate-spin' :
                      'text-[var(--error)]'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={run.status === 'success' ? 'success' : run.status === 'running' ? 'warning' : 'error'}
                        dot
                      >
                        {run.status}
                      </Badge>
                      {run.accuracy && (
                        <span className="text-xs text-[var(--text-secondary)]">{run.accuracy}% accuracy</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {run.intents} intents · {run.entities} entities · {run.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">{run.startedAt}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{run.triggeredBy}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
