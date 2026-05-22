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
import { useSearchParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import {
	getUnivExamFiltersAll,
	resolveExamLoginEmpId,
	listCourseYears,
	listCourseGroups,
	listExamSessions,
	getExamSubjectsForSchedule,
	getUnivExamSubjectFilters,
	listExamFeeTypeGeneralDetails,
	getExamTimetableDetails,
} from '@/services/examination'
import { useSessionContext } from '@/context/SessionContext'
import { PageContainer, PageHeader } from '@/components/layout'
import { useBreadcrumbLabel } from '@/common/components/breadcrumb'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { EXAM_API, NEXT_API } from '@/config/constants/api'
import ExistingExamTimetableModal, { type ExistingExamTimetableRow } from '../ExistingExamTimetableModal'

type Slot = {
	date: string
	startTime: string
	endTime: string
	subject?: string
	venue?: string
}

export default function CreateExamTimetablePage() {
	const searchParams = useSearchParams()
	const { user } = useSessionContext()

	useBreadcrumbLabel('Create Timetable')
	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])

	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [paramCourseId, setParamCourseId] = useState<number | null>(null)
	const [paramAcademicYearId, setParamAcademicYearId] = useState<number | null>(null)
	const [paramExamId, setParamExamId] = useState<number | null>(null)
	const [paramCourseYearId, setParamCourseYearId] = useState<number | null>(null)
	const [paramCourseName, setParamCourseName] = useState('')
	const [paramAcademicYear, setParamAcademicYear] = useState('')
	const [paramExamName, setParamExamName] = useState('')
	const [paramFromDate, setParamFromDate] = useState('')
	const [paramToDate, setParamToDate] = useState('')

	// Course years
	const [q, setQ] = useState('')
	const [selectedCourseYearIds, setSelectedCourseYearIds] = useState<Set<number>>(new Set())
	const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)

	// Subjects
	const [subjects, setSubjects] = useState<{ id: number; code: string; name?: string }[]>([])
	/** EXMFEETYP general-detail code (shown as "Exam fee type"). */
	const [selectedRegulation, setSelectedRegulation] = useState<string | null>(null)
	const [examFeeTypes, setExamFeeTypes] = useState<{ id: number; code: string; name: string }[]>([])
	const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | null>(null)

	// Exam sessions (replaces hardcoded M/A select)
	const [examSessions, setExamSessions] = useState<
		{ id: number; name: string; code: string; sessionStartTime?: string; sessionEndTime?: string }[]
	>([])
	const [selectedExamSessionId, setSelectedExamSessionId] = useState<number | null>(null)

	useEffect(() => {
		let cancelled = false
		async function loadSessions() {
			const rows = await listExamSessions().catch(() => [] as any[])
			if (cancelled) return
			const mapped = (Array.isArray(rows) ? rows : []).map((r: any) => ({
				id: Number(r.examSessionId ?? r.id ?? 0),
				name: String(r.examSessionName ?? r.name ?? '').trim(),
				code: String(r.examsessioninCatCode ?? r.sessionCode ?? '').trim(),
				sessionStartTime: r.sessionStartTime ? String(r.sessionStartTime) : undefined,
				sessionEndTime: r.sessionEndTime ? String(r.sessionEndTime) : undefined,
			})).filter((s) => s.id > 0)
			setExamSessions(mapped)
		}
		void loadSessions()
		return () => {
			cancelled = true
		}
	}, [])

	// Timetable slots
	const [slotDraft, setSlotDraft] = useState<Slot>({ date: '', startTime: '', endTime: '' })
	const [slots, setSlots] = useState<Slot[]>([])
	// Course groups (loaded from API on courseId change)
	const [courseGroups, setCourseGroups] = useState<{ id: number; code: string; regulationId?: number; regulationName?: string }[]>([])
	const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
	function toggleGroup(code: string) {
		setSelectedGroups((s) => {
			const next = new Set(s)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})
	}

	useEffect(() => {
		setCourseGroups([])
		setSelectedGroups(new Set())
		if (!selectedCourseId) return
		let cancelled = false
		async function loadGroups() {
			const rows = await listCourseGroups(selectedCourseId as number).catch(() => [] as any[])
			if (cancelled) return
			const list = (Array.isArray(rows) ? rows : []).map((g: any) => ({
				id: Number(g.courseGroupId ?? g.course_group_id ?? g.id ?? 0),
				code: String(
					g.groupCode ??
						g.courseGroupCode ??
						g.group_code ??
						g.course_group_code ??
						g.courseGroupName ??
						g.groupName ??
						'',
				).trim(),
				regulationId: Number(g.regulationId ?? g.regulation_id ?? g.fk_regulation_id ?? 0) || undefined,
				regulationName: String(
					g.regulationName ?? g.regulation_name ?? g.regulationShortName ?? '',
				).trim() || undefined,
			})).filter((g) => g.code)
			// Dedupe by code, preserving first occurrence
			const seen = new Set<string>()
			const unique = list.filter((g) => (seen.has(g.code) ? false : (seen.add(g.code), true)))
			setCourseGroups(unique)
		}
		void loadGroups()
		return () => {
			cancelled = true
		}
	}, [selectedCourseId])

	// Staged rows (table)
	type StagedRow = {
		examDate: string
		session: 'M' | 'A'
		examSessionId: number
		groupCode: string
		subjectCode: string
	}
	const [stagedRows, setStagedRows] = useState<StagedRow[]>([])
	const [saving, setSaving] = useState(false)

	// Existing Timetable modal
	const [existingOpen, setExistingOpen] = useState(false)
	const [existingRows, setExistingRows] = useState<ExistingExamTimetableRow[]>([])

	async function openExistingTimetable() {
		if (!selectedExamId || !selectedCourseYearId || !selectedCourseId) return
		const data = await getExamTimetableDetails(selectedCourseYearId, selectedCourseId, selectedExamId).catch(() => [])
		const rows = Array.isArray(data) ? data : []
		const mapped: ExistingExamTimetableRow[] = rows.map((r: any) => ({
			subjectName: String(r.subjectName ?? r.subject_name ?? r.paperTitle ?? '').trim(),
			subjecttypeName: String(r.subjecttypeName ?? r.subject_type_name ?? r.examPaperType ?? '').trim(),
			groupName: String(r.groupCode ?? r.groupName ?? r.courseGroupCode ?? r.course_group_code ?? '').trim(),
			courseYearName: String(r.courseYearName ?? r.course_year_name ?? r.yearName ?? '').trim(),
		}))
		setExistingRows(mapped)
		setExistingOpen(true)
	}

	const filteredCourseYears = useMemo(() => {
		const list = courseYears
		if (!q.trim()) return list
		const lower = q.toLowerCase()
		return list.filter((y: any) => {
			const label = (y.courseYearName ?? y.yearName ?? '').toString().toLowerCase()
			return label.includes(lower)
		})
	}, [q, courseYears])

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const empId = resolveExamLoginEmpId(user?.employeeId)
			const flat = await getUnivExamFiltersAll(empId)
			const f = flat.filter((r: any) => !r.flag || r.flag === 'univ_exam_filters')
			setFiltersData(f)
			const distinctCourses = distinct(f ?? [], (r) => r.fk_course_id)
			setCourses(distinctCourses)
			if (distinctCourses.length > 0) {
				handleCourseChange(distinctCourses[0].fk_course_id, f)
			}
			const gd = await listExamFeeTypeGeneralDetails().catch(() => [])
			setExamFeeTypes(
				(Array.isArray(gd) ? gd : []).map((d: any) => ({
					id: Number(d.generalDetailId ?? d.id ?? 0),
					code: String(d.generalDetailCode ?? d.code ?? ''),
					name: String(d.generalDetailName ?? d.name ?? ''),
				})).filter((d) => d.code),
			)
		} finally {
			setLoadingFilters(false)
		}
	}, [user?.employeeId])

	useEffect(() => {
		setParamCourseId(searchParams?.get('courseId') ? Number(searchParams?.get('courseId')) : null)
		setParamAcademicYearId(searchParams?.get('academicYearId') ? Number(searchParams?.get('academicYearId')) : null)
		setParamExamId(searchParams?.get('examId') ? Number(searchParams?.get('examId')) : null)
		setParamCourseYearId(searchParams?.get('courseYearId') ? Number(searchParams?.get('courseYearId')) : null)
		setParamCourseName(searchParams?.get('courseName') ?? '')
		setParamAcademicYear(searchParams?.get('academicYear') ?? '')
		setParamExamName(searchParams?.get('examName') ?? '')
		setParamFromDate(searchParams?.get('fromDate') ?? '')
		setParamToDate(searchParams?.get('toDate') ?? '')
		fetchFilters()
	}, [fetchFilters, searchParams])

	async function handleCourseChange(courseId: number, fRef = filtersData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setCourseYears([])
		setSelectedCourseYearIds(new Set())
		setSelectedCourseYearId(null)
		setSubjects([])
		setSelectedSubjectCode(null)

		const filtered = (fRef ?? []).filter((r: any) => Number(r.fk_course_id) === Number(courseId))
		const years = distinct(filtered, (r: any) => r.fk_academic_year_id).sort(
			(a: any, b: any) =>
				Number(String(b.academic_year ?? '').split('-')[0] || 0) -
				Number(String(a.academic_year ?? '').split('-')[0] || 0),
		)
		setAcademicYears(years)

		const yrs = await listCourseYears(courseId).catch(() => [])
		const arr = Array.isArray(yrs) ? yrs : []
		setCourseYears(arr)
		if (arr.length > 0) {
			if (
				paramCourseYearId &&
				arr.some((y: any) => Number(y.courseYearId ?? y.id) === Number(paramCourseYearId))
			) {
				setSelectedCourseYearId(paramCourseYearId)
			} else {
				const first = arr[0].courseYearId ?? arr[0].id ?? null
				if (first != null) setSelectedCourseYearId(first)
			}
		}
	}

	useEffect(() => {
		setExamMasters([])
		setSelectedExamId(null)
		if (!selectedCourseId || !selectedAcademicYearId) return
		const rows = filtersData.filter(
			(r: any) =>
				Number(r.fk_course_id) === Number(selectedCourseId) &&
				Number(r.fk_academic_year_id) === Number(selectedAcademicYearId),
		)
		const uniqByExam = distinct(rows, (r: any) => Number(r.fk_exam_id ?? r.exam_id ?? r.examId ?? 0))
		const list = uniqByExam
			.map((r: any) => ({
				examId: Number(r.fk_exam_id ?? r.exam_id ?? r.examId ?? 0),
				examName: String(r.exam_name ?? r.exam_Name ?? r.exam_short_name ?? r.short_name ?? '—'),
			}))
			.filter((e: { examId: number }) => e.examId > 0)
		setExamMasters(list)
		if (list.length > 0) setSelectedExamId(list[0].examId)
	}, [selectedCourseId, selectedAcademicYearId, filtersData])

	useEffect(() => {
		if (loadingFilters || courses.length === 0 || !paramCourseId) return
		if (selectedCourseId === paramCourseId) return
		if (courses.some((c: any) => c.fk_course_id === paramCourseId)) {
			handleCourseChange(paramCourseId, filtersData)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadingFilters, paramCourseId, courses, selectedCourseId])

	useEffect(() => {
		if (paramAcademicYearId && academicYears.some((a: any) => a.fk_academic_year_id === paramAcademicYearId)) {
			setSelectedAcademicYearId(paramAcademicYearId)
		}
	}, [paramAcademicYearId, academicYears])

	useEffect(() => {
		if (paramExamId && examMasters.some((e: any) => (e.examId ?? e.id) === paramExamId)) {
			setSelectedExamId(paramExamId)
		}
	}, [paramExamId, examMasters])

	useEffect(() => {
		if (paramCourseYearId && courseYears.some((y: any) => (y.courseYearId ?? y.id) === paramCourseYearId)) {
			setSelectedCourseYearId(paramCourseYearId)
		}
	}, [paramCourseYearId, courseYears])

	// Load subjects when ids ready (uses legacy endpoints with fallback)
	useEffect(() => {
		async function loadSubjects() {
			setSubjects([])
			setSelectedSubjectCode(null)
			if (!selectedCourseId || !selectedAcademicYearId || !selectedExamId || !selectedCourseYearId) return
			const empId = resolveExamLoginEmpId(user?.employeeId)
			let rows: any[] = []
			rows = await getUnivExamSubjectFilters({
				courseId: selectedCourseId,
				examId: selectedExamId,
				academicYearId: selectedAcademicYearId,
				courseYearId: selectedCourseYearId,
				employeeId: empId,
			}).catch(() => [])
			if (!rows || (Array.isArray(rows) && rows.length === 0)) {
				rows = await getExamSubjectsForSchedule({
					courseId: selectedCourseId,
					examId: selectedExamId,
					academicYearId: selectedAcademicYearId,
					courseYearId: selectedCourseYearId,
					employeeId: empId,
				}).catch(() => [])
			}
			const mapped = (rows ?? []).map((r: any) => {
				const id = Number(r.subject_id ?? r.subjectId ?? r.id ?? r.fk_subject_id ?? 0)
				const code = String(
					r.subject_code ?? r.subjectCode ?? r.subCode ?? r.paperCode ?? r.code ?? ''
				).trim()
				const name = String(
					r.subject_name ?? r.subjectName ?? r.sub_name ?? r.paperName ?? r.name ?? ''
				).trim()
				return { id, code, name }
			}).filter((x) => x.code)
			// Deduplicate by code
			const seen = new Set<string>()
			const uniq: { id: number; code: string; name?: string }[] = []
			for (const s of mapped) {
				if (!seen.has(s.code)) {
					seen.add(s.code)
					uniq.push(s)
				}
			}
			setSubjects(uniq)
		}
		loadSubjects()
	}, [selectedCourseId, selectedAcademicYearId, selectedExamId, selectedCourseYearId, user?.employeeId])

	function toggleCourseYear(id: number) {
		setSelectedCourseYearIds((s) => {
			const next = new Set(s)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function addSlot() {
		if (!slotDraft.date || !slotDraft.startTime || !slotDraft.endTime) return
		setSlots((s) => [...s, slotDraft])
		setSlotDraft({ date: '', startTime: '', endTime: '' })
	}
	function removeSlot(i: number) {
		setSlots((s) => s.filter((_, idx) => idx !== i))
	}

	function addSelectedToStage() {
		const session: 'M' | 'A' | null = slotDraft.startTime ? (slotDraft.startTime < '12:00' ? 'M' : 'A') : null
		if (!slotDraft.date || !session || selectedExamSessionId == null || !selectedSubjectCode || selectedGroups.size === 0) return
		const rows: StagedRow[] = []
		for (const code of Array.from(selectedGroups)) {
			rows.push({
				examDate: slotDraft.date,
				session,
				examSessionId: selectedExamSessionId,
				groupCode: code,
				subjectCode: selectedSubjectCode,
			})
		}
		setStagedRows((s) => [...s, ...rows])
	}

	function removeStagedRow(idx: number) {
		setStagedRows((s) => s.filter((_, i) => i !== idx))
	}

	async function saveTimetable() {
		if (stagedRows.length === 0 || !selectedCourseId || !selectedExamId || !selectedCourseYearId) return
		const examTypeCatId = examFeeTypes.find((t) => t.code === selectedRegulation)?.id ?? 0
		if (!examTypeCatId) {
			toastError('Pick an Exam fee type before saving.')
			return
		}

		// Group rows by (examSessionId, examDate) to mirror the Angular payload
		// where each entry covers one date + session and carries an array of details.
		const grouped = new Map<string, StagedRow[]>()
		for (const r of stagedRows) {
			const key = `${r.examSessionId}|${r.examDate}`
			if (!grouped.has(key)) grouped.set(key, [])
			grouped.get(key)!.push(r)
		}

		const payload = Array.from(grouped.values()).map((rows) => {
			const first = rows[0]
			const session = examSessions.find((e) => e.id === first.examSessionId)
			return {
				examDate: first.examDate,
				courseId: selectedCourseId,
				examSessionId: first.examSessionId,
				session: session?.code ?? '',
				sessionStartTime: session?.sessionStartTime ?? null,
				sessionEndTime: session?.sessionEndTime ?? null,
				examId: selectedExamId,
				isActive: true,
				examTimetableDetail: rows.map((r) => {
					const grp = courseGroups.find((g) => g.code === r.groupCode)
					const subj = subjects.find((s) => s.code === r.subjectCode)
					return {
						examLabBatchesId: null,
						checked: false,
						examTypeCatId,
						examDate: r.examDate,
						courseYearId: selectedCourseYearId,
						courseGroupId: grp?.id,
						regulationId: grp?.regulationId,
						subjectId: subj?.id,
						isActive: true,
					}
				}),
			}
		})

		setSaving(true)
		try {
			const res = await fetch(NEXT_API.PROXY(EXAM_API.SAVE_EXAM_TIMETABLE), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			const body = await res.json().catch(() => null)
			if (!res.ok || !body || body.success === false) {
				toastError(body?.message ?? 'Save failed')
				return
			}
			if (Array.isArray(body.data) && body.data.length > 0) {
				const conflicts: ExistingExamTimetableRow[] = body.data.map((r: any) => ({
					subjectName: String(r.subjectName ?? '').trim(),
					subjecttypeName: String(r.subjecttypeName ?? '').trim(),
					groupName: String(r.groupName ?? '').trim(),
					courseYearName: String(r.courseYearName ?? '').trim(),
				}))
				setExistingRows(conflicts)
				setExistingOpen(true)
				toastError('Some subjects already exist for this session/year.')
				return
			}
			toastSuccess('Exam timetable saved')
			setStagedRows([])
		} catch (err) {
			toastError(getErrorMessage(err) ?? 'Save failed')
		} finally {
			setSaving(false)
		}
	}

	const canAdd = useMemo(() => {
		const hasDate = !!slotDraft.date
		const hasSession = selectedExamSessionId != null
		const hasSubject = !!selectedSubjectCode
		const hasGroups = selectedGroups.size > 0
		return hasDate && hasSession && hasSubject && hasGroups
	}, [slotDraft.date, selectedExamSessionId, selectedSubjectCode, selectedGroups])

	const summaryLine = useMemo(() => {
		const course = paramCourseName || courses.find((c) => c.fk_course_id === selectedCourseId)?.course_code || courses.find((c) => c.fk_course_id === selectedCourseId)?.course_name || ''
		const ay = paramAcademicYear || academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)?.academic_year || ''
		const cy = searchParams?.get('courseYearName') || courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)?.courseYearName || courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)?.yearName || ''
		const ex = paramExamName || examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)?.examName || ''
		return [course, ay, cy, ex].filter(Boolean).join(' / ')
	}, [paramCourseName, courses, selectedCourseId, paramAcademicYear, academicYears, selectedAcademicYearId, searchParams, courseYears, selectedCourseYearId, paramExamName, examMasters, selectedExamId])

	return (
		<PageContainer className="space-y-4">
		<PageHeader title="Create Exam Timetable" subtitle="Schedule exam dates and times" />
			{/* Header card */}
			<div className="app-card overflow-hidden">
				<div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
					<h2 className="app-card-title">Create Exam Timetable</h2>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-6 px-2.5 text-[12px]"
						onClick={openExistingTimetable}
						disabled={!selectedExamId || !selectedCourseYearId || !selectedCourseId}
					>
						Show Existing Timetable
					</Button>
				</div>

				<div className="px-3 py-3">
					<div className="mb-3 rounded-md border bg-muted/40/50 px-3 py-2 text-[13px] font-medium text-[hsl(var(--primary))]">
						{summaryLine || '—'}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
						<div className="space-y-1 md:col-span-3">
							<Label>Exam Date *</Label>
							<input
								type="date"
								autoFocus
								className="h-8 text-[12px] w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={slotDraft.date}
								onChange={(e) => setSlotDraft((s) => ({ ...s, date: e.target.value }))}
							/>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Exam Session *</Label>
							<Select
								value={selectedExamSessionId != null ? String(selectedExamSessionId) : undefined}
								onValueChange={(v) => {
									const sid = Number(v)
									setSelectedExamSessionId(sid)
									const s = examSessions.find((e) => e.id === sid)
									setSlotDraft((d) => ({
										...d,
										startTime: s?.sessionStartTime ?? '',
										endTime: s?.sessionEndTime ?? '',
									}))
								}}
								disabled={examSessions.length === 0}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={examSessions.length === 0 ? 'Loading…' : 'Select Session'} />
								</SelectTrigger>
								<SelectContent>
									{examSessions.map((s) => (
										<SelectItem key={s.id} value={String(s.id)}>
											{s.name}
											{s.sessionStartTime && s.sessionEndTime ? ` (${s.sessionStartTime} - ${s.sessionEndTime})` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Exam fee type *</Label>
							<Select value={selectedRegulation ?? undefined} onValueChange={(v) => setSelectedRegulation(v)}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={examFeeTypes.length === 0 ? 'Loading…' : 'Select type'} />
								</SelectTrigger>
								<SelectContent>
									{examFeeTypes.map((t) => (
										<SelectItem key={t.id || t.code} value={t.code}>
											{t.code}{t.name ? ` — ${t.name}` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Subject *</Label>
							<Select
								value={selectedSubjectCode ?? undefined}
								onValueChange={(v) => setSelectedSubjectCode(v)}
								disabled={!selectedCourseId || !selectedAcademicYearId || !selectedExamId || !selectedCourseYearId}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder={subjects.length === 0 ? 'No subjects' : 'Select Subject'} />
								</SelectTrigger>
								<SelectContent>
									{subjects.map((s) => (
										<SelectItem key={s.code} value={s.code}>
											{s.code} {s.name ? `— ${s.name}` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* 3/2/7 Course Group + Selected + Table */}
				{!!slotDraft.date && selectedExamSessionId != null && !!selectedRegulation && !!selectedSubjectCode && (
				<div className="grid grid-cols-12 gap-3 items-start">
					<div className="col-span-3 rounded-md border overflow-hidden">
						<div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">Select Course Group</div>
						<div className="p-2 space-y-1 max-h-72 overflow-auto">
							{courseGroups.length === 0 ? (
								<div className="text-[12px] text-muted-foreground px-1 py-2">
									{selectedCourseId ? 'No course groups for this course.' : 'Pick a course to load groups.'}
								</div>
							) : (
								courseGroups.map((g) => {
									const checked = selectedGroups.has(g.code)
									return (
										<label key={g.code} className="flex items-center gap-2 text-[12px]">
											<input type="checkbox" checked={checked} onChange={() => toggleGroup(g.code)} />
											<span>
												{g.code}
												{g.regulationName ? <span className="text-muted-foreground"> ({g.regulationName})</span> : null}
											</span>
										</label>
									)
								})
							)}
						</div>
					</div>
					<div className="col-span-2 rounded-md border overflow-hidden flex flex-col">
						<div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">Selected Course Groups</div>
						<div className="p-2 min-h-[12rem] text-[12px] flex-1">
							{Array.from(selectedGroups).length === 0
								? '—'
								: Array.from(selectedGroups).map((code) => {
										const grp = courseGroups.find((g) => g.code === code)
										return (
											<div key={code}>
												<span className="font-medium">{code}</span>
												{grp?.regulationName ? <span className="text-muted-foreground"> ({grp.regulationName})</span> : null}
											</div>
										)
								  })}
						</div>
						<div className="p-2 border-t flex flex-col items-end gap-1">
							{!canAdd && selectedGroups.size === 0 && (
								<p className="text-[11px] text-muted-foreground">Tick at least one course group to enable.</p>
							)}
							<Button type="button" variant="outline" className="h-8 text-[12px]" onClick={addSelectedToStage} disabled={!canAdd}>
								Add to Table
							</Button>
						</div>
					</div>
					<div className="col-span-7 rounded-md border">
						<div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
							{slotDraft.startTime && slotDraft.startTime < '12:00' ? '(9:45 AM - 4:00 PM)' : '(1:00 PM - 4:00 PM)'}
						</div>
						<div className="overflow-auto">
							<table className="w-full min-w-[760px] text-[12px]">
								<thead className="bg-muted/40">
									<tr>
										<th className="px-2 py-1 w-16 text-left">Sl.No</th>
										<th className="px-2 py-1 text-left">Exam Date</th>
										<th className="px-2 py-1 text-left">Group</th>
										<th className="px-2 py-1 text-left">Subject</th>
										<th className="px-2 py-1 text-left w-16">Actions</th>
									</tr>
								</thead>
								<tbody>
									{stagedRows.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={5}>No rows added</td>
										</tr>
									)}
									{stagedRows.map((r, i) => (
										<tr key={`${r.groupCode}-${r.examDate}-${r.session}-${i}`}>
											<td className="px-2 py-1">{i + 1}</td>
											<td className="px-2 py-1">{new Date(r.examDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
											<td className="px-2 py-1">{r.groupCode}</td>
											<td className="px-2 py-1">
												{subjects.find((s) => s.code === r.subjectCode)?.code}{' '}
												{subjects.find((s) => s.code === r.subjectCode)?.name ? `— ${subjects.find((s) => s.code === r.subjectCode)?.name}` : ''}
											</td>
											<td className="px-2 py-1">
												<Button type="button" variant="ghost" size="sm" onClick={() => removeStagedRow(i)}>
													<Trash2 className="h-4 w-4" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				)}

				{stagedRows.length > 0 && (
					<div className="flex items-center justify-end pt-3 pr-2 pb-1">
						<Button
							type="button"
							className="h-8 text-[12px]"
							onClick={saveTimetable}
							disabled={saving}
						>
							{saving ? 'Saving…' : 'Save'}
						</Button>
					</div>
				)}
			</div>

			<ExistingExamTimetableModal
				open={existingOpen}
				onClose={() => setExistingOpen(false)}
				rows={existingRows}
			/>
		</PageContainer>
	)
}

