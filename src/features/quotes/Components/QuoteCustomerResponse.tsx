'use client'

import { Check, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormatDate } from '@/lib/use-format-date'

/**
 * What the customer said back, at the top of the quote.
 */
export function QuoteCustomerResponse({
  status,
  message,
  respondedAt,
  resolving,
  onResolve,
  t,
}: {
  status: 'changes_requested' | 'accepted' | string
  message: string
  respondedAt: Date
  resolving: boolean
  onResolve: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string
}) {
  const { formatDateTime } = useFormatDate()
  const changes = status === 'changes_requested'

  return (
    <div
      className={`rounded-xl border p-3.5 shadow-2xs transition-all ${
        changes
          ? 'border-orange-500/30 bg-orange-500/10 dark:border-orange-500/20 dark:bg-orange-950/20'
          : 'border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-950/20'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <h3
              className={`flex items-center gap-1.5 text-sm font-bold ${
                changes
                  ? 'text-orange-700 dark:text-orange-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              {changes ? t('page.changesRequested') : t('page.quoteAccepted')}
            </h3>
            <span
              className={`text-xs ${
                changes
                  ? 'text-orange-600/80 dark:text-orange-400/80'
                  : 'text-emerald-600/80 dark:text-emerald-400/80'
              }`}
            >
              {formatDateTime(respondedAt)}
            </span>
          </div>
          <p
            className={`whitespace-pre-line break-words text-sm font-medium ${
              changes
                ? 'text-orange-800 dark:text-orange-200'
                : 'text-emerald-800 dark:text-emerald-200'
            }`}
          >
            &ldquo;{message}&rdquo;
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 active:scale-95 transition-all text-xs"
          disabled={resolving}
          onClick={onResolve}
        >
          {resolving ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
          )}
          {t('page.markResolved')}
        </Button>
      </div>
    </div>
  )
}
