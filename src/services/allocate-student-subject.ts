import { getAllRecords } from './crud'

type AnyRow = Record<string, any>
type ProcResponse = { result?: Array<Array<AnyRow>> }

export interface AllocateStudentSubjectFilters {
  filtersData: AnyRow[]
  academicYearData: AnyRow[]
  regulationData: AnyRow[]
}

/**
 * Angular `AllocateStudentSubjectsComponent.getfilterDetails()`:
 * `getAllRecords/s_get_collegewisedetails_bycode` with `in_flag: clg_filters`.
 * The proc returns three result sets keyed by a marker on the first row:
 *   - `flag === 'clg_filters'`               → college/course/group/year cascade rows
 *   - `clg_filters_ay === 'clg_filters_ay'`  → academic years (by university)
 *   - `clg_filters_regulation === 'clg_filters_regulation'` → regulations (by university + course)
 *
 * This page uses the regulation result set (not a domain list) to populate the Regulation dropdown,
 * so it needs all three arrays — unlike `getDigitalOnlineSyncFilters`, which drops the regulation set.
 */
export async function getAllocateStudentSubjectFilters(
  organizationId: number,
  employeeId: number,
): Promise<AllocateStudentSubjectFilters> {
  const data = await getAllRecords<ProcResponse>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_filters',
    in_org_id: organizationId || 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  })

  const groups = Array.isArray(data?.result) ? data.result : []
  let filtersData: AnyRow[] = []
  let academicYearData: AnyRow[] = []
  let regulationData: AnyRow[] = []

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue
    const first = arr[0]
    if (first?.flag === 'clg_filters') filtersData = arr
    else if (first?.clg_filters_ay === 'clg_filters_ay') academicYearData = arr
    else if (first?.clg_filters_regulation === 'clg_filters_regulation') regulationData = arr
  }

  return { filtersData, academicYearData, regulationData }
}

/**
 * Angular `allocateStudentSubjects()`:
 * `getAllRecords/s_pop_std_student_subjects` (constant `allocateStudentSubjadctsUrl`) via a GET
 * request built with `getDetailsByRequest(url, '', request, '&')`, i.e. the params below become the
 * query string. `in_student_id` is fixed to 0 (allocate for the whole filtered cohort).
 */
export async function allocateStudentSubjects(params: {
  collegeId: number
  academicYearId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  studentId?: number
}): Promise<unknown> {
  return getAllRecords<unknown>('s_pop_std_student_subjects', {
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId,
    in_student_id: params.studentId ?? 0,
  })
}
