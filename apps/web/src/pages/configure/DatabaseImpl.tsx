import React, { useState } from 'react'
import {
  Database, Plus, Table2, ChevronRight, MoreHorizontal,
  Key, Hash, Type, AlignLeft, List, Calendar,
  Search, Filter, Download, Pencil, Trash2,
} from 'lucide-react'
import { Badge, Button, Input } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Channels', path: '/configure/channels' },
  { label: 'Integrations', path: '/configure/integrations' },
  { label: 'Database', path: '/configure/database' },
  { label: 'Webhooks', path: '/configure/webhooks' },
]

type ColumnType = 'pk' | 'text' | 'number' | 'boolean' | 'date' | 'enum' | 'json'

interface Column { name: string; type: ColumnType; nullable: boolean; default?: string }
interface Table { id: string; name: string; rows: number; columns: Column[]; updatedAt: string }

const TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  pk:      <Key size={11} className="text-[var(--warning,#fbbf24)]" />,
  text:    <Type size={11} className="text-[var(--accent)]" />,
  number:  <Hash size={11} className="text-[var(--success)]" />,
  boolean: <List size={11} className="text-[var(--info,#06b6d4)]" />,
  date:    <Calendar size={11} className="text-[var(--text-muted)]" />,
  enum:    <AlignLeft size={11} className="text-[var(--text-muted)]" />,
  json:    <AlignLeft size={11} className="text-[var(--text-muted)]" />,
}

const MOCK_TABLES: Table[] = [
  {
    id: 'customers', name: 'customers', rows: 1_842, updatedAt: '2h ago',
    columns: [
      { name: 'id', type: 'pk', nullable: false },
      { name: 'name', type: 'text', nullable: false },
      { name: 'email', type: 'text', nullable: false },
      { name: 'plan', type: 'enum', nullable: false, default: 'free' },
      { name: 'created_at', type: 'date', nullable: false },
    ],
  },
  {
    id: 'orders', name: 'orders', rows: 5_216, updatedAt: '5m ago',
    columns: [
      { name: 'id', type: 'pk', nullable: false },
      { name: 'customer_id', type: 'number', nullable: false },
      { name: 'total', type: 'number', nullable: false },
      { name: 'status', type: 'enum', nullable: false, default: 'pending' },
      { name: 'placed_at', type: 'date', nullable: false },
      { name: 'metadata', type: 'json', nullable: true },
    ],
  },
  {
    id: 'products', name: 'products', rows: 423, updatedAt: '3d ago',
    columns: [
      { name: 'id', type: 'pk', nullable: false },
      { name: 'name', type: 'text', nullable: false },
      { name: 'sku', type: 'text', nullable: false },
      { name: 'price', type: 'number', nullable: false },
      { name: 'in_stock', type: 'boolean', nullable: false, default: 'true' },
    ],
  },
  {
    id: 'promo_codes', name: 'promo_codes', rows: 48, updatedAt: '1w ago',
    columns: [
      { name: 'id', type: 'pk', nullable: false },
      { name: 'code', type: 'text', nullable: false },
      { name: 'discount_pct', type: 'number', nullable: false },
      { name: 'expires_at', type: 'date', nullable: true },
    ],
  },
]

const MOCK_RECORDS: Record<string, Record<string, string>[]> = {
  customers: [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', plan: 'pro', created_at: '2026-01-15' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', plan: 'free', created_at: '2026-02-20' },
    { id: '3', name: 'Carol White', email: 'carol@example.com', plan: 'enterprise', created_at: '2026-03-01' },
    { id: '4', name: 'David Lee', email: 'david@example.com', plan: 'free', created_at: '2026-04-12' },
    { id: '5', name: 'Eve Brown', email: 'eve@example.com', plan: 'pro', created_at: '2026-05-22' },
  ],
  orders: [
    { id: '1001', customer_id: '1', total: '£149.99', status: 'delivered', placed_at: '2026-08-01', metadata: '{}' },
    { id: '1002', customer_id: '2', total: '£29.99', status: 'pending', placed_at: '2026-09-15', metadata: '{}' },
    { id: '1003', customer_id: '1', total: '£299.00', status: 'refunded', placed_at: '2026-09-18', metadata: '{}' },
  ],
  products: [
    { id: '1', name: 'Starter Pack', sku: 'PKG-001', price: '£29.99', in_stock: 'true' },
    { id: '2', name: 'Pro Bundle', sku: 'PKG-002', price: '£149.99', in_stock: 'true' },
    { id: '3', name: 'Enterprise Suite', sku: 'PKG-003', price: '£499.00', in_stock: 'false' },
  ],
  promo_codes: [
    { id: '1', code: 'SAVE20', discount_pct: '20', expires_at: '2026-12-31' },
    { id: '2', code: 'WELCOME10', discount_pct: '10', expires_at: '—' },
  ],
}

export function DatabasePage() {
  const [tables] = useState<Table[]>(MOCK_TABLES)
  const [activeTable, setActiveTable] = useState<Table>(MOCK_TABLES[0]!)
  const [view, setView] = useState<'schema' | 'records'>('records')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTableName, setNewTableName] = useState('')

  const records = (MOCK_RECORDS[activeTable.id] ?? []).filter((r) =>
    !search || Object.values(r).some((v) => v.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Configure</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Create Table
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tables list sidebar */}
        <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto flex flex-col">
          <div className="p-3 border-b border-[var(--border)]">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Tables ({tables.length})</p>
          </div>
          <div className="flex-1 py-1">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTable(t)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors',
                  activeTable.id === t.id ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                <Table2 size={13} className={activeTable.id === t.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate font-mono">{t.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t.rows.toLocaleString()} rows</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Database size={14} className="text-[var(--accent)] shrink-0" />
              <span className="text-sm font-semibold text-[var(--text-primary)] font-mono truncate">{activeTable.name}</span>
              <Badge variant="muted">{activeTable.rows.toLocaleString()} rows</Badge>
            </div>
            <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden ml-auto">
              {(['records', 'schema'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('px-3 py-1 text-xs font-medium capitalize transition-colors', view === v ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]')}
                >
                  {v}
                </button>
              ))}
            </div>
            {view === 'records' && (
              <Input placeholder="Search records…" leftIcon={<Search size={12} />} value={search} onChange={(e) => setSearch(e.target.value)} className="w-52" />
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0"><Download size={13} /> Export</Button>
          </div>

          {/* Schema view */}
          {view === 'schema' ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl space-y-1">
                <div className="grid grid-cols-4 px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border)]">
                  <span>Column</span><span>Type</span><span>Nullable</span><span>Default</span>
                </div>
                {activeTable.columns.map((col) => (
                  <div key={col.name} className="grid grid-cols-4 px-3 py-2.5 text-sm rounded hover:bg-[var(--bg-hover)] items-center">
                    <span className="flex items-center gap-2 font-mono text-[var(--text-primary)] text-xs">
                      {TYPE_ICONS[col.type]} {col.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">{col.type}</span>
                    <span className="text-xs text-[var(--text-muted)]">{col.nullable ? 'yes' : 'no'}</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">{col.default ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Records view */
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)] z-10">
                  <tr>
                    {activeTable.columns.map((col) => (
                      <th key={col.name} className="px-4 py-2.5 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">
                        <span className="flex items-center gap-1.5">{TYPE_ICONS[col.type]} <span className="font-mono">{col.name}</span></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors">
                      {activeTable.columns.map((col) => (
                        <td key={col.name} className="px-4 py-2.5 font-mono text-[var(--text-secondary)] whitespace-nowrap max-w-xs truncate">
                          {r[col.name] ?? <span className="text-[var(--text-muted)] italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={activeTable.columns.length} className="px-4 py-12 text-center text-[var(--text-muted)]">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Create table</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Table name *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="e.g. loyalty_points"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">An <code className="font-mono bg-[var(--bg-overlay)] px-1 rounded">id</code> primary key column will be created automatically.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newTableName.trim()} onClick={() => setShowNew(false)}>Create table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
