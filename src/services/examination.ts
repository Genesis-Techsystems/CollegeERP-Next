import { buildQuery, domainCreate, domainList, domainUpdate, getAllRecords, uploadFile } from '@/services/crud'
import { ENTITIES } from '@/config/constants/entities'
import { EXAM_API, NEXT_API } from '@/config/constants/api'
import type {
	CollegeWiseFilterRow,
	ExamMaster,
	ExamMasterDetails,
	GeneralDetail,
	Regulation,
	CourseGroup,
	CourseYear,
} from '@/types/exam-master'
import { GM_CODES } from '@/config/constants/ui'

/** Employee id for `in_loginuser_empid` on exam filter procs (client pages: localStorage + session, same as exam-master). */
export function resolveExamLoginEmpId(sessionEmployeeId?: number | null): number {
	const fromStorage =
		typeof globalThis.localStorage !== 'undefined'
			? Number(globalThis.localStorage.getItem('employeeId') ?? 0)
			: 0
	const fromSession = Number(sessionEmployeeId ?? 0)
	return fromStorage || fromSession || 31754
}

/**
 * Angular `s_get_exam_filters_bycode` with `univ_exam_filters` + `ALL` (initial course / year / exam cascade).
 * Same parameter shape as lab exam timetable filters.
 */
export async function getUnivExamFiltersAll(employeeId: number): Promise<any[]> {
	const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
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
		in_loginuser_empid: employeeId || 0,
		in_loginuser_roleid: 0,
		in_sub_flag_type: 'ALL',
		in_param1: 0,
		in_param2: 0,
	})
	const result = (data?.result ?? []) as any[][]
	return Array.isArray(result) ? result.flat() : []
}

/**
 * Angular exam fee structure (`exam-fee-structure.component.ts` `getFiltersList`):
 * same proc as {@link getUnivExamFiltersAll} but **`in_sub_flag_type: 0`** (not `'ALL'`),
 * and uses the result group whose first row has `flag === 'univ_exam_filters'` (`CollegesListDetails`).
 */
export async function getUnivExamFiltersForExamFeeSetup(employeeId: number): Promise<any[]> {
	const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
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
		in_loginuser_empid: employeeId || 0,
		in_loginuser_roleid: 0,
		in_sub_flag_type: 0,
		in_param1: 0,
		in_param2: 0,
	})
	const groups = (data?.result ?? []) as any[][]
	for (const g of groups) {
		if (!Array.isArray(g) || g.length === 0) continue
		const head = g[0] as Record<string, unknown>
		if (String(head?.flag ?? head?.FLAG ?? '') === 'univ_exam_filters') {
			return [...g]
		}
	}
	return groups.flatMap((g) => (Array.isArray(g) ? g : []))
}

/**
 * Angular `ExamReValuationFeeSetupComponent.selectedExam`: colleges for re-valuation fee
 * after exam is chosen (`univ_exam_rest_in_regexamstd` + group `univ_exam_rest_filters`).
 */
export async function getUnivExamRestCollegesForRevaluationFee(args: {
	employeeId: number
	universityId: number
	courseId: number
	examId: number
	academicYearId: number
}): Promise<any[]> {
	const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
		in_flag: 'univ_exam_rest_in_regexamstd',
		in_flag_type: 'ALL',
		in_university_id: args.universityId,
		in_college_id: 0,
		in_course_id: args.courseId,
		in_course_group_id: 0,
		in_course_year_id: 0,
		in_exam_id: args.examId,
		in_academic_year_id: args.academicYearId,
		in_regulation_id: 0,
		in_subject_id: 0,
		in_loginuser_empid: args.employeeId || 0,
		in_loginuser_roleid: 0,
		in_sub_flag_type: 0,
		in_param1: 0,
		in_param2: 0,
	})
	const groups = (data?.result ?? []) as any[][]
	for (const g of groups) {
		if (!Array.isArray(g) || g.length === 0) continue
		const head = g[0] as Record<string, unknown>
		if (String(head?.flag ?? head?.FLAG ?? '') === 'univ_exam_rest_filters') {
			return g.filter((r) => r && (r as Record<string, unknown>).fk_college_id != null)
		}
	}
	return groups
		.flatMap((g) => (Array.isArray(g) ? g : []))
		.filter((r) => r && (r as Record<string, unknown>).fk_college_id != null)
}

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

export interface MarksSetupFiltersResult {
	filtersData: CollegeWiseFilterRow[]
	regulationData: {
		fk_regulation_id: number
		regulation_code: string
		fk_university_id: number
		fk_course_id: number
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

/**
 * College + regulation filters for Exam Marks Setup page.
 *
 * Mirrors Angular `MarksSetupComponent.getfilterDetails`:
 * - Proc: `s_get_collegewisedetails_bycode`
 * - `filtersData`: group where first row has `flag === 'clg_filters'`
 * - `regulationData`: group where first row has `clg_filters_regulation === 'clg_filters_regulation'`
 */
export async function getMarksSetupFilters(
	orgId: number,
	empId: number,
): Promise<MarksSetupFiltersResult> {
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

	let filtersData: CollegeWiseFilterRow[] = []
	let regulationData: MarksSetupFiltersResult['regulationData'] = []

	for (const arr of data?.result ?? []) {
		if (!Array.isArray(arr) || arr.length === 0) continue
		const head = arr[0] as { flag?: string; clg_filters_regulation?: string }
		if (head.flag === 'clg_filters') {
			filtersData = arr as CollegeWiseFilterRow[]
		} else if (head.clg_filters_regulation === 'clg_filters_regulation') {
			regulationData = arr as MarksSetupFiltersResult['regulationData']
		}
	}

	return { filtersData, regulationData }
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
	const where: Record<string, string | number | boolean> = {}
	if (filters?.courseId) where['Course.courseId'] = filters.courseId
	if (filters?.regulationId) where['Regulation.regulationId'] = filters.regulationId
	// Spring Boot entity field is `disabled` (Angular form calls it `isForDisabled`)
	if (filters?.isForDisabled !== undefined) where.disabled = filters.isForDisabled

	// Mirror Angular API query shape exactly for this screen.
	const hasAny = Object.keys(where).length > 0
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

export async function getExamFeeStructure(id: number) {
	const rows = await domainList(
		ENTITIES.EXAM_FEE_STRUCTURE.name,
		buildQuery({ [ENTITIES.EXAM_FEE_STRUCTURE.pk]: id }),
	)
	return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

// ──────────────────────────────────────────────────────────────────────────────
// Reference data for Exam Master Details
// ──────────────────────────────────────────────────────────────────────────────

export async function listGeneralDetailsByMaster(code: string) {
	return domainList<GeneralDetail>(ENTITIES.GENERAL_DETAIL.name, buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }))
}

/** GeneralMaster exam fee types — `GeneralDetail` filtered by {@link GM_CODES.EXAM_FEE_TYPE}. */
export async function listExamFeeTypeGeneralDetails(): Promise<GeneralDetail[]> {
	return listGeneralDetailsByMaster(GM_CODES.EXAM_FEE_TYPE)
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
	if (body && typeof body === 'object' && 'data' in body) {
		return (body as { data?: unknown }).data
	}
	return body
}

/**
 * Branches/groups before timetable rows — `univ_exam_rest_no_tt` → `univ_exam_rest_filters` group.
 */
export async function getExamFiltersNoTimetable(params: {
	courseId: number
	examId: number
	academicYearId: number
	courseYearId?: number
	employeeId?: number
}): Promise<any[]> {
	const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
		in_flag: 'univ_exam_rest_no_tt',
		in_flag_type: 'ALL',
		in_university_id: 0,
		in_college_id: 0,
		in_course_id: params.courseId,
		in_course_group_id: 0,
		in_course_year_id: params.courseYearId ?? 0,
		in_exam_id: params.examId,
		in_academic_year_id: params.academicYearId,
		in_regulation_id: 0,
		in_subject_id: 0,
		in_loginuser_empid: params.employeeId ?? 0,
		in_loginuser_roleid: 0,
		in_sub_flag_type: 'ALL',
		in_param1: 0,
		in_param2: 0,
	})
	const groups = data?.result ?? []
	const rest = groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? []
	if (Array.isArray(rest) && rest.length > 0) return rest
	const out: any[] = []
	for (const arr of groups) if (Array.isArray(arr)) out.push(...arr)
	return out
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
  employeeId?: number
}): Promise<any[]> {
  const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_in_regexamstd',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId ?? 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId ?? 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  const picked =
    groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ??
    groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_regexamstd') ??
    []
  if (Array.isArray(picked) && picked.length > 0) return picked
  const out: any[] = []
  for (const arr of groups) if (Array.isArray(arr)) out.push(...arr)
  return out
}

/**
 * Subjects using s_get_univ_exam_details with flag=clg_exam_subject_filters
 */
export async function getUnivExamSubjectFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  courseYearId: number
  employeeId?: number
}): Promise<any[]> {
  const data = await getAllRecords<{ result?: any[][] }>('s_get_univ_exam_details', {
    in_flag: 'clg_exam_subject_filters',
    in_flag_type: '',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId,
    in_academic_year_id: params.academicYearId,
    in_exam_id: params.examId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_sub_flag_type: '',
    in_loginuser_empid: params.employeeId ?? 0,
    in_loginuser_roleid: 0,
    in_param1: 0,
    in_param2: '',
  })
  const result = (data?.result ?? []) as any[][]
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
