import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { ACCENTS } from '../lib/accent.js'
import { useAppearance } from '../lib/appearance.js'
import { moveNav } from '../lib/nav-order.js'
import { orderedNav } from '../lib/nav.js'
import { useSidebarOpen } from '../components/Shell.js'

export function SettingsPage() {
  const sidebarOpen = useSidebarOpen()
  const { accent, nav, setAccent, setNav, stepNav } = useAppearance()
  const items = orderedNav(nav)
  const index = Math.max(0, ACCENTS.findIndex(item => item.id === accent.id))
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  function pickFromPointer(clientX: number) {
    const rect = track.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const next = Math.round(ratio * (ACCENTS.length - 1))
    setAccent(ACCENTS[next]!.id)
  }

  function onDragStart(event: React.PointerEvent<HTMLLIElement>, from: number) {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button')) return
    const list = event.currentTarget.parentElement
    if (!list) return
    const origin = nav.slice()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(from)
    const move = (ev: PointerEvent) => {
      const rect = list.getBoundingClientRect()
      const rowH = rect.height / origin.length
      const next = Math.min(origin.length - 1, Math.max(0, Math.floor((ev.clientY - rect.top) / rowH)))
      setNav(moveNav(origin, from, next))
      setDragging(next)
    }
    const end = () => {
      setDragging(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  return (
    <div className="h-full overflow-auto">
      <header className={['border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-5' : 'pl-14 pr-5'].join(' ')}>
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>
      <div className="mx-auto max-w-md px-8 py-8">
        <h2 className="text-xs font-medium text-zinc-500">Order</h2>
        <ul className="mt-2 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
          {items.map((item, itemIndex) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                onPointerDown={event => onDragStart(event, itemIndex)}
                className={[
                  'flex cursor-grab items-center gap-2 border-b border-zinc-100 px-2 py-1.5 last:border-b-0 active:cursor-grabbing dark:border-zinc-800',
                  dragging === itemIndex ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900',
                ].join(' ')}
              >
                <GripVertical size={14} className="shrink-0 text-zinc-300" />
                <Icon size={16} className="shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                <button
                  type="button"
                  aria-label={`Move ${item.label} up`}
                  disabled={itemIndex === 0}
                  onClick={() => stepNav(itemIndex, -1)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.label} down`}
                  disabled={itemIndex === items.length - 1}
                  onClick={() => stepNav(itemIndex, 1)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800"
                >
                  <ChevronDown size={14} />
                </button>
              </li>
            )
          })}
        </ul>

        <h2 className="mt-8 text-xs font-medium text-zinc-500">Color</h2>
        <div className="mt-2 flex items-center gap-3">
          <div
            ref={track}
            role="slider"
            tabIndex={0}
            aria-label="Main color"
            aria-valuemin={0}
            aria-valuemax={ACCENTS.length - 1}
            aria-valuenow={index}
            aria-valuetext={accent.code.toUpperCase()}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId)
              pickFromPointer(event.clientX)
            }}
            onPointerMove={event => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              pickFromPointer(event.clientX)
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault()
                setAccent(ACCENTS[Math.min(ACCENTS.length - 1, index + 1)]!.id)
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault()
                setAccent(ACCENTS[Math.max(0, index - 1)]!.id)
              }
            }}
            className="relative h-8 flex-1 cursor-pointer rounded-full"
            style={{ background: `linear-gradient(90deg, ${ACCENTS.map(item => item.code).join(', ')})` }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                background: accent.code,
                left: `calc(${index} / ${ACCENTS.length - 1} * (100% - 1.5rem))`,
              }}
            />
          </div>
          <span className="w-[4.5rem] shrink-0 font-mono text-xs text-zinc-500">{accent.code.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}
