export type EventsPageKind = 'hub' | 'list' | 'form' | 'calendar'

export type EventsPageConfig = {
  slug: string
  title: string
  kind: EventsPageKind
  angularPath: string
}

export const EVENTS_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'College events',
    cards: [
      {
        label: 'Events Dashboard',
        href: '/events/events-dashboard',
        description: 'Events overview',
      },
      {
        label: 'Add Event',
        href: '/events/add-event',
        description: 'Create college events',
      },
      {
        label: 'Event Type',
        href: '/events/event-type',
        description: 'Event type master',
      },
      {
        label: 'Department Events',
        href: '/events/department-events',
        description: 'Department-level events',
      },
      {
        label: 'College Calendar',
        href: '/events/college-calendar',
        description: 'Institution calendar view',
      },
    ],
  },
  {
    title: 'Calendars',
    cards: [
      {
        label: 'Events Calendar',
        href: '/events/events-calendar',
        description: 'Student events calendar (event-calendar module)',
      },
      {
        label: 'Staff Events',
        href: '/events/staff-events',
        description: 'Staff events calendar',
      },
      {
        label: 'School Calendar',
        href: '/events/school-calendar',
        description: 'School-wide calendar',
      },
    ],
  },
]

const PAGE_META: Record<string, Omit<EventsPageConfig, 'slug'>> = {
  'events-dashboard': { title: 'Events Dashboard', kind: 'hub', angularPath: 'events/events-dashboard' },
  'add-event': { title: 'Add Event', kind: 'form', angularPath: 'events/add-event' },
  'event-type': { title: 'Event Type', kind: 'list', angularPath: 'events/event-type' },
  'department-events': { title: 'Department Events', kind: 'list', angularPath: 'events/department-events' },
  'college-calendar': { title: 'College Calendar', kind: 'calendar', angularPath: 'events/college-calendar' },
  'events-calendar': { title: 'Events Calendar', kind: 'calendar', angularPath: 'events/events-calendar' },
  'staff-events': { title: 'Staff Events', kind: 'calendar', angularPath: 'events/staff-events' },
  'school-calendar': { title: 'School Calendar', kind: 'calendar', angularPath: 'events/school-calendar' },
}

function titleFromSlug(slug: string): string {
  return slug
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getEventsConfig(slug: string): EventsPageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  if (!key || key === 'events-dashboard') {
    return {
      slug: key || 'events-dashboard',
      title: 'Events Dashboard',
      kind: 'hub',
      angularPath: 'events/events-dashboard',
    }
  }
  const meta = PAGE_META[key]
  if (meta) return { slug: key, ...meta }
  return {
    slug: key,
    title: titleFromSlug(key),
    kind: 'list',
    angularPath: `events/${key}`,
  }
}
