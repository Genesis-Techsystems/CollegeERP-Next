/**
 * Exam Fee Structure service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern).
 *
 * Angular source: exam-fee-structure.component.ts, exam-fee-structure-modal.component.ts
 * Spring Boot entity: ExamFeeStructure
 * Primary key: examFeeStructureId
 *
 * Import in 'use client' components:
 *   import { getExamFilters, fetchFeeStructures, ... } from '@/services/exam-fee-setup.service'
 */

import { EXAM_MASTERS_API } from '@/config/constants/api'
import { AppError } from '@/lib/errors'
import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery, getAllRecords } from '@/services/crud.service'
import type { ExamFeeStructure } from '@/types/exam-fee-setup'

// ─── Filter row types ─────────────────────────────────────────────────────────

export interface ExamFilterRow {
  flag?: string
  fk_university_id: number
  university_code: string
  university_name: string
  fk_college_id?: number
  college_code?: string
  college_name?: string
  fk_course_id: number
  course_code: string
  course_name: string
  fk_academic_year_id: number
  academic_year: string
  is_curr_ay?: number
  fk_exam_id: number
  exam_name: string
  exam_code?: string
  from_date?: string
  to_date?: string
  is_internal_exam?: boolean
  is_regular_exam?: boolean
  is_supply_exam?: boolean
}

export interface ExamFiltersResult {
  filterRows: ExamFilterRow[]
}

// ─── Fetch exam filters ────────────────────────────────────────────────────────

/**
 * Fetches the cascading exam filter dropdowns for the Fee Structure page.
 * Uses s_get_exam_filters_bycode with flag='univ_exam_filters'.
 *
 * @param empId - employee ID from session user
 * @returns combined filter rows
 * @throws AppError on failure
 */
export async function getExamFilters(empId: number): Promise<ExamFiltersResult> {
  const data = await getAllRecords<{ result: ExamFilterRow[][] }>(
    's_get_exam_filters_bycode',
    {
      in_flag: 'univ_exam_filters',
      in_flag_type: 'ALL',
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_exam_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
      in_subject_id: 0,
      in_loginuser_empid: empId,
      in_loginuser_roleid: 0,
      in_sub_flag_type: 0,
      in_param1: 0,
      in_param2: 0,
    },
  )

  const result = data?.result ?? []
  let filterRows: ExamFilterRow[] = []

  for (const arr of result) {
    if (arr.length === 0) continue
    const first = arr[0] as unknown as Record<string, unknown>
    if (first['flag'] === 'univ_exam_filters') {
      filterRows = arr as ExamFilterRow[]
    }
  }

  return { filterRows }
}

// ─── Fetch fee structures ─────────────────────────────────────────────────────

/**
 * Fetches fee structures for a given exam (university mode).
 *
 * @param examId - FK exam master
 * @returns array of ExamFeeStructure records
 * @throws AppError on failure
 */
export async function fetchFeeStructuresByExam(examId: number): Promise<ExamFeeStructure[]> {
  const query = buildQuery({ 'examMaster.examId': examId, isActive: true })
  return domainList<ExamFeeStructure>(EXAM_MASTERS_API.EXAM_FEE_STRUCTURE_ENTITY, query)
}

/**
 * Fetches fee structures for a given exam and college (college mode).
 *
 * @param examId - FK exam master
 * @param collegeId - FK college
 * @returns array of ExamFeeStructure records
 * @throws AppError on failure
 */
export async function fetchFeeStructuresByExamAndCollege(
  examId: number,
  collegeId: number,
): Promise<ExamFeeStructure[]> {
  const query = buildQuery({
    'examMaster.examId': examId,
    'College.collegeId': collegeId,
    isActive: true,
  })
  return domainList<ExamFeeStructure>(EXAM_MASTERS_API.EXAM_FEE_STRUCTURE_ENTITY, query)
}

// ─── Create / Update / Delete ─────────────────────────────────────────────────

/**
 * Creates a new fee structure.
 * @throws AppError on failure
 */
export async function createFeeStructure(
  payload: Record<string, unknown>,
): Promise<ExamFeeStructure> {
  return domainCreate<ExamFeeStructure>(EXAM_MASTERS_API.EXAM_FEE_STRUCTURE_ENTITY, payload)
}

/**
 * Updates an existing fee structure.
 * @throws AppError on failure
 */
export async function updateFeeStructure(
  examFeeStructureId: number,
  payload: Record<string, unknown>,
): Promise<ExamFeeStructure> {
  return domainUpdate<ExamFeeStructure>(
    EXAM_MASTERS_API.EXAM_FEE_STRUCTURE_ENTITY,
    'examFeeStructureId',
    examFeeStructureId,
    payload,
  )
}

/**
 * Soft-deletes a fee structure.
 * @throws AppError on failure
 */
export async function deleteFeeStructure(examFeeStructureId: number): Promise<void> {
  return domainSoftDelete(
    EXAM_MASTERS_API.EXAM_FEE_STRUCTURE_ENTITY,
    'examFeeStructureId',
    examFeeStructureId,
  )
}
