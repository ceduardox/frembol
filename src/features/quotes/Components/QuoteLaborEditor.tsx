'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ChevronDown, Clock, Layers, Plus, Tag, Trash2, Wrench } from 'lucide-react'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { QuoteLaborInput } from './quote-page-types'
import { isShopFeeLine } from '@/features/settings/Lib/shopFee'
import { ShopFeeTag, useShopFeeLocked } from '@/features/settings/Components/ShopFeeTag'

const QuoteLaborRow = memo(function QuoteLaborRow({
  labor,
  index,
  currencyCode,
  cs,
  onUpdate,
  onDelete,
  tDescriptionPlaceholder,
  tHourlyHint,
  tServiceHint,
  tPerHour,
  tFixedPrice,
  tPerHourShort,
  tFixedShort,
  tQty,
  tHours,
  tDeleteRow,
  tExcludeFromTotal,
}: {
  labor: QuoteLaborInput
  index: number
  currencyCode: string
  cs: string
  onUpdate: (index: number, field: keyof QuoteLaborInput, value: string | number | boolean) => void
  onDelete: (index: number) => void
  tDescriptionPlaceholder: string
  /** Each describes its own mode; shown in the picker. */
  tHourlyHint: string
  tServiceHint: string
  tPerHour: string
  tFixedPrice: string
  tPerHourShort: string
  tFixedShort: string
  tQty: string
  tHours: string
  tDeleteRow: string
  tExcludeFromTotal: string
}) {
  const isService = labor.pricingType === 'service'
  const isFee = isShopFeeLine(labor)
  const feeLocked = useShopFeeLocked()
  const formatCurrency = useFormatCurrency()

  // Switching to a fixed price means one unit, so quantity x price = price.
  const setPricing = (type: 'hourly' | 'service') => {
    onUpdate(index, 'pricingType', type)
    if (type === 'service') onUpdate(index, 'hours', 1)
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2.5 sm:gap-2 items-start rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none transition-all hover:border-amber-500/30',
        labor.excluded && 'opacity-60 line-through bg-muted/20'
      )}
    >
      {/* Mobile Row Indicator & Exclude/Delete on small screens */}
      <div className="col-span-2 flex items-center justify-between pb-1 sm:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {index + 1}
          </span>
          {isFee && <ShopFeeTag />}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={labor.excluded ?? false}
              onChange={(e) => onUpdate(index, 'excluded', e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <span className="text-[11px]">{tExcludeFromTotal}</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive active:scale-90"
            onClick={() => onDelete(index)}
            aria-label={tDeleteRow}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Description + Desktop Tag */}
      <div className="col-span-2 sm:col-span-1 flex gap-2">
        <Textarea
          placeholder={tDescriptionPlaceholder}
          value={labor.description}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          rows={1}
          className="min-h-9 flex-1 resize-none font-medium text-sm"
        />
        {isFee && (
          <div className="hidden shrink-0 sm:block">
            <ShopFeeTag />
          </div>
        )}
      </div>

      {/* Hours / Quantity */}
      <div className={cn('space-y-1 sm:space-y-0', isService && 'opacity-70')}>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          {isService || isFee ? tQty : tHours}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step={isService || isFee ? '1' : '0.1'}
          placeholder={isService || isFee ? tQty : tHours}
          value={labor.hours}
          disabled={isFee}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onUpdate(index, 'hours', e.target.value)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Rate / fixed price, with the charging mode as a suffix picker */}
      <div className="space-y-1 sm:space-y-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          {isService ? `${tFixedPrice} (${cs})` : `Tarifa (${cs})`}
        </span>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={labor.rate}
            disabled={isFee && feeLocked}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => onUpdate(index, 'rate', e.target.value)}
            className="h-8 pr-12 text-xs sm:h-9 sm:pr-16 sm:text-sm"
          />
          {!isFee && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'absolute top-1/2 right-1 flex h-6 -translate-y-1/2 items-center gap-0.5 rounded px-1.5 text-[10px] font-semibold transition-colors',
                    isService
                      ? 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 dark:text-blue-300'
                      : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300'
                  )}
                  aria-label={isService ? tFixedPrice : tPerHour}
                >
                  {isService ? tFixedShort : tPerHourShort}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setPricing('hourly')}>
                  <Clock className="mr-2 h-3.5 w-3.5" />
                  <div className="flex flex-col">
                    <span className="font-medium">{tPerHour}</span>
                    <span className="text-[10px] text-muted-foreground">{tHourlyHint}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPricing('service')}>
                  <Tag className="mr-2 h-3.5 w-3.5" />
                  <div className="flex flex-col">
                    <span className="font-medium">{tFixedPrice}</span>
                    <span className="text-[10px] text-muted-foreground">{tServiceHint}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Total Display */}
      <div className="col-span-2 sm:col-span-1 flex sm:h-9 items-center justify-between sm:justify-end rounded-md bg-amber-500/10 sm:bg-muted/40 px-3 py-1.5 sm:py-0 text-sm font-semibold text-amber-700 dark:text-amber-300 sm:text-foreground">
        <span className="text-xs text-muted-foreground sm:hidden font-medium">Subtotal línea:</span>
        <span>{formatCurrency(labor.total, currencyCode)}</span>
      </div>

      {/* Desktop Exclude & Delete Controls */}
      <div className="hidden sm:flex items-center gap-1">
        <input
          type="checkbox"
          checked={labor.excluded ?? false}
          onChange={(e) => onUpdate(index, 'excluded', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          title={tExcludeFromTotal}
          aria-label={tExcludeFromTotal}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive active:scale-90"
              onClick={() => onDelete(index)}
              aria-label={tDeleteRow}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tDeleteRow}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
})

interface QuoteLaborEditorProps {
  laborItems: QuoteLaborInput[]
  currencyCode: string
  cs: string
  laborSubtotal: number
  onUpdate: (index: number, field: keyof QuoteLaborInput, value: string | number | boolean) => void
  onDelete: (index: number) => void
  onAdd: () => void
  onAddService?: () => void
  hasPresets?: boolean
  onOpenPresets?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string
}

export const QuoteLaborEditor = memo(function QuoteLaborEditor({
  laborItems,
  currencyCode,
  cs,
  laborSubtotal,
  onUpdate,
  onDelete,
  onAdd,
  onAddService,
  hasPresets,
  onOpenPresets,
  t,
}: QuoteLaborEditorProps) {
  const formatCurrency = useFormatCurrency()

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-amber-500/20 bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wrench className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              {t('labor.title')}
              {laborItems.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {laborItems.length}
                </span>
              )}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasPresets && onOpenPresets && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenPresets}
                className="text-xs hover:border-amber-500/40 hover:bg-amber-500/5 active:scale-95"
              >
                <Layers className="mr-1 h-3.5 w-3.5 text-amber-500" />
                <span>{t('labor.fromPresets')}</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAdd}
              className="text-xs hover:border-amber-500/40 hover:bg-amber-500/5 active:scale-95"
            >
              <Plus className="mr-1 h-3.5 w-3.5 text-amber-500" />
              <span>{t('labor.addLabor')}</span>
            </Button>
            {onAddService && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddService}
                className="text-xs hover:border-amber-500/40 hover:bg-amber-500/5 active:scale-95"
              >
                <Wrench className="mr-1 h-3.5 w-3.5 text-amber-500" />
                <span>{t('labor.addService')}</span>
              </Button>
            )}
          </div>
        </div>

        {laborItems.length > 0 && (
          <>
            {/* Desktop Table Headers */}
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
              <span>{t('labor.description')}</span>
              <span>{t('labor.qtyOrHours')}</span>
              <span>{t('labor.rate', { currency: cs })}</span>
              <span className="text-right">{t('labor.total')}</span>
              <span />
            </div>

            <div className="space-y-2.5 sm:space-y-2">
              {laborItems.map((labor, i) => (
                <QuoteLaborRow
                  key={i}
                  labor={labor}
                  index={i}
                  currencyCode={currencyCode}
                  cs={cs}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  tDescriptionPlaceholder={t('labor.descriptionPlaceholder')}
                  tHourlyHint={t('labor.hourlyHint')}
                  tServiceHint={t('labor.serviceHint')}
                  tPerHour={t('labor.perHour')}
                  tFixedPrice={t('labor.fixedPrice')}
                  tPerHourShort={t('labor.perHourShort')}
                  tFixedShort={t('labor.fixedShort')}
                  tQty={t('labor.qty')}
                  tHours={t('labor.hours')}
                  tDeleteRow={t('labor.deleteRow')}
                  tExcludeFromTotal={t('labor.excludeFromTotal')}
                />
              ))}
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-500/30 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-amber-500/60 hover:bg-amber-500/5 hover:text-amber-600 active:scale-[0.99]"
              onClick={onAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('labor.addLabor')}</span>
            </button>

            <div className="flex items-center justify-end border-t border-border/50 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase font-medium">Subtotal Mano de Obra:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(laborSubtotal, currencyCode)}
                </span>
              </div>
            </div>
          </>
        )}

        {laborItems.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-amber-500/30 p-6 text-center">
            <Wrench className="h-8 w-8 text-amber-500/50 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">{t('labor.title')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="text-xs hover:border-amber-500/40 active:scale-95"
              >
                <Plus className="mr-1 h-3.5 w-3.5 text-amber-500" />
                {t('labor.addLabor')}
              </Button>
              {onAddService && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddService}
                  className="text-xs hover:border-amber-500/40 active:scale-95"
                >
                  <Wrench className="mr-1 h-3.5 w-3.5 text-amber-500" />
                  {t('labor.addService')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
})
