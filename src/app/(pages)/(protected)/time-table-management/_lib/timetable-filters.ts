type AnyRow = Record<string, unknown>

export type TimetableFilterFlag = 'clg_filters' | 'cls_timtable_filters'

export function num(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/** Distinct rows by a numeric/string key (first occurrence wins). */
export function distinctByKey(rows: AnyRow[], key: string): AnyRow[] {
  const seen = new Set<unknown>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = row[key]
    if (id == null || id === '') continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

export function collegesFromFilterRows(rows: AnyRow[]): AnyRow[] {
  const list = distinctByKey(rows, 'fk_college_id')
  return [...list].sort((a, b) => num(a.clg_sort_order) - num(b.clg_sort_order))
}

export function academicYearsFromFilterRows(rows: AnyRow[], collegeId: number): AnyRow[] {
  return distinctByKey(
    rows.filter((r) => num(r.fk_college_id) === collegeId),
    'fk_academic_year_id',
  )
}

export function coursesFromFilterRows(
  rows: AnyRow[],
  collegeId: number,
  academicYearId: number,
): AnyRow[] {
  return distinctByKey(
    rows.filter(
      (r) => num(r.fk_college_id) === collegeId && num(r.fk_academic_year_id) === academicYearId,
    ),
    'fk_course_id',
  )
}

export function courseGroupsFromFilterRows(
  rows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
): AnyRow[] {
  return distinctByKey(
    rows.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_academic_year_id) === academicYearId &&
        num(r.fk_course_id) === courseId,
    ),
    'fk_course_group_id',
  )
}

export function courseYearsFromFilterRows(
  rows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
  courseGroupId: number,
): AnyRow[] {
  const list = distinctByKey(
    rows.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_academic_year_id) === academicYearId &&
        num(r.fk_course_id) === courseId &&
        num(r.fk_course_group_id) === courseGroupId,
    ),
    'fk_course_year_id',
  )
  return [...list].sort((a, b) => num(a.year_order) - num(b.year_order))
}

export function sectionsFromFilterRows(
  rows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
  courseGroupId: number,
  courseYearId: number,
): AnyRow[] {
  return distinctByKey(
    rows.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_academic_year_id) === academicYearId &&
        num(r.fk_course_id) === courseId &&
        num(r.fk_course_group_id) === courseGroupId &&
        num(r.fk_course_year_id) === courseYearId,
    ),
    'fk_group_section_id',
  )
}

export function timetablesFromFilterRows(
  rows: AnyRow[],
  collegeId: number,
  academicYearId: number,
  courseId: number,
  courseGroupId: number,
  groupSectionId: number,
): AnyRow[] {
  return distinctByKey(
    rows.filter(
      (r) =>
        num(r.fk_college_id) === collegeId &&
        num(r.fk_academic_year_id) === academicYearId &&
        num(r.fk_course_id) === courseId &&
        num(r.fk_course_group_id) === courseGroupId &&
        num(r.fk_group_section_id) === groupSectionId,
    ),
    'pk_timetable_id',
  )
}

export function coursesFromAllocationFilters(rows: AnyRow[], collegeId: number): AnyRow[] {
  return distinctByKey(
    rows.filter((r) => num(r.fk_college_id) === collegeId),
    'fk_course_id',
  )
}

export function courseGroupsFromAllocationFilters(
  rows: AnyRow[],
  collegeId: number,
  courseId: number,
): AnyRow[] {
  return distinctByKey(
    rows.filter((r) => num(r.fk_college_id) === collegeId && num(r.fk_course_id) === courseId),
    'fk_course_group_id',
  )
}

export function formatClockAmPm(value: string): string {
  if (!value) return ''
  const raw = value.trim()
  if (/AM|PM/i.test(raw)) return raw.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/)
  if (!match) return raw
  let hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${meridiem}`
}

export function formatDateHeader(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
