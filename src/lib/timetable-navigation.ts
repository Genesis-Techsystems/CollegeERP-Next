import type { NavItem } from '@/types/navigation'

/** Canonical App Router base for Angular `time-table-management` module. */
export const TIMETABLE_MGMT_BASE = '/time-table-management'

/** Default sidebar children when API module has no nested pages (Angular parity). */
export const TIMETABLE_SIDEBAR_CHILDREN: NavItem[] = [
  {
    id: 'ttm_timing_sets',
    label: 'TimingSets',
    icon: 'arrow_forward',
    href: `${TIMETABLE_MGMT_BASE}/timing-sets`,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'ttm_manage_timetable',
    label: 'Create Class TimeTable',
    icon: 'arrow_forward',
    href: `${TIMETABLE_MGMT_BASE}/manage-timetable`,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'ttm_allocation',
    label: 'Timetable Allocation',
    icon: 'arrow_forward',
    href: `${TIMETABLE_MGMT_BASE}/timetable-allocation`,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'ttm_assign_resource',
    label: 'Assign Resource To Timetable',
    icon: 'arrow_forward',
    href: `${TIMETABLE_MGMT_BASE}/create-timetable`,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'ttm_view_timetable',
    label: 'View Class TimeTable',
    icon: 'arrow_forward',
    href: `${TIMETABLE_MGMT_BASE}/view-timetable`,
    sortOrder: 6,
    isActive: true,
  },
]

export function isTimetableModuleLabel(label?: string): boolean {
  if (!label) return false
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return key.includes('timetable') && key.includes('management')
}

/** Ensure Time-Table Management always shows the four legacy sub-tabs. */
export function ensureTimetableNavChildren(items: NavItem[]): NavItem[] {
  return items.map((item) => {
    const children = item.children?.length
      ? ensureTimetableNavChildren(item.children)
      : undefined

    if (isTimetableModuleLabel(item.label)) {
      const merged = mergeTimetableSidebarChildren(children ?? [])
      return { ...item, href: undefined, children: merged }
    }

    if (children) return { ...item, children }
    return item
  })
}

function mergeTimetableSidebarChildren(existing: NavItem[]): NavItem[] {
  if (existing.length === 0) return [...TIMETABLE_SIDEBAR_CHILDREN]

  const byRoute = new Set(
    existing.map((c) => mapTimetableNavRoute(c.href, c.label) ?? c.href ?? '').filter(Boolean),
  )
  const extras = TIMETABLE_SIDEBAR_CHILDREN.filter((fallback) => {
    const route = fallback.href ?? ''
    return route && !byRoute.has(route)
  })
  return [...existing, ...extras].sort((a, b) => a.sortOrder - b.sortOrder)
}

const SLUG_ALIASES: Record<string, string> = {
  'timing-sets': 'timing-sets',
  timingsets: 'timing-sets',
  'timing-set': 'timing-sets',
  'timing-slots': 'timing-slots',
  timingslots: 'timing-slots',
  'weekday-class-timings': 'weekDay-class-timings',
  'weekday-classtimings': 'weekDay-class-timings',
  'weekday-class-timings': 'weekDay-class-timings',
  'manage-timetable': 'manage-timetable',
  'create-class-timetable': 'manage-timetable',
  'create-classtimetable': 'manage-timetable',
  'timetable-allocation': 'timetable-allocation',
  /** Angular `#/time-table-management/create-timetable` — assign staff/subjects to slots */
  'assign-resources-to-timetable': 'create-timetable',
  'assign-resources': 'create-timetable',
  'assign-resource-to-timetable': 'create-timetable',
  'assign-resource': 'create-timetable',
  'create-timetable': 'create-timetable',
  'view-timetable': 'view-timetable',
  'view-class-timetable': 'view-timetable',
  'view-classtimetable': 'view-timetable',
  'timetable-dashboard': 'timetable-dashboard',
  'special-activities': 'special-activities',
  'special-activity-attendance': 'special-activity-attendance',
  'live-class-schedules': 'live-class-schedules',
}

function normalizeLabelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Map sidebar label (display name) to Next route. */
export function mapTimetableLabelToRoute(label?: string): string | null {
  if (!label) return null
  const key = normalizeLabelKey(label)

  if (key.includes('timingset') && !key.includes('slot')) return `${TIMETABLE_MGMT_BASE}/timing-sets`
  if (key.includes('timingslot')) return `${TIMETABLE_MGMT_BASE}/timing-slots`
  if (key.includes('weekday') && key.includes('class') && key.includes('timing')) {
    return `${TIMETABLE_MGMT_BASE}/weekDay-class-timings`
  }
  if (key === 'timetablemanagement') {
    return `${TIMETABLE_MGMT_BASE}/timetable-dashboard`
  }
  if (key.includes('createclass') && key.includes('timetable')) {
    return `${TIMETABLE_MGMT_BASE}/manage-timetable`
  }
  if (key.includes('managetimetable') && !key.endsWith('management')) {
    return `${TIMETABLE_MGMT_BASE}/manage-timetable`
  }
  if (key.includes('timetableallocation')) {
    return `${TIMETABLE_MGMT_BASE}/timetable-allocation`
  }
  /** Angular `create-timetable` — "Assign Resource(s) To Timetable" (not timing-set allocation). */
  if (key.includes('assign') && key.includes('resource')) {
    return `${TIMETABLE_MGMT_BASE}/create-timetable`
  }
  if (key.includes('viewclass') && key.includes('timetable')) {
    return `${TIMETABLE_MGMT_BASE}/view-timetable`
  }
  if (key.includes('viewtimetable')) return `${TIMETABLE_MGMT_BASE}/view-timetable`
  if (key.includes('createtimetable') && !key.includes('class')) {
    return `${TIMETABLE_MGMT_BASE}/create-timetable`
  }
  if (key.includes('timetabledashboard')) return `${TIMETABLE_MGMT_BASE}/timetable-dashboard`
  if (key.includes('specialactivit') && key.includes('attendance')) {
    return `${TIMETABLE_MGMT_BASE}/special-activity-attendance`
  }
  if (key.includes('specialactivit')) return `${TIMETABLE_MGMT_BASE}/special-activities`
  if (key.includes('liveclass')) return `${TIMETABLE_MGMT_BASE}/live-class-schedules`

  return null
}

function lastPathSegment(href: string): string {
  const cleaned = href.replace(/[#?].*$/, '').replace(/\/+$/, '')
  const parts = cleaned.split('/').filter(Boolean)
  return (parts[parts.length - 1] ?? '').toLowerCase()
}

/** Map legacy Angular href + label to a Next.js timetable route. */
export function mapTimetableNavRoute(href?: string, label?: string): string | null {
  const hrefRaw = (href ?? '').trim()
  const hrefLower = hrefRaw.toLowerCase()
  const labelKey = label ? normalizeLabelKey(label) : ''

  if (labelKey.includes('assign') && labelKey.includes('resource')) {
    return `${TIMETABLE_MGMT_BASE}/create-timetable`
  }

  if (hrefLower.includes('create-timetable')) {
    return `${TIMETABLE_MGMT_BASE}/create-timetable`
  }
  if (hrefLower.includes('timetable-allocation')) {
    return `${TIMETABLE_MGMT_BASE}/timetable-allocation`
  }

  const byLabel = mapTimetableLabelToRoute(label)
  if (byLabel) return byLabel

  if (!hrefRaw || hrefRaw === '#') return null

  if (hrefLower.includes('time-table-management')) {
    const idx = hrefLower.indexOf('time-table-management')
    const tail = hrefRaw.slice(idx).split('?')[0].replace(/\/+$/, '')
    if (tail === 'time-table-management') return `${TIMETABLE_MGMT_BASE}/timetable-dashboard`
    return tail.startsWith('/') ? tail : `/${tail}`
  }

  if (hrefLower.includes('/apps/timetable') || hrefLower.includes('/apps/time-table')) {
    const seg = lastPathSegment(hrefLower)
    const slug = SLUG_ALIASES[seg] ?? SLUG_ALIASES[seg.replace(/-/g, '')]
    if (slug) return `${TIMETABLE_MGMT_BASE}/${slug}`
  }

  // Module-relative paths like `timetable/timing-sets` or `time-table-management/timetable/manage-timetable`
  if (hrefLower.includes('timetable')) {
    const seg = lastPathSegment(hrefLower)
    const compact = seg.replace(/-/g, '')
    const slug = SLUG_ALIASES[seg] ?? SLUG_ALIASES[compact]
    if (slug) return `${TIMETABLE_MGMT_BASE}/${slug}`
  }

  const seg = lastPathSegment(hrefLower)
  const slug = SLUG_ALIASES[seg] ?? SLUG_ALIASES[seg.replace(/-/g, '')]
  if (slug) return `${TIMETABLE_MGMT_BASE}/${slug}`

  return null
}
