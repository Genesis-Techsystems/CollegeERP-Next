import { EMPLOYEE_API, SUBJECT_API } from '@/config/constants/api'
import { buildQuery, domainList, fetchDetails, getAllRecords, postDetails } from '@/services/crud'

type AnyRow = Record<string, any>

export async function listStaffSubjectRows(params: {
  collegeId: number
  academicYearId: number
  groupSectionId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params
  if (!collegeId || !academicYearId || !groupSectionId) return []

  const paramVariants: Array<Record<string, string | number>> = [
    { collegeId, academicYearId, groupSectionId },
    { collegeId, academicYearId, groupsectionId: groupSectionId },
    { collegeId, academicYearId, group_section_id: groupSectionId },
  ]
  const paths = [SUBJECT_API.SUBJECT_COURSE_YEARS, 'subjectcourseyears', 'subjectCourseYears']

  for (const path of paths) {
    for (const query of paramVariants) {
      try {
        const rows = await fetchDetails<AnyRow[]>(path, query)
        if (Array.isArray(rows)) return rows
      } catch {
        // try next combination
      }
    }
  }

  return []
}

export async function listActiveEmployeesByCollege(collegeId: number): Promise<AnyRow[]> {
  if (!collegeId) return []
  const queries = [
    buildQuery({ 'college.collegeId': collegeId, 'employeeStatus.generalDetailCode': 'ACTV' }),
    buildQuery({ 'College.collegeId': collegeId, 'employeeStatus.generalDetailCode': 'ACTV' }),
    buildQuery({ collegeId, employeeStatus: 'ACTV' }),
    buildQuery({ 'college.collegeId': collegeId, isActive: true }),
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
    buildQuery({ 'college.collegeId': collegeId }),
    buildQuery({ 'College.collegeId': collegeId }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('EmployeeDetail', query)
      if (rows.length > 0) return rows
    } catch {
      // next variant
    }
  }
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>(EMPLOYEE_API.DAILY_DETAIL, query)
      if (rows.length > 0) return rows
    } catch {
      // next variant
    }
  }
  return []
}

export async function saveStaffSubjectMappings(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const paths = [SUBJECT_API.STAFF_COURSEYR_SUBJECTS_CHECK, 'staffCourseyrSubjectsCheck']
  let lastError: unknown = null
  for (const path of paths) {
    try {
      await postDetails(path, rows)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw (lastError ?? new Error('Failed to save staff subject mapping'))
}

export async function listStaffMappingSections(params: {
  organizationId: number
  employeeId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  academicYearId: number
}): Promise<AnyRow[]> {
  const { organizationId, employeeId, collegeId, courseId, courseGroupId, courseYearId, academicYearId } = params
  if (!collegeId || !courseId || !courseGroupId || !courseYearId || !academicYearId) return []

  const data = await getAllRecords<{ result?: unknown }>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_sec_filters',
    in_org_id: organizationId || 0,
    in_college_id: collegeId,
    in_course_id: courseId,
    in_course_group_id: courseGroupId,
    in_course_year_id: courseYearId,
    in_group_section_id: 0,
    in_academic_year_id: academicYearId,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  }).catch(() => ({ result: [] as unknown }))

  const groups = Array.isArray(data?.result) ? (data.result as unknown[]) : []
  for (const g of groups) {
    if (Array.isArray(g) && g.length > 0) return g as AnyRow[]
  }
  return []
}

/** Angular course cell: collegeCode / academicYear / courseCode / groupCode / courseYearName / section */
function buildStaffSubjectCourseDisplay(row: AnyRow): string {
  const existing = String(row?.courseDisplay ?? '').trim()
  if (existing) return existing
  const parts = [
    row?.collegeCode,
    row?.academicYear,
    row?.courseCode,
    row?.groupCode,
    row?.courseYearName,
    row?.section,
  ]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter((v) => v !== '')
  if (parts.length > 0) return parts.join(' / ')
  const fallback = String(row?.courseName ?? '').trim()
  return fallback || '-'
}

function normalizeStaffSubjectMappingRows(rows: AnyRow[]): AnyRow[] {
  return rows.map((r) => ({
    ...r,
    courseDisplay: buildStaffSubjectCourseDisplay(r),
    subjectName: r.subjectName ?? '-',
    subjectCode: r.subjectCode ?? '',
    subjectType: r.subjectType ?? '-',
    fromDate: r.fromDate ?? '',
    toDate: r.toDate ?? '',
    status: r.isActive === false ? 'inactive' : 'active',
  }))
}

/**
 * Angular `selectedEmployee` →
 * `listDetailsById(StaffCourseyrSubject, employeeId, 'employeeDetail.employeeId')`
 * → `result.data.resultList` (active + inactive; no college filter).
 */
export async function listEmployeeMappedSubjects(params: {
  collegeId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const { collegeId, employeeId } = params
  if (!employeeId) return []

  // Primary path — matches Angular staff-subject-unmapping list
  try {
    const rows = await domainList<AnyRow>(
      EMPLOYEE_API.STAFF_COURSE_YR_SUBJECT,
      buildQuery({ 'employeeDetail.employeeId': employeeId }),
    )
    return normalizeStaffSubjectMappingRows(rows)
  } catch {
    // fall through to legacy paths only if domain list fails
  }

  const flattenFromSubjectRows = (rows: AnyRow[]) => {
    const flattened: AnyRow[] = []
    for (const row of rows) {
      const mappings = Array.isArray(row?.staffCourseyrSubjects) ? row.staffCourseyrSubjects : []
      for (const map of mappings) {
        const mappedEmpId = Number(map?.employeeId ?? map?.employeeDetail?.employeeId) || 0
        if (mappedEmpId && mappedEmpId !== employeeId) continue
        const active = map?.isActive !== false
        flattened.push({
          ...map,
          collegeCode: map?.collegeCode ?? row?.collegeCode,
          academicYear: map?.academicYear ?? row?.academicYear,
          courseCode: map?.courseCode ?? row?.courseCode,
          groupCode: map?.groupCode ?? row?.groupCode,
          courseYearName: map?.courseYearName ?? row?.courseYearName,
          section: map?.section ?? row?.section,
          courseDisplay: buildStaffSubjectCourseDisplay({ ...row, ...map }),
          subjectName: row?.subjectName ?? map?.subjectName ?? '',
          subjectCode: row?.subjectCode ?? map?.subjectCode ?? '',
          subjectType: row?.subjectType ?? map?.subjectType ?? '',
          fromDate: map?.fromDate ?? '',
          toDate: map?.toDate ?? '',
          status: active ? 'active' : 'inactive',
        })
      }
    }
    return flattened
  }

  const tryFetchFirstSuccess = async <T extends AnyRow>(
    paths: string[],
    queries: Array<Record<string, string | number | boolean>>,
  ) => {
    for (const path of paths) {
      for (const query of queries) {
        try {
          const rows = await fetchDetails<T[]>(path, query as Record<string, string | number>)
          if (Array.isArray(rows) && rows.length > 0) return rows
        } catch {
          // try next path/query variant
        }
      }
    }
    return [] as T[]
  }

  const subjectPathVariants = [SUBJECT_API.SUBJECT_COURSE_YEARS, 'subjectcourseyears', 'subjectCourseYears']
  const subjectQueryVariants: Array<Record<string, string | number>> = [
    ...(collegeId ? [{ collegeId, employeeId }] : []),
    ...(collegeId ? [{ collegeId, employeeid: employeeId }] : []),
    ...(collegeId ? [{ college_id: collegeId, employee_id: employeeId }] : []),
    { employeeId },
  ]
  const subjectRows = await tryFetchFirstSuccess(subjectPathVariants, subjectQueryVariants)
  if (subjectRows.length > 0) {
    const flattened = flattenFromSubjectRows(subjectRows)
    if (flattened.length > 0) return flattened
  }

  const mappingPathVariants = [
    EMPLOYEE_API.STAFFCOURSEYRSUBJECTS,
    'staffcourseyrsubjects',
    'staffCourseyrSubjects',
  ]
  const mappingQueryVariants: Array<Record<string, string | number | boolean>> = [
    { employeeId },
    ...(collegeId ? [{ employeeId, collegeId }] : []),
    ...(collegeId ? [{ employeeid: employeeId, college_id: collegeId }] : []),
  ]
  const mappingRows = await tryFetchFirstSuccess(mappingPathVariants, mappingQueryVariants)
  if (mappingRows.length > 0) return normalizeStaffSubjectMappingRows(mappingRows)

  return []
}

export async function listSubjectSyllabusPlanReport(params: {
  subjectId: number
  collegeId: number
}): Promise<AnyRow[]> {
  const { subjectId, collegeId } = params
  if (!subjectId || !collegeId) return []

  const data = await getAllRecords<{ result?: unknown }>('s_subject_syllabus_plan_report', {
    in_subject_id: subjectId,
    in_college_id: collegeId,
  }).catch(() => ({ result: [] as unknown }))

  const result = data?.result
  if (Array.isArray(result)) {
    for (const chunk of result) {
      if (Array.isArray(chunk)) return chunk as AnyRow[]
    }
    return result as AnyRow[]
  }
  return []
}

export async function listElectiveGroupMappings(params: {
  collegeId: number
  academicYearId: number
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId } = params
  if (!collegeId || !academicYearId) return []

  const query = buildQuery(
    {
      'College.collegeId': collegeId,
      'AcademicYear.academicYearId': academicYearId,
      isActive: true,
    },
    { field: 'electiveGroupyrMappingId', direction: 'DESC' },
  )

  return domainList<AnyRow>('ElectiveGroupyrMapping', query).catch(() => [])
}

export async function listStudentEnrollmentElectives(params: {
  collegeId: number
  academicYearId: number
  courseId?: number
  courseGroupId?: number
  courseYearId?: number
  groupSectionId?: number
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    courseId = 0,
    courseGroupId = 0,
    courseYearId = 0,
    groupSectionId = 0,
  } = params

  if (!collegeId || !academicYearId) return []

  const data = await getAllRecords<{ result?: unknown }>('s_get_std_electives', {
    in_college_id: collegeId,
    in_academic_year_id: academicYearId,
    in_course_id: courseId,
    in_course_group_id: courseGroupId,
    in_course_year_id: courseYearId,
    in_group_section_id: groupSectionId,
  }).catch(() => ({ result: [] as unknown }))

  const result = data?.result
  if (Array.isArray(result)) {
    for (const chunk of result) {
      if (Array.isArray(chunk)) return chunk as AnyRow[]
    }
    return result as AnyRow[]
  }
  return []
}

