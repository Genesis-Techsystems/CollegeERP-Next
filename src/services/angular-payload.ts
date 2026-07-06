/**
 * Shared helpers to shape create/update bodies like the Angular CRUD modals.
 * Spring returns 422 when React sends raw form values (empty strings, wrong keys).
 */

export function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

export function asNullableString(value: unknown): string | null {
  const text = asString(value).trim()
  return text.length > 0 ? text : null
}

export function asNullableNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Campus / building / block / floor / room — `reason: "active"` when active. */
export function angularLowerActiveReason(
  isActive: boolean,
  reason?: unknown,
  existingReason?: unknown,
): string {
  if (isActive) return 'active'
  return asNullableString(reason) ?? asNullableString(existingReason) ?? 'inactive'
}

/** Organization — `reason: "Active"` when active. */
export function angularTitleActiveReason(
  isActive: boolean,
  reason?: unknown,
  existingReason?: unknown,
): string {
  if (isActive) return 'Active'
  return asNullableString(reason) ?? asNullableString(existingReason) ?? 'Inactive'
}

/** College — `reason: null` when active. */
export function angularCollegeReason(
  isActive: boolean,
  reason?: unknown,
  existingReason?: unknown,
): string | null {
  if (isActive) return null
  return asNullableString(reason) ?? asNullableString(existingReason)
}
