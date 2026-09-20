import React from 'react'
import { cn } from '@ybot/ui'
import { NODE_DEFINITIONS, type NodeKind } from '@ybot/shared'
import {
  Play, MessageSquare, HelpCircle, GitBranch, Variable,
  Globe, Workflow, Headphones, CheckCircle, Clock, Mail,
  Sparkles, Search, Layout, Layers, Zap,
} from 'lucide-react'

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

const CATEGORIES = [
  { id: 'trigger', label: 'Trigger' },
  { id: 'message', label: 'Messages' },
  { id: 'logic', label: 'Logic' },
  { id: 'action', label: 'Actions' },
  { id: 'integration', label: 'Integrations' },
  { id: 'end', label: 'End' },
]

interface NodePaletteProps {
  onDragStart: (kind: NodeKind, label: string) => void
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto">
      <div className="border-b border-[var(--border)] px-3 py-2.5">
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nodes</h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {CATEGORIES.map((cat) => {
          const nodes = Object.values(NODE_DEFINITIONS).filter((n) => n.category === cat.id)
          if (nodes.length === 0) return null
          return (
            <div key={cat.id} className="mb-3">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {cat.label}
              </p>
              <div className="space-y-0.5 px-2">
                {nodes.map((def) => {
                  const Icon = ICON_MAP[def.kind] ?? MessageSquare
                  return (
                    <div
                      key={def.kind}
                      draggable
                      onDragStart={() => onDragStart(def.kind, def.label)}
                      className={cn(
                        'flex cursor-grab items-center gap-2 rounded-[var(--radius)] px-2 py-1.5',
                        'border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-hover)]',
                        'transition-colors select-none active:cursor-grabbing'
                      )}
                      title={def.description}
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                        style={{ background: `${def.color}20` }}
                      >
                        <Icon size={12} style={{ color: def.color }} />
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">{def.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Drag nodes onto the canvas
        </p>
      </div>
    </div>
  )
}
