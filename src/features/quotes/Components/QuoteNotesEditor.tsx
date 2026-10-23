'use client'

import { memo } from 'react'
import { FileText, Globe, Lock } from 'lucide-react'
import { RichTextEditor } from '@/features/vehicles/Components/service-edit/RichTextEditor'

interface QuoteNotesEditorProps {
  noteType: 'public' | 'internal'
  onNoteTypeChange: (v: 'public' | 'internal') => void
  description: string
  onDescriptionChange: (v: string) => void
  notes: string
  onNotesChange: (v: string) => void
  t: (key: string) => string
}

export const QuoteNotesEditor = memo(function QuoteNotesEditor({
  noteType,
  onNoteTypeChange,
  description,
  onDescriptionChange,
  notes,
  onNotesChange,
  t,
}: QuoteNotesEditorProps) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <FileText className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {t('notes.title')}
          </h3>
        </div>

        {/* Clean segmented toggle for instant switching */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onNoteTypeChange('public')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all active:scale-95 ${
              noteType === 'public'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-3 w-3 text-blue-500" />
            <span>{t('notes.public')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNoteTypeChange('internal')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all active:scale-95 ${
              noteType === 'internal'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="h-3 w-3 text-amber-500" />
            <span>{t('notes.internal')}</span>
          </button>
        </div>
      </div>

      {noteType === 'public' && (
        <div className="space-y-1.5">
          <RichTextEditor
            content={description}
            onChange={onDescriptionChange}
            placeholder={t('notes.publicPlaceholder')}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3 text-blue-500 shrink-0" />
            <span>{t('notes.publicHelper')}</span>
          </div>
        </div>
      )}

      {noteType === 'internal' && (
        <div className="space-y-1.5">
          <RichTextEditor
            content={notes}
            onChange={onNotesChange}
            placeholder={t('notes.internalPlaceholder')}
          />
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
            <span>{t('notes.internalHelper')}</span>
          </div>
        </div>
      )}
    </div>
  )
})
