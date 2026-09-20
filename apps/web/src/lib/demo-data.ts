/**
 * Centralised demo/mock data used when the backend is not reachable.
 * These mirror the seed.ts data so the GitHub Pages demo looks realistic.
 */

import type {
  Flow, FlowVersion, Intent, Entity, Faq, KnowledgeSource,
  Conversation, Message, Contact, Campaign, Template,
  Webhook, TeamMember, AnalyticsOverview, ConversationTrend, AuditEvent,
  LlmConfig,
} from './api'

// ── Flows ─────────────────────────────────────────────────────────────────────
const BASE_GRAPH = { nodes: [], edges: [] }

export const DEMO_FLOWS: Flow[] = [
  { id: 'f1', name: 'Welcome & Routing', description: 'Greets visitors and routes to the right flow', kind: 'flow', tags: ['welcome', 'routing'], updatedAt: '2026-09-18T10:00:00Z', versions: [{ id: 'fv1', version: 2, status: 'draft', graph: BASE_GRAPH }] },
  { id: 'f2', name: 'Order Status', description: 'Looks up order details via API', kind: 'flow', tags: ['orders', 'api'], updatedAt: '2026-09-17T14:00:00Z', versions: [{ id: 'fv2', version: 1, status: 'published', graph: BASE_GRAPH, publishedAt: '2026-09-10T09:00:00Z' }] },
  { id: 'f3', name: 'Return Request', description: 'Handles returns and creates tickets', kind: 'flow', tags: ['returns', 'tickets'], updatedAt: '2026-09-15T08:00:00Z', versions: [{ id: 'fv3', version: 1, status: 'published', graph: BASE_GRAPH, publishedAt: '2026-09-12T11:00:00Z' }] },
  { id: 'f4', name: 'Lead Capture', description: 'Qualifies inbound leads and pushes to CRM', kind: 'flow', tags: ['sales', 'crm'], updatedAt: '2026-09-14T16:00:00Z', versions: [{ id: 'fv4', version: 1, status: 'draft', graph: BASE_GRAPH }] },
  { id: 'f5', name: 'CSAT Survey', description: 'Post-conversation satisfaction survey', kind: 'flow', tags: ['csat', 'survey'], updatedAt: '2026-09-13T12:00:00Z', versions: [{ id: 'fv5', version: 1, status: 'published', graph: BASE_GRAPH, publishedAt: '2026-09-08T10:00:00Z' }] },
]

// ── Knowledge ─────────────────────────────────────────────────────────────────
export const DEMO_INTENTS: Intent[] = [
  { id: 'i1', name: 'greeting', description: 'User says hello', utterances: ['hi', 'hello', 'hey there', 'good morning', 'howdy'], responses: [{ text: 'Hello! How can I help?' }] },
  { id: 'i2', name: 'order_status', description: 'Order tracking request', utterances: ['where is my order', 'track my order', 'order status', 'when will my order arrive'], responses: [{ text: "I'll look that up! What's your order number?" }] },
  { id: 'i3', name: 'return_request', description: 'Return or refund request', utterances: ['i want to return', 'return my order', 'refund request', 'send item back'], responses: [{ text: 'I can help with that return!' }] },
  { id: 'i4', name: 'billing_query', description: 'Invoice or payment question', utterances: ['billing question', 'invoice query', 'why was I charged', 'payment issue'], responses: [{ text: 'Let me check your billing details.' }] },
  { id: 'i5', name: 'password_reset', description: 'Login / access issue', utterances: ['forgot password', 'reset password', 'cant log in', 'locked out'], responses: [{ text: "I'll send a password reset link right away." }] },
  { id: 'i6', name: 'escalate_to_agent', description: 'Human handover request', utterances: ['speak to a human', 'talk to agent', 'real person', 'live chat'], responses: [{ text: "Connecting you with an agent now." }] },
  { id: 'i7', name: 'product_info', description: 'Product / pricing questions', utterances: ['product info', 'pricing', 'how does X work', 'demo request'], responses: [{ text: 'Happy to share more details!' }] },
  { id: 'i8', name: 'cancel_subscription', description: 'Cancellation intent', utterances: ['cancel my subscription', 'cancel account', 'stop service', 'unsubscribe'], responses: [{ text: "I'm sorry to hear that. May I ask what prompted this?" }] },
]

export const DEMO_ENTITIES: Entity[] = [
  { id: 'e1', name: 'order_number', kind: 'regex', values: [{ pattern: '^[A-Z]{2}-\\d{6}$', examples: ['AC-123456'] }] },
  { id: 'e2', name: 'product_category', kind: 'list', values: [{ value: 'electronics', synonyms: ['gadgets', 'tech'] }, { value: 'clothing', synonyms: ['apparel', 'fashion'] }] },
  { id: 'e3', name: 'return_reason', kind: 'list', values: [{ value: 'defective', synonyms: ['broken', 'faulty'] }, { value: 'wrong_item', synonyms: ['incorrect'] }, { value: 'changed_mind', synonyms: ['no longer need'] }] },
  { id: 'e4', name: 'subscription_plan', kind: 'list', values: [{ value: 'free' }, { value: 'pro', synonyms: ['premium'] }, { value: 'enterprise', synonyms: ['business'] }] },
  { id: 'e5', name: 'date_reference', kind: 'system', values: [{ type: 'date', examples: ['today', 'tomorrow', 'next week'] }] },
]

export const DEMO_FAQS: Faq[] = [
  { id: 'q1', question: 'What is your return policy?', answer: 'We offer a 30-day hassle-free return policy. Items must be in original condition.', tags: ['returns', 'policy'] },
  { id: 'q2', question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days. Express (1-2 days) available at checkout.', tags: ['shipping', 'delivery'] },
  { id: 'q3', question: 'How do I track my order?', answer: 'Once shipped you\'ll receive a tracking number by email. You can also check My Orders in your account.', tags: ['orders', 'tracking'] },
  { id: 'q4', question: 'Do you offer a free trial?', answer: 'Yes! All plans include a 14-day free trial, no credit card required.', tags: ['trial', 'pricing'] },
  { id: 'q5', question: 'How do I cancel my subscription?', answer: 'Cancel anytime from Account > Billing > Cancel Plan. Active until end of billing cycle.', tags: ['cancel', 'billing'] },
  { id: 'q6', question: 'What payment methods do you accept?', answer: 'Visa, Mastercard, Amex, PayPal, and bank transfer for annual plans.', tags: ['payment', 'billing'] },
  { id: 'q7', question: 'Is my data secure?', answer: 'Yes — SOC 2 Type II certified, GDPR compliant, AES-256 encryption at rest.', tags: ['security', 'privacy'] },
  { id: 'q8', question: 'Do you have a mobile app?', answer: 'iOS and Android apps available for agents. The web widget is fully mobile-responsive.', tags: ['mobile', 'app'] },
]

export const DEMO_SOURCES: KnowledgeSource[] = [
  { id: 's1', name: 'acme.com/help', kind: 'website', config: { url: 'https://acme.com/help', depth: 3 }, lastSyncAt: new Date(Date.now() - 2 * 3600_000).toISOString(), documents: [{ id: 'd1', status: 'indexed' }, { id: 'd2', status: 'indexed' }, { id: 'd3', status: 'indexed' }] },
  { id: 's2', name: 'Product Manual v3.pdf', kind: 'file', config: { filename: 'product-manual-v3.pdf', size_bytes: 2_450_000 }, lastSyncAt: new Date(Date.now() - 24 * 3600_000).toISOString(), documents: [{ id: 'd4', status: 'indexed' }] },
]

export const DEMO_TRAINING: LlmConfig = {
  model: 'gpt-4o', temperature: 0.3, maxTokens: 2048,
  systemPrompt: 'You are a helpful support assistant for Acme Corp. Be concise, friendly, and professional.',
}

// ── Conversations ─────────────────────────────────────────────────────────────
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', status: 'active', assignedTo: 'sarah',
    contact: { id: 'ct1', displayName: 'Alice Johnson', email: 'alice@example.com', phone: '+44 7700 100001', metadata: { company: 'Startup Ltd', vip: true }, createdAt: ago(120) },
    channel: { id: 'ch1', name: 'Web Widget', kind: 'web' },
    messages: [
      { id: 'm1', direction: 'inbound', authorKind: 'user', content: { text: "Hi, I placed an order last Tuesday but haven't received any shipping update." }, createdAt: ago(12) },
      { id: 'm2', direction: 'outbound', authorKind: 'bot', content: { text: "Hi Alice! I'd be happy to look into that. Could you share your order number?" }, createdAt: ago(11) },
      { id: 'm3', direction: 'inbound', authorKind: 'user', content: { text: 'Sure, it\'s AC-483920' }, createdAt: ago(10) },
      { id: 'm4', direction: 'outbound', authorKind: 'bot', content: { text: 'Thanks! Your order AC-483920 is with DPD — estimated delivery tomorrow 9am–6pm.' }, createdAt: ago(10) },
      { id: 'm5', direction: 'inbound', authorKind: 'user', content: { text: 'Yes please, that would be great!' }, createdAt: ago(8) },
      { id: 'm6', direction: 'outbound', authorKind: 'agent', content: { text: "Hi Alice, this is Sarah. I've sent the full tracking link to your email. Let me know if you need anything else!" }, createdAt: ago(5) },
    ],
    labels: [{ label: { id: 'l2', name: 'vip', color: '#f59e0b' } }],
    updatedAt: ago(5),
  },
  {
    id: 'c2', status: 'active', assignedTo: undefined,
    contact: { id: 'ct2', displayName: 'Bob Smith', email: 'bob@example.com', metadata: { company: 'Tech Inc' }, createdAt: ago(200) },
    channel: { id: 'ch1', name: 'Web Widget', kind: 'web' },
    messages: [
      { id: 'm7', direction: 'inbound', authorKind: 'user', content: { text: 'I want to return a product I received yesterday' }, createdAt: ago(8) },
      { id: 'm8', direction: 'outbound', authorKind: 'bot', content: { text: 'I can help! Could you share your order number and reason for the return?' }, createdAt: ago(7) },
      { id: 'm9', direction: 'inbound', authorKind: 'user', content: { text: 'Order AC-512311 — it arrived damaged' }, createdAt: ago(6) },
    ],
    labels: [{ label: { id: 'l1', name: 'urgent', color: '#ef4444' } }],
    updatedAt: ago(6),
  },
  {
    id: 'c3', status: 'active', assignedTo: 'mike',
    contact: { id: 'ct3', displayName: 'Carol White', email: 'carol@example.com', phone: '+44 7700 100003', metadata: { company: 'Enterprise Co', vip: true }, createdAt: ago(300) },
    channel: { id: 'ch2', name: 'WhatsApp Business', kind: 'whatsapp' },
    messages: [
      { id: 'm10', direction: 'inbound', authorKind: 'user', content: { text: 'Hello I have a billing question about my invoice this month' }, createdAt: ago(24) },
      { id: 'm11', direction: 'outbound', authorKind: 'agent', content: { text: 'Hi Carol! What would you like to know?' }, createdAt: ago(23) },
      { id: 'm12', direction: 'inbound', authorKind: 'user', content: { text: "There's an extra £49 charge I don't recognise" }, createdAt: ago(22) },
    ],
    labels: [{ label: { id: 'l3', name: 'billing', color: '#6366f1' } }],
    updatedAt: ago(22),
  },
  {
    id: 'c4', status: 'resolved', assignedTo: 'anna',
    contact: { id: 'ct4', displayName: 'David Lee', email: 'david@example.com', metadata: {}, createdAt: ago(400) },
    channel: { id: 'ch3', name: 'Email', kind: 'email' },
    messages: [
      { id: 'm13', direction: 'inbound', authorKind: 'user', content: { text: "Hi, I forgot my password and can't log in" }, createdAt: ago(60) },
      { id: 'm14', direction: 'outbound', authorKind: 'bot', content: { text: "No problem! I've sent a reset link to your email." }, createdAt: ago(59) },
      { id: 'm15', direction: 'inbound', authorKind: 'user', content: { text: 'Got it, thank you!' }, createdAt: ago(55) },
    ],
    labels: [],
    updatedAt: ago(55),
  },
  {
    id: 'c5', status: 'escalated', assignedTo: undefined,
    contact: { id: 'ct5', displayName: 'Eve Brown', email: 'eve@example.com', metadata: {}, createdAt: ago(500) },
    channel: { id: 'ch1', name: 'Web Widget', kind: 'web' },
    messages: [
      { id: 'm16', direction: 'inbound', authorKind: 'user', content: { text: 'I need to speak to a manager immediately' }, createdAt: ago(74) },
      { id: 'm17', direction: 'outbound', authorKind: 'bot', content: { text: 'I understand. Escalating to our supervisor team right away.' }, createdAt: ago(73) },
    ],
    labels: [{ label: { id: 'l1', name: 'urgent', color: '#ef4444' } }],
    updatedAt: ago(73),
  },
]

// ── Contacts ──────────────────────────────────────────────────────────────────
export const DEMO_CONTACTS: Contact[] = [
  { id: 'ct1', displayName: 'Alice Johnson', email: 'alice@example.com', phone: '+44 7700 100001', metadata: { company: 'Startup Ltd', plan: 'pro', vip: true }, createdAt: ago(120 * 60) },
  { id: 'ct2', displayName: 'Bob Smith', email: 'bob@example.com', phone: '+44 7700 100002', metadata: { company: 'Tech Inc', plan: 'free' }, createdAt: ago(200 * 60) },
  { id: 'ct3', displayName: 'Carol White', email: 'carol@example.com', phone: '+44 7700 100003', metadata: { company: 'Enterprise Co', plan: 'enterprise', vip: true }, createdAt: ago(300 * 60) },
  { id: 'ct4', displayName: 'David Lee', email: 'david@example.com', metadata: { company: 'SME Ltd', plan: 'free' }, createdAt: ago(400 * 60) },
  { id: 'ct5', displayName: 'Eve Brown', email: 'eve@example.com', phone: '+44 7700 100005', metadata: { company: 'Agency Now', plan: 'pro' }, createdAt: ago(500 * 60) },
  { id: 'ct6', displayName: 'Frank Wilson', email: 'frank@example.com', metadata: { company: 'Retail Co', plan: 'pro', vip: true }, createdAt: ago(600 * 60) },
]

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 'camp1', name: 'September Newsletter', status: 'completed', direction: 'outbound', sentAt: new Date(Date.now() - 3 * 86400_000).toISOString() },
  { id: 'camp2', name: 'Abandoned Cart Recovery', status: 'running', direction: 'outbound' },
  { id: 'camp3', name: 'Q4 Product Launch', status: 'scheduled', direction: 'outbound', scheduledAt: new Date(Date.now() + 10 * 86400_000).toISOString() },
  { id: 'camp4', name: 'Win-back: 90-day inactive', status: 'draft', direction: 'outbound' },
]

// ── Templates ─────────────────────────────────────────────────────────────────
export const DEMO_TEMPLATES: Template[] = [
  { id: 't1', name: 'Order Confirmation', channel: 'whatsapp', approvalStatus: 'approved', content: { body: 'Hi {{1}}, your order {{2}} is confirmed! Delivery: {{3}}.' }, variables: ['customer_name', 'order_number', 'delivery_date'] },
  { id: 't2', name: 'Shipping Update', channel: 'whatsapp', approvalStatus: 'approved', content: { body: 'Order {{1}} is on its way! Tracking: {{2}}. ETA: {{3}}.' }, variables: ['order_number', 'tracking_url', 'eta'] },
  { id: 't3', name: 'Return Confirmation', channel: 'whatsapp', approvalStatus: 'pending', content: { body: 'Hi {{1}}, your return for order {{2}} received. Refund of {{3}} in 3-5 days.' }, variables: ['customer_name', 'order_number', 'refund_amount'] },
  { id: 't4', name: 'Welcome Email', channel: 'email', approvalStatus: 'approved', content: { subject: 'Welcome to Acme!', body: 'Hi {{first_name}}, welcome aboard!' }, variables: ['first_name'] },
  { id: 't5', name: 'Cart Abandonment', channel: 'sms', approvalStatus: 'approved', content: { body: 'Hi {{1}}, you left items in your cart! Complete: {{2}}' }, variables: ['first_name', 'cart_url'] },
]

// ── Webhooks ──────────────────────────────────────────────────────────────────
export const DEMO_WEBHOOKS: Webhook[] = [
  { id: 'wh1', url: 'https://hooks.zapier.com/hooks/catch/12345/abc', events: ['conversation.created', 'message.received', 'conversation.resolved'], isActive: true, createdAt: ago(5000 * 60) },
  { id: 'wh2', url: 'https://api.hubspot.com/webhooks/v3/receive', events: ['contact.created', 'conversation.created'], isActive: true, createdAt: ago(3000 * 60) },
  { id: 'wh3', url: 'https://n8n.acme.io/webhook/ybot-tickets', events: ['ticket.created', 'ticket.updated'], isActive: false, createdAt: ago(1000 * 60) },
]

// ── Team ──────────────────────────────────────────────────────────────────────
export const DEMO_TEAM: TeamMember[] = [
  { id: 'u1', displayName: 'Charles', email: 'charles@acme.com', memberships: [{ role: 'ADMIN' }], agentProfile: { status: 'online' } },
  { id: 'u2', displayName: 'Sarah K', email: 'sarah@acme.com', memberships: [{ role: 'SUPERVISOR' }], agentProfile: { status: 'online' } },
  { id: 'u3', displayName: 'Mike R', email: 'mike@acme.com', memberships: [{ role: 'AGENT' }], agentProfile: { status: 'online' } },
  { id: 'u4', displayName: 'Tom B', email: 'tom@acme.com', memberships: [{ role: 'AGENT' }], agentProfile: { status: 'away' } },
  { id: 'u5', displayName: 'Anna W', email: 'anna@acme.com', memberships: [{ role: 'AGENT' }], agentProfile: { status: 'online' } },
  { id: 'u6', displayName: 'James O', email: 'james@acme.com', memberships: [{ role: 'AGENT' }], agentProfile: { status: 'offline' } },
]

// ── Analytics ─────────────────────────────────────────────────────────────────
export const DEMO_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  totalConversations: 851, resolvedConversations: 777, resolutionRate: 91.4,
  escalationRate: 9.1, totalContacts: 1247, csatScore: 84.5,
  avgResponseTimeMs: 1400, botHandledPct: 64,
}

export const DEMO_CONVERSATION_TRENDS: ConversationTrend[] = [
  { date: 'Sep 14', conversations: 120, resolved: 98, escalated: 22 },
  { date: 'Sep 15', conversations: 145, resolved: 118, escalated: 27 },
  { date: 'Sep 16', conversations: 98, resolved: 82, escalated: 16 },
  { date: 'Sep 17', conversations: 160, resolved: 140, escalated: 20 },
  { date: 'Sep 18', conversations: 175, resolved: 155, escalated: 20 },
  { date: 'Sep 19', conversations: 88, resolved: 76, escalated: 12 },
  { date: 'Sep 20', conversations: 65, resolved: 58, escalated: 7 },
]

export const DEMO_AUDIT: AuditEvent[] = [
  { id: 'a1', action: 'bot.published', resource: 'bot', metadata: { env: 'production' }, createdAt: ago(10), user: { displayName: 'Charles', email: 'charles@acme.com' } },
  { id: 'a2', action: 'flow.updated', resource: 'flow', metadata: { nodes_changed: 3 }, createdAt: ago(30), user: { displayName: 'Sarah K', email: 'sarah@acme.com' } },
  { id: 'a3', action: 'template.approved', resource: 'template', metadata: { channel: 'whatsapp' }, createdAt: ago(60), user: { displayName: 'Charles', email: 'charles@acme.com' } },
  { id: 'a4', action: 'user.invited', resource: 'user', metadata: { role: 'AGENT' }, createdAt: ago(90), user: { displayName: 'Charles', email: 'charles@acme.com' } },
  { id: 'a5', action: 'user.login', resource: 'session', metadata: { ip: '10.0.0.55' }, createdAt: ago(120), user: { displayName: 'Mike R', email: 'mike@acme.com' } },
  { id: 'a6', action: 'webhook.created', resource: 'webhook', metadata: { url: 'https://hooks.zapier.com/…' }, createdAt: ago(240), user: { displayName: 'Charles', email: 'charles@acme.com' } },
  { id: 'a7', action: 'api_key.created', resource: 'api_key', metadata: { name: 'API key #1' }, createdAt: ago(360), user: { displayName: 'Charles', email: 'charles@acme.com' } },
  { id: 'a8', action: 'knowledge.synced', resource: 'knowledge_source', metadata: { pages: 284, chunks: 1204 }, createdAt: ago(480), user: { displayName: 'Anna W', email: 'anna@acme.com' } },
]
