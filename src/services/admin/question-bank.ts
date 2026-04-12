/**
 * Question Bank (Assessment) service.
 *
 * API endpoints:
 *   GET    /domain/list/Assessment?size=99999&query=...      — list all / filtered
 *   POST   /domain/create/Assessment                         — create question bank
 *   PUT    /domain/update/Assessment?query=assessmentId=={id}— update question bank
 *   POST   /assessment/addQuestion                           — add or update a question
 *   POST   /assessment/importQuestionsDetails                — bulk import from Excel
 *   GET    /domain/list/CourseLessonSearch?size=99999&query=q=lk={term}
 *                                                            — search courses for modal dropdown
 *   GET    /domain/list/GeneralDetail?size=99999&query=...   — question type lookup
 */

import type {
  Assessment,
  AssessmentQuestion,
  CourseQuestion,
  OnlineCourse,
  QuestionType,
} from '@/types/question-bank'
import type { ApiResponse } from '@/types/api'
import { domainList, domainCreate, domainUpdate, buildQuery } from '../crud'
import { ENTITIES, ASSESSMENT_API, GM_CODES } from '@/config/constants'
import { AppError, parseApiError } from '@/lib/errors'

// ─── Question Bank CRUD ───────────────────────────────────────────────────────

/**
 * List question banks. ADMIN role gets all; pass userId to filter to that user's banks.
 */
export async function listQuestionBanks(userId?: number): Promise<Assessment[]> {
  const query = userId !== undefined
    ? buildQuery({ 'preparedbyUser.userId': userId }, { field: 'createdDt', direction: 'DESC' })
    : buildQuery({}, { field: 'createdDt', direction: 'DESC' })
  const rows = await domainList<Assessment>(ENTITIES.ASSESSMENT.name, query)
  return rows.filter((r) => r.isForQuestionbank)
}

/** Create a new question bank. */
export async function createQuestionBank(
  data: Omit<Assessment, 'assessmentId' | 'assessmentQuestionDTOs'>,
): Promise<Assessment> {
  return domainCreate<Assessment>(ENTITIES.ASSESSMENT.name, data)
}

/** Update an existing question bank. */
export async function updateQuestionBank(
  assessmentId: number,
  data: Partial<Omit<Assessment, 'assessmentId' | 'assessmentQuestionDTOs'>>,
): Promise<Assessment> {
  return domainUpdate<Assessment>(
    ENTITIES.ASSESSMENT.name,
    ENTITIES.ASSESSMENT.pk,
    assessmentId,
    data,
  )
}

// ─── Questions ────────────────────────────────────────────────────────────────

/**
 * Fetch all questions for a given question bank.
 * Returns the assessmentQuestionDTOs array from the Assessment record.
 */
export async function listQuestionsByBank(assessmentId: number): Promise<AssessmentQuestion[]> {
  const rows = await domainList<Assessment>(
    ENTITIES.ASSESSMENT.name,
    buildQuery({ assessmentId }),
  )
  return rows[0]?.assessmentQuestionDTOs ?? []
}

/**
 * Add a new question or update an existing one.
 * If payload includes `courseQuestionId`, Spring Boot treats it as an update.
 * POST /assessment/addQuestion
 */
export async function addOrUpdateQuestion(
  payload: Partial<CourseQuestion> & {
    assessmentId: number
    assessmentQuestionId?: number
    questionOwnerProfileId: number | null
  },
): Promise<CourseQuestion> {
  const res = await fetch(`/api/proxy/${ASSESSMENT_API.ADD_QUESTION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
  const body: ApiResponse<CourseQuestion> = await res.json()
  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? 'Failed to save question')
  }
  return body.data as CourseQuestion
}

/**
 * Bulk-import questions from an Excel file.
 * Returns the imported question objects; the caller must POST each to addOrUpdateQuestion.
 * POST /assessment/importQuestionsDetails
 */
export async function importQuestionsFromExcel(
  assessmentId: number,
  file: File,
): Promise<Partial<CourseQuestion>[]> {
  const formData = new FormData()
  formData.append('assessmentId', String(assessmentId))
  formData.append('file', file, file.name)

  const res = await fetch(`/api/proxy/${ASSESSMENT_API.BULK_IMPORT}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
  const body: ApiResponse<Partial<CourseQuestion>[]> = await res.json()
  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? 'Failed to import questions')
  }
  return (body.data ?? []) as Partial<CourseQuestion>[]
}

// ─── Dropdown data ────────────────────────────────────────────────────────────

/**
 * Search courses by name for the question bank modal dropdown.
 * GET /domain/list/CourseLessonSearch?query=q=lk={term}
 */
export async function searchCourses(term: string): Promise<OnlineCourse[]> {
  return domainList<OnlineCourse>(
    ASSESSMENT_API.COURSE_SEARCH,
    `q=lk=${encodeURIComponent(term)}`,
  )
}

/**
 * Fetch question types (MC, TF, FB, SUB) from GeneralDetail.
 * GET /domain/list/GeneralDetail filtered by questionType category and isActive=true
 */
export async function listQuestionTypes(): Promise<QuestionType[]> {
  return domainList<QuestionType>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.QUESTION_TYPE, isActive: true }),
  )
}
