'use client'

import { Camera, Download, FileText, Film, Paperclip } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SpecSheet } from '@/features/invoice-designer/Render/SpecSheet'
import type { DocumentSpec } from '@/features/invoice-designer/Spec/documentSpec'

type Attachment = {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  description: string | null
}

export function WorkOrderView({
  spec,
  attachments,
}: {
  spec: DocumentSpec
  attachments: Attachment[]
}) {
  const t = useTranslations('share.invoice')
  const images = attachments.filter((file) => file.fileType.startsWith('image/'))
  const videos = attachments.filter((file) => file.fileType.startsWith('video/'))
  const documents = attachments.filter(
    (file) => !file.fileType.startsWith('image/') && !file.fileType.startsWith('video/')
  )

  return (
    <main className="min-h-screen bg-muted/30 px-3 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <SpecSheet spec={spec} />

        {images.length > 0 && (
          <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900">
            <h4 className="mb-3 flex items-center gap-2 font-semibold">
              <Camera className="h-4 w-4" />
              {t('serviceImages', { count: images.length })}
            </h4>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-lg border"
                >
                  <img
                    src={file.fileUrl}
                    alt={file.description || file.fileName}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <p className="truncate px-1.5 py-1 text-xs text-gray-500">
                    {file.description || file.fileName}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900">
            <h4 className="mb-3 flex items-center gap-2 font-semibold">
              <Film className="h-4 w-4" />
              {t('serviceVideos', { count: videos.length })}
            </h4>
            <div className="space-y-3">
              {videos.map((file) => (
                <div key={file.id} className="overflow-hidden rounded-lg border">
                  <video
                    src={file.fileUrl}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full"
                  />
                  {file.description && (
                    <p className="whitespace-pre-line px-3 py-2 text-sm text-gray-500">
                      {file.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {documents.length > 0 && (
          <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900">
            <h4 className="mb-3 flex items-center gap-2 font-semibold">
              <Paperclip className="h-4 w-4" />
              {t('diagnosticReports', { count: documents.length })}
            </h4>
            <div className="space-y-2">
              {documents.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  download={file.fileName}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {file.fileType === 'application/pdf' ? (
                    <FileText className="h-5 w-5 shrink-0 text-red-500" />
                  ) : (
                    <Paperclip className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{file.fileName}</p>
                  <Download className="h-4 w-4 shrink-0 text-gray-400" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
