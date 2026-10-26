'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  serviceRecordId: z.string().min(1),
  description: z.string().max(400).nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  serial: z.string().max(160).nullable().optional(),
  condition: z.string().max(30).nullable().optional(),
  accessories: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  clientSignature: z.string().max(500_000).nullable().optional(),
})

/**
 * The brake/clutch intake: the part dropped off, its notes and the customer's
 * signature. Only the fields sent are written, so the piece card and the
 * notes/signature card can save independently.
 */
export async function savePartIntake(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const data = schema.parse(input)

      const record = await db.serviceRecord.findFirst({
        where: { id: data.serviceRecordId, organizationId },
        select: { id: true, jobKind: true, vehicleId: true },
      })
      if (!record) throw new Error('Service record not found')
      if (record.jobKind !== 'brakes' && record.jobKind !== 'parts') {
        throw new Error('Not a part job')
      }

      const values: {
        description?: string | null
        brand?: string | null
        serial?: string | null
        condition?: string | null
        accessories?: string | null
        notes?: string | null
        clientSignature?: string | null
      } = {}
      if (data.description !== undefined) values.description = data.description
      if (data.brand !== undefined) values.brand = data.brand
      if (data.serial !== undefined) values.serial = data.serial
      if (data.condition !== undefined) values.condition = data.condition
      if (data.accessories !== undefined) values.accessories = data.accessories
      if (data.notes !== undefined) values.notes = data.notes
      if (data.clientSignature !== undefined) values.clientSignature = data.clientSignature

      const intake = await db.partIntake.upsert({
        where: { serviceRecordId: data.serviceRecordId },
        create: { serviceRecordId: data.serviceRecordId, ...values },
        update: values,
      })

      revalidatePath(
        record.vehicleId
          ? `/vehicles/${record.vehicleId}/service/${data.serviceRecordId}`
          : `/sales/${data.serviceRecordId}`
      )
      return intake
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.SERVICES },
      ],
    }
  )
}
