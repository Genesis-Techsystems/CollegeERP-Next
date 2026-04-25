import { SUBJECT_API } from '@/config/constants/api'
import { getAllRecords, fetchDetails, postDetails } from '../crud'

type ProcResponse = { result?: Array<Array<Record<string, unknown>>> }

export type ClgFilterRow = {
  fk_college_id: number
  college_code: string
  clg_sort_order?: number
  fk_course_id: number
  course_code: string
  fk_course_group_id: number
  group_code: string
  fk_university_id: number
}

export type ClgFilterAcademicYearRow = {
  clg_filters_ay?: string
  fk_university_id: number
  fk_academic_year_id: number
  academic_year: string
}

export async function getDigitalOnlineSyncFilters(
  organizationId: number,
  employeeId: number,
): Promise<{
  filtersData: ClgFilterRow[]
  academicYearData: ClgFilterAcademicYearRow[]
}> {
  const data = await getAllRecords<ProcResponse>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_filters',
    in_org_id: organizationId,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  })

  const groups = Array.isArray(data?.result) ? data.result : []
  let filtersData: ClgFilterRow[] = []
  let academicYearData: ClgFilterAcademicYearRow[] = []

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue
    const first = arr[0]
    const flag = typeof first?.flag === 'string' ? first.flag : ''
    const ayFlag = typeof first?.clg_filters_ay === 'string' ? first.clg_filters_ay : ''
    const hasCollegeKeys = Object.hasOwn(first, 'fk_college_id')
    const hasAyKeys = Object.hasOwn(first, 'fk_academic_year_id')

    if (flag.trim().toLowerCase() === 'clg_filters' || hasCollegeKeys) {
      filtersData = arr as ClgFilterRow[]
    } else if (ayFlag.trim().toLowerCase() === 'clg_filters_ay' || hasAyKeys) {
      academicYearData = arr as ClgFilterAcademicYearRow[]
    }
  }

  return { filtersData, academicYearData }
}

export async function getCourseYearsForDigitalSync(params: {
  collegeId: number
  academicYearId: number
  courseId: number
  courseGroupId: number
}): Promise<Array<Record<string, unknown>>> {
  const rows = await fetchDetails<Array<Record<string, unknown>>>('courseyears', {
    'College.collegeId': params.collegeId,
    'AcademicYear.academicYearId': params.academicYearId,
    'Course.courseId': params.courseId,
    'CourseGroup.courseGroupId': params.courseGroupId,
  })
  return Array.isArray(rows) ? rows : []
}

export async function syncSubjectRegulationIds(
  payload: Array<{ subjectRegulationId: number }>,
): Promise<void> {
  await postDetails(SUBJECT_API.SUBJECT_REGULATION_DATA_SYNC, payload)
}
