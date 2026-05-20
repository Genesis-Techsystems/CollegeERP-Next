import { ENTITIES } from '@/config/constants/entities'
import type { Batch } from '@/types/batch'
import type { College } from '@/types/college'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listBatchesAdmin(): Promise<Batch[]> {
  return domainList<Batch>(
    ENTITIES.BATCH.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCollegesForBatches(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function createBatch(data: Omit<Batch, 'batchId'>): Promise<Batch> {
  const collegeId = Number((data as Record<string, unknown>).collegeId ?? 0)
  const payloads: Array<Record<string, unknown>> = [
    { ...data },
    { ...data, fk_college_id: collegeId },
    { ...data, 'College.collegeId': collegeId },
    { ...data, college: { collegeId } },
  ]
  for (const payload of payloads) {
    try {
      return await domainCreate<Batch>(ENTITIES.BATCH.name, payload)
    } catch {
      // Try next payload shape for backend compatibility.
    }
  }
  return domainCreate<Batch>(ENTITIES.BATCH.name, data)
}

export async function updateBatch(
  batchId: number,
  data: Partial<Omit<Batch, 'batchId'>>,
): Promise<Batch> {
  const collegeId = Number((data as Record<string, unknown>).collegeId ?? 0)
  const payloads: Array<Record<string, unknown>> = [
    { batchId, ...data },
    { batchId, ...data, ...(collegeId > 0 ? { fk_college_id: collegeId } : {}) },
    { batchId, ...data, ...(collegeId > 0 ? { 'College.collegeId': collegeId } : {}) },
    { batchId, ...data, ...(collegeId > 0 ? { college: { collegeId } } : {}) },
  ]
  for (const payload of payloads) {
    try {
      return await domainUpdate<Batch>(ENTITIES.BATCH.name, ENTITIES.BATCH.pk, batchId, payload)
    } catch {
      // Try next payload shape for backend compatibility.
    }
  }
  return domainUpdate<Batch>(ENTITIES.BATCH.name, ENTITIES.BATCH.pk, batchId, {
    batchId,
    ...data,
  })
}
