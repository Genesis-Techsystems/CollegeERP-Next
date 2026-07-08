import { ENTITIES } from '@/config/constants/entities'
import type { Course } from '@/types/course'
import { buildAngularCourseUpdatePayload } from './academic-master-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

function normalizeCourse(row: Course | Record<string, unknown>): Course {
  const r = row as Record<string, unknown>
  const durationRaw = (row as Course).duration ?? r.duration
  const inTakeRaw = (row as Course).inTake ?? r.in_take ?? r.inTake ?? r.intake
  const startingNoRaw = (row as Course).startingNo ?? r.starting_no ?? r.startingNo
  return {
    ...(row as Course),
    courseId: n((row as Course).courseId ?? r.fk_course_id ?? r.course_id),
    universityId: n((row as Course).universityId ?? r.fk_university_id ?? r.university_id),
    courseTypeId: n((row as Course).courseTypeId ?? r.fk_course_type_id ?? r.course_type_id),
    courseCode: String((row as Course).courseCode ?? r.course_code ?? ''),
    courseName: String((row as Course).courseName ?? r.course_name ?? ''),
    courseShortName: String((row as Course).courseShortName ?? r.course_short_name ?? ''),
    duration: durationRaw == null || durationRaw === '' ? undefined : n(durationRaw),
    inTake: inTakeRaw == null || inTakeRaw === '' ? undefined : n(inTakeRaw),
    prefix: (row as Course).prefix ?? (r.prefix as string | undefined),
    startingNo: startingNoRaw == null || startingNoRaw === '' ? undefined : n(startingNoRaw),
    isActive: Boolean((row as Course).isActive ?? r.is_active ?? r.isActive),
    reason: (row as Course).reason ?? (r.reason as string | undefined),
    universityCode: (row as Course).universityCode ?? (r.university_code as string | undefined),
    courseTypeName:
      (row as Course).courseTypeName ??
      (r.course_type_name as string | undefined) ??
      (r.courseTypeName as string | undefined),
  }
}

export async function listCourses(): Promise<Course[]> {
  const rows = await domainList<Course>(
    ENTITIES.COURSE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
  return rows.map(normalizeCourse).filter((r) => r.courseId > 0)
}

export async function createCourse(data: Omit<Course, 'courseId'>): Promise<Course> {
  return domainCreate<Course>(ENTITIES.COURSE.name, data)
}

export async function updateCourse(
  courseId: number,
  data: Partial<Omit<Course, 'courseId'>>,
  existing?: Course,
): Promise<Course> {
  const payload = buildAngularCourseUpdatePayload(courseId, data as Record<string, unknown>, existing)
  return domainUpdate<Course>(ENTITIES.COURSE.name, ENTITIES.COURSE.pk, courseId, payload)
}
