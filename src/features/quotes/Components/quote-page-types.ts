import type { QuotePartInput, QuoteLaborInput } from '@/features/quotes/Schema/quoteSchema'

export type { QuotePartInput, QuoteLaborInput }

export interface QuoteAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: string
  description: string | null
  includeInInvoice: boolean
}

export type TabType = 'details' | 'images' | 'documents'

export interface QuoteRecord {
  id: string
  quoteNumber: string | null
  title: string
  description: string | null
  status: string
  validUntil: Date | null
  subtotal: number
  taxRate: number
  taxAmount: number
  taxInclusive: boolean
  /** The stored split, read leniently; see src/lib/tax-components.ts. */
  taxComponents?: unknown
  discountType: string | null
  discountValue: number
  discountAmount: number
  totalAmount: number
  notes: string | null
  /** The warranty offered on this quote; see src/lib/warranty.ts. */
  warrantyStatus?: string | null
  warrantyMonths?: number | null
  warrantyMileage?: number | null
  warrantyNotes?: string | null
  customerMessage: string | null
  responseDismissedAt?: Date | null
  publicToken: string | null
  sharedAt: Date | null
  viewCount: number
  lastViewedAt: Date | null
  convertedToId: string | null
  inspectionId: string | null
  createdAt: Date
  updatedAt: Date
  partItems: {
    id: string
    partNumber: string | null
    name: string
    quantity: number
    unit?: string | null
    category?: string | null
    unitCost?: number
    markupPercent?: number
    unitPrice: number
    total: number
    excluded?: boolean
    inventoryPartId?: string | null
  }[]
  laborItems: {
    id: string
    description: string
    hours: number
    rate: number
    total: number
    pricingType?: string
    excluded?: boolean
  }[]
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    company: string | null
  } | null
  vehicle: {
    id: string
    make: string
    model: string
    year: number
    vin: string | null
    licensePlate: string | null
    hsn?: string | null
    tsn?: string | null
    mileage: number
  } | null
}

export const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 font-medium',
  sent: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium',
  rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium',
  expired: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium',
  converted: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 font-medium',
  changes_requested: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 font-medium',
}

export const emptyPart = (): QuotePartInput => ({
  partNumber: '',
  name: '',
  quantity: 1,
  unit: null,
  category: null,
  unitCost: 0,
  markupPercent: 0,
  unitPrice: 0,
  total: 0,
  excluded: false,
  priceOverridden: false,
  // Free-text line by default; set when picked from stock.
  inventoryPartId: null,
})

export const makeEmptyLabor = (defaultRate: number): QuoteLaborInput => ({
  description: '',
  hours: 1,
  rate: defaultRate,
  total: defaultRate,
  pricingType: 'hourly',
  excluded: false,
})

export const makeEmptyService = (): QuoteLaborInput => ({
  description: '',
  hours: 1,
  rate: 0,
  total: 0,
  pricingType: 'service',
  excluded: false,
})
