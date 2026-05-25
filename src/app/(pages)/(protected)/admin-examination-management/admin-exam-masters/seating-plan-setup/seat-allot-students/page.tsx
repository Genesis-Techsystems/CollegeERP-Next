'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	listExamStdAttDetails,
	listRoomwiseOmrStudents,
	getExamRoomAllotmentById,
	getSingleDomain,
} from '@/services/seating-plan'
import { PageContainer, PageHeader } from '@/components/layout'
import { usePrintMode } from '@/lib/print'

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
	const [loading, setLoading] = useState(false)
	const [mode, setMode] = useState<'student' | 'bulk'>('student')

	const details = useMemo(
		() => ({
			examId: searchParams?.get('examId') ?? '',
			courseId: searchParams?.get('courseId') ?? '',
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

	useEffect(() => {
		async function load() {
			const routeExamId = Number(details.examId || 0)
			const routeCourseId = Number(details.courseId || 0)
			const routeExamTimetableId = Number(details.examTimetableId || 0)
			const routeSessionId = Number(details.sessionId || 0)
			const examRoomAllotmentId = Number(details.examRoomAllotmentId || 0)
			if (!routeExamId && !examRoomAllotmentId) {
				setAttendanceRows([])
				setSeatRows([])
				setRoomAllotment(null)
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

				const [attData, seatsData] = await Promise.all([
					examId > 0 && courseId > 0 && examTimetableId > 0
						? fetchExamStdAttDetails({ examId, courseId, examTimetableId })
						: Promise.resolve([]),
					examId > 0 && courseId > 0
						? fetchRoomwiseOmrStudents({
								examId,
								courseId,
								examDate,
								sessionId,
							})
						: Promise.resolve([]),
				])
				setAttendanceRows(Array.isArray(attData) ? attData : [])
				setSeatRows(Array.isArray(seatsData) ? seatsData : [])
				setRoomAllotment(allotment)
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [details.examId, details.courseId, details.examTimetableId, details.examDate, details.sessionId, details.examRoomAllotmentId])

	useEffect(() => {
		let mounted = true
		async function resolveLabels() {
			const cId = Number(details.courseId || 0)
			const ayId = Number(searchParams?.get('academicYearId') || 0)
			if (!cId) {
				setResolvedCourse('')
				setResolvedAcademicYear('')
				return
			}
			const [course, ay] = await Promise.all([
				fetchSingleDomain('Course', 'courseId', cId).catch(() => null),
				ayId ? fetchSingleDomain('AcademicYear', 'academicYearId', ayId).catch(() => null) : Promise.resolve(null),
			])
			if (!mounted) return
			setResolvedCourse(
				String(
					course?.courseCode ??
					course?.course_name ??
					course?.courseName ??
					course?.name ??
					''
				)
			)
			setResolvedAcademicYear(
				String(
					ay?.academicYear ??
					ay?.academic_year ??
					''
				)
			)
		}
		resolveLabels()
		return () => {
			mounted = false
		}
	}, [details.courseId, searchParams])

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
		const blockedFromGrid = seatsSource.filter(
			(r) =>
				String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase() === 'blocked',
		).length
		const bookedFromGrid = seatsSource.filter((r) => {
			const status = String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase()
			return status === 'booked' || num(pick(r, ['studentId', 'student_id', 'fk_std_id'], 0)) > 0
		}).length
		const totalSeats = totalRows > 0 && totalCols > 0 ? totalRows * totalCols : 0
		const roomStrength = num(pick(metaSource, ['roomStrength', 'room_strength'], 0))
		const blockedSeats = num(pick(metaSource, ['blockedSeats', 'blocked_seats'], blockedFromGrid))
		const bookedSeats = num(pick(metaSource, ['bookedSeats', 'booked_seats', 'noOfSeats'], bookedFromGrid))
		const availableSeats = num(
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
	}, [seatRows, roomAllotment, details.roomCode])

	const seatingGrid = useMemo(() => {
		const totalRows = roomMeta.totalRows
		const totalCols = roomMeta.totalCols
		if (!totalRows || !totalCols) return []
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
				}
			})
		})
	}, [seatRows, roomAllotment, roomMeta.totalRows, roomMeta.totalCols])

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
		return (
			<div className="p-4 text-black">
				<div className="mb-3 text-center">
					<div className="text-[16px] font-bold">{details.examName || 'Exam'}</div>
					<div className="text-[12px]">
						{[details.courseName || details.courseCode, details.academicYear || resolvedAcademicYear]
							.filter(Boolean)
							.join(' / ')}
					</div>
					<div className="text-[12px]">
						{[details.examDate, details.examSession].filter(Boolean).join(' • ')}{' '}
						{roomMeta.roomLabel ? `• Room: ${roomMeta.roomLabel}` : ''}
					</div>
				</div>
				<table className="w-full border-collapse text-[11px]">
					<tbody>
						{seatingGrid.map((row, rIdx) => (
							<tr key={`pr-${rIdx}`}>
								{row.map((seat) => {
									const blocked = seat.status.toLowerCase() === 'blocked'
									return (
										<td
											key={seat.key}
											className="border border-slate-400 p-1 align-top h-[60px] min-w-[68px]"
											style={blocked ? { background: '#e5e7eb' } : {}}
										>
											<div className="text-[9px] text-right">{seat.serial}</div>
											<div className="text-center text-[11px] font-medium">{seat.hallticket || (blocked ? 'BLOCKED' : '')}</div>
											<div className="text-center text-[9px]">{seat.subjectCode}</div>
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
				<div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
					<div>Total Seats: <b>{roomMeta.capacity}</b></div>
					<div>Blocked: <b>{roomMeta.blockedSeats}</b></div>
					<div>Booked: <b>{roomMeta.bookedSeats}</b></div>
					<div>Available: <b>{roomMeta.availableSeats}</b></div>
				</div>
			</div>
		)
	}

	if (printMode === 'attendance') {
		const rows = attendanceRows.length > 0 ? attendanceRows : seatRows
		return (
			<div className="p-4 text-black">
				<div className="mb-3 text-center">
					<div className="text-[16px] font-bold">{details.examName || 'Exam'} — Attendance Sheet</div>
					<div className="text-[12px]">{headerLine}</div>
				</div>
				<table className="w-full border-collapse text-[11px]">
					<thead>
						<tr>
							<th className="border border-slate-400 px-2 py-1 text-left w-12">SI.No</th>
							<th className="border border-slate-400 px-2 py-1 text-left">Hall Ticket</th>
							<th className="border border-slate-400 px-2 py-1 text-left">Student Name</th>
							<th className="border border-slate-400 px-2 py-1 text-left">Subject</th>
							<th className="border border-slate-400 px-2 py-1 text-left w-24">Seat</th>
							<th className="border border-slate-400 px-2 py-1 text-left w-32">Signature</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="border border-slate-400 px-2 py-3 text-center">
									No students for this room / date / session.
								</td>
							</tr>
						) : (
							rows.map((r: any, i: number) => (
								<tr key={`att-${i}`}>
									<td className="border border-slate-400 px-2 py-1">{i + 1}</td>
									<td className="border border-slate-400 px-2 py-1">{r.hallticketNumber ?? r.hallticket_number ?? '-'}</td>
									<td className="border border-slate-400 px-2 py-1">{r.stdName ?? r.student_name ?? '-'}</td>
									<td className="border border-slate-400 px-2 py-1">{r.subjectCode ?? r.subject_code ?? '-'}</td>
									<td className="border border-slate-400 px-2 py-1">{r.seatNumber ?? r.omr_serial_no ?? '-'}</td>
									<td className="border border-slate-400 px-2 py-1">&nbsp;</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				<div className="mt-3 text-[11px]">Total students: <b>{rows.length}</b></div>
			</div>
		)
	}

	if (printMode === 'stickers' || printMode === 'groupwise-stickers') {
		const source = attendanceRows.length > 0 ? attendanceRows : seatRows
		const groups: Record<string, any[]> =
			printMode === 'groupwise-stickers'
				? source.reduce((acc: Record<string, any[]>, r: any) => {
					const key = String(r.groupCode ?? r.group_code ?? r.subjectCode ?? r.subject_code ?? 'Group')
					if (!acc[key]) acc[key] = []
					acc[key].push(r)
					return acc
				}, {})
				: { all: source }
		const groupKeys = Object.keys(groups)
		return (
			<div className="p-4 text-black">
				{groupKeys.map((gk, gi) => (
					<div key={`g-${gk}`} className={gi > 0 ? 'page-break pt-4' : ''}>
						<div className="mb-3 text-center">
							<div className="text-[14px] font-bold">{details.examName || 'Exam'}</div>
							<div className="text-[11px]">
								{[details.examDate, details.examSession, roomMeta.roomLabel].filter(Boolean).join(' • ')}
							</div>
							{printMode === 'groupwise-stickers' && gk !== 'all' && (
								<div className="text-[11px] font-semibold">Group: {gk}</div>
							)}
						</div>
						<div className="grid grid-cols-3 gap-2">
							{groups[gk].map((r: any, i: number) => (
								<div key={`st-${gk}-${i}`} className="border border-slate-400 p-2 text-center">
									<div className="text-[10px]">{r.subjectCode ?? r.subject_code ?? ''}</div>
									<div className="text-[12px] font-bold">
										{r.hallticketNumber ?? r.hallticket_number ?? '-'}
									</div>
									<div className="text-[10px]">{r.stdName ?? r.student_name ?? ''}</div>
									<div className="text-[9px] text-slate-600">
										Seat {r.seatNumber ?? r.omr_serial_no ?? '-'} • {details.examDate}
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		)
	}

	return (
		<PageContainer className="space-y-4">
		<PageHeader title="Seat Allot Students" subtitle="Allocate seating for exam students" />
			<div className="app-card overflow-hidden">
				<div className="px-4 py-3 border-b border-border bg-muted/40">
					<h2 className="app-card-title">Exam Scheduling Forms</h2>
				</div>
				<div className="p-3 space-y-2">
					<div className="rounded-md border border-cyan-200 bg-cyan-50/30 px-3 py-2 text-[12px]">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold text-slate-700 min-w-16">Course</span>
							<span>:</span>
							<span className="font-semibold text-blue-700">
								{`${(details.academicYear || resolvedAcademicYear) ? `${details.academicYear || resolvedAcademicYear} / ` : ''}${
									details.courseName || details.courseCode || resolvedCourse || details.courseId || '-'
								}`}
							</span>
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

					<div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end text-[12px]">
						<div className="md:col-span-2 space-y-1">
							<Label>Choose a exam date</Label>
							<Input value={details.examDate || ''} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-5 space-y-1">
							<Label>Exam Timetable</Label>
							<Input value={`${details.examDate || ''} / ${details.examSession || ''}`} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-5" />
						<div className="md:col-span-4 space-y-1">
							<Label>Room</Label>
							<Input value={roomMeta.roomLabel || ''} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-2 space-y-1">
							<Label>Total Rows</Label>
							<Input value={String(roomMeta.totalRows || 0)} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-2 space-y-1">
							<Label>Total Columns</Label>
							<Input value={String(roomMeta.totalCols || 0)} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-2 space-y-1">
							<Label>Room Strength</Label>
							<Input value={String(roomMeta.roomStrength || 0)} readOnly className="h-8 text-[12px]" />
						</div>
						<div className="md:col-span-2 space-y-1">
							<Label>Priority</Label>
							<Input value={String(roomMeta.priority || 0)} readOnly className="h-8 text-[12px]" />
						</div>
					</div>

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

					{mode === 'student' && (
						<div className="rounded border border-blue-200 p-2 space-y-2">
							<h3 className="text-[13px] font-semibold leading-tight text-blue-700 px-1">Seating Order</h3>
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
										<table className="w-full border-collapse text-[12px]">
											<tbody>
												{seatingGrid.map((row, rIdx) => (
													<tr key={`row-${rIdx}`}>
														{row.map((seat) => {
															const blocked = seat.status.toLowerCase() === 'blocked'
															const booked = seat.status.toLowerCase() === 'booked' || !!seat.hallticket
															return (
																<td
																	key={seat.key}
																	title={seat.stdName ? `Student: ${seat.stdName}` : ''}
																	className={`min-w-[72px] h-[76px] align-top border border-blue-100 p-1 ${
																		blocked ? 'bg-slate-200/70' : 'bg-card'
																	}`}
																>
																	<div className="text-right text-[11px]">{seat.serial}</div>
																	<div className="text-center text-[18px] leading-none text-muted-foreground">{booked ? '■' : '□'}</div>
																	<div className="text-center font-medium leading-tight">{seat.hallticket || ''}</div>
																	<div className="text-center text-[10px] text-slate-600 leading-tight">{seat.subjectCode || ''}</div>
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
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.capacity}</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">Blocked Seats</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.blockedSeats}</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">Booked Seats</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.bookedSeats}</td>
											</tr>
											<tr>
												<td className="border border-blue-100 px-3 py-2 font-medium">Available Seats</td>
												<td className="border border-blue-100 px-3 py-2 font-semibold">{roomMeta.availableSeats}</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					<div className="flex flex-wrap items-center justify-center gap-3 pt-2 print-hide">
						<Button type="button" variant="outline" className="h-8 px-6 text-[12px]" onClick={() => router.back()}>
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
			</div>
		</PageContainer>
	)
}

