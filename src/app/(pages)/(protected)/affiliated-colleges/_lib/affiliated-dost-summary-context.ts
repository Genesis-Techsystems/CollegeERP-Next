export const AFFILIATED_DOST_SUMMARY_CONTEXT_KEY =
  "affiliated-dost-summary-context";

/** Angular `ParametersService.studentDostSummaryData`. */
export type AffiliatedDostSummaryContext = {
  fk_university_id: number;
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id?: number;
  fk_course_group_id?: number;
  fk_course_year_id?: number;
};

export function saveAffiliatedDostSummaryContext(
  ctx: AffiliatedDostSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    AFFILIATED_DOST_SUMMARY_CONTEXT_KEY,
    JSON.stringify(ctx),
  );
}

export function readAffiliatedDostSummaryContext(): AffiliatedDostSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AFFILIATED_DOST_SUMMARY_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedDostSummaryContext;
    if (
      !parsed?.fk_university_id ||
      !parsed?.fk_college_id ||
      !parsed?.fk_academic_year_id
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToDostInitialSelection(
  ctx: AffiliatedDostSummaryContext,
) {
  return {
    universityId: ctx.fk_university_id,
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
  };
}
