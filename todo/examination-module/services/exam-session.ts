/**
 * Exam Session service — client-side only.
 *
 * Entity: ExamSession
 * Primary key: examSessionId
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import type { ExamSession, ExamSessionFormValues } from '@/types/exam-session'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all exam sessions, optionally filtered by university.
 *
 * @param universityId - optional filter by university
 * @returns array of ExamSession records ordered by name ASC
 * @throws AppError on failure
 */
export async function getExamSessions(universityId?: number): Promise<ExamSession[]> {
  const conditions: Record<string, string | number | boolean> =
    universityId !== undefined ? { universityId } : {}

  const query = buildQuery(conditions, { field: 'createdDt', direction: 'DESC' })
  return domainList<ExamSession>(ENTITIES.EXAM_SESSION.name, query || undefined)
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new exam session.
 *
 * @param data - form values from ExamSessionModal
 * @returns the created ExamSession with server-assigned examSessionId
 * @throws AppError on failure
 */
export async function createExamSession(data: ExamSessionFormValues): Promise<ExamSession> {
  return domainCreate<ExamSession>(ENTITIES.EXAM_SESSION.name, data)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing exam session.
 *
 * @param id - examSessionId of the record to update
 * @param data - updated form values
 * @returns the updated ExamSession
 * @throws AppError on failure
 */
export async function updateExamSession(id: number, data: ExamSessionFormValues): Promise<ExamSession> {
  return domainUpdate<ExamSession>(ENTITIES.EXAM_SESSION.name, ENTITIES.EXAM_SESSION.pk, id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam session (sets isActive: false).
 *
 * @param id - examSessionId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamSession(id: number): Promise<void> {
  return domainSoftDelete(ENTITIES.EXAM_SESSION.name, ENTITIES.EXAM_SESSION.pk, id)
}
