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
import { listCourseYears, getExamTimetableDetails } from '@/services/examination'
import {
	listExamInvigilationAllotments,
	listExamRoomAllotments as listExamRoomAllotmentsDomain,
} from '@/services/seating-plan'
import {
	getUnivExamFiltersRegSup,
	getUnivExamRestNoTt,
	listExamTimetablesByExam,
	listExamRoomAllotments as listExamRoomAllotmentsPre,
} from '@/services/pre-examination'
import { ChevronDown, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NEXT_API } from '@/config/constants/api'

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
}

function formatAcademicYearLabel(row: any): string {
	const raw = String(row?.academic_year ?? row?.academicYear ?? row?.label ?? '').trim()
	if (!raw) return ''
	// Match legacy visual style: 2024-2025 (without extra spaces around hyphen).
	return raw.replace(/\s*-\s*/g, '-')
}

function formatExamTimetableLabel(row: any): string {
	const rawDate = String(row?.examDate ?? row?.exam_date ?? '').trim()
	const date = rawDate ? rawDate.slice(0, 10) : ''
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
	const examDate = examDateMatch ? examDateMatch[0] : (rawDate ? rawDate.slice(0, 10) : '')
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
	const dateOnly = (raw.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? raw).slice(0, 10)
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

async function fetchRoomwiseOmrStudents(params: {
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
	return flattenLegacyResult(body)
}

async function fetchUnivExamFilters(params?: {
	loginEmpId?: number
	courseId?: number
	examId?: number
	academicYearId?: number
}): Promise<any[]> {
	const search = new URLSearchParams({
		in_flag: 'univ_exam_filters',
		in_flag_type: 'ALL',
		in_university_id: '0',
		in_univ_examcenter_id: '0',
		in_college_id: '0',
		in_course_id: String(params?.courseId ?? 0),
		in_course_group_id: '0',
		in_course_year_id: '0',
		in_exam_id: String(params?.examId ?? 0),
		in_academic_year_id: String(params?.academicYearId ?? 0),
		in_regulation_id: '0',
		in_subject_id: '0',
		in_sub_flag_type: '',
		in_param1: '0',
		in_param2: '0',
		in_loginuser_roleid: '0',
		in_loginuser_empid: String(params?.loginEmpId ?? 31754),
	})
	const res = await fetch(NEXT_API.PROXY(`/getAllRecords/s_get_exam_filters_bycode?${search.toString()}`))
	const body = await res.json().catch(() => null)
	return flattenLegacyResult(body)
}

export default function SeatingPlanSetupPage() {
	const router = useRouter()
	// Top-level filters
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
	const [examMasterSearch, setExamMasterSearch] = useState('')
	const [examTimetables, setExamTimetables] = useState<any[]>([])
	const [selectedExamTimetableId, setSelectedExamTimetableId] = useState<number | null>(null)
	const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
	const [univExamFilterRows, setUnivExamFilterRows] = useState<any[]>([])
	const [filterOpen, setFilterOpen] = useState(true)
	const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

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
				await handleCourseChange(distinctCourses[0].fk_course_id)
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [employeeId])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	async function handleCourseChange(courseId: number) {
		setSelectedCourseId(courseId)
		setSelectedCollegeId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setRestRows([])
		setCourseYears([])
		setSelectedCourseYearId(null)

		// Keep exam years aligned to the selected course like legacy flow.
		const yearRowsForCourse = (baseRows ?? []).filter(
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

	useEffect(() => {
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
			const restList = Array.isArray(rest) ? rest : []
			setRestRows(restList)
			const distinctColleges = distinct(restList.filter((x: any) => x.fk_college_id), (x: any) => x.fk_college_id)
			setSelectedCollegeId((prev) => {
				const prevId = Number(prev ?? 0)
				return distinctColleges.some((c: any) => Number(c.fk_college_id) === prevId)
					? prevId
					: (distinctColleges[0]?.fk_college_id ?? null)
			})
			const freshUnivRows = await fetchUnivExamFilters({
				courseId: selectedCourseId ?? 0,
				examId: selectedExamId ?? 0,
				academicYearId: selectedAcademicYearId ?? 0,
			}).catch(() => [])
			const effectiveUnivRows = Array.isArray(freshUnivRows) && freshUnivRows.length > 0
				? freshUnivRows
				: univExamFilterRows
			// Legacy behavior: timetable list should still appear even when course-year mapping is absent.
			const directTt = await listExamTimetablesByExam(selectedExamId).catch(() => [])
			let list = Array.isArray(directTt) ? directTt : []
			if (list.length === 0 && selectedCourseYearId) {
				const rows = await getExamTimetableDetails(selectedCourseYearId, selectedCourseId, selectedExamId).catch(() => [])
				list = Array.isArray(rows) ? rows : []
			}
			if (process.env.NODE_ENV !== 'production') {
				// Temporary debug: inspect legacy timetable payload keys for exact mapping.
				console.log('[SeatingPlanSetup] getExamTimetableDetails first row:', list?.[0] ?? null)
			}
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
		loadExamTimetables()
	}, [employeeId, selectedCourseId, selectedCourseYearId, selectedExamId, selectedAcademicYearId, univExamFilterRows])

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
		async function loadRoomAllotmentsBySelection() {
			if (!selectedExamId || !selectedExamTimetableId || !selectedCourseId || !selectedCollegeId) {
				setPreviewRows([])
				return
			}
			const selectedExamDate = String(
				selectedTimetable?.examDate ??
				'',
			).slice(0, 10)
			const selectedSessionId =
				Number(
					selectedTimetable?.sessionId ??
					0
				) || 0

			let rows = await fetchRoomwiseOmrStudents({
				examId: selectedExamId,
				courseId: selectedCourseId,
				examDate: selectedExamDate,
				sessionId: selectedSessionId,
			}).catch(() => [])

			// Fallback to domain query if legacy SP has no data for the chosen date/session.
			if (!Array.isArray(rows) || rows.length === 0) {
				rows = await listExamRoomAllotmentsPre(selectedCollegeId, selectedExamId, selectedExamTimetableId).catch(() => [])
			}
			if (!Array.isArray(rows) || rows.length === 0) {
				rows = await listExamRoomAllotmentsDomain(selectedExamId, selectedExamTimetableId).catch(() => [])
			}
			if (!Array.isArray(rows) || rows.length === 0) {
				setPreviewRows([])
				return
			}
			const mapped: AllocationRow[] = rows.map((r: any, i: number) => ({
				sl: i + 1,
				examDate: String(r.examDate ?? r.exam_date ?? ''),
				session: String(r.examSessionName ?? r.examsessioninCatCode ?? r.exam_session_name ?? ''),
				roomCode: [r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room_code ?? r.room ?? r.block_room]
					.filter(Boolean)
					.join(' / ') || '-',
				bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? r.noOfSeats ?? 0),
				blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
				availableSeats: Number(r.availableSeats ?? r.available_seats ?? 0),
				isActive: r.isActive ?? true,
				raw: r,
			}))
			setPreviewRows(mapped)
		}
		loadRoomAllotmentsBySelection()
	}, [selectedCollegeId, selectedCourseId, selectedExamId, selectedExamTimetableId, selectedTimetable])

	async function handleCopyExistingSeating() {
		if (!selectedExamId || !selectedExamTimetableId) return
		const rows = await listExamRoomAllotments(selectedExamId, selectedExamTimetableId).catch(() => [])
		const mapped: AllocationRow[] = (rows ?? []).map((r: any, i: number) => ({
			sl: i + 1,
			examDate: String(r.examDate ?? ''),
			session: String(r.examSessionName ?? ''),
			roomCode: [r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room ?? r.block_room]
				.filter(Boolean)
				.join(' / ') || '-',
			bookedSeats: Number(r.bookedSeats ?? r.booked_seats ?? r.noOfSeats ?? 0),
			blockedSeats: Number(r.blockedSeats ?? r.blocked_seats ?? 0),
			availableSeats: Number(r.availableSeats ?? r.available_seats ?? 0),
			isActive: r.isActive ?? true,
			raw: r,
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
			roomCode: [r.buildingCode, r.blockCode, r.floorName, r.roomCode ?? r.room ?? r.block_room]
				.filter(Boolean)
				.join(' / ') || '-',
			bookedSeats: Number(r.bookedSeats ?? r.noOfStudents ?? 0),
			blockedSeats: Number(r.blockedSeats ?? 0),
			availableSeats: Number(r.availableSeats ?? 0),
			isActive: r.isActive ?? true,
			raw: r,
		}))
		setPreviewRows(mapped)
	}

	function openSeatAllotStudents(row: AllocationRow) {
		const params = new URLSearchParams({
			collegeId: String(selectedCollegeId ?? ''),
			courseId: String(selectedCourseId ?? ''),
			examId: String(selectedExamId ?? ''),
			examTimetableId: String(selectedExamTimetableId ?? ''),
			academicYearId: String(selectedAcademicYearId ?? ''),
			academicYear: String(
				academicYearOptions.find((a) => a.id === selectedAcademicYearId)?.label ?? ''
			),
			courseCode: String(courseOptions.find((c) => c.id === selectedCourseId)?.label ?? ''),
			examName: String(examOptions.find((e) => e.id === selectedExamId)?.label ?? ''),
			sessionId: String(
				selectedTimetable?.examSessionId ??
				selectedTimetable?.fk_exam_session_id ??
				selectedTimetable?.sessionId ??
				selectedTimetable?.exam_session_id ??
				''
			),
			roomCode: String(row.roomCode ?? ''),
			examDate: String(row.examDate ?? ''),
			examSession: String(row.session ?? ''),
			examRoomAllotmentId: String(row.raw?.examRoomAllotmentId ?? row.raw?.id ?? ''),
			subjectId: String(
				row.raw?.subjectId ??
				row.raw?.subject_id ??
				selectedTimetable?.subjectId ??
				selectedTimetable?.subject_id ??
				''
			),
		})
		router.push(`/admin-examination-management/pre-examination/exam-scheduling-forms/add-exam-scheduling-forms?${params.toString()}`)
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
				isActive: true,
			},
		])
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

	return (
		<div className="px-6 pb-6 pt-2 space-y-2">
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Seating Plan Setup</h2>
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
											className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px]"
											placeholder="Search Exam..."
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
						<div className="space-y-1">
							<Label>College</Label>
							<Select value={selectedCollegeId != null ? String(selectedCollegeId) : undefined} onValueChange={(v) => setSelectedCollegeId(Number(v))}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="College" />
								</SelectTrigger>
								<SelectContent>
									{colleges.map((c: any, i: number) => (
										<SelectItem key={`clg-${c.fk_college_id ?? i}`} value={String(c.fk_college_id)}>
											{c.college_code ?? c.collegeCode ?? `College ${i + 1}`}
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
				<div className="app-card p-3 space-y-2">
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
										<th className="px-2 py-1 text-left">Exam Session</th>
										<th className="px-2 py-1 text-left">Room Code</th>
										<th className="px-2 py-1 text-left">Booked Seats</th>
										<th className="px-2 py-1 text-left">Blocked Seats</th>
										<th className="px-2 py-1 text-left">Available Seats</th>
										<th className="px-2 py-1 text-left">Status</th>
										<th className="px-2 py-1 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredRows.map((r, i) => (
										<tr key={`alloc-${i}`}>
											<td className="px-2 py-1">{r.sl}</td>
											<td className="px-2 py-1">{formatTableDate(r.examDate)}</td>
											<td className="px-2 py-1">
												{r.session}
												{r.raw?.sessionStartTime || r.raw?.sessionEndTime
													? ` (${tConvert(r.raw?.sessionStartTime)}-${tConvert(r.raw?.sessionEndTime)})`
													: ''}
											</td>
											<td className="px-2 py-1">{formatRoomCode(r.roomCode)}</td>
											<td className="px-2 py-1">{r.bookedSeats}</td>
											<td className="px-2 py-1">{r.blockedSeats}</td>
											<td className="px-2 py-1">{r.availableSeats}</td>
											<td className="px-2 py-1">{r.isActive ? 'Active' : 'InActive'}</td>
											<td className="px-2 py-1">
												<button
													type="button"
													className="text-[hsl(var(--primary))] hover:underline"
													onClick={() => openSeatAllotStudents(r)}
												>
													Seat Allot Students
												</button>
											</td>
										</tr>
									))}
									{filteredRows.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={9}>No rows for selected exam session.</td>
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

