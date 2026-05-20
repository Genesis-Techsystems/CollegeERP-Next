/**
 * Debug mode constants.
 *
 * IS_DEBUG_MODE is evaluated at runtime from the NEXT_PUBLIC_DEBUG_MODE env var.
 * Next.js replaces NEXT_PUBLIC_* vars at build time, so setting it to 'false'
 * in production will dead-code-eliminate all IS_DEBUG_MODE branches at build.
 *
 * To enable: set NEXT_PUBLIC_DEBUG_MODE=true in .env.local
 * To disable: omit the var (defaults to false)
 */
export const IS_DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'

/** localStorage key for all persisted debug settings */
export const DEBUG_STORAGE_KEY = 'erp_debug_settings'
