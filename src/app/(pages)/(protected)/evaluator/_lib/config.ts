// Backend integration config — ported from the standalone ExamDigit app.
// In CollegeERP-Next every backend call goes through the Next BFF proxy at
// `/api/proxy/<path>`, which injects the JWT from the iron-session cookie
// server-side (SPRING_API_URL already includes the `/cms` context path).
// So the client only ever uses same-origin relative paths and never sees a token.

// Auth is handled by the BFF (/api/auth/*), not from here.
export const API_BASE = "/api/proxy/api/";
// Everything else: MAIN_BASE + <springPath>  →  /api/proxy/<springPath>
export const MAIN_BASE = "/api/proxy/";

// Evaluation status category detail ids (constants.ts 2356-2362).
export const EVAL_STATUS = {
  NewPaper: 626,
  Assigned: 627,
  InProgress: 628,
  Evaluated: 629,
  Approved: 630,
  Finalized: 631,
  Rejected: 632,
} as const;

// Status colors keyed by status code text.
export const STATUS_COLORS: Record<string, string> = {
  InProgress: "#ffff4c",
  Assigned: "#6060ff",
  Evaluated: "#bec8ff",
};
