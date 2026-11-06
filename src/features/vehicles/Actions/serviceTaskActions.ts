'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

const AREAS = ['vehicle', 'brakes', 'wash', 'parts'] as const
const areaSchema = z.enum(AREAS)

/**
 * Adds one area to an open visit. A car can start as a wash and then need
 * brakes or mechanics; the visit stays the same, with one more task.
 */
export async function addServiceTask(input: unknown) {
  const data = z
    .object({
      serviceRecordId: z.string().min(1),
      area: areaSchema,
      description: z.string().trim().max(200).optional(),
      price: z.number().min(0).max(1_000_000).optional(),
      technicianId: z.string().min(1).optional(),
      technicianIds: z.array(z.string().min(1)).max(30).optional(),
      promisedAt: z.string().datetime().nullable().optional(),
    })
    .parse(input)

  return withAuth(
    async ({ organizationId }) => {
      const record = await db.serviceRecord.findFirst({
        where: { id: data.serviceRecordId, organizationId },
        select: {
          id: true,
          vehicleId: true,
          customerId: true,
          jobKind: true,
          issuedAt: true,
          technicianId: true,
          techName: true,
          tasks: { select: { area: true, sortOrder: true } },
        },
      })
      if (!record) throw new Error('Service record not found')
      if (record.issuedAt) {
        throw new Error('This visit is already invoiced; open a new visit instead.')
      }
      if (record.tasks.some((task) => task.area === data.area)) {
        throw new Error('That area is already in this visit.')
      }

      const maxOrder = record.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1)
      const price = data.price && data.price > 0 ? Math.round(data.price * 100) / 100 : 0
      const requestedTechIds = [
        ...new Set([
          ...(data.technicianIds ?? []),
          ...(data.technicianId ? [data.technicianId] : []),
        ]),
      ]
      const technicians = requestedTechIds.length
        ? await db.technician.findMany({
            where: { id: { in: requestedTechIds }, organizationId, isActive: true },
            select: { id: true, name: true },
            orderBy: { sortOrder: 'asc' },
          })
        : []
      if (technicians.length !== requestedTechIds.length) {
        throw new Error('One of the technicians is not active in this workshop.')
      }
      const technician = technicians[0] ?? null

      const task = await db.$transaction(async (tx) => {
        const created = await tx.serviceTask.create({
          data: {
            serviceRecordId: record.id,
            area: data.area,
            status: 'pending',
            sortOrder: maxOrder + 1,
          },
          select: { id: true, area: true, sortOrder: true },
        })
        if (technicians.length > 0) {
          await tx.serviceTaskTechnician.createMany({
            data: technicians.map((tech) => ({
              taskId: created.id,
              technicianId: tech.id,
            })),
          })
        }
        if (price > 0) {
          await tx.serviceLabor.create({
            data: {
              serviceRecordId: record.id,
              description: data.description || data.area,
              hours: 1,
              rate: price,
              total: price,
              pricingType: 'service',
            },
          })
        }
        if (data.promisedAt) {
          await tx.serviceRecord.update({
            where: { id: record.id },
            data: { promisedAt: new Date(data.promisedAt) },
          })
        }
        if (technician && (!record.technicianId || created.sortOrder === 0)) {
          await tx.serviceRecord.update({
            where: { id: record.id },
            data: {
              technician: { connect: { id: technician.id } },
              techName: technician.name,
            },
          })
        }
        return created
      })

      revalidatePath(
        record.vehicleId
          ? `/vehicles/${record.vehicleId}/service/${record.id}`
          : `/sales/${record.id}`
      )
      revalidatePath('/work-board')
      revalidatePath('/wash')
      return task
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.SERVICES },
      ],
    }
  )
}

/**
 * Who did one area of the visit. Several people may have worked on the same
 * area; their names stay in the workshop's control and never reach the
 * customer's sheet.
 */
export async function setTaskTechnicians(input: unknown) {
  const data = z
    .object({
      taskId: z.string().min(1),
      technicianIds: z.array(z.string().min(1)).max(30),
    })
    .parse(input)

  return withAuth(
    async ({ organizationId }) => {
      const task = await db.serviceTask.findFirst({
        where: { id: data.taskId, serviceRecord: { organizationId } },
        select: {
          id: true,
          area: true,
          sortOrder: true,
          serviceRecord: {
            select: { id: true, vehicleId: true, technicianId: true },
          },
        },
      })
      if (!task) throw new Error('Service task not found')

      const ids = [...new Set(data.technicianIds)]
      const technicians = ids.length
        ? await db.technician.findMany({
            where: { id: { in: ids }, organizationId, isActive: true },
            select: { id: true, name: true },
          })
        : []
      if (technicians.length !== ids.length) {
        throw new Error('One of the technicians is not active in this workshop.')
      }

      await db.$transaction([
        db.serviceTaskTechnician.deleteMany({ where: { taskId: task.id } }),
        ...(technicians.length
          ? [
              db.serviceTaskTechnician.createMany({
                data: technicians.map((technician) => ({
                  taskId: task.id,
                  technicianId: technician.id,
                })),
              }),
            ]
          : []),
      ])

      // The first area keeps a lead on the record so the board and the old
      // schedule block still answer; later areas live in their own task.
      if (task.sortOrder === 0 && technicians[0]) {
        await db.serviceRecord.update({
          where: { id: task.serviceRecord.id },
          data: {
            technician: { connect: { id: technicians[0].id } },
            techName: technicians[0].name,
          },
        })
      }

      revalidatePath(
        task.serviceRecord.vehicleId
          ? `/vehicles/${task.serviceRecord.vehicleId}/service/${task.serviceRecord.id}`
          : `/sales/${task.serviceRecord.id}`
      )
      revalidatePath('/work-board')
      return { taskId: task.id, technicianIds: technicians.map((t) => t.id) }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.UPDATE, subject: PermissionSubject.SERVICES },
      ],
    }
  )
}
