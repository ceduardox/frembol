'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDateSettings } from '@/components/date-settings-context'
import { addServiceTask } from '@/features/vehicles/Actions/serviceTaskActions'

type Area = 'vehicle' | 'brakes' | 'wash' | 'parts'
type Technician = { id: string; name: string; color?: string | null; specialties?: string[] }

const AREAS: Area[] = ['vehicle', 'brakes', 'wash', 'parts']

export function AddVisitWorkDialog({
  open,
  onOpenChange,
  serviceRecordId,
  existingAreas,
  technicians,
  leadTechnicianId,
  leadTechnicianName,
  currencyCode,
  locked = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceRecordId: string
  existingAreas: string[]
  technicians: Technician[]
  leadTechnicianId?: string | null
  leadTechnicianName?: string | null
  currencyCode: string
  locked?: boolean
}) {
  const t = useTranslations('service.visit')
  const tLabor = useTranslations('service.labor')
  const tPart = useTranslations('service.part')
  const tButtons = useTranslations('common.buttons')
  const { timezone } = useDateSettings()
  const router = useRouter()

  const remaining = AREAS.filter((area) => !existingAreas.includes(area))
  const [area, setArea] = useState<Area | ''>('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [technicianIds, setTechnicianIds] = useState<string[]>([])
  const [promisedAt, setPromisedAt] = useState<Date | undefined>()
  const [saving, setSaving] = useState(false)

  const leadName =
    leadTechnicianName ||
    (leadTechnicianId ? technicians.find((tech) => tech.id === leadTechnicianId)?.name : null)

  const sortedTechnicians = [...technicians].sort((a, b) => {
    const aMatch = area && a.specialties?.includes(area) ? 0 : 1
    const bMatch = area && b.specialties?.includes(area) ? 0 : 1
    return aMatch - bMatch || a.name.localeCompare(b.name)
  })

  const areaLabel = (value: string) => {
    switch (value) {
      case 'wash':
        return t('areas.wash')
      case 'brakes':
        return t('areas.brakes')
      case 'parts':
        return t('areas.parts')
      default:
        return t('areas.vehicle')
    }
  }

  useEffect(() => {
    if (!open) return
    setArea(remaining[0] ?? '')
    setDescription('')
    setPrice('')
    setTechnicianIds([])
    setPromisedAt(undefined)
  }, [open])

  const submit = async () => {
    if (!area) return
    const amount = Number(price)
    setSaving(true)
    const result = await addServiceTask({
      serviceRecordId,
      area,
      description: description.trim() || areaLabel(area),
      price: Number.isFinite(amount) && amount > 0 ? amount : undefined,
      technicianIds,
      promisedAt: promisedAt ? promisedAt.toISOString() : undefined,
    })
    setSaving(false)
    if (!result.success) {
      toast.error(result.error || t('addFailed'))
      return
    }
    toast.success(t('added', { area: areaLabel(area) }))
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addService')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('area')}</Label>
            <Select
              value={area}
              onValueChange={(value) => setArea(value as Area)}
              disabled={saving || locked}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t('addService')} />
              </SelectTrigger>
              <SelectContent>
                {remaining.map((value) => (
                  <SelectItem key={value} value={value}>
                    {areaLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-work-description">{tLabor('description')}</Label>
            <Input
              id="visit-work-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={tLabor('descriptionPlaceholder')}
              disabled={saving || locked}
              className="h-10"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visit-work-price">
                {t('price')} <span className="text-muted-foreground">({currencyCode})</span>
              </Label>
              <Input
                id="visit-work-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                disabled={saving || locked}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('areaTechnician')}</Label>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-1.5">
                {sortedTechnicians.map((technician) => {
                  const checked = technicianIds.includes(technician.id)
                  const specialties = technician.specialties
                    ?.map((specialty) => areaLabel(specialty))
                    .join(' · ')
                  return (
                    <label
                      key={technician.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setTechnicianIds((current) =>
                            value === true
                              ? [...current, technician.id]
                              : current.filter((id) => id !== technician.id)
                          )
                        }
                        disabled={saving || locked}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{technician.name}</span>
                        {specialties && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {specialties}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
              {technicianIds.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('unassigned')}</p>
              )}
              {leadName && (
                <p className="text-xs text-muted-foreground">
                  {t('responsibleHint', { name: leadName })}
                </p>
              )}
              {technicians.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('noAssignable')}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tPart('delivery')}</Label>
            <DateTimePicker
              value={promisedAt}
              onChange={setPromisedAt}
              timeZone={timezone}
              granularity="minute"
              hourCycle={24}
              placeholder={tPart('deliveryPlaceholder')}
              displayFormat={{ hour24: 'PPP HH:mm' }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {tButtons('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={saving || locked || !area}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t('addService')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
