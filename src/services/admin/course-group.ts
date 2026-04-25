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
  return domainList<Course>(
    ENTITIES.COURSE.name,
    buildQuery({ 'university.universityId': universityId, isActive: true }),
  )
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
