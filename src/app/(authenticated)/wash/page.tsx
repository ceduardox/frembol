import { PageHeader } from '@/components/page-header'
import { getAuthContext } from '@/lib/get-auth-context'
import { workshopMoneyFormatter } from '@/lib/workshop-currency'
import { getWashQueue, getWashSummary } from '@/features/wash/Actions/washActions'
import { WashQueue } from './wash-queue'
import { WashSummary } from './wash-summary'

export default async function WashQueuePage() {
  const [result, summaryResult, auth] = await Promise.all([
    getWashQueue(),
    getWashSummary(),
    getAuthContext(),
  ])
  const rows = result.success && result.data ? result.data : []
  const summary =
    summaryResult.success && summaryResult.data
      ? summaryResult.data
      : { stages: {}, deliveredToday: 0, revenueThisMonth: 0, topServices: [] }
  const formatMoney = await workshopMoneyFormatter(auth?.organizationId)

  return (
    <>
      <PageHeader />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
        <WashSummary summary={summary} formatMoney={formatMoney} />
        <WashQueue initial={rows as Parameters<typeof WashQueue>[0]['initial']} />
      </div>
    </>
  )
}
