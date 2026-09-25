import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Mail, Trash2, UserPlus, Users } from 'lucide-react'
import { useSidebarOpen } from '../components/Shell.js'
import { trpc } from '../trpc.js'

type Contact = {
  id:    string
  name:  string
  email: string
  phone: string | null
  notes: string | null
}

export function ContactsPage() {
  const sidebarOpen = useSidebarOpen()
  const utils = trpc.useUtils()
  const list = trpc.contacts.list.useQuery({})
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (list.data ?? []).filter(row =>
      !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
    )
  }, [list.data, query])

  const selected = shown.find(row => row.id === selectedId) ?? (!creating ? shown[0] : undefined)

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[340px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <header className={['flex items-center justify-between gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-4' : 'pl-14 pr-4'].join(' ')}>
          <h1 className="text-sm font-semibold">Contacts</h1>
          <button
            type="button"
            onClick={() => { setCreating(true); setSelectedId(null) }}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <UserPlus size={14} />
            New
          </button>
        </header>
        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-md bg-zinc-100 px-2.5 py-1.5 text-sm outline-none dark:bg-zinc-800"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {list.isLoading && <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>}
          {!list.isLoading && shown.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto mb-3 text-zinc-300" size={28} />
              <p className="text-sm font-medium">No contacts yet</p>
              <p className="mt-1 text-xs text-zinc-500">Add someone you write to often.</p>
            </div>
          )}
          {shown.map(row => (
            <button
              key={row.id}
              type="button"
              onClick={() => { setCreating(false); setSelectedId(row.id) }}
              className={[
                'block w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-zinc-800',
                row.id === selected?.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
              ].join(' ')}
            >
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="truncate text-xs text-zinc-500">{row.email}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-auto">
        {creating && (
          <ContactForm
            title="New contact"
            onCancel={() => setCreating(false)}
            onSaved={async id => {
              setCreating(false)
              setSelectedId(id)
              await utils.contacts.list.invalidate()
            }}
          />
        )}
        {!creating && selected && (
          <ContactForm
            key={selected.id}
            title="Edit contact"
            contact={selected}
            onSaved={async () => { await utils.contacts.list.invalidate() }}
            onDeleted={async () => {
              setSelectedId(null)
              await utils.contacts.list.invalidate()
            }}
          />
        )}
        {!creating && !selected && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Select a contact
          </div>
        )}
      </section>
    </div>
  )
}

function ContactForm({
  title,
  contact,
  onCancel,
  onSaved,
  onDeleted,
}: {
  title:     string
  contact?:  Contact
  onCancel?: () => void
  onSaved:   (id: string) => Promise<void>
  onDeleted?: () => Promise<void>
}) {
  const create = trpc.contacts.create.useMutation()
  const update = trpc.contacts.update.useMutation()
  const remove = trpc.contacts.remove.useMutation()
  const [name, setName] = useState(contact?.name ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const error = create.error ?? update.error ?? remove.error

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const input = {
      name,
      email,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }
    if (contact) {
      await update.mutateAsync({ id: contact.id, ...input })
      await onSaved(contact.id)
    } else {
      const created = await create.mutateAsync(input)
      await onSaved(created.id)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg px-8 py-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <label className="mt-6 block text-xs font-medium text-zinc-500">
        Name
        <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
      </label>
      <label className="mt-4 block text-xs font-medium text-zinc-500">
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} required type="email" className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
      </label>
      <label className="mt-4 block text-xs font-medium text-zinc-500">
        Phone
        <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
      </label>
      <label className="mt-4 block text-xs font-medium text-zinc-500">
        Notes
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
      </label>
      {error && <p className="mt-3 text-xs text-red-600">{error.message}</p>}
      <div className="mt-6 flex items-center justify-between">
        {contact && onDeleted ? (
          <div className="flex items-center gap-4">
            <Link
              to="/mail"
              search={{ to: contact.email }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-600"
            >
              <Mail size={14} />
              Write
            </Link>
            <button
              type="button"
              onClick={async () => { await remove.mutateAsync({ id: contact.id }); await onDeleted() }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-600"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        ) : <span />}
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
