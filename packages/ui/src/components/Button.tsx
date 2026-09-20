import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-all select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--border-focus)] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]',
        secondary:
          'bg-[var(--bg-overlay)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-active)]',
        ghost:
          'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        destructive:
          'bg-[var(--error)] text-white hover:opacity-90',
        outline:
          'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        link:
          'text-[var(--text-link)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-7 px-2.5 text-xs',
        md:   'h-8 px-3 text-sm',
        default: 'h-9 px-4 text-sm',
        lg:   'h-10 px-5 text-sm',
        icon: 'h-8 w-8 p-0',
        'icon-sm': 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
