import { ENTITIES } from '@/config/constants/entities'
import type { CourseGroup } from '@/types/course-group'
import type { Course } from '@/types/course'
import { buildAngularCourseGroupCreatePayload, buildAngularCourseGroupUpdatePayload } from './academic-master-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function normalizeCourseGroup(row: CourseGroup | Record<string, unknown>): CourseGroup {
  const r = row as Record<string, unknown>
  return {
    ...(row as CourseGroup),
    courseGroupId: n((row as CourseGroup).courseGroupId ?? r.fk_course_group_id ?? r.course_group_id),
    universityId: n((row as CourseGroup).universityId ?? r.fk_university_id ?? r.university_id),
    courseId: n((row as CourseGroup).courseId ?? r.fk_course_id ?? r.course_id),
    groupCode: String((row as CourseGroup).groupCode ?? r.group_code ?? ''),
    groupName: String((row as CourseGroup).groupName ?? r.group_name ?? ''),
    shortName: String((row as CourseGroup).shortName ?? r.short_name ?? r.shortName ?? ''),
    enrollPrefix: String((row as CourseGroup).enrollPrefix ?? r.enroll_prefix ?? r.enrollPrefix ?? ''),
    startingNo: String((row as CourseGroup).startingNo ?? r.starting_no ?? r.startingNo ?? ''),
    isActive: Boolean((row as CourseGroup).isActive ?? r.is_active ?? r.isActive),
    reason: (row as CourseGroup).reason ?? (r.reason as string | undefined),
    universityCode: (row as CourseGroup).universityCode ?? (r.university_code as string | undefined),
    courseCode: (row as CourseGroup).courseCode ?? (r.course_code as string | undefined),
  }
}

export async function listCourseGroupsAdmin(): Promise<CourseGroup[]> {
  const rows = await domainList<CourseGroup>(
    ENTITIES.COURSE_GROUP.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeCourseGroup).filter((r) => r.courseGroupId > 0)
}

export async function listActiveCoursesByUniversity(universityId: number): Promise<Course[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
    buildQuery({ 'University.universityId': universityId, isActive: true }),
    buildQuery({ 'university.universityId': universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
    buildQuery({ fk_university_id: universityId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<Course>(ENTITIES.COURSE.name, query)
      if (rows.length > 0) return rows
    } catch {
      // Try next query shape for backend compatibility.
    }
  }
  return []
}

export async function createCourseGroup(data: Omit<CourseGroup, 'courseGroupId'>): Promise<CourseGroup> {
  const payload = buildAngularCourseGroupCreatePayload(data as Record<string, unknown>)
  return domainCreate<CourseGroup>(ENTITIES.COURSE_GROUP.name, payload)
}

export async function updateCourseGroup(
  courseGroupId: number,
  data: Partial<Omit<CourseGroup, 'courseGroupId'>>,
  existing?: CourseGroup,
): Promise<CourseGroup> {
  const payload = buildAngularCourseGroupUpdatePayload(courseGroupId, data as Record<string, unknown>, existing)
  return domainUpdate<CourseGroup>(ENTITIES.COURSE_GROUP.name, ENTITIES.COURSE_GROUP.pk, courseGroupId, payload)
}
