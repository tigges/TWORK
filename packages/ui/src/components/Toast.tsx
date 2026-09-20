import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '../utils.js'
import { X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-[var(--border)]',
  success: 'border-[var(--success)]/40 bg-[var(--success-muted)]',
  error:   'border-[var(--error)]/40 bg-[var(--error-muted)]',
  warning: 'border-[var(--warning)]/40 bg-[var(--warning-muted)]',
}

export function Toast({ title, description, variant = 'default', open, onOpenChange }: ToastProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'fixed bottom-4 right-4 z-[100] max-w-sm rounded-[var(--radius-md)] border',
        'bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-lg)]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4',
        VARIANT_STYLES[variant]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <ToastPrimitive.Title className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </ToastPrimitive.Title>
          {description && (
            <ToastPrimitive.Description className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {description}
            </ToastPrimitive.Description>
          )}
        </div>
        <ToastPrimitive.Close className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={14} />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  )
}
