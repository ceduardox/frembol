import { ServiceRecordPage } from '@/features/vehicles/Components/service-page/ServiceRecordPage'

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; serviceId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id, serviceId } = await params
  const sp = await searchParams
  const initialTab = typeof sp.tab === 'string' ? sp.tab : undefined

  const localPreview = process.env.NODE_ENV === 'development'
  const serviceUrl =
    '/vehicles/' + encodeURIComponent(id) + '/service/' + encodeURIComponent(serviceId)

  if (localPreview && sp.preview === 'mobile') {
    return (
      <div style={{ height: '100dvh', overflow: 'auto', background: '#e8e8e8', padding: '16px' }}>
        <div style={{ maxWidth: 440, margin: '0 auto 12px', color: '#171717' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Vista móvil · 390 px</h1>
          <p style={{ fontSize: 14 }}>Esta es la orden real en formato teléfono.</p>
          <a href={serviceUrl + '?preview=modern'} style={{ textDecoration: 'underline' }}>
            Abrir en tamaño completo
          </a>
        </div>
        <iframe
          title="Orden de servicio en teléfono"
          src={serviceUrl + '?preview=modern'}
          style={{
            display: 'block',
            width: 'min(390px, 100%)',
            height: 'calc(100dvh - 130px)',
            minHeight: 500,
            margin: '0 auto',
            border: '1px solid #aaa',
            borderRadius: 16,
            background: 'white',
          }}
        />
      </div>
    )
  }

  return (
    <ServiceRecordPage
      serviceId={serviceId}
      initialTab={initialTab}
      previewModern={localPreview && sp.preview === 'modern'}
    />
  )
}
