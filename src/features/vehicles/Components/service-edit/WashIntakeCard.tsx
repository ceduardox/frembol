'use client'

import {
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Droplets, Loader2, Save } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDateSettings } from '@/components/date-settings-context'
import { usePermissions } from '@/components/permissions-context'
import { useFormatCurrency } from '@/components/currency-settings-context'
import { cn } from '@/lib/utils'
import { saveWashIntake } from '@/features/vehicles/Actions/saveWashIntake'
import { getWashServices } from '@/features/wash/Actions/washActions'
import type { ServiceLaborInput } from '@/features/vehicles/Schema/serviceSchema'
import type { ServiceDetail } from '../service-detail/types'

const VEHICLE_CLASSES = [
  'auto',
  'suv',
  'pickup',
  'motorcycle',
  'lightTruck',
  'heavyTruck',
  'other',
] as const
const FUEL_LEVELS = ['empty', 'quarter', 'half', 'threeQuarters', 'full'] as const
const ACCESSORIES = ['spareTire', 'jack', 'tools', 'radio'] as const
const CONDITIONS = ['upholstery', 'paint', 'looseParts', 'glass'] as const
const ARRIVAL_STATES = ['clean', 'regular', 'dirty', 'veryDirty'] as const

type WashIntakeData = NonNullable<ServiceDetail['washIntake']>
type WashServiceRow = { id: string; name: string; prices: unknown }

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function Choice({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-card-edge bg-background hover:bg-muted/40',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {children}
    </button>
  )
}

function CheckRow({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      {label}
    </label>
  )
}

export function WashIntakeCard({
  serviceRecordId,
  initial,
  promisedAt,
  locked = false,
  currencyCode,
  laborItems,
  setLaborItems,
}: {
  serviceRecordId: string
  initial: WashIntakeData | null
  promisedAt: string | null
  locked?: boolean
  currencyCode: string
  laborItems: ServiceLaborInput[]
  setLaborItems: Dispatch<SetStateAction<ServiceLaborInput[]>>
}) {
  const t = useTranslations('service.wash')
  const router = useRouter()
  const { timezone } = useDateSettings()
  const { canManageSettings } = usePermissions()
  const formatCurrency = useFormatCurrency()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [services, setServices] = useState<WashServiceRow[]>([])
  useEffect(() => {
    let cancelled = false
    getWashServices()
      .then((result) => {
        if (!cancelled && result.success && result.data) {
          setServices(result.data as WashServiceRow[])
        }
      })
      .catch(() => {
        /* the catalog is optional until somebody configures it */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const [vehicleClass, setVehicleClass] = useState(initial?.vehicleClass ?? '')
  const [vehicleClassOther, setVehicleClassOther] = useState(initial?.vehicleClassOther ?? '')
  const [fuelLevel, setFuelLevel] = useState(initial?.fuelLevel ?? '')
  const [accessories, setAccessories] = useState(stringList(initial?.accessories))
  const [accessoriesOther, setAccessoriesOther] = useState(initial?.accessoriesOther ?? '')
  const [conditions, setConditions] = useState(stringList(initial?.conditions))
  const [conditionsOther, setConditionsOther] = useState(initial?.conditionsOther ?? '')
  const [arrivalState, setArrivalState] = useState(initial?.arrivalState ?? '')
  const [scratches, setScratches] = useState(initial?.scratches ?? '')
  const [authorizedExtra, setAuthorizedExtra] = useState(initial?.authorizedExtra ?? '')
  const [authorizedBy, setAuthorizedBy] = useState(initial?.authorizedBy ?? '')
  const [promised, setPromised] = useState<Date | undefined>(
    promisedAt ? new Date(promisedAt) : undefined
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggle = (list: string[], code: string, on: boolean) =>
    on ? [...list, code] : list.filter((item) => item !== code)

  const priceFor = (service: WashServiceRow) => {
    const prices = (service.prices ?? {}) as Record<string, number>
    return vehicleClass ? Number(prices[vehicleClass] ?? 0) : 0
  }

  const isSelected = (service: WashServiceRow) =>
    laborItems.some(
      (line) => line.pricingType === 'service' && line.description === service.name
    )

  const toggleService = (service: WashServiceRow) => {
    const price = priceFor(service)
    setLaborItems((prev) => {
      const exists = prev.some(
        (line) => line.pricingType === 'service' && line.description === service.name
      )
      if (exists) {
        return prev.filter(
          (line) => !(line.pricingType === 'service' && line.description === service.name)
        )
      }
      return [
        ...prev,
        {
          description: service.name,
          hours: 1,
          rate: price,
          total: price,
          pricingType: 'service' as const,
        },
      ]
    })
  }

  const chooseVehicleClass = (code: string) => {
    setVehicleClass(code)
    setLaborItems((prev) =>
      prev.map((line) => {
        if (line.pricingType !== 'service') return line
        const service = services.find((item) => item.name === line.description)
        if (!service) return line
        const prices = (service.prices ?? {}) as Record<string, number>
        const price = Number(prices[code] ?? 0)
        const hours = line.hours || 1
        return { ...line, rate: price, total: Math.round(price * hours * 100) / 100 }
      })
    )
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await saveWashIntake({
        serviceRecordId,
        vehicleClass: vehicleClass || null,
        vehicleClassOther: vehicleClassOther || null,
        fuelLevel: fuelLevel || null,
        accessories,
        accessoriesOther: accessoriesOther || null,
        conditions,
        conditionsOther: conditionsOther || null,
        arrivalState: arrivalState || null,
        scratches: scratches || null,
        authorizedExtra: authorizedExtra || null,
        authorizedBy: authorizedBy || null,
        promisedAt: promised ? promised.toISOString() : null,
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
      icon={Droplets}
      title={t('title')}
      description={t('description')}
      contentClassName="space-y-5"
    >
      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('vehicleClass')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {VEHICLE_CLASSES.map((code) => (
              <Choice
                key={code}
                active={vehicleClass === code}
                disabled={locked}
                onClick={() => chooseVehicleClass(code)}
              >
                {t(`vehicleClassOptions.${code}`)}
              </Choice>
            ))}
          </div>
          {vehicleClass === 'other' && (
            <Input
              value={vehicleClassOther}
              onChange={(e) => setVehicleClassOther(e.target.value)}
              placeholder={t('otherPlaceholder')}
              disabled={locked}
              className="h-10"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('fuel')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {FUEL_LEVELS.map((code) => (
              <Choice
                key={code}
                active={fuelLevel === code}
                disabled={locked}
                onClick={() => setFuelLevel(code)}
              >
                {t(`fuelOptions.${code}`)}
              </Choice>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('accessories')}</Label>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {ACCESSORIES.map((code) => (
              <CheckRow
                key={code}
                checked={accessories.includes(code)}
                disabled={locked}
                onChange={(on) => setAccessories((prev) => toggle(prev, code, on))}
                label={t(`accessoryOptions.${code}`)}
              />
            ))}
          </div>
          <Input
            value={accessoriesOther}
            onChange={(e) => setAccessoriesOther(e.target.value)}
            placeholder={t('otherPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('conditions')}</Label>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {CONDITIONS.map((code) => (
              <CheckRow
                key={code}
                checked={conditions.includes(code)}
                disabled={locked}
                onChange={(on) => setConditions((prev) => toggle(prev, code, on))}
                label={t(`conditionOptions.${code}`)}
              />
            ))}
          </div>
          <Input
            value={conditionsOther}
            onChange={(e) => setConditionsOther(e.target.value)}
            placeholder={t('otherPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('arrivalState')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {ARRIVAL_STATES.map((code) => (
              <Choice
                key={code}
                active={arrivalState === code}
                disabled={locked}
                onClick={() => setArrivalState(code)}
              >
                {t(`arrivalOptions.${code}`)}
              </Choice>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('delivery')}</Label>
          {mounted ? (
            <DateTimePicker
              value={promised}
              onChange={setPromised}
              timeZone={timezone}
              granularity="minute"
              hourCycle={24}
              placeholder={t('deliveryPlaceholder')}
              displayFormat={{ hour24: 'PPP HH:mm' }}
            />
          ) : (
            <div className="h-9 rounded-md border" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('servicesTitle')}</Label>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('servicesEmpty')}{' '}
            {canManageSettings ? (
              <Link href="/settings/wash" className="underline underline-offset-2">
                {t('servicesConfigure')}
              </Link>
            ) : null}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg border border-card-edge px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <Checkbox
                    checked={isSelected(service)}
                    disabled={locked}
                    onCheckedChange={() => toggleService(service)}
                  />
                  <span className="truncate">{service.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(priceFor(service), currencyCode)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wash-scratches">{t('scratches')}</Label>
        <Textarea
          id="wash-scratches"
          value={scratches}
          onChange={(e) => setScratches(e.target.value)}
          placeholder={t('scratchesPlaceholder')}
          disabled={locked}
          className="min-h-20 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wash-extra">{t('authorizedExtra')}</Label>
          <Textarea
            id="wash-extra"
            value={authorizedExtra}
            onChange={(e) => setAuthorizedExtra(e.target.value)}
            placeholder={t('authorizedExtraPlaceholder')}
            disabled={locked}
            className="min-h-16 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wash-authorized-by">{t('authorizedBy')}</Label>
          <Input
            id="wash-authorized-by"
            value={authorizedBy}
            onChange={(e) => setAuthorizedBy(e.target.value)}
            placeholder={t('authorizedByPlaceholder')}
            disabled={locked}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || locked}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
