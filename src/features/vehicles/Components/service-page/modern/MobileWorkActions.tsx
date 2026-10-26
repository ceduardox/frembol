'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Save, ListChecks, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  SYSTEM_STATUSES,
  type WorkOrderStatusOption,
} from '@/features/work-order-statuses/Lib/stages'
import { statusMessageKeys } from '../../service-detail/types'

export function MobileWorkActions({
  status,
  customStatus,
  options = [],
  onChange,
  saving,
  dirty,
  locked,
  hideSystemStatuses = false,
}: {
  status: string
  customStatus: { id: string; name: string } | null
  options?: WorkOrderStatusOption[]
  onChange: (status: string, custom: WorkOrderStatusOption | null) => Promise<void>
  saving: boolean
  dirty: boolean
  locked: boolean
  /** Wash and part jobs use the shop's own statuses, not Pending/In progress. */
  hideSystemStatuses?: boolean
}) {
  const t = useTranslations('service')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const value = customStatus ? 'custom:' + customStatus.id : status
  // Without statuses of its own, a wash or a part job keeps the plain save row.
  const canChangeStatus = !hideSystemStatuses || options.length > 0
  const selectValue = hideSystemStatuses && !customStatus ? '' : value
  return (
    <>
      <div
        data-testid="mobile-work-actions"
        className="shrink-0 border-t bg-background/95 px-3 py-2.5 backdrop-blur md:hidden"
      >
        <p
          role="status"
          aria-live="polite"
          className="mb-2 flex items-center gap-2 text-sm font-medium"
        >
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              saving || dirty ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
          {saving ? t('mobileWork.saving') : dirty ? t('header.unsavedChanges') : t('header.saved')}
        </p>
        <div className={cn('grid gap-2', canChangeStatus ? 'grid-cols-2' : 'grid-cols-1')}>
          {canChangeStatus && (
            <Button
              type="button"
              variant="outline"
              className="h-12 min-w-0 px-2 text-sm"
              onClick={() => setOpen(true)}
              disabled={busy}
            >
              <ListChecks className="size-5 shrink-0" />
              {t('mobileWork.changeStatus')}
            </Button>
          )}
          <Button
            type="submit"
            form="service-record-form"
            className="h-12 min-w-0 px-3 text-base font-semibold"
            disabled={saving || locked || !dirty}
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
            {t('header.save')}
          </Button>
        </div>
      </div>
      {canChangeStatus && (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('mobileWork.changeStatus')}</DialogTitle>
            <DialogDescription>{t('mobileWork.statusHelp')}</DialogDescription>
          </DialogHeader>
          <select
            aria-label={t('mobileWork.changeStatus')}
            value={selectValue}
            disabled={busy}
            className="h-12 w-full rounded-md border bg-background px-3 text-base"
            onChange={async (e) => {
              const chosen = e.target.value
              const custom = options.find((item) => 'custom:' + item.id === chosen) ?? null
              setBusy(true)
              try {
                await onChange(custom?.stage ?? chosen, custom)
                setOpen(false)
              } finally {
                setBusy(false)
              }
            }}
          >
            {hideSystemStatuses && !customStatus && (
              <option value="" disabled>
                {t('mobileWork.chooseStatus')}
              </option>
            )}
            {customStatus && !options.some((item) => item.id === customStatus.id) && (
              <option value={value}>{customStatus.name}</option>
            )}
            {!hideSystemStatuses &&
              SYSTEM_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {t('basicInfo.statusOptions.' + statusMessageKeys[item])}
                </option>
              ))}
            {options.map((item) => (
              <option key={item.id} value={'custom:' + item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {dirty && <p className="text-sm text-muted-foreground">{t('mobileWork.saveHelp')}</p>}
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}
