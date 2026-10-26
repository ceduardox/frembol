'use client'

import { useTranslations } from 'next-intl'
import { Wrench, Disc3, Droplets, type LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePermissions } from '@/components/permissions-context'
import { PermissionSubject } from '@/lib/permissions'
import { cn } from '@/lib/utils'

export type NewWorkKind = 'mechanics' | 'brakes' | 'wash'

/**
 * Which kinds of work this account may start. KISS: the chooser only offers
 * what the role allows, and a role with one option never sees the chooser.
 */
export function useNewWorkOptions(): NewWorkKind[] {
  const { canCreate } = usePermissions()
  const options: NewWorkKind[] = []
  // Mechanics is gated by "Work orders: Create", not the underlying service
  // permission every order needs to save. That keeps a wash-only role from
  // seeing the mechanics option just because it can edit its own orders.
  if (canCreate(PermissionSubject.WORK_ORDERS)) options.push('mechanics')
  if (canCreate(PermissionSubject.BRAKES)) options.push('brakes')
  if (canCreate(PermissionSubject.WASH)) options.push('wash')
  return options
}

const KIND_META: Record<
  NewWorkKind,
  { icon: LucideIcon; className: string; iconClassName: string }
> = {
  mechanics: {
    icon: Wrench,
    className: 'border-amber-500/30 bg-amber-500/5',
    iconClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  brakes: {
    icon: Disc3,
    className: 'border-rose-500/30 bg-rose-500/5',
    iconClassName: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
  wash: {
    icon: Droplets,
    className: 'border-sky-500/30 bg-sky-500/5',
    iconClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  },
}

export function NewWorkChooser({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (kind: NewWorkKind) => void
}) {
  const t = useTranslations('navigation.quickCreate')
  const options = useNewWorkOptions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('chooseTitle')}</DialogTitle>
          <DialogDescription>{t('chooseDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {options.map((kind) => {
            const meta = KIND_META[kind]
            const Icon = meta.icon
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onChoose(kind)
                }}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors active:scale-[0.99]',
                  meta.className
                )}
              >
                <span
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-lg',
                    meta.iconClassName
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t(kind)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {t(`${kind}Hint`)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
