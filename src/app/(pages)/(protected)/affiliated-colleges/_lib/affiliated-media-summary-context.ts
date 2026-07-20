import type { AffiliatedSummaryRow } from "@/types/affiliated-colleges";

export const AFFILIATED_MEDIA_SUMMARY_CONTEXT_KEY =
  "affiliated-student-media-summary-context";

export type AffiliatedMediaSummaryKind = "signature" | "photo";

export type AffiliatedMediaSummaryContext = {
  kind: AffiliatedMediaSummaryKind;
  fk_college_id: number;
  fk_academic_year_id: number;
  fk_course_id: number;
  fk_course_group_id: number;
  fk_course_year_id: number;
  fk_university_id?: number;
  university_code?: string;
  org_code?: string;
};

function pickRowId(row: AffiliatedSummaryRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AffiliatedSummaryRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function buildAffiliatedMediaSummaryContext(
  row: AffiliatedSummaryRow,
  collegeId: number,
  academicYearId: number,
  kind: AffiliatedMediaSummaryKind,
  extras?: { universityId?: number; universityCode?: string; orgCode?: string },
): AffiliatedMediaSummaryContext {
  return {
    kind,
    fk_college_id: collegeId,
    fk_academic_year_id: academicYearId,
    fk_course_id: pickRowId(row, ["fk_course_id", "courseId"]),
    fk_course_group_id: pickRowId(row, ["fk_course_group_id", "courseGroupId"]),
    fk_course_year_id: pickRowId(row, ["fk_course_year_id", "courseYearId"]),
    fk_university_id:
      pickRowId(row, ["fk_university_id", "universityId"]) ||
      extras?.universityId ||
      undefined,
    university_code:
      pickText(row, ["university_code", "universityCode"]) ||
      extras?.universityCode ||
      undefined,
    org_code:
      pickText(row, ["org_code", "orgCode"]) || extras?.orgCode || undefined,
  };
}

export function saveAffiliatedMediaSummaryContext(
  ctx: AffiliatedMediaSummaryContext,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    AFFILIATED_MEDIA_SUMMARY_CONTEXT_KEY,
    JSON.stringify(ctx),
  );
}

export function readAffiliatedMediaSummaryContext(
  kind?: AffiliatedMediaSummaryKind,
): AffiliatedMediaSummaryContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AFFILIATED_MEDIA_SUMMARY_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AffiliatedMediaSummaryContext;
    if (!parsed?.fk_college_id) return null;
    if (kind && parsed.kind && parsed.kind !== kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function contextToMediaInitialSelection(
  ctx: AffiliatedMediaSummaryContext,
) {
  return {
    collegeId: ctx.fk_college_id,
    academicYearId: ctx.fk_academic_year_id,
    courseId: ctx.fk_course_id,
    courseGroupId: ctx.fk_course_group_id,
    courseYearId: ctx.fk_course_year_id,
  };
}
