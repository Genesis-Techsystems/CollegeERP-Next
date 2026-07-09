'use client'

/**
 * Exam Room Seating Plan (University Exam Center).
 *
 * Faithful React port of Angular
 * `exam-papers-delivery-process/exam-center-room-allotment`. This is the
 * university-exam-center sibling of `admin-exam-masters/seating-plan-setup`
 * (which ports `exam-masters/exam-room-allotment`). The difference: this page
 * selects an Exam Center (and an Exam Type — External / Internal) instead of a
 * College, and scopes the room-allotment list through the exam center.
 *
 * Cascade (Angular getExamFiltersList → selectedCourse → selectedExamType →
 * selectedExam → selectedExamTimetable → getExamCenters → selectedCollege):
 *   univ_exam_filters (ALL) → courses → academic years → exams (split by
 *   internal/external) → exam timetables → exam centers → room allotments.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '@/context/SessionContext'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { SearchInput } from '@/common/components/search'
import { ConfirmDialog } from '@/common/components/feedback'
import { PageContainer, PageHeader } from '@/components/layout'
import { CalendarDays, Filter, Plus, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { distinct } from '@/lib/utils'
import { toDateStr } from '@/common/generic-functions'
import { usePrintMode } from '@/lib/print'
import { listExamTimetablesByExam } from '@/services/pre-examination'
import { listAllActiveUnivExamCenters } from '@/services/exam-papers-delivery'
import {
	assignSeatingAllSession,
	getGroupwiseAllotmentSummary,
	getRoomwiseAllotmentSummary,
	getRoomwiseSubjectSummary,
	listExamInvigilationAllotmentsByTimetable,
	listExamRoomAllotmentsByCenter,
	listExamStdAttDetails,
	listRoomwiseOmrStudents,
	listUnivExamFiltersByCode,
	popExamInvigilator,
} from '@/services/seating-plan'

type AnyRow = Record<string, any>

type AllocationRow = {
	sl: number
	examDate: string
	session: string
	roomCode: string
	bookedSeats: number
	blockedSeats: number
	availableSeats: number
	isActive?: boolean
	raw?: AnyRow
}

type SessionOption = {
	id: number
	label: string
	examDate: string
	session: string
	sessionId?: number
}

type PrintMode =
	| 'room-wise-seating'
	| 'room-subject-counts'
	| 'group-wise-seating'
	| 'attendance'
	| 'student'
	| 'groupwise-stickers'
	| 'invigilator'
	| 'cover-slip'
	| 'packing-slip'

// Center-scoped sub-pages live under this page's own folder. Seat-allot renders
// the shared seating-plan-setup component (its logic is center-agnostic) via a
// dedicated route, with ?returnBase so Back returns here.
const CENTER_BASE = '/admin-examination-management/exam-papers-delivery-process/exam-center-room-allotment'

const num = (v: unknown): number => {
	const n = Number(v ?? 0)
	return Number.isFinite(n) ? n : 0
}

/** Angular tConvert: 24h "HH:mm[:ss]" → 12h "h:mm AM/PM". */
function tConvert(time?: string): string {
	if (!time) return ''
	const match = String(time).match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
	if (!match) return String(time)
	const hh = Number(match[1])
	const mm = match[2]
	const ampm = hh < 12 ? 'AM' : 'PM'
	const hour12 = hh % 12 || 12
	return `${hour12}:${mm} ${ampm}`
}

function formatTableDate(value?: string) {
	const raw = String(value ?? '').trim()
	const dateOnly = toDateStr(raw.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? raw)
	if (!dateOnly) return '-'
	const d = new Date(dateOnly)
	if (Number.isNaN(d.getTime())) return dateOnly
	return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRoomCode(value?: string) {
	const raw = String(value ?? '').trim()
	if (!raw) return '-'
	return raw.split('/').map((s) => s.trim()).join(' / ')
}

/** One screen row per Exam Date + Session + Room (Angular roomAllotments grid). */
function mapAllocationRows(rows: AnyRow[]): AllocationRow[] {
	const out = new Map<string, AllocationRow>()
	let seq = 1
	for (const r of rows ?? []) {
		const examDate = String(r.examDate ?? r.exam_date ?? '')
		const session = String(
			r.examSessionName ?? r.examsessioninCatCode ?? r.exam_session_name ?? r.session ?? '',
		)
		const roomCode =
			[r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room_code ?? r.room ?? r.block_room]
				.filter(Boolean)
				.join(' / ') || '-'
		const allotmentId = num(r.examRoomAllotmentId ?? r.exam_room_allotment_id ?? r.id)
		const key = allotmentId > 0 ? `id:${allotmentId}` : `${toDateStr(examDate)}|${session}|${roomCode}`
		if (out.has(key)) continue
		out.set(key, {
			sl: seq++,
			examDate,
			session,
			roomCode,
			bookedSeats: num(r.bookedSeats ?? r.booked_seats ?? r.noOfSeats ?? r.no_of_seats),
			blockedSeats: num(r.blockedSeats ?? r.blocked_seats),
			availableSeats: num(r.availableSeats ?? r.available_seats ?? r.roomCapacity ?? r.capacity),
			isActive: r.isActive ?? true,
			raw: r,
		})
	}
	return Array.from(out.values())
}

function statusRenderer(p: ICellRendererParams) {
	return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function ExamCenterRoomAllotmentPage() {
	const router = useRouter()
	const { user } = useSessionContext()
	const employeeId = useMemo(() => {
		const fromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
		const fromSession = Number(user?.employeeId ?? 0)
		return fromStorage || fromSession || 0
	}, [user?.employeeId])

	const { mode: printMode, triggerPrint } = usePrintMode<PrintMode>()

	// Filters
	const [filterOpen, setFilterOpen] = useState(true)
	const [filterRows, setFilterRows] = useState<AnyRow[]>([])
	const [courses, setCourses] = useState<AnyRow[]>([])
	const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
	const [exams, setExams] = useState<AnyRow[]>([])
	const [examTimetables, setExamTimetables] = useState<AnyRow[]>([])
	const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
	const [univExamCenters, setUnivExamCenters] = useState<AnyRow[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamType, setSelectedExamType] = useState<'0' | '1'>('0')
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [selectedExamTimetableId, setSelectedExamTimetableId] = useState<number | null>(null)
	const [selectedExamCenterId, setSelectedExamCenterId] = useState<number | null>(null)
	const [examSearch, setExamSearch] = useState('')

	// Results
	const [previewRows, setPreviewRows] = useState<AllocationRow[]>([])
	const [searchText, setSearchText] = useState('')
	const [flag, setFlag] = useState(false)

	// Dialogs / async
	const [assignSeatingOpen, setAssignSeatingOpen] = useState(false)
	const [assignSeatingBusy, setAssignSeatingBusy] = useState(false)
	const [autoAssignBusy, setAutoAssignBusy] = useState(false)

	// Print data
	const [roomWiseAllocations, setRoomWiseAllocations] = useState<AnyRow[]>([])
	const [roomSubjectAllocations, setRoomSubjectAllocations] = useState<AnyRow[]>([])
	const [groupwiseAllocations, setGroupwiseAllocations] = useState<AnyRow[]>([])
	const [invigilatorRows, setInvigilatorRows] = useState<AnyRow[]>([])
	const [studentAllotmentDetails, setStudentAllotmentDetails] = useState<AnyRow[]>([])
	const [coverSlipData, setCoverSlipData] = useState<AnyRow[]>([])
	const [, setLoadingPrintData] = useState(false)

	// ── Initial filters (Angular getExamFiltersList: univ_exam_filters ALL) ──────
	const fetchFilters = useCallback(async () => {
		const rows = await listUnivExamFiltersByCode({ loginEmpId: employeeId }).catch(() => [])
		const list = Array.isArray(rows) ? rows : []
		setFilterRows(list)
		setCourses(distinct(list, (r: AnyRow) => r.fk_course_id))
	}, [employeeId])

	useEffect(() => {
		void fetchFilters()
	}, [fetchFilters])

	const examName = useMemo(() => {
		const row = exams.find((e) => num(e.fk_exam_id) === num(selectedExamId))
		return String(row?.exam_name ?? '')
	}, [exams, selectedExamId])

	const selectedTimetable = useMemo(
		() => sessionOptions.find((s) => s.id === selectedExamTimetableId) ?? null,
		[sessionOptions, selectedExamTimetableId],
	)

	// ── Cascade handlers ─────────────────────────────────────────────────────────
	function resetBelowCourse() {
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setSelectedExamTimetableId(null)
		setSelectedExamCenterId(null)
		setExams([])
		setExamTimetables([])
		setSessionOptions([])
		setPreviewRows([])
		setFlag(false)
	}

	function handleCourseChange(courseId: number) {
		setSelectedCourseId(courseId)
		resetBelowCourse()
		const yearRows = filterRows.filter((r) => num(r.fk_course_id) === courseId)
		const years = distinct(yearRows, (r: AnyRow) => r.fk_academic_year_id).sort(
			(a, b) => num(b.academic_year) - num(a.academic_year),
		)
		setAcademicYears(years)
	}

	function buildExams(courseId: number, academicYearId: number, examType: '0' | '1') {
		const scoped = filterRows.filter(
			(r) => num(r.fk_course_id) === courseId && num(r.fk_academic_year_id) === academicYearId,
		)
		const uniqueExams = distinct(scoped, (r: AnyRow) => r.fk_exam_id)
		// examType: '1' = Internal, '0' = External (Angular is_internal_exam split).
		return uniqueExams.filter((x) => (examType === '1' ? !!x.is_internal_exam : !x.is_internal_exam))
	}

	function handleAcademicYearChange(academicYearId: number) {
		setSelectedAcademicYearId(academicYearId)
		setSelectedExamId(null)
		setSelectedExamTimetableId(null)
		setSelectedExamCenterId(null)
		setExamTimetables([])
		setSessionOptions([])
		setPreviewRows([])
		setFlag(false)
		if (selectedCourseId) setExams(buildExams(selectedCourseId, academicYearId, selectedExamType))
	}

	function handleExamTypeChange(examType: '0' | '1') {
		setSelectedExamType(examType)
		setSelectedExamId(null)
		setSelectedExamTimetableId(null)
		setSelectedExamCenterId(null)
		setExamTimetables([])
		setSessionOptions([])
		setPreviewRows([])
		setFlag(false)
		if (selectedCourseId && selectedAcademicYearId) {
			setExams(buildExams(selectedCourseId, selectedAcademicYearId, examType))
		}
	}

	async function handleExamChange(examId: number) {
		setSelectedExamId(examId)
		setSelectedExamTimetableId(null)
		setSelectedExamCenterId(null)
		setSessionOptions([])
		setPreviewRows([])
		setFlag(false)
		// Timetables + exam centers load together (Angular selectedExam → timetables; getExamCenters).
		const [tt, centers] = await Promise.all([
			listExamTimetablesByExam(examId).catch(() => []),
			listAllActiveUnivExamCenters().catch(() => []),
		])
		const ttList = Array.isArray(tt) ? tt : []
		ttList.sort((a: AnyRow, b: AnyRow) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
		setExamTimetables(ttList)
		setUnivExamCenters(Array.isArray(centers) ? centers : [])
	}

	function handleExamTimetableChange(examTimetableId: number) {
		setSelectedExamTimetableId(examTimetableId)
		setSelectedExamCenterId(null)
		setPreviewRows([])
		setFlag(false)
	}

	async function handleExamCenterChange(univExamcenterId: number) {
		setSelectedExamCenterId(univExamcenterId)
		setPreviewRows([])
		if (!selectedExamId || !selectedExamTimetableId) return
		const rows = await listExamRoomAllotmentsByCenter(
			univExamcenterId,
			selectedExamId,
			selectedExamTimetableId,
		).catch(() => [])
		setPreviewRows(mapAllocationRows(Array.isArray(rows) ? rows : []))
		setFlag(true)
	}

	// Build session options from the selected timetable row.
	useEffect(() => {
		if (!selectedExamTimetableId) {
			setSessionOptions([])
			return
		}
		const opts: SessionOption[] = examTimetables.map((t: AnyRow) => {
			const examDate = toDateStr(String(t.examDate ?? '')) || String(t.examDate ?? '')
			const session = String(t.examSessionName ?? t.examsessioninCatCode ?? 'SESSION').toUpperCase()
			return {
				id: num(t.examTimetableId),
				label: `${examDate} (${session})`,
				examDate,
				session,
				sessionId: num(t.examSessionId ?? t.fk_exam_session_id) || undefined,
			}
		})
		setSessionOptions(opts)
	}, [examTimetables, selectedExamTimetableId])

	const filteredExams = useMemo(() => {
		const q = examSearch.trim().toLowerCase()
		if (!q) return exams
		return exams.filter((e) => String(e.exam_name ?? '').toLowerCase().includes(q))
	}, [exams, examSearch])

	const filteredRows = useMemo(() => {
		const q = searchText.trim().toLowerCase()
		if (!q) return previewRows
		return previewRows.filter((r) => `${r.examDate} ${r.session} ${r.roomCode}`.toLowerCase().includes(q))
	}, [previewRows, searchText])

	const academicYearLabel = useMemo(() => {
		const row = academicYears.find((a) => num(a.fk_academic_year_id) === num(selectedAcademicYearId))
		return String(row?.academic_year ?? '')
	}, [academicYears, selectedAcademicYearId])

	const courseCode = useMemo(() => {
		const row = courses.find((c) => num(c.fk_course_id) === num(selectedCourseId))
		return String(row?.course_code ?? row?.courseCode ?? '')
	}, [courses, selectedCourseId])

	// ── Navigation (Angular: copyExistingSeating / addExamRoomAllotment / editExamRoomAllotment) ──
	function buildBaseParams(row?: AllocationRow) {
		const session = sessionOptions.find((s) => s.id === selectedExamTimetableId)
		const raw = row?.raw ?? {}
		return new URLSearchParams({
			collegeId: String(num(raw.collegeId ?? raw.fk_college_id) || ''),
			collegeCode: String(raw.college_code ?? raw.collegeCode ?? ''),
			univExamcenterId: String(selectedExamCenterId ?? ''),
			courseId: String(selectedCourseId ?? ''),
			examId: String(selectedExamId ?? ''),
			academicYearId: String(selectedAcademicYearId ?? ''),
			examTimetableId: String(selectedExamTimetableId ?? ''),
			examDate: toDateStr(session?.examDate ?? '') || String(row?.examDate ?? ''),
			courseCode,
			academicYear: academicYearLabel,
			examName,
		})
	}

	function handleCopyExistingSeating() {
		if (!selectedExamId || !selectedExamCenterId) {
			toast.error('Select an exam and exam center first.')
			return
		}
		router.push(`${CENTER_BASE}/copy-existing-seating?${buildBaseParams().toString()}`)
	}

	function handleAddRoomSeatingPlan() {
		if (!selectedExamId || !selectedExamCenterId) {
			toast.error('Select an exam and exam center first.')
			return
		}
		router.push(`${CENTER_BASE}/room-allotment?${buildBaseParams().toString()}`)
	}

	function handleSeatAllotStudents(row: AllocationRow) {
		const raw = row.raw ?? {}
		const params = buildBaseParams(row)
		params.set('examRoomAllotmentId', String(num(raw.examRoomAllotmentId ?? raw.exam_room_allotment_id ?? raw.id) || ''))
		params.set('subjectId', String(num(raw.subjectId ?? raw.subject_id) || ''))
		params.set('roomCode', row.roomCode || '-')
		params.set('examSession', row.session || '')
		params.set('sessionId', String(num(selectedTimetable?.sessionId ?? raw.examSessionId) || ''))
		// Dedicated center route reuses the shared seat-allot component; returnBase
		// brings Back here instead of to the college seating-plan page.
		params.set('returnBase', CENTER_BASE)
		router.push(`${CENTER_BASE}/seat-allot-students?${params.toString()}`)
	}

	// ── Assign / auto-assign (Angular AssignSeatingAllotment / autoAssign) ───────
	async function confirmAssignSeating() {
		if (!selectedExamId || !selectedExamTimetableId) return
		const session = sessionOptions.find((s) => s.id === selectedExamTimetableId)
		const examDate = toDateStr(session?.examDate) || ''
		const sessionId = num(session?.sessionId)
		try {
			setAssignSeatingBusy(true)
			await assignSeatingAllSession({ examId: selectedExamId, examDate, sessionId })
			toast.success('Seating allotment triggered.')
			setAssignSeatingOpen(false)
			if (selectedExamCenterId) await handleExamCenterChange(selectedExamCenterId)
		} catch {
			toast.error('Failed to assign seating. Please try again.')
		} finally {
			setAssignSeatingBusy(false)
		}
	}

	async function handleAutoAssignInvigilators() {
		if (!selectedExamTimetableId) {
			toast.error('Select an exam timetable first.')
			return
		}
		try {
			setAutoAssignBusy(true)
			await popExamInvigilator(selectedExamTimetableId)
			toast.success('Invigilators auto-assigned.')
		} catch {
			toast.error('Failed to auto-assign invigilators.')
		} finally {
			setAutoAssignBusy(false)
		}
	}

	const columnDefs = useMemo<ColDef[]>(
		() => [
			{ headerName: 'Sl.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
			{ field: 'examDate', headerName: 'Exam Date', minWidth: 120, valueFormatter: (p: any) => formatTableDate(p.value) },
			{ field: 'session', headerName: 'Exam Session', minWidth: 140 },
			{ field: 'roomCode', headerName: 'Room Code', minWidth: 150, valueFormatter: (p: any) => formatRoomCode(p.value) },
			{ field: 'bookedSeats', headerName: 'Booked Seats', width: 120, flex: 0 },
			{ field: 'blockedSeats', headerName: 'Blocked Seats', width: 130, flex: 0 },
			{ field: 'availableSeats', headerName: 'Available Seats', width: 140, flex: 0 },
			{ field: 'isActive', headerName: 'Status', width: 90, flex: 0, cellRenderer: statusRenderer },
			{
				headerName: 'Actions',
				width: 160,
				flex: 0,
				cellRenderer: (p: any) => (
					<button
						type="button"
						className="text-[12px] text-[hsl(var(--primary))] hover:underline"
						onClick={() => handleSeatAllotStudents(p.data)}
					>
						Seat Allot Students
					</button>
				),
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedExamCenterId, selectedExamId, selectedExamTimetableId, sessionOptions],
	)

	// ── Print layouts ────────────────────────────────────────────────────────────
	if (printMode) {
		const session = sessionOptions.find((s) => s.id === selectedExamTimetableId)
		const headerDate = toDateStr(session?.examDate ?? '') || ''
		const headerSession = session?.session ?? ''

		function PrintShell({ title, subtitle, total, children }: { title: string; subtitle?: string; total?: number; children: React.ReactNode }) {
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
					<div className="text-center mb-3">
						<img
							src="/college-banner.png"
							alt=""
							style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }}
							onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
						/>
						<p style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px', margin: 0, textTransform: 'uppercase' }}>{title}</p>
						<p style={{ fontSize: '14px', margin: '6px 0 0 0' }}>{subtitle ?? examName}</p>
					</div>
					<div className="flex justify-between text-[12px] mb-3 px-1">
						<span>Date : <b>{headerDate || '—'}</b></span>
						<span>Session : <b>{headerSession || '—'}</b></span>
					</div>
					{children}
					<div className="flex justify-between mt-10 text-[12px] px-1">
						{total != null && <div>Total No. of Students : <b>{total}</b></div>}
						<div style={{ marginLeft: 'auto' }}>Controller of Examinations</div>
					</div>
				</div>
			)
		}

		const cellStyle = { border: '1px solid #000', padding: '4px 6px', textAlign: 'left' as const }

		if (printMode === 'room-wise-seating') {
			const grouped = roomWiseAllocations.reduce<Record<string, AnyRow[]>>((acc, curr) => {
				const key = String(curr?.room_name ?? '—')
				;(acc[key] ||= []).push(curr)
				return acc
			}, {})
			const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
			const total = roomWiseAllocations.reduce((s, r) => s + num(r.cnt), 0)
			return (
				<PrintShell title="Seating Arrangement" total={total}>
					{groups.length === 0 ? (
						<p className="text-[11px] text-center py-6">No room-wise allotment data.</p>
					) : (
						groups.map(({ records }, gi) => (
							<table key={`rws-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={cellStyle}>S.No.</th>
										<th style={cellStyle}>Room Number</th>
										<th style={cellStyle}>H.T. Numbers</th>
										<th style={cellStyle}>Branch</th>
										<th style={cellStyle}>No. of Students</th>
									</tr>
								</thead>
								<tbody>
									{records.map((a: AnyRow, i: number) => (
										<tr key={i}>
											<td style={cellStyle}>{i + 1}</td>
											<td style={cellStyle}>{a.room_name ?? '—'}</td>
											<td style={cellStyle}>{a['min(tssd.hallticket_number)'] ?? '—'} to {a['max(tssd.hallticket_number)'] ?? '—'}</td>
											<td style={cellStyle}>{a.group_code ?? '—'}</td>
											<td style={cellStyle}>{a.cnt ?? 0}</td>
										</tr>
									))}
								</tbody>
							</table>
						))
					)}
				</PrintShell>
			)
		}

		if (printMode === 'room-subject-counts') {
			const grouped = roomSubjectAllocations.reduce<Record<string, AnyRow[]>>((acc, curr) => {
				const key = String(curr?.room_name ?? '—')
				;(acc[key] ||= []).push(curr)
				return acc
			}, {})
			const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
			const total = roomSubjectAllocations.reduce((s, r) => s + num(r.cnt), 0)
			return (
				<PrintShell title="Seating Arrangement" subtitle={String(roomSubjectAllocations[0]?.exam_label_name ?? examName)} total={total}>
					{groups.length === 0 ? (
						<p className="text-[11px] text-center py-6">No room-subject allotment data.</p>
					) : (
						groups.map(({ records }, gi) => (
							<table key={`rsc-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={cellStyle}>S.No.</th>
										<th style={cellStyle}>Room Number</th>
										<th style={cellStyle}>Subject</th>
										<th style={cellStyle}>No. of Question Papers</th>
									</tr>
								</thead>
								<tbody>
									{records.map((a: AnyRow, i: number) => (
										<tr key={i}>
											<td style={cellStyle}>{i + 1}</td>
											<td style={cellStyle}>{a.room_name ?? '—'}</td>
											<td style={cellStyle}>{a.subject_name ?? '—'}({a.subject_code ?? '—'})</td>
											<td style={cellStyle}>{a.cnt ?? 0}</td>
										</tr>
									))}
								</tbody>
							</table>
						))
					)}
				</PrintShell>
			)
		}

		if (printMode === 'group-wise-seating') {
			const bySubject = new Map<string, AnyRow[]>()
			for (const r of groupwiseAllocations) {
				const key = String(r?.subject_name ?? '—')
				if (!bySubject.has(key)) bySubject.set(key, [])
				bySubject.get(key)!.push(r)
			}
			let sno = 1
			const groupedSubjects = Array.from(bySubject.entries()).map(([subject_name, rows]) => {
				const byBranch = new Map<string, AnyRow[]>()
				for (const r of rows) {
					const key = String(r?.group_code ?? '—')
					if (!byBranch.has(key)) byBranch.set(key, [])
					byBranch.get(key)!.push(r)
				}
				const branches = Array.from(byBranch.entries()).map(([branch, allocations]) => ({ sno: sno++, branch, allocations }))
				return { subject_name, branches }
			})
			return (
				<PrintShell title="Seating Arrangement" subtitle={String(groupwiseAllocations[0]?.exam_label_name ?? examName)}>
					{groupedSubjects.length === 0 ? (
						<p className="text-[11px] text-center py-6">No group-wise allotment data.</p>
					) : (
						groupedSubjects.map((subject) => (
							<div key={subject.subject_name} style={{ marginBottom: '24px' }}>
								<h3 style={{ marginTop: '24px', fontSize: '14px' }}>Subject: {subject.subject_name}</h3>
								<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
									<thead>
										<tr>
											<th style={cellStyle}>S.No.</th>
											<th style={cellStyle}>Branch</th>
											<th style={cellStyle}>H.T. Numbers</th>
											<th style={cellStyle}>Room Number</th>
											<th style={cellStyle}>No. of Students</th>
										</tr>
									</thead>
									<tbody>
										{subject.branches.flatMap((group) =>
											group.allocations.map((a: AnyRow, i: number) => (
												<tr key={`${group.branch}-${i}`}>
													{i === 0 && <td style={cellStyle} rowSpan={group.allocations.length}>{group.sno}</td>}
													{i === 0 && <td style={cellStyle} rowSpan={group.allocations.length}>{group.branch}</td>}
													<td style={cellStyle}><strong>{a['min(tssd.hallticket_number)'] ?? '—'} to {a['max(tssd.hallticket_number)'] ?? '—'}</strong></td>
													<td style={cellStyle}>{a.room_name ?? '—'}</td>
													<td style={cellStyle}>{a.cnt ?? 0}</td>
												</tr>
											)),
										)}
									</tbody>
								</table>
							</div>
						))
					)}
				</PrintShell>
			)
		}

		if (printMode === 'attendance' || printMode === 'student' || printMode === 'groupwise-stickers') {
			// All three render per-student rows from roomwise_OMR_students.
			const byKey = new Map<string, AnyRow[]>()
			for (const s of studentAllotmentDetails) {
				const key = [s.fk_course_group_id, s.fk_subject_id, s.room_id, s.fk_examtype_catdet_id].join('|')
				if (!byKey.has(key)) byKey.set(key, [])
				byKey.get(key)!.push(s)
			}
			const groups = Array.from(byKey.values()).map((students) =>
				students.slice().sort((a, b) => String(a.hallticket_number).localeCompare(String(b.hallticket_number), undefined, { numeric: true })),
			)
			const title = printMode === 'attendance' ? 'Attendance Sheet' : printMode === 'groupwise-stickers' ? 'Group-Wise Stickers' : 'Seating Stickers'
			if (groups.length === 0) {
				return <PrintShell title={title}><p className="text-[11px] text-center py-6">No allotted students.</p></PrintShell>
			}
			if (printMode === 'attendance') {
				return (
					<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
						{groups.map((students, gi) => {
							const head = students[0] ?? {}
							return (
								<div key={gi} style={{ padding: '20px', pageBreakAfter: 'always' }}>
									<h4 style={{ textAlign: 'center', fontWeight: 'bold' }}>ATTENDANCE SHEET</h4>
									<h4 style={{ textAlign: 'center' }}>{head.exam_label_name} ({head.exam_type_name})</h4>
									<div className="flex justify-between text-[12px] my-2">
										<span><b>Branch :</b> {head.group_code}</span>
										<span><b>Date :</b> {formatTableDate(head.exam_date)}</span>
										<span><b>Room :</b> {head.room_name}</span>
									</div>
									<div className="flex justify-between text-[12px] mb-2">
										<span><b>Subject:</b> {head.subject_name}</span>
										<span><b>Session:</b> {head.sessin_time}</span>
									</div>
									<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
										<thead>
											<tr>
												<th style={cellStyle}>S.NO</th>
												<th style={cellStyle}>H.T. NO.</th>
												<th style={cellStyle}>Student Name</th>
												<th style={cellStyle}>Signature of the Student</th>
											</tr>
										</thead>
										<tbody>
											{students.map((s, i) => (
												<tr key={i}>
													<td style={cellStyle}>{i + 1}</td>
													<td style={cellStyle}>{s.hallticket_number}</td>
													<td style={cellStyle}>{s.student_name}</td>
													<td style={cellStyle}></td>
												</tr>
											))}
										</tbody>
									</table>
									<div className="flex justify-between mt-8 text-[12px]">
										<span>Signature of the Invigilator - I</span>
										<span>Signature of the Invigilator - II</span>
										<span>Controller of Examinations</span>
									</div>
								</div>
							)
						})}
					</div>
				)
			}
			// Stickers: HT-number sticker grid per group (printHn parity).
			return (
				<div className="text-black" style={{ fontFamily: 'Arial, sans-serif', padding: '12px' }}>
					{groups.map((students, gi) => (
						<div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
							{students.map((s, i) => (
								<div key={i} style={{ border: '1px solid #000', padding: '8px 12px', minWidth: '160px', textAlign: 'center' }}>
									<div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.hallticket_number}</div>
									<div style={{ fontSize: '10px' }}>{s.room_name}{printMode === 'groupwise-stickers' ? ` / ${s.group_code ?? ''}` : ''}</div>
								</div>
							))}
						</div>
					))}
				</div>
			)
		}

		if (printMode === 'invigilator') {
			const head = invigilatorRows[0] ?? {}
			return (
				<PrintShell title="Invigilators">
					{invigilatorRows.length === 0 ? (
						<p className="text-[11px] text-center py-6">No invigilators allotted.</p>
					) : (
						<>
							<div className="flex justify-between text-[12px] mb-2 px-1">
								<span><b>Exam Date :</b> {formatTableDate(head.examDate)}</span>
								<span><b>Session :</b> ({tConvert(head.sessionStartTime)}-{tConvert(head.sessionEndTime)})</span>
							</div>
							<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={cellStyle}>S.NO</th>
										<th style={cellStyle}>Room</th>
										<th style={cellStyle}>Invigilator</th>
										<th style={cellStyle}>Signature</th>
									</tr>
								</thead>
								<tbody>
									{invigilatorRows.map((r, i) => (
										<tr key={i}>
											<td style={cellStyle}>{i + 1}</td>
											<td style={cellStyle}>{r.roomName}</td>
											<td style={cellStyle}>{r.invigilatorEmpName}</td>
											<td style={cellStyle}></td>
										</tr>
									))}
								</tbody>
							</table>
						</>
					)}
				</PrintShell>
			)
		}

		if (printMode === 'cover-slip') {
			// Group exam_std_att_details by subject|year|exam_type (Angular groupedCoverSlipData).
			const groupedMap = new Map<string, AnyRow>()
			for (const item of coverSlipData) {
				const key = `${item.fk_subject_id}|${item.course_year}|${item.exam_type}`
				if (!groupedMap.has(key)) {
					groupedMap.set(key, {
						course_name: item.course_name, exam_type: item.exam_type, course_year: item.course_year,
						subject_code: item.subject_code, subject_name: item.subject_name,
						exam_label_name: item.exam_label_name, exam_date: item.exam_date,
						session_start_time: item.session_start_time, session_end_time: item.session_end_time,
						groups: [] as AnyRow[], total_present: 0, total_absent: 0, total_malpractice: 0,
					})
				}
				const g = groupedMap.get(key)!
				const present = num(item.Present)
				const absent = num(item.Absent) || num(item.registered_for_exam) - present
				const mal = num(item.mal_practice)
				if (item.course_group && (present > 0 || absent > 0 || mal > 0)) {
					g.groups.push({ course_group: item.course_group, present, absent, mal_practice: mal })
					g.total_present += present
					g.total_absent += absent
					g.total_malpractice += mal
				}
			}
			const groups = Array.from(groupedMap.values())
			const head = groups[0] ?? {}
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}>
					<h4 style={{ textAlign: 'center', fontWeight: 'bold' }}>CoverSlip</h4>
					<h4 style={{ textAlign: 'center' }}>{head.exam_label_name}</h4>
					<div className="flex justify-between text-[12px] my-2">
						<span><b>Exam Date :</b> {formatTableDate(head.exam_date)}</span>
						<span><b>Session :</b> ({tConvert(head.session_start_time)}-{tConvert(head.session_end_time)})</span>
					</div>
					{groups.map((group, i) => (
						<table key={i} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
							<thead>
								<tr>
									<th style={cellStyle}>S.NO</th><th style={cellStyle}>Subject Details</th><th style={cellStyle}>Packing Slip</th>
									<th style={cellStyle}>Present</th><th style={cellStyle}>Absent</th><th style={cellStyle}>MalPractice</th>
									<th style={cellStyle}>Other</th><th style={cellStyle}>Buffer</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td style={cellStyle}>{i + 1}</td>
									<td style={cellStyle}>{group.course_name}/{group.exam_type}/{group.course_year}<br />{group.subject_code} - {group.subject_name}</td>
									<td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td><td style={cellStyle}></td>
								</tr>
								{group.groups.map((d: AnyRow, di: number) => (
									<tr key={di}>
										<td style={cellStyle}></td><td style={cellStyle}>{d.course_group || '--'}</td><td style={cellStyle}></td>
										<td style={cellStyle}>{d.present || 0}</td><td style={cellStyle}>{d.absent || 0}</td><td style={cellStyle}>{d.mal_practice || 0}</td>
										<td style={cellStyle}></td><td style={cellStyle}></td>
									</tr>
								))}
								<tr>
									<td style={cellStyle}></td><td style={cellStyle}><b>TOTALS</b></td><td style={cellStyle}></td>
									<td style={cellStyle}><b>{group.total_present}</b></td><td style={cellStyle}><b>{group.total_absent}</b></td><td style={cellStyle}><b>{group.total_malpractice}</b></td>
									<td style={cellStyle}></td><td style={cellStyle}></td>
								</tr>
							</tbody>
						</table>
					))}
				</div>
			)
		}

		if (printMode === 'packing-slip') {
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif' }}>
					{coverSlipData.map((data, i) => (
						<div key={i} style={{ padding: '20px', pageBreakAfter: 'always' }}>
							<h4 style={{ textAlign: 'center', fontWeight: 'bold' }}>Packing Slip</h4>
							<h4 style={{ textAlign: 'center' }}>{data.exam_label_name}</h4>
							<div className="flex justify-between text-[12px] my-2">
								<span><b>Exam Date :</b> {formatTableDate(data.exam_date)}</span>
								<span><b>Session :</b> ({tConvert(data.session_start_time)}-{tConvert(data.session_end_time)})</span>
							</div>
							<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={cellStyle}>S.NO</th><th style={cellStyle}>Subject Details</th><th style={cellStyle}>Packing Slip</th>
										<th style={cellStyle}>Present</th><th style={cellStyle}>Absent</th><th style={cellStyle}>MalPractise</th>
										<th style={cellStyle}>Other</th><th style={cellStyle}>Buffer</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td style={cellStyle}>1</td>
										<td style={cellStyle}>{data.course_name}/{data.course_group}/{data.exam_type}/{data.course_year}<br />{data.subject_code} - {data.subject_name}</td>
										<td style={cellStyle}></td>
										<td style={cellStyle}>{data.Present}</td>
										<td style={cellStyle}>{num(data.registered_for_exam) - num(data.Present)}</td>
										<td style={cellStyle}>{data.mal_practice}</td>
										<td style={cellStyle}></td><td style={cellStyle}></td>
									</tr>
								</tbody>
							</table>
						</div>
					))}
				</div>
			)
		}
	}

	// ── Print toolbar handler (loads the per-mode data, then opens print) ────────
	async function onPrint(mode: PrintMode) {
		if (!selectedCourseId || !selectedExamId) {
			triggerPrint(mode)
			return
		}
		const session = sessionOptions.find((s) => s.id === selectedExamTimetableId)
		const examDate = session?.examDate ?? filteredRows[0]?.examDate ?? ''
		const sessionId = num(session?.sessionId)
		const params = { courseId: selectedCourseId, examId: selectedExamId, examDate, sessionId }
		setLoadingPrintData(true)
		try {
			if (mode === 'room-wise-seating') setRoomWiseAllocations(await getRoomwiseAllotmentSummary(params).catch(() => []))
			else if (mode === 'room-subject-counts') setRoomSubjectAllocations(await getRoomwiseSubjectSummary(params).catch(() => []))
			else if (mode === 'group-wise-seating') setGroupwiseAllocations(await getGroupwiseAllotmentSummary(params).catch(() => []))
			else if (mode === 'invigilator' && selectedExamTimetableId) setInvigilatorRows(await listExamInvigilationAllotmentsByTimetable(selectedExamTimetableId).catch(() => []))
			else if (mode === 'cover-slip' || mode === 'packing-slip') {
				if (selectedExamTimetableId) {
					setCoverSlipData(await listExamStdAttDetails({ examId: selectedExamId, courseId: selectedCourseId, examTimetableId: selectedExamTimetableId }).catch(() => []))
				}
			} else if (mode === 'student' || mode === 'groupwise-stickers' || mode === 'attendance') {
				setStudentAllotmentDetails(await listRoomwiseOmrStudents({ examId: selectedExamId, courseId: selectedCourseId, examDate, sessionId }).catch(() => []))
			}
		} finally {
			setLoadingPrintData(false)
		}
		triggerPrint(mode)
	}

	const printButtons: Array<[string, PrintMode]> = [
		['Room Wise Seating Print', 'room-wise-seating'],
		['Room Subject Counts Print', 'room-subject-counts'],
		['Group Wise Seating Print', 'group-wise-seating'],
		['Print Attendance Sheet', 'attendance'],
		['Print Stickers', 'student'],
		['Group-Wise Stickers', 'groupwise-stickers'],
		['Print Invigilator', 'invigilator'],
		['Cover Slip', 'cover-slip'],
		['Packing Slip', 'packing-slip'],
	]

	const examTypeOptions = [
		{ value: '0', label: 'External' },
		{ value: '1', label: 'Internal' },
	]

	return (
		<PageContainer className="space-y-4">
			<PageHeader title="Exam Room Seating Plan" subtitle="Exam Centers › Exam Room Seating Plan" />

			{/* Filters */}
			<div className="app-card overflow-hidden">
				<button
					type="button"
					className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-4 py-3"
					onClick={() => setFilterOpen((o) => !o)}
				>
					<h2 className="app-card-title">Exam Room Seating Plan</h2>
					<span className="inline-flex items-center gap-1.5 text-[12px] text-slate-700">Filter <Filter className="h-3.5 w-3.5" /></span>
				</button>
				{(
					<div className="px-3 py-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
						<div className="space-y-1">
							<Label>Course *</Label>
							<Select value={selectedCourseId != null ? String(selectedCourseId) : undefined} onValueChange={(v) => handleCourseChange(Number(v))}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Course" /></SelectTrigger>
								<SelectContent>
									{courses.map((c) => (
										<SelectItem key={num(c.fk_course_id)} value={String(num(c.fk_course_id))}>{c.course_code}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Year *</Label>
							<Select value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined} onValueChange={(v) => handleAcademicYearChange(Number(v))} disabled={!selectedCourseId}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
								<SelectContent>
									{academicYears.map((a) => (
										<SelectItem key={num(a.fk_academic_year_id)} value={String(num(a.fk_academic_year_id))}>{a.academic_year}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Type *</Label>
							<Select value={selectedExamType} onValueChange={(v) => handleExamTypeChange(v as '0' | '1')} disabled={!selectedAcademicYearId}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Type" /></SelectTrigger>
								<SelectContent>
									{examTypeOptions.map((o) => (
										<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 lg:col-span-3">
							<Label>Exam Master *</Label>
							<Select value={selectedExamId != null ? String(selectedExamId) : undefined} onValueChange={(v) => void handleExamChange(Number(v))} disabled={!selectedAcademicYearId}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Exam Master" /></SelectTrigger>
								<SelectContent>
									<div className="px-2 py-1.5">
										<SearchInput placeholder="Search Exam…" value={examSearch} onChange={setExamSearch} className="w-full" />
									</div>
									{filteredExams.length === 0 && <div className="px-2 py-1.5 text-[12px] text-muted-foreground">No exams found</div>}
									{filteredExams.map((e) => (
										<SelectItem key={num(e.fk_exam_id)} value={String(num(e.fk_exam_id))}>
											{e.exam_name} ({formatTableDate(e.from_date)} - {formatTableDate(e.to_date)})
											{e.is_internal_exam ? ' (Internal)' : ''}{e.is_regular_exam ? ' (Regular)' : ''}{e.is_supply_exam ? ' (Supple)' : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 lg:col-span-2">
							<Label>Exam Timetable *</Label>
							<Select value={selectedExamTimetableId != null ? String(selectedExamTimetableId) : undefined} onValueChange={(v) => handleExamTimetableChange(Number(v))} disabled={!selectedExamId}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Exam Timetable" /></SelectTrigger>
								<SelectContent>
									{examTimetables.length === 0 && <div className="px-2 py-1.5 text-[12px] text-muted-foreground">No timetable found</div>}
									{examTimetables.map((t) => (
										<SelectItem key={num(t.examTimetableId)} value={String(num(t.examTimetableId))}>
											<span>{formatTableDate(t.examDate)} </span>
											<span className="text-blue-700">({t.examSessionName})</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 lg:col-span-2">
							<Label>Exam Center *</Label>
							<Select value={selectedExamCenterId != null ? String(selectedExamCenterId) : undefined} onValueChange={(v) => void handleExamCenterChange(Number(v))} disabled={!selectedExamTimetableId}>
								<SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Exam Center" /></SelectTrigger>
								<SelectContent>
									{univExamCenters.map((c) => (
										<SelectItem key={num(c.univExamcenterId)} value={String(num(c.univExamcenterId))}>{c.examcenterCode}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}
			</div>

			{/* Results */}
			{flag && (
				<div className="app-card p-3 space-y-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<SearchInput className="w-full max-w-sm" placeholder="Search…" value={searchText} onChange={setSearchText} />
						<div className="flex flex-wrap items-center gap-2 sm:ml-auto">
							<Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={handleCopyExistingSeating}>
								<Plus className="h-3.5 w-3.5 shrink-0" /> Copy Existing Seating
							</Button>
							<Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={handleAddRoomSeatingPlan}>
								<Plus className="h-3.5 w-3.5 shrink-0" /> Add Room Seating Plan
							</Button>
							<Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => { if (!selectedExamId || !selectedExamTimetableId) { toast.error('Select an exam and exam timetable first.'); return } setAssignSeatingOpen(true) }}>
								<Plus className="h-3.5 w-3.5 shrink-0" /> Assign Seating
							</Button>
						</div>
					</div>

					<div className="rounded-lg border border-border/90 bg-muted/40/70 p-3 print-hide">
						<p className="mb-2 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Print &amp; exports</p>
						<div className="flex flex-wrap gap-1.5">
							{printButtons.map(([label, mode]) => (
								<Button key={label} type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => void onPrint(mode)}>
									<Printer className="h-3 w-3 shrink-0 text-muted-foreground" /> {label}
								</Button>
							))}
						</div>
					</div>

					<DataTable rowData={filteredRows} columnDefs={columnDefs} pagination />

					<div className="flex justify-end">
						<Button type="button" size="sm" className="h-8 text-[12px]" onClick={handleAutoAssignInvigilators} disabled={autoAssignBusy}>
							{autoAssignBusy ? 'Assigning…' : 'Auto Assign Invigilators'}
						</Button>
					</div>
				</div>
			)}

			<ConfirmDialog
				open={assignSeatingOpen}
				title="Assign Seating Allotment"
				headerIcon={<CalendarDays className="h-5 w-5 shrink-0 text-primary" />}
				contentClassName="sm:max-w-[400px]"
				confirmLabel="OK"
				cancelLabel="Cancel"
				confirmFirst
				confirmVariant="default"
				showCloseButton={false}
				isLoading={assignSeatingBusy}
				onConfirm={confirmAssignSeating}
				onCancel={() => setAssignSeatingOpen(false)}
			>
				<p>
					If you have already created a seating plan, this action will erase the existing plan and
					generate a new one. You may also need to reprint all related summaries.
				</p>
				<p className="text-center text-base font-semibold">
					Are you sure you want to continue?
					<br />
					Press OK to proceed, or Cancel to go back.
				</p>
			</ConfirmDialog>
		</PageContainer>
	)
}
