import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { getLayoutData } from '@/lib/get-layout-data'
import { getAuthContext } from '@/lib/get-auth-context'
import { resolveCurrencyCode, resolveCurrencyFormat } from '@/lib/currencies'
import { getSalaryData } from '@/features/salaries/Actions/salaryActions'
import { SalariesClient } from './salaries-client'

export default async function SalariesPage() {
  const data = await getLayoutData()
  if (data.status === 'unauthenticated') redirect('/auth/sign-in')
  if (data.status === 'no-organization') redirect('/onboarding')

  const isAdmin =
    data.role === 'owner' || data.role === 'admin' || data.role === 'super_admin'
  if (!isAdmin) {
    const ctx = await getAuthContext()
    if (!ctx?.isAdmin) redirect('/')
  }

  const result = await getSalaryData()

  return (
    <>
      <PageHeader />
      <SalariesClient
        initial={result.success && result.data ? result.data : []}
        currencyCode={resolveCurrencyCode(data.currencyCode)}
        currencyFormat={resolveCurrencyFormat(data.currencyFormat)}
      />
    </>
  )
}
