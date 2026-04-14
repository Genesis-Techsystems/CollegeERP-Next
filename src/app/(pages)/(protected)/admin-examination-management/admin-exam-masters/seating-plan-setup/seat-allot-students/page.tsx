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

export default function SeatAllotStudentsPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
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
			const examId = Number(details.examId || 0)
			const courseId = Number(details.courseId || 0)
			const examTimetableId = Number(details.examTimetableId || 0)
			const sessionId = Number(details.sessionId || 0)
			const examRoomAllotmentId = Number(details.examRoomAllotmentId || 0)
			if (!examId || !courseId || !examTimetableId) {
				setAttendanceRows([])
				setSeatRows([])
				setRoomAllotment(null)
				return
			}
			setLoading(true)
			try {
				const [attData, seatsData, allotmentData] = await Promise.all([
					fetchExamStdAttDetails({ examId, courseId, examTimetableId }),
					fetchRoomwiseOmrStudents({
						examId,
						courseId,
						examDate: details.examDate,
						sessionId,
					}),
					fetchExamRoomAllotmentById(examRoomAllotmentId),
				])
				setAttendanceRows(Array.isArray(attData) ? attData : [])
				setSeatRows(Array.isArray(seatsData) ? seatsData : [])
				setRoomAllotment(allotmentData)
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
		const first = roomAllotment ?? seatRows[0] ?? {}
		const allotSeats = Array.isArray(roomAllotment?.examRoomStudentAllotmentDTO) ? roomAllotment.examRoomStudentAllotmentDTO : []
		const seatsSource = allotSeats.length > 0 ? allotSeats : seatRows
		const totalRowsRaw = num(pick(first, ['totalRows', 'total_rows', 'rows_count'], 0))
		const totalColsRaw = num(pick(first, ['totalColumns', 'total_columns', 'cols_count'], 0))
		const maxRow = seatsSource.reduce((m: number, r: any) => Math.max(m, num(pick(r, ['rowNo', 'row_no'], 0))), 0)
		const maxCol = seatsSource.reduce((m: number, r: any) => Math.max(m, num(pick(r, ['columnNo', 'column_no'], 0))), 0)
		const totalRows = totalRowsRaw || maxRow
		const totalCols = totalColsRaw || maxCol
		const blockedFromGrid = seatRows.filter(
			(r) =>
				String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase() === 'blocked'
		).length
		const bookedFromGrid = seatRows.filter((r) => {
			const status = String(pick(r, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], '')).toLowerCase()
			return status === 'booked' || num(pick(r, ['studentId', 'student_id', 'fk_std_id'], 0)) > 0
		}).length
		const totalSeats = totalRows > 0 && totalCols > 0 ? totalRows * totalCols : 0
		const roomStrength = num(pick(first, ['roomStrength', 'room_strength'], 0))
		const blockedSeats = num(pick(first, ['blockedSeats', 'blocked_seats'], blockedFromGrid))
		const bookedSeats = num(pick(first, ['bookedSeats', 'booked_seats', 'noOfSeats'], bookedFromGrid))
		const availableSeats = num(
			pick(
				first,
				['availableSeats', 'available_seats'],
				Math.max((roomStrength || totalSeats || seatRows.length) - bookedSeats - blockedSeats, 0)
			)
		)
		return {
			totalRows,
			totalCols,
			roomStrength: roomStrength || totalSeats || seatRows.length,
			priority: num(pick(first, ['priority'], 0)),
			bookedSeats,
			blockedSeats,
			availableSeats,
			capacity: totalSeats || seatRows.length,
			roomLabel: details.roomCode || String(pick(first, ['room_name', 'roomName', 'roomCode', 'room_code'], '')),
		}
	}, [seatRows, roomAllotment, details.roomCode])

	const seatingGrid = useMemo(() => {
		const totalRows = roomMeta.totalRows
		const totalCols = roomMeta.totalCols
		if (!totalRows || !totalCols) return []
		const allotSeats = Array.isArray(roomAllotment?.examRoomStudentAllotmentDTO) ? roomAllotment.examRoomStudentAllotmentDTO : []
		const seatsSource = allotSeats.length > 0 ? allotSeats : seatRows
		const seatByCell = new Map<string, any>()
		for (const item of seatsSource) {
			const rowNo = num(pick(item, ['rowNo', 'row_no'], 0))
			const colNo = num(pick(item, ['columnNo', 'column_no'], 0))
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
				const status = String(pick(seat, ['examSeatStatusCode', 'examseatstatusCatCode', 'seat_status'], 'Available'))
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

	return (
		<PageContainer className="space-y-5">
		<PageHeader title="Seat Allot Students" subtitle="Allocate seating for exam students" />
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
					<h2 className="text-[15px] font-semibold text-[hsl(var(--primary))]">Exam Scheduling Forms</h2>
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
							<h3 className="text-[18px] leading-none font-medium text-blue-700 px-1">Seating Order</h3>
							<div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2">
								<div className="border border-slate-200 overflow-auto max-h-[520px]">
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
																	blocked ? 'bg-slate-200/70' : 'bg-white'
																}`}
															>
																<div className="text-right text-[11px]">{seat.serial}</div>
																<div className="text-center text-[18px] leading-none text-slate-500">{booked ? '■' : '□'}</div>
																<div className="text-center font-medium leading-tight">{seat.hallticket || ''}</div>
																<div className="text-center text-[10px] text-slate-600 leading-tight">{seat.subjectCode || ''}</div>
															</td>
														)
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<div className="border border-slate-200 overflow-hidden h-fit">
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

					<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
						<Button type="button" variant="outline" className="h-8 px-6 text-[12px]" onClick={() => router.back()}>
							Back
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => window.print()}>
							Print
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => window.print()}>
							Print Attendance Sheet
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => window.print()}>
							Print Stickers
						</Button>
						<Button type="button" className="h-8 px-6 text-[12px]" onClick={() => window.print()}>
							Group-Wise Stickers
						</Button>
					</div>
					<div className="text-[11px] text-slate-500 px-1">
						{loading ? 'Loading...' : `Students: ${attendanceRows.length} | Seats: ${seatRows.length}`}
					</div>
				</div>
			</div>
		</PageContainer>
	)
}

