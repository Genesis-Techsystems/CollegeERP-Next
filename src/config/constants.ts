// Application-wide constants

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "College ERP"
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "college_erp_session"
// SPRING_API_URL is intentionally NOT exported here — it is server-only.
// Use process.env.SPRING_API_URL directly in server files (integrations/, api routes).

export const SESSION_MAX_AGE_MS = 21600 * 1000 // 360 minutes in milliseconds
export const RATE_LIMIT_MAX = 10
export const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
