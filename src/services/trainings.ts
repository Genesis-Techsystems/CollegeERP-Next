import type { PlacementTraining, TrainingDetail, TrainingSession } from '@/types/trainings'
import { buildQuery, domainList, domainCreate, domainUpdate } from './crud'
import { ENTITIES } from '@/config/constants/entities'

const ET = ENTITIES.PLACEMENT_TRAINING
const ED = ENTITIES.TRAINING_DETAIL
const ES = ENTITIES.TRAINING_SESSION

// ─── Placement Training ──────────────────────────────────────────────────────

export async function listTrainings(): Promise<PlacementTraining[]> {
  return domainList<PlacementTraining>(ET.name, buildQuery({ isActive: true }))
}

export async function createTraining(data: Partial<PlacementTraining>): Promise<PlacementTraining> {
  return domainCreate<PlacementTraining>(ET.name, data)
}

export async function updateTraining(id: number, data: Partial<PlacementTraining>): Promise<PlacementTraining> {
  return domainUpdate<PlacementTraining>(ET.name, ET.pk, id, data)
}

// ─── Training Detail ─────────────────────────────────────────────────────────

export async function listTrainingDetails(filters: {
  collegeId: number
  yearName: string
  traningId: number
}): Promise<TrainingDetail[]> {
  return domainList<TrainingDetail>(
    ED.name,
    buildQuery({
      'Training.traningId': filters.traningId,
      'College.collegeId': filters.collegeId,
      yearName: filters.yearName,
      isActive: true,
    }),
  )
}

export async function getTrainingDetail(id: number): Promise<TrainingDetail | null> {
  const rows = await domainList<TrainingDetail>(ED.name, buildQuery({ traningDetId: id }))
  return rows[0] ?? null
}

export async function createTrainingDetail(data: Partial<TrainingDetail>): Promise<TrainingDetail> {
  return domainCreate<TrainingDetail>(ED.name, data)
}

export async function updateTrainingDetail(id: number, data: Partial<TrainingDetail>): Promise<TrainingDetail> {
  return domainUpdate<TrainingDetail>(ED.name, ED.pk, id, data)
}

// ─── Training Session ────────────────────────────────────────────────────────

export async function listTrainingSessions(traningDetId: number): Promise<TrainingSession[]> {
  return domainList<TrainingSession>(
    ES.name,
    buildQuery(
      { 'TrainingDetail.traningDetId': traningDetId, isActive: true },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function createTrainingSession(data: Partial<TrainingSession>): Promise<TrainingSession> {
  return domainCreate<TrainingSession>(ES.name, data)
}

export async function updateTrainingSession(id: number, data: Partial<TrainingSession>): Promise<TrainingSession> {
  return domainUpdate<TrainingSession>(ES.name, ES.pk, id, data)
}
