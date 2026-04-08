'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import { getCollegeFilters, listCourseYears, listExamMasters, getExamTimetableDetails, listExamSessions } from '@/services/examination'
import { listExamInvigilationAllotments, listExamRoomAllotments } from '@/services/seating-plan'

type AllocationRow = {
	sl: number
	examDate: string
	session: string
	roomCode: string
	bookedSeats: number
	blockedSeats: number
	availableSeats: number
}

type SessionOption = {
	id: number
	label: string
}

export default function SeatingPlanSetupPage() {
	// Top-level filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])
	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)
	const [selectedExamType, setSelectedExamType] = useState<'0' | '1' | ''>('')
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [examMasterSearch, setExamMasterSearch] = useState('')
	const [examTimetables, setExamTimetables] = useState<any[]>([])
	const [selectedExamTimetableId, setSelectedExamTimetableId] = useState<number | null>(null)
	const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])

	// Table data from selected exam session/timetable
	const [previewRows, setPreviewRows] = useState<AllocationRow[]>([])
	const [searchText, setSearchText] = useState('')

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const { filtersData: f, academicData: ay } = await getCollegeFilters(0, 0)
			setFiltersData(f ?? [])
			setAcademicData(ay ?? [])
			const distinctCourses = distinct(f ?? [], (r) => r.fk_course_id)
			setCourses(distinctCourses)
			if (distinctCourses.length > 0) {
				await handleCourseChange(distinctCourses[0].fk_course_id, f, ay)
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	async function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setCourseYears([])
		setSelectedCourseYearId(null)

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)

		const yrs = await listCourseYears(courseId).catch(() => [])
		const arr = Array.isArray(yrs) ? yrs : []
		setCourseYears(arr)
		if (arr.length > 0) {
			const firstId =
				arr[0].courseYearId ??
				arr[0].fk_course_year_id ??
				arr[0].course_year_id ??
				arr[0].id ??
				null
			if (firstId != null) setSelectedCourseYearId(firstId)
		}
	}

	useEffect(() => {
		async function loadExamMasters() {
			setExamMasters([])
			setSelectedExamId(null)
			setExamTimetables([])
			setSelectedExamTimetableId(null)
			if (!selectedCourseId || !selectedAcademicYearId) return
			const q = buildQuery({
				'Course.courseId': selectedCourseId,
				'AcademicYear.academicYearId': selectedAcademicYearId,
				isActive: true,
			})
			const { listExamMasters } = await import('@/services/examination')
			const exams = await listExamMasters(q).catch(() => [])
			const list = Array.isArray(exams) ? exams : []
			setExamMasters(list)
			if (list.length > 0) setSelectedExamId(list[0].examId ?? list[0].id ?? null)
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	const filteredExamMasters = useMemo(() => {
		const q = examMasterSearch.trim().toLowerCase()
		if (!q) return examMasters
		return examMasters.filter((e: any) =>
			String(e.examName ?? '').toLowerCase().includes(q),
		)
	}, [examMasters, examMasterSearch])

	useEffect(() => {
		async function loadExamTimetables() {
			setExamTimetables([])
			setSelectedExamTimetableId(null)
			setPreviewRows([])
			setSessionOptions([])
			if (!selectedCourseId || !selectedExamId || !selectedCourseYearId) return
			const rows = await getExamTimetableDetails(selectedCourseYearId, selectedCourseId, selectedExamId).catch(() => [])
			const list = Array.isArray(rows) ? rows : []
			setExamTimetables(list)
			if (list.length > 0) {
				const opts: SessionOption[] = list.map((t: any, i: number) => ({
					id: Number(t.examTimetableId ?? i + 1),
					label: `${t.examDate ?? ''} (${String(t.examSessionName ?? 'Session').toUpperCase()})`,
				}))
				setSessionOptions(opts)
			} else {
				// Fallback: keep Exam Session usable using active session master list
				const sessions = await listExamSessions().catch(() => [])
				const opts: SessionOption[] = (Array.isArray(sessions) ? sessions : []).map((s: any, i: number) => ({
					id: Number(s.examSessionId ?? i + 1),
					label: String(s.examSessionName ?? `Session ${i + 1}`),
				}))
				setSessionOptions(opts)
			}
		}
		loadExamTimetables()
	}, [selectedCourseId, selectedCourseYearId, selectedExamId])

	useEffect(() => {
		function mapSelectedSessionRows() {
			setPreviewRows([])
			if (!selectedExamTimetableId) return
			const rows = examTimetables.filter((t: any) => Number(t.examTimetableId) === Number(selectedExamTimetableId))
			const mapped = rows.map((r: any, i: number) => ({
				sl: i + 1,
				examDate: String(r.examDate ?? ''),
				session: String(r.examSessionName ?? ''),
				roomCode: String(r.roomCode ?? r.room ?? r.block_room ?? '-'),
				bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? 0),
				blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
				availableSeats: Number(r.availableSeats ?? r.available_seats ?? 0),
			}))
			setPreviewRows(mapped)
		}
		mapSelectedSessionRows()
	}, [selectedExamTimetableId, examTimetables])

	async function handleCopyExistingSeating() {
		if (!selectedExamId || !selectedExamTimetableId) return
		const rows = await listExamRoomAllotments(selectedExamId, selectedExamTimetableId).catch(() => [])
		const mapped: AllocationRow[] = (rows ?? []).map((r: any, i: number) => ({
			sl: i + 1,
			examDate: String(r.examDate ?? ''),
			session: String(r.examSessionName ?? ''),
			roomCode: String(r.roomCode ?? r.room ?? r.block_room ?? '-'),
			bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? r.noOfSeats ?? 0),
			blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
			availableSeats: Number(r.availableSeats ?? r.available_seats ?? 0),
		}))
		setPreviewRows(mapped)
	}

	async function handleAssignSeating() {
		if (!selectedExamTimetableId) return
		const rows = await listExamInvigilationAllotments(selectedExamTimetableId).catch(() => [])
		if (!rows.length) {
			alert('No invigilation records found for selected session.')
			return
		}
		// Best-effort mapping from invigilation assignments to seating view.
		const mapped: AllocationRow[] = rows.map((r: any, i: number) => ({
			sl: i + 1,
			examDate: String(r.examDate ?? ''),
			session: String(r.examSessionName ?? ''),
			roomCode: String(r.roomCode ?? r.room ?? r.block_room ?? '-'),
			bookedSeats: Number(r.bookedSeats ?? r.noOfStudents ?? 0),
			blockedSeats: Number(r.blockedSeats ?? 0),
			availableSeats: Number(r.availableSeats ?? 0),
		}))
		setPreviewRows(mapped)
	}

	function handleAddRoomSeatingPlan() {
		const roomCode = window.prompt('Enter Room Code', '')
		if (!roomCode) return
		const booked = Number(window.prompt('Enter Booked Seats', '0') ?? '0')
		const blocked = Number(window.prompt('Enter Blocked Seats', '0') ?? '0')
		const available = Number(window.prompt('Enter Available Seats', '0') ?? '0')
		const selectedSession = sessionOptions.find((s) => s.id === selectedExamTimetableId)?.label ?? ''
		const next = previewRows.length + 1
		setPreviewRows((s) => [
			...s,
			{
				sl: next,
				examDate: selectedSession.split(' (')[0] ?? '',
				session: selectedSession.includes('(') ? selectedSession.split('(')[1].replace(')', '') : '',
				roomCode: roomCode.trim(),
				bookedSeats: Number.isFinite(booked) ? booked : 0,
				blockedSeats: Number.isFinite(blocked) ? blocked : 0,
				availableSeats: Number.isFinite(available) ? available : 0,
			},
		])
	}

	const filteredRows = useMemo(() => {
		const q = searchText.trim().toLowerCase()
		if (!q) return previewRows
		return previewRows.filter((r) =>
			`${r.examDate} ${r.session} ${r.roomCode}`.toLowerCase().includes(q),
		)
	}, [previewRows, searchText])

	return (
		<div className="p-6 space-y-3">
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Seating Plan Setup</h2>
					<p className="mt-0.5 text-[12px] text-muted-foreground">Mirror of legacy workflow to allocate rooms and generate seating.</p>
				</div>

				<div className="px-3 py-3">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
						<div className="space-y-1">
							<Label>Course</Label>
							<Select value={selectedCourseId != null ? String(selectedCourseId) : undefined} onValueChange={(v) => handleCourseChange(Number(v))} disabled={loadingFilters}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={loadingFilters ? 'Loading…' : 'Select Course'} />
								</SelectTrigger>
								<SelectContent>
									{courses.map((c) => (
										<SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>
											{c.course_code ?? c.course_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Year</Label>
							<Select value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined} onValueChange={(v) => setSelectedAcademicYearId(Number(v))} disabled={academicYears.length === 0}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Year" />
								</SelectTrigger>
								<SelectContent>
									{academicYears.map((a) => (
										<SelectItem key={a.fk_academic_year_id} value={String(a.fk_academic_year_id)}>
											{a.academic_year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Type</Label>
							<Select value={selectedExamType || undefined} onValueChange={(v: '0' | '1') => setSelectedExamType(v)}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">External</SelectItem>
									<SelectItem value="1">Internal</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Master</Label>
							<Select value={selectedExamId != null ? String(selectedExamId) : undefined} onValueChange={(v) => setSelectedExamId(Number(v))} disabled={examMasters.length === 0}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Master" />
								</SelectTrigger>
								<SelectContent>
									<div className="p-2 border-b">
										<input
											className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px]"
											placeholder="Search Exam..."
											value={examMasterSearch}
											onChange={(e) => setExamMasterSearch(e.target.value)}
										/>
									</div>
									{filteredExamMasters.map((e) => (
										<SelectItem key={e.examId ?? e.id} value={String(e.examId ?? e.id)}>
											{e.examName ?? '—'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Exam Timetable *</Label>
							<Select value={selectedExamTimetableId != null ? String(selectedExamTimetableId) : undefined} onValueChange={(v) => setSelectedExamTimetableId(Number(v))} disabled={sessionOptions.length === 0}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Timetable" />
								</SelectTrigger>
								<SelectContent>
									{sessionOptions.map((s) => (
										<SelectItem key={`session-${s.id}`} value={String(s.id)}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</div>

			{selectedExamTimetableId != null && (
				<div className="app-card p-4 space-y-3">
					<div className="flex items-center gap-3">
						<div className="relative w-full max-w-sm">
							<input
								className="h-9 w-full rounded-full border border-slate-300 bg-white px-4 text-sm"
								placeholder="Search"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
							/>
						</div>
						<div className="ml-auto flex items-center gap-3">
							<Button className="h-9 rounded-full text-[12px]" onClick={handleCopyExistingSeating}>+ Copy Existing Seating</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={handleAddRoomSeatingPlan}>+ Add Room Seating Plan</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={handleAssignSeating}>+ Assign Seating</Button>
						</div>
					</div>

					<div className="rounded-md border p-3">
						<div className="flex flex-wrap gap-2">
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Room Wise Seating Print</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Room Subject Counts Print</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Group Wise Seating Print</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Print Attendance Sheet</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Print Student</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Group-Wise Stickers</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Print Invigilator</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Cover Slip</Button>
							<Button className="h-9 rounded-full text-[12px]" onClick={() => window.print()}>Packing Slip</Button>
						</div>
					</div>

					<div className="rounded-md border">
						<div className="overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-slate-50">
									<tr>
										<th className="px-2 py-1 w-16 text-left">Sl.No</th>
										<th className="px-2 py-1 text-left">Exam Date</th>
										<th className="px-2 py-1 text-left">Session</th>
										<th className="px-2 py-1 text-left">Room Code</th>
										<th className="px-2 py-1 text-left">Booked Seats</th>
										<th className="px-2 py-1 text-left">Blocked Seats</th>
										<th className="px-2 py-1 text-left">Available Seats</th>
									</tr>
								</thead>
								<tbody>
									{filteredRows.map((r, i) => (
										<tr key={`alloc-${i}`}>
											<td className="px-2 py-1">{r.sl}</td>
											<td className="px-2 py-1">{r.examDate}</td>
											<td className="px-2 py-1">{r.session}</td>
											<td className="px-2 py-1">{r.roomCode}</td>
											<td className="px-2 py-1">{r.bookedSeats}</td>
											<td className="px-2 py-1">{r.blockedSeats}</td>
											<td className="px-2 py-1">{r.availableSeats}</td>
										</tr>
									))}
									{filteredRows.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={7}>No rows for selected exam session.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

