import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'
import { GM_CODES } from '@/config/constants/ui'

type AnyRow = Record<string, any>

export async function listCollegesActive(): Promise<AnyRow[]> {
  // Use literal entity names because COLLEGE/COURSE are not in ENTITIES registry yet.
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listCoursesByUniversity(universityId: number): Promise<AnyRow[]> {
  if (!universityId) return []
  const queries = [
    buildQuery({ 'University.universityId': universityId, isActive: true }),
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
    buildQuery({ 'university.universityId': universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
    buildQuery({ fk_university_id: universityId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      return await domainList<AnyRow>('Course', query)
    } catch {
      // Try next query shape for backend compatibility.
    }
  }
  return []
}

export async function listCoursesForRevisionFilters(params: {
  collegeId?: number | null
  universityId?: number | null
}): Promise<AnyRow[]> {
  const universityId = Number(params.universityId ?? 0)
  const collegeId = Number(params.collegeId ?? 0)

  if (universityId > 0) {
    const byUniversity = await listCoursesByUniversity(universityId)
    if (byUniversity.length > 0) return byUniversity
  }

  if (collegeId <= 0) return []

  const collegeQueries = [
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
    buildQuery({ 'college.collegeId': collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
    buildQuery({ fk_college_id: collegeId, isActive: true }),
  ]

  for (const query of collegeQueries) {
    try {
      const rows = await domainList<AnyRow>('Course', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // Try next query shape for backend compatibility.
    }
  }

  return []
}

export async function listRevisionMastersByCourse(courseId: number): Promise<AnyRow[]> {
  if (!Number.isFinite(courseId) || courseId <= 0) return []
  // Angular parity: single list call using `course.courseId` + `isActive`.
  const query = buildQuery({ 'course.courseId': courseId, isActive: true })
  try {
    const rows = await domainList<AnyRow>('ExamFeeRevisionMaster', query)
    return Array.isArray(rows) ? rows : []
  } catch {
    // Only fallback when the primary entity/query shape is unsupported.
    try {
      const rows = await domainList<AnyRow>('ExamRevisionMaster', query)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  }
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

