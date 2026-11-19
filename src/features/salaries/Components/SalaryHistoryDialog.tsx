'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/format'
import { useDateSettings } from '@/components/date-settings-context'
import { addDaysIso, todayIso } from '../Lib/salaryPeriod'
import type { SalaryProfileView } from '../Lib/types'

export function SalaryHistoryDialog({
  open,
  onOpenChange,
  profile,
  currencyCode,
  currencyFormat,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SalaryProfileView
  currencyCode: string
  currencyFormat: 'symbol' | 'code'
}) {
  const t = useTranslations('common.salaries')
  const { dateFormat } = useDateSettings()
  const [from, setFrom] = useState(addDaysIso(todayIso(), -180))
  const [to, setTo] = useState(todayIso())

  useEffect(() => {
    if (!open) return
    setFrom(addDaysIso(todayIso(), -180))
    setTo(todayIso())
  }, [open])

  const invalid = from > to
  const entries = useMemo(
    () =>
      profile.entries
        .filter((entry) => entry.effectiveDate >= from && entry.effectiveDate <= to)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)),
    [profile.entries, from, to]
  )
  const href = invalid
    ? '#'
    : `/api/protected/salaries/profiles/${profile.id}/history-pdf?from=${from}&to=${to}`
  const day = (value: string) => formatDate(new Date(`${value}T00:00:00`), dateFormat)
  const money = (value: number) => formatCurrency(value, currencyCode, currencyFormat)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('historyFor', { name: profile.name })}</DialogTitle>
          <DialogDescription>{t('historyDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary-history-from">{t('fromDate')}</Label>
              <DateInput
                id="salary-history-from"
                name="salaryHistoryFrom"
                value={from}
                onChange={setFrom}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-history-to">{t('toDate')}</Label>
              <DateInput
                id="salary-history-to"
                name="salaryHistoryTo"
                value={to}
                onChange={setTo}
                className="h-10"
              />
            </div>
          </div>

          {invalid ? (
            <p className="text-destructive text-sm">{t('invalidRange')}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="bg-muted/30 flex items-center justify-between border-b px-3 py-2">
                <span className="text-xs font-medium">{t('rangeMovements')}</span>
                <Badge variant="outline" className="text-xs">
                  {entries.length}
                </Badge>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {entries.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-center text-sm">
                    {t('noEntries')}
                  </p>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                    >
                      <span className="text-muted-foreground w-24 shrink-0 text-xs">
                        {day(entry.effectiveDate)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {entry.type === 'deduction'
                          ? `${t('deduction')} · ${entry.category === 'absence' ? t('absence') : t('other')}`
                          : t(entry.type)}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-semibold tabular-nums ${
                          entry.type === 'advance' || entry.type === 'deduction'
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {entry.type === 'advance' || entry.type === 'deduction' ? '- ' : ''}
                        {money(entry.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          {invalid ? (
            <Button disabled>
              <FileDown className="mr-2 h-4 w-4" />
              {t('downloadPdf')}
            </Button>
          ) : (
            <Button asChild>
              <a href={href} target="_blank" rel="noreferrer">
                <FileDown className="mr-2 h-4 w-4" />
                {t('downloadPdf')}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
