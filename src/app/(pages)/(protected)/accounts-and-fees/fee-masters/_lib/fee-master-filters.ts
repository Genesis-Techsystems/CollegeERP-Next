export type FilterRow = Record<string, unknown>

const COL = ['fk_college_id', 'collegeId', 'fk_collegeId']
const CRS = ['fk_course_id', 'courseId']
const GRP = ['fk_course_group_id', 'courseGroupId', 'CourseGroup.courseGroupId']
const UNI = ['fk_university_id', 'universityId', 'Universities.universityId']
const AY = ['fk_academic_year_id', 'academicYearId']
const BAT = ['fk_batch_id', 'batchId']
const CYR = ['fk_course_year_id', 'courseYearId']

export function pickNum(row: FilterRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

export function pickText(row: FilterRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export function dedupeBy<T>(rows: T[], keyFn: (r: T) => string | number | null | undefined): T[] {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (key === null || key === undefined || key === '') return false
    if (typeof key === 'number' && (!Number.isFinite(key) || key <= 0)) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function rowMatches(row: FilterRow, keys: string[], selectedId: number | null): boolean {
  if (!selectedId) return true
  const rowValue = pickNum(row, keys)
  return rowValue === 0 || rowValue === Number(selectedId)
}

export function filterColleges(rows: FilterRow[]) {
  return dedupeBy(rows, (r) => pickNum(r, COL)).sort(
    (a, b) => pickNum(a, ['clg_sort_order']) - pickNum(b, ['clg_sort_order']),
  )
}

export function filterCollegesByUniversity(rows: FilterRow[], universityId: number | null) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, UNI, universityId)),
    (r) => pickNum(r, COL),
  ).sort((a, b) => pickNum(a, ['clg_sort_order']) - pickNum(b, ['clg_sort_order']))
}

export function filterCourses(rows: FilterRow[], collegeId: number | null) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, COL, collegeId)),
    (r) => pickNum(r, CRS),
  )
}

export function filterCoursesByUniversityAndCollege(
  rows: FilterRow[],
  universityId: number | null,
  collegeId: number | null,
) {
  return dedupeBy(
    rows.filter(
      (r) => rowMatches(r, UNI, universityId) && rowMatches(r, COL, collegeId),
    ),
    (r) => pickNum(r, CRS),
  )
}

export function filterCourseGroupsByUniversityCollegeAndCourse(
  rows: FilterRow[],
  universityId: number | null,
  collegeId: number | null,
  courseId: number | null,
) {
  return dedupeBy(
    rows.filter(
      (r) =>
        rowMatches(r, UNI, universityId) &&
        rowMatches(r, COL, collegeId) &&
        rowMatches(r, CRS, courseId),
    ),
    (r) => pickNum(r, GRP),
  )
}

export function filterBatches(rows: FilterRow[], courseId: number | null) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, CRS, courseId)),
    (r) => pickNum(r, BAT),
  ).sort((a, b) => Number(pickText(b, ['batch_name'])) - Number(pickText(a, ['batch_name'])))
}

/** Angular `batchesFilter` — `clg_filters_batches` rows by university + course. */
export function filterBatchesByUniversityAndCourse(
  batchesData: FilterRow[],
  universityId: number | null,
  courseId: number | null,
) {
  return dedupeBy(
    batchesData.filter(
      (r) => rowMatches(r, UNI, universityId) && rowMatches(r, CRS, courseId),
    ),
    (r) => pickNum(r, BAT),
  ).sort((a, b) => Number(pickText(b, ['batch_name'])) - Number(pickText(a, ['batch_name'])))
}

export function filterAcademicYears(rows: FilterRow[], collegeId: number | null, filtersData: FilterRow[]) {
  const universityId = pickNum(
    filtersData.find((r) => pickNum(r, COL) === collegeId),
    UNI,
  )
  return dedupeBy(
    rows.filter((r) => pickNum(r, UNI) === universityId || pickNum(r, UNI) === 0),
    (r) => pickNum(r, AY),
  ).sort((a, b) => Number(pickText(b, ['academic_year'])) - Number(pickText(a, ['academic_year'])))
}

export function filterUniversities(rows: FilterRow[]) {
  return dedupeBy(rows, (r) => pickNum(r, UNI) || null)
}

export function filterCoursesByUniversity(rows: FilterRow[], universityId: number | null) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, UNI, universityId)),
    (r) => pickNum(r, CRS),
  )
}

export function filterCourseGroups(
  rows: FilterRow[],
  collegeId: number | null,
  courseId: number | null,
) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, COL, collegeId) && rowMatches(r, CRS, courseId)),
    (r) => pickNum(r, GRP),
  )
}

export function filterCourseGroupsByUniversity(
  rows: FilterRow[],
  universityId: number | null,
  courseId: number | null,
) {
  return dedupeBy(
    rows.filter(
      (r) => rowMatches(r, UNI, universityId) && rowMatches(r, CRS, courseId),
    ),
    (r) => pickNum(r, GRP),
  )
}

export function filterCourseYears(
  rows: FilterRow[],
  collegeId: number | null,
  courseId: number | null,
  courseGroupId: number | null,
) {
  return dedupeBy(
    rows.filter(
      (r) =>
        rowMatches(r, COL, collegeId) &&
        rowMatches(r, CRS, courseId) &&
        rowMatches(r, GRP, courseGroupId),
    ),
    (r) => pickNum(r, CYR),
  ).sort((a, b) => pickNum(a, ['year_order']) - pickNum(b, ['year_order']))
}

export function filterAcademicYearsByUniversity(rows: FilterRow[], universityId: number | null) {
  return dedupeBy(
    rows.filter((r) => rowMatches(r, UNI, universityId) || pickNum(r, UNI) === 0),
    (r) => pickNum(r, AY),
  ).sort((a, b) => Number(pickText(b, ['academic_year'])) - Number(pickText(a, ['academic_year'])))
}

export function collegeOption(row: FilterRow) {
  const id = pickNum(row, COL)
  return { value: String(id), label: pickText(row, ['college_code', 'collegeCode']) || String(id) }
}

export function courseOption(row: FilterRow) {
  const id = pickNum(row, CRS)
  const code = pickText(row, ['course_code', 'courseCode'])
  const name = pickText(row, ['course_name', 'courseName'])
  return { value: String(id), label: name && code ? `${code} (${name})` : code || String(id) }
}

export function batchOption(row: FilterRow) {
  const id = pickNum(row, BAT)
  return { value: String(id), label: pickText(row, ['batch_name', 'batchName']) || String(id) }
}

export function academicYearOption(row: FilterRow) {
  const id = pickNum(row, AY)
  return { value: String(id), label: pickText(row, ['academic_year', 'academicYear']) || String(id) }
}

export function universityOption(row: FilterRow) {
  const id = pickNum(row, UNI)
  const code = pickText(row, ['university_code', 'universityCode'])
  const name = pickText(row, ['university_name', 'universityName'])
  return { value: String(id), label: name ? `${code} — ${name}` : code || String(id) }
}

export function courseGroupOption(row: FilterRow) {
  const id = pickNum(row, GRP)
  return { value: String(id), label: pickText(row, ['group_code', 'groupCode']) || String(id) }
}

export function courseYearOption(row: FilterRow) {
  const id = pickNum(row, CYR)
  return {
    value: String(id),
    label: pickText(row, ['course_year_name', 'courseYearName']) || String(id),
  }
}
