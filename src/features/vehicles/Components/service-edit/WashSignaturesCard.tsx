'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Check, Loader2, Save } from 'lucide-react'
import { AppCard } from '@/components/app-card'
import { Button } from '@/components/ui/button'
import { saveWashSignatures } from '@/features/vehicles/Actions/saveWashSignatures'
import { SignaturePad } from './SignaturePad'

export function WashSignaturesCard({
  serviceRecordId,
  initialClient,
  initialStaff,
  locked = false,
}: {
  serviceRecordId: string
  initialClient: string | null
  initialStaff: string | null
  locked?: boolean
}) {
  const t = useTranslations('service.wash')
  const router = useRouter()
  const [clientSignature, setClientSignature] = useState(initialClient)
  const [staffSignature, setStaffSignature] = useState(initialStaff)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const result = await saveWashSignatures({
        serviceRecordId,
        clientSignature,
        staffSignature,
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
      icon={Check}
      title={t('signaturesTitle')}
      description={t('signaturesDescription')}
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <SignaturePad
          id="wash-client-signature"
          label={t('clientSignature')}
          value={clientSignature}
          onChange={setClientSignature}
          disabled={locked}
        />
        <SignaturePad
          id="wash-staff-signature"
          label={t('staffSignature')}
          value={staffSignature}
          onChange={setStaffSignature}
          disabled={locked}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || locked}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('saveSignatures')}
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
