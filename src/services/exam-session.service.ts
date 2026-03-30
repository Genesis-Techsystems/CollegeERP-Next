/**
 * Exam Session service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern). Never calls Spring Boot directly.
 *
 * Spring Boot entity: ExamSession
 * Primary key: examSessionId
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud.service'
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
  return domainList<ExamSession>('ExamSession', query || undefined)
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
  return domainCreate<ExamSession>('ExamSession', data)
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
  return domainUpdate<ExamSession>('ExamSession', 'examSessionId', id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam session (sets isActive: false).
 *
 * @param id - examSessionId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamSession(id: number): Promise<void> {
  return domainSoftDelete('ExamSession', 'examSessionId', id)
}
