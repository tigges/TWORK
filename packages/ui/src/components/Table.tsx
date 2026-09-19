import * as React from 'react'
import { cn } from '../utils.js'

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}
interface THeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> { onClick?: () => void }
interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      />
    </div>
  )
}

export function THead({ className, ...props }: THeadProps) {
  return <thead className={cn('border-b border-[var(--border)]', className)} {...props} />
}

export function TBody({ className, ...props }: TBodyProps) {
  return <tbody className={cn('', className)} {...props} />
}

export function TR({ className, onClick, ...props }: TRProps) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--border)] last:border-0',
        onClick && 'cursor-pointer hover:bg-[var(--bg-hover)] transition-colors',
        className
      )}
      onClick={onClick}
      {...props}
    />
  )
}

export function TH({ className, ...props }: THProps) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-medium text-[var(--text-muted)] whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
}

export function TD({ className, ...props }: TDProps) {
  return <td className={cn('px-4 py-3 text-[var(--text-primary)]', className)} {...props} />
}
