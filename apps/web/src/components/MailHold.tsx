import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  HOLD,
  HOLD_MS,
  CANCEL_PX,
  aimOf,
  downResult,
  upArrowPath,
  type Aim,
  type DownAction,
} from '../lib/mail-hold.js'

export type HoldCommit = 'important' | 'reply' | 'forward' | 'archive' | 'delete'

const COLORS = {
  important: '#d97706',
  reply:     '#c026d3',
  forward:   '#047857',
  archive:   '#1d4ed8',
  delete:    '#b91c1c',
} as const

const PATH = upArrowPath()
const BODY_MID = HOLD.inner + HOLD.body / 2
const FAR_INNER = HOLD.inner + HOLD.body + HOLD.tip + HOLD.gap

type Overlay = { cx: number; cy: number; aim: Aim | null }

export function MailRow({
  who,
  when,
  subject,
  snippet,
  labels,
  important,
  unread,
  active,
  nearDown,
  onOpen,
  onCommit,
}: {
  who: string
  when: string
  subject: string
  snippet: string
  labels: string[]
  important: boolean
  unread: boolean
  active: boolean
  nearDown: DownAction
  onOpen: () => void
  onCommit: (action: HoldCommit, swapped: boolean) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef(nearDown)
  const openRef = useRef(onOpen)
  const commitRef = useRef(onCommit)
  nearRef.current = nearDown
  openRef.current = onOpen
  commitRef.current = onCommit
  const gesture = useRef<Gesture | null>(null)
  const [overlay, setOverlay] = useState<Overlay | null>(null)

  useEffect(() => {
    function move(event: PointerEvent) {
      const current = gesture.current
      if (!current || event.pointerId !== current.pointerId) return
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      if (!current.held) {
        if (Math.hypot(dx, dy) > CANCEL_PX) {
          window.clearTimeout(current.timer)
          gesture.current = null
        }
        return
      }
      if (event.cancelable) event.preventDefault()
      const aim = aimOf(event.clientX - current.originX, event.clientY - current.originY)
      setOverlay(value => value ? { ...value, aim } : value)
    }

    function end(event: PointerEvent) {
      const current = gesture.current
      if (!current || event.pointerId !== current.pointerId) return
      window.clearTimeout(current.timer)
      gesture.current = null
      setOverlay(null)
      if (!current.held) {
        const dx = event.clientX - current.startX
        const dy = event.clientY - current.startY
        if (Math.hypot(dx, dy) <= CANCEL_PX) openRef.current()
        return
      }
      const aim = aimOf(event.clientX - current.originX, event.clientY - current.originY)
      if (aim === 'up') commitRef.current('important', false)
      else if (aim === 'left') commitRef.current('reply', false)
      else if (aim === 'right') commitRef.current('forward', false)
      else if (aim === 'down' || aim === 'far') {
        const result = downResult(nearRef.current, aim)
        commitRef.current(result.action, result.nextDefault !== nearRef.current)
      }
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (gesture.current) window.clearTimeout(gesture.current.timer)
    }
  }, [])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    if (gesture.current) return
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const timer = window.setTimeout(() => {
      const current = gesture.current
      const el = rowRef.current
      if (!current || !el) return
      const rect = el.getBoundingClientRect()
      current.held = true
      current.originX = rect.left + rect.width / 2
      current.originY = rect.top + rect.height / 2
      el.setPointerCapture(pointerId)
      setOverlay({ cx: current.originX, cy: current.originY, aim: null })
    }, HOLD_MS)
    gesture.current = { pointerId, startX, startY, originX: startX, originY: startY, timer, held: false }
  }

  return (
    <>
      <div
        ref={rowRef}
        role="button"
        tabIndex={0}
        data-mail-row={subject}
        onPointerDown={onPointerDown}
        onContextMenu={event => { if (gesture.current?.held) event.preventDefault() }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
        className={[
          'block w-full cursor-pointer select-none border-b border-zinc-100 px-4 py-3 text-left dark:border-zinc-800',
          active ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
        ].join(' ')}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={['flex min-w-0 items-center gap-1 truncate text-sm', unread ? 'font-semibold' : 'font-medium'].join(' ')}>
            {important && (
              <span className="shrink-0 font-semibold text-amber-600" data-important="true" aria-label="Important">!</span>
            )}
            <span className="truncate">{who}</span>
          </span>
          <time className="shrink-0 text-[11px] text-zinc-400">{when}</time>
        </div>
        <p className={['truncate text-sm', unread ? 'font-medium' : 'text-zinc-600 dark:text-zinc-300'].join(' ')}>
          {subject}
        </p>
        <p className="truncate text-xs text-zinc-400">{snippet || ' '}</p>
        {labels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {labels.map(label => (
              <span
                key={label}
                className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {overlay && createPortal(
        <HoldOverlay overlay={overlay} nearDown={nearDown} />,
        document.body,
      )}
    </>
  )
}

type Gesture = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  timer: number
  held: boolean
}

function HoldOverlay({ overlay, nearDown }: { overlay: Overlay; nearDown: DownAction }) {
  const far = nearDown === 'archive' ? 'delete' : 'archive'
  const arms: { aim: Aim; action: keyof typeof COLORS; label: string; at: number }[] = [
    { aim: 'up', action: 'important', label: '!', at: -BODY_MID },
    { aim: 'left', action: 'reply', label: 'Re', at: -BODY_MID },
    { aim: 'right', action: 'forward', label: 'FW', at: BODY_MID },
    { aim: 'down', action: nearDown, label: nearDown === 'archive' ? 'Archive' : 'Delete', at: BODY_MID },
    { aim: 'far', action: far, label: far === 'archive' ? 'Archive' : 'Delete', at: FAR_INNER + HOLD.body / 2 },
  ]
  const pad = 90
  const height = FAR_INNER + HOLD.body + HOLD.tip + 28
  return (
    <svg
      data-hold="open"
      data-aim={overlay.aim ?? ''}
      data-near={nearDown}
      aria-hidden="true"
      className="pointer-events-none fixed z-40"
      style={{ left: overlay.cx - pad, top: overlay.cy - pad, width: pad * 2, height: pad + height }}
      viewBox={`${-pad} ${-pad} ${pad * 2} ${pad + height}`}
    >
      <defs>
        <radialGradient id="mail-hold-glow" cx="0" cy="0" r={HOLD.circle} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="82%" stopColor="#71717a" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#3f3f46" stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <circle r={HOLD.circle} fill="url(#mail-hold-glow)" />
      <circle r={HOLD.circle} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="8" />
      <circle r={HOLD.circle} fill="none" stroke="#3f3f46" strokeOpacity="0.28" strokeWidth="8" />
      {arms.map(arm => (
        <Arm key={arm.aim} arm={arm} lit={overlay.aim === arm.aim} dim={overlay.aim !== null && overlay.aim !== arm.aim} />
      ))}
    </svg>
  )
}

function Arm({
  arm,
  lit,
  dim,
}: {
  arm: { aim: Aim; action: keyof typeof COLORS; label: string; at: number }
  lit: boolean
  dim: boolean
}) {
  const dir = arm.aim === 'far' ? 'down' : arm.aim
  const radius = arm.aim === 'far' ? FAR_INNER : HOLD.inner
  const transform = dir === 'up'
    ? `translate(0 ${-radius})`
    : dir === 'down'
      ? `translate(0 ${radius}) rotate(180)`
      : dir === 'left'
        ? `translate(${-radius} 0) rotate(-90)`
        : `translate(${radius} 0) rotate(90)`
  const text = dir === 'up'
    ? { x: 0, y: arm.at }
    : dir === 'down'
      ? { x: 0, y: arm.at }
      : dir === 'left'
        ? { x: arm.at, y: 0 }
        : { x: arm.at, y: 0 }
  const long = arm.label.length > 2
  return (
    <g data-arm={arm.aim} data-lit={lit ? 'true' : 'false'} opacity={dim ? 0.42 : 1}>
      <path
        d={PATH}
        transform={transform}
        fill={COLORS[arm.action]}
        stroke={lit ? '#ffffff' : 'none'}
        strokeWidth={lit ? 2 : 0}
      />
      <text
        x={text.x}
        y={text.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={long ? 9 : 11}
        fontWeight={600}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {arm.label}
      </text>
    </g>
  )
}
