/**
 * Exam Grade service — client-side only.
 *
 * Entity: ExamGrade
 * Primary key: examGradesId
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import type { ExamGrade, ExamGradeFormValues } from '@/types/exam-grade'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List exam grades, optionally filtered by course, regulation, and disabled-student flag.
 *
 * Server entity field names (differ from form field names):
 *   Course.courseId, Regulation.regulationId, disabled (not isForDisabled)
 *
 * Angular source: exam-grades.component.ts:332-333
 *   crudService.listDetailsByThreeIds(examGradeUrl, courseId, regulationId, isForDisabled,
 *     'Course.courseId', 'Regulation.regulationId', 'disabled')
 *
 * @param filters - optional filter fields
 * @returns array of ExamGrade records
 * @throws AppError on failure
 */
export async function getExamGrades(filters?: {
  courseId?: number
  regulationId?: number
  isForDisabled?: boolean
}): Promise<ExamGrade[]> {
  const conditions: Record<string, string | number | boolean> = {}

  if (filters?.courseId !== undefined) conditions['Course.courseId'] = filters.courseId
  if (filters?.regulationId !== undefined) conditions['Regulation.regulationId'] = filters.regulationId
  if (filters?.isForDisabled !== undefined) conditions['disabled'] = filters.isForDisabled

  const query = buildQuery(conditions)
  return domainList<ExamGrade>(ENTITIES.EXAM_GRADE.name, query || undefined)
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new exam grade.
 *
 * @param data - form values from ExamGradeModal
 * @returns the created ExamGrade with server-assigned examGradesId
 * @throws AppError on failure
 */
export async function createExamGrade(data: ExamGradeFormValues): Promise<ExamGrade> {
  return domainCreate<ExamGrade>(ENTITIES.EXAM_GRADE.name, data)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing exam grade.
 *
 * @param id - examGradesId of the record to update
 * @param data - updated form values
 * @returns the updated ExamGrade
 * @throws AppError on failure
 */
export async function updateExamGrade(id: number, data: ExamGradeFormValues): Promise<ExamGrade> {
  return domainUpdate<ExamGrade>(ENTITIES.EXAM_GRADE.name, ENTITIES.EXAM_GRADE.pk, id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam grade (sets isActive: false).
 *
 * @param id - examGradesId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamGrade(id: number): Promise<void> {
  return domainSoftDelete(ENTITIES.EXAM_GRADE.name, ENTITIES.EXAM_GRADE.pk, id)
}
