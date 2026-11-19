import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { getAuthContext } from '@/lib/get-auth-context'
import { resolveWorkshopLocale } from '@/i18n/locale-from-request'
import { formatCurrency, formatDateForPdf } from '@/lib/format'
import { resolveCurrencyCode, resolveCurrencyFormat } from '@/lib/currencies'
import {
  SalaryHistoryPdf,
  type SalaryHistoryPdfPeriod,
} from '@/features/salaries/Pdf/SalaryHistoryPdf'
import {
  addDaysIso,
  entriesInPeriod,
  isValidIsoDate,
  salaryBalance,
  salaryPeriodsInRange,
  todayIso,
} from '@/features/salaries/Lib/salaryPeriod'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(request.url)
  const requestedFrom = url.searchParams.get('from') ?? ''
  const requestedTo = url.searchParams.get('to') ?? ''
  const from = isValidIsoDate(requestedFrom) ? requestedFrom : addDaysIso(todayIso(), -180)
  const to = isValidIsoDate(requestedTo) ? requestedTo : todayIso()
  if (from > to) {
    return NextResponse.json({ error: 'The start date must be before the end date' }, { status: 400 })
  }

  const profile = await db.salaryProfile.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      organization: { select: { name: true } },
      entries: {
        orderBy: { effectiveDate: 'asc' },
        select: {
          type: true,
          category: true,
          amount: true,
          effectiveDate: true,
          note: true,
          receiptName: true,
          receiptMimeType: true,
        },
      },
    },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Salary profile not found' }, { status: 404 })
  }

  const [settings, locale] = await Promise.all([
    db.appSetting.findMany({
      where: {
        organizationId: ctx.organizationId,
        key: {
          in: [
            'workshop.address',
            'workshop.phone',
            'workshop.currencyCode',
            'workshop.currencyFormat',
            'workshop.dateFormat',
            'workshop.timezone',
          ],
        },
      },
      select: { key: true, value: true },
    }),
    resolveWorkshopLocale(),
  ])
  const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  const currencyCode = resolveCurrencyCode(settingsMap['workshop.currencyCode'])
  const currencyFormat = resolveCurrencyFormat(settingsMap['workshop.currencyFormat'])
  const dateFormat = settingsMap['workshop.dateFormat']
  const timezone = settingsMap['workshop.timezone']
  const money = (value: number) => formatCurrency(value, currencyCode, currencyFormat)
  const date = (value: string) =>
    formatDateForPdf(`${value}T12:00:00`, dateFormat, timezone)
  const t = await getTranslations({ locale, namespace: 'common.salaries' })

  const periods: SalaryHistoryPdfPeriod[] = []
  const totals = { base: 0, advances: 0, deductions: 0, payments: 0, pending: 0 }

  for (const period of salaryPeriodsInRange(profile, from, to)) {
    const periodEntries = entriesInPeriod(profile.entries, period).filter(
      (entry) => entry.effectiveDate >= from && entry.effectiveDate <= to
    )
    const balance = salaryBalance(profile, periodEntries)
    totals.base += balance.base
    totals.advances += balance.advances
    totals.deductions += balance.deductions
    totals.payments += balance.payments
    totals.pending += balance.pending

    let running = balance.base
    const entries = periodEntries.map((entry) => {
      const type =
        entry.type === 'deduction'
          ? `${t('deduction')} · ${entry.category === 'absence' ? t('absence') : t('other')}`
          : t(entry.type as 'advance' | 'payment' | 'bonus')
      running =
        Math.round(
          (running + (entry.type === 'bonus' ? entry.amount : -entry.amount)) * 100
        ) / 100
      return {
        date: date(entry.effectiveDate),
        type,
        concept: entry.note || '',
        receipt: entry.receiptMimeType ? t('receiptYes') : '—',
        amount: money(entry.amount),
        balance: money(running),
        negative: entry.type === 'advance' || entry.type === 'deduction',
      }
    })

    periods.push({
      label: `${date(period.start)} - ${date(period.end)}`,
      base: money(balance.base),
      advances: money(balance.advances),
      deductions: money(balance.deductions),
      paid: money(balance.payments),
      pending: money(balance.pending),
      entries,
    })
  }

  const generated = date(todayIso())
  const element = React.createElement(SalaryHistoryPdf, {
    workshopName: profile.organization.name,
    workshopAddress: settingsMap['workshop.address'] || '',
    workshopPhone: settingsMap['workshop.phone'] || '',
    employeeName: profile.name,
    rangeLabel: `${date(from)} - ${date(to)}`,
    generatedLabel: generated,
    totals: {
      base: money(totals.base),
      advances: money(totals.advances),
      deductions: money(totals.deductions),
      paid: money(totals.payments),
      pending: money(totals.pending),
    },
    periods,
    labels: {
      title: t('historyTitle'),
      employee: t('employee'),
      range: t('period'),
      generated: t('generated'),
      period: t('period'),
      baseSalary: t('baseSalary'),
      advances: t('advances'),
      deductions: t('deductions'),
      paid: t('paid'),
      pending: t('pending'),
      date: t('date'),
      type: t('type'),
      concept: t('concept'),
      receipt: t('receipt'),
      amount: t('amount'),
      balance: t('balance'),
      totals: t('totals'),
      noMovements: t('noEntries'),
      workerSignature: t('workerSignature'),
      workshopSignature: t('workshopSignature'),
      footer: t('historyFooter'),
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="salary-history-${profile.id.slice(-8)}.pdf"`,
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
