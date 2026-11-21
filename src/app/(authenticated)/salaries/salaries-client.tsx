'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  History,
  Settings2,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/confirm-dialog'
import { useDateSettings } from '@/components/date-settings-context'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  deactivateSalaryProfile,
  deleteSalaryEntry,
} from '@/features/salaries/Actions/salaryActions'
import { SalaryEntryDialog, type SalaryEntryMode } from '@/features/salaries/Components/SalaryEntryDialog'
import { SalaryHistoryDialog } from '@/features/salaries/Components/SalaryHistoryDialog'
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
  const [expandedId, setExpandedId] = useState<string | null>(initial[0]?.id ?? null)
  const [historyOpen, setHistoryOpen] = useState(false)

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

  const removeFromPayroll = async (profile: SalaryProfileView | null = selected) => {
    if (!profile) return
    const ok = await confirm({
      title: t('removeFromPayroll'),
      description: t('removeFromPayrollDescription', { name: profile.name }),
      confirmLabel: t('removeFromPayroll'),
      destructive: true,
    })
    if (!ok) return
    const result = await deactivateSalaryProfile(profile.id)
    if (!result.success) {
      toast.error(result.error || t('saveFailed'))
      return
    }
    toast.success(t('removedFromPayroll'))
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
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary ring-primary/15 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="from-primary/[0.07] border-b bg-gradient-to-r via-transparent to-transparent">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                {t('teamSummary')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  {initial.length}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="/api/protected/salaries/team-pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    {t('teamPdf')}
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 bg-muted/10 p-3 sm:p-4">
            {rows.map(({ profile, period: rowPeriod, balance: rowBalance, tenure }) => {
              const expanded = expandedId === profile.id
              return (
                <div
                  key={profile.id}
                  className={`group relative overflow-hidden rounded-xl border bg-card transition-all ${
                    profile.id === selected?.id
                      ? 'border-primary/40 shadow-sm'
                      : 'hover:border-primary/25 hover:shadow-sm'
                  }`}
                >
                  {profile.id === selected?.id && (
                    <span className="bg-primary absolute inset-y-0 left-0 w-0.5" />
                  )}
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-3 text-left sm:p-4"
                    onClick={() => {
                      setSelectedId(profile.id)
                      setExpandedId(expanded ? null : profile.id)
                    }}
                    aria-expanded={expanded}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${
                        profile.id === selected?.id
                          ? 'bg-primary text-primary-foreground ring-primary/30'
                          : 'bg-primary/10 text-primary ring-primary/15'
                      }`}
                    >
                      {initials(profile.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold">{profile.name}</span>
                        {profile.monthlyAmount <= 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {t('salaryNotConfigured')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                        <span>{t('sinceDate', { date: day(profile.startDate) })}</span>
                        <span className="text-border">·</span>
                        <span>{tenureLabel(tenure)}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        <span className="text-foreground/75 font-medium">
                          {money(rowBalance.base)}
                        </span>
                        <span> / {t('monthShort')}</span>
                        <span className="mx-1 text-border">·</span>
                        <span>
                          {t('currentPeriod')}: {day(rowPeriod.start)} - {day(rowPeriod.end)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {rowBalance.pending > 0 ? (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                          {t('payable')} {money(rowBalance.pending)}
                        </Badge>
                      ) : rowBalance.pending < 0 ? (
                        <Badge variant="destructive">
                          {t('against')} {money(Math.abs(rowBalance.pending))}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/25 bg-emerald-500/5 text-emerald-600"
                        >
                          {t('upToDate')}
                        </Badge>
                      )}
                      <ChevronDown
                        className={`text-muted-foreground h-4 w-4 transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expanded && (
                    <>
                      <div className="bg-muted/20 grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-4">
                        <MiniStat
                          icon={Wallet}
                          tone="primary"
                          label={t('baseSalary')}
                          value={money(rowBalance.base)}
                        />
                        <MiniStat
                          icon={ArrowUpCircle}
                          tone="amber"
                          label={t('advances')}
                          value={money(rowBalance.advances)}
                        />
                        <MiniStat
                          icon={ArrowDownCircle}
                          tone="rose"
                          label={t('deductions')}
                          value={money(rowBalance.deductions)}
                        />
                        <MiniStat
                          icon={CheckCircle2}
                          tone="emerald"
                          label={t('paid')}
                          value={money(rowBalance.payments)}
                        />
                      </div>
                      <div className="flex justify-end border-t px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void removeFromPayroll(profile)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t('removeFromPayroll')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {selected && period && balance && (
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="from-primary/[0.08] border-b bg-gradient-to-r via-transparent to-transparent">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground ring-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1">
                    {initials(selected.name)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selected.name}</CardTitle>
                    <div className="border-border/70 bg-background/60 mt-2 inline-flex items-center gap-1 rounded-full border px-1 py-0.5 shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => movePeriod(-1)}
                        aria-label={t('previousPeriod')}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-0 px-1 text-xs font-medium sm:text-sm">
                        {day(period.start)} - {day(period.end)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => movePeriod(1)}
                        aria-label={t('nextPeriod')}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setProfileDialog(true)}>
                    <Settings2 className="mr-1 h-4 w-4" />
                    {t('configure')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                    <History className="mr-1 h-4 w-4" />
                    {t('history')}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void removeFromPayroll()}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {t('removeFromPayroll')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <Stat
                  icon={Wallet}
                  tone="primary"
                  label={t('baseSalary')}
                  value={money(balance.base)}
                />
                <Stat
                  icon={ArrowUpCircle}
                  tone="amber"
                  label={t('advances')}
                  value={money(balance.advances)}
                />
                <Stat
                  icon={ArrowDownCircle}
                  tone="rose"
                  label={t('deductions')}
                  value={money(balance.deductions)}
                />
                <Stat
                  icon={CheckCircle2}
                  tone="emerald"
                  label={t('paid')}
                  value={money(balance.payments)}
                />
                <Stat
                  icon={CircleDollarSign}
                  tone={balance.pending > 0 ? 'amber' : balance.pending < 0 ? 'rose' : 'emerald'}
                  label={t('pending')}
                  value={money(balance.pending)}
                  emphasize={balance.pending !== 0}
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
                  <div className="overflow-hidden rounded-xl border">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center gap-3 border-b p-3 transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase ${
                                entry.type === 'payment'
                                  ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600'
                                  : entry.type === 'deduction'
                                    ? 'border-rose-500/25 bg-rose-500/5 text-rose-600'
                                    : entry.type === 'advance'
                                      ? 'border-amber-500/25 bg-amber-500/5 text-amber-700'
                                      : 'border-primary/20 bg-primary/5 text-primary'
                              }`}
                            >
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
                        <span
                          className={`font-semibold tabular-nums ${
                            entry.type === 'advance' || entry.type === 'deduction'
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
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
          <SalaryHistoryDialog
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            profile={selected}
            currencyCode={currencyCode}
            currencyFormat={currencyFormat}
          />
        </>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  emphasize = false,
}: {
  icon: LucideIcon
  tone: 'primary' | 'amber' | 'rose' | 'emerald'
  label: string
  value: string
  emphasize?: boolean
}) {
  const tones = {
    primary: { box: 'border-primary/15 bg-primary/5', icon: 'text-primary', value: '' },
    amber: { box: 'border-amber-500/15 bg-amber-500/5', icon: 'text-amber-600', value: '' },
    rose: { box: 'border-rose-500/15 bg-rose-500/5', icon: 'text-rose-600', value: 'text-rose-600' },
    emerald: {
      box: 'border-emerald-500/15 bg-emerald-500/5',
      icon: 'text-emerald-600',
      value: 'text-emerald-600',
    },
  }[tone]

  return (
    <div
      className={`rounded-xl border p-3 ${tones.box} ${
        emphasize ? 'ring-primary/10 ring-1' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${tones.icon}`} />
        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-1.5 text-base font-semibold tabular-nums ${tones.value}`}>{value}</p>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon
  tone: 'primary' | 'amber' | 'rose' | 'emerald'
  label: string
  value: string
}) {
  const tones = {
    primary: { box: 'border-primary/15 bg-primary/5', icon: 'text-primary' },
    amber: { box: 'border-amber-500/15 bg-amber-500/5', icon: 'text-amber-600' },
    rose: { box: 'border-rose-500/15 bg-rose-500/5', icon: 'text-rose-600' },
    emerald: { box: 'border-emerald-500/15 bg-emerald-500/5', icon: 'text-emerald-600' },
  }[tone]

  return (
    <div className={`rounded-lg border p-2.5 ${tones.box}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${tones.icon}`} />
        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || '?'
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
