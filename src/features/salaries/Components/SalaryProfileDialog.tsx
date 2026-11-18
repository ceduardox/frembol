'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { updateSalaryProfile } from '../Actions/salaryActions'
import type { SalaryProfileView } from '../Lib/types'

export function SalaryProfileDialog({
  open,
  onOpenChange,
  profile,
  currencyCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SalaryProfileView
  currencyCode: string
}) {
  const t = useTranslations('common.salaries')
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [cycleType, setCycleType] = useState<'monthly' | 'days30'>('monthly')
  const [cycleDay, setCycleDay] = useState('1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(String(profile.monthlyAmount || ''))
    setStartDate(profile.startDate || '')
    setCycleType(profile.cycleType === 'days30' ? 'days30' : 'monthly')
    setCycleDay(String(profile.cycleDay || 1))
  }, [open, profile])

  const save = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error(t('invalidAmount'))
      return
    }
    setSaving(true)
    const result = await updateSalaryProfile({
      id: profile.id,
      monthlyAmount: parsedAmount,
      startDate,
      cycleType,
      cycleDay: Number(cycleDay),
    })
    setSaving(false)
    if (!result.success) {
      toast.error(result.error || t('saveFailed'))
      return
    }
    toast.success(t('saved'))
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('configureTitle', { name: profile.name })}</DialogTitle>
          <DialogDescription>{t('configureDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary-amount">
                {t('monthlySalary')} ({currencyCode})
              </Label>
              <Input
                id="salary-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="3500.00"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-start">{t('startDate')}</Label>
              <DateInput
                id="salary-start"
                name="salaryStartDate"
                value={startDate}
                onChange={setStartDate}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('cycle')}</Label>
              <Select
                value={cycleType}
                onValueChange={(value) => setCycleType(value as 'monthly' | 'days30')}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('cycleMonthly')}</SelectItem>
                  <SelectItem value="days30">{t('cycleDays30')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cycleType === 'monthly' && (
              <div className="space-y-2">
                <Label htmlFor="salary-cycle-day">{t('cycleDay')}</Label>
                <Select
                  value={cycleDay}
                  onValueChange={setCycleDay}
                  disabled={saving}
                >
                  <SelectTrigger id="salary-cycle-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {t('cycleDayValue', { day })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            {cycleType === 'monthly' ? t('cycleMonthlyHint') : t('cycleDays30Hint')}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
