import React, { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Input } from '@ybot/ui'
import type { NodeKind } from '@ybot/shared'
import { NODE_DEFINITIONS } from '@ybot/shared'
import type { Node } from '@xyflow/react'
import type { FlowNodeData } from './FlowNode'

interface NodeConfigPanelProps {
  node: Node | null
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

const CONFIG_FIELDS: Partial<Record<NodeKind, Array<{ key: string; label: string; type: string; placeholder?: string; hint?: string }>>> = {
  send_message: [
    { key: 'text', label: 'Message text', type: 'textarea', placeholder: 'Hello {{user.name}}! How can I help?' },
  ],
  ask_question: [
    { key: 'question', label: 'Question text', type: 'textarea', placeholder: 'What is your email address?' },
    { key: 'variable', label: 'Save answer to variable', type: 'text', placeholder: 'user.email' },
    { key: 'validation', label: 'Validation type', type: 'select', placeholder: 'none' },
  ],
  condition: [
    { key: 'expression', label: 'Condition expression', type: 'text', placeholder: '{{user.tier}} == "premium"' },
    { key: 'description', label: 'Description', type: 'text', placeholder: 'Check user tier' },
  ],
  set_variable: [
    { key: 'variable', label: 'Variable name', type: 'text', placeholder: 'flow.status' },
    { key: 'value', label: 'Value', type: 'text', placeholder: '"pending"' },
  ],
  http_request: [
    { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data' },
    { key: 'method', label: 'Method', type: 'select', placeholder: 'GET' },
    { key: 'body', label: 'Request body (JSON)', type: 'textarea', placeholder: '{"key": "{{flow.value}}"}' },
    { key: 'saveAs', label: 'Save response to', type: 'text', placeholder: 'flow.apiResponse' },
  ],
  transfer_agent: [
    { key: 'team', label: 'Route to team', type: 'text', placeholder: 'Support Team' },
    { key: 'note', label: 'Handover note', type: 'textarea', placeholder: 'Context for the agent…' },
    { key: 'priority', label: 'Priority', type: 'select', placeholder: 'normal' },
  ],
  delay: [
    { key: 'seconds', label: 'Delay (seconds)', type: 'number', placeholder: '5' },
  ],
  send_email: [
    { key: 'to', label: 'To', type: 'text', placeholder: '{{user.email}}' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Your order update' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Hello {{user.name}}…' },
  ],
  llm_prompt: [
    { key: 'prompt', label: 'System prompt', type: 'textarea', placeholder: 'You are a helpful assistant…' },
    { key: 'saveAs', label: 'Save response to', type: 'text', placeholder: 'flow.llmResponse' },
    { key: 'model', label: 'Model override', type: 'text', placeholder: 'Leave empty to use bot default' },
  ],
  knowledge_search: [
    { key: 'query', label: 'Search query', type: 'text', placeholder: '{{user.message}}' },
    { key: 'topK', label: 'Top K results', type: 'number', placeholder: '3' },
    { key: 'saveAs', label: 'Save results to', type: 'text', placeholder: 'flow.kbResults' },
  ],
  execute_flow: [
    { key: 'flowId', label: 'Target flow ID', type: 'text', placeholder: 'flow-cuid' },
  ],
  buttons: [
    { key: 'text', label: 'Message text', type: 'textarea', placeholder: 'Please choose an option:' },
    { key: 'buttons', label: 'Buttons (JSON array)', type: 'textarea', placeholder: '[{"label":"Yes","value":"yes"},{"label":"No","value":"no"}]' },
  ],
  quick_replies: [
    { key: 'text', label: 'Message text', type: 'text', placeholder: 'How can I help?' },
    { key: 'replies', label: 'Quick replies (comma-separated)', type: 'text', placeholder: 'Track order, Cancel order, Talk to agent' },
  ],
  carousel: [
    { key: 'cards', label: 'Cards (JSON array)', type: 'textarea', placeholder: '[{"title":"Card 1","subtitle":"Subtitle","image":"url"}]' },
  ],
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const [labelEdit, setLabelEdit] = useState<string | null>(null)

  if (!node) return null

  const data = node!.data as unknown as FlowNodeData
  const def = NODE_DEFINITIONS[data.kind]
  const fields = CONFIG_FIELDS[data.kind] ?? []

  function updateConfig(key: string, value: string) {
    if (!node) return
    onUpdate(node.id, {
      config: { ...(data.config ?? {}), [key]: value },
    })
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded text-[10px]"
            style={{ background: `${def.color}20`, color: def.color }}
          >
            ●
          </div>
          {labelEdit !== null ? (
            <input
              className="bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none border-b border-[var(--border-focus)] w-full"
              value={labelEdit}
              onChange={(e) => setLabelEdit(e.target.value)}
              onBlur={() => {
                if (labelEdit.trim()) onUpdate(node.id, { label: labelEdit.trim() })
                setLabelEdit(null)
              }}
              autoFocus
            />
          ) : (
            <button
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
              onClick={() => setLabelEdit(data.label)}
            >
              {data.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Description */}
      <div className="border-b border-[var(--border)] px-4 py-2">
        <p className="text-xs text-[var(--text-muted)]">{def.description}</p>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">ID: <span className="font-mono">{node.id.slice(0, 12)}</span></p>
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {fields.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">No configuration for this node.</p>
        ) : (
          fields.map((field) => {
            const val = (data.config?.[field.key] as string) ?? ''
            if (field.type === 'textarea') {
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">{field.label}</label>
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={val}
                    onChange={(e) => updateConfig(field.key, e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none resize-none"
                  />
                </div>
              )
            }
            return (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={val}
                onChange={(e) => updateConfig(field.key, e.target.value)}
              />
            )
          })
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-[var(--border)] p-3 flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => { onDelete(node.id); onClose() }}
        >
          Delete node
        </Button>
      </div>
    </div>
  )
}
