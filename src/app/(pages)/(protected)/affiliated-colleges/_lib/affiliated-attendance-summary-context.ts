import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";

export const AFFILIATED_ATTENDANCE_SUMMARY_CONTEXT_KEY =
  "affiliated-student-attendance-summary-context";

export type AffiliatedAttendanceSummaryContext = {
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id: number;
  fk_course_group_id: number;
  fk_course_year_id: number;
  fdate: string;
  tdate: string;
};

function pickRowId(row: AffiliatedSummaryRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function buildAffiliatedAttendanceSummaryContext(
  row: AffiliatedSummaryRow,
  collegeId: number,
  academicYearId: number,
  fromDate: string,
  toDate: string,
): AffiliatedAttendanceSummaryContext {
  return {
    fk_college_id: collegeId,
    fk_academic_year_id: academicYearId,
    fk_course_id: pickRowId(row, ["fk_course_id", "courseId"]),
    fk_course_group_id: pickRowId(row, [
      "fk_course_group_id",
      "courseGroupId",
    ]),
    fk_course_year_id: pickRowId(row, ["fk_course_year_id", "courseYearId"]),
    fdate: fromDate,
    tdate: toDate,
  };
}

export function saveAffiliatedAttendanceSummaryContext(
  ctx: AffiliatedAttendanceSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    AFFILIATED_ATTENDANCE_SUMMARY_CONTEXT_KEY,
    JSON.stringify(ctx),
  );
}

export function readAffiliatedAttendanceSummaryContext(): AffiliatedAttendanceSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AFFILIATED_ATTENDANCE_SUMMARY_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedAttendanceSummaryContext;
    if (!parsed?.fk_college_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToAttendanceInitialSelection(
  ctx: AffiliatedAttendanceSummaryContext,
) {
  return {
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
  };
}

export function parseAttendanceContextDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
