import { db } from '@/lib/db'
import { getFeatures } from '@/lib/features'
import { getAppBaseUrl } from '@/lib/app-url'
import { getTorqvoiceLogoDataUri } from '@/lib/torqvoice-branding'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { resolvePortalOrg } from '@/lib/portal-slug'
import { resolveCustomerLocale } from '@/i18n/locale-from-request'
import { assembleWorkOrderPrint } from '@/features/invoices/Lib/assembleWorkOrderPrint'
import { buildWorkOrderPrintSpec } from '@/features/invoice-designer/Pdf/buildWorkOrderPrint'
import { loadPrintLabels } from '@/features/invoice-designer/Pdf/printLabels'
import { conditionMapLabelsFor } from '@/features/condition-map/Lib/loadMarks.server'
import { WorkOrderView } from './work-order-view'

const STAGE_LABEL_KEYS: Record<string, string> = {
  pending: 'statusPending',
  'in-progress': 'statusInProgress',
  'waiting-parts': 'statusWaitingParts',
  completed: 'statusCompleted',
}

function toPublicFileUrl(fileUrl: string, token: string): string {
  const match = fileUrl.match(/^\/api\/protected\/files\/[^/]+\/(.+)$/)
  if (match) return `/api/public/files/${token}/${match[1]}`
  return fileUrl
}

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgId: string; token: string }>
}): Promise<Metadata> {
  const { orgId: orgParam, token } = await params
  const resolvedOrg = await resolvePortalOrg(orgParam)
  const orgId = resolvedOrg?.id ?? orgParam

  const shared = await db.serviceRecord.findUnique({
    where: { publicToken: token },
    select: {
      organizationId: true,
      invoiceNumber: true,
      title: true,
      customer: { select: { name: true } },
      vehicle: {
        select: {
          make: true,
          model: true,
          year: true,
          licensePlate: true,
          customer: { select: { name: true } },
        },
      },
    },
  })

  if (!shared || shared.organizationId !== orgId) {
    return { robots: { index: false, follow: false } }
  }

  const customerName = shared.customer?.name || shared.vehicle?.customer?.name || null
  const document = shared.invoiceNumber
    ? `Orden de trabajo ${shared.invoiceNumber}`
    : shared.title || 'Orden de trabajo'
  const title = customerName ? `${document} · ${customerName}` : document
  const vehicle = shared.vehicle
    ? [shared.vehicle.year, shared.vehicle.make, shared.vehicle.model].filter(Boolean).join(' ')
    : ''
  const description = [vehicle, shared.vehicle?.licensePlate, resolvedOrg?.name]
    .filter(Boolean)
    .join(' · ')
  const appUrl = getAppBaseUrl()
  const url = `${appUrl}/share/work-order/${orgParam}/${token}`
  const image = `${appUrl}/api/public/logo/${orgId}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: resolvedOrg?.name,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: { index: false, follow: false },
  }
}

export default async function PublicWorkOrderPage({
  params,
}: {
  params: Promise<{ orgId: string; token: string }>
}) {
  const { orgId: orgParam, token } = await params
  const resolvedOrg = await resolvePortalOrg(orgParam)
  const orgId = resolvedOrg?.id ?? orgParam

  const shared = await db.serviceRecord.findUnique({
    where: { publicToken: token },
    select: { id: true, organizationId: true },
  })
  if (!shared || shared.organizationId !== orgId) notFound()

  const assembly = await assembleWorkOrderPrint(shared.id)
  if (!assembly) notFound()

  const acceptLanguage = (await headers()).get('accept-language')
  const locale = await resolveCustomerLocale(orgId, acceptLanguage)
  const [labels, conditionMapLabels, features] = await Promise.all([
    loadPrintLabels(locale, assembly.labelSettings, 'work_order'),
    conditionMapLabelsFor(orgId, locale),
    getFeatures(orgId),
  ])
  const torqvoiceLogoDataUri = features.brandingRemoved
    ? undefined
    : await getTorqvoiceLogoDataUri()

  const { job } = assembly
  const stageKey = STAGE_LABEL_KEYS[job.status]
  const statusLabel =
    job.customStatusName || (stageKey ? labels[stageKey] || job.status : job.status)

  const spec = buildWorkOrderPrintSpec({
    data: assembly.data,
    job: { ...job, statusLabel, conditionMapLabels },
    workshop: assembly.workshop,
    invoiceSettings: assembly.invoiceSettings,
    logoDataUri: assembly.logoDataUri,
    signer: assembly.signer,
    template: assembly.template,
    torqvoiceLogoDataUri,
    labels,
  })

  const attachments = assembly.record.attachments.map((attachment) => ({
    ...attachment,
    fileUrl: toPublicFileUrl(attachment.fileUrl, token),
  }))

  return <WorkOrderView spec={spec} attachments={attachments} />
}
