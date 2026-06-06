'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { distinct } from '@/lib/utils'
import { listCourseYears, getExamTimetableDetails } from '@/services/examination'
import {
	assignSeatingAllSession,
	getGroupwiseAllotmentSummary,
	getRoomwiseAllotmentSummary,
	getRoomwiseSubjectSummary,
	listExamInvigilationAllotments,
	listExamInvigilationAllotmentsByTimetable,
	listExamRoomAllotments as listExamRoomAllotmentsDomain,
	listRoomwiseOmrStudents,
	listUnivExamFiltersByCode,
	popExamInvigilator,
} from '@/services/seating-plan'
import { ConfirmDialog } from '@/common/components/feedback'
import { toast } from 'sonner'
import {
	getUnivExamFiltersRegSup,
	getUnivExamRestNoTt,
	listExamTimetablesByExam,
	listExamRoomAllotments as listExamRoomAllotmentsPre,
} from '@/services/pre-examination'
import { ChevronDown, Filter, Plus, Printer } from 'lucide-react'
import { SearchInput } from '@/common/components/search'
import { useRouter, useSearchParams } from 'next/navigation'
import { toDateStr } from '@/common/generic-functions'
import { usePrintMode } from '@/lib/print'
import { useCollegeLogo } from '@/hooks/useCollegeLogo'

type AllocationRow = {
	sl: number
	examDate: string
	session: string
	roomCode: string
	bookedSeats: number
	blockedSeats: number
	availableSeats: number
	isActive?: boolean
	raw?: any
}

type SessionOption = {
	id: number
	label: string
	examDate: string
	session: string
	sessionId?: number
	examSessionId?: number
	fk_exam_session_id?: number
	exam_session_id?: number
	subjectId?: number
	subject_id?: number
}

function formatAcademicYearLabel(row: any): string {
	const raw = String(row?.academic_year ?? row?.academicYear ?? row?.label ?? '').trim()
	if (!raw) return ''
	// Match legacy visual style: 2024-2025 (without extra spaces around hyphen).
	return raw.replace(/\s*-\s*/g, '-')
}

function formatExamTimetableLabel(row: any): string {
	const rawDate = String(row?.examDate ?? row?.exam_date ?? '').trim()
	const date = toDateStr(rawDate)
	const session = String(
		row?.examSessionName ??
		row?.examsessioninCatCode ??
		row?.exam_session_name ??
		'Session',
	)
		.trim()
		.toUpperCase()
	return `${date} (${session})`
}

function getExamTimetableParts(row: any): { examDate: string; session: string } {
	const rawDate = String(
		row?.examDate ??
		row?.exam_date ??
		row?.examdate ??
		row?.exam_timetable_date ??
		row?.examDateStr ??
		row?.ttDate ??
		row?.timetableDate ??
		row?.dateValue ??
		row?.date ??
		'',
	).trim()
	const examDateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/)
	const examDate = examDateMatch ? examDateMatch[0] : toDateStr(rawDate)
	const session = String(
		row?.examSessionName ??
		row?.examsessioninCatCode ??
		row?.examSessioninCatCode ??
		row?.exam_session_name ??
		row?.examSession ??
		row?.exam_session ??
		row?.sessionCatName ??
		row?.sessionCatCode ??
		row?.sessionName ??
		row?.session_name ??
		row?.session ??
		'SESSION',
	)
		.trim()
		.toUpperCase()
	return { examDate, session }
}

function toOptionId(date: string, session: string, fallbackSeed: number) {
	const key = `${date}|${session}`
	let hash = 0
	for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
	const out = Math.abs(hash)
	return out > 0 ? out : fallbackSeed
}

function extractSessionOptions(rawList: any[]): SessionOption[] {
	const options = new Map<string, SessionOption>()
	let seq = 1

	function addCandidate(obj: any) {
		if (!obj || typeof obj !== 'object') return
		const parts = getExamTimetableParts(obj)
		if (!parts.examDate) return
		const session = parts.session || 'SESSION'
		const key = `${parts.examDate}|${session}`
		if (options.has(key)) return
		const explicitId = Number(
			obj.examTimetableId ??
			obj.exam_timetable_id ??
			obj.fk_exam_timetable_id ??
			obj.examTimetableID ??
			0,
		)
		const sessionId = Number(
			obj.examSessionId ??
			obj.fk_exam_session_id ??
			obj.sessionId ??
			obj.exam_session_id ??
			0,
		) || undefined
		const id = explicitId > 0 ? explicitId : toOptionId(parts.examDate, session, seq++)
		options.set(key, {
			id,
			label: `${parts.examDate} (${session})`,
			examDate: parts.examDate,
			session,
			sessionId,
		})
	}

	function walk(node: any, depth = 0) {
		if (!node || depth > 4) return
		if (Array.isArray(node)) {
			for (const item of node) walk(item, depth + 1)
			return
		}
		if (typeof node !== 'object') return
		addCandidate(node)
		for (const value of Object.values(node)) {
			if (Array.isArray(value) || (value && typeof value === 'object')) walk(value, depth + 1)
		}
	}

	walk(rawList)
	return Array.from(options.values())
}

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
	return raw
		.split('/')
		.map((s) => s.trim())
		.join(' / ')
}

function mapAllocationRows(rows: any[]): AllocationRow[] {
	const out = new Map<string, AllocationRow>()
	let seq = 1
	for (const r of rows ?? []) {
		const examDate = String(r.examDate ?? r.exam_date ?? '')
		const session = String(
			r.examSessionName ??
			r.examsessioninCatCode ??
			r.exam_session_name ??
			r.session ??
			'',
		)
		const roomCode = [r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room_code ?? r.room ?? r.block_room]
			.filter(Boolean)
			.join(' / ') || '-'
		const allotmentId = Number(r.examRoomAllotmentId ?? r.exam_room_allotment_id ?? r.id ?? 0)
		const key = allotmentId > 0 ? `id:${allotmentId}` : `${toDateStr(examDate)}|${session}|${roomCode}`
		if (out.has(key)) continue
		out.set(key, {
			sl: seq++,
			examDate,
			session,
			roomCode,
			bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? r.noOfSeats ?? r.no_of_seats ?? 0),
			blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
			availableSeats: Number(r.availableSeats ?? r.available_seats ?? r.roomCapacity ?? r.capacity ?? 0),
			isActive: r.isActive ?? true,
			raw: r,
		})
	}
	return Array.from(out.values())
}

async function fetchRoomwiseOmrStudents(params: {
	examId: number
	courseId: number
	examDate?: string
	sessionId?: number
}): Promise<any[]> {
	return listRoomwiseOmrStudents(params)
}

async function fetchUnivExamFilters(params?: {
	loginEmpId?: number
	courseId?: number
	examId?: number
	academicYearId?: number
}): Promise<any[]> {
	return listUnivExamFiltersByCode({
		loginEmpId: params?.loginEmpId,
		courseId: params?.courseId,
		examId: params?.examId,
		academicYearId: params?.academicYearId,
	})
}

/** Rows already returned by REGSUP for this course / exam / AY — avoids a duplicate `univ_exam_filters` ALL proc. */
function scopeRegSupUnivRows(rows: any[], courseId: number, examId: number, academicYearId: number): any[] {
	return (rows ?? []).filter((r: any) => {
		const c = Number(r.fk_course_id ?? r.course_id ?? 0)
		const e = Number(r.fk_exam_id ?? r.exam_id ?? r.pk_exam_id ?? 0)
		const ay = Number(r.fk_academic_year_id ?? r.academic_year_id ?? 0)
		if (c !== Number(courseId) || e !== Number(examId)) return false
		if (Number(academicYearId) > 0 && ay > 0 && ay !== Number(academicYearId)) return false
		return true
	})
}

// ── Pure renderer ─────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
	return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function SeatingPlanSetupPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { user } = useSessionContext()
	const employeeId = useMemo(() => {
		const fromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
		const fromSession = Number(user?.employeeId ?? 0)
		return fromStorage || fromSession || 0
	}, [user?.employeeId])
	// Top-level filters
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
	const { mode: printMode, triggerPrint } = usePrintMode<PrintMode>()
	// Per-mode fetched data for prints that need their own server call.
	// Today: room-wise-seating fetches `roomwise_allotment_summary` rows; the
	// other modes fall back to filteredRows until their respective Angular
	// procs are wired in.
	const [roomWiseAllocations, setRoomWiseAllocations] = useState<any[]>([])
	const [roomSubjectAllocations, setRoomSubjectAllocations] = useState<any[]>([])
	const [groupwiseAllocations, setGroupwiseAllocations] = useState<any[]>([])
	const [invigilatorRows, setInvigilatorRows] = useState<any[]>([])
	const [studentAllotmentDetails, setStudentAllotmentDetails] = useState<any[]>([])
	const [loadingPrintData, setLoadingPrintData] = useState(false)
	const [assignSeatingOpen, setAssignSeatingOpen] = useState(false)
	const [assignSeatingBusy, setAssignSeatingBusy] = useState(false)
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [baseRows, setBaseRows] = useState<any[]>([])
	const [restRows, setRestRows] = useState<any[]>([])
	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)
	const [selectedExamType, setSelectedExamType] = useState<'0' | '1' | ''>('')
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
	// Dynamic selected-college logo for the print headers (Angular: MINIO + Logo).
	const collegeLogo = useCollegeLogo(selectedCollegeId)
	const [examMasterSearch, setExamMasterSearch] = useState('')
	const [examTimetables, setExamTimetables] = useState<any[]>([])
	const [selectedExamTimetableId, setSelectedExamTimetableId] = useState<number | null>(null)
	const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
	const [univExamFilterRows, setUnivExamFilterRows] = useState<any[]>([])
	const [filterOpen, setFilterOpen] = useState(true)

	// Table data from selected exam session/timetable
	const [previewRows, setPreviewRows] = useState<AllocationRow[]>([])
	const [searchText, setSearchText] = useState('')

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const univRows = await getUnivExamFiltersRegSup(employeeId || 0).catch(() => [])
			setUnivExamFilterRows(Array.isArray(univRows) ? univRows : [])
			setBaseRows(Array.isArray(univRows) ? univRows : [])
			const distinctCourses = distinct(univRows ?? [], (r) => r.fk_course_id)
			setCourses(distinctCourses)
			if (distinctCourses.length > 0) {
				// If the URL carries ?courseId (e.g. from Back on seat-allot-students),
				// pre-select that course instead of the auto-picked first one.
				const urlCourseId = Number(searchParams?.get('courseId') ?? 0)
				const targetCourse = (urlCourseId > 0 && distinctCourses.some((c: any) => Number(c.fk_course_id) === urlCourseId))
					? urlCourseId
					: distinctCourses[0].fk_course_id
				await handleCourseChange(targetCourse, Array.isArray(univRows) ? univRows : [])
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [employeeId])

	// After each list populates, restore the matching URL param (carried back
	// from seat-allot-students) so the user lands with the same Course / AY /
	// Exam / Exam Timetable selected.
	useEffect(() => {
		const id = Number(searchParams?.get('academicYearId') ?? 0)
		if (id > 0 && academicYears.some((a: any) => Number(a.fk_academic_year_id ?? a.academicYearId ?? a.id) === id)) {
			setSelectedAcademicYearId(id)
		}
	}, [academicYears, searchParams])

	useEffect(() => {
		const id = Number(searchParams?.get('examId') ?? 0)
		if (id > 0 && examMasters.some((e: any) => Number(e.fk_exam_id ?? e.examId ?? e.id) === id)) {
			setSelectedExamId(id)
		}
	}, [examMasters, searchParams])

	useEffect(() => {
		const id = Number(searchParams?.get('examTimetableId') ?? 0)
		if (id > 0 && sessionOptions.some((s) => Number(s.id) === id)) {
			setSelectedExamTimetableId(id)
		}
	}, [sessionOptions, searchParams])

	// Restore the College once `restRows` populates -- the cascade at
	// loadExamTimetables auto-picks the first college, so without this we'd
	// land on the wrong campus after Back.
	useEffect(() => {
		const id = Number(searchParams?.get('collegeId') ?? 0)
		if (id > 0 && restRows.some((r: any) => Number(r.fk_college_id) === id)) {
			setSelectedCollegeId(id)
		}
	}, [restRows, searchParams])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	async function handleCourseChange(courseId: number, regSupRows?: any[]) {
		setSelectedCourseId(courseId)
		setSelectedCollegeId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setRestRows([])
		setCourseYears([])
		setSelectedCourseYearId(null)

		// Keep exam years aligned to the selected course like legacy flow.
		const rowSource = regSupRows ?? baseRows ?? []
		const yearRowsForCourse = rowSource.filter(
			(a: any) => Number(a.fk_course_id ?? a.course_id ?? 0) === Number(courseId),
		)
		const years = distinct(
			yearRowsForCourse,
			(a: any) => a.fk_academic_year_id,
		)
		setAcademicYears(years)
		setSelectedAcademicYearId((prev) => {
			const hasPrev = years.some((y: any) => Number(y.fk_academic_year_id) === Number(prev))
			if (hasPrev) return prev
			const firstAy = years.find((y: any) => Number(y.is_curr_ay ?? 0) === 1) ?? years[0]
			return firstAy?.fk_academic_year_id ?? null
		})

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
		const list = distinct(
			(baseRows ?? []).filter(
				(r: any) =>
					Number(r.fk_course_id) === Number(selectedCourseId) &&
					Number(r.fk_academic_year_id) === Number(selectedAcademicYearId),
			),
			(r: any) => r.fk_exam_id,
		).map((r: any) => ({ examId: Number(r.fk_exam_id), examName: r.exam_name }))
		setExamMasters(list)
		setSelectedExamId((prev) => {
			const prevId = Number(prev ?? 0)
			return list.some((x: any) => Number(x.examId) === prevId) ? prevId : (list[0]?.examId ?? null)
		})
	}, [baseRows, selectedCourseId, selectedAcademicYearId])

	const filteredExamMasters = useMemo(() => {
		const q = examMasterSearch.trim().toLowerCase()
		if (!q) return examMasters
		return examMasters.filter((e: any) =>
			String(e.examName ?? '').toLowerCase().includes(q),
		)
	}, [examMasters, examMasterSearch])

	const colleges = useMemo(
		() => distinct((restRows ?? []).filter((x: any) => x.fk_college_id), (x: any) => x.fk_college_id),
		[restRows],
	)

	const academicYearOptions = useMemo(
		() => {
			const fromCollege = academicYears
				.map((a: any) => ({
					id: Number(a.fk_academic_year_id ?? a.academicYearId ?? a.academic_year_id ?? a.id ?? 0),
					label: formatAcademicYearLabel(a),
				}))
				.filter((a) => a.id > 0 && a.label)

			const fromUniv = (univExamFilterRows ?? [])
				.map((r: any, i: number) => {
					const label = formatAcademicYearLabel({
						academic_year: r.academic_year ?? r.exam_year ?? r.academicYear ?? '',
					})
					if (!label) return null
					const id = Number(r.fk_academic_year_id ?? r.academic_year_id ?? 0) || (100000 + i)
					return { id, label }
				})
				.filter(Boolean) as Array<{ id: number; label: string }>

			const uniq = new Map<string, { id: number; label: string }>()
			for (const row of [...fromCollege, ...fromUniv]) {
				if (!uniq.has(row.label)) uniq.set(row.label, row)
			}
			return Array.from(uniq.values())
		},
		[academicYears, univExamFilterRows]
	)

	const selectedTimetable = useMemo(
		() => sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId)) ?? null,
		[sessionOptions, selectedExamTimetableId]
	)

	/** Stable key so room-allotment fetch does not re-run when `sessionOptions` gets a new array ref with the same session. */
	const roomAllotmentLoadKey = useMemo(() => {
		if (!selectedCollegeId || !selectedCourseId || !selectedExamId || !selectedExamTimetableId) return ''
		const o = sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId))
		const date = String(o?.examDate ?? '')
		const sid = Number(o?.sessionId ?? 0) || 0
		return `${selectedCollegeId}|${selectedCourseId}|${selectedExamId}|${selectedExamTimetableId}|${date}|${sid}`
	}, [selectedCollegeId, selectedCourseId, selectedExamId, selectedExamTimetableId, sessionOptions])

	useEffect(() => {
		const ac = new AbortController()
		const { signal } = ac
		async function loadExamTimetables() {
			setExamTimetables([])
			setPreviewRows([])
			setSessionOptions([])
			if (!selectedCourseId || !selectedExamId) {
				setSelectedExamTimetableId(null)
				return
			}
			const rest = await getUnivExamRestNoTt({
				courseId: selectedCourseId,
				examId: selectedExamId,
				academicYearId: selectedAcademicYearId ?? 0,
				employeeId: employeeId || 0,
			}).catch(() => [])
			if (signal.aborted) return
			const restList = Array.isArray(rest) ? rest : []
			setRestRows(restList)
			const distinctColleges = distinct(restList.filter((x: any) => x.fk_college_id), (x: any) => x.fk_college_id)
			setSelectedCollegeId((prev) => {
				const prevId = Number(prev ?? 0)
				return distinctColleges.some((c: any) => Number(c.fk_college_id) === prevId)
					? prevId
					: (distinctColleges[0]?.fk_college_id ?? null)
			})
			let effectiveUnivRows = scopeRegSupUnivRows(
				univExamFilterRows,
				selectedCourseId,
				selectedExamId,
				selectedAcademicYearId ?? 0,
			)
			if (effectiveUnivRows.length === 0) {
				const fetched = await fetchUnivExamFilters({
					loginEmpId: employeeId || 0,
					courseId: selectedCourseId ?? 0,
					examId: selectedExamId ?? 0,
					academicYearId: selectedAcademicYearId ?? 0,
				}).catch(() => [])
				effectiveUnivRows = Array.isArray(fetched) ? fetched : []
			}
			if (effectiveUnivRows.length === 0) {
				effectiveUnivRows = univExamFilterRows
			}
			if (signal.aborted) return
			// Legacy behavior: timetable list should still appear even when course-year mapping is absent.
			const directTt = await listExamTimetablesByExam(selectedExamId).catch(() => [])
			let list = Array.isArray(directTt) ? directTt : []
			if (list.length === 0 && selectedCourseYearId) {
				const rows = await getExamTimetableDetails(selectedCourseYearId, selectedCourseId, selectedExamId).catch(() => [])
				list = Array.isArray(rows) ? rows : []
			}
			if (signal.aborted) return
			setExamTimetables(list)
			if (list.length > 0) {
				const opts = extractSessionOptions(list)
				let mergedOpts = opts
				// Merge timetable options from univ_exam_filters as backup source.
				if (effectiveUnivRows.length > 0) {
					const scoped = effectiveUnivRows.filter((r: any) => {
						const examId = Number(r.fk_exam_id ?? r.exam_id ?? r.pk_exam_id ?? 0)
						const courseId = Number(r.fk_course_id ?? r.course_id ?? 0)
						return (
							(!selectedExamId || !examId || examId === Number(selectedExamId)) &&
							(!selectedCourseId || !courseId || courseId === Number(selectedCourseId))
						)
					})
					const fallbackOpts = extractSessionOptions(scoped)
					const uniq = new Map<string, SessionOption>()
					for (const s of [...opts, ...fallbackOpts]) uniq.set(`${s.examDate}|${s.session}`, s)
					mergedOpts = Array.from(uniq.values())
				}
				setSessionOptions(mergedOpts)
				if (mergedOpts.length > 0) {
					setSelectedExamTimetableId((prev) => {
						const prevId = Number(prev ?? 0)
						return mergedOpts.some((o) => o.id === prevId) ? prevId : mergedOpts[0].id
					})
				} else {
					// Extra legacy fallback: derive date/session options directly from allotment SP.
					const allotmentRows = await fetchRoomwiseOmrStudents({
						examId: selectedExamId,
						courseId: selectedCourseId,
					}).catch(() => [])
					const allotmentOpts = extractSessionOptions(Array.isArray(allotmentRows) ? allotmentRows : [])
					if (allotmentOpts.length > 0) {
						setSessionOptions(allotmentOpts)
						setSelectedExamTimetableId((prev) => {
							const prevId = Number(prev ?? 0)
							return allotmentOpts.some((o) => o.id === prevId) ? prevId : allotmentOpts[0].id
						})
						return
					}
					setSelectedExamTimetableId(null)
				}
			} else {
				const scoped = (effectiveUnivRows ?? []).filter((r: any) => {
					const examId = Number(r.fk_exam_id ?? r.exam_id ?? r.pk_exam_id ?? 0)
					const courseId = Number(r.fk_course_id ?? r.course_id ?? 0)
					return (
						(!selectedExamId || !examId || examId === Number(selectedExamId)) &&
						(!selectedCourseId || !courseId || courseId === Number(selectedCourseId))
					)
				})
				let fallbackOpts = extractSessionOptions(scoped)
				if (fallbackOpts.length === 0) {
					const allotmentRows = await fetchRoomwiseOmrStudents({
						examId: selectedExamId,
						courseId: selectedCourseId,
					}).catch(() => [])
					fallbackOpts = extractSessionOptions(Array.isArray(allotmentRows) ? allotmentRows : [])
				}
				setSessionOptions(fallbackOpts)
				setSelectedExamTimetableId((prev) => {
					const prevId = Number(prev ?? 0)
					return fallbackOpts.some((o) => o.id === prevId) ? prevId : (fallbackOpts[0]?.id ?? null)
				})
			}
		}
		void loadExamTimetables()
		return () => ac.abort()
		// eslint-disable-next-line react-hooks/exhaustive-deps -- univExamFilterRows read for scope only; avoids extra passes
	}, [employeeId, selectedCourseId, selectedExamId, selectedAcademicYearId])

	useEffect(() => {
		function mapSelectedSessionRows() {
			if (!selectedExamTimetableId) {
				setPreviewRows([])
				return
			}
			const rows = examTimetables.filter((t: any) => Number(t.examTimetableId) === Number(selectedExamTimetableId))
			const hasSeatData = rows.some(
				(r: any) =>
					r.roomCode != null ||
					r.room != null ||
					r.block_room != null ||
					r.bookedSeats != null ||
					r.booked_seats != null ||
					r.noOfSeats != null
			)
			// Avoid overriding API-backed room allotment rows with session-only timetable rows.
			if (!hasSeatData) return
			const mapped = rows.map((r: any, i: number) => ({
				sl: i + 1,
				examDate: String(r.examDate ?? ''),
				session: String(r.examSessionName ?? r.examsessioninCatCode ?? ''),
				roomCode: [r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room ?? r.block_room]
					.filter(Boolean)
					.join(' / ') || '-',
				bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? 0),
				blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
				availableSeats: Number(r.availableSeats ?? r.available_seats ?? 0),
				isActive: r.isActive ?? true,
				raw: r,
			}))
			setPreviewRows(mapped)
		}
		mapSelectedSessionRows()
	}, [selectedExamTimetableId, examTimetables])

	useEffect(() => {
		if (!roomAllotmentLoadKey) return
		const ac = new AbortController()
		const { signal } = ac
		async function loadRoomAllotmentsBySelection() {
			if (!selectedExamId || !selectedExamTimetableId || !selectedCourseId || !selectedCollegeId) {
				setPreviewRows([])
				return
			}
			const sessionRow = sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId))
			// Angular parity: prefer ExamRoomAllotment rows first (already aggregated per room).
			let rows = await listExamRoomAllotmentsPre(selectedCollegeId, selectedExamId, selectedExamTimetableId).catch(() => [])
			if (signal.aborted) return
			if (!Array.isArray(rows) || rows.length === 0) {
				rows = await listExamRoomAllotmentsDomain(selectedExamId, selectedExamTimetableId).catch(() => [])
			}
			if (signal.aborted) return
			// Last fallback only when allotments are absent: student-level SP rows.
			if (!Array.isArray(rows) || rows.length === 0) {
				const selectedExamDate = toDateStr(sessionRow?.examDate)
				const selectedSessionId = Number(sessionRow?.sessionId ?? 0) || 0
				rows = await fetchRoomwiseOmrStudents({
					examId: selectedExamId,
					courseId: selectedCourseId,
					examDate: selectedExamDate,
					sessionId: selectedSessionId,
				}).catch(() => [])
			}
			if (signal.aborted) return
			if (!Array.isArray(rows) || rows.length === 0) {
				setPreviewRows([])
				return
			}
			setPreviewRows(mapAllocationRows(rows))
		}
		void loadRoomAllotmentsBySelection()
		return () => ac.abort()
	}, [roomAllotmentLoadKey])

	function handleCopyExistingSeating() {
		if (!selectedExamId || !selectedCourseId) {
			toast.error('Select an exam and course first.')
			return
		}
		const session = sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId))
		const qp = new URLSearchParams({
			collegeId: String(selectedCollegeId ?? ''),
			courseId: String(selectedCourseId ?? ''),
			examId: String(selectedExamId ?? ''),
			academicYearId: String(selectedAcademicYearId ?? ''),
			examTimetableId: String(selectedExamTimetableId ?? ''),
			examDate: toDateStr(session?.examDate ?? ''),
			courseCode: String(
				courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(selectedCourseId))?.courseCode ??
					courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(selectedCourseId))?.course_code ??
					'',
			),
			academicYear: String(academicYearOptions.find((a) => a.id === selectedAcademicYearId)?.label ?? ''),
			examName: String(
				examMasters.find((e: any) => Number(e.examId ?? e.id ?? e.fk_exam_id) === Number(selectedExamId))?.examName ?? '',
			),
		})
		router.push(
			`/admin-examination-management/admin-exam-masters/seating-plan-setup/existing-allotment?${qp.toString()}`,
		)
	}

	function handleAssignSeating() {
		if (!selectedExamId || !selectedExamTimetableId) {
			toast.error('Select an exam and exam timetable first.')
			return
		}
		setAssignSeatingOpen(true)
	}

	async function confirmAssignSeating() {
		if (!selectedExamId || !selectedExamTimetableId) return
		const session = sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId))
		const examDate = toDateStr(session?.examDate) || ''
		const sessionId = Number(
			(session as any)?.sessionId ??
				(session as any)?.examSessionId ??
				(session as any)?.fk_exam_session_id ??
				(session as any)?.exam_session_id ??
				0,
		)
		try {
			setAssignSeatingBusy(true)
			const rows = await assignSeatingAllSession({ examId: selectedExamId, examDate, sessionId })
			toast.success(
				rows.length > 0
					? `Seating allotted successfully for ${rows.length} students.`
					: 'Seating allotment triggered.',
			)
			setAssignSeatingOpen(false)
			// Refresh the on-screen allotment list so the user sees the newly
			// populated booked / available seat counts.
			const refreshed = await listExamRoomAllotmentsPre(
				selectedCollegeId ?? 0,
				selectedExamId,
				selectedExamTimetableId,
			).catch(() => [])
			if (Array.isArray(refreshed) && refreshed.length > 0) {
				setPreviewRows(mapAllocationRows(refreshed))
			}
		} catch (e) {
			toast.error('Failed to assign seating. Please try again.')
		} finally {
			setAssignSeatingBusy(false)
		}
	}

	function openSeatAllotStudents(row: AllocationRow) {
		const raw = row.raw ?? {}
		const pickNum = (...values: unknown[]) => {
			for (const value of values) {
				const parsed = Number(value ?? 0)
				if (Number.isFinite(parsed) && parsed > 0) return parsed
			}
			return null
		}
		const normalizeDate = (value: unknown) => {
			const source = String(value ?? '').trim()
			const isoMatch = source.match(/\d{4}-\d{2}-\d{2}/)
			if (isoMatch) return isoMatch[0]
			return toDateStr(source) || source
		}
		const normalizedRoomCode =
			String(row.roomCode ?? '').trim() && String(row.roomCode ?? '').trim() !== '-'
				? String(row.roomCode).trim()
				: [raw.buildingCode, raw.blockCode, raw.floorName, raw.roomCode ?? raw.room ?? raw.block_room]
						.map((x: unknown) => String(x ?? '').trim())
						.filter(Boolean)
						.join(' / ')

		const resolvedCourseId = pickNum(selectedCourseId, raw.fk_course_id, raw.courseId, raw.course_id)
		const resolvedAcademicYearId = pickNum(
			selectedAcademicYearId,
			raw.fk_academic_year_id,
			raw.academicYearId,
			raw.academic_year_id,
		)
		const resolvedExamId = pickNum(selectedExamId, raw.fk_exam_id, raw.examId, raw.exam_id)
		const resolvedCollegeId = pickNum(selectedCollegeId, raw.fk_college_id, raw.collegeId, raw.college_id)
		const resolvedExamTimetableId = pickNum(
			selectedExamTimetableId,
			raw.fk_exam_timetable_id,
			raw.examTimetableId,
			raw.exam_timetable_id,
		)
		const resolvedSessionId = pickNum(
			selectedTimetable?.examSessionId,
			selectedTimetable?.fk_exam_session_id,
			selectedTimetable?.sessionId,
			selectedTimetable?.exam_session_id,
			raw.examSessionId,
			raw.fk_exam_session_id,
			raw.sessionId,
			raw.exam_session_id,
		)
		const resolvedExamRoomAllotmentId = pickNum(
			raw.examRoomAllotmentId,
			raw.exam_room_allotment_id,
			raw.id,
		)
		const resolvedSubjectId = pickNum(
			raw.subjectId,
			raw.subject_id,
			selectedTimetable?.subjectId,
			selectedTimetable?.subject_id,
		)

		const params = new URLSearchParams({
			collegeId: String(resolvedCollegeId ?? ''),
			courseId: String(resolvedCourseId ?? ''),
			examId: String(resolvedExamId ?? ''),
			examTimetableId: String(resolvedExamTimetableId ?? ''),
			academicYearId: String(resolvedAcademicYearId ?? ''),
			academicYear: String(
				academicYearOptions.find((a) => a.id === selectedAcademicYearId)?.label ?? ''
			),
			courseCode: String(
				courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(resolvedCourseId))?.courseCode ??
				courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(resolvedCourseId))?.course_code ??
				raw.courseCode ??
				raw.course_code ??
				''
			),
			examName: String(
				examMasters.find((e: any) => Number(e.examId ?? e.id ?? e.fk_exam_id) === Number(resolvedExamId))?.examName ??
				raw.examName ??
				raw.exam_name ??
				''
			),
			sessionId: String(resolvedSessionId ?? ''),
			roomCode: String(normalizedRoomCode || '-'),
			examDate: String(normalizeDate(row.examDate ?? raw.examDate ?? raw.exam_date)),
			examSession: String(row.session ?? ''),
			examRoomAllotmentId: String(resolvedExamRoomAllotmentId ?? ''),
			subjectId: String(resolvedSubjectId ?? ''),
		})
		router.push(
			`/admin-examination-management/admin-exam-masters/seating-plan-setup/seat-allot-students?${params.toString()}`,
		)
	}

	function handleAddRoomSeatingPlan() {
		if (!selectedExamId || !selectedCourseId) {
			toast.error('Select an exam and course first.')
			return
		}
		const session = sessionOptions.find((s) => Number(s.id) === Number(selectedExamTimetableId))
		const qp = new URLSearchParams({
			collegeId: String(selectedCollegeId ?? ''),
			courseId: String(selectedCourseId ?? ''),
			examId: String(selectedExamId ?? ''),
			academicYearId: String(selectedAcademicYearId ?? ''),
			examTimetableId: String(selectedExamTimetableId ?? ''),
			examDate: toDateStr(session?.examDate ?? ''),
			courseCode: String(
				courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(selectedCourseId))?.courseCode ??
					courses.find((c: any) => Number(c.courseId ?? c.id ?? c.fk_course_id) === Number(selectedCourseId))?.course_code ??
					'',
			),
			academicYear: String(academicYearOptions.find((a) => a.id === selectedAcademicYearId)?.label ?? ''),
			examName: String(
				examMasters.find((e: any) => Number(e.examId ?? e.id ?? e.fk_exam_id) === Number(selectedExamId))?.examName ?? '',
			),
		})
		router.push(
			`/admin-examination-management/admin-exam-masters/seating-plan-setup/room-allotment?${qp.toString()}`,
		)
	}

	function tConvert(time?: string) {
		if (!time) return ''
		const match = String(time).match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
		if (!match) return String(time)
		const hh = Number(match[1])
		const mm = match[2]
		const ampm = hh < 12 ? 'AM' : 'PM'
		const hour12 = hh % 12 || 12
		return `${hour12}:${mm} ${ampm}`
	}

	const filteredRows = useMemo(() => {
		const q = searchText.trim().toLowerCase()
		if (!q) return previewRows
		return previewRows.filter((r) =>
			`${r.examDate} ${r.session} ${r.roomCode}`.toLowerCase().includes(q),
		)
	}, [previewRows, searchText])

	const columnDefs = useMemo<ColDef[]>(
		() => [
			{ headerName: 'Sl.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
			{ field: 'examDate', headerName: 'Exam Date', minWidth: 120, valueFormatter: (p: any) => formatTableDate(p.value) },
			{ field: 'session', headerName: 'Session', minWidth: 110 },
			{ field: 'roomCode', headerName: 'Room Code', minWidth: 110, valueFormatter: (p: any) => formatRoomCode(p.value) },
			{ field: 'bookedSeats', headerName: 'Booked Seats', width: 120, flex: 0 },
			{ field: 'blockedSeats', headerName: 'Blocked Seats', width: 130, flex: 0 },
			{ field: 'availableSeats', headerName: 'Available Seats', width: 140, flex: 0 },
			{ field: 'isActive', headerName: 'Status', width: 90, flex: 0, cellRenderer: statusRenderer },
			{
				headerName: 'Actions', width: 150, flex: 0,
				cellRenderer: (p: any) => (
					<button
						type="button"
						className="text-[12px] text-[hsl(var(--primary))] hover:underline"
						onClick={() => openSeatAllotStudents(p.data)}
					>
						Seat Allot Students
					</button>
				),
			},
		],
		[],
	)

	// ── Print layouts ─────────────────────────────────────────────────────────
	// When printMode is set, the normal UI is replaced by a tailored print
	// layout (the AppShell still wraps it, but @media print hides aside / nav /
	// header so the OS print sheet shows only the layout below). Data sources:
	// - filteredRows : the room-allocation summary visible in the on-screen grid
	//   (one row per Exam Date + Session + Room with booked/blocked/available).
	// - selected*    : the active filter context for the printed header.
	// Per-student / per-invigilator data is not loaded on this index page, so
	// those layouts list rooms with placeholders for per-student detail rows.
	if (printMode) {
		const selectedExam = examMasters.find((e: any) => Number(e.examId ?? e.id) === Number(selectedExamId))
		const selectedCourse = courses.find((c: any) => Number(c.fk_course_id ?? c.id) === Number(selectedCourseId))
		const selectedAy = academicYears.find((a: any) => Number(a.fk_academic_year_id ?? a.id) === Number(selectedAcademicYearId))
		const examName = String(selectedExam?.examName ?? selectedExam?.exam_name ?? '').trim() || 'Exam'
		const courseLabel = String(selectedCourse?.course_code ?? selectedCourse?.course_name ?? '').trim()
		const ayLabel = String(selectedAy?.academic_year ?? selectedAy?.academicYear ?? '').trim()
		const headerSubtitle = [courseLabel, ayLabel].filter(Boolean).join(' / ')

		const firstRow = filteredRows[0]
		const firstDate = firstRow?.examDate ?? ''
		const firstSession = firstRow?.session ?? ''
		const totalStudents = filteredRows.reduce((sum, r) => sum + (r.bookedSeats || 0), 0)

		function PrintShell({ title, children }: { title: string; children: React.ReactNode }) {
			return (
				<div
					className="text-black"
					style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px' }}
				>
					<div className="text-center mb-3">
						{/* Dynamic selected-college logo (Angular: MINIO + Logo). */}
						<img
							src={collegeLogo}
							alt=""
							style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }}
							onError={(e) => {
								const img = e.currentTarget as HTMLImageElement
								if (!img.src.endsWith('default_logo.png')) img.src = '/assets/images/avatars/default_logo.png'
								else img.style.display = 'none'
							}}
						/>
						<p style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px', margin: 0, textTransform: 'uppercase' }}>{title}</p>
						<p style={{ fontSize: '14px', margin: '6px 0 0 0' }}>{examName}</p>
						{headerSubtitle && <p style={{ fontSize: '12px', margin: '2px 0 0 0' }}>{headerSubtitle}</p>}
					</div>
					<div className="flex justify-between text-[12px] mb-3 px-1">
						<span>Date : <b>{firstDate || '—'}</b></span>
						<span>Session : <b>{firstSession || '—'}</b></span>
					</div>
					{children}
					<div className="flex justify-between mt-10 text-[12px] px-1">
						<div>Total No. of Students : <b>{totalStudents}</b></div>
						<div>Controller of Examinations</div>
					</div>
				</div>
			)
		}


		const dateSessionGroups = filteredRows.reduce<Record<string, AllocationRow[]>>((acc, r) => {
			const key = `${r.examDate} / ${r.session}`
			if (!acc[key]) acc[key] = []
			acc[key].push(r)
			return acc
		}, {})

		if (printMode === 'room-wise-seating') {
			// Group by room_name to mirror Angular's groupedAllocations shape.
			const grouped = roomWiseAllocations.reduce<Record<string, any[]>>((acc, curr) => {
				const key = String(curr?.room_name ?? '—')
				if (!acc[key]) acc[key] = []
				acc[key].push(curr)
				return acc
			}, {})
			const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
			return (
				<PrintShell title="Seating Arrangement">
					{groups.length === 0 ? (
						<p className="text-[11px] text-center py-6">No room-wise allotment data for this exam date / session.</p>
					) : (
						groups.map(({ room_name, records }, gi) => (
							<table key={`rws-${room_name}-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>S.No.</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Room Number</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>H.T. Numbers</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Branch</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>No. of Students</th>
									</tr>
								</thead>
								<tbody>
									{records.map((alloc: any, i: number) => (
										<tr key={`rws-row-${room_name}-${i}`}>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{i + 1}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.room_name ?? '—'}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>
												{alloc['min(tssd.hallticket_number)'] ?? '—'} to {alloc['max(tssd.hallticket_number)'] ?? '—'}
											</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.group_code ?? '—'}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.cnt ?? 0}</td>
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
			// Group by room_name to mirror Angular's groupedSubjectAllocations shape.
			const grouped = roomSubjectAllocations.reduce<Record<string, any[]>>((acc, curr) => {
				const key = String(curr?.room_name ?? '—')
				if (!acc[key]) acc[key] = []
				acc[key].push(curr)
				return acc
			}, {})
			const groups = Object.entries(grouped).map(([room_name, records]) => ({ room_name, records }))
			return (
				<PrintShell title="Seating Arrangement — Subject Counts">
					{groups.length === 0 ? (
						<p className="text-[11px] text-center py-6">No room-subject allotment data for this exam date / session.</p>
					) : (
						groups.map(({ room_name, records }, gi) => (
							<table key={`rsc-${room_name}-${gi}`} className="w-full border-collapse text-[11px] mb-4" style={{ border: '1px solid #000' }}>
								<thead>
									<tr>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>S.No.</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Room Number</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Subject</th>
										<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>No. of Question Papers</th>
									</tr>
								</thead>
								<tbody>
									{records.map((alloc: any, i: number) => (
										<tr key={`rsc-row-${room_name}-${i}`}>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{i + 1}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.room_name ?? '—'}</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>
												{(alloc.subject_name ?? '—')}({alloc.subject_code ?? '—'})
											</td>
											<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.cnt ?? 0}</td>
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
			// Mirror Angular groupedSubjects: subject_name → branches → allocations.
			// Step 1: bucket by subject_name. Step 2: within each, bucket by group_code.
			const bySubject = new Map<string, any[]>()
			for (const r of groupwiseAllocations) {
				const key = String(r?.subject_name ?? '—')
				if (!bySubject.has(key)) bySubject.set(key, [])
				bySubject.get(key)!.push(r)
			}
			let sno = 1
			const groupedSubjects = Array.from(bySubject.entries()).map(([subject_name, rows]) => {
				const byBranch = new Map<string, any[]>()
				for (const r of rows) {
					const key = String(r?.group_code ?? '—')
					if (!byBranch.has(key)) byBranch.set(key, [])
					byBranch.get(key)!.push(r)
				}
				const branches = Array.from(byBranch.entries()).map(([branch, allocations]) => ({
					sno: sno++,
					branch,
					allocations,
				}))
				return { subject_name, branches }
			})
			return (
				<PrintShell title="Seating Arrangement — Group Wise">
					{groupedSubjects.length === 0 ? (
						<p className="text-[11px] text-center py-6">No group-wise allotment data for this exam date / session.</p>
					) : (
						groupedSubjects.map((subject) => (
							<div key={`gws-${subject.subject_name}`} style={{ marginBottom: '24px' }}>
								<h3 style={{ marginTop: '24px', fontSize: '14px' }}>Subject: {subject.subject_name}</h3>
								<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
									<thead>
										<tr>
											<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>S.No.</th>
											<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Branch</th>
											<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>H.T. Numbers</th>
											<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Room Number</th>
											<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>No. of Students</th>
										</tr>
									</thead>
									<tbody>
										{subject.branches.flatMap((group) =>
											group.allocations.map((alloc: any, i: number) => (
												<tr key={`gws-${subject.subject_name}-${group.branch}-${i}`}>
													{i === 0 && (
														<td style={{ border: '1px solid #000', padding: '4px 6px' }} rowSpan={group.allocations.length}>{group.sno}</td>
													)}
													{i === 0 && (
														<td style={{ border: '1px solid #000', padding: '4px 6px' }} rowSpan={group.allocations.length}>{group.branch}</td>
													)}
													<td style={{ border: '1px solid #000', padding: '4px 6px' }}>
														<strong>
															{alloc['min(tssd.hallticket_number)'] ?? '—'} to {alloc['max(tssd.hallticket_number)'] ?? '—'}
														</strong>
													</td>
													<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.room_name ?? '—'}</td>
													<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{alloc.cnt ?? 0}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						))
					)}
				</PrintShell>
			)
		}

		if (printMode === 'attendance') {
			// Mirror Angular getstudentBarcode(): group studentAllotmentDetails by
			// (fk_course_group_id | fk_subject_id | room_id | fk_examtype_catdet_id).
			// Each group becomes one ATTENDANCE SHEET page.
			const byKey = new Map<string, any[]>()
			for (const s of studentAllotmentDetails) {
				const key = [s.fk_course_group_id, s.fk_subject_id, s.room_id, s.fk_examtype_catdet_id].join('|')
				if (!byKey.has(key)) byKey.set(key, [])
				byKey.get(key)!.push(s)
			}
			const attGroups = Array.from(byKey.values()).map((students) =>
				students.slice().sort((a: any, b: any) =>
					String(a.hallticket_number).localeCompare(String(b.hallticket_number), undefined, { numeric: true }),
				),
			)
			if (attGroups.length === 0) {
				return (
					<PrintShell title="Attendance Sheet">
						<p className="text-[11px] text-center py-6">No allotted students for this exam date / session.</p>
					</PrintShell>
				)
			}
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
					{attGroups.map((students, gi) => {
						const s = students[0] as any
						return (
							<div key={`att-${gi}`} className={gi > 0 ? 'page-break' : ''}>
								<img src={collegeLogo} alt="" style={{ maxHeight: 80, margin: '0 auto 8px', display: 'block' }} onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (!img.src.endsWith('default_logo.png')) img.src = '/assets/images/avatars/default_logo.png'; else img.style.display = 'none' }} />
								<h4 style={{ textAlign: 'center', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Attendance Sheet</h4>
								<h4 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '14px' }}>
									{s?.exam_label_name ?? examName} {s?.exam_type_name ? `(${s.exam_type_name})` : ''}
								</h4>
								<div className="flex justify-between text-[12px] mb-1 px-1">
									<div><b>Branch :</b> {s?.group_code ?? '—'}</div>
									<div><b>Date :</b> {s?.exam_date ?? '—'}</div>
									<div><b>Room :</b> {s?.room_name ?? '—'}</div>
								</div>
								<div className="flex justify-between text-[12px] mb-3 px-1">
									<div style={{ flex: 2 }}><b>Subject:</b> {s?.subject_name ?? '—'}</div>
									<div><b>Session:</b> {s?.sessin_time ?? s?.session_name ?? '—'}</div>
								</div>
								<table className="w-full border-collapse text-[11px] mb-3" style={{ border: '1px solid #000' }}>
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
												<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{stu.hallticket_number ?? '—'}</td>
												<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{stu.student_name ?? '—'}</td>
												<td style={{ border: '1px solid #000', padding: '4px 6px' }}>&nbsp;</td>
											</tr>
										))}
									</tbody>
								</table>
								<table className="w-full border-collapse text-[11px] mb-3" style={{ border: '1px solid #000' }}>
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
								<div className="flex justify-between text-[12px] mt-8 px-1">
									<div>Signature of the Invigilator - I</div>
									<div>Signature of the Invigilator - II</div>
									<div>Controller of Examinations</div>
								</div>
							</div>
						)
					})}
				</div>
			)
		}


		if (printMode === 'student' || printMode === 'groupwise-stickers') {
			// Mirror Angular print-seating-stickers + print-groupwise-seating-stickers.
			// Both render 4-column sticker tables headed by an exam-info card; the
			// only difference is the grouping (Print Stickers groups by room, Group-
			// Wise Stickers groups by room *and* course-group).
			const isGroupwise = printMode === 'groupwise-stickers'
			// Outer group: by room.
			const byRoom = new Map<string, any[]>()
			for (const s of studentAllotmentDetails) {
				const key = String(s.room_id ?? s.room_name ?? '—')
				if (!byRoom.has(key)) byRoom.set(key, [])
				byRoom.get(key)!.push(s)
			}
			const rooms = Array.from(byRoom.values())
			if (rooms.length === 0) {
				return (
					<PrintShell title={isGroupwise ? 'Group-Wise Seating Stickers' : 'Seating Stickers'}>
						<p className="text-[11px] text-center py-6">No allotted students for this exam date / session.</p>
					</PrintShell>
				)
			}
			// Replace Angular's <table> sticker layout with div+flex so the header
			// stays visible across pages and the grid paginates cleanly. Each
			// sticker cell uses pageBreakInside:avoid to prevent split rendering.
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
							<span>{data.hallticket_number ?? ''}</span>
							{data.omr_serial_no ? <>&nbsp;&nbsp;<span>{data.omr_serial_no}</span></> : null}
						</div>
						{data.omr_barcode ? (
							<img
								src={`data:image/jpg;base64,${data.omr_barcode}`}
								style={{ height: '30px', width: '180px' }}
								alt=""
							/>
						) : null}
						<div style={{ display: 'flex', justifyContent: 'center', fontSize: '7px', marginTop: '1px' }}>
							{data.exam_date ?? ''} &nbsp;&nbsp; {data.subject_code ?? ''}
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
						<div style={{ fontSize: '10px', fontWeight: 'bold' }}>{row?.exam_name ?? examName}</div>
						<div>|{row?.university_code ?? '—'}|</div>
						<div>
							<span>{row?.exam_date ?? ''}</span> &nbsp;
							<span>{row?.exam_session_name ?? row?.session_name ?? ''}</span>
						</div>
						<div>
							<span>Room: {row?.room_name ?? '—'}</span>
							{extraGroup ? <> | <span>Group: {extraGroup}</span></> : null}
						</div>
					</div>
				)
			}
			return (
				<div className="text-black" style={{ fontFamily: 'Times New Roman, Times, serif', padding: '20px', maxWidth: '990px', margin: '0 auto' }}>
					{rooms.map((roomStudents, ri) => {
						if (isGroupwise) {
							// For group-wise, further bucket by fk_course_group_id within room.
							const byGroup = new Map<string, any[]>()
							for (const s of roomStudents) {
								const key = String(s.fk_course_group_id ?? s.group_code ?? '—')
								if (!byGroup.has(key)) byGroup.set(key, [])
								byGroup.get(key)!.push(s)
							}
							return Array.from(byGroup.entries()).map(([groupKey, students], gi) => {
								const head = students[0]
								return (
									<div key={`gst-${ri}-${gi}`} className={(ri + gi) > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
										<StickerHeader row={head} extraGroup={head?.group_code ?? groupKey} />
										<div style={{ overflow: 'auto', margin: '0 4px' }}>
											{students.map((stu: any, ci: number) => (
												<StickerCell key={`gst-${ri}-${gi}-${ci}`} data={stu} />
											))}
										</div>
									</div>
								)
							})
						}
						const head = roomStudents[0]
						return (
							<div key={`stk-${ri}`} className={ri > 0 ? 'page-break' : ''} style={{ marginBottom: '20px' }}>
								<StickerHeader row={head} />
								<div style={{ overflow: 'auto', margin: '0 4px' }}>
									{roomStudents.map((stu: any, ci: number) => (
										<StickerCell key={`stk-${ri}-${ci}`} data={stu} />
									))}
								</div>
							</div>
						)
					})}
				</div>
			)
		}

		if (printMode === 'invigilator') {
			return (
				<PrintShell title="Invigilators">
					{invigilatorRows.length === 0 ? (
						<p className="text-[11px] text-center py-6">No invigilator allotments for this exam timetable.</p>
					) : (
						<table className="w-full border-collapse text-[11px]" style={{ border: '1px solid #000' }}>
							<thead>
								<tr>
									<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>S.NO</th>
									<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Room</th>
									<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Invigilator</th>
									<th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Signature</th>
								</tr>
							</thead>
							<tbody>
								{invigilatorRows.map((row: any, i: number) => (
									<tr key={`inv-${i}`}>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>{i + 1}</td>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>
											{row.roomName ?? row.room_name ?? row.examRoomCode ?? '—'}
										</td>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>
											{row.invigilatorEmpName ?? row.invigilator_emp_name ?? row.employeeName ?? '—'}
										</td>
										<td style={{ border: '1px solid #000', padding: '4px 6px' }}>&nbsp;</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</PrintShell>
			)
		}

		if (printMode === 'cover-slip' || printMode === 'packing-slip') {
			const title = printMode === 'cover-slip' ? 'Cover Slip' : 'Packing Slip'
			return (
				<PrintShell title={title}>
					{filteredRows.map((r, ri) => (
						<div key={`cs-${ri}`} className={ri > 0 ? 'page-break pt-3' : 'pt-1'}>
							<div className="border-2 border-slate-700 p-4">
								<div className="text-center text-[14px] font-bold mb-1">{title}</div>
								<div className="text-center text-[11px] mb-3">{headerSubtitle || examName}</div>
								<div className="grid grid-cols-2 gap-2 text-[11px]">
									<div><b>Room:</b> {r.roomCode}</div>
									<div><b>Exam Date:</b> {r.examDate}</div>
									<div><b>Session:</b> {r.session}</div>
									<div><b>Total Students:</b> {r.bookedSeats}</div>
									<div><b>Blocked Seats:</b> {r.blockedSeats}</div>
									<div><b>Available:</b> {r.availableSeats}</div>
								</div>
								<div className="mt-4 grid grid-cols-2 gap-4 text-[10px]">
									<div>Invigilator Signature: ____________________</div>
									<div>Chief Superintendent: ____________________</div>
								</div>
							</div>
						</div>
					))}
				</PrintShell>
			)
		}
	}

	return (
		<PageContainer className="space-y-4">
			{loadingPrintData && (
				<div
					data-print-hide
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
				>
					<div className="rounded-lg bg-white px-6 py-4 shadow-lg flex items-center gap-3">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
						<div className="flex flex-col">
							<span className="text-[13px] font-semibold text-slate-900">Preparing print…</span>
							<span className="text-[11px] text-slate-500">Fetching student data from server (can take 10-15s)</span>
						</div>
					</div>
				</div>
			)}
			<PageHeader title="Exam Room Seating Plan" subtitle="Allocate exam room seating" />
			<div className="app-card overflow-hidden">
				<div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
					<h2 className="app-card-title">Exam Room Seating Plan</h2>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-6 px-2.5 text-[12px]"
						onClick={() => setFilterOpen((v) => !v)}
						aria-expanded={filterOpen}
					>
						<Filter className="mr-1.5 h-3.5 w-3.5" />
						Filter
						<ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
					</Button>
				</div>

				{filterOpen && (
				<div className="px-3 py-3">
					<div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
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
							<Select value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined} onValueChange={(v) => setSelectedAcademicYearId(Number(v))} disabled={academicYearOptions.length === 0}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Year" />
								</SelectTrigger>
								<SelectContent>
									{academicYearOptions.map((a) => (
										<SelectItem key={a.id} value={String(a.id)}>
											{a.label}
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
							<Select
								value={selectedExamId != null ? String(selectedExamId) : undefined}
								onValueChange={(v) => setSelectedExamId(Number(v))}
								disabled={!selectedCourseId || !selectedAcademicYearId || loadingFilters}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={!selectedAcademicYearId ? 'Select Exam Year first' : 'Select Exam Master'} />
								</SelectTrigger>
								<SelectContent>
									<div className="p-2 border-b">
										<input
											className="h-8 w-full rounded-md border border-input bg-card px-2 text-[12px]"
											placeholder="Search Exam…"
											value={examMasterSearch}
											onChange={(e) => setExamMasterSearch(e.target.value)}
										/>
									</div>
									{filteredExamMasters.length === 0 && (
										<div className="px-2 py-1.5 text-[12px] text-muted-foreground">No exam masters found</div>
									)}
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
							<Select
								value={selectedExamTimetableId != null ? String(selectedExamTimetableId) : undefined}
								onValueChange={(v) => setSelectedExamTimetableId(Number(v))}
								disabled={!selectedExamId}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={!selectedExamId ? 'Select Exam Master first' : 'Select Exam Timetable'} />
								</SelectTrigger>
								<SelectContent>
									{sessionOptions.length === 0 && (
										<div className="px-2 py-1.5 text-[12px] text-muted-foreground">No timetable found</div>
									)}
									{sessionOptions.map((s) => (
										<SelectItem key={`session-${s.id}`} value={String(s.id)}>
											<span>{s.examDate} </span>
											<span className="text-blue-700">({s.session})</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				)}
			</div>

			{selectedExamTimetableId != null && (
				<div className="app-card p-3 space-y-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<SearchInput className="w-full max-w-sm" placeholder="Search…" value={searchText} onChange={setSearchText} />
						<div className="flex flex-wrap items-center gap-2 sm:ml-auto">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 gap-1.5 rounded-md border-[hsl(var(--primary))]/35 bg-card px-3 text-[11px] font-medium text-[hsl(var(--primary))] shadow-sm hover:bg-[hsl(var(--primary))]/[0.07] hover:text-[hsl(var(--primary))]"
								onClick={handleCopyExistingSeating}
							>
								<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
								Copy Existing Seating
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 gap-1.5 rounded-md border-[hsl(var(--primary))]/35 bg-card px-3 text-[11px] font-medium text-[hsl(var(--primary))] shadow-sm hover:bg-[hsl(var(--primary))]/[0.07] hover:text-[hsl(var(--primary))]"
								onClick={handleAddRoomSeatingPlan}
							>
								<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
								Add Room Seating Plan
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 gap-1.5 rounded-md border-[hsl(var(--primary))]/35 bg-card px-3 text-[11px] font-medium text-[hsl(var(--primary))] shadow-sm hover:bg-[hsl(var(--primary))]/[0.07] hover:text-[hsl(var(--primary))]"
								onClick={handleAssignSeating}
							>
								<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
								Assign Seating
							</Button>
							{/* Angular exam-room-allotment autoAssign(): s_pop_exam_invigilator
							    with the selected timetable detail id. */}
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-8 gap-1.5 rounded-md border-[hsl(var(--primary))]/35 bg-card px-3 text-[11px] font-medium text-[hsl(var(--primary))] shadow-sm hover:bg-[hsl(var(--primary))]/[0.07] hover:text-[hsl(var(--primary))]"
								disabled={!selectedExamTimetableId}
								onClick={async () => {
									if (!selectedExamTimetableId) return
									try {
										await popExamInvigilator(selectedExamTimetableId)
										toast.success('Invigilators auto-assigned')
									} catch {
										toast.error('Auto-assign invigilators failed')
									}
								}}
							>
								<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
								Auto Assign Invigilators
							</Button>
						</div>
					</div>

					<div className="rounded-lg border border-border/90 bg-muted/40/70 p-3 print-hide">
						<p className="mb-2 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							Print & exports
						</p>
						<div className="flex flex-wrap gap-1.5">
							{(
								[
									['Room Wise Seating Print', 'room-wise-seating'],
									['Room Subject Counts Print', 'room-subject-counts'],
									['Group Wise Seating Print', 'group-wise-seating'],
									['Print Attendance Sheet', 'attendance'],
									['Print Stickers', 'student'],
									['Group-Wise Stickers', 'groupwise-stickers'],
									['Print Invigilator', 'invigilator'],
									['Cover Slip', 'cover-slip'],
									['Packing Slip', 'packing-slip'],
								] as const
							).map(([label, mode]) => (
								<Button
									key={label}
									type="button"
									variant="outline"
									size="sm"
									className="h-8 gap-1.5 rounded-md border-border bg-card px-2.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-input hover:bg-card hover:text-slate-900"
									onClick={async () => {
										if (selectedCourseId && selectedExamId) {
											const session = sessionOptions.find((s) => s.id === selectedExamTimetableId)
											const examDate = session?.examDate ?? filteredRows[0]?.examDate ?? ''
											// SessionOption stores the real exam-session id under .sessionId (the
											// helper that builds it pulls from examSessionId / fk_exam_session_id /
											// sessionId / exam_session_id and assigns to .sessionId). Try every
											// alias before giving up so the proc gets a real id, not 0.
											const sessionId =
												(session as any)?.sessionId ??
												(session as any)?.examSessionId ??
												(session as any)?.fk_exam_session_id ??
												(session as any)?.exam_session_id ??
												0
											const params = { courseId: selectedCourseId, examId: selectedExamId, examDate, sessionId }
											if (mode === 'room-wise-seating') {
												setLoadingPrintData(true)
												const data = await getRoomwiseAllotmentSummary(params).catch(() => [] as any[])
												setRoomWiseAllocations(data)
												setLoadingPrintData(false)
											} else if (mode === 'room-subject-counts') {
												setLoadingPrintData(true)
												const data = await getRoomwiseSubjectSummary(params).catch(() => [] as any[])
												setRoomSubjectAllocations(data)
												setLoadingPrintData(false)
											} else if (mode === 'group-wise-seating') {
												setLoadingPrintData(true)
												const data = await getGroupwiseAllotmentSummary(params).catch(() => [] as any[])
												setGroupwiseAllocations(data)
												setLoadingPrintData(false)
											} else if (mode === 'invigilator' && selectedExamTimetableId) {
												setLoadingPrintData(true)
												const data = await listExamInvigilationAllotmentsByTimetable(selectedExamTimetableId).catch(() => [] as any[])
												setInvigilatorRows(data)
												setLoadingPrintData(false)
											} else if (mode === 'student' || mode === 'groupwise-stickers' || mode === 'attendance') {
												// All three render per-student rows from the same Angular call:
												// roomwise_OMR_students -> studentAllotmentDetails. Attendance groups
												// by (course_group, subject, room, examtype) for the sheet; stickers
												// group by room (or room+group for the group-wise variant).
												setLoadingPrintData(true)
												const data = await listRoomwiseOmrStudents({
													examId: selectedExamId,
													courseId: selectedCourseId,
													examDate,
													sessionId,
												}).catch(() => [] as any[])
												setStudentAllotmentDetails(data)
												setLoadingPrintData(false)
											}
										}
										triggerPrint(mode)
									}}
								>
									<Printer className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
									{label}
								</Button>
							))}
						</div>
					</div>

					<DataTable rowData={filteredRows} columnDefs={columnDefs} pagination />
				</div>
			)}
			<ConfirmDialog
				open={assignSeatingOpen}
				title="Assign Seating Allotment"
				description="If you have already created a seating plan, this action will erase the existing plan and generate a new one. You may also need to reprint all related summaries. Are you sure you want to continue? Press OK to proceed, or Cancel to go back."
				confirmLabel="OK"
				confirmVariant="default"
				isLoading={assignSeatingBusy}
				onConfirm={confirmAssignSeating}
				onCancel={() => setAssignSeatingOpen(false)}
			/>
		</PageContainer>
	)
}

