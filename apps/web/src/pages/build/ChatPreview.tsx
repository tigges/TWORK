/**
 * ChatPreview — floating chatbot widget for conversational test runs.
 *
 * Accessible from Build > Test (or the "Preview" button on any flow/bot).
 * Talks to POST /bots/:botId/preview-chat (streaming SSE).
 * Maintains local conversation history so Claude has context.
 */
import React, { useState, useRef, useEffect } from 'react'
import {
  Send, X, RotateCcw, Bot, User, Loader2,
  MessageSquare, ChevronDown, Settings2, BookOpen,
} from 'lucide-react'
import { Button } from '@ybot/ui'
import { cn } from '@ybot/ui'
import { useAppStore } from '../../store/app'
import { bots as botsApi } from '../../lib/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  streaming?: boolean
  sources?: number
}

interface ChatPreviewProps {
  /** When true the widget renders inline (full page) instead of as a popup. */
  inline?: boolean
  /** Override bot ID to preview a specific bot. */
  botId?: string
  /** Override system prompt for testing. */
  systemPrompt?: string
}

let msgIdCounter = 0
function nextId() { return `msg_${++msgIdCounter}` }

export function ChatPreview({ inline = false, botId: propBotId, systemPrompt }: ChatPreviewProps) {
  const storeBotId = useAppStore((s) => s.selectedBotId)
  const bots = useAppStore((s) => s.bots)
  const activeBotId = propBotId ?? storeBotId ?? ''
  const activeBot = bots.find((b) => b.id === activeBotId)

  const [open, setOpen] = useState(inline)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', text: `Hi! I'm ${activeBot?.name ?? 'YBot'}. How can I help you today?` },
  ])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingId, setStreamingId] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [customSystemPrompt, setCustomSystemPrompt] = useState(systemPrompt ?? '')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function reset() {
    setMessages([
      { id: nextId(), role: 'assistant', text: `Hi! I'm ${activeBot?.name ?? 'YBot'}. How can I help you today?` },
    ])
    setInput('')
    setIsStreaming(false)
  }

  async function send() {
    const text = input.trim()
    if (!text || isStreaming || !activeBotId) return
    setInput('')

    const userMsgId = nextId()
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }])

    const botMsgId = nextId()
    setStreamingId(botMsgId)
    setIsStreaming(true)
    setMessages((prev) => [...prev, { id: botMsgId, role: 'assistant', text: '', streaming: true }])

    // Build history for Claude context (exclude the placeholder we just added)
    const history = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.text }))

    try {
      let fullText = ''
      let finalSources = 0

      await botsApi.previewChat(
        activeBotId,
        text,
        history,
        (chunk) => {
          fullText += chunk
          setMessages((prev) =>
            prev.map((m) => m.id === botMsgId ? { ...m, text: fullText } : m)
          )
        },
        customSystemPrompt || undefined,
      ).then((result) => {
        finalSources = result.sources ?? 0
      })

      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId ? { ...m, text: fullText || "I couldn't find an answer.", streaming: false, sources: finalSources } : m
        )
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, text: "I'm sorry, I'm having trouble connecting. Please check that the API is running.", streaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      setStreamingId('')
    }
  }

  const widget = (
    <div
      className={cn(
        'flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-lg)]',
        inline ? 'w-full h-full' : 'w-[380px] h-[600px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--accent)] text-white shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none">{activeBot?.name ?? 'YBot'}</p>
          <p className="text-[11px] text-white/70 mt-0.5">
            {isStreaming ? (
              <span className="flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> thinking…</span>
            ) : (
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-300" /> online</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            title="Settings"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw size={14} />
          </button>
          {!inline && (
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded hover:bg-white/20 transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 shrink-0">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1.5">
            <Settings2 size={10} /> System Prompt Override
          </p>
          <textarea
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
            rows={3}
            placeholder="Override the system prompt for this test session…"
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'user'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/20'
            )}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={cn('max-w-[80%]', msg.role === 'user' && 'items-end flex flex-col')}>
              <div className={cn(
                'rounded-[var(--radius-md)] px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]',
              )}>
                {msg.streaming && !msg.text ? (
                  <span className="flex gap-0.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                  </span>
                ) : (
                  msg.text
                )}
              </div>
              {msg.sources !== undefined && msg.sources > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <BookOpen size={9} /> {msg.sources} knowledge source{msg.sources !== 1 ? 's' : ''} used
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-3 py-2.5 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 min-h-[38px] max-h-[100px]"
            placeholder={activeBotId ? 'Type a message…' : 'Select a bot to start chatting'}
            value={input}
            disabled={!activeBotId || isStreaming}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button
            size="sm"
            disabled={!input.trim() || isStreaming || !activeBotId}
            onClick={send}
            className="shrink-0 h-9 w-9 p-0 flex items-center justify-center"
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--text-muted)] text-center">
          Powered by Claude · Knowledge base search enabled
        </p>
      </div>
    </div>
  )

  if (inline) return widget

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow-lg)] flex items-center justify-center hover:bg-[var(--accent-hover,#4f46e5)] transition-all hover:scale-110 z-50"
          title="Open chat preview"
        >
          <MessageSquare size={22} />
        </button>
      )}

      {/* Floating widget */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50">
          {widget}
        </div>
      )}
    </>
  )
}

/** Full-page inline version for the Build > Preview tab */
export function ChatPreviewPage() {
  const bots = useAppStore((s) => s.bots)
  const selectedBotId = useAppStore((s) => s.selectedBotId)
  const [customPrompt, setCustomPrompt] = useState('')

  if (!selectedBotId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Select a bot to start a preview test run.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Config panel */}
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] p-4 overflow-y-auto flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Test Run Settings</p>
          <p className="text-[11px] text-[var(--text-muted)]">Configure how Claude responds in this preview session.</p>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase mb-1.5 block">Bot</label>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)]">
            {bots.find((b) => b.id === selectedBotId)?.name ?? 'Unknown'}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase mb-1.5 block">System Prompt Override</label>
          <textarea
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
            rows={6}
            placeholder="Leave blank to use the bot's configured prompt…"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] p-3">
          <p className="text-[11px] font-medium text-[var(--text-muted)] mb-2 uppercase flex items-center gap-1.5">
            <BookOpen size={10} /> How it works
          </p>
          <ul className="text-[11px] text-[var(--text-muted)] space-y-1.5">
            <li>1. Your message is embedded (or full-text searched)</li>
            <li>2. Top matching knowledge chunks are retrieved</li>
            <li>3. Claude answers using the knowledge + system prompt</li>
            <li>4. Response streams back token-by-token</li>
          </ul>
        </div>
      </div>

      {/* Widget */}
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-base)] p-8">
        <ChatPreview inline botId={selectedBotId} systemPrompt={customPrompt || undefined} />
      </div>
    </div>
  )
}
