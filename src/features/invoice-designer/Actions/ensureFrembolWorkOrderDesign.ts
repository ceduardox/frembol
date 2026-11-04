'use server'

import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Prisma } from '@/generated/prisma/client'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'
import { SETTING_KEYS } from '@/features/settings/Schema/settingsSchema'
import {
  DESIGNER_LAYOUT_VERSION,
  getDefaultLayout,
  type InvoiceSectionStyle,
} from '@/features/settings/Schema/invoiceLayoutSchema'

const SEEDED_KEY = 'design.frembolSeeded'
const SEEDED_VERSION = '3'
const DESIGN_NAME = 'Frembol'
type DesignKind = 'invoice' | 'work_order'

/**
 * Puts the Frembol sheet in the workshop's own designs, once.
 *
 * Both the invoice and the work order get it, because the same desk prints
 * both and the design belongs in whichever tab is open. They are saved
 * designs rather than hidden presets: each appears in "Your designs", can be
 * opened in the designer and can be set as the default. The custom "seeded"
 * setting keeps deleting them final.
 */
export async function ensureFrembolWorkOrderDesign() {
  return withAuth(
    async ({ userId, organizationId }) => {
      const seeded = await db.appSetting.findUnique({
        where: { organizationId_key: { organizationId, key: SEEDED_KEY } },
        select: { value: true },
      })
      if (seeded?.value === SEEDED_VERSION) return { created: false }

      const [logoRow, heroImageUrl, existingRows] = await Promise.all([
        db.appSetting.findUnique({
          where: {
            organizationId_key: { organizationId, key: SETTING_KEYS.COMPANY_LOGO },
          },
          select: { value: true },
        }),
        Promise.resolve(readHeroImage()),
        db.documentDesign.findMany({
          where: {
            organizationId,
            name: DESIGN_NAME,
            documentType: { in: ['invoice', 'work_order'] },
          },
          select: { id: true, documentType: true },
        }),
      ])

      const existing = new Set(existingRows.map((row) => row.documentType))
      const missing: DesignKind[] = (['invoice', 'work_order'] as const).filter(
        (kind) => !existing.has(kind)
      )

      const template = {
        primaryColor: '#103d6f',
        backgroundColor: '#ffffff',
        textColor: '#222b35',
        companyTextColor: '#103d6f',
        frameBorderColor: '',
        frameShadow: 'false',
        frameSide: 'left',
        frameRadius: 0,
        fontFamily: 'Helvetica',
        headerStyle: 'standard',
        logoSize: 80,
        logoUrl: logoRow?.value ?? '',
        heroImageUrl,
      }

      const operations: Prisma.PrismaPromise<unknown>[] = existingRows.map((row) =>
        db.documentDesign.update({
          where: { id: row.id },
          data: {
            layout: buildLayout(row.documentType as DesignKind) as Prisma.InputJsonValue,
            template: template as Prisma.InputJsonValue,
          },
        })
      )
      operations.push(
        ...missing.map((kind) =>
          db.documentDesign.create({
            data: {
              organizationId,
              documentType: kind,
              name: DESIGN_NAME,
              layout: buildLayout(kind) as Prisma.InputJsonValue,
              template: template as Prisma.InputJsonValue,
            },
          })
        )
      )
      operations.push(
        db.appSetting.upsert({
          where: { organizationId_key: { organizationId, key: SEEDED_KEY } },
          create: { userId, organizationId, key: SEEDED_KEY, value: SEEDED_VERSION },
          update: { value: SEEDED_VERSION },
        })
      )

      await db.$transaction(operations)

      return { created: missing.length > 0 }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.SETTINGS },
      ],
    }
  )
}

const tableStyle: InvoiceSectionStyle = {
  backgroundColor: '#103d6f',
  labelColor: '#f8d448',
  borderColor: '#3a8cc8',
  borderWidth: 0.5,
}

function buildLayout(kind: DesignKind) {
  const base = getDefaultLayout(kind)
  const order =
    kind === 'invoice'
      ? [
          'header_image',
          'header',
          'document_title',
          'customer',
          'vehicle',
          'service',
          'items_table',
          'findings',
          'totals',
          'notes',
          'signature',
          'footer',
        ]
      : [
          'header_image',
          'header',
          'document_title',
          'customer',
          'vehicle',
          'job_details',
          'items_table',
          'concerns',
          'totals',
          'notes',
          'signature',
          'footer',
        ]
  const visible = new Set(order)
  const positions = new Map(order.map((id, index) => [id, index]))

  const sections = base.sections.map((section, index) => ({
    ...section,
    visible: visible.has(section.id),
    order: positions.get(section.id) ?? order.length + index,
    ...(section.id === 'header_image'
      ? {
          style: {
            ...section.style,
            width: 400,
            align: 'center' as const,
            marginBottom: 4,
          },
        }
      : {}),
    ...(section.id === 'customer' ? { column: 'left' as const } : {}),
    ...(section.id === 'vehicle' ? { column: 'right' as const } : {}),
    ...(section.id === 'items_table' ? { style: tableStyle } : {}),
    ...(section.id === 'slogan' ? { style: { ...section.style, textColor: '#d32027' } } : {}),
    ...(section.id === 'header' ? { style: { ...section.style, textColor: '#103d6f' } } : {}),
    ...(section.id === 'totals'
      ? {
          style: {
            ...section.style,
            backgroundColor: '#103d6f',
            labelColor: '#f8d448',
          },
        }
      : {}),
  }))

  return {
    ...base,
    sections,
    document: {
      ...base.document,
      accentColor: '#d32027',
      fontSize: 9,
      rowPadding: 3,
      margin: 28,
      stripes: false,
    },
    documentType: kind,
    version: DESIGNER_LAYOUT_VERSION,
  }
}

/** The red brake lathe, embedded so the PDF and the HTML share one source. */
function readHeroImage(): string {
  const file = path.join(process.cwd(), 'public', 'frembol-torno.png')
  const bytes = readFileSync(file)
  return `data:image/png;base64,${bytes.toString('base64')}`
}
