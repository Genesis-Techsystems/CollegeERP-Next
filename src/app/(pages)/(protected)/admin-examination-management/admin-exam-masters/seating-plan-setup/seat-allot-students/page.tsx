'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	listExamStdAttDetails,
	listRoomwiseOmrStudents,
	getExamRoomAllotmentById,
	getSingleDomain,
	createExamRoomAllotments,
	listUnivExamFiltersByCode,
	listExamStudentsForSeatAllotment,
	listBulkAllotmentStudents,
} from '@/services/seating-plan'
import { listCourseGroups, listCourseYears, listGeneralDetailsByMaster } from '@/services/examination'
import { GM_CODES } from '@/config/constants/ui'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { usePrintMode } from '@/lib/print'
import { useCollegeLogo } from '@/hooks/useCollegeLogo'
import { SeatAllotmentModal, type SeatAllotmentResult } from '@/app/(pages)/(protected)/admin-examination-management/_components/SeatAllotmentModal'
import {
	ExamSeatChairFilledIcon,
	ExamSeatChairOutlineIcon,
	ExamSeatPersonIcon,
} from '@/app/(pages)/(protected)/admin-examination-management/_components/ExamSeatIcons'
import { toast } from 'sonner'
import { Select } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toDateStr, toExamApiDate } from '@/common/generic-functions'

type BulkStudentRow = Record<string, any> & { checked: boolean }

function flattenLegacyResult(body: any): any[] {
	const result = (body?.result ?? body?.data?.result ?? body?.data ?? body ?? []) as any[]
	if (!Array.isArray(result)) return []
	const out: any[] = []
	for (const arr of result) {
		if (Array.isArray(arr)) out.push(...arr)
		else if (arr && typeof arr === 'object') out.push(arr)
	}
	return out
}

async function fetchExamStdAttDetails(params: {
	examId: number
	courseId: number
	examTimetableId: number
}): Promise<any[]> {
	return listExamStdAttDetails(params)
}

async function fetchRoomwiseOmrStudents(params: {
	examId: number
	courseId: number
	examDate: string
	sessionId: number
	collegeId?: number
	roomId?: number
}): Promise<any[]> {
	return listRoomwiseOmrStudents(params)
}

async function fetchExamRoomAllotmentById(examRoomAllotmentId: number): Promise<any | null> {
	return getExamRoomAllotmentById(examRoomAllotmentId)
}

async function fetchSingleDomain(entity: string, idField: string, id: number): Promise<any | null> {
	return getSingleDomain(entity, idField, id)
}

function num(v: unknown): number {
	const n = Number(v ?? 0)
	return Number.isFinite(n) ? n : 0
}

function pick<T = unknown>(obj: any, keys: string[], fallback: T): T {
	for (const key of keys) {
		const value = obj?.[key]
		if (value !== undefined && value !== null && value !== '') return value as T
	}
	return fallback
}

/** Domain list payloads sometimes wrap the allotment in arrays or omit row/col totals; infer grid from coordinates when needed. */
function unwrapExamRoomAllotRecord(raw: any): any | null {
	if (raw == null || raw === '') return null
	if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : null
	if (typeof raw === 'object' && raw.examRoomAllotment != null && Array.isArray(raw.examRoomAllotment)) {
		const a = raw.examRoomAllotment
		return a.length > 0 ? a[0] : null
	}
	return raw
}

function examRoomSeatDto(allotment: any): any[] {
	if (!allotment || typeof allotment !== 'object') return []
	const dto =
		allotment.examRoomStudentAllotmentDTO ??
		allotment.examRoomStudentAllotments ??
		allotment.exam_room_student_allotment_dto ??
		allotment.exam_room_student_allotment
	const list = Array.isArray(dto) ? dto : []
	return list
}

const ROW_DIM_KEYS = [
	'totalRows',
	'total_rows',
	'total_row',
	'rows_count',
	'rowCount',
	'noOfRows',
	'no_of_rows',
	'Rows',
]
const COL_DIM_KEYS = [
	'totalColumns',
	'total_columns',
	'total_cols',
	'cols_count',
	'columnCount',
	'columns_count',
	'noOfColumns',
	'no_of_columns',
	'Columns',
]

function maxSeatRowCol(rows: any[]): { maxRow: number; maxCol: number } {
	let maxRow = 0
	let maxCol = 0
	for (const r of rows) {
		const rn = num(pick(r, ['rowNo', 'row_no', 'rowNO', 'row'], 0))
		const cn = num(pick(r, ['columnNo', 'column_no', 'columnNO', 'colNo', 'col_no', 'column'], 0))
		if (rn > maxRow) maxRow = rn
		if (cn > maxCol) maxCol = cn
	}
	return { maxRow, maxCol }
}

type SeatCell = {
	key: string
	rowNo: number
	columnNo: number
	serial: string
	examRoomStdAllotId: number | null
	collegeId: number
	examId: number
	examTimetableId: number
	roomId: number
	examseatstatusCatId: number
	studentId: number | null
	subjectId: number | null
	stdName: string
	hallticketNumber: string
	subjectCode: string
	examSeatStatusCode: string
	examDisplaySeatStatusCode: string
	createdDt: string | null
	isActive: boolean
}

function availableStatusId(statuses: any[]): number {
	const row =
		statuses.find((s) => String(s.generalDetailCode ?? '').toLowerCase() === 'available') ??
		statuses[0]
	return Number(row?.generalDetailId ?? 0)
}

function buildSeatCells(
	allotment: any,
	examSeatStatuses: any[],
	ids: {
		collegeId: number
		examId: number
		examTimetableId: number
		roomId: number
	},
): SeatCell[] {
	const totalRows = num(pick(allotment, ROW_DIM_KEYS, 0))
	const totalCols = num(pick(allotment, COL_DIM_KEYS, 0))
	if (!totalRows || !totalCols) return []

	const inferred = maxSeatRowCol(examRoomSeatDto(allotment))
	const rows = totalRows || inferred.maxRow
	const cols = totalCols || inferred.maxCol
	const defaultStatusId = availableStatusId(examSeatStatuses)
	const defaultStatus = examSeatStatuses.find((s) => Number(s.generalDetailId) === defaultStatusId)
	const defaultCode = String(defaultStatus?.generalDetailCode ?? 'Available')
	const defaultLabel = String(defaultStatus?.generalDetailDisplayName ?? defaultStatus?.generalDetailName ?? 'Available')

	const seatByCell = new Map<string, any>()
	for (const item of examRoomSeatDto(allotment)) {
		const rowNo = num(pick(item, ['rowNo', 'row_no', 'rowNO', 'row'], 0))
		const colNo = num(pick(item, ['columnNo', 'column_no', 'columnNO', 'colNo', 'col_no', 'column'], 0))
		if (!rowNo || !colNo) continue
		seatByCell.set(`${rowNo}-${colNo}`, item)
	}

	let serial = 1
	const serialMap = new Map<string, string>()
	for (let col = 1; col <= cols; col++) {
		const rowOrder = Array.from({ length: rows }, (_, i) => i + 1)
		if (col % 2 === 0) rowOrder.reverse()
		for (const row of rowOrder) {
			serialMap.set(`${row}-${col}`, `S${serial++}`)
		}
	}

	const cells: SeatCell[] = []
	for (let rowNo = 1; rowNo <= rows; rowNo++) {
		for (let columnNo = 1; columnNo <= cols; columnNo++) {
			const key = `${rowNo}-${columnNo}`
			const seat = seatByCell.get(key) ?? {}
			const statusCode = String(
				pick(seat, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status', 'exam_display_seat_status_code'], defaultCode),
			)
			const statusRow =
				examSeatStatuses.find((s) => String(s.generalDetailCode) === statusCode) ??
				examSeatStatuses.find((s) => Number(s.generalDetailId) === num(pick(seat, ['examseatstatusCatId', 'examseatstatus_cat_id'], 0)))
			cells.push({
				key,
				rowNo,
				columnNo,
				serial: serialMap.get(key) ?? '',
				examRoomStdAllotId: num(pick(seat, ['examRoomStdAllotId', 'exam_room_std_allot_id', 'pk_exam_room_std_allot_id'], 0)) || null,
				collegeId: ids.collegeId,
				examId: ids.examId,
				examTimetableId: ids.examTimetableId,
				roomId: ids.roomId,
				examseatstatusCatId: num(pick(seat, ['examseatstatusCatId', 'examseatstatus_cat_id'], statusRow?.generalDetailId ?? defaultStatusId)),
				studentId: num(pick(seat, ['studentId', 'student_id', 'fk_student_id'], 0)) || null,
				subjectId: num(pick(seat, ['subjectId', 'subject_id', 'fk_subject_id'], 0)) || null,
				stdName: String(pick(seat, ['stdName', 'student_name', 'firstName', 'first_name'], '')),
				hallticketNumber: String(pick(seat, ['hallticketNumber', 'hallticket_number', 'rollNumber', 'roll_number'], '')),
				subjectCode: String(pick(seat, ['subjectCode', 'subject_code', 'shortName', 'short_name'], '')),
				examSeatStatusCode: statusCode || defaultCode,
				examDisplaySeatStatusCode: String(
					pick(seat, ['examDisplaySeatStatusCode', 'examseatstatusCatDisplayName', 'exam_display_seat_status_code'], statusRow?.generalDetailDisplayName ?? defaultLabel),
				),
				createdDt: pick(seat, ['createdDt', 'created_dt'], null) as string | null,
				isActive: pick(seat, ['isActive', 'is_active'], true) as boolean,
			})
		}
	}
	return cells
}

function seatCounts(cells: SeatCell[]) {
	let blocked = 0
	let booked = 0
	let available = 0
	for (const cell of cells) {
		const code = cell.examSeatStatusCode.toLowerCase()
		if (code === 'available') available++
		else if (code === 'booked') booked++
		else blocked++
	}
	return { blocked, booked, available }
}

type PrintMode = 'seating' | 'attendance' | 'stickers' | 'groupwise-stickers'

export default function SeatAllotStudentsPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { mode: printMode, triggerPrint } = usePrintMode<PrintMode>()
	const [attendanceRows, setAttendanceRows] = useState<any[]>([])
	const [seatRows, setSeatRows] = useState<any[]>([])
	const [roomAllotment, setRoomAllotment] = useState<any | null>(null)
	const [resolvedCourse, setResolvedCourse] = useState('')
	const [resolvedAcademicYear, setResolvedAcademicYear] = useState('')
	const [resolvedCollegeCode, setResolvedCollegeCode] = useState('')
	const [scheduleMeta, setScheduleMeta] = useState({
		collegeCode: '',
		academicYear: '',
		courseCode: '',
	})
	const [loading, setLoading] = useState(false)
	const [savingSeat, setSavingSeat] = useState(false)
	const [mode, setMode] = useState<'student' | 'bulk'>('student')
	const [bulkCourseGroups, setBulkCourseGroups] = useState<any[]>([])
	const [bulkCourseYears, setBulkCourseYears] = useState<any[]>([])
	const [bulkCourseGroupId, setBulkCourseGroupId] = useState<string>('')
	const [bulkCourseYearId, setBulkCourseYearId] = useState<string>('')
	const [bulkStudents, setBulkStudents] = useState<BulkStudentRow[]>([])
	const [bulkCheckAll, setBulkCheckAll] = useState(true)
	const [bulkSearch, setBulkSearch] = useState('')
	const [bulkSelectedSearch, setBulkSelectedSearch] = useState('')
	const [loadingBulkStudents, setLoadingBulkStudents] = useState(false)
	const [savingBulk, setSavingBulk] = useState(false)
	const [examSeatStatuses, setExamSeatStatuses] = useState<any[]>([])
	const [seatCells, setSeatCells] = useState<SeatCell[]>([])
	const [selectedSeat, setSelectedSeat] = useState<SeatCell | null>(null)
	const [seatModalOpen, setSeatModalOpen] = useState(false)
	const [modalStudents, setModalStudents] = useState<any[]>([])
	const [modalStudentsLoading, setModalStudentsLoading] = useState(false)
	const [examFilterIds, setExamFilterIds] = useState({
		collegeId: 0,
		courseId: 0,
		examId: 0,
	})
	const [resolvedAllotmentIds, setResolvedAllotmentIds] = useState({
		collegeId: 0,
		courseId: 0,
		examId: 0,
		examDate: '',
	})

	const details = useMemo(
		() => ({
			examId: searchParams?.get('examId') ?? '',
			courseId: searchParams?.get('courseId') ?? '',
			collegeId: searchParams?.get('collegeId') ?? '',
			examTimetableId: searchParams?.get('examTimetableId') ?? '',
			sessionId: searchParams?.get('sessionId') ?? '',
			examRoomAllotmentId: searchParams?.get('examRoomAllotmentId') ?? '',
			examDate: searchParams?.get('examDate') ?? '',
			examSession: searchParams?.get('examSession') ?? '',
			roomCode: searchParams?.get('roomCode') ?? '',
			courseName: searchParams?.get('courseName') ?? '',
			courseCode: searchParams?.get('courseCode') ?? '',
			academicYear: searchParams?.get('academicYear') ?? '',
			examName: searchParams?.get('examName') ?? '',
			examType: searchParams?.get('examType') ?? '',
		}),
		[searchParams]
	)

	// Dynamic selected-college logo for the print header (Angular: MINIO + Logo).
	const collegeLogo = useCollegeLogo(Number(details.collegeId) || null)

	useEffect(() => {
		listGeneralDetailsByMaster(GM_CODES.EXAM_SEAT_STATUS)
			.then((rows) => setExamSeatStatuses(Array.isArray(rows) ? rows : []))
			.catch(() => setExamSeatStatuses([]))
	}, [])

	async function reloadRoomAllotment() {
		const routeExamId = Number(details.examId || 0)
		const routeCourseId = Number(details.courseId || 0)
		const routeExamTimetableId = Number(details.examTimetableId || 0)
		const routeSessionId = Number(details.sessionId || 0)
		const examRoomAllotmentId = Number(details.examRoomAllotmentId || 0)
		if (!routeExamId && !examRoomAllotmentId) {
			setAttendanceRows([])
			setSeatRows([])
			setRoomAllotment(null)
			setSeatCells([])
			return
		}
		setLoading(true)
		try {
			const allotmentData = await fetchExamRoomAllotmentById(examRoomAllotmentId)
			const allotment = unwrapExamRoomAllotRecord(allotmentData)
			const examId = routeExamId || num(pick(allotment, ['examId', 'fk_exam_id', 'exam_id'], 0))
			const courseId =
				routeCourseId ||
				num(
					pick(
						allotment,
						['courseId', 'fk_course_id', 'course_id', 'Course.courseId', 'Course.course_id'],
						0,
					),
				)
			const examTimetableId =
				routeExamTimetableId ||
				num(
					pick(
						allotment,
						[
							'examTimetableId',
							'fk_exam_timetable_id',
							'exam_timetable_id',
							'ExamTimetable.examTimetableId',
							'ExamTimetable.exam_timetable_id',
						],
						0,
					),
				)
			const sessionId =
				routeSessionId ||
				num(pick(allotment, ['examSessionId', 'fk_exam_session_id', 'sessionId', 'exam_session_id'], 0))
			const examDate = details.examDate || String(pick(allotment, ['examDate', 'exam_date'], ''))
			const collegeId =
				Number(details.collegeId || 0) ||
				num(pick(allotment, ['collegeId', 'fk_college_id', 'college_id', 'College.collegeId', 'College.college_id'], 0))
			const roomId = num(
				pick(
					allotment,
					['roomId', 'fk_room_id', 'room_id', 'examRoomId', 'fk_exam_room_id', 'exam_room_id', 'ExamRoom.examRoomId', 'Room.roomId'],
					0,
				),
			)

			const [attData, seatsData] = await Promise.all([
				examId > 0 && courseId > 0 && examTimetableId > 0
					? fetchExamStdAttDetails({ examId, courseId, examTimetableId })
					: Promise.resolve([]),
				examId > 0
					? fetchRoomwiseOmrStudents({
							examId,
							courseId,
							examDate,
							sessionId,
							collegeId,
							roomId,
						})
					: Promise.resolve([]),
			])
			setAttendanceRows(Array.isArray(attData) ? attData : [])
			setSeatRows(Array.isArray(seatsData) ? seatsData : [])
			setRoomAllotment(allotment)
			setResolvedAllotmentIds({
				collegeId,
				courseId,
				examId,
				examDate: toExamApiDate(examDate),
			})
			if (allotment && examSeatStatuses.length > 0) {
				setSeatCells(
					buildSeatCells(allotment, examSeatStatuses, {
						collegeId,
						examId,
						examTimetableId,
						roomId,
					}),
				)
			}

			const ayId = Number(searchParams?.get('academicYearId') || 0)
			const filterRows = await listUnivExamFiltersByCode({
				courseId: courseId || undefined,
				examId: examId || undefined,
				academicYearId: ayId || undefined,
			}).catch(() => [])
			const filterRow =
				filterRows.find((r) => num(r.fk_course_id) === courseId) ??
				filterRows.find((r) => num(r.fk_exam_id) === examId) ??
				filterRows[0]
			if (filterRow) {
				setExamFilterIds({
					collegeId:
						collegeId ||
						num(filterRow.fk_college_id ?? filterRow.college_id ?? filterRow.collegeId),
					courseId:
						courseId ||
						num(filterRow.fk_course_id ?? filterRow.course_id ?? filterRow.courseId),
					examId:
						examId || num(filterRow.fk_exam_id ?? filterRow.exam_id ?? filterRow.examId),
				})
				setScheduleMeta({
					collegeCode: String(
						filterRow.college_code ??
						filterRow.collegeCode ??
						pick(allotment, ['college_code', 'collegeCode', 'College.collegeCode'], ''),
					),
					academicYear: String(filterRow.academic_year ?? filterRow.academicYear ?? '')
						.replace(/\s*-\s*/g, '-'),
					courseCode: String(filterRow.course_code ?? filterRow.courseCode ?? ''),
				})
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		void reloadRoomAllotment()
	}, [details.examId, details.courseId, details.examTimetableId, details.examDate, details.sessionId, details.examRoomAllotmentId, examSeatStatuses.length])

	const allotmentContext = useMemo(() => {
		const collegeId =
			Number(details.collegeId || 0) ||
			examFilterIds.collegeId ||
			resolvedAllotmentIds.collegeId ||
			seatCells[0]?.collegeId ||
			num(pick(roomAllotment, ['collegeId', 'fk_college_id', 'college_id'], 0))
		const courseId =
			Number(details.courseId || 0) ||
			examFilterIds.courseId ||
			resolvedAllotmentIds.courseId ||
			num(pick(roomAllotment, ['courseId', 'fk_course_id', 'course_id'], 0))
		const examId =
			Number(details.examId || 0) ||
			examFilterIds.examId ||
			resolvedAllotmentIds.examId ||
			num(pick(roomAllotment, ['examId', 'fk_exam_id', 'exam_id'], 0))
		const examDate = toExamApiDate(
			details.examDate ||
				resolvedAllotmentIds.examDate ||
				String(pick(roomAllotment, ['examDate', 'exam_date'], '')),
		)
		return { collegeId, courseId, examId, examDate }
	}, [
		details.collegeId,
		details.courseId,
		details.examId,
		details.examDate,
		examFilterIds,
		resolvedAllotmentIds,
		seatCells,
		roomAllotment,
	])

	const bulkSubjectId = useMemo(() => {
		const raw = pick(roomAllotment, ['subjectIds', 'subjectId', 'subject_ids'], 0)
		if (raw == null || raw === '') return 0
		if (typeof raw === 'number') return raw
		const first = String(raw).split(',')[0]?.trim()
		return Number(first) || 0
	}, [roomAllotment])

	const selectedBulkStudents = useMemo(
		() => bulkStudents.filter((s) => s.checked),
		[bulkStudents],
	)

	const filteredBulkStudents = useMemo(() => {
		const q = bulkSearch.trim().toLowerCase()
		if (!q) return bulkStudents
		return bulkStudents.filter((s) => {
			const name = String(s.firstName ?? s.first_name ?? s.stdName ?? '').toLowerCase()
			const roll = String(s.rollNumber ?? s.roll_number ?? s.hallticketNumber ?? s.hallticket_number ?? '').toLowerCase()
			return name.includes(q) || roll.includes(q)
		})
	}, [bulkStudents, bulkSearch])

	const filteredSelectedBulkStudents = useMemo(() => {
		const q = bulkSelectedSearch.trim().toLowerCase()
		if (!q) return selectedBulkStudents
		return selectedBulkStudents.filter((s) => {
			const name = String(s.firstName ?? s.first_name ?? s.stdName ?? '').toLowerCase()
			const roll = String(s.rollNumber ?? s.roll_number ?? s.hallticketNumber ?? s.hallticket_number ?? '').toLowerCase()
			return name.includes(q) || roll.includes(q)
		})
	}, [selectedBulkStudents, bulkSelectedSearch])

	const bulkCourseGroupOptions = useMemo(
		() =>
			bulkCourseGroups.map((g) => ({
				value: String(g.courseGroupId ?? g.fk_course_group_id ?? g.course_group_id ?? ''),
				label: String(g.groupCode ?? g.group_code ?? g.groupName ?? g.group_name ?? ''),
			})).filter((o) => o.value && o.label),
		[bulkCourseGroups],
	)

	const bulkCourseYearOptions = useMemo(
		() =>
			bulkCourseYears.map((y) => ({
				value: String(y.courseYearId ?? y.fk_course_year_id ?? y.course_year_id ?? ''),
				label: String(y.courseYearName ?? y.course_year_name ?? y.courseYearCode ?? y.course_year_code ?? ''),
			})).filter((o) => o.value && o.label),
		[bulkCourseYears],
	)

	useEffect(() => {
		if (mode !== 'bulk') return
		const courseId = allotmentContext.courseId
		if (!courseId) {
			setBulkCourseGroups([])
			return
		}
		let mounted = true
		listCourseGroups(courseId)
			.then((rows) => {
				if (!mounted) return
				setBulkCourseGroups(Array.isArray(rows) ? rows : [])
			})
			.catch(() => {
				if (mounted) setBulkCourseGroups([])
			})
		return () => {
			mounted = false
		}
	}, [mode, allotmentContext.courseId])

	useEffect(() => {
		if (mode !== 'bulk' || bulkCourseGroupId || bulkCourseGroups.length === 0) return
		const first = bulkCourseGroups[0]
		const id = first?.courseGroupId ?? first?.fk_course_group_id ?? first?.course_group_id
		if (id) setBulkCourseGroupId(String(id))
	}, [mode, bulkCourseGroups, bulkCourseGroupId])

	useEffect(() => {
		if (mode !== 'bulk' || bulkCourseYearId || bulkCourseYears.length === 0) return
		const first = bulkCourseYears[0]
		const id = first?.courseYearId ?? first?.fk_course_year_id ?? first?.course_year_id
		if (id) setBulkCourseYearId(String(id))
	}, [mode, bulkCourseYears, bulkCourseYearId])

	useEffect(() => {
		if (mode !== 'bulk' || !bulkCourseGroupId) {
			setBulkCourseYears([])
			return
		}
		const courseId = allotmentContext.courseId
		if (!courseId) return
		let mounted = true
		listCourseYears(courseId)
			.then((rows) => {
				if (!mounted) return
				setBulkCourseYears(Array.isArray(rows) ? rows : [])
			})
			.catch(() => {
				if (mounted) setBulkCourseYears([])
			})
		return () => {
			mounted = false
		}
	}, [mode, bulkCourseGroupId, allotmentContext.courseId])

	useEffect(() => {
		if (mode !== 'bulk' || !bulkCourseGroupId || !bulkCourseYearId) {
			setBulkStudents([])
			return
		}
		const { collegeId, courseId, examId, examDate } = allotmentContext
		if (!collegeId || !courseId || !examId || !examDate) return
		let mounted = true
		setLoadingBulkStudents(true)
		listBulkAllotmentStudents({
			collegeId,
			courseId,
			examId,
			examDate,
			courseGroupId: Number(bulkCourseGroupId),
			courseYearId: Number(bulkCourseYearId),
			subjectId: bulkSubjectId,
		})
			.then((rows) => {
				if (!mounted) return
				const list = (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, checked: true }))
				setBulkStudents(list)
				setBulkCheckAll(list.length > 0)
			})
			.catch(() => {
				if (mounted) setBulkStudents([])
			})
			.finally(() => {
				if (mounted) setLoadingBulkStudents(false)
			})
		return () => {
			mounted = false
		}
	}, [
		mode,
		bulkCourseGroupId,
		bulkCourseYearId,
		allotmentContext.collegeId,
		allotmentContext.courseId,
		allotmentContext.examId,
		allotmentContext.examDate,
		bulkSubjectId,
	])

	useEffect(() => {
		let mounted = true
		async function resolveLabels() {
			const cId = Number(details.courseId || 0) || allotmentContext.courseId
			const collegeId = Number(details.collegeId || 0) || allotmentContext.collegeId
			const ayId = Number(searchParams?.get('academicYearId') || 0)
			if (!cId && !collegeId) {
				setResolvedCourse('')
				setResolvedAcademicYear('')
				setResolvedCollegeCode('')
				return
			}
			const [course, ay, college] = await Promise.all([
				cId ? fetchSingleDomain('Course', 'courseId', cId).catch(() => null) : Promise.resolve(null),
				ayId ? fetchSingleDomain('AcademicYear', 'academicYearId', ayId).catch(() => null) : Promise.resolve(null),
				collegeId ? fetchSingleDomain('College', 'collegeId', collegeId).catch(() => null) : Promise.resolve(null),
			])
			if (!mounted) return
			setResolvedCourse(
				String(
					course?.courseCode ??
					course?.course_code ??
					course?.courseName ??
					course?.course_name ??
					course?.name ??
					'',
				),
			)
			setResolvedAcademicYear(
				String(ay?.academicYear ?? ay?.academic_year ?? '').replace(/\s*-\s*/g, '-'),
			)
			setResolvedCollegeCode(
				String(college?.collegeCode ?? college?.college_code ?? college?.collegeName ?? college?.college_name ?? ''),
			)
		}
		resolveLabels()
		return () => {
			mounted = false
		}
	}, [details.courseId, details.collegeId, searchParams, allotmentContext.courseId, allotmentContext.collegeId])

	const courseLine = useMemo(() => {
		// Angular: {{examsList.collegeCode}} / {{pageParams.academicYear}} / {{pageParams.courseCode}}
		const college =
			searchParams?.get('collegeCode') ||
			resolvedCollegeCode ||
			scheduleMeta.collegeCode ||
			''
		const ay = details.academicYear || resolvedAcademicYear || scheduleMeta.academicYear
		const course =
			details.courseCode ||
			details.courseName ||
			resolvedCourse ||
			scheduleMeta.courseCode ||
			''
		const parts = [college, ay, course].filter(Boolean)
		return parts.length > 0 ? parts.join(' / ') : '—'
	}, [
		searchParams,
		details.academicYear,
		details.courseCode,
		details.courseName,
		resolvedAcademicYear,
		resolvedCourse,
		resolvedCollegeCode,
		scheduleMeta,
	])

	const collegeCodeLabel = useMemo(
		() => searchParams?.get('collegeCode') || resolvedCollegeCode || '',
		[searchParams, resolvedCollegeCode],
	)

	useEffect(() => {
		let mounted = true
		async function resolveFromFilters() {
			const courseId = allotmentContext.courseId
			const examId = allotmentContext.examId
			const ayId = Number(searchParams?.get('academicYearId') || 0)
			if (!courseId && !examId) return
			if (details.courseCode && details.academicYear) return

			const filters = await listUnivExamFiltersByCode({
				courseId: courseId || undefined,
				examId: examId || undefined,
				academicYearId: ayId || undefined,
			}).catch(() => [])

			const row =
				filters.find((r) => num(r.fk_course_id) === courseId) ??
				filters.find((r) => num(r.fk_exam_id) === examId) ??
				filters[0]
			if (!row || !mounted) return

			if (!details.courseCode && !resolvedCourse) {
				const code = String(row.course_code ?? row.courseCode ?? '')
				if (code) setResolvedCourse(code)
			}
			if (!details.academicYear && !resolvedAcademicYear) {
				const ay = String(row.academic_year ?? row.academicYear ?? '').replace(/\s*-\s*/g, '-')
				if (ay) setResolvedAcademicYear(ay)
			}
			if (!searchParams?.get('collegeCode') && !resolvedCollegeCode) {
				const code = String(row.college_code ?? row.collegeCode ?? '')
				if (code) setResolvedCollegeCode(code)
			}
			if (!Number(details.collegeId || 0) && !resolvedAllotmentIds.collegeId) {
				const collegeId = num(row.fk_college_id ?? row.college_id ?? row.collegeId)
				if (collegeId > 0) {
					setResolvedAllotmentIds((prev) => ({ ...prev, collegeId }))
					setExamFilterIds((prev) => ({ ...prev, collegeId: prev.collegeId || collegeId }))
				}
			}
			if (!Number(details.courseId || 0) && !resolvedAllotmentIds.courseId) {
				const courseId = num(row.fk_course_id ?? row.course_id ?? row.courseId)
				if (courseId > 0) {
					setResolvedAllotmentIds((prev) => ({ ...prev, courseId }))
					setExamFilterIds((prev) => ({ ...prev, courseId: prev.courseId || courseId }))
				}
			}
			if (!Number(details.examId || 0) && !resolvedAllotmentIds.examId) {
				const examId = num(row.fk_exam_id ?? row.exam_id ?? row.examId)
				if (examId > 0) {
					setResolvedAllotmentIds((prev) => ({ ...prev, examId }))
					setExamFilterIds((prev) => ({ ...prev, examId: prev.examId || examId }))
				}
			}
		}
		void resolveFromFilters()
		return () => {
			mounted = false
		}
	}, [
		allotmentContext.courseId,
		allotmentContext.examId,
		details.courseCode,
		details.academicYear,
		resolvedCourse,
		resolvedAcademicYear,
		resolvedCollegeCode,
		searchParams,
	])

	const roomMeta = useMemo(() => {
		const allotSeatsFromAllotment = examRoomSeatDto(roomAllotment ?? null)
		const allotSeats = allotSeatsFromAllotment
		const coordsUnion =
			allotSeats.length > 0 ? [...allotSeats, ...seatRows].filter(Boolean) : [...seatRows]
		const seatsSource = allotSeats.length > 0 ? allotSeats : seatRows
		const { maxRow: inferRow, maxCol: inferCol } = maxSeatRowCol(coordsUnion)
		const metaSource = roomAllotment ?? allotSeats[0] ?? seatRows[0] ?? {}
		const totalRowsRaw = num(pick(metaSource, ROW_DIM_KEYS, 0))
		const totalColsRaw = num(pick(metaSource, COL_DIM_KEYS, 0))
		const totalRows = totalRowsRaw > 0 ? totalRowsRaw : inferRow > 0 ? inferRow : 0
		const totalCols = totalColsRaw > 0 ? totalColsRaw : inferCol > 0 ? inferCol : 0
		const totalSeats = totalRows > 0 && totalCols > 0 ? totalRows * totalCols : 0
		const roomStrength = num(pick(metaSource, ['roomStrength', 'room_strength'], 0))
		const blockedFromGrid = seatCells.length
			? seatCounts(seatCells).blocked
			: seatsSource.filter(
					(r) =>
						String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase() === 'blocked',
				).length
		const bookedFromGrid = seatCells.length
			? seatCounts(seatCells).booked
			: seatsSource.filter((r) => {
					const status = String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase()
					return status === 'booked' || num(pick(r, ['studentId', 'student_id', 'fk_std_id'], 0)) > 0
				}).length
		const availableFromGrid = seatCells.length
			? seatCounts(seatCells).available
			: Math.max((roomStrength || totalSeats || seatsSource.length) - bookedFromGrid - blockedFromGrid, 0)
		const blockedSeats = seatCells.length ? blockedFromGrid : num(pick(metaSource, ['blockedSeats', 'blocked_seats'], blockedFromGrid))
		const bookedSeats = seatCells.length ? bookedFromGrid : num(pick(metaSource, ['bookedSeats', 'booked_seats', 'noOfSeats'], bookedFromGrid))
		const availableSeats = seatCells.length
			? availableFromGrid
			: num(
					pick(
						metaSource,
						['availableSeats', 'available_seats'],
						Math.max((roomStrength || totalSeats || seatsSource.length) - bookedSeats - blockedSeats, 0),
					),
				)
		return {
			totalRows,
			totalCols,
			roomStrength: roomStrength || totalSeats || seatRows.length,
			priority: num(pick(metaSource, ['priority'], 0)),
			bookedSeats,
			blockedSeats,
			availableSeats,
			capacity: totalSeats || seatsSource.length,
			roomLabel: details.roomCode || String(pick(metaSource, ['room_name', 'roomName', 'roomCode', 'room_code'], '')),
		}
	}, [seatRows, roomAllotment, details.roomCode, seatCells])

	const seatingGrid = useMemo(() => {
		const totalRows = roomMeta.totalRows
		const totalCols = roomMeta.totalCols
		if (!totalRows || !totalCols) return []
		if (seatCells.length > 0) {
			const byRow = new Map<number, SeatCell[]>()
			for (const cell of seatCells) {
				if (!byRow.has(cell.rowNo)) byRow.set(cell.rowNo, [])
				byRow.get(cell.rowNo)!.push(cell)
			}
			return Array.from({ length: totalRows }, (_, rIdx) => {
				const rowNo = rIdx + 1
				const rowCells = (byRow.get(rowNo) ?? []).sort((a, b) => a.columnNo - b.columnNo)
				return rowCells.map((seat) => ({
					key: seat.key,
					serial: seat.serial,
					status: seat.examSeatStatusCode || 'Available',
					hallticket: seat.hallticketNumber,
					subjectCode: seat.subjectCode,
					stdName: seat.stdName,
					cell: seat,
				}))
			})
		}
		const allotSeatsFromAllotment = examRoomSeatDto(roomAllotment ?? null)
		const seatsSource = allotSeatsFromAllotment.length > 0 ? allotSeatsFromAllotment : seatRows
		const seatByCell = new Map<string, any>()
		for (const item of seatsSource) {
			const rowNo = num(pick(item, ['rowNo', 'row_no', 'rowNO', 'row'], 0))
			const colNo = num(pick(item, ['columnNo', 'column_no', 'columnNO', 'colNo', 'col_no', 'column'], 0))
			if (!rowNo || !colNo) continue
			seatByCell.set(`${rowNo}-${colNo}`, item)
		}
		let serial = 1
		const serialMap = new Map<string, string>()
		for (let col = 1; col <= totalCols; col++) {
			const rowOrder = Array.from({ length: totalRows }, (_, i) => i + 1)
			if (col % 2 === 0) rowOrder.reverse()
			for (const row of rowOrder) {
				serialMap.set(`${row}-${col}`, `S${serial++}`)
			}
		}
		return Array.from({ length: totalRows }, (_, rIdx) => {
			const rowNo = rIdx + 1
			return Array.from({ length: totalCols }, (_, cIdx) => {
				const colNo = cIdx + 1
				const key = `${rowNo}-${colNo}`
				const seat = seatByCell.get(key) ?? {}
				const status = String(
					pick(seat, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status', 'exam_display_seat_status_code'], 'Available'),
				)
				return {
					key,
					serial: serialMap.get(key) ?? '',
					status: status || 'Available',
					hallticket: String(pick(seat, ['hallticketNumber', 'hallticket_number'], '')),
					subjectCode: String(pick(seat, ['subjectCode', 'subject_code'], '')),
					stdName: String(pick(seat, ['stdName', 'student_name'], '')),
					cell: null as SeatCell | null,
				}
			})
		})
	}, [seatRows, roomAllotment, roomMeta.totalRows, roomMeta.totalCols, seatCells])

	function buildStudentFetchParams(seat?: SeatCell | null) {
		const collegeId =
			Number(searchParams?.get('collegeId') ?? 0) ||
			Number(details.collegeId || 0) ||
			allotmentContext.collegeId ||
			examFilterIds.collegeId ||
			resolvedAllotmentIds.collegeId ||
			seat?.collegeId ||
			num(pick(roomAllotment, ['collegeId', 'fk_college_id', 'college_id', 'College.collegeId', 'College.college_id'], 0))
		const courseId =
			Number(searchParams?.get('courseId') ?? 0) ||
			Number(details.courseId || 0) ||
			allotmentContext.courseId ||
			examFilterIds.courseId ||
			resolvedAllotmentIds.courseId ||
			num(pick(roomAllotment, ['courseId', 'fk_course_id', 'course_id', 'Course.courseId', 'Course.course_id'], 0))
		const examId =
			Number(searchParams?.get('examId') ?? 0) ||
			Number(details.examId || 0) ||
			allotmentContext.examId ||
			examFilterIds.examId ||
			resolvedAllotmentIds.examId ||
			seat?.examId ||
			num(pick(roomAllotment, ['examId', 'fk_exam_id', 'exam_id'], 0))
		const examDate =
			toExamApiDate(searchParams?.get('examDate')) ||
			toExamApiDate(details.examDate) ||
			allotmentContext.examDate ||
			resolvedAllotmentIds.examDate ||
			toExamApiDate(String(pick(roomAllotment, ['examDate', 'exam_date'], ''))) ||
			toExamApiDate(String(pick(seatRows[0], ['examDate', 'exam_date'], '')))
		return { collegeId, courseId, examId, examDate }
	}

	function describeMissingStudentParams(params: {
		collegeId: number
		courseId: number
		examId: number
		examDate: string
	}) {
		return [
			!params.collegeId && 'college',
			!params.courseId && 'course',
			!params.examId && 'exam',
			!params.examDate && 'date',
		]
			.filter(Boolean)
			.join(', ')
	}

	async function enrichStudentParamsFromFilters(params: {
		collegeId: number
		courseId: number
		examId: number
		examDate: string
	}) {
		const ayId = Number(searchParams?.get('academicYearId') || 0)
		const filters = await listUnivExamFiltersByCode({
			examId: params.examId || Number(details.examId || 0) || undefined,
			courseId: params.courseId || Number(details.courseId || 0) || undefined,
			academicYearId: ayId || undefined,
		}).catch(() => [])
		const row =
			filters.find((r) => num(r.fk_exam_id) === Number(details.examId || 0)) ??
			filters.find((r) => num(r.fk_course_id) === Number(details.courseId || 0)) ??
			filters[0]
		if (!row) return params
		return {
			collegeId:
				params.collegeId ||
				num(row.fk_college_id ?? row.college_id ?? row.collegeId),
			courseId:
				params.courseId ||
				num(row.fk_course_id ?? row.course_id ?? row.courseId),
			examId:
				params.examId || num(row.fk_exam_id ?? row.exam_id ?? row.examId),
			examDate:
				params.examDate ||
				toExamApiDate(details.examDate) ||
				toExamApiDate(String(row.exam_date ?? row.examDate ?? '')),
		}
	}

	async function openSeatModal(seat: SeatCell) {
		setSelectedSeat(seat)
		setSeatModalOpen(true)
		setModalStudents([])

		let params = buildStudentFetchParams(seat)
		if (describeMissingStudentParams(params)) {
			params = await enrichStudentParamsFromFilters(params)
		}

		const missing = describeMissingStudentParams(params)
		if (missing) {
			toast.error(`Missing ${missing} — cannot load students.`)
			return
		}

		setModalStudentsLoading(true)
		void listExamStudentsForSeatAllotment(params)
			.then((rows) => setModalStudents(rows))
			.catch(() => toast.error('Failed to load students for seat allotment.'))
			.finally(() => setModalStudentsLoading(false))
	}

	function onBulkCourseGroupChange(value: string | null) {
		setBulkCourseGroupId(value ?? '')
		setBulkCourseYearId('')
		setBulkStudents([])
	}

	function toggleBulkCheckAll(checked: boolean) {
		setBulkCheckAll(checked)
		setBulkStudents((rows) => rows.map((row) => ({ ...row, checked })))
	}

	function toggleBulkStudent(studentId: number, checked: boolean) {
		setBulkStudents((rows) =>
			rows.map((row) => {
				const id = Number(row.studentId ?? row.student_id ?? row.pk_student_id ?? 0)
				return id === studentId ? { ...row, checked } : row
			}),
		)
		setBulkCheckAll(false)
	}

	async function handleBulkSave() {
		if (!roomAllotment || selectedBulkStudents.length === 0) return
		const bookedStatus = examSeatStatuses.find((s) => String(s.generalDetailCode) === 'Booked')
		const bookedId = Number(bookedStatus?.generalDetailId ?? 0)
		const bookedCode = String(bookedStatus?.generalDetailCode ?? 'Booked')
		const bookedLabel = String(
			bookedStatus?.generalDetailDisplayName ?? bookedStatus?.generalDetailName ?? 'Booked',
		)
		if (!bookedId) {
			toast.error('Booked seat status is not configured.')
			return
		}

		let studentIdx = 0
		const nextCells = seatCells.map((cell) => {
			if (studentIdx >= selectedBulkStudents.length) return cell
			const isAvailable = cell.examSeatStatusCode.toLowerCase() === 'available' && !cell.studentId
			if (!isAvailable) return cell
			const stu = selectedBulkStudents[studentIdx++]
			const studentId = Number(stu.studentId ?? stu.student_id ?? stu.pk_student_id ?? 0) || null
			const roll = String(stu.rollNumber ?? stu.roll_number ?? stu.hallticketNumber ?? stu.hallticket_number ?? '')
			return {
				...cell,
				examseatstatusCatId: bookedId,
				studentId,
				subjectId: Number(stu.subjectId ?? stu.subject_id ?? 0) || null,
				examSeatStatusCode: bookedCode,
				examDisplaySeatStatusCode: bookedLabel,
				hallticketNumber: roll,
				subjectCode: String(stu.shortName ?? stu.subjectCode ?? stu.subject_code ?? ''),
				stdName: String(stu.firstName ?? stu.first_name ?? stu.stdName ?? ''),
			}
		})

		if (studentIdx === 0) {
			toast.error('No available seats to allot selected students.')
			return
		}
		if (studentIdx < selectedBulkStudents.length) {
			toast.warning(`Only ${studentIdx} of ${selectedBulkStudents.length} students were allotted (not enough available seats).`)
		}

		const counts = seatCounts(nextCells)
		const examRoomAllotmentId = num(
			pick(roomAllotment, ['examRoomAllotmentId', 'exam_room_allotment_id', 'pk_exam_room_allotment_id'], 0),
		)
		const examDate =
			toDateStr(details.examDate) || toDateStr(String(pick(roomAllotment, ['examDate', 'exam_date'], '')))
		const payload = [
			{
				collegeId: nextCells[0]?.collegeId ?? Number(details.collegeId || 0),
				examId: nextCells[0]?.examId ?? Number(details.examId || 0),
				examRoomAllotmentId: examRoomAllotmentId || null,
				examTimetableId: nextCells[0]?.examTimetableId ?? Number(details.examTimetableId || 0),
				roomId: nextCells[0]?.roomId ?? 0,
				examDate,
				totalRows: roomMeta.totalRows,
				totalColumns: roomMeta.totalCols,
				priority: roomMeta.priority,
				roomStrength: roomMeta.roomStrength || roomMeta.capacity,
				availableSeats: counts.available,
				blockedSeats: counts.blocked,
				bookedSeats: counts.booked,
				isActive: true,
				createdDt: pick(roomAllotment, ['createdDt', 'created_dt'], null),
				examRoomStudentAllotmentDTO: nextCells.map((cell) => ({
					examRoomStdAllotId: cell.examRoomStdAllotId,
					collegeId: cell.collegeId,
					examId: cell.examId,
					examTimetableId: cell.examTimetableId,
					roomId: cell.roomId,
					rowNo: cell.rowNo,
					columnNo: cell.columnNo,
					createdDt: cell.createdDt,
					examseatstatusCatId: cell.examseatstatusCatId,
					studentId: cell.studentId,
					subjectId: cell.subjectId,
					stdName: cell.stdName,
					hallticketNumber: cell.hallticketNumber,
					subjectCode: cell.subjectCode,
					examSeatStatusCode: cell.examSeatStatusCode,
					examDisplaySeatStatusCode: cell.examDisplaySeatStatusCode,
					isActive: cell.isActive,
				})),
			},
		]

		setSavingBulk(true)
		const { ok, message } = await createExamRoomAllotments(payload).catch(() => ({
			ok: false,
			message: 'Network error',
			raw: null,
		}))
		setSavingBulk(false)
		if (!ok) {
			toast.error(message || 'Failed to save bulk allotment.')
			return
		}
		toast.success(message || 'Bulk allotment saved.')
		setSeatCells(nextCells)
		setBulkStudents([])
		setBulkCourseYearId('')
		await reloadRoomAllotment()
	}

	async function handleSeatSave(result: SeatAllotmentResult) {
		if (!selectedSeat || !roomAllotment) return
		const nextCells = seatCells.map((cell) =>
			cell.key === selectedSeat.key
				? {
						...cell,
						examseatstatusCatId: result.examseatstatusCatId,
						studentId: result.studentId,
						subjectId: result.subjectId,
						examSeatStatusCode: result.examSeatStatusCode,
						examDisplaySeatStatusCode: result.examDisplaySeatStatusCode,
						hallticketNumber: result.hallticketNumber,
						subjectCode: result.subjectCode,
						stdName: result.stdName,
					}
				: cell,
		)
		const counts = seatCounts(nextCells)
		const examRoomAllotmentId = num(
			pick(roomAllotment, ['examRoomAllotmentId', 'exam_room_allotment_id', 'pk_exam_room_allotment_id'], 0),
		)
		const examDate =
			toDateStr(details.examDate) || toDateStr(String(pick(roomAllotment, ['examDate', 'exam_date'], '')))
		const payload = [
			{
				collegeId: nextCells[0]?.collegeId ?? Number(details.collegeId || 0),
				examId: nextCells[0]?.examId ?? Number(details.examId || 0),
				examRoomAllotmentId: examRoomAllotmentId || null,
				examTimetableId: nextCells[0]?.examTimetableId ?? Number(details.examTimetableId || 0),
				roomId: nextCells[0]?.roomId ?? 0,
				examDate,
				totalRows: roomMeta.totalRows,
				totalColumns: roomMeta.totalCols,
				priority: roomMeta.priority,
				roomStrength: roomMeta.roomStrength || roomMeta.capacity,
				availableSeats: counts.available,
				blockedSeats: counts.blocked,
				bookedSeats: counts.booked,
				isActive: true,
				createdDt: pick(roomAllotment, ['createdDt', 'created_dt'], null),
				examRoomStudentAllotmentDTO: nextCells.map((cell) => ({
					examRoomStdAllotId: cell.examRoomStdAllotId,
					collegeId: cell.collegeId,
					examId: cell.examId,
					examTimetableId: cell.examTimetableId,
					roomId: cell.roomId,
					rowNo: cell.rowNo,
					columnNo: cell.columnNo,
					createdDt: cell.createdDt,
					examseatstatusCatId: cell.examseatstatusCatId,
					studentId: cell.studentId,
					subjectId: cell.subjectId,
					stdName: cell.stdName,
					hallticketNumber: cell.hallticketNumber,
					subjectCode: cell.subjectCode,
					examSeatStatusCode: cell.examSeatStatusCode,
					examDisplaySeatStatusCode: cell.examDisplaySeatStatusCode,
					isActive: cell.isActive,
				})),
			},
		]
		setSavingSeat(true)
		const { ok, message } = await createExamRoomAllotments(payload).catch(() => ({
			ok: false,
			message: 'Network error',
			raw: null,
		}))
		setSavingSeat(false)
		if (!ok) {
			toast.error(message || 'Failed to save seat allotment.')
			return
		}
		toast.success(message || 'Seat allotment saved.')
		setSeatCells(nextCells)
		setSeatModalOpen(false)
		setSelectedSeat(null)
		await reloadRoomAllotment()
	}

	// ── Print layouts ─────────────────────────────────────────────────────────
	// While printMode is set, the normal UI is unmounted and only the chosen
	// print layout renders. usePrintMode handles opening the OS print dialog
	// and resets on afterprint.
	const headerLine = [
		details.examName,
		details.examDate,
		details.examSession,
		roomMeta.roomLabel,
		details.courseName || details.courseCode,
	].filter(Boolean).join(' / ')

	if (printMode === 'seating') {
		// Port of Angular #printSeatingOrder section (check === 1):
		// H2 "Seating Order : (room)" + H3 exam + H3 date/session,
		// seat grid table, summary table.
		const totalSeats = (roomMeta.totalRows || 0) * (roomMeta.totalCols || 0) || roomMeta.capacity
		return (
			<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
				<h2 style={{ color: 'blue', margin: '0 0 8px 0', fontSize: '18px' }}>
					Seating Order : <span style={{ color: 'black' }}>({roomMeta.roomLabel || details.roomCode || '—'})</span>
				</h2>
				<h3 style={{ marginTop: '-2px', color: 'blue', fontSize: '14px' }}>
					Exam Name : <span style={{ color: 'black' }}>
						{details.examName || '—'}
						{details.examDate ? ` (${details.examDate})` : ''}
					</span>
				</h3>
				<h3 style={{ marginTop: '-2px', fontSize: '14px' }}>
					<span>Date : {details.examDate || '—'} &nbsp;|&nbsp; Session : {details.examSession || '—'}</span>
				</h3>

				<table id="printTable" style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }}>
					<tbody>
						{seatingGrid.map((row, rIdx) => (
							<tr key={`pr-${rIdx}`}>
								{row.map((seat) => {
									const blocked = seat.status.toLowerCase() === 'blocked'
									const booked = seat.status.toLowerCase() === 'booked' || !!seat.hallticket
									return (
										<td
											key={seat.key}
											style={{
												border: '1px solid #000',
												padding: '4px',
												verticalAlign: 'top',
												minHeight: '60px',
												minWidth: '72px',
												textAlign: 'center',
												background: blocked ? '#d1d5db' : 'transparent',
											}}
										>
											{booked && seat.hallticket ? (
												<>
													<p style={{ fontSize: '12px', margin: 0 }}>
														{seat.hallticket} - {seat.serial}
													</p>
													<p style={{ fontSize: '10px', margin: 0 }}>{seat.subjectCode || ''}</p>
												</>
											) : blocked ? (
												<p style={{ fontSize: '10px', margin: 0 }}>BLOCKED</p>
											) : null}
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>

				<table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '12px' }}>
					<tbody>
						<tr><td style={{ border: '1px solid #000', padding: '6px' }}>Total Seats</td><td style={{ border: '1px solid #000', padding: '6px' }}>{totalSeats}</td></tr>
						<tr><td style={{ border: '1px solid #000', padding: '6px' }}>Booked Seats</td><td style={{ border: '1px solid #000', padding: '6px' }}>{roomMeta.bookedSeats}</td></tr>
						<tr><td style={{ border: '1px solid #000', padding: '6px' }}>Available Seats</td><td style={{ border: '1px solid #000', padding: '6px' }}>{roomMeta.availableSeats}</td></tr>
						<tr><td style={{ border: '1px solid #000', padding: '6px' }}>Present</td><td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td></tr>
						<tr><td style={{ border: '1px solid #000', padding: '6px' }}>Absent</td><td style={{ border: '1px solid #000', padding: '6px' }}>&nbsp;</td></tr>
					</tbody>
				</table>
			</div>
		)
	}

	if (printMode === 'attendance') {
		// Port of Angular printAttendance section: per (course_group, subject,
		// room, exam_type) page with banner, ATTENDANCE SHEET title, exam-label
		// row, Branch/Date/Room + Subject/Session header rows, numbered student
		// table, summary table, three-signature footer.
		const source = seatRows.length > 0 ? seatRows : attendanceRows
		// Match Angular groupByMultipleKeys: fk_course_group_id | fk_subject_id | room_id | fk_examtype_catdet_id.
		const byKey = new Map<string, any[]>()
		for (const s of source) {
			const key = [
				(s as any).fk_course_group_id ?? (s as any).groupCode ?? (s as any).group_code,
				(s as any).fk_subject_id ?? (s as any).subjectCode ?? (s as any).subject_code,
				(s as any).room_id ?? (s as any).roomCode,
				(s as any).fk_examtype_catdet_id ?? (s as any).examTypeCode ?? 'EX',
			].join('|')
			if (!byKey.has(key)) byKey.set(key, [])
			byKey.get(key)!.push(s)
		}
		const attGroups = Array.from(byKey.values()).map((students) =>
			students.slice().sort((a: any, b: any) =>
				String(a.hallticket_number ?? a.hallticketNumber ?? '').localeCompare(
					String(b.hallticket_number ?? b.hallticketNumber ?? ''),
					undefined,
					{ numeric: true },
				),
			),
		)
		if (attGroups.length === 0) {
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
					<p style={{ textAlign: 'center', padding: '40px 0' }}>No allotted students for this room.</p>
				</div>
			)
		}
		return (
			<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
				{attGroups.map((students, gi) => {
					const s: any = students[0]
					const isLab = String(s?.subjectTypeCode ?? '').toUpperCase() === 'LAB'
					return (
						<div key={`att-${gi}`} className={gi > 0 ? 'page-break' : ''}>
							<img
								src={collegeLogo}
								alt=""
								style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }}
								onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (!img.src.endsWith('default_logo.png')) img.src = '/assets/images/avatars/default_logo.png'; else img.style.display = 'none' }}
							/>
							<h4 style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 8px 0' }}>ATTENDANCE SHEET</h4>
							<h4 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '14px' }}>
								{s?.exam_label_name ?? details.examName ?? '—'}
								{s?.exam_type_name ? ` (${s.exam_type_name})` : details.examType ? ` (${details.examType})` : ''}
							</h4>
							<div className="flex justify-between text-[12px] mb-1 px-1">
								<div><b>Branch :</b> {s?.group_code ?? s?.groupCode ?? '—'}</div>
								<div><b>Date :</b> {s?.exam_date ?? details.examDate ?? '—'}</div>
								<div><b>Room :</b> {s?.room_name ?? roomMeta.roomLabel ?? '—'}</div>
							</div>
							<div className="flex justify-between text-[12px] mb-3 px-1">
								<div style={{ flex: 2 }}><b>Subject:</b> {s?.subject_name ?? s?.subjectName ?? '—'}</div>
								<div><b>Session:</b> {s?.sessin_time ?? s?.session_name ?? details.examSession ?? '—'}</div>
							</div>
							<table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '12px' }}>
								<thead>
									<tr>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>S.NO</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>H.T. NO.</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Student Name</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Signature of the Student</th>
									</tr>
								</thead>
								<tbody>
									{students.map((stu: any, i: number) => (
										<tr key={`att-${gi}-${i}`}>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{i + 1}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{stu.hallticket_number ?? stu.hallticketNumber ?? '—'}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{stu.student_name ?? stu.stdName ?? '—'}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>&nbsp;</td>
										</tr>
									))}
								</tbody>
							</table>
							<table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '12px' }}>
								<thead>
									<tr>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Total No.of Students Registered</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Total No.of Students Absent</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Total No.of Students Present</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{students.length}</td>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>&nbsp;</td>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>&nbsp;</td>
									</tr>
								</tbody>
							</table>
							{isLab ? (
								<div className="flex justify-between text-[12px] mt-8 px-1">
									<div>Signature of the Internal Examiner</div>
									<div>Signature of the External Examiner</div>
								</div>
							) : (
								<div className="flex justify-between text-[12px] mt-8 px-1">
									<div>Signature of the Invigilator - I</div>
									<div>Signature of the Invigilator - II</div>
									<div>Controller of Examinations</div>
								</div>
							)}
						</div>
					)
				})}
			</div>
		)
	}

	if (printMode === 'stickers' || printMode === 'groupwise-stickers') {
		// Match Angular print-seating-stickers / print-groupwise-seating-stickers
		// exactly: a 4-column float grid per (room) or (room+group) with a
		// bordered header card above. Source data is whichever of seatRows /
		// attendanceRows has rows.
		const source = seatRows.length > 0 ? seatRows : attendanceRows
		const isGroupwise = printMode === 'groupwise-stickers'
		const byRoom = new Map<string, any[]>()
		for (const s of source) {
			const key = String((s as any).room_id ?? (s as any).room_name ?? roomMeta.roomLabel ?? '—')
			if (!byRoom.has(key)) byRoom.set(key, [])
			byRoom.get(key)!.push(s)
		}
		const rooms = Array.from(byRoom.values())
		function StickerCell({ data }: { data: any }) {
			return (
				<div
					style={{
						width: '25%',
						boxSizing: 'border-box',
						padding: '27px 0 9px 0',
						textAlign: 'center',
						float: 'left',
						pageBreakInside: 'avoid',
						breakInside: 'avoid',
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-3px', fontSize: '12px' }}>
						<span>{data.hallticket_number ?? data.hallticketNumber ?? ''}</span>
						{(data.omr_serial_no ?? data.seatNumber) ? <>&nbsp;&nbsp;<span>{data.omr_serial_no ?? data.seatNumber}</span></> : null}
					</div>
					{data.omr_barcode ? (
						<img
							src={`data:image/jpg;base64,${data.omr_barcode}`}
							style={{ height: '30px', width: '180px' }}
							alt=""
						/>
					) : null}
					<div style={{ display: 'flex', justifyContent: 'center', fontSize: '7px', marginTop: '1px' }}>
						{data.exam_date ?? details.examDate ?? ''} &nbsp;&nbsp; {data.subject_code ?? data.subjectCode ?? ''}
					</div>
				</div>
			)
		}
		function StickerHeader({ row, extraGroup }: { row: any; extraGroup?: string | null }) {
			return (
				<div
					style={{
						border: '1px solid #000',
						padding: '25px 0 9px 0',
						textAlign: 'center',
						fontSize: '10px',
						fontWeight: 'bold',
						marginBottom: '8px',
						pageBreakAfter: 'avoid',
						breakAfter: 'avoid',
					}}
				>
					<div style={{ fontSize: '10px', fontWeight: 'bold' }}>{row?.exam_name ?? details.examName ?? 'Exam'}</div>
					<div>|{row?.university_code ?? '—'}|</div>
					<div>
						<span>{row?.exam_date ?? details.examDate ?? ''}</span> &nbsp;
						<span>{row?.exam_session_name ?? details.examSession ?? ''}</span>
					</div>
					<div>
						<span>Room: {row?.room_name ?? roomMeta.roomLabel ?? '—'}</span>
						{extraGroup ? <> | <span>Group: {extraGroup}</span></> : null}
					</div>
				</div>
			)
		}
		if (rooms.length === 0) {
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
					<p style={{ textAlign: 'center', padding: '40px 0' }}>No allotted students for this room.</p>
				</div>
			)
		}
		return (
			<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
				{rooms.map((roomStudents, ri) => {
					if (isGroupwise) {
						const byGroup = new Map<string, any[]>()
						for (const s of roomStudents) {
							const key = String((s as any).fk_course_group_id ?? (s as any).group_code ?? (s as any).groupCode ?? '—')
							if (!byGroup.has(key)) byGroup.set(key, [])
							byGroup.get(key)!.push(s)
						}
						return Array.from(byGroup.entries()).map(([groupKey, students], gi) => {
							const head: any = students[0]
							return (
								<div key={`gst-${ri}-${gi}`} className={(ri + gi) > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
									<StickerHeader row={head} extraGroup={head?.group_code ?? head?.groupCode ?? groupKey} />
									<div style={{ overflow: 'auto', margin: '0 4px' }}>
										{students.map((stu, ci) => (
											<StickerCell key={`gst-${ri}-${gi}-${ci}`} data={stu} />
										))}
									</div>
								</div>
							)
						})
					}
					const head: any = roomStudents[0]
					return (
						<div key={`stk-${ri}`} className={ri > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
							<StickerHeader row={head} />
							<div style={{ overflow: 'auto', margin: '0 4px' }}>
								{roomStudents.map((stu, ci) => (
									<StickerCell key={`stk-${ri}-${ci}`} data={stu} />
								))}
							</div>
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<>
			{loading && (
				<div
					data-print-hide
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
				>
					<div className="rounded-lg bg-white px-6 py-4 shadow-lg flex items-center gap-3">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
						<div className="flex flex-col">
							<span className="text-[13px] font-semibold text-slate-900">Loading seating data…</span>
							<span className="text-[11px] text-slate-500">Fetching student allotment from server</span>
						</div>
					</div>
				</div>
			)}
			<FilteredPage
				title="Seat Allot Students"
				filters={
					<>
						<div className="mb-3 rounded-md border border-cyan-200 bg-cyan-50/30 px-3 py-2 text-[12px]">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-semibold text-slate-700 min-w-16">Course</span>
								<span>:</span>
								<span className="font-semibold text-blue-700">{courseLine}</span>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-semibold text-slate-700 min-w-16">Exam</span>
								<span>:</span>
								<span className="font-semibold text-blue-700">{details.examName || details.examId || '-'}</span>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-semibold text-slate-700 min-w-16">Exam Type</span>
								<span>:</span>
								<span className="font-semibold text-blue-700">{details.examType || details.examSession || '-'}</span>
							</div>
						</div>
						<GlobalFilterBarRow columns={2}>
							<GlobalFilterField label="Exam Date">
								<Input value={details.examDate || ''} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Exam Timetable">
								<Input value={`${details.examDate || ''} / ${details.examSession || ''}`} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Room">
								<Input value={roomMeta.roomLabel || ''} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Total Rows">
								<Input value={String(roomMeta.totalRows || 0)} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Total Columns">
								<Input value={String(roomMeta.totalCols || 0)} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Room Strength">
								<Input value={String(roomMeta.roomStrength || 0)} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
							<GlobalFilterField label="Priority">
								<Input value={String(roomMeta.priority || 0)} readOnly className="h-9 text-[13px]" />
							</GlobalFilterField>
						</GlobalFilterBarRow>
					</>
				}
				body={
					<div className="space-y-2">
					<div className="flex items-center gap-6 text-[12px] pt-1">
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="allot-mode"
								checked={mode === 'student'}
								onChange={() => setMode('student')}
								className="h-3.5 w-3.5"
							/>
							<span>By Student</span>
						</label>
						<label className="inline-flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="allot-mode"
								checked={mode === 'bulk'}
								onChange={() => setMode('bulk')}
								className="h-3.5 w-3.5"
							/>
							<span>Bulk Allotment</span>
						</label>
					</div>

					{mode === 'bulk' && roomMeta.totalRows > 0 && roomMeta.totalCols > 0 && (
						<div className="rounded border border-blue-200 bg-blue-50/20 p-3 space-y-3 mt-2">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
								<Select
									label="Course Group"
									value={bulkCourseGroupId || null}
									onChange={onBulkCourseGroupChange}
									options={bulkCourseGroupOptions}
									placeholder="Course Group"
									searchable
								/>
								<Select
									label="Course Year"
									value={bulkCourseYearId || null}
									onChange={(v) => setBulkCourseYearId(v ?? '')}
									options={bulkCourseYearOptions}
									placeholder="Course Year"
									searchable
									disabled={!bulkCourseGroupId}
								/>
							</div>

							{loadingBulkStudents ? (
								<p className="text-[11px] text-muted-foreground px-1">Loading students...</p>
							) : null}

							{bulkStudents.length > 0 ? (
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
									<div className="rounded border border-border bg-card p-2 space-y-2">
										<Input
											value={bulkSearch}
											onChange={(e) => setBulkSearch(e.target.value)}
											placeholder="Search..."
											className="h-8 text-[12px]"
										/>
										<table className="w-full border-collapse text-[12px]">
											<thead>
												<tr className="border-b border-border">
													<th className="px-2 py-1 text-left w-12">
														<Checkbox
															checked={bulkCheckAll}
															onCheckedChange={(v) => toggleBulkCheckAll(v === true)}
														/>
														<span className="ml-1">All</span>
													</th>
													<th className="px-2 py-1 text-left">
														Student List: <span className="text-blue-700">{bulkStudents.length}</span>
													</th>
												</tr>
											</thead>
											<tbody>
												{filteredBulkStudents.map((stu) => {
													const studentId = Number(stu.studentId ?? stu.student_id ?? stu.pk_student_id ?? 0)
													const name = String(stu.firstName ?? stu.first_name ?? stu.stdName ?? '')
													const roll = String(
														stu.rollNumber ?? stu.roll_number ?? stu.hallticketNumber ?? stu.hallticket_number ?? '',
													)
													return (
														<tr key={studentId || roll} className="border-b border-border/60">
															<td className="px-2 py-1 align-top">
																<Checkbox
																	checked={stu.checked}
																	onCheckedChange={(v) => toggleBulkStudent(studentId, v === true)}
																/>
															</td>
															<td className="px-2 py-1 text-left">
																{name}
																{roll ? <span className="text-muted-foreground"> ({roll})</span> : null}
															</td>
														</tr>
													)
												})}
											</tbody>
										</table>
									</div>

									<div className="rounded border border-border bg-card p-2 space-y-2">
										<Input
											value={bulkSelectedSearch}
											onChange={(e) => setBulkSelectedSearch(e.target.value)}
											placeholder="Search..."
											className="h-8 text-[12px]"
										/>
										<table className="w-full border-collapse text-[12px]">
											<thead>
												<tr className="border-b border-border">
													<th className="px-2 py-1 text-left">
														Selected Students:{' '}
														<span className="text-blue-700">{selectedBulkStudents.length}</span>
													</th>
												</tr>
											</thead>
											<tbody>
												{filteredSelectedBulkStudents.map((stu) => {
													const studentId = Number(stu.studentId ?? stu.student_id ?? stu.pk_student_id ?? 0)
													const name = String(stu.firstName ?? stu.first_name ?? stu.stdName ?? '')
													const roll = String(
														stu.rollNumber ?? stu.roll_number ?? stu.hallticketNumber ?? stu.hallticket_number ?? '',
													)
													return (
														<tr key={`sel-${studentId || roll}`} className="border-b border-border/60">
															<td className="px-2 py-1 text-left">
																{name}
																{roll ? <span className="text-muted-foreground"> ({roll})</span> : null}
															</td>
														</tr>
													)
												})}
											</tbody>
										</table>
									</div>
								</div>
							) : null}

							{!loadingBulkStudents && bulkCourseYearId && bulkStudents.length === 0 ? (
								<p className="text-[11px] text-muted-foreground px-1">No students found for the selected group and year.</p>
							) : null}

							{selectedBulkStudents.length > 0 ? (
								<div className="flex justify-end">
									<Button
										type="button"
										className="h-8 px-6 text-[12px]"
										disabled={savingBulk}
										onClick={() => void handleBulkSave()}
									>
										{savingBulk ? 'Saving...' : 'Save'}
									</Button>
								</div>
							) : null}
						</div>
					)}

					{mode === 'student' && (
						<div className="rounded border border-blue-200 p-2 space-y-2">
							<h3 className="text-[13px] font-semibold leading-tight text-blue-700 px-1">Seating Order</h3>
							<p className="text-[11px] text-muted-foreground px-1">Click a seat to allot or change student assignment.</p>
							<div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2">
								<div className="border border-border overflow-auto max-h-[520px] min-h-[120px]">
									{seatingGrid.length === 0 && !loading ? (
										<p className="text-[11px] text-muted-foreground p-4">
											{!Number(details.examRoomAllotmentId)
												? 'Room allotment ID is missing in the URL. Open this screen from Exam Scheduling Forms using Seat Allot Students.'
												: roomMeta.totalRows === 0 || roomMeta.totalCols === 0
													? 'The server returned no seating rows/columns and no seat coordinates to infer a grid. Check room allotment configuration.'
													: 'No seating data to render.'}
										</p>
									) : (
										<table className="w-full border-collapse text-[12px] table-fixed">
											<tbody>
												{seatingGrid.map((row, rIdx) => (
													<tr key={`row-${rIdx}`}>
														{row.map((seat) => {
															const status = seat.status.toLowerCase()
															const blocked = status === 'blocked'
															const booked = status === 'booked' || !!seat.hallticket
															const hasStudent = booked && !!seat.hallticket
															return (
																<td
																	key={seat.key}
																	title={seat.stdName ? `Student: ${seat.stdName}` : 'Click to allot student'}
																	onClick={() => {
																		if (seat.cell) void openSeatModal(seat.cell)
																	}}
																	className={`relative w-[13%] min-w-[88px] h-[92px] align-top border border-blue-100 p-1 text-center ${
																		blocked ? 'bg-[#ffc0c0]' : 'bg-card'
																	} ${seat.cell ? 'cursor-pointer hover:bg-blue-50/80' : ''}`}
																>
																	<span className="absolute right-2 top-1 text-[11px] font-medium text-blue-600">
																		{seat.serial}
																	</span>
																	<div className="flex h-full flex-col items-center justify-center pt-3">
																		{hasStudent ? (
																			<>
																				<ExamSeatPersonIcon size={50} />
																				<p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-900">
																					{seat.hallticket}
																				</p>
																				{seat.subjectCode ? (
																					<p className="text-[10px] text-slate-700 leading-tight">{seat.subjectCode}</p>
																				) : null}
																			</>
																		) : booked ? (
																			<ExamSeatChairFilledIcon size={50} />
																		) : (
																			<ExamSeatChairOutlineIcon size={50} />
																		)}
																	</div>
																</td>
															)
														})}
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
								<div className="border border-border overflow-hidden h-fit">
									<table className="w-full border-collapse text-[12px]">
										<tbody>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">Total Seats</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">
													{roomMeta.totalRows && roomMeta.totalCols
														? roomMeta.totalRows * roomMeta.totalCols
														: roomMeta.capacity}
												</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">
													<span className="inline-flex items-center gap-2">
														<span className="inline-flex rounded bg-[#c5c5c5] p-0.5">
															<ExamSeatChairOutlineIcon size={25} />
														</span>
														Blocked Seats
													</span>
												</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.blockedSeats}</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">
													<span className="inline-flex items-center gap-2">
														<ExamSeatChairFilledIcon size={25} />
														Booked Seats
													</span>
												</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.bookedSeats}</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">
													<span className="inline-flex items-center gap-2">
														<ExamSeatChairOutlineIcon size={25} />
														Available Seats
													</span>
												</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.availableSeats}</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					<div className="flex flex-wrap items-center justify-center gap-3 pt-2 print-hide">
						<Button
							type="button"
							variant="outline"
							className="h-8 px-6 text-[12px]"
							onClick={() => {
								// Carry the filter context back to the index so it can re-select
								// the same Course / Academic Year / Exam Master / Exam Timetable
								// and re-run Get List without the user re-picking everything.
								const qp = new URLSearchParams()
								if (details.collegeId) qp.set('collegeId', details.collegeId)
								if (details.courseId) qp.set('courseId', details.courseId)
								if (details.examId) qp.set('examId', details.examId)
								if (details.examTimetableId) qp.set('examTimetableId', details.examTimetableId)
								if (details.sessionId) qp.set('sessionId', details.sessionId)
								if (details.examDate) qp.set('examDate', details.examDate)
								const ay = searchParams?.get('academicYearId')
								if (ay) qp.set('academicYearId', ay)
								// The university-exam-center variant passes ?univExamcenterId & ?returnBase
								// so Back returns to the exam-center page instead of the college one.
								const uec = searchParams?.get('univExamcenterId')
								if (uec) qp.set('univExamcenterId', uec)
								const q = qp.toString()
								const returnBase =
									searchParams?.get('returnBase') ||
									'/admin-examination-management/admin-exam-masters/seating-plan-setup'
								router.push(`${returnBase}${q ? `?${q}` : ''}`)
							}}
						>
							Back
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => triggerPrint('seating')}>
							Print
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => triggerPrint('attendance')}>
							Print Attendance Sheet
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => triggerPrint('stickers')}>
							Print Stickers
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => triggerPrint('groupwise-stickers')}>
							Group-Wise Stickers
						</Button>
					</div>
					<div className="text-[11px] text-muted-foreground px-1">
						{loading ? 'Loading...' : `Students: ${attendanceRows.length} | Seats: ${seatRows.length}`}
					</div>
					</div>
				}
			>
			<SeatAllotmentModal
				open={seatModalOpen}
				onClose={() => {
					if (savingSeat) return
					setSeatModalOpen(false)
					setSelectedSeat(null)
					setModalStudents([])
				}}
				onSave={handleSeatSave}
				isSaving={savingSeat}
				seat={selectedSeat}
				students={modalStudents}
				loadingStudents={modalStudentsLoading}
				examSeatStatuses={examSeatStatuses}
				context={{
					collegeCode: collegeCodeLabel,
					academicYear: details.academicYear || resolvedAcademicYear,
					courseCode: details.courseCode || resolvedCourse,
					examName: details.examName,
					examSession: details.examSession,
					examType: details.examType,
					examDate: allotmentContext.examDate,
					roomName: roomMeta.roomLabel,
					collegeId: allotmentContext.collegeId,
					courseId: allotmentContext.courseId,
					examId: allotmentContext.examId,
				}}
			/>
			</FilteredPage>
		</>
	)
}

