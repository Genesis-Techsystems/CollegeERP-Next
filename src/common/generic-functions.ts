/**
 * Generic utility functions.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/generic-functions.ts
 *
 * Angular dependencies removed:
 *   - @angular/router -> use Next.js router in calling components
 *   - EncryptionService -> replaced with browser Web Crypto / sessionStorage wrappers
 *   - CryptoJS -> removed; encryption handled by iron-session on the server
 *
 * Session storage helpers retain the same API surface for compatibility.
 * Encryption is intentionally omitted — secrets are managed server-side via
 * iron-session. Client code should only store non-sensitive identifiers.
 */

import { GENERALCONSTANTS } from './general-constants'

// ─── Session Storage ─────────────────────────────────────────────────────────

/**
 * Store a JSON-serialised value in sessionStorage.
 * NOTE: No client-side encryption — sensitive data must never be stored here.
 */
export function setSecuredValue(key: string, value: unknown): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(key, JSON.stringify(value))
}

/**
 * Retrieve and JSON-parse a value from sessionStorage.
 * Returns `false` if the key is absent or the value cannot be parsed.
 */
export function getSecuredValue<T = unknown>(key: string): T | false {
  if (typeof sessionStorage === 'undefined') return false
  const raw = sessionStorage.getItem(key)
  if (!raw) return false
  try {
    return JSON.parse(raw) as T
  } catch {
    return false
  }
}

/** Clear all sessionStorage entries. */
export function clearSecuredValues(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.clear()
}

/** Remove a single sessionStorage entry by key. */
export function removeSecuredValue(key: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(key)
}

// ─── Object Helpers ───────────────────────────────────────────────────────────

/** Returns true when obj is a non-null object with no own enumerable keys. */
export function isEmptyObject(obj: unknown): boolean {
  return obj !== null && typeof obj === 'object' && Object.keys(obj).length === 0
}

// ─── Status Colors ────────────────────────────────────────────────────────────

const statusColors = GENERALCONSTANTS.statusColors

/**
 * Return the hex color code for a given status string.
 * Returns an empty string when the status is not found.
 */
export function getStatusColor(status: string): string {
  const match = statusColors.find((x) => x.status === status)
  return match ? match.colorCode : ''
}

// ─── Class-style API (backwards-compatible surface) ──────────────────────────

/**
 * GenericFunctions class providing the same method names as the Angular service.
 * Instantiate once per context where a shared `myParams` bag is needed.
 */
export class GenericFunctions {
  myParams: Record<string, unknown> = {}
  statusColors = GENERALCONSTANTS.statusColors

  setSecuredValue(key: string, value: unknown): void {
    setSecuredValue(key, value)
  }

  getSecuredValue<T = unknown>(key: string): T | false {
    return getSecuredValue<T>(key)
  }

  clearSecuredValues(): void {
    clearSecuredValues()
  }

  removeSecuredValue(key: string): void {
    removeSecuredValue(key)
  }

  isEmptyObject(obj: unknown): boolean {
    return isEmptyObject(obj)
  }

  getStatusColor(status: string): string {
    return getStatusColor(status)
  }
}
