import { ENTITIES } from '@/config/constants/entities'
import type { CourseYear } from '@/types/course-year'
import type { Course } from '@/types/course'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listCourseYearsAdmin(): Promise<CourseYear[]> {
  return domainList<CourseYear>(
    ENTITIES.COURSE_YEAR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCoursesByUniversityForYear(universityId: number): Promise<Course[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'University.universityId': universityId, isActive: true }),
    buildQuery({ 'university.universityId': universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
    buildQuery({ fk_university_id: universityId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      return await domainList<Course>(ENTITIES.COURSE.name, query)
    } catch {
      // Try next query shape for backend compatibility.
    }
  }
  return []
}

export async function createCourseYear(data: Omit<CourseYear, 'courseYearId'>): Promise<CourseYear> {
  return domainCreate<CourseYear>(ENTITIES.COURSE_YEAR.name, data)
}

export async function updateCourseYear(
  courseYearId: number,
  data: Partial<Omit<CourseYear, 'courseYearId'>>,
): Promise<CourseYear> {
  return domainUpdate<CourseYear>(ENTITIES.COURSE_YEAR.name, ENTITIES.COURSE_YEAR.pk, courseYearId, {
    ...data,
  })
}
