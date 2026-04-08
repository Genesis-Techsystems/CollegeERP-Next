/**
 * Exam Master service — client-side only.
 *
 * Import in 'use client' components:
 *   import { getCollegeFilters, fetchExamsByUniversity } from '@/services/exam-master'
 */

import { EXAM_API, NEXT_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { AppError } from '@/lib/errors'
import { buildQuery, domainList, domainCreate, domainUpdate, getAllRecords, uploadFile } from '@/services/crud'
import type {
  CollegeWiseFilterRow,
  ExamMaster,
  ExamMasterDetails,
  GeneralDetail,
  Regulation,
  CourseGroup,
  CourseYear,
} from '@/types/exam-master'

export interface CollegeFiltersResult {
  filtersData: CollegeWiseFilterRow[]
  academicData: CollegeWiseFilterRow[]
}

export async function getCollegeFilters(orgId: number, empId: number): Promise<CollegeFiltersResult> {
  const data = await getAllRecords<{ result: CollegeWiseFilterRow[][] }>('s_get_collegewisedetails_bycode', {
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
  })

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

export async function fetchExamsByUniversity(universityId: number, courseId: number, academicYearId: number): Promise<ExamMaster[]> {
  return domainList<ExamMaster>(
    ENTITIES.EXAM_MASTER.name,
    buildQuery(
      {
        'Universities.universityId': universityId,
        'Course.courseId': courseId,
        'AcademicYear.academicYearId': academicYearId,
      },
      { field: 'createdDt', direction: 'DESC' }
    )
  )
}

export async function fetchExamsByCollege(collegeId: number, courseId: number, academicYearId: number): Promise<ExamMaster[]> {
  return domainList<ExamMaster>(
    ENTITIES.EXAM_MASTER.name,
    buildQuery(
      {
        'College.collegeId': collegeId,
        'Course.courseId': courseId,
        'AcademicYear.academicYearId': academicYearId,
      },
      { field: 'createdDt', direction: 'DESC' }
    )
  )
}

export async function getExamMasterById(examId: number): Promise<ExamMaster | null> {
  const results = await domainList<ExamMaster>(ENTITIES.EXAM_MASTER.name, buildQuery({ examId }))
  return results[0] ?? null
}

export async function createExamMaster(payload: Record<string, unknown>): Promise<ExamMaster> {
  return domainCreate<ExamMaster>(ENTITIES.EXAM_MASTER.name, payload)
}

export async function updateExamMaster(examId: number, payload: Record<string, unknown>): Promise<ExamMaster> {
  return domainUpdate<ExamMaster>(ENTITIES.EXAM_MASTER.name, ENTITIES.EXAM_MASTER.pk, examId, payload)
}

export async function uploadExamFiles(examId: number, notificationFile: File | null, feeNotificationFile: File | null): Promise<void> {
  if (!notificationFile && !feeNotificationFile) return

  const formData = new FormData()
  formData.append('examId ', String(examId)) // trailing space matches Angular convention
  if (notificationFile) formData.append('notificationFilePath', notificationFile)
  if (feeNotificationFile) formData.append('feeNotificationFilePath', feeNotificationFile)

  await uploadFile(EXAM_API.UPLOAD_EXAM_NOTIFICATION, formData)
}

export async function getGeneralDetails(masterCode: string): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': masterCode, isActive: true })
  )
}

export async function getRegulations(courseId: number): Promise<Regulation[]> {
  return domainList<Regulation>(ENTITIES.REGULATION.name, buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function getCourseGroups(courseId: number): Promise<CourseGroup[]> {
  return domainList<CourseGroup>(ENTITIES.COURSE_GROUP.name, buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function getCourseYears(courseId: number): Promise<CourseYear[]> {
  return domainList<CourseYear>(
    ENTITIES.COURSE_YEAR.name,
    buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' })
  )
}

export async function getExamMasterDetails(examId: number): Promise<ExamMasterDetails[]> {
  return domainList<ExamMasterDetails>(
    ENTITIES.EXAM_MASTER_DETAILS.name,
    buildQuery({ 'examMaster.examId': examId, isActive: true })
  )
}

export async function saveExamMasterDetails(details: ExamMasterDetails[]): Promise<{ statusCode: number; success: boolean; message: string }> {
  const res = await fetch(NEXT_API.PROXY(EXAM_API.SAVE_EXAM_DETAILS), {
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

