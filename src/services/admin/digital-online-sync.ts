import { SUBJECT_API } from '@/config/constants/api'
import { getAllRecords, fetchDetails, postDetails } from '../crud'
import { listSubjectRegulationsByCourseYear } from './semester-subject-allocation'

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
  const paramVariants: Array<Record<string, string | number>> = [
    {
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
    },
    {
      college_id: params.collegeId,
      academic_year_id: params.academicYearId,
      course_id: params.courseId,
      course_group_id: params.courseGroupId,
    },
    {
      'College.collegeId': params.collegeId,
      'AcademicYear.academicYearId': params.academicYearId,
      'Course.courseId': params.courseId,
      'CourseGroup.courseGroupId': params.courseGroupId,
    },
  ]

  for (const query of paramVariants) {
    try {
      const rows = await fetchDetails<Array<Record<string, unknown>>>('courseyears', query)
      if (Array.isArray(rows)) return rows
    } catch {
      // Try next query shape for backend compatibility.
    }
  }
  return []
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pickSubjectRegulationId(row: Record<string, unknown>): number {
  return num(
    row.subjectRegulationId
    ?? row.subjectregulationId
    ?? row.subject_regulation_id
    ?? row.fk_subject_regulation_id,
  )
}

function pickCourseYearId(row: Record<string, unknown>): number {
  return num(row.courseYearId ?? row.courseyearId ?? row.fk_course_year_id ?? row.course_year_id)
}

function extractIdsFromCourseYearRows(rows: Array<Record<string, unknown>>): Set<number> {
  const ids = new Set<number>()
  for (const row of rows) {
    const regLists = [row.subjectregulations, row.subjectRegulations].filter(Array.isArray) as Array<
      Array<Record<string, unknown>>
    >
    for (const regs of regLists) {
      for (const reg of regs) {
        const id = pickSubjectRegulationId(reg)
        if (id > 0) ids.add(id)
      }
    }
  }
  return ids
}

/** Resolves subject regulation ids for the selected college/course/group/academic year filters. */
export async function collectSubjectRegulationIdsForSync(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  academicYearId: number
}): Promise<Array<{ subjectRegulationId: number }>> {
  const courseYearRows = (await getCourseYearsForDigitalSync(params)) as Array<Record<string, unknown>>
  const ids = extractIdsFromCourseYearRows(courseYearRows)

  if (ids.size === 0) {
    for (const row of courseYearRows) {
      const courseYearId = pickCourseYearId(row)
      if (!courseYearId) continue
      const regs = await listSubjectRegulationsByCourseYear({
        collegeId: params.collegeId,
        academicYearId: params.academicYearId,
        courseGroupId: params.courseGroupId,
        courseYearId,
      }).catch(() => [])
      for (const reg of regs) {
        const id = pickSubjectRegulationId(reg as Record<string, unknown>)
        if (id > 0) ids.add(id)
      }
    }
  }

  return Array.from(ids, (subjectRegulationId) => ({ subjectRegulationId }))
}

export async function syncSubjectRegulationIds(
  payload: Array<{ subjectRegulationId: number }>,
): Promise<string> {
  const data = await postDetails<unknown>(SUBJECT_API.SUBJECT_REGULATION_DATA_SYNC, payload)
  if (typeof data === 'string' && data.trim()) return data.trim()
  if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).message === 'string') {
    return String((data as Record<string, unknown>).message)
  }
  return payload.length > 0
    ? `Successfully synced ${payload.length} subject regulation record(s).`
    : 'Sync completed successfully.'
}
