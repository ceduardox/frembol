export type SalaryEntryType = 'advance' | 'deduction' | 'payment' | 'bonus'

export interface SalaryEntryView {
  id: string
  type: 'advance' | 'deduction' | 'payment' | 'bonus'
  category: string | null
  amount: number
  effectiveDate: string
  note: string | null
  receiptName: string | null
  hasReceipt: boolean
  createdAt: string
}

export interface SalaryProfileView {
  id: string
  name: string
  monthlyAmount: number
  startDate: string
  cycleType: string
  cycleDay: number
  isActive: boolean
  userId: string | null
  technicianId: string | null
  entries: SalaryEntryView[]
}
