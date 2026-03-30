/**
 * Exam Grade service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern). Never calls Spring Boot directly.
 *
 * Spring Boot entity: ExamGrade
 * Primary key: examGradesId
 */

import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud.service'
import type { ExamGrade, ExamGradeFormValues } from '@/types/exam-grade'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List exam grades, optionally filtered by course, regulation, and disabled-student flag.
 *
 * QueryDSL field names match the Spring Boot ExamGrade entity:
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
  return domainList<ExamGrade>('ExamGrade', query || undefined)
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
  return domainCreate<ExamGrade>('ExamGrade', data)
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
  return domainUpdate<ExamGrade>('ExamGrade', 'examGradesId', id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an exam grade (sets isActive: false).
 *
 * @param id - examGradesId of the record to delete
 * @throws AppError on failure
 */
export async function deleteExamGrade(id: number): Promise<void> {
  return domainSoftDelete('ExamGrade', 'examGradesId', id)
}
