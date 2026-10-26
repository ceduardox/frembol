'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

const listSchema = z.array(z.string().max(40)).max(30).optional()

const schema = z.object({
  serviceRecordId: z.string().min(1),
  vehicleClass: z.string().max(30).nullable().optional(),
  vehicleClassOther: z.string().max(80).nullable().optional(),
  fuelLevel: z.string().max(30).nullable().optional(),
  accessories: listSchema,
  accessoriesOther: z.string().max(300).nullable().optional(),
  conditions: listSchema,
  conditionsOther: z.string().max(300).nullable().optional(),
  arrivalState: z.string().max(30).nullable().optional(),
  scratches: z.string().max(3000).nullable().optional(),
  authorizedExtra: z.string().max(2000).nullable().optional(),
  authorizedBy: z.string().max(160).nullable().optional(),
  promisedAt: z.string().datetime().nullable().optional(),
})

/**
 * Saves the wash intake sheet (what the vehicle carried in, its state, the
 * delivery promise). Kept apart from the invoice form so it can be filled at
 * the counter while the car is still outside.
 */
export async function saveWashIntake(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const data = schema.parse(input)

      const record = await db.serviceRecord.findFirst({
        where: { id: data.serviceRecordId, organizationId },
        select: { id: true, jobKind: true },
      })
      if (!record) throw new Error('Service record not found')
      if (record.jobKind !== 'wash') throw new Error('Not a wash job')

      const values = {
        vehicleClass: data.vehicleClass ?? null,
        vehicleClassOther: data.vehicleClassOther ?? null,
        fuelLevel: data.fuelLevel ?? null,
        accessories: data.accessories ?? [],
        accessoriesOther: data.accessoriesOther ?? null,
        conditions: data.conditions ?? [],
        conditionsOther: data.conditionsOther ?? null,
        arrivalState: data.arrivalState ?? null,
        scratches: data.scratches ?? null,
        authorizedExtra: data.authorizedExtra ?? null,
        authorizedBy: data.authorizedBy ?? null,
      }

      const intake = await db.washIntake.upsert({
        where: { serviceRecordId: data.serviceRecordId },
        create: { serviceRecordId: data.serviceRecordId, ...values },
        update: values,
      })

      if (data.promisedAt !== undefined) {
        await db.serviceRecord.update({
          where: { id: data.serviceRecordId },
          data: { promisedAt: data.promisedAt ? new Date(data.promisedAt) : null },
        })
      }

      return intake
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.WASH },
      ],
    }
  )
}
