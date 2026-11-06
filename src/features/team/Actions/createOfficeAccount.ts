'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hashPassword } from 'better-auth/crypto'
import { db } from '@/lib/db'
import { PermissionAction, PermissionSubject } from '@/lib/permissions'
import { normalizeCountryCode } from '@/lib/portal-phone'
import { normalizeOrgPhone } from '@/lib/sms'
import { withAuth } from '@/lib/with-auth'
import { PLACEHOLDER_EMAIL_DOMAIN } from '../Lib/technicianRole'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  dialCode: z.string().trim().max(6).optional(),
  password: z.string().min(8).max(200),
  role: z.string().trim().min(1),
})

/**
 * Creates an office account with credentials the desk can hand over, without
 * an email invitation. It is deliberately not a technician: no work-board row
 * and no clock. The membership carries the chosen admin or custom role.
 */
export async function createOfficeAccount(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const { name, phone, dialCode, password, role } = schema.parse(input)

      const dial = normalizeCountryCode(dialCode)
      const typedInternational = /^(\+|00)/.test(phone.replace(/[\s()-]/g, ''))
      const e164 = await normalizeOrgPhone(
        organizationId,
        typedInternational || !dial ? phone : `${dial}${phone.replace(/^0+/, '')}`
      )
      if (!e164) {
        throw new Error('That does not look like a mobile number this workshop can reach.')
      }

      const alreadyOnTeam = await db.organizationMember.findFirst({
        where: { organizationId, user: { phone: e164 } },
        select: { id: true },
      })
      if (alreadyOnTeam) {
        throw new Error('That number is already on the team. Change their role from Team instead.')
      }

      const takenElsewhere = await db.user.findFirst({
        where: { phone: e164 },
        select: { id: true },
      })
      if (takenElsewhere) {
        throw new Error('That number already belongs to another account.')
      }

      let roleId: string | null = null
      let memberRole = 'admin'
      if (role !== 'admin') {
        const customRole = await db.role.findFirst({
          where: { id: role, organizationId },
          select: { id: true },
        })
        if (!customRole) throw new Error('Role not found')
        roleId = customRole.id
        memberRole = 'member'
      }

      const user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name,
            phone: e164,
            email: `office-${randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`,
            emailVerified: true,
          },
          select: { id: true },
        })

        const passwordHash = await hashPassword(password)
        await tx.account.create({
          data: {
            userId: created.id,
            accountId: created.id,
            providerId: 'credential',
            password: passwordHash,
          },
        })

        await tx.organizationMember.create({
          data: {
            userId: created.id,
            organizationId,
            role: memberRole,
            roleId,
          },
        })

        return created
      })

      revalidatePath('/settings/team')
      return { userId: user.id, name, phone: e164 }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.MANAGE, subject: PermissionSubject.SETTINGS },
      ],
      audit: ({ result }) => ({
        action: 'team.createOfficeAccount',
        message: 'Created an office account',
        metadata: { userId: result.userId, name: result.name },
      }),
    }
  )
}
