import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Banknote, CheckCircle2, Droplets, Sparkles } from 'lucide-react'

type WashSummaryData = {
  stages: Record<string, number>
  deliveredToday: number
  revenueThisMonth: number
  topServices: { name: string; total: number }[]
}

export async function WashSummary({
  summary,
  formatMoney,
}: {
  summary: WashSummaryData
  formatMoney: (amount: number) => string
}) {
  const t = await getTranslations('service.wash')
  const stages = [
    { key: 'queued', label: t('queue.queued'), icon: Droplets },
    { key: 'washing', label: t('queue.washing'), icon: Droplets },
    { key: 'drying', label: t('queue.drying'), icon: Droplets },
    { key: 'ready', label: t('queue.ready'), icon: CheckCircle2 },
  ]

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stages.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-sky-500" />
              {label}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.stages[key] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {t('summary.deliveredToday')}
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.deliveredToday}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Banknote className="h-4 w-4 text-emerald-500" />
            {t('summary.revenueMonth')}
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {formatMoney(summary.revenueThisMonth)}
          </p>
          <Link
            href="/billing?kind=wash"
            className="mt-3 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('summary.billing')}
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-sky-500" />
            {t('summary.topServices')}
          </div>
          {summary.topServices.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t('summary.noServices')}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.topServices.map((service) => (
                <li key={service.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{service.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(service.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
