'use server'

import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { normalizePortalPhone } from '@/lib/portal-phone'

const schema = z.object({
  phone: z.string().trim().min(3).max(40),
  dialCode: z.string().trim().max(6).optional(),
  password: z.string().min(1).max(200),
})

/**
 * Signs in on the web with a phone number and password.
 *
 * The account is the technician's own; the phone is only how they find it.
 * Better Auth signs in by email, so this resolves the phone to the account's
 * (often internal) address and then runs the normal credential sign-in, which
 * the nextCookies plugin turns into the session cookie.
 */
export async function signInWithPhone(input: unknown) {
  try {
    const { phone, dialCode, password } = schema.parse(input)
    const e164 = normalizePortalPhone(phone, dialCode ?? null)
    if (!e164) return { success: false as const, error: 'invalidPhone' }

    const users = await db.user.findMany({
      where: { phone: e164 },
      select: { email: true },
      take: 2,
    })
    if (users.length === 0) return { success: false as const, error: 'notFound' }
    if (users.length > 1) return { success: false as const, error: 'ambiguous' }

    await auth.api.signInEmail({ body: { email: users[0].email, password } })
    return { success: true as const }
  } catch {
    return { success: false as const, error: 'invalidCredentials' }
  }
}
