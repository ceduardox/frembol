import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Frembol — Gestión de Taller y Lavadero',
    short_name: 'Frembol',
    description:
      'Sistema de gestión para talleres mecánicos y lavaderos: órdenes de trabajo, presupuestos, facturas, clientes, vehículos, repuestos, inspecciones y recordatorios, todo en un solo lugar.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    // Chrome and Edge honour 'fullscreen' on Android and ChromeOS, which is
    // what a tablet in the bay wants. Every desktop falls back down the chain
    // to 'standalone', because no desktop browser launches a web app
    // fullscreen from the manifest. The in-app toggle covers that case.
    display_override: ['fullscreen', 'standalone'],
    display: 'standalone',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#09090b',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
