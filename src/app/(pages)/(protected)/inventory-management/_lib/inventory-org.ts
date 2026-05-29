'use client'

export function getInventoryOrganizationId(): number {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return 0
  const n = Number(globalThis.localStorage.getItem('organizationId') ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}
