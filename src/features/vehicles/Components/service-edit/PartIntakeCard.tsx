'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Disc3, Loader2, Package, Plus, Save, Trash2 } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { savePartIntake } from '@/features/vehicles/Actions/savePartIntake'
import type { ServiceDetail } from '../service-detail/types'

type PartIntakeData = NonNullable<ServiceDetail['partIntake']>
type PartItem = {
  description: string
  brand: string
  serial: string
  condition: string
  accessories: string
}

const CONDITIONS = ['good', 'worn', 'damaged'] as const
const EMPTY_ITEM: PartItem = {
  description: '',
  brand: '',
  serial: '',
  condition: '',
  accessories: '',
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function itemsFromInitial(initial: PartIntakeData | null): PartItem[] {
  if (Array.isArray(initial?.items) && initial.items.length > 0) {
    return initial.items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        description: stringValue(item.description),
        brand: stringValue(item.brand),
        serial: stringValue(item.serial),
        condition: stringValue(item.condition),
        accessories: stringValue(item.accessories),
      }))
  }
  if (initial?.description) {
    return [
      {
        description: initial.description,
        brand: initial.brand ?? '',
        serial: initial.serial ?? '',
        condition: initial.condition ?? '',
        accessories: initial.accessories ?? '',
      },
    ]
  }
  return [{ ...EMPTY_ITEM }]
}

export function PartIntakeCard({
  serviceRecordId,
  jobKind,
  initial,
  vehiclePlate: initialVehiclePlate = '',
  locked = false,
}: {
  serviceRecordId: string
  jobKind: 'brakes' | 'parts'
  initial: PartIntakeData | null
  vehiclePlate?: string | null
  locked?: boolean
}) {
  const t = useTranslations('service.part')
  const tParts = useTranslations('service.parts')
  const tButtons = useTranslations('common.buttons')
  const tv = useTranslations('vehicles.form')
  const router = useRouter()

  const [items, setItems] = useState<PartItem[]>(() => itemsFromInitial(initial))
  const [vehiclePlate, setVehiclePlate] = useState(initialVehiclePlate ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canSave = items.some((item) => item.description.trim().length > 0)

  const updateItem = (index: number, field: keyof PartItem, value: string) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await savePartIntake({
        serviceRecordId,
        vehiclePlate: vehiclePlate.trim() || null,
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
            description: item.description.trim(),
            brand: item.brand.trim() || null,
            serial: item.serial.trim() || null,
            condition: item.condition || null,
            accessories: item.accessories.trim() || null,
          })),
      })
      if (!result.success) throw new Error(result.error || t('saveFailed'))
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppCard
      icon={jobKind === 'brakes' ? Disc3 : Package}
      title={jobKind === 'brakes' ? t('titleBrakes') : t('titlePart')}
      description={t('description')}
      contentClassName="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="part-vehicle-plate">{tv('licensePlate')}</Label>
        <Input
          id="part-vehicle-plate"
          value={vehiclePlate}
          onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
          placeholder={tv('licensePlate')}
          disabled={locked}
          className="h-10 uppercase"
          maxLength={20}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>{tParts('title')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
            disabled={locked || items.length >= 20}
          >
            <Plus className="h-3.5 w-3.5" />
            {tParts('addPart')}
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-card-edge/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('descriptionLabel')} {index + 1}
              </span>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  disabled={locked}
                  aria-label={tButtons('delete')}
                  title={tButtons('delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Input
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              disabled={locked}
              className="h-10"
              aria-label={`${t('descriptionLabel')} ${index + 1}`}
            />

            <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
              <Input
                value={item.brand}
                onChange={(e) => updateItem(index, 'brand', e.target.value)}
                placeholder={t('brandPlaceholder')}
                disabled={locked}
                className="h-10"
                aria-label={t('brand')}
              />
              <Input
                value={item.serial}
                onChange={(e) => updateItem(index, 'serial', e.target.value)}
                placeholder={t('serialPlaceholder')}
                disabled={locked}
                className="h-10"
                aria-label={t('serial')}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {CONDITIONS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={item.condition === code}
                    disabled={locked}
                    onClick={() => updateItem(index, 'condition', code)}
                    className={`min-h-10 cursor-pointer rounded-lg border px-2.5 text-sm font-medium transition-colors ${
                      item.condition === code
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-card-edge bg-background hover:bg-muted/40'
                    }`}
                  >
                    {t(`conditionOptions.${code}`)}
                  </button>
                ))}
              </div>
              <Input
                value={item.accessories}
                onChange={(e) => updateItem(index, 'accessories', e.target.value)}
                placeholder={t('accessoriesPlaceholder')}
                disabled={locked}
                className="h-10"
                aria-label={t('accessories')}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || locked || !canSave}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('save')}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            {t('saved')}
          </span>
        )}
      </div>
    </AppCard>
  )
}
