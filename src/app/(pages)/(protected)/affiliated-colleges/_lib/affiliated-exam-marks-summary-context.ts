import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";

export const AFFILIATED_EXAM_MARKS_SUMMARY_CONTEXT_KEY =
  "affiliated-student-exam-marks-summary-context";

export type AffiliatedExamMarksKind = "internal" | "external";

export type AffiliatedExamMarksSummaryContext = {
  kind: AffiliatedExamMarksKind;
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id: number;
  fk_course_group_id: number;
  fk_course_year_id: number;
  fk_exam_id: number;
};

function pickRowId(row: AffiliatedSummaryRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function buildAffiliatedExamMarksSummaryContext(
  row: AffiliatedSummaryRow,
  collegeId: number,
  academicYearId: number,
  examId: number,
  kind: AffiliatedExamMarksKind,
): AffiliatedExamMarksSummaryContext {
  return {
    kind,
    fk_college_id: collegeId,
    fk_academic_year_id: academicYearId,
    fk_course_id: pickRowId(row, ["fk_course_id", "courseId"]),
    fk_course_group_id: pickRowId(row, [
      "fk_course_group_id",
      "courseGroupId",
    ]),
    fk_course_year_id: pickRowId(row, ["fk_course_year_id", "courseYearId"]),
    fk_exam_id: pickRowId(row, ["fk_exam_id", "examId"]) || examId,
  };
}

export function saveAffiliatedExamMarksSummaryContext(
  ctx: AffiliatedExamMarksSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    AFFILIATED_EXAM_MARKS_SUMMARY_CONTEXT_KEY,
    JSON.stringify(ctx),
  );
}

export function readAffiliatedExamMarksSummaryContext(
  kind?: AffiliatedExamMarksKind,
): AffiliatedExamMarksSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(
      AFFILIATED_EXAM_MARKS_SUMMARY_CONTEXT_KEY,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedExamMarksSummaryContext;
    if (!parsed?.fk_college_id) return null;
    if (kind && parsed.kind && parsed.kind !== kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToExamMarksInitialSelection(
  ctx: AffiliatedExamMarksSummaryContext,
) {
  return {
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
    examId: ctx.fk_exam_id,
  };
}
