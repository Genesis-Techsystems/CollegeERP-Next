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
  return domainCreate<Batch>(ENTITIES.BATCH.name, data)
}

export async function updateBatch(
  batchId: number,
  data: Partial<Omit<Batch, 'batchId'>>,
): Promise<Batch> {
  return domainUpdate<Batch>(ENTITIES.BATCH.name, ENTITIES.BATCH.pk, batchId, {
    batchId,
    ...data,
  })
}
