/**
 * TanStack Query hooks wrapping the typed API client.
 * Automatically falls back to demo data when the backend is unreachable.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import * as demo from './demo-data'
import { useAppStore } from '../store/app'

/** True when running on GitHub Pages or VITE_DEMO_MODE=true with no API URL */
const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true'

function botId() { return useAppStore.getState().selectedBotId ?? 'demo' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function withDemoFallback<T>(apiFn: () => Promise<T>, demoValue: T): () => Promise<T> {
  return async () => {
    if (isDemoMode()) return demoValue
    try {
      return await apiFn()
    } catch {
      // API not available (no backend, network error, JSON parse error, etc.) — use demo data
      return demoValue
    }
  }
}

// ── Flows ─────────────────────────────────────────────────────────────────────
export function useFlows() {
  const bid = botId()
  return useQuery({
    queryKey: ['flows', bid],
    queryFn: withDemoFallback(() => api.flows.list(bid).then((r) => r.data), demo.DEMO_FLOWS),
    staleTime: 30_000,
  })
}

export function useCreateFlow() {
  const qc = useQueryClient()
  const bid = botId()
  return useMutation({
    mutationFn: (body: { name: string; description?: string; tags?: string[] }) =>
      api.flows.create(bid, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flows', bid] }),
  })
}

export function useDeleteFlow() {
  const qc = useQueryClient()
  const bid = botId()
  return useMutation({
    mutationFn: (flowId: string) => api.flows.delete(bid, flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flows', bid] }),
  })
}

export function useFlowCanvas(flowId: string, version: number) {
  const bid = botId()
  return useQuery({
    queryKey: ['canvas', bid, flowId, version],
    queryFn: async () => {
      if (isDemoMode()) return null
      return api.flows.getCanvas(bid, flowId, version).then((r) => r.data)
    },
    enabled: !!flowId && !isDemoMode(),
  })
}

export function useSaveCanvas() {
  const qc = useQueryClient()
  const bid = botId()
  return useMutation({
    mutationFn: ({ flowId, version, graph }: { flowId: string; version: number; graph: api.FlowGraph }) =>
      api.flows.saveCanvas(bid, flowId, version, graph),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['canvas', bid, v.flowId] }),
  })
}

// ── Intents ───────────────────────────────────────────────────────────────────
export function useIntents() {
  const bid = botId()
  return useQuery({
    queryKey: ['intents', bid],
    queryFn: withDemoFallback(() => api.knowledge.intents.list(bid).then((r) => r.data), demo.DEMO_INTENTS),
  })
}

export function useCreateIntent() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (body: Partial<api.Intent>) => api.knowledge.intents.create(bid, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intents', bid] }),
  })
}

export function useUpdateIntent() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<api.Intent> & { id: string }) => api.knowledge.intents.update(bid, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intents', bid] }),
  })
}

export function useDeleteIntent() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (id: string) => api.knowledge.intents.delete(bid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intents', bid] }),
  })
}

// ── Entities ──────────────────────────────────────────────────────────────────
export function useEntities() {
  const bid = botId()
  return useQuery({
    queryKey: ['entities', bid],
    queryFn: withDemoFallback(() => api.knowledge.entities.list(bid).then((r) => r.data), demo.DEMO_ENTITIES),
  })
}

export function useCreateEntity() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (body: Partial<api.Entity>) => api.knowledge.entities.create(bid, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities', bid] }),
  })
}

export function useDeleteEntity() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (id: string) => api.knowledge.entities.delete(bid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities', bid] }),
  })
}

// ── FAQs ──────────────────────────────────────────────────────────────────────
export function useFaqs() {
  const bid = botId()
  return useQuery({
    queryKey: ['faqs', bid],
    queryFn: withDemoFallback(() => api.knowledge.faqs.list(bid).then((r) => r.data), demo.DEMO_FAQS),
  })
}

export function useCreateFaq() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (body: Partial<api.Faq>) => api.knowledge.faqs.create(bid, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faqs', bid] }),
  })
}

export function useDeleteFaq() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (id: string) => api.knowledge.faqs.delete(bid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faqs', bid] }),
  })
}

// ── Sources ───────────────────────────────────────────────────────────────────
export function useSources() {
  const bid = botId()
  return useQuery({
    queryKey: ['sources', bid],
    queryFn: withDemoFallback(() => api.knowledge.sources.list(bid).then((r) => r.data), demo.DEMO_SOURCES),
  })
}

export function useSyncSource() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (sourceId: string) => api.knowledge.sources.sync(bid, sourceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources', bid] }),
  })
}

export function useDeleteSource() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (id: string) => api.knowledge.sources.delete(bid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources', bid] }),
  })
}

// ── Training config ───────────────────────────────────────────────────────────
export function useTraining() {
  const bid = botId()
  return useQuery({
    queryKey: ['training', bid],
    queryFn: withDemoFallback(() => api.knowledge.training.get(bid).then((r) => r.data), demo.DEMO_TRAINING),
  })
}

export function useSaveTraining() {
  const qc = useQueryClient(); const bid = botId()
  return useMutation({
    mutationFn: (config: Partial<api.LlmConfig>) => api.knowledge.training.update(bid, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', bid] }),
  })
}

// ── Conversations ─────────────────────────────────────────────────────────────
export function useConversations(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: withDemoFallback(
      () => api.conversations.list(params).then((r) => r.data),
      demo.DEMO_CONVERSATIONS,
    ),
    refetchInterval: isDemoMode() ? false : 10_000,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: withDemoFallback(
      () => api.conversations.get(id).then((r) => r.data),
      demo.DEMO_CONVERSATIONS.find((c) => c.id === id) ?? demo.DEMO_CONVERSATIONS[0]!,
    ),
    enabled: !!id,
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      api.conversations.messages.send(conversationId, { text }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['conversation', v.conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useAssignConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string | null }) =>
      api.conversations.update(id, { assignedTo }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['conversation', v.id] }),
  })
}

export function useResolveConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.conversations.update(id, { status: 'resolved' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export function useContacts(search?: string) {
  return useQuery({
    queryKey: ['contacts', search],
    queryFn: withDemoFallback(
      () => api.contacts.list(search ? { search } : undefined).then((r) => r.data),
      search
        ? demo.DEMO_CONTACTS.filter((c) =>
            c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase())
          )
        : demo.DEMO_CONTACTS,
    ),
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { displayName: string; email?: string; phone?: string }) =>
      api.contacts.create(body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

// ── Campaigns & Templates ─────────────────────────────────────────────────────
export function useCampaigns() {
  const bid = botId()
  return useQuery({
    queryKey: ['campaigns', bid],
    queryFn: withDemoFallback(() => api.campaigns.list(bid).then((r) => r.data), demo.DEMO_CAMPAIGNS),
  })
}

export function useTemplates(channel?: string) {
  const bid = botId()
  return useQuery({
    queryKey: ['templates', bid, channel],
    queryFn: withDemoFallback(
      () => api.templates.list(bid, channel ? { channel } : undefined).then((r) => r.data),
      channel ? demo.DEMO_TEMPLATES.filter((t) => t.channel === channel) : demo.DEMO_TEMPLATES,
    ),
  })
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: withDemoFallback(() => api.webhooks.list().then((r) => r.data), demo.DEMO_WEBHOOKS),
  })
}

export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { url: string; events: string[]; secret?: string }) =>
      api.webhooks.create(body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.webhooks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => api.webhooks.test(id).then((r) => r.data),
  })
}

// ── Team ──────────────────────────────────────────────────────────────────────
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team'],
    queryFn: withDemoFallback(() => api.team.members().then((r) => r.data), demo.DEMO_TEAM),
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.team.invite(email, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.team.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.team.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export function useAnalyticsOverview() {
  const bid = botId()
  return useQuery({
    queryKey: ['analytics-overview', bid],
    queryFn: withDemoFallback(() => api.analytics.overview(bid).then((r) => r.data), demo.DEMO_ANALYTICS_OVERVIEW),
    staleTime: 60_000,
  })
}

export function useConversationTrends() {
  const bid = botId()
  return useQuery({
    queryKey: ['analytics-trends', bid],
    queryFn: withDemoFallback(() => api.analytics.conversations({ botId: bid }).then((r) => r.data), demo.DEMO_CONVERSATION_TRENDS),
    staleTime: 60_000,
  })
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export function useAuditLog(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: withDemoFallback(() => api.audit.list(params).then((r) => r.data), demo.DEMO_AUDIT),
  })
}

// ── System Status ─────────────────────────────────────────────────────────────
export function useSystemStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: withDemoFallback(() => api.system.status().then((r) => r.data), demo.DEMO_SYSTEM_STATUS),
    staleTime: 0,
    refetchInterval: options?.refetchInterval,
  })
}
