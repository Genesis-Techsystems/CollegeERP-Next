import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";

export const AFFILIATED_EXAM_REG_SUMMARY_CONTEXT_KEY =
  "affiliated-student-exam-registration-summary-context";

export type AffiliatedExamRegSummaryContext = {
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id: number;
  fk_course_group_id: number;
  fk_course_year_id: number;
  fk_exam_id: number;
  fk_regulation_id?: number;
};

function pickRowId(row: AffiliatedSummaryRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function buildAffiliatedExamRegSummaryContext(
  row: AffiliatedSummaryRow,
  collegeId: number,
  academicYearId: number,
  examId: number,
): AffiliatedExamRegSummaryContext {
  return {
    fk_college_id: collegeId,
    fk_academic_year_id: academicYearId,
    fk_course_id: pickRowId(row, ["fk_course_id", "courseId"]),
    fk_course_group_id: pickRowId(row, ["fk_course_group_id", "courseGroupId"]),
    fk_course_year_id: pickRowId(row, ["fk_course_year_id", "courseYearId"]),
    fk_exam_id: pickRowId(row, ["fk_exam_id", "examId"]) || examId,
    fk_regulation_id:
      pickRowId(row, ["fk_regulation_id", "regulationId"]) || undefined,
  };
}

export function saveAffiliatedExamRegSummaryContext(
  ctx: AffiliatedExamRegSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    AFFILIATED_EXAM_REG_SUMMARY_CONTEXT_KEY,
    JSON.stringify(ctx),
  );
}

export function readAffiliatedExamRegSummaryContext(): AffiliatedExamRegSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AFFILIATED_EXAM_REG_SUMMARY_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedExamRegSummaryContext;
    if (!parsed?.fk_college_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToExamRegInitialSelection(
  ctx: AffiliatedExamRegSummaryContext,
) {
  return {
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
    examId: ctx.fk_exam_id,
    regulationId: ctx.fk_regulation_id,
  };
}
