import { getWashServices } from '@/features/wash/Actions/washActions'
import { WashSettings } from './wash-settings'

export default async function WashSettingsPage() {
  const result = await getWashServices()
  const services = result.success && result.data ? result.data : []

  return (
    <WashSettings
      initial={services as Parameters<typeof WashSettings>[0]['initial']}
    />
  )
}
