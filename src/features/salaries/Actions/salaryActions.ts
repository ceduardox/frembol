'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/with-auth'
import { isValidIsoDate, todayIso } from '../Lib/salaryPeriod'
import type { SalaryEntryView, SalaryProfileView } from '../Lib/types'

const isoDate = z
  .string()
  .trim()
  .refine((value) => isValidIsoDate(value), 'Use a valid date (YYYY-MM-DD)')

const entryType = z.enum(['advance', 'deduction', 'payment', 'bonus'])
const deductionCategory = z.enum(['absence', 'other'])

function assertAdmin(ctx: { isAdmin: boolean }) {
  if (!ctx.isAdmin) throw new Error('Only owners and admins can manage salaries.')
}

function revalidateSalaries() {
  revalidatePath('/salaries')
  revalidatePath('/settings/team')
}

function entryView(entry: {
  id: string
  type: string
  category: string | null
  amount: number
  effectiveDate: string
  note: string | null
  receiptName: string | null
  receiptMimeType: string | null
  createdAt: Date
}): SalaryEntryView {
  return {
    id: entry.id,
    type: entry.type as SalaryEntryView['type'],
    category: entry.category,
    amount: entry.amount,
    effectiveDate: entry.effectiveDate,
    note: entry.note,
    receiptName: entry.receiptName,
    hasReceipt: Boolean(entry.receiptMimeType),
    createdAt: entry.createdAt.toISOString(),
  }
}

export async function getSalaryData() {
  return withAuth(async (ctx) => {
    assertAdmin(ctx)

    const profiles = await db.salaryProfile.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        entries: {
          orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            type: true,
            category: true,
            amount: true,
            effectiveDate: true,
            note: true,
            receiptName: true,
            receiptMimeType: true,
            createdAt: true,
          },
        },
      },
    })

    return profiles.map(
      (profile): SalaryProfileView => ({
        id: profile.id,
        name: profile.name,
        monthlyAmount: profile.monthlyAmount,
        startDate: profile.startDate,
        cycleType: profile.cycleType,
        cycleDay: profile.cycleDay,
        isActive: profile.isActive,
        userId: profile.userId,
        technicianId: profile.technicianId,
        entries: profile.entries.map(entryView),
      })
    )
  })
}

/** Which team rows already have a salary profile, for the switches on Team. */
export async function getSalaryFlags() {
  return withAuth(async (ctx) => {
    if (!ctx.isAdmin) return { userIds: [] as string[], technicianIds: [] as string[] }
    const profiles = await db.salaryProfile.findMany({
      where: { organizationId: ctx.organizationId, isActive: true },
      select: { userId: true, technicianId: true },
    })
    return {
      userIds: profiles.map((profile) => profile.userId).filter((id): id is string => Boolean(id)),
      technicianIds: profiles
        .map((profile) => profile.technicianId)
        .filter((id): id is string => Boolean(id)),
    }
  })
}

export async function toggleSalaryProfile(input: unknown) {
  const data = z
    .object({
      userId: z.string().min(1).optional(),
      technicianId: z.string().min(1).optional(),
      enabled: z.boolean(),
    })
    .refine((value) => Boolean(value.userId) !== Boolean(value.technicianId), {
      message: 'Choose a team member or a board technician.',
    })
    .parse(input)

  return withAuth(async (ctx) => {
    assertAdmin(ctx)

    let name: string
    let userId: string | null = null
    let technicianId: string | null = null

    if (data.userId) {
      const membership = await db.organizationMember.findFirst({
        where: { organizationId: ctx.organizationId, userId: data.userId },
        select: { user: { select: { name: true, email: true } } },
      })
      if (!membership) throw new Error('Team member not found')
      name = membership.user.name || membership.user.email
      userId = data.userId
    } else {
      const technician = await db.technician.findFirst({
        where: { id: data.technicianId, organizationId: ctx.organizationId },
        select: { id: true, name: true },
      })
      if (!technician) throw new Error('Technician not found')
      name = technician.name
      technicianId = technician.id
    }

    const existing = await db.salaryProfile.findFirst({
      where: {
        organizationId: ctx.organizationId,
        ...(userId ? { userId } : { technicianId }),
      },
      select: { id: true },
    })

    const profile = existing
      ? await db.salaryProfile.update({
          where: { id: existing.id },
          data: { isActive: data.enabled, name },
          select: { id: true, isActive: true },
        })
      : await db.salaryProfile.create({
          data: {
            organizationId: ctx.organizationId,
            name,
            userId,
            technicianId,
            startDate: todayIso(),
            monthlyAmount: 0,
            cycleType: 'monthly',
            cycleDay: 1,
          },
          select: { id: true, isActive: true },
        })

    revalidateSalaries()
    return profile
  })
}

export async function updateSalaryProfile(input: unknown) {
  const data = z
    .object({
      id: z.string().min(1),
      monthlyAmount: z.number().min(0).max(1_000_000_000),
      startDate: isoDate,
      cycleType: z.enum(['monthly', 'days30']),
      cycleDay: z.number().int().min(1).max(28),
    })
    .parse(input)

  return withAuth(async (ctx) => {
    assertAdmin(ctx)
    const profile = await db.salaryProfile.findFirst({
      where: { id: data.id, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!profile) throw new Error('Salary profile not found')

    const updated = await db.salaryProfile.update({
      where: { id: profile.id },
      data: {
        monthlyAmount: Math.round(data.monthlyAmount * 100) / 100,
        startDate: data.startDate,
        cycleType: data.cycleType,
        cycleDay: data.cycleDay,
      },
      select: { id: true },
    })

    revalidateSalaries()
    return updated
  })
}

export async function addSalaryEntry(input: unknown) {
  const data = z
    .object({
      profileId: z.string().min(1),
      type: entryType,
      amount: z.number().positive().max(1_000_000_000),
      effectiveDate: isoDate,
      category: deductionCategory.optional(),
      note: z.string().trim().max(500).optional(),
    })
    .parse(input)

  return withAuth(async (ctx) => {
    assertAdmin(ctx)
    const profile = await db.salaryProfile.findFirst({
      where: { id: data.profileId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!profile) throw new Error('Salary profile not found')

    const entry = await db.salaryEntry.create({
      data: {
        profileId: profile.id,
        organizationId: ctx.organizationId,
        type: data.type,
        amount: Math.round(data.amount * 100) / 100,
        effectiveDate: data.effectiveDate,
        category: data.type === 'deduction' ? (data.category ?? 'other') : null,
        note: data.note || null,
        createdById: ctx.userId,
      },
      select: { id: true },
    })

    revalidatePath('/salaries')
    return entry
  })
}

export async function deleteSalaryEntry(entryId: string) {
  return withAuth(async (ctx) => {
    assertAdmin(ctx)
    const entry = await db.salaryEntry.findFirst({
      where: { id: entryId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!entry) throw new Error('Salary entry not found')
    await db.salaryEntry.delete({ where: { id: entry.id } })
    revalidatePath('/salaries')
    return { id: entry.id }
  })
}
