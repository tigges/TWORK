import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../utils.js'

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex gap-0.5 border-b border-[var(--border)] px-4', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative -mb-px h-10 px-4 text-sm font-medium text-[var(--text-muted)]',
      'border-b-2 border-transparent transition-colors duration-[var(--duration-base)]',
      'hover:text-[var(--text-secondary)]',
      'data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = TabsPrimitive.Content
