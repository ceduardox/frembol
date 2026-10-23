import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, inputMode, onWheel, ...props }: React.ComponentProps<'input'>) {
  const handleWheel =
    type === 'number'
      ? (e: React.WheelEvent<HTMLInputElement>) => {
          e.currentTarget.blur()
          onWheel?.(e)
        }
      : onWheel

  const computedInputMode = inputMode ?? (type === 'number' ? 'decimal' : undefined)

  return (
    <input
      type={type}
      inputMode={computedInputMode}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      onWheel={handleWheel}
      {...props}
    />
  )
}

export { Input }
