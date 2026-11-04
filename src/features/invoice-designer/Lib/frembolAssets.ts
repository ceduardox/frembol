let cachedLogo: string | null = null
let cachedBrandText: string | null = null
let cachedTorno: string | null = null

/**
 * Returns the Frembol shield logo as a base64 data URI (server/node)
 * or public path (browser).
 */
export function getFrembolLogo(): string {
  if (cachedLogo) return cachedLogo
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    const p = path.join(process.cwd(), 'public', 'images', 'frembol', 'logo_frembol_opt.png')
    if (fs.existsSync(p)) {
      cachedLogo = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
      return cachedLogo
    }
  } catch {
    // fallback for browser environment
  }
  return '/images/frembol/logo_frembol_opt.png'
}

/**
 * Returns the Frembol brand name banner as a base64 data URI (server/node)
 * or public path (browser).
 */
export function getFrembolBrandText(): string {
  if (cachedBrandText) return cachedBrandText
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    const p = path.join(process.cwd(), 'public', 'images', 'frembol', 'frembol2_opt.png')
    if (fs.existsSync(p)) {
      cachedBrandText = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
      return cachedBrandText
    }
  } catch {
    // fallback for browser environment
  }
  return '/images/frembol/frembol2_opt.png'
}

/**
 * Returns the lathe machine (torno) as a base64 data URI (server/node)
 * or public path (browser).
 */
export function getFrembolTorno(): string {
  if (cachedTorno) return cachedTorno
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    const p = path.join(process.cwd(), 'public', 'images', 'frembol', 'torno_opt.png')
    if (fs.existsSync(p)) {
      cachedTorno = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
      return cachedTorno
    }
  } catch {
    // fallback for browser environment
  }
  return '/images/frembol/torno_opt.png'
}
