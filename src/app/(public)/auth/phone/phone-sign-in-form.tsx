'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard, AuthShell } from '@/components/auth/auth-shell'
import { CountryPicker } from '@/features/team/Components/CountryPicker'
import { DIAL_CODES } from '@/features/team/Lib/dialCodes'
import { signInWithPhone } from '@/features/technician-auth/Actions/signInWithPhone'

export function PhoneSignInForm() {
  const t = useTranslations('auth.phone')
  const tc = useTranslations('common')
  const router = useRouter()
  const [region, setRegion] = useState('BO')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const dialCode = DIAL_CODES.find((c) => c.region === region)?.dial
    const result = await signInWithPhone({ phone, dialCode, password })
    if (result.success) {
      router.push('/')
      router.refresh()
      return
    }

    setError(t(result.error))
    setLoading(false)
  }

  return (
    <AuthShell pitch={false}>
      <AuthCard>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phoneLabel')}</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_1.2fr] gap-2">
              <CountryPicker
                value={region}
                onChange={setRegion}
                disabled={loading}
                className="h-11 bg-background/50"
              />
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel-national"
                className="h-11 bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-password">{tc('form.password')}</Label>
            <Input
              id="phone-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 bg-background/50"
            />
          </div>

          <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submit')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm">
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            {t('backToEmail')}
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  )
}
