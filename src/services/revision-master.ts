import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'
import { GM_CODES } from '@/config/constants/ui'

type AnyRow = Record<string, any>

/** Angular parity: `examFeeRevisionMaster` + `course.courseId` + `isActive` — one list call; alternate entity/query only if needed. */
async function listRevisionForQuery(query: string): Promise<AnyRow[]> {
  try {
    const fee = await domainList<AnyRow>('ExamFeeRevisionMaster', query)
    if (Array.isArray(fee) && fee.length > 0) return fee
  } catch {
    // try legacy entity below
  }
  try {
    const rev = await domainList<AnyRow>('ExamRevisionMaster', query)
    return Array.isArray(rev) ? rev : []
  } catch {
    return []
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
  if (!Number.isFinite(courseId) || courseId <= 0) return []

  // 1) Angular field name is `course.courseId` (see legacy `listDetailsByTwoIds(..., 'course.courseId', 'isActive')`).
  const angularShape = buildQuery({ 'course.courseId': courseId, isActive: true })
  let rows = await listRevisionForQuery(angularShape)
  if (rows.length > 0) return rows

  // 2) Typical Spring/JPA relation path used elsewhere in this codebase.
  const pascalCourse = buildQuery({ 'Course.courseId': courseId, isActive: true })
  rows = await listRevisionForQuery(pascalCourse)
  if (rows.length > 0) return rows

  // 3) Flat `courseId` filter only if both relation paths returned no rows.
  const flat = buildQuery({ courseId, isActive: true })
  rows = await listRevisionForQuery(flat)
  return rows
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

