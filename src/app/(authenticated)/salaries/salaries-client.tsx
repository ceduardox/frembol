'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings2,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/confirm-dialog'
import { useDateSettings } from '@/components/date-settings-context'
import { formatCurrency, formatDate } from '@/lib/format'
import { deleteSalaryEntry } from '@/features/salaries/Actions/salaryActions'
import { SalaryEntryDialog, type SalaryEntryMode } from '@/features/salaries/Components/SalaryEntryDialog'
import { SalaryProfileDialog } from '@/features/salaries/Components/SalaryProfileDialog'
import {
  addDaysIso,
  entriesInPeriod,
  salaryBalance,
  salaryPeriodFor,
  tenureParts,
  type SalaryPeriod,
} from '@/features/salaries/Lib/salaryPeriod'
import type { SalaryEntryView, SalaryProfileView } from '@/features/salaries/Lib/types'

export function SalariesClient({
  initial,
  currencyCode,
  currencyFormat,
}: {
  initial: SalaryProfileView[]
  currencyCode: string
  currencyFormat: 'symbol' | 'code'
}) {
  const t = useTranslations('common.salaries')
  const router = useRouter()
  const confirm = useConfirm()
  const { dateFormat } = useDateSettings()

  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '')
  const selected = initial.find((profile) => profile.id === selectedId) ?? initial[0] ?? null
  const [period, setPeriod] = useState<SalaryPeriod | null>(
    selected ? salaryPeriodFor(selected) : null
  )
  const [profileDialog, setProfileDialog] = useState(false)
  const [entryMode, setEntryMode] = useState<SalaryEntryMode | null>(null)

  useEffect(() => {
    if (!initial.some((profile) => profile.id === selectedId)) {
      setSelectedId(initial[0]?.id ?? '')
    }
  }, [initial, selectedId])

  useEffect(() => {
    if (!selected) {
      setPeriod(null)
      return
    }
    setPeriod(salaryPeriodFor(selected))
  }, [selected?.id])

  const entries = useMemo(
    () => (selected && period ? entriesInPeriod(selected.entries, period) : []),
    [selected, period]
  )
  const balance = useMemo(
    () => (selected ? salaryBalance(selected, entries) : null),
    [selected, entries]
  )
  const rows = useMemo(
    () =>
      initial.map((profile) => {
        const currentPeriod = salaryPeriodFor(profile)
        const currentEntries = entriesInPeriod(profile.entries, currentPeriod)
        return {
          profile,
          period: currentPeriod,
          balance: salaryBalance(profile, currentEntries),
          tenure: tenureParts(profile.startDate),
        }
      }),
    [initial]
  )

  const money = (value: number) => formatCurrency(value, currencyCode, currencyFormat)
  const day = (value: string) => formatDate(new Date(`${value}T00:00:00`), dateFormat)

  const tenureLabel = (parts: { years: number; months: number; days: number }) => {
    if (parts.years > 0) {
      return [t('tenureYears', { count: parts.years }), t('tenureMonths', { count: parts.months })]
        .filter((_, index) => index === 0 || parts.months > 0)
        .join(' · ')
    }
    if (parts.months > 0) {
      return [t('tenureMonths', { count: parts.months }), t('tenureDays', { count: parts.days })]
        .filter((_, index) => index === 0 || parts.days > 0)
        .join(' · ')
    }
    return t('tenureDays', { count: parts.days })
  }

  const movePeriod = (direction: -1 | 1) => {
    if (!selected || !period) return
    setPeriod(salaryPeriodFor(selected, addDaysIso(direction < 0 ? period.start : period.end, direction)))
  }

  const removeEntry = async (entry: SalaryEntryView) => {
    const ok = await confirm({
      title: t('deleteEntry'),
      description: t('deleteEntryDescription'),
      confirmLabel: t('delete'),
      destructive: true,
    })
    if (!ok) return
    const result = await deleteSalaryEntry(entry.id)
    if (!result.success) {
      toast.error(result.error || t('saveFailed'))
      return
    }
    toast.success(t('entryDeleted'))
    router.refresh()
  }

  if (!initial.length) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-xl border p-8 text-center">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">{t('noProfiles')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t('noProfilesHint')}
          </p>
          <Button asChild className="mt-4">
            <Link href="/settings/team">{t('goToTeam')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {t('teamSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 text-left font-medium">{t('workers')}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t('seniority')}</th>
                    <th className="px-4 py-2.5 text-left font-medium">{t('currentPeriod')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('baseSalary')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('advances')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('deductions')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('paid')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('pending')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ profile, period: rowPeriod, balance: rowBalance, tenure }) => (
                    <tr
                      key={profile.id}
                      className={`cursor-pointer border-b transition-colors last:border-b-0 ${
                        profile.id === selected?.id ? 'bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                      onClick={() => setSelectedId(profile.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{profile.name}</span>
                          {profile.monthlyAmount <= 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {t('salaryNotConfigured')}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        <div>{t('sinceDate', { date: day(profile.startDate) })}</div>
                        <div className="text-foreground/80">{tenureLabel(tenure)}</div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {day(rowPeriod.start)} - {day(rowPeriod.end)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(rowBalance.base)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(rowBalance.advances)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(rowBalance.deductions)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(rowBalance.payments)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rowBalance.pending > 0 ? (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                            {t('payable')} {money(rowBalance.pending)}
                          </Badge>
                        ) : rowBalance.pending < 0 ? (
                          <Badge variant="destructive">
                            {t('against')} {money(Math.abs(rowBalance.pending))}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600">
                            {t('upToDate')}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selected && period && balance && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                    {selected.name}
                  </CardTitle>
                  <div className="mt-2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => movePeriod(-1)}
                      aria-label={t('previousPeriod')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-0 text-sm font-medium">
                      {day(period.start)} - {day(period.end)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => movePeriod(1)}
                      aria-label={t('nextPeriod')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setProfileDialog(true)}>
                    <Settings2 className="mr-1 h-4 w-4" />
                    {t('configure')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEntryMode('advance')}>
                    <ArrowUpCircle className="mr-1 h-4 w-4" />
                    {t('addAdvance')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEntryMode('deduction')}>
                    <ArrowDownCircle className="mr-1 h-4 w-4" />
                    {t('addDeduction')}
                  </Button>
                  <Button size="sm" onClick={() => setEntryMode('payment')}>
                    <FileText className="mr-1 h-4 w-4" />
                    {t('registerPayment')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <Stat label={t('baseSalary')} value={money(balance.base)} />
                <Stat label={t('advances')} value={money(balance.advances)} />
                <Stat label={t('deductions')} value={money(balance.deductions)} />
                <Stat label={t('paid')} value={money(balance.payments)} />
                <Stat
                  label={t('pending')}
                  value={money(balance.pending)}
                  emphasize={balance.pending > 0}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('periodEntries')}</h3>
                  <Badge variant="outline" className="text-xs">
                    {entries.length}
                  </Badge>
                </div>

                {entries.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                    {t('noEntries')}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {entryLabel(entry, t)}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {day(entry.effectiveDate)}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-muted-foreground mt-1 truncate text-xs">
                              {entry.note}
                            </p>
                          )}
                        </div>
                        <span className="font-medium tabular-nums">
                          {entry.type === 'advance' || entry.type === 'deduction' ? '- ' : ''}
                          {money(entry.amount)}
                        </span>
                        {entry.hasReceipt && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/api/protected/salaries/entries/${entry.id}/receipt`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t('viewReceipt')}
                            </a>
                          </Button>
                        )}
                        {entry.type === 'payment' && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/api/protected/salaries/entries/${entry.id}/receipt-pdf`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t('receiptPdf')}
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => void removeEntry(entry)}
                          aria-label={t('deleteEntry')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selected && (
        <>
          <SalaryProfileDialog
            open={profileDialog}
            onOpenChange={setProfileDialog}
            profile={selected}
            currencyCode={currencyCode}
          />
          <SalaryEntryDialog
            open={entryMode !== null}
            onOpenChange={(open) => !open && setEntryMode(null)}
            profile={selected}
            mode={entryMode ?? 'advance'}
            pending={balance?.pending ?? 0}
            currencyCode={currencyCode}
          />
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 ${emphasize ? 'border-primary/40 bg-primary/5' : ''}`}>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${emphasize ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function entryLabel(
  entry: SalaryEntryView,
  t: (key: string) => string
): string {
  if (entry.type === 'deduction') {
    return entry.category === 'absence' ? t('absence') : t('other')
  }
  return t(entry.type)
}
