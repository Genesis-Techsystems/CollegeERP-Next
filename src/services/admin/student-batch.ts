import { ENTITIES } from '@/config/constants/entities'
import type { Batch } from '@/types/batch'
import type { GroupSection } from '@/types/group-section'
import type { StudentBatch } from '@/types/student-batch'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listStudentBatches(): Promise<StudentBatch[]> {
  return domainList<StudentBatch>(
    ENTITIES.STUDENT_ACADEMIC_BATCH.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveSectionsForStudentBatches(): Promise<GroupSection[]> {
  return domainList<GroupSection>(ENTITIES.GROUP_SECTION.name, buildQuery({ isActive: true }))
}

export async function listActiveBatchesForStudentBatches(): Promise<Batch[]> {
  return domainList<Batch>(ENTITIES.BATCH.name, buildQuery({ isActive: true }))
}

export async function createStudentBatch(
  data: Omit<StudentBatch, 'studentAcademicbatchId' | 'studentAcademicBatchId'>,
): Promise<StudentBatch> {
  return domainCreate<StudentBatch>(ENTITIES.STUDENT_ACADEMIC_BATCH.name, data)
}

export async function updateStudentBatch(
  studentAcademicbatchId: number,
  data: Partial<Omit<StudentBatch, 'studentAcademicbatchId' | 'studentAcademicBatchId'>>,
): Promise<StudentBatch> {
  const payload = {
    studentAcademicbatchId,
    studentAcademicBatchId: studentAcademicbatchId,
    ...data,
  }
  try {
    return await domainUpdate<StudentBatch>(
      ENTITIES.STUDENT_ACADEMIC_BATCH.name,
      ENTITIES.STUDENT_ACADEMIC_BATCH.pk,
      studentAcademicbatchId,
      payload,
    )
  } catch {
    return domainUpdate<StudentBatch>(
      ENTITIES.STUDENT_ACADEMIC_BATCH.name,
      'studentAcademicBatchId',
      studentAcademicbatchId,
      payload,
    )
  }
}
