import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'
import { GM_CODES } from '@/config/constants/ui'

type AnyRow = Record<string, any>

async function listRevisionEntity(query?: string): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>('ExamFeeRevisionMaster', query)
  } catch {
    return domainList<AnyRow>('ExamRevisionMaster', query)
  }
}

export async function listCollegesActive(): Promise<AnyRow[]> {
  // Use literal entity names because COLLEGE/COURSE are not in ENTITIES registry yet.
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listCoursesByUniversity(universityId: number): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>(
      'Course',
      buildQuery({ 'University.universityId': universityId, isActive: true }),
    )
  } catch {
    // Fallback for backend variants that expose relation as lowercase.
    return domainList<AnyRow>(
      'Course',
      buildQuery({ 'university.universityId': universityId, isActive: true }),
    )
  }
}

export async function listRevisionMastersByCourse(courseId: number): Promise<AnyRow[]> {
  const queries = [
    buildQuery({ 'course.courseId': courseId, isActive: true }),
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
    buildQuery({ courseId, isActive: true }),
    buildQuery({ 'course.courseId': courseId }),
    buildQuery({ 'Course.courseId': courseId }),
    buildQuery({ courseId }),
  ]

  for (const q of queries) {
    const rows = await listRevisionEntity(q).catch(() => [])
    if (Array.isArray(rows) && rows.length > 0) return rows
  }
  // Final fallback: fetch all and filter client-side for backend variants
  const allRows = await listRevisionEntity().catch(() => [])
  if (!Array.isArray(allRows) || allRows.length === 0) return []
  const id = Number(courseId)
  return allRows.filter((r) => {
    const rowCourseId = Number(
      r?.courseId ??
      r?.fk_course_id ??
      r?.course?.courseId ??
      r?.Course?.courseId ??
      0,
    )
    return rowCourseId === id
  })
}

export async function listRevisionTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.REVISION_TYPE, isActive: true }),
  )
}

export async function createRevisionMaster(payload: AnyRow): Promise<AnyRow> {
  try {
    return await domainCreate<AnyRow>('ExamFeeRevisionMaster', payload)
  } catch {
    return domainCreate<AnyRow>('ExamRevisionMaster', payload)
  }
}

export async function updateRevisionMaster(id: number, payload: AnyRow): Promise<AnyRow> {
  try {
    return await domainUpdate<AnyRow>('ExamFeeRevisionMaster', 'revisionMasterId', id, payload)
  } catch {
    return domainUpdate<AnyRow>('ExamRevisionMaster', 'revisionMasterId', id, payload)
  }
}

