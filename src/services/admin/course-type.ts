import { ENTITIES } from '@/config/constants/entities'
import type { CourseType } from '@/types/course-type'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listCourseTypes(): Promise<CourseType[]> {
  return domainList<CourseType>(
    ENTITIES.COURSE_TYPE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCourseTypesByUniversity(universityId: number): Promise<CourseType[]> {
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
      const rows = await domainList<CourseType>(ENTITIES.COURSE_TYPE.name, query)
      if (rows.length > 0) return rows
    } catch {
      // Try next query shape for backend compatibility.
    }
  }
  return []
}

export async function createCourseType(data: Omit<CourseType, 'courseTypeId'>): Promise<CourseType> {
  return domainCreate<CourseType>(ENTITIES.COURSE_TYPE.name, data)
}

export async function updateCourseType(
  courseTypeId: number,
  data: Partial<Omit<CourseType, 'courseTypeId'>>,
): Promise<CourseType> {
  return domainUpdate<CourseType>(ENTITIES.COURSE_TYPE.name, ENTITIES.COURSE_TYPE.pk, courseTypeId, {
    courseTypeId,
    ...data,
  })
}
