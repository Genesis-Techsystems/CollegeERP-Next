/**
 * Exam Timetable service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern). Never calls Spring Boot directly.
 *
 * Spring Boot entity: ExamTimetable
 * Primary key: examTimetableId
 *
 * Angular source: exam-masters/exam-timetable/
 * POST endpoint: 'examtimetable' (CONSTANTS.examTimetablePostUrl)
 * CRUD entity:   'ExamTimetable'  (CONSTANTS.examTimetableUrl)
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud.service'
import { AppError, parseApiError } from '@/lib/errors'
import type { ApiResponse } from '@/types/api'
import type { ExamTimetable, ExamTimetableFormValues, SubjectLookup } from '@/types/exam-timetable'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List exam timetable rows for a given exam, optionally filtered by course year.
 *
 * @param examId - the parent exam master ID
 * @param courseYearId - optional course year filter
 * @returns array of ExamTimetable records ordered by exam date ASC
 * @throws AppError on failure
 */
export async function getExamTimetables(
  examId: number,
  courseYearId?: number,
  courseId?: number,
): Promise<ExamTimetable[]> {
  // Spring Boot has a dedicated denormalized endpoint for timetable display.
  // GET /examtimetabledetails returns ExamTimetableDetailDTO with all joined fields
  // (groupCode, regulationCode, subjectCode, examSessionName, courseYearCode, etc.)
  // Angular source: exam-timetable.component.ts line 598-600
  const params = new URLSearchParams()
  params.set('examId', String(examId))
  if (courseYearId !== undefined) params.set('courseYearId', String(courseYearId))
  if (courseId !== undefined) params.set('courseId', String(courseId))

  const res = await fetch(`/api/proxy/examtimetabledetails?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body: ApiResponse<ExamTimetable[]> = await res.json()
  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? 'Failed to fetch timetable')
  }

  // Dedicated endpoint returns data directly as an array (not a PageResponse wrapper)
  if (!body.data) return []
  if (Array.isArray(body.data)) return body.data
  return [body.data as ExamTimetable]
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new exam timetable row.
 *
 * The Spring Boot endpoint expects a payload shaped like:
 * {
 *   examMaster: { examId },
 *   subject: { subjectId },
 *   examSession: { examSessionId },
 *   courseYear: { courseYearId },   // if applicable
 *   regulation: { regulationId },   // if applicable
 *   examDate: "YYYY-MM-DD",
 *   isActive: true,
 * }
 *
 * @param data - form values from ExamTimetableModal
 * @returns the created ExamTimetable with server-assigned examTimetableId
 * @throws AppError on failure
 */
export async function createExamTimetable(data: ExamTimetableFormValues): Promise<ExamTimetable> {
  const payload = buildTimetablePayload(data)
  return domainCreate<ExamTimetable>('ExamTimetable', payload)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing exam timetable row.
 *
 * @param id - examTimetableId of the record to update
 * @param data - updated form values
 * @returns the updated ExamTimetable
 * @throws AppError on failure
 */
export async function updateExamTimetable(
  id: number,
  data: ExamTimetableFormValues,
): Promise<ExamTimetable> {
  const payload = buildTimetablePayload(data)
  return domainUpdate<ExamTimetable>('ExamTimetable', 'examTimetableId', id, payload)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam timetable row (sets isActive: false).
 *
 * @param id - examTimetableId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamTimetable(id: number): Promise<void> {
  return domainSoftDelete('ExamTimetable', 'examTimetableId', id)
}

// ─── Reference Data ───────────────────────────────────────────────────────────

/**
 * List subjects available for a given exam + course + regulation combination.
 * Used when the timetable is loaded with full filter context.
 *
 * @param courseYearId - the course year filter
 * @param regulationId - the regulation filter
 * @returns array of SubjectLookup records ordered by subject code ASC
 * @throws AppError on failure
 */
export async function getSubjectsForYear(
  courseYearId: number,
  regulationId?: number,
): Promise<SubjectLookup[]> {
  const conditions: Record<string, string | number | boolean> = {
    'CourseYear.courseYearId': courseYearId,
    isActive: true,
  }
  if (regulationId !== undefined) {
    conditions['Regulation.regulationId'] = regulationId
  }

  const query = buildQuery(conditions, { field: 'subjectCode', direction: 'ASC' })
  return domainList<SubjectLookup>('Subject', query)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the Spring Boot entity payload from form values.
 * Nested FK objects follow the Spring Boot convention: { entityName: { pkField: value } }
 */
function buildTimetablePayload(data: ExamTimetableFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    isActive: data.isActive,
    reason: data.reason ?? '',
  }

  if (data.examId !== null) {
    payload['examMaster'] = { examId: data.examId }
  }
  if (data.subjectId !== null) {
    payload['subject'] = { subjectId: data.subjectId }
  }
  if (data.examSessionId !== null) {
    payload['examSession'] = { examSessionId: data.examSessionId }
  }
  if (data.examDate !== null) {
    // Format as ISO YYYY-MM-DD
    const d = data.examDate
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    payload['examDate'] = `${yyyy}-${mm}-${dd}`
  }
  if (data.courseYearId !== null) {
    payload['courseYear'] = { courseYearId: data.courseYearId }
  }
  if (data.regulationId !== null) {
    payload['regulation'] = { regulationId: data.regulationId }
  }
  if (data.examTypeCatId !== null) {
    payload['examTypeCat'] = { generalDetailId: data.examTypeCatId }
  }

  return payload
}
