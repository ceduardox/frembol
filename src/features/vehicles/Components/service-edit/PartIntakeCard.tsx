'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Disc3, Loader2, Package, Save } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { savePartIntake } from '@/features/vehicles/Actions/savePartIntake'
import type { ServiceDetail } from '../service-detail/types'

type PartIntakeData = NonNullable<ServiceDetail['partIntake']>
const CONDITIONS = ['good', 'worn', 'damaged'] as const

export function PartIntakeCard({
  serviceRecordId,
  jobKind,
  initial,
  locked = false,
}: {
  serviceRecordId: string
  jobKind: 'brakes' | 'parts'
  initial: PartIntakeData | null
  locked?: boolean
}) {
  const t = useTranslations('service.part')
  const router = useRouter()

  const [description, setDescription] = useState(initial?.description ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [serial, setSerial] = useState(initial?.serial ?? '')
  const [condition, setCondition] = useState(initial?.condition ?? '')
  const [accessories, setAccessories] = useState(initial?.accessories ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canSave = description.trim().length > 0

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await savePartIntake({
        serviceRecordId,
        description: description || null,
        brand: brand || null,
        serial: serial || null,
        condition: condition || null,
        accessories: accessories || null,
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
        <Label htmlFor="part-description">{t('descriptionLabel')}</Label>
        <Input
          id="part-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          disabled={locked}
          className="h-11 text-base"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="part-brand">{t('brand')}</Label>
          <Input
            id="part-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t('brandPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="part-serial">{t('serial')}</Label>
          <Input
            id="part-serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder={t('serialPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('condition')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={condition === code}
                disabled={locked}
                onClick={() => setCondition(code)}
                className={`min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors ${
                  condition === code
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-card-edge bg-background hover:bg-muted/40'
                }`}
              >
                {t(`conditionOptions.${code}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="part-accessories">{t('accessories')}</Label>
          <Input
            id="part-accessories"
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            placeholder={t('accessoriesPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>
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
