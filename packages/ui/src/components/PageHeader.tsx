import * as React from 'react'
import { cn } from '../utils.js'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  tabs?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, badge, actions, tabs, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-[var(--border)] bg-[var(--bg-surface)]', className)}>
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-primary)] truncate">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--text-muted)] truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="-mt-1">{tabs}</div>}
    </div>
  )
}
