'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

const entrySchema = z.object({
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().max(120).optional().default(''),
})

/** Makes and models typed by this workshop, grouped for the comboboxes. */
export async function getVehicleCatalogExtras() {
  return withAuth(
    async ({ organizationId }) => {
      const rows = await db.vehicleCatalogEntry.findMany({
        where: { organizationId },
        orderBy: [{ make: 'asc' }, { model: 'asc' }],
        select: { make: true, model: true },
      })
      const grouped = new Map<string, Set<string>>()
      for (const row of rows) {
        if (!grouped.has(row.make)) grouped.set(row.make, new Set())
        if (row.model) grouped.get(row.make)?.add(row.model)
      }
      return [...grouped.entries()].map(([name, models]) => ({
        name,
        models: [...models],
      }))
    },
    {
      requiredPermissions: [
        { action: PermissionAction.READ, subject: PermissionSubject.VEHICLES },
      ],
    }
  )
}

/** Remembers a make or model the user typed, so the next vehicle finds it. */
export async function rememberVehicleCatalogEntry(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const { make, model } = entrySchema.parse(input)
      await db.vehicleCatalogEntry.upsert({
        where: { organizationId_make_model: { organizationId, make, model } },
        create: { organizationId, make, model },
        update: {},
      })
      return { make, model }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.CREATE, subject: PermissionSubject.VEHICLES },
      ],
    }
  )
}
