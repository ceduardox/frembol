'use server'

import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'

/**
 * The people a visit can assign, for the desks that can open a service but
 * cannot read the work board (the wash manager, for example).
 */
export async function getAssignableTechnicians() {
  return withAuth(
    async ({ organizationId }) => {
      const technicians = await db.technician.findMany({
        where: { organizationId, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
          isActive: true,
          sortOrder: true,
          dailyCapacity: true,
          skills: true,
          userId: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
        },
      })

      return technicians.map(({ user, ...technician }) => ({
        ...technician,
        name: user?.name || user?.email || technician.name,
      }))
    },
    {
      requiredPermissions: [
        { action: PermissionAction.READ, subject: PermissionSubject.SERVICES },
      ],
    }
  )
}
