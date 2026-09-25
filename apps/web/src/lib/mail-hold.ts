export type Aim = 'up' | 'down' | 'far' | 'left' | 'right'
export type DownAction = 'archive' | 'delete'

export const HOLD_MS = 200
export const CANCEL_PX = 10
export const DEAD_PX = 16

/** Arrow geometry, in px, shared by the overlay and the aim zones. */
export const HOLD = {
  inner:  22,
  body:   20,
  tip:    8,
  half:   20,
  circle: 34,
  gap:    12,
} as const

const TIP_R = HOLD.inner + HOLD.body + HOLD.tip

/** Release here, in the gap past the near arrow, commits the further action. */
export const FAR_PX = TIP_R + 4

export function otherDown(current: DownAction): DownAction {
  return current === 'archive' ? 'delete' : 'archive'
}

/** Near release keeps the default. Far release does the other action and makes it the default. */
export function downResult(current: DownAction, aim: 'down' | 'far'): {
  action: DownAction
  nextDefault: DownAction
} {
  if (aim === 'down') return { action: current, nextDefault: current }
  const action = otherDown(current)
  return { action, nextDefault: action }
}

export function aimOf(dx: number, dy: number): Aim | null {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (adx < DEAD_PX && ady < DEAD_PX) return null
  if (ady > adx) {
    if (dy < 0) return 'up'
    return dy >= FAR_PX ? 'far' : 'down'
  }
  return dx < 0 ? 'left' : 'right'
}

export function upArrowPath(): string {
  const shoulder = Math.round(HOLD.half * 0.65)
  const { half, body, tip } = HOLD
  return [
    `M ${-half} 0`,
    `H ${half}`,
    `V ${-body}`,
    `H ${shoulder}`,
    `L 0 ${-(body + tip)}`,
    `L ${-shoulder} ${-body}`,
    `H ${-half}`,
    'Z',
  ].join(' ')
}
