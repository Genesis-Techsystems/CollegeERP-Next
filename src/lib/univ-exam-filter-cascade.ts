import { distinct } from '@/lib/utils'

/** Angular `selectedCourse` / `selectedAcademicYear`: prefer current AY, then newest academic_year. */
export function sortAcademicYearsDesc(rows: any[]): any[] {
  return [...rows].sort(
    (a, b) =>
      (Number(b?.is_curr_ay ?? 0) - Number(a?.is_curr_ay ?? 0)) ||
      (parseInt(String(b?.academic_year ?? '0'), 10) - parseInt(String(a?.academic_year ?? '0'), 10)),
  )
}

export function deriveExamOptions(filtersRef: any[], universityId: number, courseId: number, academicYearId: number) {
  const matched = filtersRef.filter(
    (r: any) =>
      r &&
      Number(r.fk_university_id) === Number(universityId) &&
      Number(r.fk_course_id) === Number(courseId) &&
      Number(r.fk_academic_year_id) === Number(academicYearId) &&
      r.fk_exam_id != null &&
      String(r.fk_exam_id) !== '',
  )
  const uniq = distinct(matched, (r: any) => Number(r.fk_exam_id))
  return uniq.map((r: any) => ({
    examId: Number(r.fk_exam_id),
    id: Number(r.fk_exam_id),
    examName: String(r.exam_name ?? '—'),
    fromDate: r.from_date,
    toDate: r.to_date,
    isInternalExam: r.is_internal_exam,
    isRegularExam: r.is_regular_exam,
    isSupplyExam: r.is_supply_exam,
    courseCode: r.course_code,
  }))
}

export function computeCascadeFromRows(universityId: number, rows: any[]) {
  const filtered = rows.filter((r: any) => r && Number(r.fk_university_id) === Number(universityId))
  const courses = distinct(filtered, (r: any) => r.fk_course_id).filter((r: any) => r.fk_course_id != null)
  const firstCourse = courses[0]?.fk_course_id ?? null
  let academicYears: any[] = []
  let firstAy: number | null = null
  let exams: ReturnType<typeof deriveExamOptions> = []
  let firstExam: number | null = null
  if (firstCourse != null) {
    const aySource = rows.filter(
      (r: any) =>
        r &&
        Number(r.fk_university_id) === Number(universityId) &&
        Number(r.fk_course_id) === Number(firstCourse),
    )
    academicYears = sortAcademicYearsDesc(
      distinct(aySource, (r: any) => r.fk_academic_year_id).filter((r: any) => r.fk_academic_year_id != null),
    )
    firstAy = academicYears[0]?.fk_academic_year_id ?? null
    if (firstAy != null) {
      exams = deriveExamOptions(rows, universityId, firstCourse, firstAy)
      firstExam = exams[0]?.examId ?? null
    }
  }
  return { courses, firstCourse, academicYears, firstAy, exams, firstExam }
}
