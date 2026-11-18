export type SalaryCycleType = 'monthly' | 'days30'
export type SalaryEntryType = 'advance' | 'deduction' | 'payment' | 'bonus'
export type SalaryDeductionCategory = 'absence' | 'other'

export interface SalaryPeriod {
  start: string
  end: string
}

export interface SalaryProfileForPeriod {
  monthlyAmount: number
  startDate: string
  cycleType: string
  cycleDay: number
}

export interface SalaryEntryForBalance {
  type: string
  amount: number
  effectiveDate: string
}

const DAY_MS = 86_400_000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function parseIso(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toIso(parseIso(value)) === value
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDaysIso(value: string, days: number): string {
  return toIso(new Date(parseIso(value).getTime() + days * DAY_MS))
}

export function salaryPeriodFor(
  profile: SalaryProfileForPeriod,
  reference: string = todayIso()
): SalaryPeriod {
  const ref = parseIso(reference)
  const cycleDay = Math.min(28, Math.max(1, Math.round(profile.cycleDay) || 1))

  if (profile.cycleType === 'days30') {
    const anchor = parseIso(profile.startDate)
    const days = Math.floor((ref.getTime() - anchor.getTime()) / DAY_MS)
    const index = Math.max(0, Math.floor(days / 30))
    const start = new Date(anchor.getTime() + index * 30 * DAY_MS)
    return { start: toIso(start), end: toIso(new Date(start.getTime() + 29 * DAY_MS)) }
  }

  const year = ref.getUTCFullYear()
  const month = ref.getUTCMonth()
  const beforeCycleDay = ref.getUTCDate() < cycleDay
  const start = new Date(Date.UTC(year, month - (beforeCycleDay ? 1 : 0), cycleDay))
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, cycleDay))
  return { start: toIso(start), end: toIso(new Date(next.getTime() - DAY_MS)) }
}

export function entriesInPeriod<T extends { effectiveDate: string }>(
  entries: T[],
  period: SalaryPeriod
): T[] {
  return entries
    .filter((entry) => entry.effectiveDate >= period.start && entry.effectiveDate <= period.end)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
}

/** Calendar time since the salary started, for the team table. */
export function tenureParts(startDate: string, reference: string = todayIso()) {
  const start = parseIso(startDate)
  const end = parseIso(reference)
  if (end < start) return { years: 0, months: 0, days: 0 }

  let years = end.getUTCFullYear() - start.getUTCFullYear()
  let months = end.getUTCMonth() - start.getUTCMonth()
  let days = end.getUTCDate() - start.getUTCDate()

  if (days < 0) {
    months -= 1
    const previousMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0))
    days += previousMonth.getUTCDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

export function roundSalary(value: number): number {
  return Math.round(value * 100) / 100
}

export function salaryBalance(
  profile: SalaryProfileForPeriod,
  entries: SalaryEntryForBalance[]
) {
  const advances = roundSalary(
    entries
      .filter((entry) => entry.type === 'advance')
      .reduce((sum, entry) => sum + entry.amount, 0)
  )
  const deductions = roundSalary(
    entries
      .filter((entry) => entry.type === 'deduction')
      .reduce((sum, entry) => sum + entry.amount, 0)
  )
  const payments = roundSalary(
    entries
      .filter((entry) => entry.type === 'payment')
      .reduce((sum, entry) => sum + entry.amount, 0)
  )
  const bonuses = roundSalary(
    entries
      .filter((entry) => entry.type === 'bonus')
      .reduce((sum, entry) => sum + entry.amount, 0)
  )
  const base = profile.monthlyAmount > 0 ? roundSalary(profile.monthlyAmount) : 0
  const earned = roundSalary(base + bonuses)
  const pending = roundSalary(earned - advances - deductions - payments)

  return { base, advances, deductions, payments, bonuses, earned, pending }
}
