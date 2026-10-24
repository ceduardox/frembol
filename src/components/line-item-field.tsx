'use client'

import { cn } from '@/lib/utils'

interface FieldRowProps {
  /** Column name, shown beside/above the control while the table is stacked. */
  label: string
  /** Optional explanation, surfaced on hover of the label. */
  hint?: string
  className?: string
  children: React.ReactNode
}

/**
 * One cell of a line-item editor (parts, labor, quote lines).
 *
 * Below `lg` or `@2xl` the editors stack into cards, where a bare column of number
 * inputs gives no clue which box is the price and which is the markup, so each
 * control keeps its column name above it with 100% input width. In wider grids
 * the wrapper collapses to `display: contents` and the control drops straight
 * into the parent grid, under the shared header row.
 */
export function FieldRow({ label, hint, className, children }: FieldRowProps) {
  return (
    <div className={cn('flex flex-col gap-1 @2xl:contents lg:contents', className)}>
      <span
        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground @2xl:hidden lg:hidden"
        title={hint}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
