import { useEffect, useRef, useState } from 'react'
import { trpc } from '../trpc.js'

export function ShareField({
  type,
  id,
  excludeId,
}: {
  type:      'file' | 'contact'
  id:        string
  excludeId?: string
}) {
  const utils = trpc.useUtils()
  const list = trpc.share.list.useQuery({ type, id })
  const people = trpc.contacts.list.useQuery({})
  const setShare = trpc.share.set.useMutation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const chosen = list.data ?? []
  const options = (people.data ?? []).filter(person => person.mine && person.id !== excludeId)

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  async function toggle(contactId: string) {
    if (!list.data || setShare.isPending) return
    const contactIds = chosen.some(person => person.id === contactId)
      ? chosen.filter(person => person.id !== contactId).map(person => person.id)
      : [...chosen.map(person => person.id), contactId]
    await setShare.mutateAsync({ type, id, contactIds })
    await utils.share.list.invalidate({ type, id })
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="inline-flex items-center text-xs text-zinc-500 hover:text-indigo-600"
      >
        {chosen.length > 0 ? `Shared ${chosen.length}` : 'Share'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-44 overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {options.length === 0 && <p className="px-3 py-1.5 text-xs text-zinc-400">None</p>}
          {options.map(person => {
            const on = chosen.some(row => row.id === person.id)
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => { void toggle(person.id) }}
                className={[
                  'block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800',
                  on ? 'font-medium text-indigo-600' : 'text-zinc-700 dark:text-zinc-200',
                ].join(' ')}
              >
                {person.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
