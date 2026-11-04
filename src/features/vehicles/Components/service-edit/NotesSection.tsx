'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, Eye, FileText, Loader2, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModernWorkOrder } from '@/components/work-order-layout-context'
import { RichTextEditor } from './RichTextEditor'
import type { InitialData } from './form-types'
import { aiGenerateServiceNotes } from '@/features/ai/Actions/aiActions'

const SKIP_AI_DIALOG_KEY = 'torqvoice:skipAiWriteDialog'

interface NotesSectionProps {
  initialData: InitialData
  onNotesChange: (field: 'invoiceNotes' | 'diagnosticNotes' | 'description', value: string) => void
  serviceRecordId?: string
  aiEnabled?: boolean
  /** The customer notes print on the invoice, so a locked invoice freezes them. */
  publicLocked?: boolean
  /** Only when the internal notes have no save of their own on a locked invoice. */
  internalLocked?: boolean
}

function hasContent(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text.length > 0
}

function NoteDisclosure({
  icon: Icon,
  title,
  description,
  open,
  onToggle,
  action,
  accent,
  testId,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  open: boolean
  onToggle: () => void
  action?: ReactNode
  accent?: boolean
  testId: string
  children: ReactNode
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-lg border border-card-edge bg-card text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-16px_rgb(0_0_0/0.18)]',
        accent && 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <div className="flex items-start gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-semibold tracking-tight">{title}</span>
            <span className="block truncate text-xs text-muted-foreground">{description}</span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
      {open && <div className="border-t border-card-edge/60 px-4 py-3">{children}</div>}
    </div>
  )
}

export function NotesSection({
  initialData,
  onNotesChange,
  serviceRecordId,
  aiEnabled,
  publicLocked = false,
  internalLocked = false,
}: NotesSectionProps) {
  const t = useTranslations('service.notes')
  const modern = useModernWorkOrder()
  const [internalOpen, setInternalOpen] = useState(false)
  const [publicOpen, setPublicOpen] = useState(false)
  const [noteType, setNoteType] = useState<'public' | 'internal'>('public')
  const [publicNotes, setPublicNotes] = useState(initialData.invoiceNotes || '')
  const [internalNotes, setInternalNotes] = useState(initialData.diagnosticNotes || '')
  const [generating, setGenerating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handlePublicChange = (html: string) => {
    setPublicNotes(html)
    onNotesChange('invoiceNotes', html)
  }

  const handleInternalChange = (html: string) => {
    setInternalNotes(html)
    onNotesChange('diagnosticNotes', html)
  }

  const runAiGenerate = async (
    mode: 'replace' | 'append',
    target: 'public' | 'internal' = noteType
  ) => {
    if (!serviceRecordId) return
    setGenerating(true)
    try {
      const result = await aiGenerateServiceNotes(serviceRecordId)
      if (result.success && result.data) {
        const html = result.data.replace(/\n/g, '<br>')
        const currentNotes = target === 'public' ? publicNotes : internalNotes
        const finalHtml = mode === 'append' ? `${currentNotes}<br><br>${html}` : html

        if (target === 'public') {
          setPublicNotes(finalHtml)
          onNotesChange('invoiceNotes', finalHtml)
        } else {
          setInternalNotes(finalHtml)
          onNotesChange('diagnosticNotes', finalHtml)
        }
        toast.success(t('aiGenerated'))
      } else {
        toast.error(result.error ?? t('aiGenerateFailed'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('aiGenerateFailed'))
    } finally {
      setGenerating(false)
    }
  }

  // The overhauled page shows both notes at once, so the button says which
  // one it writes to; the classic page writes to the open tab.
  const handleAiClick = (target: 'public' | 'internal' = noteType) => {
    setNoteType(target)
    if (target === 'public') setPublicOpen(true)
    else setInternalOpen(true)
    const skipDialog = localStorage.getItem(SKIP_AI_DIALOG_KEY) === 'true'
    const currentNotes = target === 'public' ? publicNotes : internalNotes

    if (skipDialog && !hasContent(currentNotes)) {
      runAiGenerate('replace', target)
    } else {
      setDontShowAgain(false)
      setShowDialog(true)
    }
  }

  const handleGenerate = (mode: 'replace' | 'append') => {
    if (dontShowAgain) {
      localStorage.setItem(SKIP_AI_DIALOG_KEY, 'true')
    }
    setShowDialog(false)
    runAiGenerate(mode)
  }

  const notesHaveContent = hasContent(noteType === 'public' ? publicNotes : internalNotes)
  const publicHasContent = hasContent(publicNotes)
  const internalHasContent = hasContent(internalNotes)

  const aiDialog = (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('aiDialogTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('aiDialogDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        {notesHaveContent && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('aiOverwriteDescription')}
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="dont-show-again" className="text-sm text-muted-foreground">
            {t('aiDontShowAgain')}
          </label>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            {t('aiOverwriteCancel')}
          </Button>
          {notesHaveContent && (
            <Button variant="outline" onClick={() => handleGenerate('append')}>
              {t('aiOverwriteAppend')}
            </Button>
          )}
          <Button onClick={() => handleGenerate('replace')}>
            {notesHaveContent ? t('aiOverwriteReplace') : t('aiGenerate')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const isLocked = (target: 'public' | 'internal') =>
    target === 'public' ? publicLocked : internalLocked
  const aiButton = (target: 'public' | 'internal') =>
    aiEnabled && serviceRecordId && !isLocked(target) ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => handleAiClick(target)}
        disabled={generating}
      >
        {generating && noteType === target ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {t('aiWrite')}
      </Button>
    ) : null

  // Both notes open at once, side by side: the staff one tinted so nobody
  // types a remark about the customer into the box that prints on the invoice.
  if (modern) {
    return (
      <div data-testid="notes-section" className="space-y-3">
        <NoteDisclosure
          icon={Lock}
          title={t('internalTitle')}
          description={t('internalHelper')}
          open={internalOpen}
          onToggle={() => setInternalOpen((open) => !open)}
          action={aiButton('internal')}
          accent
          testId="notes-internal"
        >
          <RichTextEditor
            content={internalNotes}
            onChange={handleInternalChange}
            editable={!internalLocked}
            placeholder={t('internalPlaceholder')}
          />
        </NoteDisclosure>

        <NoteDisclosure
          icon={Eye}
          title={t('publicTitle')}
          description={t('publicHelper')}
          open={publicOpen}
          onToggle={() => setPublicOpen((open) => !open)}
          action={aiButton('public')}
          testId="notes-customer"
        >
          <RichTextEditor
            content={publicNotes}
            onChange={handlePublicChange}
            editable={!publicLocked}
            placeholder={t('publicPlaceholder')}
          />
        </NoteDisclosure>

        {aiDialog}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-3.5 w-3.5" />
        {t('title')}
      </h3>

      <Tabs value={noteType} onValueChange={(v) => setNoteType(v as 'public' | 'internal')}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-8">
            <TabsTrigger value="public" className="text-xs">
              {t('public')}
              {publicHasContent && (
                <span aria-hidden className="ml-1.5 h-1.5 w-1.5 rounded-full bg-sky-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="internal" className="text-xs">
              {t('internal')}
              {internalHasContent && (
                <span aria-hidden className="ml-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
              )}
            </TabsTrigger>
          </TabsList>
          {aiEnabled && serviceRecordId && !isLocked(noteType) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => handleAiClick()}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {t('aiWrite')}
            </Button>
          )}
        </div>

        <TabsContent value="public" className="space-y-1">
          <RichTextEditor
            content={publicNotes}
            onChange={handlePublicChange}
            editable={!publicLocked}
            placeholder={t('publicPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('publicHelper')}</p>
        </TabsContent>

        <TabsContent value="internal" className="space-y-1">
          <RichTextEditor
            content={internalNotes}
            onChange={handleInternalChange}
            editable={!internalLocked}
            placeholder={t('internalPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('internalHelper')}</p>
        </TabsContent>
      </Tabs>

      {aiDialog}
    </div>
  )
}
