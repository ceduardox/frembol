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
  SalaryTeamPdf,
  type SalaryTeamPdfRow,
} from '@/features/salaries/Pdf/SalaryTeamPdf'
import {
  entriesInPeriod,
  salaryBalance,
  salaryPeriodFor,
  tenureParts,
  todayIso,
} from '@/features/salaries/Lib/salaryPeriod'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profiles = await db.salaryProfile.findMany({
    where: { organizationId: ctx.organizationId, isActive: true },
    orderBy: { name: 'asc' },
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
          receiptMimeType: true,
          receiptName: true,
        },
      },
    },
  })

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
  const generated = date(todayIso())

  const tenureText = (parts: { years: number; months: number; days: number }) => {
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

  const totals = { base: 0, advances: 0, deductions: 0, payments: 0, pending: 0 }
  const rows: SalaryTeamPdfRow[] = profiles.map((profile) => {
    const period = salaryPeriodFor(profile)
    const entries = entriesInPeriod(profile.entries, period)
    const balance = salaryBalance(profile, entries)
    totals.base += balance.base
    totals.advances += balance.advances
    totals.deductions += balance.deductions
    totals.payments += balance.payments
    totals.pending += balance.pending

    return {
      name: profile.name,
      tenure: tenureText(tenureParts(profile.startDate)),
      period: `${date(period.start)} - ${date(period.end)}`,
      base: money(balance.base),
      advances: money(balance.advances),
      deductions: money(balance.deductions),
      paid: money(balance.payments),
      pending: money(balance.pending),
      status:
        balance.pending > 0
          ? t('payable')
          : balance.pending < 0
            ? t('against')
            : t('upToDate'),
      statusTone: balance.pending > 0 ? 'payable' : balance.pending < 0 ? 'against' : 'current',
    }
  })

  const element = React.createElement(SalaryTeamPdf, {
    workshopName: profiles[0]?.organization.name ?? '',
    workshopAddress: settingsMap['workshop.address'] || '',
    workshopPhone: settingsMap['workshop.phone'] || '',
    rangeLabel: t('currentPeriod'),
    generatedLabel: generated,
    rows,
    totals: {
      base: money(totals.base),
      advances: money(totals.advances),
      deductions: money(totals.deductions),
      paid: money(totals.payments),
      pending: money(totals.pending),
    },
    labels: {
      title: t('teamPdfTitle'),
      subtitle: t('period'),
      worker: t('workers'),
      seniority: t('seniority'),
      period: t('period'),
      baseSalary: t('baseSalary'),
      advances: t('advances'),
      deductions: t('deductions'),
      paid: t('paid'),
      pending: t('pending'),
      status: t('status'),
      totals: t('totals'),
      generated: t('generated'),
      footer: t('historyFooter'),
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="salary-team.pdf"',
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
