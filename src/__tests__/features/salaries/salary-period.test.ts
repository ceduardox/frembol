import { describe, expect, it } from 'vitest'
import {
  salaryBalance,
  salaryPeriodFor,
  salaryPeriodsInRange,
  tenureParts,
  type SalaryProfileForPeriod,
} from '@/features/salaries/Lib/salaryPeriod'

const profile: SalaryProfileForPeriod = {
  monthlyAmount: 3500,
  startDate: '2026-11-01',
  cycleType: 'monthly',
  cycleDay: 5,
}

describe('salary periods', () => {
  it('counts a fixed monthly cycle from the chosen day', () => {
    expect(salaryPeriodFor(profile, '2026-11-18')).toEqual({
      start: '2026-11-05',
      end: '2026-12-04',
    })
    expect(salaryPeriodFor(profile, '2026-11-03')).toEqual({
      start: '2026-10-05',
      end: '2026-11-04',
    })
  })

  it('counts rolling 30-day periods from the start date', () => {
    const rolling = { ...profile, cycleType: 'days30', cycleDay: 1 }
    expect(salaryPeriodFor(rolling, '2026-11-18')).toEqual({
      start: '2026-11-01',
      end: '2026-11-30',
    })
    expect(salaryPeriodFor(rolling, '2026-12-02')).toEqual({
      start: '2026-12-01',
      end: '2026-12-30',
    })
  })

  it('deducts advances and payments from the salary', () => {
    const balance = salaryBalance(profile, [
      { type: 'advance', amount: 500, effectiveDate: '2026-11-10' },
      { type: 'payment', amount: 3000, effectiveDate: '2026-11-18' },
    ])
    expect(balance.base).toBe(3500)
    expect(balance.advances).toBe(500)
    expect(balance.payments).toBe(3000)
    expect(balance.pending).toBe(0)
  })

  it('deducts absences and other reasons', () => {
    const balance = salaryBalance(profile, [
      { type: 'deduction', amount: 100, effectiveDate: '2026-11-10' },
      { type: 'deduction', amount: 50, effectiveDate: '2026-11-11' },
    ])
    expect(balance.deductions).toBe(150)
    expect(balance.pending).toBe(3350)
  })

  it('reads seniority in calendar years, months and days', () => {
    expect(tenureParts('2026-11-01', '2026-11-18')).toEqual({
      years: 0,
      months: 0,
      days: 17,
    })
    expect(tenureParts('2025-09-05', '2026-11-18')).toEqual({
      years: 1,
      months: 2,
      days: 13,
    })
  })

  it('lists every period in a history range, oldest first', () => {
    expect(
      salaryPeriodsInRange({ ...profile, startDate: '2026-09-05' }, '2026-09-01', '2026-10-31')
    ).toEqual([
      { start: '2026-09-05', end: '2026-10-04' },
      { start: '2026-10-05', end: '2026-11-04' },
    ])
  })
})
