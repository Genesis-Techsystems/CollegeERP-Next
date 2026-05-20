/**
 * Application-level constants.
 * Migrated from src/config/constants.ts with additional structure.
 */

/** Application metadata */
export const APP_CONFIG = {
  /** Display name of the application */
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'College ERP',
  /** Iron Session cookie name */
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'college_erp_session',
  /** Session TTL in seconds (360 minutes) */
  SESSION_TTL_SECONDS: 21600,
  /** Session TTL in milliseconds */
  SESSION_MAX_AGE_MS: 21600 * 1000,
  /** Max login attempts per minute per IP */
  LOGIN_RATE_LIMIT: 10,
  /** Rate limit window in milliseconds (1 minute) */
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  /** TanStack Query stale time for session data (5 minutes in ms) */
  SESSION_STALE_TIME: 5 * 60 * 1000,
} as const

/** User role constants -- matches Spring Boot role strings */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  PARENT: 'PARENT',
  PRINCIPAL: 'PRINCIPAL',
  ACCOUNTANT: 'ACCOUNTANT',
  MANAGEMENT: 'MANAGEMENT',
  NON_TEACHING: 'NON TEACHING',
  HOD: 'HOD',
  VICE_CHANCELLOR: 'VICECHANCELLOR',
  REGISTRAR: 'REGISTRAR',
  EXAM_CONTROLLER: 'EXAMCONTROLLER',
  OFFLINE_EVALUATION: 'OFFLINEEVALUATION',
} as const

export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES]

/** Date format constants -- matches Angular CONSTANTS.dateFormate */
export const DATE_FORMATS = {
  /** Display format for dates: "1 Jan, 2024" */
  DISPLAY: 'd MMM, y',
  /** Display format for date+time: "1 Jan, 2024, 2:30 PM" */
  DISPLAY_WITH_TIME: 'd MMM, y, h:mm a',
} as const
