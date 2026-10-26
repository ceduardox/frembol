'use server'

import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction } from '@/lib/permissions'
import { type JobKind, jobKindSubject } from '@/lib/job-kind'
import { createDraftRecord } from '../Lib/createDraftRecord'

export async function createDraftServiceRecord(
  vehicleId: string,
  startDateTime?: Date,
  endDateTime?: Date,
  technicianId?: string,
  workBayId?: string,
  jobKind?: JobKind
) {
  const subject = jobKindSubject(jobKind)
  const storedKind = jobKind === 'brakes' ? 'brakes' : jobKind === 'wash' ? 'wash' : 'vehicle'
  return withAuth(
    async ({ organizationId, userId }) => {
      const vehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, organizationId },
        include: { customer: { select: { taxExempt: true } } },
      })
      if (!vehicle) throw new Error('Vehicle not found')

      return createDraftRecord(
        { organizationId, userId },
        {
          vehicleId,
          customerId: null,
          customerExempt: vehicle.customer?.taxExempt ?? false,
          // Named from the workshop's title template once the number is known.
          title: null,
          startDateTime,
          endDateTime,
          technicianId,
          workBayId,
          jobKind: storedKind,
        }
      )
    },
    {
      requiredPermissions: [
        {
          action: PermissionAction.CREATE,
          subject,
        },
      ],
      audit: ({ result }) => ({
        action: 'service.create',
        entity: 'ServiceRecord',
        entityId: result.id,
        details: { key: 'service_createDraft', params: { ref: result.invoiceNumber || result.id } },
        metadata: { serviceRecordId: result.id, vehicleId: result.vehicleId, jobKind },
      }),
    }
  )
}

export async function createDraftCounterSale(
  customerId: string,
  jobKind?: JobKind,
  title?: string
) {
  const subject = jobKindSubject(jobKind)
  const storedKind = jobKind === 'brakes' ? 'brakes' : 'parts'
  return withAuth(
    async ({ organizationId, userId }) => {
      const customer = await db.customer.findFirst({
        where: { id: customerId, organizationId },
        select: { id: true, taxExempt: true },
      })
      if (!customer) throw new Error('Customer not found')

      return createDraftRecord(
        { organizationId, userId },
        {
          vehicleId: null,
          customerId: customer.id,
          customerExempt: customer.taxExempt,
          title: title || 'Parts Sale',
          jobKind: storedKind,
        }
      )
    },
    {
      requiredPermissions: [
        {
          action: PermissionAction.CREATE,
          subject,
        },
      ],
      audit: ({ result }) => ({
        action: 'service.create',
        entity: 'ServiceRecord',
        entityId: result.id,
        details: {
          key: 'service_createCounterSale',
          params: { ref: result.invoiceNumber || result.id },
        },
        metadata: { serviceRecordId: result.id, customerId: result.customerId, jobKind },
      }),
    }
  )
}
