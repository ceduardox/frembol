import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { getAuthContext } from '@/lib/get-auth-context'
import { resolveWorkshopLocale } from '@/i18n/locale-from-request'
import { formatCurrency, formatDateForPdf } from '@/lib/format'
import { resolveCurrencyCode, resolveCurrencyFormat } from '@/lib/currencies'
import { SalaryReceiptPdf } from '@/features/salaries/Pdf/SalaryReceiptPdf'
import {
  entriesInPeriod,
  salaryBalance,
  salaryPeriodFor,
} from '@/features/salaries/Lib/salaryPeriod'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const entry = await db.salaryEntry.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      profile: {
        include: {
          organization: { select: { name: true } },
          entries: true,
        },
      },
    },
  })
  if (!entry || entry.type !== 'payment') {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
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

  const period = salaryPeriodFor(entry.profile, entry.effectiveDate)
  const periodEntries = entriesInPeriod(entry.profile.entries, period)
  const balance = salaryBalance(entry.profile, periodEntries)
  const t = await getTranslations({ locale, namespace: 'common.salaries' })

  const element = React.createElement(SalaryReceiptPdf, {
    workshopName: entry.profile.organization.name,
    workshopAddress: settingsMap['workshop.address'] || '',
    workshopPhone: settingsMap['workshop.phone'] || '',
    employeeName: entry.profile.name,
    periodStart: date(period.start),
    periodEnd: date(period.end),
    paymentDate: date(entry.effectiveDate),
    receiptNumber: `REC-${entry.id.slice(-8).toUpperCase()}`,
    base: money(balance.base),
    advances: money(balance.advances),
    deductions: money(balance.deductions),
    paidThisReceipt: money(entry.amount),
    totalPaid: money(balance.payments),
    pending: money(balance.pending),
    labels: {
      title: t('receiptTitle'),
      receiptNumber: t('receiptNumber'),
      date: t('date'),
      employee: t('employee'),
      period: t('period'),
      concept: t('concept'),
      amount: t('amount'),
      base: t('baseSalary'),
      advances: t('advances'),
      deductions: t('deductions'),
      paidThisReceipt: t('payment'),
      totalPaid: t('paid'),
      pending: t('pending'),
      workerSignature: t('workerSignature'),
      workshopSignature: t('workshopSignature'),
      footer: t('receiptFooter'),
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${entry.id.slice(-8)}.pdf"`,
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  })
}
