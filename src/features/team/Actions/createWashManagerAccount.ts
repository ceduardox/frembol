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
import { ensureWashManagerRole, PLACEHOLDER_EMAIL_DOMAIN } from '../Lib/technicianRole'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  dialCode: z.string().trim().max(6).optional(),
  password: z.string().min(8).max(200),
})

/**
 * Creates the wash manager's account from the counter, with a phone and a
 * password instead of an email invitation.
 *
 * A wash manager is not a technician: this deliberately creates no row on the
 * work board and no clock. They sign in on the web app (the PWA) with their
 * phone and the password the desk shows them; their role points the app at the
 * wash panel.
 */
export async function createWashManagerAccount(input: unknown) {
  return withAuth(
    async ({ organizationId }) => {
      const { name, phone, dialCode, password } = schema.parse(input)

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

      const user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name,
            phone: e164,
            // Account rows need an email; the number is the sign-in here.
            email: `manager-${randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`,
            // Nothing is sent to this address, and the workshop vouched for
            // the person at the counter.
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

        const roleId = await ensureWashManagerRole(tx, organizationId)
        await tx.organizationMember.create({
          data: {
            userId: created.id,
            organizationId,
            role: 'member',
            roleId,
          },
        })

        return created
      })

      revalidatePath('/settings/team')
      revalidatePath('/wash')
      return { userId: user.id, name }
    },
    {
      requiredPermissions: [
        { action: PermissionAction.MANAGE, subject: PermissionSubject.SETTINGS },
      ],
      audit: ({ result }) => ({
        action: 'team.createWashManagerAccount',
        message: 'Created a wash manager account',
        metadata: { userId: result.userId, name: result.name },
      }),
    }
  )
}
