'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Droplets } from 'lucide-react'
import { useFormatDate } from '@/lib/use-format-date'
import { setWashQueueStage } from '@/features/wash/Actions/washActions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STAGES = ['queued', 'washing', 'drying', 'ready', 'delivered'] as const

type QueueRow = {
  id: string
  title: string
  createdAt: Date
  promisedAt: Date | null
  customer: { name: string } | null
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    licensePlate: string | null
  } | null
  washIntake: { queueStage: string; vehicleClass: string | null } | null
}

export function WashQueue({ initial }: { initial: QueueRow[] }) {
  const t = useTranslations('service.wash.queue')
  const tWash = useTranslations('service.wash')
  const router = useRouter()
  const { formatDateTime } = useFormatDate()
  const [rows, setRows] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  const move = async (id: string, stage: string) => {
    setBusy(id)
    const result = await setWashQueueStage(id, stage)
    setBusy(null)
    if (!result.success) {
      toast.error(result.error || tWash('saveFailed'))
      return
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, washIntake: { ...(row.washIntake ?? { vehicleClass: null }), queueStage: stage } }
          : row
      )
    )
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {STAGES.map((stage) => {
        const stageRows = rows.filter((row) => (row.washIntake?.queueStage ?? 'queued') === stage)
        return (
          <section key={stage} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted/20 p-2">
            <header className="flex items-center justify-between px-1">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Droplets className="h-4 w-4 text-sky-500" />
                {t(stage)}
              </h2>
              <span className="text-xs text-muted-foreground">{stageRows.length}</span>
            </header>
            <div className="space-y-2">
              {stageRows.map((row) => (
                <div key={row.id} className="space-y-2 rounded-lg border bg-card p-2.5">
                  <Link
                    href={
                      row.vehicle
                        ? `/vehicles/${row.vehicle.id}/service/${row.id}`
                        : `/sales/${row.id}`
                    }
                    className="block min-w-0 hover:underline"
                  >
                    <p className="truncate text-sm font-semibold">
                      {row.vehicle
                        ? `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`
                        : row.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[row.vehicle?.licensePlate, row.customer?.name].filter(Boolean).join(' · ')}
                    </p>
                  </Link>
                  {row.promisedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(row.promisedAt)}
                    </p>
                  )}
                  <Select
                    value={row.washIntake?.queueStage ?? 'queued'}
                    onValueChange={(next) => void move(row.id, next)}
                    disabled={busy === row.id}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
