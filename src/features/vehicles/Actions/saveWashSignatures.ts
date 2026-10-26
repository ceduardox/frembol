'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

const schema = z.object({
  serviceRecordId: z.string().min(1),
  clientSignature: z.string().max(500_000).nullable(),
  staffSignature: z.string().max(500_000).nullable(),
})

/** Saves only the signatures, from the sheet's last block. */
export async function saveWashSignatures(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const data = schema.parse(input)
      const record = await db.serviceRecord.findFirst({
        where: { id: data.serviceRecordId, organizationId },
        select: { id: true, jobKind: true },
      })
      if (!record) throw new Error('Service record not found')
      if (record.jobKind !== 'wash') throw new Error('Not a wash job')

      return db.washIntake.upsert({
        where: { serviceRecordId: data.serviceRecordId },
        create: {
          serviceRecordId: data.serviceRecordId,
          clientSignature: data.clientSignature,
          staffSignature: data.staffSignature,
        },
        update: {
          clientSignature: data.clientSignature,
          staffSignature: data.staffSignature,
        },
      })
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.WASH },
      ],
    }
  )
}
