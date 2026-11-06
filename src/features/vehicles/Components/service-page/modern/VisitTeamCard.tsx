'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Users } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { removeServiceTask, setTaskTechnicians } from '@/features/vehicles/Actions/serviceTaskActions'
import { useConfirm } from '@/components/confirm-dialog'
import type { ServiceDetail } from '../../service-detail/types'

type Task = NonNullable<ServiceDetail['tasks']>[number]
type Area = 'vehicle' | 'brakes' | 'wash' | 'parts'

const AREAS: Area[] = ['vehicle', 'brakes', 'wash', 'parts']

export function VisitTeamCard({
  serviceRecordId,
  tasks,
  technicians,
  locked = false,
  onAddWork,
}: {
  serviceRecordId: string
  tasks: Task[]
  technicians: { id: string; name: string; color?: string | null }[]
  locked?: boolean
  onAddWork?: () => void
}) {
  const t = useTranslations('service.visit')
  const router = useRouter()
  const [busyTask, setBusyTask] = useState<string | null>(null)
  const [removingTask, setRemovingTask] = useState<string | null>(null)
  const confirm = useConfirm()

  const areaLabel = (area: string) => {
    switch (area) {
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

  const toggleTechnician = async (task: Task, technicianId: string) => {
    const next = task.technicians.some((entry) => entry.technicianId === technicianId)
      ? task.technicians
          .filter((entry) => entry.technicianId !== technicianId)
          .map((entry) => entry.technicianId)
      : [...task.technicians.map((entry) => entry.technicianId), technicianId]

    setBusyTask(task.id)
    const result = await setTaskTechnicians({ taskId: task.id, technicianIds: next })
    setBusyTask(null)
    if (!result.success) {
      toast.error(result.error || t('saveFailed'))
      return
    }
    router.refresh()
  }

  const removeTask = async (task: Task) => {
    const ok = await confirm({
      title: t('removeAreaTitle'),
      description: t('removeAreaBody', { area: areaLabel(task.area) }),
      confirmLabel: t('removeAreaConfirm'),
      destructive: true,
    })
    if (!ok) return
    setRemovingTask(task.id)
    const result = await removeServiceTask({ taskId: task.id })
    setRemovingTask(null)
    if (!result.success) {
      toast.error(result.error || t('removeFailed'))
      return
    }
    router.refresh()
  }

  const remaining = AREAS.filter((area) => !tasks.some((task) => task.area === area))

  return (
    <AppCard
      icon={Users}
      title={t('teamTitle')}
      description={t('teamDescription')}
      contentClassName="space-y-3"
    >
      {tasks.map((task) => {
        const selected = task.technicians
          .map((entry) => entry.technician.name)
          .filter(Boolean)
          .join(', ')
        return (
          <div
            key={task.id}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{areaLabel(task.area)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selected || t('noTechnicians')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 text-xs"
                    disabled={locked || busyTask === task.id}
                  >
                    {busyTask === task.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    {selected || t('chooseTechnicians')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {technicians.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">{t('noStaff')}</p>
                    ) : (
                      technicians.map((technician) => {
                        const checked = task.technicians.some(
                          (entry) => entry.technicianId === technician.id
                        )
                        return (
                          <label
                            key={technician.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => void toggleTechnician(task, technician.id)}
                              disabled={locked || busyTask === task.id}
                            />
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: technician.color || '#64748b' }}
                            />
                            <span className="truncate">{technician.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {!locked && tasks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void removeTask(task)}
                  disabled={removingTask === task.id}
                  aria-label={t('removeArea')}
                  title={t('removeArea')}
                >
                  {removingTask === task.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )
      })}

      {!locked && remaining.length > 0 && onAddWork && (
        <Button
          type="button"
          size="sm"
          className="h-9 w-full gap-1.5"
          onClick={onAddWork}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('addService')}
        </Button>
      )}
    </AppCard>
  )
}
