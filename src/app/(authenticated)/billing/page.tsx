import { resolveCurrencyCode } from '@/lib/currencies'
import { resolveListSort } from '@/lib/list-sort-preference.server'
import { getBillingHistory } from '@/features/billing/Actions/billingActions'
import { getDisplaySettings } from '@/features/settings/Actions/settingsActions'
import { SETTING_KEYS } from '@/features/settings/Schema/settingsSchema'
import { PageHeader } from '@/components/page-header'
import { ListPage } from '@/components/list-page'
import { cookies } from 'next/headers'
import { getAuthContext } from '@/lib/get-auth-context'
import { getCachedMembership } from '@/lib/cached-session'
import { COMPLETED_ONLY_COOKIE, parseCompletedOnlyCookie } from '@/lib/completed-only-preference'
import BillingClient from './billing-client'

/** The wash desk sees its own invoices by default; the admin sees everything. */
async function defaultWashFilter() {
  const auth = await getAuthContext()
  if (!auth || auth.isAdmin) return ''
  const membership = await getCachedMembership(auth.userId)
  return membership?.customRole?.homePanel === 'wash' ? 'wash' : ''
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    search?: string
    status?: string
    delivery?: string
    completed?: string
    kind?: string
    sortBy?: string
    sortOrder?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 20
  const search = params.search || ''
  const statusFilter = params.status || 'all'
  const deliveryFilter = params.delivery === 'unviewed' ? 'unviewed' : ''
  const kindFilter = ['vehicle', 'brakes', 'wash', 'parts'].includes(params.kind ?? '')
    ? (params.kind as string)
    : params.kind === undefined
      ? await defaultWashFilter()
      : ''
  // The URL wins, as with sorting; otherwise the switch as this browser left it.
  const completedOnly =
    params.completed !== undefined
      ? params.completed === '1'
      : parseCompletedOnlyCookie((await cookies()).get(COMPLETED_ONLY_COOKIE)?.value).has('billing')
  // No column asked for anywhere means the list keeps its own default, which
  // getBillingHistory reads as newest first.
  const sort = await resolveListSort('billing', params, { sortBy: undefined, sortOrder: 'desc' })
  const sortBy = sort.sortBy || ''
  const sortOrder = sort.sortOrder

  const [result, settingsResult] = await Promise.all([
    getBillingHistory({
      page,
      pageSize,
      search,
      status: statusFilter,
      delivery: deliveryFilter,
      completedOnly,
      jobKind: kindFilter || undefined,
      sortBy,
      sortOrder,
    }),
    getDisplaySettings([SETTING_KEYS.CURRENCY_CODE]),
  ])

  const settings = settingsResult.success && settingsResult.data ? settingsResult.data : {}
  const currencyCode = resolveCurrencyCode(settings[SETTING_KEYS.CURRENCY_CODE])

  if (!result.success || !result.data) {
    return (
      <>
        <PageHeader />
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">{result.error || 'Failed to load billing data'}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader />
      <ListPage>
        <BillingClient
          data={result.data}
          currencyCode={currencyCode}
          search={search}
          statusFilter={statusFilter}
          deliveryFilter={deliveryFilter}
          kindFilter={kindFilter}
          completedOnly={completedOnly}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </ListPage>
    </>
  )
}
