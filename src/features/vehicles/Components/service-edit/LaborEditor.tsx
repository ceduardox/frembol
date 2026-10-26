'use client'

import { isShopFeeLine } from '@/features/settings/Lib/shopFee'
import { ShopFeeTag, useShopFeeLocked } from '@/features/settings/Components/ShopFeeTag'
import { useRef, useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Eye, GripVertical, Layers, Plus, Trash2, Wrench } from 'lucide-react'
import { IconActionButton } from '@/components/icon-action-button'
import { FieldRow } from '@/components/line-item-field'
import { cn } from '@/lib/utils'
import { AppCard } from '@/components/app-card'
import { useModernWorkOrder } from '@/components/work-order-layout-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getCurrencySymbol } from '@/lib/format'
import { laborRowHasContent } from '@/features/vehicles/Lib/validateServiceForm'
import { useFormatCurrency, useCurrencySettings } from '@/components/currency-settings-context'
import { useTranslations } from 'next-intl'
import type { ServiceLaborInput } from '@/features/vehicles/Schema/serviceSchema'
import { makeEmptyLabor, makeEmptyService } from './form-types'
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

interface LaborEditorProps {
  laborItems: ServiceLaborInput[]
  setLaborItems: React.Dispatch<React.SetStateAction<ServiceLaborInput[]>>
  updateLabor: (index: number, field: keyof ServiceLaborInput, value: string | number) => void
  laborSubtotal: number
  currencyCode: string
  defaultLaborRate: number
  hasPresets?: boolean
  onOpenPresets?: () => void
  onAddFinding?: () => void
  openObservationsCount?: number
  onShowExistingObservations?: () => void
  /** Overrides the card title, e.g. "Wash services" for a car wash. */
  title?: string
}

function SortableLaborRow({
  id,
  labor,
  index,
  updateLabor,
  onDelete,
  currencyCode,
  rateLabel,
  t,
  dragEnabled,
}: {
  id: string
  labor: ServiceLaborInput
  index: number
  updateLabor: (index: number, field: keyof ServiceLaborInput, value: string | number) => void
  onDelete: () => void
  currencyCode: string
  /** Pre-formatted "Rate (kr/hr)" header, which needs the currency symbol. */
  rateLabel: string
  t: (key: string) => string
  dragEnabled: boolean
}) {
  const formatCurrency = useFormatCurrency()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  // Hours or a rate with nothing said about them: the row is meant, and until
  // it is described the job cannot be saved.
  const descriptionMissing = laborRowHasContent(labor) && !labor.description.trim()

  const style = dragEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined

  const isService = labor.pricingType === 'service'
  const isFee = isShopFeeLine(labor)
  const feeLocked = useShopFeeLocked()

  return (
    <div
      ref={dragEnabled ? setNodeRef : undefined}
      style={style}
      className={cn(
        // Stacked card while the editor is narrow, one table row once its
        // container is wide enough to hold every column at a usable size
        'grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs hover:border-amber-500/30 transition-all',
        '@2xl:grid-cols-[auto_2fr_1fr_1fr_1fr_auto] @2xl:rounded-none @2xl:border-0 @2xl:p-0',
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
        {/* Description & Type Tag */}
        <div className="col-span-2 flex gap-2 @2xl:col-span-1">
          <Textarea
            placeholder={t('descriptionPlaceholder')}
            value={labor.description}
            onChange={(e) => updateLabor(index, 'description', e.target.value)}
            rows={1}
            aria-invalid={descriptionMissing}
            className={cn(
              'min-h-9 flex-1 resize-none font-medium text-sm',
              descriptionMissing && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          {isFee ? (
            <ShopFeeTag />
          ) : (
            <button
              type="button"
              className={cn(
                'shrink-0 rounded-md border px-2.5 text-[10px] font-semibold transition-all active:scale-95',
                isService
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:border-blue-500/50 dark:text-blue-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:border-amber-500/50 dark:text-amber-400'
              )}
              onClick={() => {
                const next = isService ? 'hourly' : 'service'
                updateLabor(index, 'pricingType', next)
                // A service is a count, and one is the useful starting point.
                if (next === 'service' && (!labor.hours || labor.hours <= 0)) {
                  updateLabor(index, 'hours', 1)
                }
              }}
              title={isService ? t('serviceHint') : t('hourlyHint')}
            >
              {isService ? t('serviceTag') : t('hourlyTag')}
            </button>
          )}
        </div>
        <FieldRow label={isService || isFee ? t('qty') : t('hours')} className="col-span-1">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step={isService || isFee ? '1' : 'any'}
            placeholder={isService || isFee ? t('qty') : t('hours')}
            value={labor.hours}
            disabled={isFee}
            onChange={(e) => updateLabor(index, 'hours', e.target.value)}
            className="h-8 @2xl:h-9 text-xs @2xl:text-sm"
          />
        </FieldRow>
        <FieldRow label={rateLabel} className="col-span-1">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={labor.rate}
            disabled={isFee && feeLocked}
            onChange={(e) => updateLabor(index, 'rate', e.target.value)}
            className="h-8 @2xl:h-9 text-xs @2xl:text-sm"
          />
        </FieldRow>
        <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-2 @2xl:contents">
          <span className="text-xs text-muted-foreground font-medium @2xl:hidden">
            {t('total')}:
          </span>
          <div className="flex h-8 @2xl:h-9 items-center rounded-md bg-amber-500/10 @2xl:bg-muted/50 px-2.5 @2xl:px-3 text-xs @2xl:text-sm font-semibold text-amber-700 dark:text-amber-300 @2xl:text-foreground">
            {formatCurrency(labor.total, currencyCode)}
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

export function LaborEditor({
  laborItems,
  setLaborItems,
  updateLabor,
  laborSubtotal,
  currencyCode,
  defaultLaborRate,
  hasPresets,
  onOpenPresets,
  onAddFinding,
  openObservationsCount = 0,
  onShowExistingObservations,
  title: titleOverride,
}: LaborEditorProps) {
  const t = useTranslations('service.labor')
  const modern = useModernWorkOrder()
  const formatCurrency = useFormatCurrency()
  const { currencyFormat } = useCurrencySettings()
  const cs = getCurrencySymbol(currencyCode, currencyFormat)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const keyCounterRef = useRef(0)
  const keysRef = useRef<string[]>([])

  // Keep keys array in sync with items length
  while (keysRef.current.length < laborItems.length) {
    keysRef.current.push(`labor-${keyCounterRef.current++}`)
  }
  if (keysRef.current.length > laborItems.length) {
    keysRef.current = keysRef.current.slice(0, laborItems.length)
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
      setLaborItems((prev) => arrayMove(prev, oldIndex, newIndex))
    },
    [setLaborItems]
  )

  const addLaborAtStart = useCallback(() => {
    const key = `labor-${keyCounterRef.current++}`
    keysRef.current = [key, ...keysRef.current]
    setLaborItems((prev) => [makeEmptyLabor(defaultLaborRate), ...prev])
  }, [setLaborItems, defaultLaborRate])

  const addServiceAtStart = useCallback(() => {
    const key = `labor-${keyCounterRef.current++}`
    keysRef.current = [key, ...keysRef.current]
    setLaborItems((prev) => [makeEmptyService(), ...prev])
  }, [setLaborItems])

  const addLaborAtEnd = useCallback(() => {
    const key = `labor-${keyCounterRef.current++}`
    keysRef.current = [...keysRef.current, key]
    setLaborItems((prev) => [...prev, makeEmptyLabor(defaultLaborRate)])
  }, [setLaborItems, defaultLaborRate])

  const addServiceAtEnd = useCallback(() => {
    const key = `labor-${keyCounterRef.current++}`
    keysRef.current = [...keysRef.current, key]
    setLaborItems((prev) => [...prev, makeEmptyService()])
  }, [setLaborItems])

  const deleteLabor = useCallback(
    (index: number) => {
      keysRef.current = keysRef.current.filter((_, j) => j !== index)
      setLaborItems((prev) => prev.filter((_, j) => j !== index))
    },
    [setLaborItems]
  )

  const actions = (
    <div className="flex flex-wrap gap-1.5">
      {hasPresets && onOpenPresets && (
        <IconActionButton label={t('fromPresets')} icon={Layers} onClick={onOpenPresets} />
      )}
      <IconActionButton data-add-row label={t('addLabor')} icon={Plus} onClick={addLaborAtStart} />
      <IconActionButton
        data-add-service
        label={t('addService')}
        icon={Wrench}
        onClick={addServiceAtStart}
      />
      {onAddFinding && openObservationsCount > 0 && onShowExistingObservations ? (
        <DropdownMenu>
          {/* Plain button with a native tooltip: a Radix dropdown trigger
              cannot wrap a Tooltip root, only the button inside it */}
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="relative"
              aria-label={t('addFinding')}
              title={t('addFinding')}
            >
              <AlertTriangle className="size-4" />
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
                {openObservationsCount}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                onAddFinding()
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('newObservation')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                onShowExistingObservations()
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('addExisting', { count: openObservationsCount })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : onAddFinding ? (
        <IconActionButton label={t('addFinding')} icon={AlertTriangle} onClick={onAddFinding} />
      ) : null}
    </div>
  )

  const body = (
    <>
      {laborItems.length > 0 && (
        <>
          <div className="hidden grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground @2xl:grid">
            <span className="w-6" />
            <span>{t('description')}</span>
            <span>{t('qtyOrHours')}</span>
            <span>{t('rate', { currency: cs })}</span>
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
                {laborItems.map((labor, i) => (
                  <SortableLaborRow
                    key={keysRef.current[i]}
                    id={keysRef.current[i]}
                    labor={labor}
                    index={i}
                    updateLabor={updateLabor}
                    onDelete={() => deleteLabor(i)}
                    currencyCode={currencyCode}
                    rateLabel={t('rate', { currency: cs })}
                    t={t}
                    dragEnabled
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            laborItems.map((labor, i) => (
              <SortableLaborRow
                key={keysRef.current[i]}
                id={keysRef.current[i]}
                labor={labor}
                index={i}
                updateLabor={updateLabor}
                onDelete={() => deleteLabor(i)}
                currencyCode={currencyCode}
                rateLabel={t('rate', { currency: cs })}
                t={t}
                dragEnabled={false}
              />
            ))
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-lg border border-dashed border-amber-500/30 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/50 transition-all active:scale-[0.99]"
            data-add-row
            onClick={addLaborAtEnd}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>{t('addLabor')}</span>
          </button>
          {laborItems.some((l) => !l.description.trim() && laborRowHasContent(l)) && (
            <p className="text-xs text-destructive">{t('descriptionMissingHint')}</p>
          )}
          <div className="flex justify-end pt-1 text-sm">
            <span className="font-medium">
              {t('subtotal', { amount: formatCurrency(laborSubtotal, currencyCode) })}
            </span>
          </div>
        </>
      )}

      {laborItems.length === 0 && (
        <div className="flex flex-col sm:flex-row gap-2.5 p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-background/80 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300 shadow-2xs hover:bg-amber-500/10 transition-all active:scale-[0.98]"
            data-add-row
            onClick={addLaborAtEnd}
          >
            <Plus className="h-4 w-4" />
            <span>{t('addLabor')}</span>
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-background/80 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 shadow-2xs hover:bg-blue-500/10 transition-all active:scale-[0.98]"
            onClick={addServiceAtEnd}
          >
            <Wrench className="h-4 w-4" />
            <span>{t('addService')}</span>
          </button>
        </div>
      )}
    </>
  )

  if (modern) {
    return (
      <AppCard
        icon={Wrench}
        title={titleOverride ?? t('title')}
        badge={laborItems.length || undefined}
        action={actions}
        className="@container"
        contentClassName="space-y-2 px-3"
      >
        {body}
      </AppCard>
    )
  }

  return (
    // Sizes itself off its own container: the details view splits into two
    // resizable columns, so this editor can be narrower on a wide screen than
    // it is on a phone.
    <div className="@container space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titleOverride ?? t('title')}</h3>
        {actions}
      </div>
      {body}
    </div>
  )
}
