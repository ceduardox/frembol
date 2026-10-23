'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Check, Copy, Link2, Loader2, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import {
  generateQuotePublicLink,
  revokeQuotePublicLink,
} from '@/features/quotes/Actions/quoteShareActions'
import { sendQuoteEmail } from '@/features/email/Actions/emailActions'
import { sendSmsToCustomer, getSmsTemplates } from '@/features/sms/Actions/smsActions'
import { SETTING_KEYS } from '@/features/settings/Schema/settingsSchema'
import { SMS_TEMPLATE_DEFAULTS, interpolateSmsTemplate } from '@/lib/sms-templates'
import { AttachPdfOption, useAttachPdf } from '@/features/email/Components/AttachPdfOption'

interface QuoteShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: string
  organizationId: string
  initialToken: string | null
  /** Called once the quote has actually gone to the customer. */
  onSent?: () => void
  customer?: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
  smsEnabled?: boolean
  emailEnabled?: boolean
}

export function QuoteShareDialog({
  open,
  onOpenChange,
  quoteId,
  organizationId,
  initialToken,
  onSent,
  customer,
  smsEnabled = false,
  emailEnabled = false,
}: QuoteShareDialogProps) {
  const [publicToken, setPublicToken] = useState<string | null>(initialToken)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [attachPdf, setAttachPdf] = useAttachPdf(open)
  const [notifySms, setNotifySms] = useState(false)
  const [sending, setSending] = useState(false)
  const t = useTranslations('quotes')

  const hasEmail = !!customer?.email
  const hasPhone = !!customer?.phone

  const publicUrl =
    publicToken && organizationId
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/quote/${organizationId}/${publicToken}`
      : null

  const handleGenerate = async () => {
    setGeneratingLink(true)
    const result = await generateQuotePublicLink(quoteId)
    if (result.success && result.data) {
      setPublicToken(result.data.token)
      onSent?.()
    }
    setGeneratingLink(false)
  }

  const handleRevoke = async () => {
    await revokeQuotePublicLink(quoteId)
    setPublicToken(null)
  }

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNotify = async () => {
    if (!publicUrl || !customer) return
    setSending(true)

    const results: string[] = []
    let failed = false

    if (notifyEmail && hasEmail) {
      const res = await sendQuoteEmail({
        quoteId,
        recipientEmail: customer.email!,
        attachPdf,
      })
      if (res.success) {
        results.push(t('shareDialog.emailSent'))
        setNotifyEmail(false)
      } else {
        failed = true
        toast.error(res.error || t('shareDialog.failedEmail'))
      }
    }

    if (notifySms && hasPhone) {
      const tplResult = await getSmsTemplates()
      const tplData = tplResult.success && tplResult.data ? tplResult.data : null
      const tpl =
        tplData?.templates[SETTING_KEYS.SMS_TEMPLATE_QUOTE_READY] ||
        SMS_TEMPLATE_DEFAULTS[SETTING_KEYS.SMS_TEMPLATE_QUOTE_READY]
      const body = interpolateSmsTemplate(tpl || '', {
        share_link: publicUrl,
        customer_name: customer.name,
        company_name: tplData?.companyName || '',
        current_user: tplData?.currentUser || '',
      })
      const res = await sendSmsToCustomer({
        customerId: customer.id,
        body,
        relatedEntityType: 'quote',
        relatedEntityId: quoteId,
      })
      if (res.success) {
        results.push(t('shareDialog.smsSent'))
        setNotifySms(false)
      } else {
        failed = true
        toast.error(res.error || t('shareDialog.failedSms'))
      }
    }

    if (results.length > 0) {
      toast.success(results.join(' & '))
      onSent?.()
    }
    setSending(false)
    if (results.length > 0 && !failed) onOpenChange(false)
  }

  const canNotify = publicUrl && customer && (notifyEmail || notifySms)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            {t('shareDialog.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">{t('shareDialog.description')}</p>
          {publicUrl ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-1.5 pl-3">
                <Input
                  value={publicUrl}
                  readOnly
                  className="text-xs font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto select-all"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 active:scale-95 text-xs font-medium"
                  aria-label={t('shareDialog.copyLink')}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      <span>{t('shareDialog.copyLink')}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Notify customer */}
              {customer && (emailEnabled || smsEnabled) && (
                <div className="space-y-3 rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs">
                  <p className="text-xs font-semibold text-foreground">
                    {t('shareDialog.notifyTitle', { name: customer.name })}
                  </p>
                  <div className="space-y-2">
                    {emailEnabled && (
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="notify-email-quote"
                          checked={notifyEmail}
                          onCheckedChange={(v) => setNotifyEmail(v === true)}
                          disabled={!hasEmail}
                        />
                        <Label
                          htmlFor="notify-email-quote"
                          className={`flex items-center gap-1.5 text-xs cursor-pointer ${!hasEmail ? 'text-muted-foreground/50' : ''}`}
                        >
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          <span>{t('shareDialog.email')}</span>
                          {!hasEmail && <span className="text-[10px] text-muted-foreground">({t('shareDialog.noEmail')})</span>}
                        </Label>
                      </div>
                    )}
                    {emailEnabled && (
                      <div className="pl-6">
                        <AttachPdfOption
                          id="attach-pdf-quote"
                          checked={attachPdf}
                          onCheckedChange={setAttachPdf}
                          disabled={!notifyEmail || !hasEmail}
                        />
                      </div>
                    )}
                    {smsEnabled && (
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="notify-sms-quote"
                          checked={notifySms}
                          onCheckedChange={(v) => setNotifySms(v === true)}
                          disabled={!hasPhone}
                        />
                        <Label
                          htmlFor="notify-sms-quote"
                          className={`flex items-center gap-1.5 text-xs cursor-pointer ${!hasPhone ? 'text-muted-foreground/50' : ''}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{t('shareDialog.sms')}</span>
                          {!hasPhone && <span className="text-[10px] text-muted-foreground">({t('shareDialog.noPhone')})</span>}
                        </Label>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={handleNotify}
                    disabled={sending || !canNotify}
                    className="w-full active:scale-95 transition-all"
                  >
                    {sending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    {t('shareDialog.sendNotification')}
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 active:scale-95 text-xs"
                onClick={handleRevoke}
              >
                {t('shareDialog.revokeLink')}
              </Button>
            </>
          ) : (
            <Button onClick={handleGenerate} disabled={generatingLink} className="w-full active:scale-95">
              {generatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('shareDialog.generateLink')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
