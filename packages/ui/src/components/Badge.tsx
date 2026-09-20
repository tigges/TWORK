import * as React from 'react'
import { cn } from '../utils.js'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantStyles: Record<string, string> = {
  default:  'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]/20',
  success:  'bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success)]/20',
  warning:  'bg-[var(--warning-muted)] text-[var(--warning)] border border-[var(--warning)]/20',
  error:    'bg-[var(--error-muted)] text-[var(--error)] border border-[var(--error)]/20',
  info:     'bg-[var(--info-muted)] text-[var(--info)] border border-[var(--info)]/20',
  muted:    'bg-[var(--bg-active)] text-[var(--text-muted)] border border-[var(--border)]',
}

export function Badge({ className, variant = 'default', size = 'sm', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="block h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}
