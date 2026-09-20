export type NodeKind =
  | 'start'
  | 'send_message'
  | 'ask_question'
  | 'condition'
  | 'set_variable'
  | 'http_request'
  | 'execute_flow'
  | 'transfer_agent'
  | 'resolve'
  | 'delay'
  | 'send_email'
  | 'llm_prompt'
  | 'knowledge_search'
  | 'buttons'
  | 'carousel'
  | 'quick_replies'

export interface NodePort {
  id: string
  label?: string
  type: 'source' | 'target'
}

export interface NodeDefinition {
  kind: NodeKind
  label: string
  description: string
  category: 'trigger' | 'message' | 'logic' | 'action' | 'integration' | 'end'
  icon: string
  color: string
  ports: NodePort[]
  configSchema?: Record<string, unknown>
}

export const NODE_DEFINITIONS: Record<NodeKind, NodeDefinition> = {
  start: {
    kind: 'start',
    label: 'Start',
    description: 'Flow entry point',
    category: 'trigger',
    icon: 'play',
    color: '#22c55e',
    ports: [{ id: 'out', label: 'Next', type: 'source' }],
  },
  send_message: {
    kind: 'send_message',
    label: 'Send Message',
    description: 'Send text, image, or rich content',
    category: 'message',
    icon: 'message-square',
    color: '#3b82f6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  ask_question: {
    kind: 'ask_question',
    label: 'Ask Question',
    description: 'Ask for user input and store in variable',
    category: 'message',
    icon: 'help-circle',
    color: '#8b5cf6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  condition: {
    kind: 'condition',
    label: 'Condition',
    description: 'Branch based on expression',
    category: 'logic',
    icon: 'git-branch',
    color: '#f59e0b',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'true', label: 'True', type: 'source' },
      { id: 'false', label: 'False', type: 'source' },
    ],
  },
  set_variable: {
    kind: 'set_variable',
    label: 'Set Variable',
    description: 'Assign a value to a variable',
    category: 'logic',
    icon: 'variable',
    color: '#f59e0b',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  http_request: {
    kind: 'http_request',
    label: 'HTTP Request',
    description: 'Call an external API',
    category: 'integration',
    icon: 'globe',
    color: '#06b6d4',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'success', label: 'Success', type: 'source' },
      { id: 'error', label: 'Error', type: 'source' },
    ],
  },
  execute_flow: {
    kind: 'execute_flow',
    label: 'Execute Flow',
    description: 'Jump to another flow',
    category: 'action',
    icon: 'workflow',
    color: '#6366f1',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  transfer_agent: {
    kind: 'transfer_agent',
    label: 'Transfer to Agent',
    description: 'Escalate to a human agent',
    category: 'action',
    icon: 'headphones',
    color: '#ec4899',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  resolve: {
    kind: 'resolve',
    label: 'Resolve',
    description: 'Mark conversation as resolved',
    category: 'end',
    icon: 'check-circle',
    color: '#22c55e',
    ports: [{ id: 'in', type: 'target' }],
  },
  delay: {
    kind: 'delay',
    label: 'Delay',
    description: 'Wait before continuing',
    category: 'logic',
    icon: 'clock',
    color: '#64748b',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  send_email: {
    kind: 'send_email',
    label: 'Send Email',
    description: 'Send an email',
    category: 'action',
    icon: 'mail',
    color: '#3b82f6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  llm_prompt: {
    kind: 'llm_prompt',
    label: 'LLM Prompt',
    description: 'Generate AI response',
    category: 'action',
    icon: 'sparkles',
    color: '#a855f7',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  knowledge_search: {
    kind: 'knowledge_search',
    label: 'Knowledge Search',
    description: 'Search knowledge base (RAG)',
    category: 'action',
    icon: 'search',
    color: '#06b6d4',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'found', label: 'Found', type: 'source' },
      { id: 'not_found', label: 'Not Found', type: 'source' },
    ],
  },
  buttons: {
    kind: 'buttons',
    label: 'Buttons',
    description: 'Present clickable button choices',
    category: 'message',
    icon: 'layout',
    color: '#3b82f6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  carousel: {
    kind: 'carousel',
    label: 'Carousel',
    description: 'Swipeable card carousel',
    category: 'message',
    icon: 'layers',
    color: '#3b82f6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
  quick_replies: {
    kind: 'quick_replies',
    label: 'Quick Replies',
    description: 'Fast-select reply chips',
    category: 'message',
    icon: 'zap',
    color: '#3b82f6',
    ports: [
      { id: 'in', type: 'target' },
      { id: 'out', label: 'Next', type: 'source' },
    ],
  },
}
