import * as React from 'react'
import { cn } from '../utils.js'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  bordered?: boolean
}

export function Card({ className, padding = 'md', bordered = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] bg-[var(--bg-surface)]',
        bordered && 'border border-[var(--border)]',
        padding === 'none' && '',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between gap-2 mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-semibold text-[var(--text-primary)] text-sm', className)} {...props}>
      {children}
    </h3>
  )
}
