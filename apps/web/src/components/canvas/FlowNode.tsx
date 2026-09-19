import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@ybot/ui'
import {
  Play, MessageSquare, HelpCircle, GitBranch, Variable,
  Globe, Workflow, Headphones, CheckCircle, Clock, Mail,
  Sparkles, Search, Layout, Layers, Zap,
} from 'lucide-react'
import type { NodeKind } from '@ybot/shared'

const ICON_MAP: Record<NodeKind, React.ElementType> = {
  start: Play,
  send_message: MessageSquare,
  ask_question: HelpCircle,
  condition: GitBranch,
  set_variable: Variable,
  http_request: Globe,
  execute_flow: Workflow,
  transfer_agent: Headphones,
  resolve: CheckCircle,
  delay: Clock,
  send_email: Mail,
  llm_prompt: Sparkles,
  knowledge_search: Search,
  buttons: Layout,
  carousel: Layers,
  quick_replies: Zap,
}

const COLOR_MAP: Record<NodeKind, string> = {
  start: '#22c55e',
  send_message: '#3b82f6',
  ask_question: '#8b5cf6',
  condition: '#f59e0b',
  set_variable: '#f59e0b',
  http_request: '#06b6d4',
  execute_flow: '#6366f1',
  transfer_agent: '#ec4899',
  resolve: '#22c55e',
  delay: '#64748b',
  send_email: '#3b82f6',
  llm_prompt: '#a855f7',
  knowledge_search: '#06b6d4',
  buttons: '#3b82f6',
  carousel: '#3b82f6',
  quick_replies: '#3b82f6',
}

export interface FlowNodeData {
  kind: NodeKind
  label: string
  config?: Record<string, unknown>
  selected?: boolean
}

export const FlowNode = memo(function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData
  const Icon = ICON_MAP[nodeData.kind] ?? MessageSquare
  const color = COLOR_MAP[nodeData.kind] ?? '#6366f1'

  const hasTarget = nodeData.kind !== 'start'
  const hasSingleSource =
    !['condition', 'http_request', 'knowledge_search', 'start'].includes(nodeData.kind) &&
    nodeData.kind !== 'resolve'
  const hasConditionSources = nodeData.kind === 'condition'
  const hasHttpSources = nodeData.kind === 'http_request'
  const hasKBSources = nodeData.kind === 'knowledge_search'
  const hasStartSource = nodeData.kind === 'start'

  return (
    <div
      className={cn(
        'group relative min-w-[160px] rounded-[10px] border-2 bg-[var(--bg-elevated)]',
        'shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-150',
        selected
          ? 'border-[var(--accent)] shadow-[0_0_0_3px_rgba(99,102,241,0.25)]'
          : 'border-[var(--border-strong)] hover:border-[var(--border-focus)]'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-[8px] px-3 py-2"
        style={{ background: `${color}18`, borderBottom: `1px solid ${color}30` }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${color}25` }}
        >
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[110px]">
          {nodeData.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {nodeData.config && Object.keys(nodeData.config).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(nodeData.config).slice(0, 2).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--text-muted)]">{k}:</span>
                <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[100px]">
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-[var(--text-muted)] italic">Click to configure</p>
        )}
      </div>

      {/* Handles */}
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !bg-[var(--bg-overlay)] !border-2 !border-[var(--border-strong)] hover:!border-[var(--accent)]"
        />
      )}

      {hasSingleSource && (
        <Handle
          type="source"
          id="out"
          position={Position.Bottom}
          className="!h-3 !w-3 !bg-[var(--accent)] !border-2 !border-[var(--accent-hover)]"
        />
      )}

      {hasStartSource && (
        <Handle
          type="source"
          id="out"
          position={Position.Bottom}
          className="!h-3 !w-3 !bg-[var(--accent)] !border-2 !border-[var(--accent-hover)]"
        />
      )}

      {hasConditionSources && (
        <>
          <Handle
            type="source"
            id="true"
            position={Position.Bottom}
            style={{ left: '30%' }}
            className="!h-3 !w-3 !bg-[var(--success)] !border-2"
          />
          <Handle
            type="source"
            id="false"
            position={Position.Bottom}
            style={{ left: '70%' }}
            className="!h-3 !w-3 !bg-[var(--error)] !border-2"
          />
        </>
      )}

      {hasHttpSources && (
        <>
          <Handle
            type="source"
            id="success"
            position={Position.Bottom}
            style={{ left: '30%' }}
            className="!h-3 !w-3 !bg-[var(--success)] !border-2"
          />
          <Handle
            type="source"
            id="error"
            position={Position.Bottom}
            style={{ left: '70%' }}
            className="!h-3 !w-3 !bg-[var(--error)] !border-2"
          />
        </>
      )}

      {hasKBSources && (
        <>
          <Handle
            type="source"
            id="found"
            position={Position.Bottom}
            style={{ left: '30%' }}
            className="!h-3 !w-3 !bg-[var(--success)] !border-2"
          />
          <Handle
            type="source"
            id="not_found"
            position={Position.Bottom}
            style={{ left: '70%' }}
            className="!h-3 !w-3 !bg-[var(--error)] !border-2"
          />
        </>
      )}

      {/* Port labels for condition/http/kb */}
      {(hasConditionSources || hasHttpSources || hasKBSources) && (
        <div className="flex justify-between px-2 pb-1">
          <span className="text-[8px] text-[var(--success)]">
            {hasConditionSources ? 'True' : hasHttpSources ? 'Success' : 'Found'}
          </span>
          <span className="text-[8px] text-[var(--error)]">
            {hasConditionSources ? 'False' : hasHttpSources ? 'Error' : 'Not found'}
          </span>
        </div>
      )}
    </div>
  )
})

export const nodeTypes = {
  flowNode: FlowNode,
}
