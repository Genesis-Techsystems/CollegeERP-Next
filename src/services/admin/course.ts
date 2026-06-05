import { ENTITIES } from '@/config/constants/entities'
import type { Course } from '@/types/course'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listCourses(): Promise<Course[]> {
  return domainList<Course>(
    ENTITIES.COURSE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createCourse(data: Omit<Course, 'courseId'>): Promise<Course> {
  return domainCreate<Course>(ENTITIES.COURSE.name, data)
}

export async function updateCourse(
  courseId: number,
  data: Partial<Omit<Course, 'courseId'>>,
): Promise<Course> {
  // PK stays in the URL query only — including it in the body makes Spring
  // reject the update as an invalid request.
  return domainUpdate<Course>(ENTITIES.COURSE.name, ENTITIES.COURSE.pk, courseId, {
    ...data,
  })
}
