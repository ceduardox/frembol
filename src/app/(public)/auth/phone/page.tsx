import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PhoneSignInForm } from './phone-sign-in-form'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.phone')
  return { title: t('title') }
}

export default function PhoneSignInPage() {
  return <PhoneSignInForm />
}
