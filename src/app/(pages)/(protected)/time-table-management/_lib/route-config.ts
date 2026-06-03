export type TimetablePageKind = 'hub' | 'list' | 'form' | 'workflow' | 'view'

export type TimetablePageConfig = {
  slug: string
  title: string
  kind: TimetablePageKind
  description?: string
}

export const TIMETABLE_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'Setup',
    cards: [
      {
        label: 'Timing Sets',
        href: '/time-table-management/timing-sets',
        description: 'Define period slots and breaks for the institution',
      },
      {
        label: 'Timing Slots',
        href: '/time-table-management/timing-slots',
        description: 'Create or edit class timing slots for a timing set',
      },
      {
        label: 'Week Day Class Timings',
        href: '/time-table-management/weekDay-class-timings',
        description: 'Map timing sets to weekdays by college',
      },
    ],
  },
  {
    title: 'Timetables',
    cards: [
      {
        label: 'Manage Timetable',
        href: '/time-table-management/manage-timetable',
        description: 'Create academic timetables and date ranges',
      },
      {
        label: 'Timetable Allocation',
        href: '/time-table-management/timetable-allocation',
        description: 'Assign subjects and staff to timetable cells',
      },
      {
        label: 'Assign Resource To Timetable',
        href: '/time-table-management/create-timetable',
        description: 'Assign subjects and staff to timetable slots',
      },
      {
        label: 'View Timetable',
        href: '/time-table-management/view-timetable',
        description: 'View published class timetables',
      },
    ],
  },
  {
    title: 'Activities & Online',
    cards: [
      {
        label: 'Special Activities',
        href: '/time-table-management/special-activities',
        description: 'Extra-curricular and special activity schedules',
      },
      {
        label: 'Special Activity Attendance',
        href: '/time-table-management/special-activity-attendance',
        description: 'Attendance for special activities',
      },
      {
        label: 'Live Class Schedules',
        href: '/time-table-management/live-class-schedules',
        description: 'Online live class schedule management',
      },
    ],
  },
]

const LIST_SLUGS: Record<string, string> = {
  'timing-sets': 'Timing Sets',
  'timing-slots': 'Timing Slots',
  'weekDay-class-timings': 'Week Day Class Timings',
  'manage-timetable': 'Manage Timetable',
  'timetable-allocation': 'Timetable Allocation',
  'create-timetable': 'Assign Resource To Timetable',
  'view-timetable': 'View Timetable',
  'timetable-dashboard': 'Timetable Dashboard',
  'special-activities': 'Special Activities',
  'special-activity-attendance': 'Special Activity Attendance',
  'live-class-schedules': 'Live Class Schedules',
  'special-activities/add-activity': 'Add Special Activity',
  'special-activity-attendance/take-attendance': 'Take Special Activity Attendance',
}

const EXTRA_PAGES: Record<string, TimetablePageConfig> = {
  'special-activities/add-activity': {
    slug: 'special-activities/add-activity',
    title: 'Add Special Activity',
    kind: 'form',
  },
  'special-activity-attendance/take-attendance': {
    slug: 'special-activity-attendance/take-attendance',
    title: 'Take Attendance',
    kind: 'form',
  },
}

function titleFromSlug(slug: string): string {
  return (
    LIST_SLUGS[slug] ??
    slug
      .split('/')
      .pop()!
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export function getTimetableConfig(slug: string): TimetablePageConfig {
  if (slug === 'timetable-dashboard' || slug === '') {
    return {
      slug: 'timetable-dashboard',
      title: 'Timetable Dashboard',
      kind: 'hub',
      description:
        'Generate teacher schedules easily and avoid time conflicts when building class timetables.',
    }
  }
  if (EXTRA_PAGES[slug]) return EXTRA_PAGES[slug]
  return {
    slug,
    title: titleFromSlug(slug),
    kind: 'list',
  }
}
