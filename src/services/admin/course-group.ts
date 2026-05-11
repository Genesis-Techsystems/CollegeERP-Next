import { ENTITIES } from '@/config/constants/entities'
import type { CourseGroup } from '@/types/course-group'
import type { Course } from '@/types/course'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listCourseGroupsAdmin(): Promise<CourseGroup[]> {
  return domainList<CourseGroup>(
    ENTITIES.COURSE_GROUP.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
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
  return domainCreate<CourseGroup>(ENTITIES.COURSE_GROUP.name, data)
}

export async function updateCourseGroup(
  courseGroupId: number,
  data: Partial<Omit<CourseGroup, 'courseGroupId'>>,
): Promise<CourseGroup> {
  return domainUpdate<CourseGroup>(ENTITIES.COURSE_GROUP.name, ENTITIES.COURSE_GROUP.pk, courseGroupId, {
    courseGroupId,
    ...data,
  })
}
