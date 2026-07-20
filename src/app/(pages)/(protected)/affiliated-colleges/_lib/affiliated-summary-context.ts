import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";
import { pickAffiliatedText } from "./enrich-affiliated-summary-rows";
import { resolveRegulationFromFilterContext } from "./resolve-affiliated-regulation";

type AnyRow = Record<string, unknown>;

export const AFFILIATED_SUMMARY_CONTEXT_KEY =
  "affiliated-student-summary-context";

export type AffiliatedSummaryContext = {
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id: number;
  fk_course_group_id: number;
  fk_course_year_id: number;
  fk_regulation_id?: number;
};

function pickRowId(row: AffiliatedSummaryRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function buildAffiliatedSummaryContext(
  row: AffiliatedSummaryRow,
  collegeId: number,
  academicYearId: number,
  options?: {
    regulationData?: AnyRow[];
    filtersData?: AnyRow[];
    universityId?: number;
    selectedRegulationId?: number;
  },
): AffiliatedSummaryContext {
  const courseId = pickRowId(row, ["fk_course_id", "courseId"]);
  const courseGroupId = pickRowId(row, ["fk_course_group_id", "courseGroupId"]);
  const courseYearId = pickRowId(row, ["fk_course_year_id", "courseYearId"]);
  const regulationCode = pickAffiliatedText(row, [
    "regulation_code",
    "regulationCode",
    "regulationcode",
  ]);

  const fk_regulation_id =
    options?.selectedRegulationId != null
      ? options.selectedRegulationId
      : resolveRegulationFromFilterContext({
          filtersData: options?.filtersData ?? [],
          regulationData: options?.regulationData ?? [],
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          universityId: options?.universityId ?? 0,
          contextRegulationId: pickRowId(row, [
            "fk_regulation_id",
            "regulationId",
          ]),
          regulationCode,
        });

  return {
    fk_college_id: collegeId,
    fk_academic_year_id: academicYearId,
    fk_course_id: courseId,
    fk_course_group_id: pickRowId(row, ["fk_course_group_id", "courseGroupId"]),
    fk_course_year_id: pickRowId(row, ["fk_course_year_id", "courseYearId"]),
    fk_regulation_id: fk_regulation_id || undefined,
  };
}

export function saveAffiliatedSummaryContext(
  ctx: AffiliatedSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(AFFILIATED_SUMMARY_CONTEXT_KEY, JSON.stringify(ctx));
}

export function readAffiliatedSummaryContext(): AffiliatedSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AFFILIATED_SUMMARY_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedSummaryContext;
    if (!parsed?.fk_college_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToInitialSelection(ctx: AffiliatedSummaryContext) {
  return {
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
    regulationId: ctx.fk_regulation_id,
  };
}
