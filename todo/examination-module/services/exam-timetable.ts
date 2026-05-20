/**
 * Exam Timetable service — client-side only.
 *
 * Entity: ExamTimetable
 * Primary key: examTimetableId
 *
 * Angular source: exam-masters/exam-timetable/
 * POST endpoint: 'examtimetable' (CONSTANTS.examTimetablePostUrl)
 * CRUD entity:   'ExamTimetable'  (CONSTANTS.examTimetableUrl)
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery, fetchDetails } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import { EXAM_API } from '@/config/constants/api'
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
  // Uses a dedicated endpoint for timetable display.
  // GET /examtimetabledetails returns ExamTimetableDetailDTO with all joined fields
  // (groupCode, regulationCode, subjectCode, examSessionName, courseYearCode, etc.)
  // Angular source: exam-timetable.component.ts line 598-600
  const params: Record<string, string | number> = { examId }
  if (courseYearId !== undefined) params.courseYearId = courseYearId
  if (courseId !== undefined) params.courseId = courseId

  // Endpoint returns data directly as array or single object (not a PageResponse wrapper)
  const data = await fetchDetails<ExamTimetable[] | ExamTimetable | null>(
    EXAM_API.EXAM_TIMETABLE_DETAILS,
    params,
  )

  if (!data) return []
  if (Array.isArray(data)) return data
  return [data]
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new exam timetable row.
 *
 * API payload shape:
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
  return domainCreate<ExamTimetable>(ENTITIES.EXAM_TIMETABLE.name, payload)
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
  return domainUpdate<ExamTimetable>(ENTITIES.EXAM_TIMETABLE.name, ENTITIES.EXAM_TIMETABLE.pk, id, payload)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam timetable row (sets isActive: false).
 *
 * @param id - examTimetableId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamTimetable(id: number): Promise<void> {
  return domainSoftDelete(ENTITIES.EXAM_TIMETABLE.name, ENTITIES.EXAM_TIMETABLE.pk, id)
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
  return domainList<SubjectLookup>(ENTITIES.SUBJECT.name, query)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build the API payload from form values.
 * Nested FK objects: { entityName: { pkField: value } }
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
