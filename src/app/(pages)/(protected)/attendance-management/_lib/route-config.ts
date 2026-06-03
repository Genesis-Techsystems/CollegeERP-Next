export type AttendancePageKind = 'hub' | 'list' | 'form' | 'workflow'

export type AttendancePageConfig = {
  slug: string
  title: string
  kind: AttendancePageKind
  angularPath: string
  description?: string
}

export const ATTENDANCE_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'Admin attendance',
    cards: [
      {
        label: 'Attendance Dashboard',
        href: '/attendance-management/attendance-dashboard',
        description: 'Overview and quick links for attendance operations',
      },
      {
        label: 'Student Attendance',
        href: '/attendance-management/student-attendance',
        description: 'Mark and manage class-wise student attendance',
      },
      {
        label: 'View Student Attendance',
        href: '/attendance-management/view-student-attendance',
        description: 'Reports by student',
      },
      {
        label: 'View Subject Attendance',
        href: '/attendance-management/view-subject-attendance',
        description: 'Reports by subject',
      },
      {
        label: 'Workload Adjustment',
        href: '/attendance-management/workload-adjustment',
        description: 'Proxy staff and workload changes',
      },
      {
        label: 'Staff Not Marked List',
        href: '/attendance-management/staff-attendance-not-markedlist',
        description: 'Classes where attendance was not marked',
      },
    ],
  },
  {
    title: 'Staff & exam',
    cards: [
      {
        label: 'Mark Attendance',
        href: '/attendance-management/mark-attendance',
        description: 'Staff class attendance (Angular staff-classes/attendance-update)',
      },
      {
        label: 'Exam Attendance',
        href: '/attendance-management/exam-attendance',
        description: 'Exam session attendance marking',
      },
    ],
  },
]

const PAGE_META: Record<string, Omit<AttendancePageConfig, 'slug'>> = {
  'attendance-dashboard': {
    title: 'Attendance Dashboard',
    kind: 'hub',
    angularPath: 'admin-attendance-management/attendance-dashboard',
  },
  'student-attendance': {
    title: 'Student Attendance',
    kind: 'workflow',
    angularPath: 'admin-attendance-management/student-attendance',
  },
  'view-student-attendance': {
    title: 'View Student Attendance',
    kind: 'list',
    angularPath: 'admin-attendance-management/view-student-attendance',
  },
  'view-subject-attendance': {
    title: 'View Subject Attendance',
    kind: 'list',
    angularPath: 'admin-attendance-management/view-subject-attendance',
  },
  'workload-adjustment': {
    title: 'Workload Adjustment',
    kind: 'workflow',
    angularPath: 'admin-attendance-management/workload-adjustment',
  },
  'staff-attendance-not-markedlist': {
    title: 'Staff Attendance Not Marked List',
    kind: 'list',
    angularPath: 'admin-attendance-management/staff-attendance-not-markedlist',
  },
  'mark-attendance': {
    title: 'Mark Attendance',
    kind: 'workflow',
    angularPath: 'staff-classes/attendance-update',
  },
  'mark-attendance/mark-attendance': {
    title: 'Update Attendance',
    kind: 'form',
    angularPath: 'staff-classes/attendance-update/mark-attendance',
  },
  'mark-attendance/view-attendance': {
    title: 'View Attendance',
    kind: 'list',
    angularPath: 'staff-classes/attendance-update/view-attendance',
  },
  'exam-attendance': {
    title: 'Exam Attendance',
    kind: 'workflow',
    angularPath: 'exam-attendance',
  },
}

function titleFromSlug(slug: string): string {
  return slug
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getAttendanceConfig(slug: string): AttendancePageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  if (!key || key === 'attendance-dashboard') {
    return {
      slug: key || 'attendance-dashboard',
      title: 'Attendance Dashboard',
      kind: 'hub',
      angularPath: 'admin-attendance-management/attendance-dashboard',
    }
  }
  const meta = PAGE_META[key]
  if (meta) return { slug: key, ...meta }
  return {
    slug: key,
    title: titleFromSlug(key),
    kind: 'list',
    angularPath: `admin-attendance-management/${key}`,
  }
}
