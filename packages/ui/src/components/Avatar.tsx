import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '../utils.js'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: 'online' | 'away' | 'offline'
}

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
}

const STATUS_COLORS = {
  online:  'bg-[var(--success)]',
  away:    'bg-[var(--warning)]',
  offline: 'bg-[var(--text-muted)]',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name, size = 'md', className, status }: AvatarProps) {
  return (
    <span className="relative inline-flex shrink-0">
      <AvatarPrimitive.Root className={cn('rounded-full overflow-hidden', SIZES[size], className)}>
        <AvatarPrimitive.Image
          src={src ?? undefined}
          alt={name}
          className="h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
        >
          {getInitials(name)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-[var(--bg-surface)]',
            STATUS_COLORS[status],
            size === 'xs' || size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
          )}
        />
      )}
    </span>
  )
}
