'use client'

import { useTranslations } from 'next-intl'
import { Calculator } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { netLineTotal, type TaxComponent } from '@/lib/tax'
import { taxComponentLabel } from '@/lib/tax-components'
import { useModernWorkOrder } from '@/components/work-order-layout-context'

interface TotalsSectionProps {
  partsSubtotal: number
  /** Internal pre-markup parts cost; rendered muted, never on PDF/share */
  partsCostSubtotal: number
  laborSubtotal: number
  subtotal: number
  discountType: string
  setDiscountType: (type: string) => void
  discountValue: number
  setDiscountValue: (value: number) => void
  discountAmount: number
  taxEnabled: boolean
  taxRate: number
  setTaxRate: (rate: number) => void
  taxAmount: number
  taxInclusive: boolean
  /** One row per tax when the job splits its tax; the rate is then not editable here. */
  taxComponents?: TaxComponent[] | null
  totalAmount: number
  currencyCode: string
}

export function TotalsSection({
  partsSubtotal,
  partsCostSubtotal,
  laborSubtotal,
  subtotal,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  taxEnabled,
  taxRate,
  setTaxRate,
  taxAmount,
  taxInclusive,
  taxComponents,
  totalAmount,
  currencyCode,
}: TotalsSectionProps) {
  const formatCurrency = useFormatCurrency()
  const t = useTranslations('service.totals')
  const modern = useModernWorkOrder()

  const displayPartsSubtotal = netLineTotal(partsSubtotal, taxRate, taxInclusive)
  const displayLaborSubtotal = netLineTotal(laborSubtotal, taxRate, taxInclusive)
  const displaySubtotal = netLineTotal(subtotal, taxRate, taxInclusive)
  const displayDiscountAmount = netLineTotal(discountAmount, taxRate, taxInclusive)

  const rows = (
    <div className="space-y-2.5" data-testid="totals">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('parts')}</span>
        <span className="font-medium text-foreground">{formatCurrency(displayPartsSubtotal, currencyCode)}</span>
      </div>
      {partsCostSubtotal > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
          <span>{t('partsCost')}</span>
          <span>{formatCurrency(partsCostSubtotal, currencyCode)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('labor')}</span>
        <span className="font-medium text-foreground">{formatCurrency(displayLaborSubtotal, currencyCode)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-sm font-medium">
        <span className="text-muted-foreground">{t('subtotal')}</span>
        <span className="text-foreground">{formatCurrency(displaySubtotal, currencyCode)}</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('discount')}</span>
          <Select value={discountType} onValueChange={setDiscountType}>
            <SelectTrigger className="h-7 w-26 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('discountNone')}</SelectItem>
              <SelectItem value="percentage">{t('discountPercentage')}</SelectItem>
              <SelectItem value="fixed">{t('discountFixed')}</SelectItem>
            </SelectContent>
          </Select>
          {discountType !== 'none' && (
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))}
                className="h-7 w-20 text-right text-xs pr-4"
              />
              {discountType === 'percentage' && (
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  %
                </span>
              )}
            </div>
          )}
        </div>
        {displayDiscountAmount > 0 && (
          <span className="font-medium text-destructive">
            {formatCurrency(-displayDiscountAmount, currencyCode)}
          </span>
        )}
      </div>

      {taxEnabled && taxComponents && taxComponents.length > 0 ? (
        taxComponents.map((component) => (
          <div
            key={component.name}
            className="flex items-center justify-between text-xs text-muted-foreground"
            data-testid="tax-component-row"
          >
            <span>{taxComponentLabel(component)}</span>
            <span className="font-medium text-foreground">{formatCurrency(component.amount, currencyCode)}</span>
          </div>
        ))
      ) : taxEnabled ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t('tax')}</span>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value === '' ? 0 : Number(e.target.value))}
                className="h-7 w-16 text-right text-xs pr-4"
              />
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <span className="font-medium text-foreground">{formatCurrency(taxAmount, currencyCode)}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t-2 border-emerald-500/30 pt-2.5 text-base font-bold">
        <span className="text-foreground">{t('total')}</span>
        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(totalAmount, currencyCode)}
        </span>
      </div>
      {taxInclusive && (
        <p className="text-[11px] text-muted-foreground italic">{t('inclusiveModeHint')}</p>
      )}
    </div>
  )

  if (modern) return rows

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-card to-emerald-500/5 p-3.5 sm:p-4 space-y-3 shadow-2xs">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Calculator className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{t('title')}</h3>
      </div>
      {rows}
    </div>
  )
}
