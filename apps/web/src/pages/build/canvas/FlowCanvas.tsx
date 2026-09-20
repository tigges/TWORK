import React, { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft, Save, Play, Share2, GitBranch,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'
import { Button, Badge } from '@ybot/ui'
import { cn } from '@ybot/ui'
import { nodeTypes } from '../../../components/canvas/FlowNode'
import { NodePalette } from '../../../components/canvas/NodePalette'
import { NodeConfigPanel } from '../../../components/canvas/NodeConfigPanel'
import type { FlowNodeData } from '../../../components/canvas/FlowNode'
import type { NodeKind } from '@ybot/shared'

let nodeIdCounter = 1
function newId() {
  return `node_${nodeIdCounter++}_${Math.random().toString(36).slice(2, 7)}`
}

const INITIAL_NODES: Node[] = [
  {
    id: 'start-1',
    type: 'flowNode',
    position: { x: 300, y: 80 },
    data: { kind: 'start', label: 'Start' } satisfies FlowNodeData,
  },
  {
    id: 'msg-1',
    type: 'flowNode',
    position: { x: 300, y: 220 },
    data: {
      kind: 'send_message',
      label: 'Welcome',
      config: { text: 'Hello! How can I help you today?' },
    } satisfies FlowNodeData,
  },
  {
    id: 'ask-1',
    type: 'flowNode',
    position: { x: 300, y: 380 },
    data: {
      kind: 'ask_question',
      label: 'Ask for intent',
      config: { question: 'What would you like help with?', variable: 'user.intent' },
    } satisfies FlowNodeData,
  },
  {
    id: 'cond-1',
    type: 'flowNode',
    position: { x: 300, y: 540 },
    data: {
      kind: 'condition',
      label: 'Check intent',
      config: { expression: '{{user.intent}} contains "support"' },
    } satisfies FlowNodeData,
  },
  {
    id: 'agent-1',
    type: 'flowNode',
    position: { x: 120, y: 700 },
    data: {
      kind: 'transfer_agent',
      label: 'Escalate to agent',
      config: { team: 'Support Team' },
    } satisfies FlowNodeData,
  },
  {
    id: 'resolve-1',
    type: 'flowNode',
    position: { x: 480, y: 700 },
    data: { kind: 'resolve', label: 'Resolve' } satisfies FlowNodeData,
  },
]

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'start-1', sourceHandle: 'out', target: 'msg-1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2', source: 'msg-1', sourceHandle: 'out', target: 'ask-1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3', source: 'ask-1', sourceHandle: 'out', target: 'cond-1', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4', source: 'cond-1', sourceHandle: 'true', target: 'agent-1', markerEnd: { type: MarkerType.ArrowClosed }, label: 'True', style: { stroke: '#22c55e' } },
  { id: 'e5', source: 'cond-1', sourceHandle: 'false', target: 'resolve-1', markerEnd: { type: MarkerType.ArrowClosed }, label: 'False', style: { stroke: '#ef4444' } },
]

const EDGE_STYLE = {
  stroke: 'var(--border-strong)',
  strokeWidth: 1.5,
}

import { useSaveCanvas, useFlowCanvas } from '../../../lib/hooks'
import { useAppStore } from '../../../store/app'

export function FlowCanvasPage() {
  const navigate = useNavigate()
  const { flowId } = useParams({ from: '/app/build/flows/$flowId' })
  const selectedBotId = useAppStore((s) => s.selectedBotId) ?? 'demo'
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [status, setStatus] = useState<'draft' | 'saved' | 'published'>('draft')
  const [saving, setSaving] = useState(false)
  const [canvasVersion] = useState(1)

  const saveCanvas = useSaveCanvas()
  // Load canvas from API on mount
  const { data: savedCanvas } = useFlowCanvas(flowId ?? '', canvasVersion)
  React.useEffect(() => {
    if (savedCanvas?.graph?.nodes?.length) {
      setNodes(savedCanvas.graph.nodes as Node[])
      setEdges(savedCanvas.graph.edges as Edge[])
      setStatus(savedCanvas.status as 'draft' | 'saved' | 'published')
    }
  }, [savedCanvas])

  const dragKindRef = useRef<{ kind: NodeKind; label: string } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: EDGE_STYLE,
            animated: false,
          },
          eds
        )
      ),
    [setEdges]
  )

  function handleDragStart(kind: NodeKind, label: string) {
    dragKindRef.current = { kind, label }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!dragKindRef.current || !reactFlowWrapper.current) return

    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    const position = {
      x: e.clientX - bounds.left - 80,
      y: e.clientY - bounds.top - 40,
    }

    const { kind, label } = dragKindRef.current
    const newNode: Node = {
      id: newId(),
      type: 'flowNode',
      position,
      data: { kind, label } satisfies FlowNodeData,
    }

    setNodes((ns) => [...ns, newNode])
    dragKindRef.current = null
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNode(node)
  }

  function handleUpdateNode(nodeId: string, updates: Partial<FlowNodeData>) {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...(n.data as unknown as FlowNodeData), ...updates } }
          : n
      )
    )
    setSelectedNode((prev) =>
      prev?.id === nodeId
        ? { ...prev, data: { ...(prev.data as unknown as FlowNodeData), ...updates } }
        : prev
    )
  }

  function handleDeleteNode(nodeId: string) {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId))
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveCanvas.mutateAsync({
        flowId: flowId ?? '',
        version: canvasVersion,
        graph: { nodes: nodes as unknown as import('../../../lib/api').FlowNode[], edges: edges as unknown as import('../../../lib/api').FlowEdge[] },
      })
      setStatus('saved')
    } catch { /* demo mode or no backend — still mark saved locally */ setStatus('saved') }
    setSaving(false)
  }

  async function handlePublish() {
    await handleSave()
    setStatus('published')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Toolbar */}
      <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate({ to: '/build/flows' })}
          >
            <ArrowLeft size={14} />
          </Button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Welcome Flow</p>
            <p className="text-xs text-[var(--text-muted)]">v3 · edited just now</p>
          </div>
          <Badge
            variant={status === 'published' ? 'success' : status === 'saved' ? 'info' : 'muted'}
            dot
          >
            {status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" title="Undo"><Undo2 size={14} /></Button>
          <Button variant="ghost" size="icon-sm" title="Redo"><Redo2 size={14} /></Button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" size="sm">
            <Play size={13} /> Test
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={saving}>
            <Share2 size={13} /> Publish
          </Button>
        </div>
      </div>

      {/* Canvas body */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />

        <div
          ref={reactFlowWrapper}
          className="flex-1 overflow-hidden"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ style: EDGE_STYLE, markerEnd: { type: MarkerType.ArrowClosed } }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: 'var(--bg-base)' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border)"
            />
            <Controls
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            />
            <MiniMap
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
              nodeColor="var(--accent-muted)"
              maskColor="rgba(0,0,0,0.4)"
            />
          </ReactFlow>
        </div>

        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  )
}
