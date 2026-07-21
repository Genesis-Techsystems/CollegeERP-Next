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

/**
 * True when the authenticated account is an evaluator-type user. Used only to
 * route evaluators to the /evaluator portal after login — the OTP step itself is
 * driven by the Spring backend's own 2FA (`twoFactorRequired`), not this flag.
 */
export function isEvaluatorRole(userRole?: string | null, roleName?: string | null): boolean {
  const role = (userRole ?? '').toUpperCase()
  const name = (roleName ?? '').toUpperCase()
  // Match genuine evaluators only — role/name contains "EVALUATOR" (Online/Offline/
  // Chief Evaluator) or the OFFLINEEVALUATION role. Deliberately NOT "EVALUAT", which
  // also caught Evaluation Admin/Scanner/Officer/Support — non-evaluator exam roles.
  return (
    role === USER_ROLES.OFFLINE_EVALUATION ||
    name === USER_ROLES.OFFLINE_EVALUATION ||
    role.includes('EVALUATOR') ||
    name.includes('EVALUATOR')
  )
}

/** Date format constants -- matches Angular CONSTANTS.dateFormate */
export const DATE_FORMATS = {
  /** Display format for dates: "1 Jan, 2024" */
  DISPLAY: 'd MMM, y',
  /** Display format for date+time: "1 Jan, 2024, 2:30 PM" */
  DISPLAY_WITH_TIME: 'd MMM, y, h:mm a',
} as const
