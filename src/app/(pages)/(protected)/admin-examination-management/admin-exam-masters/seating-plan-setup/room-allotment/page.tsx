'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout'
import { Select } from '@/common/components/select'
import { RoomAllotmentTable, type RoomAllotmentRow } from '../../../_components/RoomAllotmentTable'
import {
	listActiveBuildings,
	listBlocksByBuilding,
	listFloorsByBlock,
	listExamTimetablesByExam,
	listGeneralDetailsByMaster,
	getExamRoomDetails,
	createExamRoomAllotments,
	getExamMasterById,
} from '@/services'

type AnyRow = Record<string, any>

interface ExamRoomRow extends RoomAllotmentRow {}

function toDateStr(value: unknown): string {
	if (!value) return ''
	const s = String(value).trim()
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (m) return `${m[1]}-${m[2]}-${m[3]}`
	const d = new Date(s)
	if (Number.isNaN(d.getTime())) return s
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

export default function AddRoomSeatingPlanPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	const params = useMemo(
		() => ({
			collegeId: Number(searchParams?.get('collegeId') ?? 0),
			examId: Number(searchParams?.get('examId') ?? 0),
			courseId: Number(searchParams?.get('courseId') ?? 0),
			academicYearId: Number(searchParams?.get('academicYearId') ?? 0),
			examTimetableId: Number(searchParams?.get('examTimetableId') ?? 0),
			examDate: searchParams?.get('examDate') ?? '',
			courseCode: searchParams?.get('courseCode') ?? '',
			academicYear: searchParams?.get('academicYear') ?? '',
			examName: searchParams?.get('examName') ?? '',
			/** Parent filter: `0` External / `1` Internal */
			examType: searchParams?.get('examType') ?? '',
		}),
		[searchParams],
	)

	const [exam, setExam] = useState<AnyRow | null>(null)

	const examTypeLabel = useMemo(() => {
		// Angular room-allotment: (Internal) / (Regular) / (Supple) from exam master flags
		const parts: string[] = []
		if (exam) {
			if (exam.isInternalExam === true) parts.push('Internal')
			if (exam.isRegularExam === true) parts.push('Regular')
			if (exam.isSupplyExam === true) parts.push('Supple')
			if (parts.length === 0 && params.examType === '0') parts.push('External')
			return parts.length > 0 ? parts.map((p) => `(${p})`).join(' ') : '—'
		}
		if (params.examType === '1') return '(Internal)'
		if (params.examType === '0') return '(External)'
		return '—'
	}, [exam, params.examType])
	const [buildings, setBuildings] = useState<AnyRow[]>([])
	const [blocks, setBlocks] = useState<AnyRow[]>([])
	const [floors, setFloors] = useState<AnyRow[]>([])
	const [examTimetables, setExamTimetables] = useState<AnyRow[]>([])
	const [vacancyRooms, setVacancyRooms] = useState<ExamRoomRow[]>([])
	const [seatStatusId, setSeatStatusId] = useState<number>(0)

	const [buildingId, setBuildingId] = useState<number>(0)
	const [blockId, setBlockId] = useState<number>(0)
	const [floorId, setFloorId] = useState<number>(0)
	const [examDate, setExamDate] = useState<string>(toDateStr(params.examDate))
	const [examTimetableId, setExamTimetableId] = useState<number>(params.examTimetableId || 0)
	const [globalRows, setGlobalRows] = useState<number>(0)
	const [globalCols, setGlobalCols] = useState<number>(0)
	const [selectAll, setSelectAll] = useState<boolean>(false)
	const [busy, setBusy] = useState<boolean>(false)
	const [roomsLoading, setRoomsLoading] = useState<boolean>(false)

	const minDate = toDateStr(exam?.fromDate)
	const maxDate = toDateStr(exam?.toDate)

	useEffect(() => {
		void (async () => {
			const [bldgs, status, timetables, examRow] = await Promise.all([
				listActiveBuildings().catch(() => []),
				listGeneralDetailsByMaster('EXMSEATS').catch(() => []),
				params.examId ? listExamTimetablesByExam(params.examId).catch(() => []) : Promise.resolve([]),
				params.examId ? getExamMasterById(params.examId).catch(() => null) : Promise.resolve(null),
			])
			setBuildings(Array.isArray(bldgs) ? bldgs : [])
			const availId = Number(
				(Array.isArray(status) ? status : []).find(
					(s: AnyRow) => String(s.generalDetailCode ?? '').toLowerCase() === 'available',
				)?.generalDetailId ?? 0,
			)
			setSeatStatusId(availId)
			setExamTimetables(Array.isArray(timetables) ? timetables : [])
			setExam(examRow ?? null)
		})()
	}, [params.examId])

	useEffect(() => {
		void (async () => {
			if (!buildingId) {
				setBlocks([])
				return
			}
			const rows = await listBlocksByBuilding(buildingId).catch(() => [])
			setBlocks(Array.isArray(rows) ? rows : [])
		})()
	}, [buildingId])

	useEffect(() => {
		void (async () => {
			if (!blockId) {
				setFloors([])
				return
			}
			const rows = await listFloorsByBlock(blockId).catch(() => [])
			setFloors(Array.isArray(rows) ? rows : [])
		})()
	}, [blockId])

	// Angular getRooms() — runs when timetable or building/block/floor changes.
	useEffect(() => {
		if (!examTimetableId) {
			setVacancyRooms([])
			return
		}
		let cancelled = false
		setRoomsLoading(true)
		void (async () => {
			try {
				const rows = await getExamRoomDetails({
					buildingId,
					blockId,
					floorId,
					examTimetableId,
				})
				if (cancelled) return
				const arr: ExamRoomRow[] = (Array.isArray(rows) ? rows : []).map((r: AnyRow) => ({
					...r,
					checked: false,
					disabled: r.pk_exam_room_allotment_id != null,
					priority: r.priority ?? 0,
					total_rows: 0,
					total_columns: 0,
					room_strength: 0,
				}))
				setVacancyRooms(arr)
				setSelectAll(false)
			} catch {
				if (!cancelled) {
					setVacancyRooms([])
					toast.error('Failed to load rooms for the selected filters.')
				}
			} finally {
				if (!cancelled) setRoomsLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [buildingId, blockId, floorId, examTimetableId])

	function handleRowPriority(idx: number, value: number) {
		setVacancyRooms((prev) => prev.map((r, i) => (i === idx ? { ...r, priority: value } : r)))
	}

	function handleCheckAll(next: boolean) {
		setSelectAll(next)
		setVacancyRooms((prev) =>
			prev.map((r) =>
				r.disabled
					? r
					: {
							...r,
							checked: next,
							total_rows: next ? globalRows : 0,
							total_columns: next ? globalCols : 0,
							room_strength: next ? globalRows * globalCols : 0,
					  },
			),
		)
	}

	function handleRowCheck(idx: number, next: boolean) {
		setVacancyRooms((prev) =>
			prev.map((r, i) => {
				if (i !== idx) return r
				return {
					...r,
					checked: next,
					total_rows: next ? globalRows : 0,
					total_columns: next ? globalCols : 0,
					room_strength: next ? globalRows * globalCols : 0,
				}
			}),
		)
		setSelectAll(false)
	}

	function handleGlobalRowsCols(rows: number, cols: number) {
		setGlobalRows(rows)
		setGlobalCols(cols)
		setVacancyRooms((prev) =>
			prev.map((r) =>
				r.checked && !r.disabled
					? { ...r, total_rows: rows, total_columns: cols, room_strength: rows * cols }
					: r,
			),
		)
	}

	function handleRowCol(idx: number, field: 'rows' | 'cols', value: number) {
		setVacancyRooms((prev) =>
			prev.map((r, i) => {
				if (i !== idx) return r
				const total_rows = field === 'rows' ? value : r.total_rows ?? 0
				const total_columns = field === 'cols' ? value : r.total_columns ?? 0
				return { ...r, total_rows, total_columns, room_strength: total_rows * total_columns }
			}),
		)
	}

	function buildSeatingMatrix(room: ExamRoomRow, subjectId: number | null): AnyRow[] {
		const seats: AnyRow[] = []
		for (let i = 1; i <= (room.total_rows ?? 0); i++) {
			for (let j = 1; j <= (room.total_columns ?? 0); j++) {
				seats.push({
					value: i + 1,
					collegeId: params.collegeId,
					examId: params.examId,
					examTimetableId,
					roomId: room.pk_room_id,
					rowNo: i,
					columnNo: j,
					examseatstatusCatId: seatStatusId,
					studentId: null,
					subjectId,
					isActive: true,
				})
			}
		}
		return seats
	}

	async function handleSave() {
		if (!examTimetableId) {
			toast.error('Please select an exam timetable.')
			return
		}
		const checked = vacancyRooms.filter((r) => r.checked && !r.disabled)
		if (checked.length === 0) {
			toast.error('Select at least one room to allot.')
			return
		}
		const session = examTimetables.find(
			(t: AnyRow) => Number(t.examTimetableId) === Number(examTimetableId),
		)
		// Spring sometimes returns the relation as either name; cover both.
		const details: AnyRow[] = session?.examTimetableDetail ?? session?.examTimetableDetails ?? []
		const subjectId = Number(details?.[0]?.subjectId ?? details?.[0]?.subject_id ?? 0) || null
		const payload = checked.map((r) => ({
			collegeId: params.collegeId,
			examId: params.examId,
			createdDt: null,
			examTimetableId,
			roomId: r.pk_room_id,
			examDate: toDateStr(examDate),
			priority: r.priority ?? 0,
			totalRows: r.total_rows,
			totalColumns: r.total_columns,
			roomStrength: (r.total_rows ?? 0) * (r.total_columns ?? 0),
			availableSeats: (r.total_rows ?? 0) * (r.total_columns ?? 0),
			blockedSeats: 0,
			bookedSeats: 0,
			isActive: true,
			examRoomStudentAllotmentDTO: buildSeatingMatrix(r, subjectId),
		}))
		setBusy(true)
		const { ok, message } = await createExamRoomAllotments(payload).catch(() => ({
			ok: false,
			message: 'Network error',
			raw: null,
		}))
		setBusy(false)
		if (ok) {
			toast.success(message || 'Room seating plan saved.')
			navigateBack()
		} else {
			toast.error(message || 'Failed to save room seating plan.')
		}
	}

	function navigateBack() {
		const qp = new URLSearchParams()
		if (params.collegeId) qp.set('collegeId', String(params.collegeId))
		if (params.courseId) qp.set('courseId', String(params.courseId))
		if (params.academicYearId) qp.set('academicYearId', String(params.academicYearId))
		if (params.examId) qp.set('examId', String(params.examId))
		if (params.examTimetableId) qp.set('examTimetableId', String(params.examTimetableId))
		const q = qp.toString()
		router.push(
			`/admin-examination-management/admin-exam-masters/seating-plan-setup${q ? `?${q}` : ''}`,
		)
	}

	const examTimetableOptions = useMemo(() => {
		const filtered = examDate
			? examTimetables.filter((t: AnyRow) => toDateStr(t.examDate) === examDate)
			: examTimetables
		return filtered.map((t: AnyRow) => ({
			value: String(t.examTimetableId),
			label: `${toDateStr(t.examDate)} / ${t.examSessionName ?? t.examSession ?? ''}`,
		}))
	}, [examTimetables, examDate])

	useEffect(() => {
		if (!examTimetableOptions.length) return
		const ids = examTimetableOptions.map((o) => Number(o.value))
		if (!ids.includes(examTimetableId)) {
			setExamTimetableId(Number(examTimetableOptions[0]?.value) || 0)
		}
	}, [examTimetableOptions, examTimetableId])

	return (
		<PageContainer className="space-y-4">
			<h2 className="text-lg font-semibold tracking-tight text-foreground">Add Room Seating Plan</h2>

			<div className="rounded-md border border-border bg-card px-4 py-3">
				<div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 text-[13px]">
					<span className="font-medium text-foreground">Course</span>
					<span className="min-w-0 text-[hsl(var(--primary))]">
						:{' '}
						{params.courseCode
							? `/ ${params.academicYear || '—'} / ${params.courseCode}`
							: '—'}
					</span>
					<span className="font-medium text-foreground">Exam</span>
					<span className="min-w-0 text-[hsl(var(--primary))]">
						:{' '}
						{params.examName ||
							(exam
								? `${exam.examName} (${toDateStr(exam.fromDate)} - ${toDateStr(exam.toDate)})`
								: '—')}
					</span>
					<span className="font-medium text-foreground">Exam Type</span>
					<span className="min-w-0 text-[hsl(var(--primary))]">: {examTypeLabel}</span>
				</div>
			</div>

			<div className="rounded-md border border-border bg-card p-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
					<div>
						<Label className="text-[12px]">Exam Date</Label>
						<Input
							type="date"
							value={examDate}
							min={minDate || undefined}
							max={maxDate || undefined}
							onChange={(e) => setExamDate(e.target.value)}
						/>
					</div>
					<div className="md:col-span-2">
						<Label className="text-[12px]">Exam Timetable</Label>
						<Select
							value={String(examTimetableId || '')}
							onChange={(v) => setExamTimetableId(Number(v) || 0)}
							options={examTimetableOptions}
							placeholder="Select Exam Timetable"
						/>
					</div>
					<div>
						<Label className="text-[12px]">Building</Label>
						<Select
							value={String(buildingId || '')}
							onChange={(v) => {
								setBuildingId(Number(v) || 0)
								setBlockId(0)
								setFloorId(0)
							}}
							options={buildings.map((b: AnyRow) => ({
								value: String(b.buildingId ?? b.id),
								label: String(
									b.campusName && b.buildingCode
										? `${b.campusName} - ${b.buildingCode}`
										: (b.buildingName ?? b.name ?? b.buildingCode ?? ''),
								),
							}))}
							placeholder="Select Building"
							clearable
						/>
					</div>
					<div>
						<Label className="text-[12px]">Block</Label>
						<Select
							value={String(blockId || '')}
							onChange={(v) => {
								setBlockId(Number(v) || 0)
								setFloorId(0)
							}}
							options={blocks.map((b: AnyRow) => ({
								value: String(b.blockId ?? b.id),
								label: String(b.blockCode ?? b.blockName ?? b.name ?? ''),
							}))}
							placeholder="Select Block"
							clearable
						/>
					</div>
					<div>
						<Label className="text-[12px]">Floor</Label>
						<Select
							value={String(floorId || '')}
							onChange={(v) => setFloorId(Number(v) || 0)}
							options={floors.map((f: AnyRow) => ({
								value: String(f.floorId ?? f.id),
								label: String(
									f.floorName && f.floorNo != null
										? `${f.floorName} - ${f.floorNo}`
										: (f.floorName ?? f.name ?? f.floorCode ?? ''),
								),
							}))}
							placeholder="Select Floor"
							clearable
						/>
					</div>
				</div>
				{roomsLoading && (
					<p className="mt-3 text-[12px] text-muted-foreground">Loading rooms…</p>
				)}
				{!roomsLoading && examTimetableId > 0 && vacancyRooms.length === 0 && (
					<p className="mt-3 text-[12px] text-muted-foreground">
						No rooms found for the selected building, block, and floor.
					</p>
				)}
			</div>

			<RoomAllotmentTable
				rows={vacancyRooms}
				selectAll={selectAll}
				globalRows={globalRows}
				globalCols={globalCols}
				onCheckAll={handleCheckAll}
				onRowCheck={handleRowCheck}
				onRowPriority={handleRowPriority}
				onRowCol={handleRowCol}
				onGlobalRowsCols={handleGlobalRowsCols}
			/>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" className="h-8 px-6" onClick={navigateBack}>
					Back
				</Button>
				<Button type="button" className="h-8 px-6" disabled={busy} onClick={handleSave}>
					{busy ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</PageContainer>
	)
}
