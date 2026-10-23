'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  Calculator,
  Car,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  X,
} from 'lucide-react'
import { SharedLinkCard } from '@/components/shared-link-card'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { netLineTotal } from '@/lib/tax'
import { taxComponentLabel } from '@/lib/tax-components'
import { CustomFieldsForm } from '@/features/custom-fields/Components/CustomFieldsForm'
import { type LockReason, quoteStatusKeepsLock } from '@/lib/document-lock'
import type { WarrantyTexts } from '@/lib/warranty'
import { WarrantySection } from '@/features/vehicles/Components/service-page/WarrantySection'
import type { QuoteFormState } from './useQuoteFormState'
import type { QuoteRecord } from './quote-page-types'
import { VehicleCombobox } from './VehicleCombobox'
import { CustomerCombobox } from './CustomerCombobox'

interface QuoteRightColumnProps {
  state: QuoteFormState
  quote: QuoteRecord
  organizationId: string
  currencyCode: string
  warrantyTexts: WarrantyTexts
  distanceUnit: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string
  onRevoke: () => Promise<void>
  /**
   * Why the quote is locked, or null when it edits. A lock disables the fields
   * that edit the quote; its actions, and any status that keeps it locked, stay
   * usable.
   */
  lockReason: LockReason | null
}

const statusDots: Record<string, string> = {
  draft: 'bg-slate-400',
  sent: 'bg-blue-500',
  accepted: 'bg-emerald-500',
  rejected: 'bg-rose-500',
  expired: 'bg-amber-500',
  converted: 'bg-violet-500',
  changes_requested: 'bg-orange-500',
}

export const QuoteRightColumn = memo(function QuoteRightColumn({
  state,
  quote,
  organizationId,
  currencyCode,
  warrantyTexts,
  distanceUnit,
  t,
  onRevoke,
  lockReason,
}: QuoteRightColumnProps) {
  const formatCurrency = useFormatCurrency()
  const [validUntil, setValidUntil] = useState(state.defaultValidDate)
  const locked = lockReason !== null
  const statusAllowed = (value: string) => !lockReason || quoteStatusKeepsLock(lockReason, value)

  return (
    <div className="flex flex-col gap-3">
      {/* Convert to Work Order CTA */}
      {quote.status !== 'converted' && (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 shadow-2xs">
          <Button
            type="button"
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs active:scale-[0.98] transition-all"
            onClick={() => state.setShowConvertDialog(true)}
          >
            <ArrowRight className="mr-1.5 h-4 w-4" />
            <span>{t('page.convertToWorkOrder')}</span>
          </Button>
        </div>
      )}

      {/* Shared Link */}
      {quote.publicToken && (
        <SharedLinkCard
          publicToken={quote.publicToken}
          organizationId={organizationId}
          type="quote"
          sharedAt={quote.sharedAt}
          viewCount={quote.viewCount}
          lastViewedAt={quote.lastViewedAt}
          onRevoke={onRevoke}
        />
      )}

      {/* Vehicle & Customer */}
      <fieldset disabled={locked} className="contents">
        <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {t('details.customer')} & {t('details.vehicle')}
            </h3>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('details.customer')}</Label>
            <CustomerCombobox
              value={state.customerId}
              initialCustomer={state.selectedCustomer}
              placeholder={t('details.selectCustomer')}
              noneLabel={t('details.none')}
              onChange={(id, customer) => {
                state.setCustomerId(id)
                state.setSelectedCustomer(customer)
                if (id && state.selectedVehicle && state.selectedVehicle.customerId !== id) {
                  state.setVehicleId('')
                  state.setSelectedVehicle(null)
                }
                state.markDirty()
              }}
            />
          </div>

          {state.selectedCustomer && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 transition-colors">
              <Users className="h-4 w-4 shrink-0 text-blue-500" />
              <Link
                href={`/customers/${state.selectedCustomer.id}`}
                target="_blank"
                className="min-w-0 flex-1 text-sm font-medium hover:underline text-foreground"
              >
                <span className="truncate">{state.selectedCustomer.name}</span>
                {state.selectedCustomer.company && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({state.selectedCustomer.company})
                  </span>
                )}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground active:scale-90"
                onClick={() => {
                  state.setCustomerId('')
                  state.setSelectedCustomer(null)
                  state.markDirty()
                }}
                aria-label={t('details.clearCustomer')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('details.vehicle')}</Label>
            <VehicleCombobox
              value={state.vehicleId}
              customerId={state.customerId || undefined}
              initialVehicle={state.selectedVehicle}
              placeholder={t('details.selectVehicle')}
              noneLabel={t('details.none')}
              onChange={(id, vehicle) => {
                state.setVehicleId(id)
                state.setSelectedVehicle(vehicle)
                if (vehicle?.customerId) {
                  state.setCustomerId(vehicle.customerId)
                  if (vehicle.customer) {
                    state.setSelectedCustomer({
                      id: vehicle.customer.id,
                      name: vehicle.customer.name,
                      company: null,
                    })
                  }
                }
                state.markDirty()
              }}
            />
          </div>

          {state.selectedVehicle && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 transition-colors">
              <Car className="h-4 w-4 shrink-0 text-indigo-500" />
              <Link
                href={`/vehicles/${state.selectedVehicle.id}`}
                target="_blank"
                className="min-w-0 flex-1 text-sm font-medium hover:underline text-foreground"
              >
                <span>
                  {state.selectedVehicle.year} {state.selectedVehicle.make}{' '}
                  {state.selectedVehicle.model}
                </span>
                {state.selectedVehicle.licensePlate && (
                  <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                    {state.selectedVehicle.licensePlate}
                  </span>
                )}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground active:scale-90"
                onClick={() => {
                  state.setVehicleId('')
                  state.setSelectedVehicle(null)
                  state.markDirty()
                }}
                aria-label={t('details.clearVehicle')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </fieldset>

      {/* Quote Details */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{t('details.title')}</h3>
        </div>

        <fieldset disabled={locked} className="contents">
          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs text-muted-foreground">
              {t('details.titleLabel')}
            </Label>
            <Input
              id="title"
              name="title"
              placeholder={t('details.titlePlaceholder')}
              defaultValue={quote.title}
              required
              onChange={state.markDirty}
            />
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('details.status')}</Label>
            <Select
              value={state.status}
              onValueChange={state.changeStatus}
              disabled={state.changingStatus}
            >
              <SelectTrigger aria-label={t('details.status')} className="h-9">
                <div className="flex items-center gap-2 truncate">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusDots[state.status] || 'bg-slate-400'}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft" disabled={!statusAllowed('draft')}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>{t('details.statusDraft')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="sent" disabled={!statusAllowed('sent')}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>{t('details.statusSent')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="accepted" disabled={!statusAllowed('accepted')}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{t('details.statusAccepted')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="rejected" disabled={!statusAllowed('rejected')}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>{t('details.statusRejected')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="changes_requested" disabled>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>{t('page.changesRequested')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="converted" disabled>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    <span>{t('list.statusConverted')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <fieldset disabled={locked} className="contents">
            <div className="space-y-1">
              <Label htmlFor="validUntil" className="text-xs text-muted-foreground">
                {t('details.validUntil')}
              </Label>
              <DateInput
                id="validUntil"
                name="validUntil"
                value={validUntil}
                onChange={(v) => {
                  setValidUntil(v)
                  state.markDirty()
                }}
              />
            </div>
          </fieldset>
        </div>

        {quote.inspectionId && (
          <Link
            href={`/inspections/${quote.inspectionId}`}
            className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
          >
            <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>{t('details.viewInspection')}</span>
          </Link>
        )}
      </div>

      {/* Custom Fields */}
      <fieldset disabled={locked} className="contents">
        <CustomFieldsForm
          entityId={quote.id}
          entityType="quote"
          onValuesReady={state.onCustomFieldsReady}
          onChange={state.markDirty}
        />
      </fieldset>

      {/* Totals Summary Card with guided colors and numeric keypad */}
      <fieldset disabled={locked} className="contents">
        {(() => {
          const displayPartsSubtotal = netLineTotal(
            state.partsSubtotal,
            state.taxRate,
            state.taxInclusive
          )
          const displayLaborSubtotal = netLineTotal(
            state.laborSubtotal,
            state.taxRate,
            state.taxInclusive
          )
          const displaySubtotal = netLineTotal(state.subtotal, state.taxRate, state.taxInclusive)
          const displayDiscountAmount = netLineTotal(
            state.discountAmount,
            state.taxRate,
            state.taxInclusive
          )

          return (
            <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-card to-emerald-500/5 p-3 sm:p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{t('totals.title')}</h3>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('totals.parts')}</span>
                  <span className="font-medium text-foreground">{formatCurrency(displayPartsSubtotal, currencyCode)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('totals.labor')}</span>
                  <span className="font-medium text-foreground">{formatCurrency(displayLaborSubtotal, currencyCode)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-1.5 font-medium">
                  <span className="text-muted-foreground">{t('totals.subtotal')}</span>
                  <span className="text-foreground">
                    {formatCurrency(displaySubtotal, currencyCode)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('totals.discount')}</span>
                    <Select
                      value={state.discountType}
                      onValueChange={(v) => {
                        state.setDiscountType(v)
                        state.markDirty()
                      }}
                    >
                      <SelectTrigger className="h-7 w-26 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('totals.discountNone')}</SelectItem>
                        <SelectItem value="percentage">{t('totals.discountPercentage')}</SelectItem>
                        <SelectItem value="fixed">{t('totals.discountFixed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {state.discountType !== 'none' && (
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={state.discountValue}
                          onChange={(e) => {
                            state.setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))
                            state.markDirty()
                          }}
                          className="h-7 w-20 text-right text-xs pr-4"
                        />
                        {state.discountType === 'percentage' && (
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

                {/* Tax */}
                {state.taxEnabled && state.taxComponents && state.taxComponents.length > 0 ? (
                  state.taxComponents.map((component) => (
                    <div
                      key={component.name}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                      data-testid="tax-component-row"
                    >
                      <span>{taxComponentLabel(component)}</span>
                      <span className="font-medium text-foreground">{formatCurrency(component.amount, currencyCode)}</span>
                    </div>
                  ))
                ) : state.taxEnabled ? (
                  <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{t('totals.tax')}</span>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.1"
                          value={state.taxRate}
                          onChange={(e) => {
                            state.setTaxRate(e.target.value === '' ? 0 : Number(e.target.value))
                            state.markDirty()
                          }}
                          className="h-7 w-16 text-right text-xs pr-4"
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                    <span className="font-medium text-foreground">{formatCurrency(state.taxAmount, currencyCode)}</span>
                  </div>
                ) : null}

                {/* Grand Total */}
                <div className="flex items-center justify-between border-t-2 border-emerald-500/30 pt-3">
                  <span className="text-base font-bold text-foreground">{t('totals.total')}</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(state.totalAmount, currencyCode)}
                  </span>
                </div>

                {state.taxInclusive && (
                  <p className="text-[11px] text-muted-foreground italic">
                    {t('totals.inclusiveModeHint')}
                  </p>
                )}
              </div>
            </div>
          )
        })()}
      </fieldset>

      {/* Warranty */}
      <fieldset disabled={locked} className="contents">
        <WarrantySection
          value={state.warranty}
          onChange={state.setWarranty}
          texts={warrantyTexts}
          distanceUnit={distanceUnit}
        />
      </fieldset>
    </div>
  )
})
