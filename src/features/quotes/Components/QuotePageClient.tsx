'use client'

import { DEFAULT_CURRENCY_CODE } from '@/lib/currencies'
import type { ShopFeeConfig } from '@/features/settings/Lib/shopFee'
import { ShopFeeProvider } from '@/features/settings/Components/ShopFeeContext'
import { DocumentLockBanner } from '@/components/document-lock-banner'
import { setQuoteEditUnlocked } from '@/features/settings/Actions/documentLockActions'
import type { LockState } from '@/lib/document-lock'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { quoteStatusLabel } from '@/features/quotes/Lib/quoteStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { sendQuoteEmail } from '@/features/email/Actions/emailActions'
import { SendEmailDialog } from '@/features/email/Components/SendEmailDialog'
import { revokeQuotePublicLink } from '@/features/quotes/Actions/quoteShareActions'
import { QuoteShareDialog } from '@/features/quotes/Components/QuoteShareDialog'
import { PdfPreviewDialog } from '@/components/pdf-preview-dialog'
import { QuoteImagesManager } from '@/features/quotes/Components/QuoteImagesManager'
import { QuoteDocumentsManager } from '@/features/quotes/Components/QuoteDocumentsManager'
import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  Paperclip,
  Save,
  Trash2,
} from 'lucide-react'
import { formatCurrency, getCurrencySymbol } from '@/lib/format'
import { ConvertConflictChoices } from './ConvertConflictChoices'
import type { QuoteAttachment, QuoteRecord, TabType } from './quote-page-types'
import { statusColors } from './quote-page-types'
import { useQuoteFormState, type ConvertTarget } from './useQuoteFormState'
import { useSaveShortcut } from '@/hooks/use-save-shortcut'
import {
  LaborPresetPickerDialog,
  type LaborPresetOption,
} from '@/features/labor-presets/Components/LaborPresetPickerDialog'
import { QuotePartsEditor } from './QuotePartsEditor'
import type { InventoryPartOption } from '@/features/vehicles/Components/service-edit/form-types'
import { QuoteLaborEditor } from './QuoteLaborEditor'
import { QuoteNotesEditor } from './QuoteNotesEditor'
import { QuoteRightColumn } from './QuoteRightColumn'
import { QuoteCustomerResponse } from './QuoteCustomerResponse'
import { VehicleCombobox } from './VehicleCombobox'
import { lineTotal } from '@/features/inventory/Lib/partPricing'
import type { WarrantyTexts } from '@/lib/warranty'
import { cn } from '@/lib/utils'

const LG_BREAKPOINT = 1024

/** A job's number and title, without the number twice when the title carries it. */
function convertTargetLabel(target: ConvertTarget) {
  if (!target.invoiceNumber || target.title.includes(target.invoiceNumber)) return target.title
  return `${target.invoiceNumber} · ${target.title}`
}

function useIsLargeScreen() {
  const [isLarge, setIsLarge] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`)
    const onChange = () => setIsLarge(mql.matches)
    mql.addEventListener('change', onChange)
    setIsLarge(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isLarge
}

export function QuotePageClient({
  quote,
  organizationId,
  lockState,
  canUnlock,
  currencyCode = DEFAULT_CURRENCY_CODE,
  defaultTaxRate = 0,
  taxEnabled = true,
  defaultLaborRate = 0,
  shopFee = null,
  warrantyTexts,
  distanceUnit,
  laborPresets = [],
  inventoryParts = [],
  smsEnabled = false,
  emailEnabled = false,
  imageAttachments = [],
  documentAttachments = [],
  maxImages,
  maxDocuments,
}: {
  quote: QuoteRecord
  organizationId: string
  lockState: LockState
  canUnlock: boolean
  currencyCode?: string
  defaultTaxRate?: number
  taxEnabled?: boolean
  defaultLaborRate?: number
  shopFee?: ShopFeeConfig | null
  warrantyTexts: WarrantyTexts
  distanceUnit: string
  laborPresets?: LaborPresetOption[]
  inventoryParts?: InventoryPartOption[]
  smsEnabled?: boolean
  emailEnabled?: boolean
  imageAttachments?: QuoteAttachment[]
  documentAttachments?: QuoteAttachment[]
  maxImages?: number
  maxDocuments?: number
}) {
  const cs = getCurrencySymbol(currencyCode)
  const router = useRouter()
  const isLarge = useIsLargeScreen()
  const t = useTranslations('quotes')
  const tStatus = useTranslations('quotes.statusLabels')
  const tPreview = useTranslations('common.pdfPreview')

  const state = useQuoteFormState({
    quote,
    currencyCode,
    defaultTaxRate,
    taxEnabled,
    defaultLaborRate,
    locked: lockState.locked,
    shopFee,
    t,
  })

  const hasConvertTargets = state.convertTargets.length > 0

  const handleQuoteSent = useCallback(() => router.refresh(), [router])

  useSaveShortcut(() => {
    if (state.hasUnsavedChanges) return state.saveNow()
  })

  const [showPresetPicker, setShowPresetPicker] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)

  const handleSelectPreset = useCallback(
    (preset: LaborPresetOption) => {
      const newItems = preset.items.map((item) => ({
        description: item.description,
        hours: item.hours,
        rate: item.rate > 0 ? item.rate : item.pricingType === 'service' ? 0 : defaultLaborRate,
        total:
          item.hours *
          (item.rate > 0 ? item.rate : item.pricingType === 'service' ? 0 : defaultLaborRate),
        pricingType: (item.pricingType as 'hourly' | 'service') || 'hourly',
        excluded: false,
      }))
      state.addLaborBulk(newItems)

      if (preset.parts?.length) {
        const newParts = preset.parts.map((part) => ({
          name: part.name,
          partNumber: part.partNumber || '',
          quantity: part.quantity,
          unit: part.unit ?? null,
          category: part.category ?? null,
          unitCost: 0,
          markupPercent: 0,
          unitPrice: part.unitPrice,
          total: lineTotal(part.quantity, part.unitPrice),
          excluded: false,
          inventoryPartId: part.inventoryPartId ?? null,
        }))
        state.addPartBulk(newParts)
      }
    },
    [defaultLaborRate, state]
  )

  const handleDescriptionChange = useCallback(
    (v: string) => {
      state.setDescription(v)
      state.markDirty()
    },
    [state]
  )
  const handleNotesChange = useCallback(
    (v: string) => {
      state.setNotes(v)
      state.markDirty()
    },
    [state]
  )
  const handleNoteTypeChange = useCallback(
    (v: 'public' | 'internal') => {
      state.setNoteType(v)
    },
    [state]
  )
  const handleRevoke = useCallback(async () => {
    await revokeQuotePublicLink(quote.id)
    router.refresh()
  }, [quote.id, router])

  const leftColumn = (
    <fieldset disabled={lockState.locked} className="min-w-0 space-y-3">
      <QuotePartsEditor
        partItems={state.partItems}
        currencyCode={currencyCode}
        partsSubtotal={state.partsSubtotal}
        onUpdate={state.updatePart}
        onDelete={state.deletePart}
        onAdd={state.addPart}
        onAddBulk={state.addPartBulk}
        inventoryParts={inventoryParts}
        t={t}
      />
      <QuoteLaborEditor
        laborItems={state.laborItems}
        currencyCode={currencyCode}
        cs={cs}
        laborSubtotal={state.laborSubtotal}
        onUpdate={state.updateLabor}
        onDelete={state.deleteLabor}
        onAdd={state.addLabor}
        onAddService={state.addService}
        hasPresets={laborPresets.length > 0}
        onOpenPresets={() => setShowPresetPicker(true)}
        t={t}
      />
      <QuoteNotesEditor
        noteType={state.noteType}
        onNoteTypeChange={handleNoteTypeChange}
        description={state.description}
        onDescriptionChange={handleDescriptionChange}
        notes={state.notes}
        onNotesChange={handleNotesChange}
        t={t}
      />
    </fieldset>
  )

  const rightColumn = (
    <QuoteRightColumn
      state={state}
      quote={quote}
      organizationId={organizationId}
      currencyCode={currencyCode}
      warrantyTexts={warrantyTexts}
      distanceUnit={distanceUnit}
      t={t}
      onRevoke={handleRevoke}
      lockReason={lockState.locked ? lockState.reason : null}
    />
  )

  return (
    <ShopFeeProvider value={shopFee}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
        {/* Header */}
        <div className="shrink-0 border-b bg-background px-4 py-2.5 shadow-2xs">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/quotes"
              className="group flex min-w-0 items-center gap-2.5 text-foreground transition-colors hover:text-muted-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/40 transition-colors group-hover:bg-muted active:scale-95">
                <ArrowLeft className="h-4 w-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs px-2 py-0.5 ${statusColors[state.status] || ''}`}
                  >
                    {quoteStatusLabel(state.status, tStatus)}
                  </Badge>
                  <h1 className="truncate text-base sm:text-lg font-bold leading-tight tracking-tight">
                    {quote.title}
                  </h1>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{quote.quoteNumber || t('page.quote')}</span>
                  {quote.customer ? ` · ${quote.customer.name}` : ''}
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {/* Header live total indicator */}
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="text-[10px] uppercase text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                  Total:
                </span>
                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(state.totalAmount, currencyCode)}
                </span>
              </div>

              {state.hasUnsavedChanges && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t('page.unsavedChanges')}
                </span>
              )}
              {state.showSaved && !state.hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  {t('page.saved')}
                </span>
              )}

              <Button
                type="submit"
                form="quote-form"
                size="sm"
                disabled={state.saving}
                variant={state.hasUnsavedChanges ? 'default' : 'outline'}
                className={cn(
                  'active:scale-95 transition-all',
                  state.hasUnsavedChanges && 'shadow-xs font-semibold animate-pulse'
                )}
              >
                {state.saving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                <span>{t('page.save')}</span>
              </Button>

              <ButtonGroup>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={tPreview('preview')}
                  disabled={state.saving}
                  className="active:scale-95"
                  onClick={async () => {
                    if (state.saving) return
                    if (state.hasUnsavedChanges) await state.saveNow()
                    setShowPdfPreview(true)
                  }}
                >
                  <Eye className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{tPreview('preview')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('page.pdf')}
                  className="active:scale-95"
                  onClick={state.handleDownloadPDF}
                  disabled={state.downloading}
                >
                  {state.downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                  ) : (
                    <Download className="h-3.5 w-3.5 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">{t('page.pdf')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('page.email')}
                  className="active:scale-95"
                  disabled={state.saving}
                  onClick={async () => {
                    if (state.saving) return
                    if (state.hasUnsavedChanges) await state.saveNow()
                    state.setShowEmailDialog(true)
                  }}
                >
                  {state.saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">{t('page.email')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('page.share')}
                  className="active:scale-95"
                  disabled={state.saving}
                  onClick={async () => {
                    if (state.saving) return
                    if (state.hasUnsavedChanges) await state.saveNow()
                    state.setShowShareDialog(true)
                  }}
                >
                  {state.saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">{t('page.share')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('page.delete')}
                  className="text-destructive hover:bg-destructive/10 active:scale-95"
                  onClick={state.handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t('page.delete')}</span>
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b bg-background px-4">
          <div className="flex gap-2">
            {[
              { key: 'details' as TabType, label: t('page.tabs.details'), icon: FileText },
              { key: 'images' as TabType, label: t('page.tabs.images'), icon: Camera },
              { key: 'documents' as TabType, label: t('page.tabs.documents'), icon: Paperclip },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => state.setActiveTab(key)}
                className={`flex items-center gap-1.5 border-b-2 py-2 px-3 text-sm font-medium transition-all active:scale-95 ${
                  state.activeTab === key
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Above everything else: Customer message / Response */}
        {quote.customerMessage &&
          !quote.responseDismissedAt &&
          (state.status === 'changes_requested' || state.status === 'accepted') && (
            <div className="shrink-0 px-4 pt-3">
              <QuoteCustomerResponse
                status={state.status}
                message={quote.customerMessage}
                respondedAt={quote.updatedAt}
                resolving={state.resolving}
                onResolve={state.handleResolveResponse}
                t={t}
              />
            </div>
          )}

        {(lockState.locked || lockState.unlockedAt) && (
          <div className="shrink-0 px-4 pt-3">
            <DocumentLockBanner
              state={lockState}
              kind="quote"
              canUnlock={canUnlock}
              onSetUnlocked={(unlocked) => setQuoteEditUnlocked(quote.id, unlocked)}
            />
          </div>
        )}

        {/* Tab Content */}
        {state.activeTab === 'details' && (
          <form
            id="quote-form"
            ref={state.formRef}
            onSubmit={state.handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {isLarge ? (
              <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
                <ResizablePanel defaultSize={72} minSize={40}>
                  <div className="h-full overflow-y-auto overscroll-contain p-4 pr-2">
                    <div className="space-y-3 pb-36">{leftColumn}</div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={28} minSize={20}>
                  <div className="h-full overflow-y-auto overscroll-contain p-4 pl-2">
                    <div className="space-y-3 pb-36">{rightColumn}</div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                <div className="space-y-3 pb-36">
                  {leftColumn}
                  {rightColumn}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Mobile sticky bottom bar for quick feedback and instant save */}
        {!isLarge && state.activeTab === 'details' && (
          <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t bg-background/95 px-4 py-2.5 backdrop-blur-md shadow-lg sm:hidden">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total Presupuesto</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(state.totalAmount, currencyCode)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                form="quote-form"
                size="sm"
                disabled={state.saving}
                variant={state.hasUnsavedChanges ? 'default' : 'outline'}
                className={cn(
                  'active:scale-95 shadow-xs font-semibold',
                  state.hasUnsavedChanges && 'animate-pulse'
                )}
              >
                {state.saving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                {t('page.save')}
              </Button>
            </div>
          </div>
        )}

        {state.activeTab === 'images' && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="mx-auto max-w-4xl pb-40">
              <QuoteImagesManager
                quoteId={quote.id}
                initialImages={imageAttachments}
                maxImages={maxImages}
              />
            </div>
          </div>
        )}

        {state.activeTab === 'documents' && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            <div className="mx-auto max-w-4xl pb-40">
              <QuoteDocumentsManager
                quoteId={quote.id}
                initialDocuments={documentAttachments}
                maxDocuments={maxDocuments}
              />
            </div>
          </div>
        )}

        <LaborPresetPickerDialog
          open={showPresetPicker}
          onOpenChange={setShowPresetPicker}
          laborPresets={laborPresets}
          onSelectPreset={handleSelectPreset}
        />

        {/* Dialogs */}
        <PdfPreviewDialog
          open={showPdfPreview}
          onOpenChange={setShowPdfPreview}
          url={`/api/protected/quotes/${quote.id}/pdf`}
        />

        <SendEmailDialog
          open={state.showEmailDialog}
          onOpenChange={state.setShowEmailDialog}
          defaultEmail={quote.customer?.email || ''}
          entityLabel={t('page.entityLabel')}
          onSend={async (email, message, attachPdf) => {
            const result = await sendQuoteEmail({
              quoteId: quote.id,
              recipientEmail: email,
              message,
              attachPdf,
            })
            if (result.success) handleQuoteSent()
            return result
          }}
        />

        <QuoteShareDialog
          open={state.showShareDialog}
          onOpenChange={state.setShowShareDialog}
          quoteId={quote.id}
          organizationId={organizationId}
          initialToken={quote.publicToken}
          onSent={handleQuoteSent}
          customer={quote.customer}
          smsEnabled={smsEnabled}
          emailEnabled={emailEnabled}
        />

        {/* Convert Modal with interactive selectable cards */}
        <Dialog open={state.showConvertDialog} onOpenChange={state.setShowConvertDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{t('page.convertTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground">{t('page.convertChoiceDescription')}</p>
              <VehicleCombobox
                value={state.convertVehicleId}
                initialVehicle={state.selectedVehicle}
                placeholder={t('details.selectVehicle')}
                noneLabel={t('details.none')}
                onChange={(id) => state.setConvertVehicleId(id)}
              />
              <div className="space-y-2.5">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-all hover:border-primary/50 active:scale-[0.99]',
                    state.convertMode === 'new'
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/30'
                      : 'border-border bg-card'
                  )}
                >
                  <input
                    type="radio"
                    name="convert-mode"
                    className="mt-0.5 text-primary"
                    checked={state.convertMode === 'new'}
                    onChange={() => state.setConvertMode('new')}
                  />
                  <div>
                    <span className="font-semibold text-foreground block">{t('page.convertNew')}</span>
                  </div>
                </label>

                <div
                  className={cn(
                    'space-y-2 rounded-xl border p-3.5 text-sm transition-all',
                    state.convertMode === 'existing'
                      ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/30'
                      : 'border-border bg-card',
                    !hasConvertTargets && 'opacity-60'
                  )}
                >
                  <label
                    className={cn(
                      'flex items-start gap-3',
                      hasConvertTargets ? 'cursor-pointer' : 'cursor-not-allowed'
                    )}
                  >
                    <input
                      type="radio"
                      name="convert-mode"
                      className="mt-0.5 text-primary"
                      checked={state.convertMode === 'existing'}
                      disabled={!hasConvertTargets}
                      onChange={() => state.setConvertMode('existing')}
                    />
                    <span className="font-semibold text-foreground">{t('page.convertExisting')}</span>
                  </label>
                  {!hasConvertTargets && state.convertVehicleId && !state.loadingConvertTargets && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {t('page.convertNoOpenWorkOrders')}
                    </p>
                  )}
                  {state.convertMode === 'existing' && hasConvertTargets && (
                    <div className="space-y-2 pl-6 pt-1">
                      <Select
                        value={state.convertTargetId}
                        onValueChange={state.setConvertTargetId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('page.convertSelectWorkOrder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {state.convertTargets.map((target) => (
                            <SelectItem key={target.id} value={target.id}>
                              {convertTargetLabel(target)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('page.convertExistingHint')}
                      </p>
                      {state.loadingConvertConflicts && (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          {t('page.convertConflicts.checking')}
                        </p>
                      )}
                      {state.convertConflicts.length > 0 && (
                        <ConvertConflictChoices
                          conflicts={state.convertConflicts}
                          resolutions={state.convertResolutions}
                          onChoose={state.setConvertResolution}
                          money={(amount) => formatCurrency(amount, currencyCode)}
                          distanceUnit={distanceUnit}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  className="flex-1 active:scale-95"
                  onClick={state.handleConvert}
                  disabled={
                    state.converting ||
                    !state.convertVehicleId ||
                    (state.convertMode === 'existing' &&
                      (!state.convertTargetId ||
                        state.loadingConvertConflicts ||
                        state.convertConflictsUnresolved))
                  }
                >
                  {state.converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {state.convertMode === 'existing' ? t('page.convertAdd') : t('page.convert')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="active:scale-95"
                  onClick={() => state.setShowConvertDialog(false)}
                >
                  {t('page.cancel')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ShopFeeProvider>
  )
}
