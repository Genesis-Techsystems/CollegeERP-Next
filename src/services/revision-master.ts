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
  return listRevisionEntity(buildQuery({ 'course.courseId': courseId, isActive: true }))
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

