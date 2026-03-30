/**
 * Exam Master service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern). Never calls Spring Boot directly.
 *
 * Import in 'use client' components:
 *   import { getCollegeFilters, fetchExamsByUniversity } from '@/services/exam-master.service'
 */

import { EXAM_API } from '@/config/constants/api'
import { AppError, parseApiError } from '@/lib/errors'
import { buildQuery, domainList, domainCreate, domainUpdate, getAllRecords } from '@/services/crud.service'
import type {
  CollegeWiseFilterRow,
  ExamMaster,
  ExamMasterDetails,
  GeneralDetail,
  Regulation,
  CourseGroup,
  CourseYear,
} from '@/types/exam-master'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape returned from the college filters endpoint after parsing */
export interface CollegeFiltersResult {
  /** Filter rows with flag === "clg_filters" */
  filtersData: CollegeWiseFilterRow[]
  /** Academic year rows with clg_filters_ay === "clg_filters_ay" */
  academicData: CollegeWiseFilterRow[]
}

// ─── College Filters ─────────────────────────────────────────────────────────

/**
 * Fetches college-wise filter dropdowns for exam master pages.
 *
 * Spring Boot endpoint: GET getAllRecords/s_get_collegewisedetails_bycode
 * @param orgId - organization ID from session user (use 0 if undefined)
 * @param empId - employee ID from session user (use 0 if undefined)
 * @returns filter rows and academic year rows
 * @throws AppError with code 'FETCH_FAILED' on network error
 * @throws AppError with code 'API_ERROR' if Spring Boot returns non-200
 */
export async function getCollegeFilters(orgId: number, empId: number): Promise<CollegeFiltersResult> {
  // getAllRecords returns body.data, which for this proc is { result: CollegeWiseFilterRow[][] }
  const data = await getAllRecords<{ result: CollegeWiseFilterRow[][] }>(
    's_get_collegewisedetails_bycode',
    {
      in_flag: 'clg_filters',
      in_org_id: orgId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: empId,
      in_loginuser_roleid: 0,
      in_subject: '',
      in_employee: '',
      in_gm_codes: '',
    },
  )

  const result: CollegeWiseFilterRow[][] = data?.result ?? []

  let filtersData: CollegeWiseFilterRow[] = []
  let academicData: CollegeWiseFilterRow[] = []

  for (const arr of result) {
    if (arr.length > 0) {
      if (arr[0].flag === 'clg_filters') filtersData = arr
      if (arr[0].clg_filters_ay === 'clg_filters_ay') academicData = arr
    }
  }

  return { filtersData, academicData }
}

// ─── List Exam Masters ───────────────────────────────────────────────────────

/**
 * Fetches exam masters filtered by university, course, and academic year.
 *
 * @param universityId - university filter
 * @param courseId - course filter
 * @param academicYearId - academic year filter
 * @returns array of ExamMaster records, newest first
 * @throws AppError on failure
 */
export async function fetchExamsByUniversity(
  universityId: number,
  courseId: number,
  academicYearId: number,
): Promise<ExamMaster[]> {
  return domainList<ExamMaster>(
    'ExamMaster',
    buildQuery(
      {
        'Universities.universityId': universityId,
        'Course.courseId': courseId,
        'AcademicYear.academicYearId': academicYearId,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

/**
 * Fetches exam masters filtered by college, course, and academic year.
 *
 * @param collegeId - college filter
 * @param courseId - course filter
 * @param academicYearId - academic year filter
 * @returns array of ExamMaster records, newest first
 * @throws AppError on failure
 */
export async function fetchExamsByCollege(
  collegeId: number,
  courseId: number,
  academicYearId: number,
): Promise<ExamMaster[]> {
  return domainList<ExamMaster>(
    'ExamMaster',
    buildQuery(
      {
        'College.collegeId': collegeId,
        'Course.courseId': courseId,
        'AcademicYear.academicYearId': academicYearId,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

// ─── Get Exam Master by ID ──────────────────────────────────────────────────

/**
 * Fetches a single exam master by its ID.
 *
 * @param examId - the exam master primary key
 * @returns the ExamMaster or null if not found
 * @throws AppError on network/API failure
 */
export async function getExamMasterById(examId: number): Promise<ExamMaster | null> {
  const results = await domainList<ExamMaster>('ExamMaster', buildQuery({ examId }))
  return results[0] ?? null
}

// ─── Create / Update Exam Master ─────────────────────────────────────────────

/**
 * Creates a new exam master record.
 *
 * @param payload - exam master data (without examId)
 * @returns the created ExamMaster with server-generated examId
 * @throws AppError on failure
 */
export async function createExamMaster(payload: Record<string, unknown>): Promise<ExamMaster> {
  return domainCreate<ExamMaster>('ExamMaster', payload)
}

/**
 * Updates an existing exam master record.
 *
 * @param examId - the exam master primary key
 * @param payload - updated exam master data
 * @returns the updated ExamMaster
 * @throws AppError on failure
 */
export async function updateExamMaster(examId: number, payload: Record<string, unknown>): Promise<ExamMaster> {
  return domainUpdate<ExamMaster>('ExamMaster', 'examId', examId, payload)
}

// ─── Upload Exam Files ───────────────────────────────────────────────────────

/**
 * Uploads notification and/or fee notification files for an exam master.
 *
 * Note: The "examId " key has a trailing space to match Angular's FormData convention.
 *
 * @param examId - the exam master primary key
 * @param notificationFile - optional notification file
 * @param feeNotificationFile - optional fee notification file
 * @throws AppError on failure
 */
export async function uploadExamFiles(
  examId: number,
  notificationFile: File | null,
  feeNotificationFile: File | null,
): Promise<void> {
  if (!notificationFile && !feeNotificationFile) return

  const formData = new FormData()
  formData.append('examId ', String(examId)) // trailing space matches Angular
  if (notificationFile) formData.append('notificationFilePath', notificationFile)
  if (feeNotificationFile) formData.append('feeNotificationFilePath', feeNotificationFile)

  const res = await fetch(`/api/proxy/${EXAM_API.UPLOAD_EXAM_NOTIFICATION}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
}

// ─── Reference Data ──────────────────────────────────────────────────────────

/**
 * Fetches general details filtered by general master code and isActive.
 *
 * @param masterCode - GeneralMaster code (e.g. "EXMFEETYP" for exam fee types)
 * @returns array of GeneralDetail records
 * @throws AppError on failure
 */
export async function getGeneralDetails(masterCode: string): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': masterCode, isActive: true }),
  )
}

/**
 * Fetches regulations for a given course.
 *
 * @param courseId - the course to filter by
 * @returns array of Regulation records
 * @throws AppError on failure
 */
export async function getRegulations(courseId: number): Promise<Regulation[]> {
  return domainList<Regulation>(
    'Regulation',
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
  )
}

/**
 * Fetches course groups for a given course.
 *
 * @param courseId - the course to filter by
 * @returns array of CourseGroup records
 * @throws AppError on failure
 */
export async function getCourseGroups(courseId: number): Promise<CourseGroup[]> {
  return domainList<CourseGroup>(
    'CourseGroup',
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
  )
}

/**
 * Fetches course years for a given course, ordered by sortOrder ASC.
 *
 * @param courseId - the course to filter by
 * @returns array of CourseYear records
 * @throws AppError on failure
 */
export async function getCourseYears(courseId: number): Promise<CourseYear[]> {
  return domainList<CourseYear>(
    'CourseYear',
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' }),
  )
}

// ─── Exam Master Details ─────────────────────────────────────────────────────

/**
 * Fetches exam master detail rows for a given exam.
 *
 * @param examId - the parent exam master ID
 * @returns array of active ExamMasterDetails records
 * @throws AppError on failure
 */
export async function getExamMasterDetails(examId: number): Promise<ExamMasterDetails[]> {
  return domainList<ExamMasterDetails>(
    'ExamMasterDetails',
    buildQuery({ 'examMaster.examId': examId, isActive: true }),
  )
}

/**
 * Saves all exam master detail rows (creates/updates/soft-deletes).
 *
 * @param details - the full array of ExamMasterDetails to persist
 * @returns the response body from Spring Boot
 * @throws AppError on failure
 */
export async function saveExamMasterDetails(
  details: ExamMasterDetails[],
): Promise<{ statusCode: number; success: boolean; message: string }> {
  const res = await fetch(`/api/proxy/${EXAM_API.SAVE_EXAM_DETAILS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })

  const body = await res.json()

  if (!body.success || body.statusCode !== 200) {
    throw new AppError('API_ERROR', body.message || 'Save failed', body)
  }

  return body
}
