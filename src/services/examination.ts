import { buildQuery, domainCreate, domainList, domainUpdate, uploadFile } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import { EXAM_API, NEXT_API } from '@/config/constants/api'
import type { ExamMaster, ExamMasterDetails, GeneralDetail, Regulation, CourseGroup, CourseYear } from '@/types/exam-master'
import { GM_CODES } from '@/config/constants/ui'

// ──────────────────────────────────────────────────────────────────────────────
// College filters (University → Course → Regulation) used across exam pages
// ──────────────────────────────────────────────────────────────────────────────

export interface CollegeFiltersResult {
	filtersData: {
		fk_university_id: number
		university_name: string
		fk_course_id: number
		course_name: string
	}[]
	academicData: {
		fk_university_id: number
		fk_academic_year_id?: number
		academic_year?: string
		is_curr_ay?: number
	}[]
}

export async function getCollegeFilters(orgId: number, empId: number): Promise<CollegeFiltersResult> {
	// Using getAllRecords via crud.ts helper; inline import to avoid circulars
	const { getAllRecords } = await import('@/services/crud')
	const data = await getAllRecords<{ result: any[][] }>('s_get_collegewisedetails_bycode', {
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

	let filtersData: CollegeFiltersResult['filtersData'] = []
	let academicData: CollegeFiltersResult['academicData'] = []

	for (const arr of data?.result ?? []) {
		if (arr.length > 0) {
			if (arr[0].flag === 'clg_filters') filtersData = arr as any
			if (arr[0].clg_filters_ay === 'clg_filters_ay') academicData = arr as any
		}
	}

	return { filtersData, academicData }
}

// ──────────────────────────────────────────────────────────────────────────────
// Exam Sessions
// ──────────────────────────────────────────────────────────────────────────────

export async function listExamSessions() {
	return domainList(ENTITIES.EXAM_SESSION.name)
}

export async function createExamSession(payload: Record<string, unknown>) {
	return domainCreate(ENTITIES.EXAM_SESSION.name, payload)
}

export async function updateExamSession(id: number, payload: Record<string, unknown>) {
	return domainUpdate(ENTITIES.EXAM_SESSION.name, ENTITIES.EXAM_SESSION.pk, id, payload)
}

// ──────────────────────────────────────────────────────────────────────────────
// Grades
// ──────────────────────────────────────────────────────────────────────────────

export async function listExamGrades(filters?: { courseId?: number; regulationId?: number; isForDisabled?: boolean }) {
	const where: Record<string, string | number | boolean> = { isActive: true }
	if (filters?.courseId) where['Course.courseId'] = filters.courseId
	if (filters?.regulationId) where['Regulation.regulationId'] = filters.regulationId
	// Spring Boot entity field is `disabled` (Angular form calls it `isForDisabled`)
	if (filters?.isForDisabled !== undefined) where.disabled = filters.isForDisabled

	// If no filters passed, list all (legacy behavior)
	const hasAny = Object.keys(where).length > 1 || filters?.isForDisabled !== undefined
	return domainList(ENTITIES.EXAM_GRADE.name, hasAny ? buildQuery(where) : undefined)
}

export async function createExamGrade(payload: Record<string, unknown>) {
	return domainCreate(ENTITIES.EXAM_GRADE.name, payload)
}

export async function updateExamGrade(id: number, payload: Record<string, unknown>) {
	return domainUpdate(ENTITIES.EXAM_GRADE.name, ENTITIES.EXAM_GRADE.pk, id, payload)
}

// ──────────────────────────────────────────────────────────────────────────────
// Exam Masters
// ──────────────────────────────────────────────────────────────────────────────

export async function listExamMasters(query?: string) {
	return domainList<ExamMaster>(ENTITIES.EXAM_MASTER.name, query)
}

export async function createExamMasterSvc(payload: Record<string, unknown>) {
	return domainCreate<ExamMaster>(ENTITIES.EXAM_MASTER.name, payload)
}

export async function updateExamMasterSvc(examId: number, payload: Record<string, unknown>) {
	return domainUpdate<ExamMaster>(ENTITIES.EXAM_MASTER.name, ENTITIES.EXAM_MASTER.pk, examId, payload)
}

export async function uploadExamNotificationFiles(
	examId: number,
	notificationFile: File | null,
	feeNotificationFile: File | null,
) {
	if (!notificationFile && !feeNotificationFile) return
	const fd = new FormData()
	fd.append('examId ', String(examId)) // trailing space per legacy convention
	if (notificationFile) fd.append('notificationFilePath', notificationFile)
	if (feeNotificationFile) fd.append('feeNotificationFilePath', feeNotificationFile)
	await uploadFile(EXAM_API.UPLOAD_EXAM_NOTIFICATION, fd)
}

// ──────────────────────────────────────────────────────────────────────────────
// Fee Structure
// ──────────────────────────────────────────────────────────────────────────────

export async function listExamFeeStructures(query?: string) {
	return domainList(ENTITIES.EXAM_FEE_STRUCTURE.name, query)
}

export async function createExamFeeStructure(payload: Record<string, unknown>) {
	return domainCreate(ENTITIES.EXAM_FEE_STRUCTURE.name, payload)
}

export async function updateExamFeeStructure(id: number, payload: Record<string, unknown>) {
	return domainUpdate(ENTITIES.EXAM_FEE_STRUCTURE.name, ENTITIES.EXAM_FEE_STRUCTURE.pk, id, payload)
}

// ──────────────────────────────────────────────────────────────────────────────
// Reference data for Exam Master Details
// ──────────────────────────────────────────────────────────────────────────────

export async function listGeneralDetailsByMaster(code: string) {
	return domainList<GeneralDetail>(ENTITIES.GENERAL_DETAIL.name, buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }))
}

export async function listRegulations(courseId: number) {
	return domainList<Regulation>(ENTITIES.REGULATION.name, buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function listCourseGroups(courseId: number) {
	return domainList<CourseGroup>(ENTITIES.COURSE_GROUP.name, buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function listCourseYears(courseId: number) {
	return domainList<CourseYear>(ENTITIES.COURSE_YEAR.name, buildQuery({ 'Course.courseId': courseId, isActive: true }))
}

export async function listExamMasterDetails(examId: number) {
	return domainList<ExamMasterDetails>(ENTITIES.EXAM_MASTER_DETAILS.name, buildQuery({ 'examMaster.examId': examId, isActive: true }))
}

// ──────────────────────────────────────────────────────────────────────────────
// Exam Timetable (display DTO)
// ──────────────────────────────────────────────────────────────────────────────

/** Returns the denormalised timetable display rows for an exam/course year. */
export async function getExamTimetableDetails(courseYearId: number, courseId: number, examId: number): Promise<any> {
	const { EXAM_API, NEXT_API } = await import('@/config/constants/api')
	const res = await fetch(NEXT_API.PROXY(`${EXAM_API.EXAM_TIMETABLE_DETAILS}?courseYearId=${courseYearId}&courseId=${courseId}&examId=${examId}`))
	const body = await res.json().catch(() => null)
	// API wraps rows under .data — return rows array directly
	return (body && typeof body === 'object' && 'data' in body) ? (body as any).data : body
}

/**
 * Fetches exam filters for timetable (no existing timetable) using s_get_exam_filters_bycode
 * with in_flag=univ_exam_rest_no_tt. Returns a flattened array of rows.
 */
export async function getExamFiltersNoTimetable(params: {
	courseId: number
	examId: number
	academicYearId: number
	courseYearId?: number
}): Promise<any[]> {
	const { NEXT_API } = await import('@/config/constants/api')
	const search = new URLSearchParams({
		in_flag: 'univ_exam_rest_no_tt',
		in_flag_type: 'ALL',
		in_university_id: String(0),
		in_college_id: String(0),
		in_course_id: String(params.courseId),
		in_course_group_id: String(0),
		in_course_year_id: String(params.courseYearId ?? 0),
		in_exam_id: String(params.examId),
		in_academic_year_id: String(params.academicYearId),
		in_regulation_id: String(0),
		in_subject_id: String(0),
		in_loginuser_empid: String(0),
		in_loginuser_roleid: String(0),
		in_sub_flag_type: 'ALL',
		in_param1: String(0),
		in_param2: String(0),
	})
	const url = `/getAllRecords/s_get_exam_filters_bycode?${search.toString()}`
	const res = await fetch(NEXT_API.PROXY(url))
	const body = await res.json().catch(() => null)
	// body?.data?.result is commonly an array of arrays; flatten
	const result = (body?.result ?? body?.data?.result ?? []) as any[]
	if (Array.isArray(result)) {
		const out: any[] = []
		for (const arr of result) if (Array.isArray(arr)) out.push(...arr)
		return out
	}
	return []
}

/**
 * Fetch subjects for an exam using s_get_exam_filters_bycode with flag 'univ_exam_rest_in_regexamstd'.
 * Returns flattened rows; caller should map subjectCode/subjectName safely.
 */
export async function getExamSubjectsForSchedule(params: {
  courseId: number
  examId: number
  academicYearId: number
  courseYearId?: number
}): Promise<any[]> {
  const { NEXT_API } = await import('@/config/constants/api')
  const search = new URLSearchParams({
    in_flag: 'univ_exam_rest_in_regexamstd',
    in_flag_type: 'ALL',
    in_university_id: String(0),
    in_college_id: String(0),
    in_course_id: String(params.courseId),
    in_course_group_id: String(0),
    in_course_year_id: String(params.courseYearId ?? 0),
    in_exam_id: String(params.examId),
    in_academic_year_id: String(params.academicYearId),
    in_regulation_id: String(0),
    in_subject_id: String(0),
    in_loginuser_empid: String(0),
    in_loginuser_roleid: String(0),
    in_sub_flag_type: String(0),
    in_param1: String(0),
    in_param2: String(0),
  })
  const url = `/getAllRecords/s_get_exam_filters_bycode?${search.toString()}`
  const res = await fetch(NEXT_API.PROXY(url))
  const body = await res.json().catch(() => null)
  const result = (body?.result ?? body?.data?.result ?? []) as any[]
  if (Array.isArray(result)) {
    const out: any[] = []
    for (const arr of result) if (Array.isArray(arr)) out.push(...arr)
    return out
  }
  return []
}

/**
 * Subjects using s_get_univ_exam_details with flag=clg_exam_subject_filters
 */
export async function getUnivExamSubjectFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  courseYearId: number
}): Promise<any[]> {
  const { NEXT_API } = await import('@/config/constants/api')
  const search = new URLSearchParams({
    in_flag: 'clg_exam_subject_filters',
    in_flag_type: '',
    in_university_id: String(0),
    in_college_id: String(0),
    in_course_id: String(params.courseId),
    in_course_group_id: String(0),
    in_course_year_id: String(params.courseYearId),
    in_academic_year_id: String(params.academicYearId),
    in_exam_id: String(params.examId),
    in_regulation_id: String(0),
    in_subject_id: String(0),
    in_sub_flag_type: '',
    in_loginuser_empid: String(0),
    in_loginuser_roleid: String(0),
    in_param1: String(0),
    in_param2: '',
  })
  const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_univ_exam_details?${search.toString()}`))
  const body = await res.json().catch(() => null)
  const result = (body?.result ?? body?.data?.result ?? []) as any[]
  if (Array.isArray(result)) {
    const out: any[] = []
    for (const arr of result) if (Array.isArray(arr)) out.push(...arr)
    return out
  }
  return []
}

// ──────────────────────────────────────────────────────────────────────────────
// Exam Marks Setup (list by course/regulation/disabled)
// ──────────────────────────────────────────────────────────────────────────────

export async function listExamMarksSetup(courseId: number, regulationId: number, disabled: boolean) {
	return domainList(
		ENTITIES.EXAM_MARKS_SETUP.name,
		buildQuery(
			{
				'Course.courseId': courseId,
				'Regulation.regulationId': regulationId,
				disabled,
				isActive: true,
			},
			{ field: 'marksSetupId', direction: 'DESC' },
		),
	)
}

export async function listSubjectCategories(): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': GM_CODES.SUBJECT_CATEGORY, isActive: true }),
  )
}

export async function saveExamMarksSetup(rows: any[]): Promise<{ statusCode: number; success: boolean; message: string }> {
  const res = await fetch(NEXT_API.PROXY(EXAM_API.SAVE_EXAM_MARKS_SETUP), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  const body = await res.json()
  return body
}

// ──────────────────────────────────────────────────────────────────────────────
// Exam Timetable — Save entries
// ──────────────────────────────────────────────────────────────────────────────

export async function saveExamTimetable(rows: any[]): Promise<{ statusCode: number; success: boolean; message: string }> {
  const { NEXT_API, EXAM_API } = await import('@/config/constants/api')
  const res = await fetch(NEXT_API.PROXY(EXAM_API.SAVE_EXAM_TIMETABLE), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  })
  const body = await res.json()
  return body
}
