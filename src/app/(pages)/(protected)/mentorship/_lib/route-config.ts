export type MentorshipPageKind = 'hub' | 'list' | 'form' | 'workflow'

export type MentorshipPageConfig = {
  slug: string
  title: string
  kind: MentorshipPageKind
  angularPath: string
}

export const MENTORSHIP_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'Staff mentorship',
    cards: [
      {
        label: 'Schedule PTM',
        href: '/mentorship/schedule-ptm',
        description: 'Parent–teacher meetings (staff-mentorship)',
      },
      {
        label: 'Assign Mentor To Students',
        href: '/mentorship/assign-mentor-to-students',
        description: 'Assign counselors/mentors to students',
      },
      {
        label: 'Teacher Meeting',
        href: '/mentorship/schedule-ptm/teacher-meeting',
        description: 'Teacher meeting view under schedule PTM',
      },
    ],
  },
  {
    title: 'Admin counseling',
    cards: [
      {
        label: 'Counseling Dashboard',
        href: '/mentorship/counseling-dashboard',
        description: 'Counseling overview (admin-counseling)',
      },
      {
        label: 'Activity Type',
        href: '/mentorship/activity-type',
        description: 'Counseling activity types',
      },
      {
        label: 'Assign Counselor',
        href: '/mentorship/assign-counselor',
        description: 'Assign counselors to students',
      },
      {
        label: 'Student Meetings',
        href: '/mentorship/student-meetings',
        description: 'Counselor student meetings list',
      },
      {
        label: 'Meeting History',
        href: '/mentorship/meeting-history',
        description: 'Past counseling meetings',
      },
      {
        label: 'Meetings List',
        href: '/mentorship/meetings-list',
        description: 'Staff module meetings',
      },
      {
        label: 'Student Counselors',
        href: '/mentorship/student-counselors',
        description: 'Student counselor assignments',
      },
    ],
  },
]

const PAGE_META: Record<string, Omit<MentorshipPageConfig, 'slug'>> = {
  'counseling-dashboard': {
    title: 'Counseling Dashboard',
    kind: 'hub',
    angularPath: 'admin-counseling/counseling-dashboard',
  },
  'schedule-ptm': { title: 'Schedule PTM', kind: 'workflow', angularPath: 'staff-mentorship/schedule-ptm' },
  'assign-mentor-to-students': {
    title: 'Assign Mentor To Students',
    kind: 'workflow',
    angularPath: 'staff-mentorship/assign-mentor-to-students',
  },
  'schedule-ptm/teacher-meeting': {
    title: 'Teacher Meeting',
    kind: 'workflow',
    angularPath: 'staff-mentorship/schedule-ptm/teacher-meeting',
  },
  'activity-type': { title: 'Activity Type', kind: 'list', angularPath: 'admin-counseling/activity-type' },
  'assign-counselor': { title: 'Assign Counselor', kind: 'workflow', angularPath: 'admin-counseling/assign-counselor' },
  'teacher-meeting': { title: 'Teacher Meeting', kind: 'workflow', angularPath: 'admin-counseling/teacher-meeting' },
  'meeting-history': { title: 'Meeting History', kind: 'list', angularPath: 'admin-counseling/meeting-history' },
  'student-meetings': { title: 'Student Meetings', kind: 'list', angularPath: 'admin-counseling/student-meetings' },
  'meetings-list': { title: 'Meetings List', kind: 'list', angularPath: 'admin-counseling/meetings-list' },
  meeting: { title: 'Meeting', kind: 'workflow', angularPath: 'admin-counseling/meeting' },
  'student-counselors': {
    title: 'Student Counselors',
    kind: 'list',
    angularPath: 'admin-counseling/student-counselors',
  },
}

function titleFromSlug(slug: string): string {
  return slug
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getMentorshipConfig(slug: string): MentorshipPageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  if (!key || key === 'counseling-dashboard') {
    return {
      slug: key || 'counseling-dashboard',
      title: 'Counseling Dashboard',
      kind: 'hub',
      angularPath: 'admin-counseling/counseling-dashboard',
    }
  }
  const meta = PAGE_META[key]
  if (meta) return { slug: key, ...meta }
  return {
    slug: key,
    title: titleFromSlug(key),
    kind: 'list',
    angularPath: `admin-counseling/${key}`,
  }
}
