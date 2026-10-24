'use client'

import { useRef, useCallback, useState, useEffect, useId, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GripVertical, Package, Percent, Plus, ScanBarcode, Trash2 } from 'lucide-react'
import { IconActionButton } from '@/components/icon-action-button'
import { FieldRow } from '@/components/line-item-field'
import { cn } from '@/lib/utils'
import { AppCard } from '@/components/app-card'
import { useModernWorkOrder } from '@/components/work-order-layout-context'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { useTranslations } from 'next-intl'
import type { ServicePartInput } from '@/features/vehicles/Schema/serviceSchema'
import { partRowHasContent } from '@/features/vehicles/Lib/validateServiceForm'
import { emptyPart } from './form-types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
  PartNameSuggestions,
  type PartSuggestion,
} from '@/features/inventory/Components/PartNameSuggestions'
import {
  lineTotal,
  priceFromCostAndMarkup,
  resolvePartPrice,
} from '@/features/inventory/Lib/partPricing'

interface PartsEditorProps {
  partItems: ServicePartInput[]
  setPartItems: React.Dispatch<React.SetStateAction<ServicePartInput[]>>
  updatePart: (
    index: number,
    field: keyof ServicePartInput,
    value: string | number,
    options?: { commit?: boolean }
  ) => void
  partsSubtotal: number
  currencyCode: string
  hasInventory: boolean
  /** Stocked parts, used for the inline name suggestions. */
  inventoryParts?: PartSuggestion[]
  onOpenInventory: () => void
  onScanBarcode?: () => void
  /** Default markup % applied to new manually-added rows. Hidden from customers. */
  defaultMarkupPercent?: number
  /** When true, the bulk "Apply markup" button affects inventory-sourced rows too. */
  markupAppliesToInventory?: boolean
}

function SortablePartRow({
  id,
  part,
  index,
  updatePart,
  onDelete,
  currencyCode,
  t,
  dragEnabled,
  inventoryParts,
  onSelectSuggestion,
  defaultMarkupPercent,
  markupAppliesToInventory,
  categoryListId,
}: {
  id: string
  part: ServicePartInput
  index: number
  /** The datalist of categories the workshop's stock already uses. */
  categoryListId: string
  updatePart: (
    index: number,
    field: keyof ServicePartInput,
    value: string | number,
    options?: { commit?: boolean }
  ) => void
  onDelete: () => void
  currencyCode: string
  inventoryParts: PartSuggestion[]
  onSelectSuggestion: (index: number, part: PartSuggestion) => void
  defaultMarkupPercent: number
  markupAppliesToInventory: boolean
  t: (key: string) => string
  dragEnabled: boolean
}) {
  const formatCurrency = useFormatCurrency()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = dragEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined

  const nameMissing = partRowHasContent(part) && !part.name.trim()

  return (
    <div
      ref={dragEnabled ? setNodeRef : undefined}
      style={style}
      className={cn(
        'grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs hover:border-sky-500/30 transition-all',
        '@2xl:grid-cols-[auto_1fr_2fr_0.6fr_0.9fr_0.7fr_0.9fr_0.9fr_auto] @2xl:rounded-none @2xl:border-0 @2xl:bg-transparent @2xl:p-0 @2xl:shadow-none',
        isDragging && dragEnabled && 'z-10 opacity-75'
      )}
    >
      <button
        type="button"
        className="flex h-9 w-6 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...(dragEnabled ? { ...attributes, ...listeners } : {})}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="grid min-w-0 grid-cols-2 gap-2.5 @2xl:contents">
        {/* Name: spans full width on mobile, 2nd column on desktop */}
        <FieldRow label={t('name')} className="col-span-2 order-first @2xl:order-none @2xl:col-span-1">
          <div className="relative w-full">
            <Textarea
              placeholder={t('namePlaceholder')}
              value={part.name}
              onChange={(e) => updatePart(index, 'name', e.target.value)}
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
              defaultMarkupPercent={defaultMarkupPercent}
              markupAppliesToInventory={markupAppliesToInventory}
              onSelect={(picked) => onSelectSuggestion(index, picked)}
            />
          </div>
        </FieldRow>

        {/* Part Number & Category: spans full width on mobile, 1st column on desktop */}
        <FieldRow label={t('partNumber')} className="col-span-2 @2xl:col-span-1">
          <div className="flex w-full flex-col gap-1">
            <Input
              placeholder={t('partNumber')}
              value={part.partNumber ?? ''}
              onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
              className="h-8 @2xl:h-9 text-xs @2xl:text-sm"
            />
            <Input
              list={categoryListId}
              placeholder={t('category')}
              aria-label={t('category')}
              value={part.category ?? ''}
              onChange={(e) => updatePart(index, 'category', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </FieldRow>

        {/* Quantity */}
        <FieldRow label={t('qty')} className="col-span-1">
          <div className="relative w-full">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={part.quantity}
              onChange={(e) => updatePart(index, 'quantity', e.target.value)}
              className={cn('h-8 @2xl:h-9 text-xs @2xl:text-sm', part.unit && 'pr-9')}
            />
            {part.unit && (
              <span className="pointer-events-none absolute right-2 top-1/2 max-w-8 -translate-y-1/2 truncate text-xs text-muted-foreground">
                {part.unit}
              </span>
            )}
          </div>
        </FieldRow>

        {/* Unit Price on mobile (paired with Quantity), in table order on desktop */}
        <FieldRow label={t('unitCost')} hint={t('unitCostHint')} className="col-span-1">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={t('unitCost')}
            title={t('unitCostHint')}
            value={part.unitCost ?? 0}
            onChange={(e) => updatePart(index, 'unitCost', e.target.value)}
            onBlur={(e) => updatePart(index, 'unitCost', e.target.value, { commit: true })}
            className="h-8 @2xl:h-9 text-xs @2xl:text-sm"
          />
        </FieldRow>

        {/* Markup Percent */}
        <FieldRow label={t('markupPercent')} hint={t('markupPercentHint')} className="col-span-1">
          <div className="relative w-full">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder={t('markupPercent')}
              title={t('markupPercentHint')}
              value={part.markupPercent ?? 0}
              onChange={(e) => updatePart(index, 'markupPercent', e.target.value)}
              className="h-8 @2xl:h-9 text-xs @2xl:text-sm pr-6"
            />
            <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </FieldRow>

        {/* Unit Price */}
        <FieldRow label={t('unitPrice')} className="col-span-1">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={part.unitPrice}
            onChange={(e) => updatePart(index, 'unitPrice', e.target.value)}
            className="h-8 @2xl:h-9 text-xs @2xl:text-sm"
          />
        </FieldRow>

        {/* Total & Delete Action */}
        <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-2 @2xl:contents">
          <span className="text-xs text-muted-foreground font-medium @2xl:hidden">{t('total')}:</span>
          <div className="flex h-8 @2xl:h-9 items-center rounded-md bg-sky-500/10 @2xl:bg-muted/50 px-2.5 @2xl:px-3 text-xs @2xl:text-sm font-semibold text-sky-700 dark:text-sky-300 @2xl:text-foreground">
            {formatCurrency(part.total, currencyCode)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 @2xl:h-9 @2xl:w-9 shrink-0 text-muted-foreground hover:text-destructive active:scale-90"
            onClick={onDelete}
            aria-label={t('deleteRow')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PartsEditor({
  partItems,
  setPartItems,
  updatePart,
  partsSubtotal,
  currencyCode,
  hasInventory,
  inventoryParts = [],
  onOpenInventory,
  onScanBarcode,
  defaultMarkupPercent = 0,
  markupAppliesToInventory = false,
}: PartsEditorProps) {
  const formatCurrency = useFormatCurrency()
  const t = useTranslations('service.parts')
  const modern = useModernWorkOrder()
  const categoryListId = useId()
  const categories = useMemo(
    () =>
      [
        ...new Set(inventoryParts.map((p) => p.category?.trim()).filter(Boolean)),
      ].sort() as string[],
    [inventoryParts]
  )
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const keyCounterRef = useRef(0)

  const handleSelectSuggestion = useCallback(
    (index: number, picked: PartSuggestion) => {
      setPartItems((prev) =>
        prev.map((row, i) => {
          if (i !== index) return row
          const { unitPrice, markupPercent } = resolvePartPrice(picked, {
            defaultMarkupPercent,
            markupAppliesToInventory,
          })
          return {
            ...row,
            name: picked.name,
            partNumber: picked.partNumber ?? '',
            unit: picked.unit ?? null,
            category: picked.category ?? null,
            unitCost: picked.unitCost,
            unitPrice,
            markupPercent,
            total: lineTotal(row.quantity, unitPrice),
            inventoryPartId: picked.id,
          }
        })
      )
    },
    [setPartItems, defaultMarkupPercent, markupAppliesToInventory]
  )
  const keysRef = useRef<string[]>([])

  while (keysRef.current.length < partItems.length) {
    keysRef.current.push(`part-${keyCounterRef.current++}`)
  }
  if (keysRef.current.length > partItems.length) {
    keysRef.current = keysRef.current.slice(0, partItems.length)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = keysRef.current.indexOf(active.id as string)
      const newIndex = keysRef.current.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return
      keysRef.current = arrayMove(keysRef.current, oldIndex, newIndex)
      setPartItems((prev) => arrayMove(prev, oldIndex, newIndex))
    },
    [setPartItems]
  )

  const addPartAtStart = useCallback(() => {
    const key = `part-${keyCounterRef.current++}`
    keysRef.current = [key, ...keysRef.current]
    setPartItems((prev) => [emptyPart(), ...prev])
  }, [setPartItems])

  const addPartAtEnd = useCallback(() => {
    const key = `part-${keyCounterRef.current++}`
    keysRef.current = [...keysRef.current, key]
    setPartItems((prev) => [...prev, emptyPart()])
  }, [setPartItems])

  const deletePart = useCallback(
    (index: number) => {
      keysRef.current = keysRef.current.filter((_, i) => i !== index)
      setPartItems((prev) => prev.filter((_, i) => i !== index))
    },
    [setPartItems]
  )

  const applyMarkupToAll = useCallback(() => {
    if (defaultMarkupPercent <= 0) return
    setPartItems((prev) =>
      prev.map((part) => {
        if (!markupAppliesToInventory && part.inventoryPartId) return part
        const cost = part.unitCost ?? 0
        if (cost <= 0) return part
        const newPrice = priceFromCostAndMarkup(cost, defaultMarkupPercent)
        return {
          ...part,
          markupPercent: defaultMarkupPercent,
          unitPrice: newPrice,
          total: lineTotal(part.quantity, newPrice),
        }
      })
    )
  }, [defaultMarkupPercent, markupAppliesToInventory, setPartItems])

  const actions = (
    <div className="flex flex-wrap gap-1.5">
      {defaultMarkupPercent > 0 && partItems.length > 0 && (
        <IconActionButton
          label={t('applyMarkup', { percent: defaultMarkupPercent })}
          icon={Percent}
          onClick={applyMarkupToAll}
        />
      )}
      {hasInventory && (
        <IconActionButton label={t('fromInventory')} icon={Package} onClick={onOpenInventory} />
      )}
      {onScanBarcode && (
        <IconActionButton label={t('scanBarcode')} icon={ScanBarcode} onClick={onScanBarcode} />
      )}
      <IconActionButton label={t('addPart')} icon={Plus} onClick={addPartAtStart} />
    </div>
  )

  const body = (
    <>
      {partItems.length > 0 && (
        <>
          <datalist id={categoryListId}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <div className="hidden grid-cols-[auto_1fr_2fr_0.6fr_0.9fr_0.7fr_0.9fr_0.9fr_auto] gap-2 text-xs font-medium text-muted-foreground @2xl:grid">
            <span className="w-6" />
            <span>{t('partNumber')}</span>
            <span>{t('name')}</span>
            <span>{t('qty')}</span>
            <span title={t('unitCostHint')}>{t('unitCost')}</span>
            <span title={t('markupPercentHint')}>{t('markupPercent')}</span>
            <span>{t('unitPrice')}</span>
            <span>{t('total')}</span>
            <span />
          </div>
          {mounted ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={keysRef.current} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5 @2xl:space-y-2">
                  {partItems.map((part, i) => (
                    <SortablePartRow
                      key={keysRef.current[i]}
                      id={keysRef.current[i]}
                      categoryListId={categoryListId}
                      part={part}
                      index={i}
                      updatePart={updatePart}
                      onDelete={() => deletePart(i)}
                      currencyCode={currencyCode}
                      t={t}
                      dragEnabled
                      inventoryParts={inventoryParts}
                      onSelectSuggestion={handleSelectSuggestion}
                      defaultMarkupPercent={defaultMarkupPercent}
                      markupAppliesToInventory={markupAppliesToInventory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2.5 @2xl:space-y-2">
              {partItems.map((part, i) => (
                <SortablePartRow
                  categoryListId={categoryListId}
                  key={keysRef.current[i]}
                  id={keysRef.current[i]}
                  part={part}
                  index={i}
                  updatePart={updatePart}
                  onDelete={() => deletePart(i)}
                  currencyCode={currencyCode}
                  t={t}
                  dragEnabled={false}
                  inventoryParts={inventoryParts}
                  onSelectSuggestion={handleSelectSuggestion}
                  defaultMarkupPercent={defaultMarkupPercent}
                  markupAppliesToInventory={markupAppliesToInventory}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-500/30 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-sky-500/60 hover:bg-sky-500/5 hover:text-sky-600 active:scale-[0.99]"
            onClick={addPartAtEnd}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('addPart')}</span>
          </button>
          {partItems.some((p) => !p.name.trim() && partRowHasContent(p)) && (
            <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              {t('nameMissingHint')}
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

      {partItems.length === 0 && (
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-lg border border-dashed border-sky-500/30 py-3 text-muted-foreground transition-all hover:border-sky-500/60 hover:bg-sky-500/5 hover:text-sky-600 active:scale-95"
          onClick={addPartAtEnd}
        >
          <Plus className="mr-1 h-4 w-4 text-sky-500" />
          <span className="text-sm">{t('addPart')}</span>
        </button>
      )}
    </>
  )

  if (modern) {
    return (
      <AppCard
        icon={Package}
        title={t('title')}
        badge={partItems.length || undefined}
        action={actions}
        className="@container overflow-visible before:rounded-lg after:rounded-lg border-sky-500/20"
        contentClassName="space-y-2 px-3 sm:px-4"
      >
        {body}
      </AppCard>
    )
  }

  return (
    <div className="@container space-y-3 rounded-xl border border-sky-500/20 bg-card p-3 sm:p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Package className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{t('title')}</h3>
        </div>
        {actions}
      </div>
      {body}
    </div>
  )
}
