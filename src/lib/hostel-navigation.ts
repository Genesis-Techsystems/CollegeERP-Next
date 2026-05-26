/**
 * Hostel sidebar href resolution — mirrors NavItem forced routes and Angular paths.
 * Used for active-state matching and navigation targets.
 */

export function mapHostelNavRoute(href?: string, label?: string): string | null {
  const hrefLower = (href ?? '').toLowerCase()
  const labelLower = (label ?? '').toLowerCase().trim()

  // Admin institutional masters (rooms, room types, room details) — not hostel.
  if (hrefLower.includes('institutional-masters')) {
    return null
  }

  if (labelLower === 'hostel types' || hrefLower.includes('hostel-types')) {
    return '/hostel/hostel-types'
  }
  if (
    (labelLower.includes('hostel') && labelLower.includes('detail')) ||
    hrefLower.includes('hostel-details')
  ) {
    return '/hostel/hostel-details'
  }
  if (
    labelLower === 'hostel' &&
    !labelLower.includes('type') &&
    !labelLower.includes('fee') &&
    !labelLower.includes('payment') &&
    !labelLower.includes('register') &&
    !labelLower.includes('visitor') &&
    !labelLower.includes('discount')
  ) {
    return '/hostel/hostel-details'
  }
  // Admin master-settings screen — not hostel (label "Room Details" contains "room").
  if (
    hrefLower.includes('room-detail') ||
    hrefLower.includes('master-settings/room-detail') ||
    labelLower.includes('room detail')
  ) {
    return null
  }
  if (labelLower.includes('room') && labelLower.includes('charge')) {
    return '/hostel/room-charges'
  }
  if (hrefLower.includes('rooms-list')) {
    return '/hostel/rooms-list'
  }
  if (hrefLower.includes('room-allocation')) {
    return '/hostel/room-allocation'
  }
  if (labelLower.includes('room') && labelLower.includes('allocation') && !labelLower.includes('view')) {
    return '/hostel/rooms-list'
  }
  if (
    labelLower === 'rooms' ||
    (labelLower.includes('room') &&
      !labelLower.includes('allocation') &&
      !labelLower.includes('charge') &&
      !labelLower.includes('list') &&
      !labelLower.includes('view') &&
      !labelLower.includes('detail'))
  ) {
    return '/hostel/rooms'
  }
  if (labelLower.includes('view') && labelLower.includes('room')) {
    return '/hostel/view-room-details'
  }
  if (labelLower.includes('hostel') && labelLower.includes('discount')) {
    return '/hostel/hostel-discounts'
  }
  if (labelLower.includes('hostel') && labelLower.includes('register')) {
    return '/hostel/hostel-register'
  }
  if (labelLower.includes('hostel') && labelLower.includes('visitor') && !labelLower.includes('summary')) {
    return '/hostel/hostel-visitor'
  }
  if (labelLower.includes('hostel') && labelLower.includes('payment')) {
    return '/accounts-and-fees/fees-collection/hostel-payment'
  }
  if (hrefLower.includes('fees-collection/hostel-payment')) {
    return '/accounts-and-fees/fees-collection/hostel-payment'
  }
  if (labelLower.includes('visitor') && labelLower.includes('summary')) {
    return '/hostel/monthly-visitor-summary-report'
  }
  if (labelLower.includes('hostel') && labelLower.includes('dashboard')) {
    return '/hostel/hostel-dashboard'
  }

  return null
}

/** Room allocation sub-step should keep the "Room Allocation" menu item active. */
export function isHostelRoomAllocationPath(pathname: string): boolean {
  const path = pathname.toLowerCase()
  return path === '/hostel/rooms-list' || path.startsWith('/hostel/room-allocation')
}

export function isHostelModulePath(pathname: string): boolean {
  return pathname.toLowerCase().startsWith('/hostel/')
}
