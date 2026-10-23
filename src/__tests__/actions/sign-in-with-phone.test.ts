import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: { api: { signInEmail: vi.fn() } } }))
vi.mock('@/lib/db', () => ({ db: { user: { findMany: vi.fn() } } }))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { signInWithPhone } from '@/features/technician-auth/Actions/signInWithPhone'

const signInEmail = auth.api.signInEmail as unknown as ReturnType<typeof vi.fn>
const findMany = db.user.findMany as unknown as ReturnType<typeof vi.fn>

describe('signInWithPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a number that cannot be normalised', async () => {
    const result = await signInWithPhone({ phone: 'abc', password: 'secret123' })
    expect(result).toEqual({ success: false, error: 'invalidPhone' })
    expect(findMany).not.toHaveBeenCalled()
  })

  it('reports when nobody holds the number', async () => {
    findMany.mockResolvedValue([])
    const result = await signInWithPhone({
      phone: '71234567',
      dialCode: '+591',
      password: 'secret123',
    })
    expect(result).toEqual({ success: false, error: 'notFound' })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: '+59171234567' } })
    )
  })

  it('refuses to guess when the number is shared', async () => {
    findMany.mockResolvedValue([{ email: 'a@x.test' }, { email: 'b@x.test' }])
    const result = await signInWithPhone({
      phone: '71234567',
      dialCode: '+591',
      password: 'secret123',
    })
    expect(result).toEqual({ success: false, error: 'ambiguous' })
    expect(signInEmail).not.toHaveBeenCalled()
  })

  it('signs in with the account the number resolves to', async () => {
    findMany.mockResolvedValue([{ email: 'tech-1@technician.torqvoice.invalid' }])
    signInEmail.mockResolvedValue({})
    const result = await signInWithPhone({
      phone: '71234567',
      dialCode: '+591',
      password: 'secret123',
    })
    expect(result).toEqual({ success: true })
    expect(signInEmail).toHaveBeenCalledWith({
      body: { email: 'tech-1@technician.torqvoice.invalid', password: 'secret123' },
    })
  })

  it('turns a wrong password into one message', async () => {
    findMany.mockResolvedValue([{ email: 'tech-1@technician.torqvoice.invalid' }])
    signInEmail.mockRejectedValue(new Error('INVALID_EMAIL_OR_PASSWORD'))
    const result = await signInWithPhone({
      phone: '71234567',
      dialCode: '+591',
      password: 'wrongpass',
    })
    expect(result).toEqual({ success: false, error: 'invalidCredentials' })
  })
})
