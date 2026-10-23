/**
 * Where the technician app lives.
 *
 * One constant rather than a URL typed into each screen that offers it: the
 * desk's handoff dialog, the page a scanned QR lands on, and the docs all
 * point at the same listing, and a store link that has drifted in one of them
 * is a technician who cannot install the app.
 */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.torqvoice.technician'

/** The Android package, which is also what a deep link resolves against. */
export const ANDROID_PACKAGE = 'com.torqvoice.technician'

/**
 * Whether the technician app is published to the stores yet.
 *
 * False until it ships: the app-only setup steps then hide their store links
 * and point people at the web invitation instead of a dead end. Flip to true
 * when the app is available.
 */
export const TECH_APP_PUBLISHED = false
