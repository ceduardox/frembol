import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: [
          '/share/invoice/',
          '/share/work-order/',
          '/share/status-report/',
          '/api/public/share/invoice/',
          '/api/public/files/',
        ],
      },
    ],
  }
}
