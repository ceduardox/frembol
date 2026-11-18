'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { addSalaryEntry } from '../Actions/salaryActions'
import { todayIso } from '../Lib/salaryPeriod'
import type { SalaryEntryType, SalaryProfileView } from '../Lib/types'

export type SalaryEntryMode = 'advance' | 'deduction' | 'payment'

export function SalaryEntryDialog({
  open,
  onOpenChange,
  profile,
  mode,
  pending,
  currencyCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SalaryProfileView
  mode: SalaryEntryMode
  pending: number
  currencyCode: string
}) {
  const t = useTranslations('common.salaries')
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [category, setCategory] = useState<'absence' | 'other'>('absence')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(mode === 'payment' && pending > 0 ? String(pending) : '')
    setDate(todayIso())
    setCategory('absence')
    setNote('')
    if (fileRef.current) fileRef.current.value = ''
  }, [open, mode, pending])

  const submit = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('invalidAmount'))
      return
    }

    setSaving(true)
    const result = await addSalaryEntry({
      profileId: profile.id,
      type: mode as SalaryEntryType,
      amount: parsedAmount,
      effectiveDate: date,
      category: mode === 'deduction' ? category : undefined,
      note: note.trim() || undefined,
    })

    if (!result.success || !result.data) {
      setSaving(false)
      toast.error(result.error || t('saveFailed'))
      return
    }

    const entryId = result.data.id
    const file = fileRef.current?.files?.[0]
    if (mode === 'advance' && file) {
      const body = new FormData()
      body.append('file', file)
      const upload = await fetch(`/api/protected/salaries/entries/${entryId}/receipt`, {
        method: 'POST',
        body,
      })
      if (!upload.ok) toast.error(t('receiptUploadFailed'))
    }

    setSaving(false)
    toast.success(t('entryAdded'))
    onOpenChange(false)
    router.refresh()

    if (mode === 'payment') {
      const link = document.createElement('a')
      link.href = `/api/protected/salaries/entries/${entryId}/receipt-pdf`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const title =
    mode === 'advance'
      ? t('addAdvance')
      : mode === 'deduction'
        ? t('addDeduction')
        : t('registerPayment')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('entryFor', { name: profile.name })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary-entry-amount">
                {t('amount')} ({currencyCode})
              </Label>
              <Input
                id="salary-entry-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-entry-date">{t('date')}</Label>
              <DateInput
                id="salary-entry-date"
                name="salaryEntryDate"
                value={date}
                onChange={setDate}
                className="h-10"
              />
            </div>
          </div>

          {mode === 'deduction' && (
            <div className="space-y-2">
              <Label>{t('reason')}</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as 'absence' | 'other')}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="absence">{t('absence')}</SelectItem>
                  <SelectItem value="other">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="salary-entry-note">{t('note')}</Label>
            <Textarea
              id="salary-entry-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('notePlaceholder')}
              rows={2}
              disabled={saving}
            />
          </div>

          {mode === 'advance' && (
            <div className="space-y-2">
              <Label htmlFor="salary-receipt-image">{t('receiptImage')}</Label>
              <Input
                id="salary-receipt-image"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
              />
              <p className="text-muted-foreground text-xs">{t('receiptImageHint')}</p>
            </div>
          )}

          {mode === 'payment' && (
            <p className="text-muted-foreground text-xs">
              {t('paymentHint', { amount: pending.toFixed(2) })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'payment' ? t('registerPayment') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
