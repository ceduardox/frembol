'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteWashService, saveWashService } from '@/features/wash/Actions/washActions'
import { cn } from '@/lib/utils'

const CLASSES = ['auto', 'suv', 'pickup', 'motorcycle', 'lightTruck', 'heavyTruck', 'other'] as const

interface Row {
  id?: string
  name: string
  prices: Record<string, number>
}

function rowFrom(service: { id: string; name: string; prices: unknown }): Row {
  const prices = (service.prices ?? {}) as Record<string, number>
  return {
    id: service.id,
    name: service.name,
    prices: Object.fromEntries(CLASSES.map((code) => [code, Number(prices[code] ?? 0)])),
  }
}

function blankRow(): Row {
  return {
    name: '',
    prices: Object.fromEntries(CLASSES.map((code) => [code, 0])),
  }
}

export function WashSettings({
  initial,
}: {
  initial: { id: string; name: string; prices: unknown }[]
}) {
  const t = useTranslations('service.wash')
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(() => initial.map(rowFrom))
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const patch = (index: number, change: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)))
  }

  const save = async (index: number) => {
    const row = rows[index]
    if (!row.name.trim()) {
      toast.error(t('serviceName'))
      return
    }
    const key = row.id ?? `new-${index}`
    setSaving(key)
    const result = await saveWashService({
      id: row.id,
      name: row.name.trim(),
      prices: row.prices,
    })
    setSaving(null)
    if (!result.success) {
      toast.error(result.error || t('saveFailed'))
      return
    }
    if (!row.id && result.data?.id) patch(index, { id: result.data.id })
    setSaved(key)
    setTimeout(() => setSaved(null), 1500)
    router.refresh()
  }

  const remove = async (index: number) => {
    const row = rows[index]
    if (row.id) {
      const result = await deleteWashService(row.id)
      if (!result.success) {
        toast.error(result.error || t('saveFailed'))
        return
      }
    }
    setRows((prev) => prev.filter((_, i) => i !== index))
    router.refresh()
  }

  return (
    <AppCard
      icon={Plus}
      title={t('catalogTitle')}
      description={t('catalogDescription')}
      contentClassName="space-y-3"
    >
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('noServices')}</p>
      )}

      {rows.map((row, index) => {
        const key = row.id ?? `new-${index}`
        return (
          <div key={key} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={row.name}
                onChange={(e) => patch(index, { name: e.target.value })}
                placeholder={t('serviceName')}
                className="h-10 min-w-48 flex-1"
              />
              <Button
                type="button"
                onClick={() => void save(index)}
                disabled={saving !== null}
                className="h-10"
              >
                {saving === key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saved === key ? t('savedService') : t('saveService')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void remove(index)}
                disabled={saving !== null}
                className={cn('h-10', saved === key && '')}
                aria-label={t('deleteService')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CLASSES.map((code) => (
                <div key={code} className="space-y-1">
                  <Label className="text-xs">{t(`vehicleClassOptions.${code}`)}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.prices[code] ?? 0}
                    onChange={(e) =>
                      patch(index, {
                        prices: { ...row.prices, [code]: Number(e.target.value) || 0 },
                      })
                    }
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={() => setRows((prev) => [...prev, blankRow()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('addService')}
      </Button>
    </AppCard>
  )
}
