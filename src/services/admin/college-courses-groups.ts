import { UNIVERSITY_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainList, fetchDetails, getAllRecords, postDetails, putDetails } from '../crud'

type AnyRow = Record<string, unknown>

export type CollegeFilterRow = {
  fk_university_id: number
  university_id?: number
  universityId?: number
  university_code?: string
  universityCode?: string
  fk_college_id: number
  college_id?: number
  collegeId?: number
  college_code?: string
  collegeCode?: string
  fk_course_id?: number
  course_id?: number
  fk_course_group_id?: number
  course_group_id?: number
  course_code?: string
  group_code?: string
}

export type CollegeCourseGroupRow = {
  univCollegeWiseCourseId?: number
  universitiesId?: number
  universityCode?: string
  collegeId?: number
  collegeCode?: string
  courseId?: number
  courseCode?: string
  isActive?: boolean
  univCollegeWiseGroupId?: number
  univCollegeWiseCoursesId?: number
  courseGroupId?: number
  courseGroupCode?: string
  courseYearId?: number
  courseYearCode?: string
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pick(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v
  }
  return ''
}

export async function getCollegeCourseGroupFilters(orgId: number, employeeId: number): Promise<CollegeFilterRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
    in_flag: 'clg_filters',
    in_org_id: orgId || 0,
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  })
  const groups = Array.isArray(data?.result) ? data.result : []
  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue
    const first = group[0]
    if ((typeof first.flag === 'string' ? first.flag : '') === 'clg_filters') return group as CollegeFilterRow[]
  }
  return groups.flatMap((g) => (Array.isArray(g) ? g : [])) as CollegeFilterRow[]
}

export async function listCollegeCourseGroups(params: {
  universityId: number
  collegeId: number
  courseId?: number
  courseGroupId?: number
}): Promise<CollegeCourseGroupRow[]> {
  const query: Record<string, number> = {
    universityId: params.universityId,
    collegeId: params.collegeId,
  }
  if (params.courseId) query.courseId = params.courseId
  if (params.courseGroupId) query.courseGroupId = params.courseGroupId

  const data = await fetchDetails<AnyRow[]>(UNIVERSITY_API.GET_COLLEGE_WISE_COURSES_GROUPS, query)
  const rows = Array.isArray(data) ? data : []

  return rows.map((row) => {
    const course = (row.univCollegeWiseCourses ?? {}) as AnyRow
    const group = (row.univCollegeWiseGroups ?? {}) as AnyRow
    return {
      univCollegeWiseCourseId: num(course.univCollegeWiseCourseId),
      universitiesId: num(course.universitiesId),
      universityCode: pick(course, ['universityCode', 'university_code']),
      collegeId: num(course.collegeId),
      collegeCode: pick(course, ['collegeCode', 'college_code']),
      courseId: num(course.courseId),
      courseCode: pick(course, ['courseCode', 'course_code']),
      isActive: Boolean(course.isActive ?? group.isActive ?? true),
      univCollegeWiseGroupId: num(group.univCollegeWiseGroupId),
      univCollegeWiseCoursesId: num(group.univCollegeWiseCoursesId),
      courseGroupId: num(group.courseGroupId),
      courseGroupCode: pick(group, ['courseGroupCode', 'groupCode', 'group_code']),
      courseYearId: num(group.courseYearId),
      courseYearCode: pick(group, ['courseYearCode', 'course_year_code']),
    }
  })
}

export async function listCollegeWiseCourses(collegeId: number): Promise<AnyRow[]> {
  if (!collegeId) return []
  return domainList<AnyRow>(
    UNIVERSITY_API.COLLEGE_WISE_COURSES,
    buildQuery({ 'college.collegeId': collegeId, isActive: true }),
  )
}

export async function listCourseGroupsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  return domainList<AnyRow>(ENTITIES.COURSE_GROUP.name, buildQuery({ 'course.courseId': courseId, isActive: true }))
}

export async function listCourseYearsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  return domainList<AnyRow>(ENTITIES.COURSE_YEAR.name, buildQuery({ 'course.courseId': courseId, isActive: true }))
}

export async function addCollegeCourseGroupMappings(payload: AnyRow[]): Promise<unknown> {
  // This modal adds group/year mappings against an existing univ-college-course row.
  // Backend expects this on the "groups" endpoint, not the combined courses+groups endpoint.
  return postDetails<unknown>(UNIVERSITY_API.ADD_COLLEGE_WISE_GROUPS, payload)
}

export async function updateCollegeCourseGroupMappings(payload: AnyRow[]): Promise<unknown> {
  return putDetails<unknown>(UNIVERSITY_API.UPDATE_COLLEGE_WISE_COURSES_GROUPS, payload)
}
