import { ENTITIES } from '@/config/constants/entities'
import type { CourseYear } from '@/types/course-year'
import type { Course } from '@/types/course'
import { buildAngularCourseYearUpdatePayload } from './academic-master-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function normalizeCourseYear(row: CourseYear | Record<string, unknown>): CourseYear {
  const r = row as Record<string, unknown>
  return {
    ...(row as CourseYear),
    courseYearId: n((row as CourseYear).courseYearId ?? r.fk_course_year_id ?? r.course_year_id),
    universityId: n((row as CourseYear).universityId ?? r.fk_university_id ?? r.university_id),
    courseId: n((row as CourseYear).courseId ?? r.fk_course_id ?? r.course_id),
    yearNo: n((row as CourseYear).yearNo ?? r.year_no),
    sortOrder: n((row as CourseYear).sortOrder ?? r.sort_order),
    courseYearCode: String((row as CourseYear).courseYearCode ?? r.course_year_code ?? ''),
    courseYearName: String((row as CourseYear).courseYearName ?? r.course_year_name ?? ''),
    isActive: Boolean((row as CourseYear).isActive ?? r.is_active ?? r.isActive),
    reason: (row as CourseYear).reason ?? (r.reason as string | undefined),
    universityCode: (row as CourseYear).universityCode ?? (r.university_code as string | undefined),
    courseCode: (row as CourseYear).courseCode ?? (r.course_code as string | undefined),
  }
}

export async function listCourseYearsAdmin(): Promise<CourseYear[]> {
  const rows = await domainList<CourseYear>(
    ENTITIES.COURSE_YEAR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeCourseYear).filter((r) => r.courseYearId > 0)
}

export async function listActiveCoursesByUniversityForYear(universityId: number): Promise<Course[]> {
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

export async function createCourseYear(data: Omit<CourseYear, 'courseYearId'>): Promise<CourseYear> {
  return domainCreate<CourseYear>(ENTITIES.COURSE_YEAR.name, data)
}

export async function updateCourseYear(
  courseYearId: number,
  data: Partial<Omit<CourseYear, 'courseYearId'>>,
  existing?: CourseYear,
): Promise<CourseYear> {
  const payload = buildAngularCourseYearUpdatePayload(courseYearId, data as Record<string, unknown>, existing)
  return domainUpdate<CourseYear>(ENTITIES.COURSE_YEAR.name, ENTITIES.COURSE_YEAR.pk, courseYearId, payload)
}
