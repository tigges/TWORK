import type { NodeContext, NodeResult, Session, ExecutionServices } from './types.js'
import {
  executeTriggerStart, executeSendMessage, executeAskQuestion,
  executeSetVariable, executeCondition, executeHttpRequest,
  executeClassifyIntent, executeHandover, executeCreateTicket, executeEndFlow,
} from './nodes/executors.js'

type NodeExecutor = (ctx: NodeContext) => Promise<NodeResult>

const EXECUTORS: Record<string, NodeExecutor> = {
  trigger_start:    executeTriggerStart,
  send_message:     executeSendMessage,
  ask_question:     executeAskQuestion,
  set_variable:     executeSetVariable,
  condition:        executeCondition,
  http_request:     executeHttpRequest,
  classify_intent:  executeClassifyIntent,
  handover:         executeHandover,
  create_ticket:    executeCreateTicket,
  end_flow:         executeEndFlow,
}

export interface GraphNode {
  id: string
  data: { kind: string; label: string; config: Record<string, unknown> }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

export interface FlowGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export class SessionMachine {
  private services: ExecutionServices

  constructor(services: ExecutionServices) {
    this.services = services
  }

  // Run the flow graph from a given node, continuing until waiting_input, handover, or end
  async run(session: Session, graph: FlowGraph, incomingText?: string): Promise<{
    session: Session
    newMessages: Array<{ direction: 'outbound'; content: { text: string } }>
    waitForInput?: Session['waitingFor']
    handover?: { team?: string; priority?: string; note?: string }
    completed?: boolean
  }> {
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]))
    const edgeMap = new Map<string, GraphEdge[]>()
    for (const e of graph.edges) {
      if (!edgeMap.has(e.source)) edgeMap.set(e.source, [])
      edgeMap.get(e.source)!.push(e)
    }

    const allNewMessages: Array<{ direction: 'outbound'; content: { text: string } }> = []

    // If session is waiting for input, resume from that node with the user's text
    if (session.status === 'waiting_input' && session.waitingFor && incomingText) {
      const { variable } = session.waitingFor
      session.variables.flow[variable] = incomingText
      session.waitingFor = undefined
      session.status = 'running'
    }

    let currentId = session.currentNodeId
    const visited = new Set<string>()
    const MAX_STEPS = 50

    while (currentId && visited.size < MAX_STEPS) {
      if (visited.has(currentId)) break
      visited.add(currentId)

      const node = nodeMap.get(currentId)
      if (!node) break

      const executor = EXECUTORS[node.data.kind]
      if (!executor) {
        currentId = this.nextNode(currentId, edgeMap, undefined)
        continue
      }

      const ctx: NodeContext = {
        session, nodeId: currentId, nodeKind: node.data.kind,
        config: node.data.config ?? {},
        input: session.variables.flow,
        services: this.services,
      }

      const result = await executor(ctx)

      // Merge output variables into flow scope
      Object.assign(session.variables.flow, result.output)

      if (result.newMessages) allNewMessages.push(...result.newMessages)

      if (result.handover) {
        session.status = 'handed_over'
        session.currentNodeId = currentId
        return { session, newMessages: allNewMessages, handover: result.handover }
      }

      if (result.waitForInput) {
        session.status = 'waiting_input'
        session.waitingFor = { nodeId: currentId, ...result.waitForInput }
        session.currentNodeId = currentId
        return { session, newMessages: allNewMessages, waitForInput: session.waitingFor }
      }

      if (node.data.kind === 'end_flow') {
        session.status = 'completed'
        return { session, newMessages: allNewMessages, completed: true }
      }

      const nextHandle = typeof result.nextNodeId === 'string' ? result.nextNodeId : undefined
      currentId = this.nextNode(currentId, edgeMap, nextHandle)
    }

    session.currentNodeId = currentId
    return { session, newMessages: allNewMessages }
  }

  private nextNode(nodeId: string, edgeMap: Map<string, GraphEdge[]>, handle?: string): string {
    const edges = edgeMap.get(nodeId) ?? []
    if (handle) {
      const match = edges.find((e) => e.sourceHandle === handle)
      if (match) return match.target
    }
    return edges[0]?.target ?? ''
  }
}
