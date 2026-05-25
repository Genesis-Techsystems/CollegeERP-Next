import { NEXT_API } from '@/config/constants/api'
import { getAllRecords } from '@/services/crud'

/**
 * Seating Plan services — wrappers over legacy SPs exposed via getAllRecords.
 * Flags are parameterised so we can mirror the old app without hardcoding.
 */

export interface ListRoomsParams {
	courseId: number
	academicYearId: number
	examId: number
	courseYearId?: number
	flag?: string // legacy default can be overridden by caller
	proc?: 's_get_univ_exam_details' | 's_get_exam_filters_bycode' | string
	loginUserEmpId?: number
	loginUserRoleId?: number
}

export async function listRoomsAndCapacities(params: ListRoomsParams): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: params.flag ?? 'clg_exam_rooms', // default flag name used in legacy
		in_flag_type: '',
		in_university_id: String(0),
		in_college_id: String(0),
		in_course_id: String(params.courseId),
		in_course_group_id: String(0),
		in_course_year_id: String(params.courseYearId ?? 0),
		in_academic_year_id: String(params.academicYearId),
		in_exam_id: String(params.examId),
		in_regulation_id: String(0),
		in_subject_id: String(0),
		in_sub_flag_type: '',
		in_loginuser_empid: String(params.loginUserEmpId ?? 0),
		in_loginuser_roleid: String(params.loginUserRoleId ?? 0),
		in_param1: String(0),
		in_param2: '',
	})
	const proc = params.proc ?? 's_get_univ_exam_details'
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/${proc}?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const result = (body?.result ?? body?.data?.result ?? []) as any[]
	if (Array.isArray(result)) {
		const out: any[] = []
		for (const arr of result) if (Array.isArray(arr)) out.push(...arr)
		return out
	}
	return []
}

export interface GenerateSeatingParams {
	courseId: number
	academicYearId: number
	examId: number
	courseYearId: number
	examDate: string // YYYY-MM-DD
	session: 'M' | 'A'
	block?: string
	room?: string
	roomCapacity: number
	allowMix: boolean
	leaveGap: boolean
	flag?: string
	proc?: string
}

export async function generateSeatingPreview(params: GenerateSeatingParams): Promise<any[]> {
	// Mirrors legacy style: use SP with a dedicated flag to compute allocations
	const search = new URLSearchParams({
		in_flag: params.flag ?? 'clg_exam_generate_seating',
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
		in_param1: JSON.stringify({
			examDate: params.examDate,
			session: params.session,
			block: params.block ?? '',
			room: params.room ?? '',
			roomCapacity: params.roomCapacity,
			allowMix: params.allowMix,
			leaveGap: params.leaveGap,
		}),
		in_param2: '',
	})
	const proc = params.proc ?? 's_get_univ_exam_details'
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/${proc}?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const result = (body?.result ?? body?.data?.result ?? []) as any[]
	if (Array.isArray(result)) {
		const out: any[] = []
		for (const arr of result) if (Array.isArray(arr)) out.push(...arr)
		return out
	}
	return []
}

export interface SaveSeatingRequest {
	rows: any[]
}

export async function saveSeatingPlan(req: SaveSeatingRequest): Promise<{ statusCode: number; success: boolean; message: string }> {
	// POST via proxy to legacy save endpoint; path name to be aligned with backend
	const res = await fetch(NEXT_API.PROXY('/saveExamSeatingPlan'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(req.rows),
	})
	const body = await res.json().catch(() => ({ statusCode: 500, success: false, message: 'Unknown error' }))
	return body
}

export async function listExamRoomAllotments(examId: number, examTimetableId: number): Promise<any[]> {
	const query = `examMaster.examId==${examId}.and.ExamTimetable.examTimetableId==${examTimetableId}`
	const res = await fetch(
		NEXT_API.PROXY(`/domain/list/ExamRoomAllotment?size=99999&query=${encodeURIComponent(query)}`),
	)
	const body = await res.json().catch(() => null)
	const rows = (body?.data ?? body?.result ?? body ?? []) as any[]
	return Array.isArray(rows) ? rows : []
}

export async function listExamInvigilationAllotments(examTimetableId: number): Promise<any[]> {
	const query = `ExamTimetable.examTimetableId==${examTimetableId}.and.isActive==true`
	const res = await fetch(
		NEXT_API.PROXY(
			`/domain/list/ExamInvigilationAllotment?size=99999&query=${encodeURIComponent(query)}`,
		),
	)
	const body = await res.json().catch(() => null)
	const rows = (body?.data ?? body?.result ?? body ?? []) as any[]
	return Array.isArray(rows) ? rows : []
}

function flattenResult(body: any): any[] {
	const result = (body?.result ?? body?.data?.result ?? body?.data ?? body ?? []) as any[]
	if (Array.isArray(result)) {
		const out: any[] = []
		for (const arr of result) {
			if (Array.isArray(arr)) out.push(...arr)
			else if (arr && typeof arr === 'object') out.push(arr)
		}
		return out
	}
	return []
}

export async function listRoomwiseOmrStudents(params: {
	examId: number
	courseId: number
	examDate?: string
	sessionId?: number
	collegeId?: number
	roomId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'roomwise_OMR_students',
		in_exam_id: String(params.examId),
		in_college_id: String(params.collegeId ?? 0),
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_room_id: String(params.roomId ?? 0),
		in_std_id: '0',
		in_invgilator_emp_id: '0',
		in_regulation_id: '0',
		from_exam_date: String(params.examDate ?? ''),
		to_exam_date: String(params.examDate ?? ''),
		in_subject_id: '0',
		in_session_id: String(params.sessionId ?? 0),
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_allotment_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * Room-wise allotment summary for the "Room Wise Seating" print. Mirrors the
 * Angular `getProcs()` request with flag = 'roomwise_allotment_summary' on
 * `s_get_exam_allotment_details`. Returns flat rows with at least:
 *   room_name, group_code, min(tssd.hallticket_number), max(tssd.hallticket_number), cnt
 * Caller groups by room_name for the printed table.
 */
export async function getRoomwiseAllotmentSummary(params: {
	courseId: number
	examId: number
	examDate: string
	sessionId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'roomwise_allotment_summary',
		in_college_id: '0',
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_exam_id: String(params.examId),
		in_invgilator_emp_id: '0',
		in_regulation_id: '0',
		in_subject_id: '0',
		in_session_id: String(params.sessionId ?? 0),
		in_std_id: '0',
		in_room_id: '0',
		from_exam_date: params.examDate || '',
		to_exam_date: params.examDate || '',
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_allotment_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * Group-wise allotment summary for the "Group Wise Seating" print. Mirrors
 * Angular `getProcs()` second request (flag = 'groupwise_allotment_summary')
 * on `s_get_exam_allotment_details`. Returns flat rows keyed by subject_name
 * with at least: room_name, group_code, subject_name, subject_code,
 * min(tssd.hallticket_number), max(tssd.hallticket_number), cnt. Caller
 * nests these into `groupedSubjects` ({ subject_name, branches:
 * [{ sno, branch, allocations: [...] }] }).
 */
export async function getGroupwiseAllotmentSummary(params: {
	courseId: number
	examId: number
	examDate: string
	sessionId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'groupwise_allotment_summary',
		in_college_id: '0',
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_exam_id: String(params.examId),
		in_invgilator_emp_id: '0',
		in_regulation_id: '0',
		in_subject_id: '0',
		in_session_id: String(params.sessionId ?? 0),
		in_std_id: '0',
		in_room_id: '0',
		from_exam_date: params.examDate || '',
		to_exam_date: params.examDate || '',
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_allotment_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * ExamInvigilationAllotment rows for a given exam timetable id. Matches the
 * Angular call to /cms/domain/list/ExamInvigilationAllotment used by the
 * "Print Invigilators" page. Returns the rows the print template binds to
 * (roomName, invigilatorEmpName, examDate, sessionStartTime, sessionEndTime).
 */
export async function listExamInvigilationAllotmentsByTimetable(examTimetableId: number): Promise<any[]> {
	if (!examTimetableId) return []
	const search = new URLSearchParams({
		size: '99999',
		query: `ExamTimetable.examTimetableId==${examTimetableId}.and.isActive==true`,
	})
	const res = await fetch(NEXT_API.PROXY(`/domain/list/ExamInvigilationAllotment?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const raw = body?.data?.resultList ?? body?.resultList ?? body?.data ?? body ?? []
	if (Array.isArray(raw)) return raw
	if (raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown }).content)) {
		return (raw as { content: any[] }).content
	}
	return []
}

/**
 * Room-wise subject summary for the "Room Subject Counts" print. Mirrors the
 * Angular `getProcs()` third request (flag = 'roomwise_subject_summary') on
 * `s_get_exam_allotment_details`. Returns flat rows with at least:
 *   room_name, subject_name, subject_code, cnt
 * Caller groups by room_name for the printed table (Angular's
 * `groupedSubjectAllocations`).
 */
export async function getRoomwiseSubjectSummary(params: {
	courseId: number
	examId: number
	examDate: string
	sessionId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'roomwise_subject_summary',
		in_college_id: '0',
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_exam_id: String(params.examId),
		in_invgilator_emp_id: '0',
		in_regulation_id: '0',
		in_subject_id: '0',
		in_session_id: String(params.sessionId ?? 0),
		in_std_id: '0',
		in_room_id: '0',
		from_exam_date: params.examDate || '',
		to_exam_date: params.examDate || '',
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_allotment_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

export async function getExamRoomAllotmentById(examRoomAllotmentId: number): Promise<any | null> {
	if (!examRoomAllotmentId) return null
	const search = new URLSearchParams({
		size: '1',
		query: `examRoomAllotmentId==${examRoomAllotmentId}`,
	})
	const res = await fetch(NEXT_API.PROXY(`/domain/list/ExamRoomAllotment?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const raw = body?.data?.resultList ?? body?.resultList ?? body?.data ?? null
	if (raw == null) return null
	if (Array.isArray(raw)) {
		const row = raw[0]
		return row && typeof row === 'object' ? row : null
	}
	if (typeof raw === 'object') {
		if ('content' in raw && Array.isArray((raw as { content?: unknown }).content)) {
			const chunk = ((raw as { content: unknown[] }).content ?? []) as unknown[]
			const row = chunk[0]
			return row && typeof row === 'object' ? (row as object) : null
		}
		return raw
	}
	return null
}

export async function getSingleDomain(entity: string, idField: string, id: number): Promise<any | null> {
	if (!id) return null
	const search = new URLSearchParams({
		size: '1',
		query: `${idField}==${id}`,
	})
	const res = await fetch(NEXT_API.PROXY(`/domain/list/${entity}?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const rows = body?.data?.resultList ?? body?.resultList ?? body?.data ?? []
	if (!Array.isArray(rows) || rows.length === 0) return null
	return rows[0]
}

export async function listUnivExamFiltersByCode(params?: {
	loginEmpId?: number
	courseId?: number
	examId?: number
	academicYearId?: number
}): Promise<any[]> {
	// Use crud getAllRecords so URLs match the rest of the app (avoids 308 redirect churn)
	// and participate in in-flight dedupe for identical params.
	const data = await getAllRecords<{ result?: any[][] }>('s_get_exam_filters_bycode', {
		in_flag: 'univ_exam_filters',
		in_flag_type: 'ALL',
		in_university_id: 0,
		in_college_id: 0,
		in_course_id: params?.courseId ?? 0,
		in_course_group_id: 0,
		in_course_year_id: 0,
		in_exam_id: params?.examId ?? 0,
		in_academic_year_id: params?.academicYearId ?? 0,
		in_regulation_id: 0,
		in_subject_id: 0,
		in_loginuser_empid: params?.loginEmpId ?? 0,
		in_loginuser_roleid: 0,
		in_sub_flag_type: 'ALL',
		in_param1: 0,
		in_param2: 0,
	})
	return flattenResult(data)
}

export async function listExamStdAttDetails(params: {
	examId: number
	courseId: number
	examTimetableId: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'exam_std_att_details',
		in_exam_id: String(params.examId),
		in_clg_id: '0',
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_regulation_id: '0',
		in_subject_id: '0',
		in_examtype_catdet_id: '0',
		in_std_id: '0',
		in_exam_timetable_id: String(params.examTimetableId),
		in_room_id: '0',
		in_exam_labbatch_id: '0',
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_std_reg_tt_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * Runs the Spring proc that allots students to existing exam rooms for the
 * given exam date + session. Mirrors Angular's
 * `AssignSeatingAllotment()` which calls listByThreeIds on
 * CONSTANTS.seatingAllSessionUrl with (in_exam_id, in_exam_date,
 * in_session_id). Returns the proc rows so the caller can refresh the
 * allotment list afterwards.
 */
export async function assignSeatingAllSession(params: {
	examId: number
	examDate: string
	sessionId: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_exam_id: String(params.examId),
		in_exam_date: String(params.examDate ?? ''),
		in_session_id: String(params.sessionId ?? 0),
	})
	const res = await fetch(
		NEXT_API.PROXY(`/getAllRecords/s_pop_exam_student_seating_all_session?${search.toString()}`),
	)
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * Lists exam-room candidates from the legacy s_get_exam_room_details proc
 * (flag = 'exam_room_allotment') for the Add Room Seating Plan and Copy
 * Existing Seating flows. Each row carries vacancy info plus
 * `pk_exam_room_allotment_id` -- non-null means the room is already
 * allotted for this timetable (Angular disables it in the Add flow and
 * shows it as Existing in the Copy flow).
 */
export async function getExamRoomDetails(params: {
	orgId?: number
	buildingId?: number
	blockId?: number
	floorId?: number
	roomId?: number
	examTimetableId: number
	examId?: number
	academicYearId?: number
	groupSectionId?: number
	empId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'exam_room_allotment',
		in_org_id: String(params.orgId ?? 1),
		in_building_id: String(params.buildingId ?? 0),
		in_block_id: String(params.blockId ?? 0),
		in_floor_id: String(params.floorId ?? 0),
		in_room_id: String(params.roomId ?? 0),
		in_exam_timetable_id: String(params.examTimetableId),
		in_exam_id: String(params.examId ?? 0),
		in_academicYearId: String(params.academicYearId ?? 0),
		in_group_sectionId: String(params.groupSectionId ?? 0),
		in_emp_id: String(params.empId ?? 0),
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_room_details?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenResult(body)
}

/**
 * Copies an existing seating plan from one exam timetable to a list of
 * target timetables. Mirrors Angular's `addExamTable()` on the
 * Existing Allotment page which calls listByTwelveIds on
 * popExamRoomPlanUrl with flag = 'exam_room_allotment_session_copy'.
 */
export async function copyExamRoomAllotmentSessions(params: {
	sourceExamTimetableId: number
	targetExamTimetableIds: string // comma-separated
	orgId?: number
}): Promise<{ ok: boolean; rows: any[]; message?: string }> {
	const search = new URLSearchParams({
		in_flag: 'exam_room_allotment_session_copy',
		in_org_id: String(params.orgId ?? 1),
		in_building_id: '0',
		in_block_id: '0',
		in_floor_id: '0',
		in_room_id: '0',
		in_exam_timetable_id: String(params.sourceExamTimetableId),
		in_exam_id: '0',
		in_academicYearId: '0',
		in_group_sectionId: '0',
		in_emp_id: '0',
		in_target_exam_timetable_id: String(params.targetExamTimetableIds ?? ''),
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_pop_exam_room_plan?${search.toString()}`))
	const body = await res.json().catch(() => null)
	const ok = Boolean(body?.success ?? body?.statusCode === 200)
	return { ok, rows: flattenResult(body), message: body?.message }
}

/**
 * POST a batch of ExamRoomAllotment rows (with nested
 * examRoomStudentAllotmentDTO seating matrix). Used by Add Room Seating
 * Plan. Mirrors Angular's `crudService.add(examRoomAllotmentPostUrl, ...)`.
 */
export async function createExamRoomAllotments(rows: any[]): Promise<{ ok: boolean; message?: string; raw: any }> {
	const res = await fetch(NEXT_API.PROXY('/examroomallotment'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(rows),
	})
	const body = await res.json().catch(() => null)
	const ok = Boolean(body?.success ?? body?.statusCode === 200)
	return { ok, message: body?.message, raw: body }
}
