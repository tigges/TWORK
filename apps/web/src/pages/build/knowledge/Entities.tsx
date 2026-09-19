import React, { useState } from 'react'
import { Tag, Plus, Trash2, ChevronRight, Search, X, CheckCircle, Save } from 'lucide-react'
import { Button, Input, Badge, EmptyState } from '@ybot/ui'
import { cn } from '@ybot/ui'
import { SubNav } from '../../../components/SubNav'

const SUBNAV = [
  { label: 'Intents', path: '/build/knowledge/intents' },
  { label: 'Entities', path: '/build/knowledge/entities' },
  { label: 'FAQs', path: '/build/knowledge/faqs' },
  { label: 'Sources', path: '/build/knowledge/sources' },
  { label: 'Training', path: '/build/knowledge/training' },
]

interface EntityValue { value: string; synonyms: string[] }
interface Entity { id: string; name: string; kind: 'list' | 'regex' | 'composite'; values: EntityValue[] }

const MOCK_ENTITIES: Entity[] = [
  {
    id: '1',
    name: 'product_category',
    kind: 'list',
    values: [
      { value: 'electronics', synonyms: ['tech', 'gadgets', 'devices'] },
      { value: 'clothing', synonyms: ['apparel', 'fashion', 'clothes', 'wear'] },
      { value: 'food', synonyms: ['groceries', 'meals', 'snacks'] },
    ],
  },
  {
    id: '2',
    name: 'order_status',
    kind: 'list',
    values: [
      { value: 'pending', synonyms: [] },
      { value: 'shipped', synonyms: ['dispatched', 'en route'] },
      { value: 'delivered', synonyms: ['arrived', 'received'] },
      { value: 'cancelled', synonyms: ['canceled', 'void'] },
    ],
  },
  {
    id: '3',
    name: 'email_address',
    kind: 'regex',
    values: [{ value: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', synonyms: [] }],
  },
]

export function EntitiesPage() {
  const [entities, setEntities] = useState(MOCK_ENTITIES)
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const [query, setQuery] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saved, setSaved] = useState(false)

  const filtered = entities.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
  const selected = entities.find((e) => e.id === selectedId)

  function updateSelected(updates: Partial<Entity>) {
    setEntities((es) => es.map((e) => e.id === selectedId ? { ...e, ...updates } : e))
  }

  function addValue() {
    if (!newValue.trim() || !selected) return
    updateSelected({ values: [...selected.values, { value: newValue.trim(), synonyms: [] }] })
    setNewValue('')
  }

  function removeValue(idx: number) {
    if (!selected) return
    updateSelected({ values: selected.values.filter((_, i) => i !== idx) })
  }

  function addSynonym(valIdx: number, syn: string) {
    if (!selected || !syn.trim()) return
    const vals = selected.values.map((v, i) =>
      i === valIdx ? { ...v, synonyms: [...v.synonyms, syn.trim()] } : v
    )
    updateSelected({ values: vals })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 pt-4 pb-0">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Knowledge</h1>
          <Button size="sm">
            <Plus size={13} /> New Entity
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Entity list */}
        <div className="flex w-[240px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="p-3 border-b border-[var(--border)]">
            <Input placeholder="Search…" leftIcon={<Search size={13} />} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
            {filtered.map((entity) => (
              <button
                key={entity.id}
                onClick={() => setSelectedId(entity.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  selectedId === entity.id ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                <Tag size={13} className="text-[var(--text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entity.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="muted">{entity.kind}</Badge>
                    <span className="text-xs text-[var(--text-muted)]">{entity.values.length} values</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Entity editor */}
        {selected ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{selected.name}</h2>
                <div className="flex gap-2 mt-1">
                  <Badge variant="info">{selected.kind}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">{selected.values.length} values</span>
                </div>
              </div>
              <Button size="sm" onClick={() => setSaved(true)}>
                {saved ? <><CheckCircle size={13} /> Saved</> : <><Save size={13} /> Save</>}
              </Button>
            </div>

            <div className="space-y-3">
              {selected.values.map((val, i) => (
                <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{val.value}</span>
                    <button onClick={() => removeValue(i)} className="text-[var(--text-muted)] hover:text-[var(--error)]">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {val.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {val.synonyms.map((s, j) => (
                        <span key={j} className="text-[10px] rounded-full bg-[var(--bg-overlay)] border border-[var(--border)] px-2 py-0.5 text-[var(--text-muted)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="Add a value…"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addValue()}
                  className="flex-1"
                />
                <Button variant="secondary" size="md" onClick={addValue} disabled={!newValue.trim()}>Add</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<Tag size={20} />} title="Select an entity" />
          </div>
        )}
      </div>
    </div>
  )
}
