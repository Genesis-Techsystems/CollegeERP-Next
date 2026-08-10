/**
 * Cascade options from `cls_timtable_filters` rows (Angular parity).
 */

import type { AnyRow } from "./timetable-matrix";

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function txt(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function dedupeBy(rows: AnyRow[], keyFn: (r: AnyRow) => number): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function distinctColleges(filterRows: AnyRow[]): AnyRow[] {
  return dedupeBy(filterRows, (r) => num(r.fk_college_id ?? r.collegeId)).sort(
    (a, b) =>
      num(a.clg_sort_order ?? a.clgSortOrder) -
      num(b.clg_sort_order ?? b.clgSortOrder),
  );
}

export function distinctAcademicYears(
  filterRows: AnyRow[],
  collegeId: number,
): AnyRow[] {
  return dedupeBy(
    filterRows.filter(
      (r) => !collegeId || num(r.fk_college_id ?? r.collegeId) === collegeId,
    ),
    (r) => num(r.fk_academic_year_id ?? r.academicYearId),
  ).sort(
    (a, b) =>
      parseInt(txt(b.academic_year ?? b.academicYear), 10) -
        parseInt(txt(a.academic_year ?? a.academicYear), 10) || 0,
  );
}

export function distinctCourses(
  filterRows: AnyRow[],
  collegeId: number,
  academicYearId: number,
): AnyRow[] {
  return dedupeBy(
    filterRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id ?? r.collegeId) === collegeId) &&
        (!academicYearId ||
          num(r.fk_academic_year_id ?? r.academicYearId) === academicYearId),
    ),
    (r) => num(r.fk_course_id ?? r.courseId),
  );
}

export function distinctCourseGroups(
  filterRows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
): AnyRow[] {
  return dedupeBy(
    filterRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id ?? r.collegeId) === collegeId) &&
        (!academicYearId ||
          num(r.fk_academic_year_id ?? r.academicYearId) === academicYearId) &&
        (!courseId || num(r.fk_course_id ?? r.courseId) === courseId),
    ),
    (r) => num(r.fk_course_group_id ?? r.courseGroupId),
  );
}

export function distinctCourseYears(
  filterRows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
  courseGroupId: number,
): AnyRow[] {
  return dedupeBy(
    filterRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id ?? r.collegeId) === collegeId) &&
        (!academicYearId ||
          num(r.fk_academic_year_id ?? r.academicYearId) === academicYearId) &&
        (!courseId || num(r.fk_course_id ?? r.courseId) === courseId) &&
        (!courseGroupId ||
          num(r.fk_course_group_id ?? r.courseGroupId) === courseGroupId),
    ),
    (r) => num(r.fk_course_year_id ?? r.courseYearId),
  ).sort(
    (a, b) => num(a.year_order ?? a.yearOrder) - num(b.year_order ?? b.yearOrder),
  );
}

export function distinctSections(
  filterRows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
  courseGroupId: number,
  courseYearId: number,
): AnyRow[] {
  return dedupeBy(
    filterRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id ?? r.collegeId) === collegeId) &&
        (!academicYearId ||
          num(r.fk_academic_year_id ?? r.academicYearId) === academicYearId) &&
        (!courseId || num(r.fk_course_id ?? r.courseId) === courseId) &&
        (!courseGroupId ||
          num(r.fk_course_group_id ?? r.courseGroupId) === courseGroupId) &&
        (!courseYearId ||
          num(r.fk_course_year_id ?? r.courseYearId) === courseYearId),
    ),
    (r) => num(r.fk_group_section_id ?? r.groupSectionId ?? r.sectionId),
  ).sort(
    (a, b) =>
      num(a.fk_group_section_id ?? a.groupSectionId) -
      num(b.fk_group_section_id ?? b.groupSectionId),
  );
}

export function toSelectOptions(
  rows: AnyRow[],
  valueKeys: string[],
  labelKeys: string[],
): { value: string; label: string }[] {
  return rows.map((r) => {
    let value = "";
    for (const k of valueKeys) {
      if (r[k] != null && String(r[k]) !== "") {
        value = String(r[k]);
        break;
      }
    }
    let label = value;
    for (const k of labelKeys) {
      if (r[k] != null && String(r[k]).trim() !== "") {
        label = String(r[k]);
        break;
      }
    }
    return { value, label };
  });
}
