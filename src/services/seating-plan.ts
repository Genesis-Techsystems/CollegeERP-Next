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
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'roomwise_OMR_students',
		in_exam_id: String(params.examId),
		in_college_id: '0',
		in_course_id: String(params.courseId),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_room_id: '0',
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
