'use client'

import { memo, useCallback, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Package, Plus, Trash2 } from 'lucide-react'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { cn } from '@/lib/utils'
import { InventoryPickerDialog } from '@/features/vehicles/Components/service-edit/InventoryPickerDialog'
import type { InventoryPartOption } from '@/features/vehicles/Components/service-edit/form-types'
import type { QuotePartInput } from './quote-page-types'
import {
  PartNameSuggestions,
  type PartSuggestion,
} from '@/features/inventory/Components/PartNameSuggestions'
import {
  lineTotal,
  markupFromCostAndPrice,
  parseQuantity,
  resolvePartPrice,
} from '@/features/inventory/Lib/partPricing'

const QuotePartRow = memo(function QuotePartRow({
  part,
  index,
  currencyCode,
  onUpdate,
  onDelete,
  tPartNumber,
  tCategory,
  tNamePlaceholder,
  tDeleteRow,
  tExcludeFromTotal,
  inventoryParts,
  onSelectSuggestion,
  categoryListId,
}: {
  /** The datalist of categories the workshop's stock already uses. */
  categoryListId: string
  tCategory: string
  part: QuotePartInput
  index: number
  currencyCode: string
  onUpdate: (
    index: number,
    field: keyof QuotePartInput,
    value: string | number | boolean | null,
    options?: { commit?: boolean }
  ) => void
  onDelete: (index: number) => void
  inventoryParts: PartSuggestion[]
  onSelectSuggestion: (index: number, part: PartSuggestion) => void
  tPartNumber: string
  tNamePlaceholder: string
  tDeleteRow: string
  tExcludeFromTotal: string
}) {
  const formatCurrency = useFormatCurrency()
  const nameMissing =
    !part.name.trim() &&
    !!(
      part.partNumber ||
      Number(part.unitCost) > 0 ||
      Number(part.unitPrice) > 0 ||
      Number(part.total) > 0
    )

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-[1fr_2fr_0.6fr_0.9fr_0.7fr_0.9fr_0.9fr_auto] gap-2.5 sm:gap-2 items-start rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none transition-all hover:border-sky-500/30',
        part.excluded && 'opacity-60 line-through bg-muted/20'
      )}
    >
      {/* Mobile Row Indicator & Exclude/Delete on small screens */}
      <div className="col-span-2 flex items-center justify-between pb-1 sm:hidden">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            {index + 1}
          </span>
          {part.inventoryPartId && (
            <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
              Stock
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={part.excluded ?? false}
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

      {/* Part Name & Suggestions (Full width on mobile, col 2 on desktop) */}
      <div className="col-span-2 sm:col-span-1 sm:order-2 relative">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden block mb-1">
          {tNamePlaceholder}
        </span>
        <Textarea
          placeholder={tNamePlaceholder}
          value={part.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          rows={1}
          aria-invalid={nameMissing}
          className={cn(
            'min-h-9 w-full resize-none font-medium text-sm',
            nameMissing && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        <PartNameSuggestions
          query={part.name}
          parts={inventoryParts}
          disabled={!!part.inventoryPartId}
          currencyCode={currencyCode}
          onSelect={(picked) => onSelectSuggestion(index, picked)}
        />
      </div>

      {/* Part Number & Category */}
      <div className="col-span-2 sm:col-span-1 sm:order-1 flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          {tPartNumber} / {tCategory}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-1">
          <Input
            placeholder={tPartNumber}
            value={part.partNumber ?? ''}
            onChange={(e) => onUpdate(index, 'partNumber', e.target.value)}
            className="sm:h-9 h-8 text-xs"
          />
          <Input
            list={categoryListId}
            placeholder={tCategory}
            aria-label={tCategory}
            value={part.category ?? ''}
            onChange={(e) => onUpdate(index, 'category', e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-1 sm:space-y-0 sm:order-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          Cantidad
        </span>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={part.quantity}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
            className={cn('h-8 sm:h-9 text-xs sm:text-sm', part.unit && 'pr-9')}
          />
          {part.unit && (
            <span className="pointer-events-none absolute right-2 top-1/2 max-w-8 -translate-y-1/2 truncate text-xs text-muted-foreground">
              {part.unit}
            </span>
          )}
        </div>
      </div>

      {/* Unit Cost */}
      <div className="space-y-1 sm:space-y-0 sm:order-4">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          Costo Unit.
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={part.unitCost}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onUpdate(index, 'unitCost', e.target.value)}
          onBlur={(e) => onUpdate(index, 'unitCost', e.target.value, { commit: true })}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Markup */}
      <div className="space-y-1 sm:space-y-0 sm:order-5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          Margen %
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={part.markupPercent}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onUpdate(index, 'markupPercent', e.target.value)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Unit Price */}
      <div className="space-y-1 sm:space-y-0 sm:order-6">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
          Precio Unit.
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={part.unitPrice}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onUpdate(index, 'unitPrice', e.target.value)}
          className="h-8 sm:h-9 text-xs sm:text-sm"
        />
      </div>

      {/* Total Display */}
      <div className="col-span-2 sm:col-span-1 sm:order-7 flex sm:h-9 items-center justify-between sm:justify-end rounded-md bg-sky-500/10 sm:bg-muted/40 px-3 py-1.5 sm:py-0 text-sm font-semibold text-sky-700 dark:text-sky-300 sm:text-foreground">
        <span className="text-xs text-muted-foreground sm:hidden font-medium">Subtotal línea:</span>
        <span>{formatCurrency(part.total, currencyCode)}</span>
      </div>

      {/* Desktop Exclude & Delete Controls */}
      <div className="hidden sm:flex sm:order-8 items-center gap-1">
        <input
          type="checkbox"
          checked={part.excluded ?? false}
          onChange={(e) => onUpdate(index, 'excluded', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          title={tExcludeFromTotal}
          aria-label={tExcludeFromTotal}
        />
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
      </div>
    </div>
  )
})

interface QuotePartsEditorProps {
  partItems: QuotePartInput[]
  currencyCode: string
  partsSubtotal: number
  onUpdate: (
    index: number,
    field: keyof QuotePartInput,
    value: string | number | boolean | null,
    options?: { commit?: boolean }
  ) => void
  onDelete: (index: number) => void
  onAdd: () => void
  onAddBulk?: (items: QuotePartInput[]) => void
  inventoryParts?: InventoryPartOption[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string
}

export const QuotePartsEditor = memo(function QuotePartsEditor({
  partItems,
  currencyCode,
  partsSubtotal,
  onUpdate,
  onDelete,
  onAdd,
  onAddBulk,
  inventoryParts = [],
  t,
}: QuotePartsEditorProps) {
  const formatCurrency = useFormatCurrency()
  const [pickerOpen, setPickerOpen] = useState(false)
  const canPickFromStock = inventoryParts.length > 0 && !!onAddBulk
  const categoryListId = useId()
  const categories = useMemo(
    () =>
      [
        ...new Set(inventoryParts.map((p) => p.category?.trim()).filter(Boolean)),
      ].sort() as string[],
    [inventoryParts]
  )

  const handleSelectSuggestion = useCallback(
    (index: number, picked: PartSuggestion) => {
      const current = partItems[index]
      const quantity = parseQuantity(current?.quantity)
      const { unitPrice } = resolvePartPrice(picked)
      const unitCost = Number(picked.unitCost) || 0
      onUpdate(index, 'name', picked.name)
      onUpdate(index, 'partNumber', picked.partNumber ?? '')
      onUpdate(index, 'unit', picked.unit ?? null)
      onUpdate(index, 'category', picked.category ?? null)
      onUpdate(index, 'unitCost', unitCost)
      onUpdate(index, 'markupPercent', markupFromCostAndPrice(unitCost, unitPrice))
      onUpdate(index, 'unitPrice', unitPrice)
      onUpdate(index, 'total', lineTotal(quantity, unitPrice))
      onUpdate(index, 'inventoryPartId', picked.id)
    },
    [onUpdate, partItems]
  )

  return (
    <div className="rounded-xl border border-sky-500/20 bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Package className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
            {t('parts.title')}
            {partItems.length > 0 && (
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                {partItems.length}
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {canPickFromStock && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="text-xs hover:border-sky-500/40 hover:bg-sky-500/5 active:scale-95"
            >
              <Package className="mr-1 h-3.5 w-3.5 text-sky-500" />
              <span>{t('parts.addFromInventory')}</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="text-xs hover:border-sky-500/40 hover:bg-sky-500/5 active:scale-95"
          >
            <Plus className="mr-1 h-3.5 w-3.5 text-sky-500" />
            <span>{t('parts.addPart')}</span>
          </Button>
        </div>
      </div>

      {partItems.length > 0 && (
        <>
          <datalist id={categoryListId}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          {/* Desktop Table Headers */}
          <div className="hidden grid-cols-[1fr_2fr_0.6fr_0.9fr_0.7fr_0.9fr_0.9fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span>{t('parts.partNumber')}</span>
            <span>{t('parts.name')}</span>
            <span>{t('parts.qty')}</span>
            <span>{t('parts.unitCost')}</span>
            <span>{t('parts.markupPercent')}</span>
            <span>{t('parts.unitPrice')}</span>
            <span className="text-right">{t('parts.total')}</span>
            <span />
          </div>

          <div className="space-y-2.5 sm:space-y-2">
            {partItems.map((part, i) => (
              <QuotePartRow
                key={i}
                part={part}
                index={i}
                currencyCode={currencyCode}
                onUpdate={onUpdate}
                onDelete={onDelete}
                inventoryParts={inventoryParts}
                onSelectSuggestion={handleSelectSuggestion}
                tPartNumber={t('parts.partNumber')}
                tCategory={t('parts.category')}
                categoryListId={categoryListId}
                tNamePlaceholder={t('parts.namePlaceholder')}
                tDeleteRow={t('parts.deleteRow')}
                tExcludeFromTotal={t('parts.excludeFromTotal')}
              />
            ))}
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-500/30 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-sky-500/60 hover:bg-sky-500/5 hover:text-sky-600 active:scale-[0.99]"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('parts.addPart')}</span>
          </button>

          {partItems.some(
            (p) =>
              !p.name.trim() &&
              (p.partNumber ||
                Number(p.unitCost) > 0 ||
                Number(p.unitPrice) > 0 ||
                Number(p.total) > 0)
          ) && (
            <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              {t('parts.nameMissingHint')}
            </p>
          )}

          <div className="flex items-center justify-end border-t border-border/50 pt-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-medium">Subtotal Repuestos:</span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {formatCurrency(partsSubtotal, currencyCode)}
              </span>
            </div>
          </div>
        </>
      )}

      {canPickFromStock && (
        <InventoryPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          inventoryParts={inventoryParts}
          currencyCode={currencyCode}
          onSelectPart={(picked) => {
            onAddBulk?.([
              {
                partNumber: picked.partNumber ?? '',
                name: picked.name,
                quantity: picked.quantity,
                unit: picked.unit ?? null,
                category: picked.category ?? null,
                unitCost: Number(picked.unitCost) || 0,
                markupPercent: Number(picked.markupPercent) || 0,
                unitPrice: picked.unitPrice,
                total: lineTotal(picked.quantity, picked.unitPrice),
                excluded: false,
                inventoryPartId: picked.inventoryPartId ?? null,
              },
            ])
          }}
        />
      )}

      {partItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sky-500/30 p-6 text-center">
          <Package className="h-8 w-8 text-sky-500/50 mb-2" />
          <p className="text-xs text-muted-foreground mb-3">{t('parts.title')}</p>
          <div className="flex gap-2">
            {canPickFromStock && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="text-xs hover:border-sky-500/40 active:scale-95"
              >
                <Package className="mr-1 h-3.5 w-3.5 text-sky-500" />
                {t('parts.addFromInventory')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAdd}
              className="text-xs hover:border-sky-500/40 active:scale-95"
            >
              <Plus className="mr-1 h-3.5 w-3.5 text-sky-500" />
              {t('parts.addPart')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
