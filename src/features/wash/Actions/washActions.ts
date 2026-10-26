'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

const pricesSchema = z.record(z.string().max(40), z.number().min(0).max(10_000_000))

const saveServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  prices: pricesSchema,
  isActive: z.boolean().optional(),
})

/** The wash services and their price per vehicle class. */
export async function getWashServices() {
  return withAuth(
    async ({ organizationId }) =>
      db.washService.findMany({
        where: { organizationId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    {
      requiredPermissions: [
        { action: PermissionAction.READ, subject: PermissionSubject.WASH },
      ],
    }
  )
}

export async function saveWashService(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const data = saveServiceSchema.parse(input)

      if (data.id) {
        const existing = await db.washService.findFirst({
          where: { id: data.id, organizationId },
          select: { id: true },
        })
        if (!existing) throw new Error('Wash service not found')
        return db.washService.update({
          where: { id: data.id },
          data: {
            name: data.name,
            prices: data.prices,
            ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
          },
        })
      }

      const last = await db.washService.aggregate({
        where: { organizationId },
        _max: { sortOrder: true },
      })
      return db.washService.create({
        data: {
          organizationId,
          name: data.name,
          prices: data.prices,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
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

export async function deleteWashService(id: string) {
  return withAuth(
    async ({ organizationId }) => {
      const deleted = await db.washService.deleteMany({
        where: { id, organizationId },
      })
      if (deleted.count === 0) throw new Error('Wash service not found')
      return { id }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.DELETE, subject: PermissionSubject.WASH },
      ],
    }
  )
}

const WASH_QUEUE_STAGES = ['queued', 'washing', 'drying', 'ready', 'delivered'] as const
type WashQueueStage = (typeof WASH_QUEUE_STAGES)[number]

export async function setWashQueueStage(serviceRecordId: string, stage: string) {
  const parsed = z.enum(WASH_QUEUE_STAGES).parse(stage)
  return withAuth(
    async ({ organizationId }) => {
      const record = await db.serviceRecord.findFirst({
        where: { id: serviceRecordId, organizationId },
        select: { id: true, jobKind: true },
      })
      if (!record) throw new Error('Service record not found')
      if (record.jobKind !== 'wash') throw new Error('Not a wash job')

      return db.washIntake.upsert({
        where: { serviceRecordId },
        create: { serviceRecordId, queueStage: parsed },
        update: { queueStage: parsed },
      })
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.WASH },
      ],
    }
  )
}

/** Wash jobs still in the shop, oldest first, for the wash queue. */
export async function getWashQueue() {
  return withAuth(
    async ({ organizationId }) =>
      db.serviceRecord.findMany({
        where: { organizationId, jobKind: 'wash', status: { not: 'completed' } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          promisedAt: true,
          customer: { select: { name: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
          washIntake: { select: { queueStage: true, vehicleClass: true } },
        },
      }),
    {
      requiredPermissions: [
        { action: PermissionAction.READ, subject: PermissionSubject.WASH },
      ],
    }
  )
}

/** The wash desk's headline figures: stages, today's deliveries, the month's
 * payments and the services sold most often. */
export async function getWashSummary() {
  return withAuth(
    async ({ organizationId }) => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const [active, payments, top] = await Promise.all([
        db.serviceRecord.findMany({
          where: { organizationId, jobKind: 'wash', status: { not: 'completed' } },
          select: {
            updatedAt: true,
            washIntake: { select: { queueStage: true, updatedAt: true } },
          },
        }),
        db.payment.findMany({
          where: {
            date: { gte: startOfMonth },
            serviceRecord: { organizationId, jobKind: 'wash' },
          },
          select: { amount: true },
        }),
        db.serviceLabor.groupBy({
          by: ['description'],
          where: {
            serviceRecord: { organizationId, jobKind: 'wash' },
            pricingType: 'service',
          },
          _sum: { total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 5,
        }),
      ])

      const stages: Record<string, number> = {
        queued: 0,
        washing: 0,
        drying: 0,
        ready: 0,
        delivered: 0,
      }
      let deliveredToday = 0
      for (const row of active) {
        const stage = row.washIntake?.queueStage ?? 'queued'
        stages[stage] = (stages[stage] ?? 0) + 1
        const changedAt = row.washIntake?.updatedAt ?? row.updatedAt
        if (stage === 'delivered' && changedAt >= startOfToday) deliveredToday += 1
      }

      return {
        stages,
        deliveredToday,
        revenueThisMonth: payments.reduce((sum, payment) => sum + payment.amount, 0),
        topServices: top.map((row) => ({
          name: row.description,
          total: row._sum.total ?? 0,
        })),
      }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.READ, subject: PermissionSubject.WASH },
      ],
    }
  )
}