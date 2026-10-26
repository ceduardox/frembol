'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Loader2, PenLine, Save } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { savePartIntake } from '@/features/vehicles/Actions/savePartIntake'
import { SignaturePad } from './SignaturePad'

export function PartIntakeSignaturesCard({
  serviceRecordId,
  initialNotes,
  initialClient,
  locked = false,
}: {
  serviceRecordId: string
  initialNotes: string | null
  initialClient: string | null
  locked?: boolean
}) {
  const t = useTranslations('service.part')
  const router = useRouter()

  const [notes, setNotes] = useState(initialNotes ?? '')
  const [clientSignature, setClientSignature] = useState(initialClient ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await savePartIntake({
        serviceRecordId,
        notes: notes || null,
        clientSignature,
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
    <AppCard icon={PenLine} title={t('notesAndSignature')} contentClassName="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="part-notes">{t('notes')}</Label>
        <Textarea
          id="part-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          disabled={locked}
          className="min-h-20 text-sm"
        />
      </div>

      <SignaturePad
        id="part-client-signature"
        label={t('clientSignature')}
        value={clientSignature}
        onChange={setClientSignature}
        disabled={locked}
      />

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || locked}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('saveNotes')}
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
