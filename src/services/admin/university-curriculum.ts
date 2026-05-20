import { SUBJECT_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainList, domainSoftDelete, fetchDetails, postDetails } from '../crud'

type AnyRow = Record<string, any>

export async function listActiveCourseGroupsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
    buildQuery({ 'course.courseId': courseId, isActive: true }),
    buildQuery({ courseId, isActive: true }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.COURSE_GROUP.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next variant
    }
  }
  return []
}

export async function listActiveRegulationsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
    buildQuery({ 'course.courseId': courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
    buildQuery({ courseId, isActive: true }, { field: 'regulationCode', direction: 'DESC' }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.REGULATION.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next variant
    }
  }
  return []
}

export async function listActiveCourseYearsByCourse(courseId: number): Promise<AnyRow[]> {
  if (!courseId) return []
  const queries = [
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
    buildQuery({ 'course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
    buildQuery({ courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
  ]
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.COURSE_YEAR.name, q)
      if (rows.length > 0) return rows
    } catch {
      // Try next variant
    }
  }
  return []
}

export async function listGroupYearRegulationSubjects(
  courseGroupId: number,
  courseYearId: number,
  regulationId: number,
): Promise<AnyRow[]> {
  if (!courseGroupId || !courseYearId || !regulationId) return []
  const paramCombos: Array<Record<string, string | number>> = [
    { courseGroupId, courseYearId, regulationId },
    { coursegroupId: courseGroupId, courseyearId: courseYearId, regulationId },
    { courseGroupId, courseYearId, regulationid: regulationId },
  ]

  for (const params of paramCombos) {
    try {
      const rows = await fetchDetails<AnyRow[]>(SUBJECT_API.GROUP_YR_REGULATION_DETAILS, params)
      if (Array.isArray(rows)) return rows
    } catch {
      // Try next param names
    }
  }
  return []
}

export async function saveGroupYearRegulationSubjects(rows: AnyRow[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return
  const paths = [SUBJECT_API.GROUP_YR_REGULATION_DETAILS, 'groupYrRegulationDetails']
  let lastError: unknown = null
  for (const path of paths) {
    try {
      await postDetails(path, rows)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw (lastError ?? new Error('Failed to save curriculum subjects'))
}

export async function softDeleteGroupYearRegulationDetail(groupyrRegDetailId: number): Promise<void> {
  if (!groupyrRegDetailId) return
  await domainSoftDelete(SUBJECT_API.GROUP_YR_REGULATION, 'groupyrRegDetailId', groupyrRegDetailId)
}

