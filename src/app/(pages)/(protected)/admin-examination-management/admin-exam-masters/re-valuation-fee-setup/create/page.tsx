'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSessionContext } from '@/context/SessionContext'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toDateOnlyISO } from '@/common/generic-functions'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import {
	getCollegeFilters,
	getExamFeeStructure,
	listCourseGroups,
	listCourseYears,
	listExamMasters,
	createExamFeeStructure,
	updateExamFeeStructure,
} from '@/services/examination'
import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { useBreadcrumbLabel } from '@/common/components/breadcrumb'

type LateFeeFine = { name: string; startDate: string; endDate: string; regFeeFine?: string; suppleFeeFine?: string }
type AdditionalFee = { name: string; type: 'regular' | 'supple'; amount: string }

// Angular `courseGroupYears` row — one selectable entry per course-group × course-year
// combination. `examFeeCourseyrId` is only present when editing an existing structure.
type CourseGroupYear = {
	courseGroupId: number
	groupCode: string
	courseYearName: string
	courseYearId: number
	courseYearCode: string
	check: boolean
	examFeeStructureId?: number
	examFeeCourseyrId?: number
}

function formatDisplayDate(value?: string) {
	if (!value) return ''
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return ''
	return d.toLocaleDateString('en-GB')
}

function parseDateValue(value?: string) {
	if (!value) return null
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

function toDateString(value: Date | null) {
	if (!value) return ''
	return toDateOnlyISO(value)
}

function parseNumberOrNull(v: string): number | null {
	if (v === '' || v == null) return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

export default function CreateRevaluationFeeStructurePage() {
	const { user } = useSessionContext()
	const router = useRouter()
	const searchParams = useSearchParams()

	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])
	const [filterOpen] = useState(true)

	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	// Params from previous page (if present)
	const [paramCourseId, setParamCourseId] = useState<number | null>(null)
	const [paramYearId, setParamYearId] = useState<number | null>(null)
	const [paramExamId, setParamExamId] = useState<number | null>(null)
	const [paramCourseName, setParamCourseName] = useState('')
	const [paramAcademicYear, setParamAcademicYear] = useState('')
	const [paramExamName, setParamExamName] = useState('')
	const [paramExamFromDate, setParamExamFromDate] = useState('')
	const [paramExamToDate, setParamExamToDate] = useState('')
	const [editId, setEditId] = useState<number | null>(null)

	useBreadcrumbLabel(editId ? 'Edit Re Valuation Fee Setup' : 'Create Re Valuation Fee Setup')

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

	// Course years — Angular `courseGroupYears` (course groups × course years).
	const [q, setQ] = useState('')
	const [courseGroupYears, setCourseGroupYears] = useState<CourseGroupYear[]>([])

	// Form
	const [form, setForm] = useState({
		examFeeStructureName: '',
		collectionStartDate: '',
		collectionEndDate: '',
		regularFee: '',
		suppleFee: '',
		isActive: true,
	})

	// Revaluation subject fees
	const [revalSubjectFees, setRevalSubjectFees] = useState<{ one?: string; two?: string; three?: string; four?: string; five?: string }>({
		one: '',
		two: '',
		three: '',
		four: '',
		five: '',
	})

	// Late fee fines
	const [lateFeeName, setLateFeeName] = useState('')
	const [lateFeeStart, setLateFeeStart] = useState('')
	const [lateFeeEnd, setLateFeeEnd] = useState('')
	const [lateFeeReg, setLateFeeReg] = useState('')
	const [lateFeeSupple, setLateFeeSupple] = useState('')
	const [lateFeeFines, setLateFeeFines] = useState<LateFeeFine[]>([])

	// Additional fees
	const [addFeeName, setAddFeeName] = useState('')
	const [addFeeType, setAddFeeType] = useState<'regular' | 'supple'>('regular')
	const [addFeeAmount, setAddFeeAmount] = useState('')
	const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([])

	// Filtered view of the course-group/year list (Angular `courseFilter` pipe over
	// `courseGroupYears`, matched against "groupCode - courseYearCode").
	const filteredCourseGroupYears = useMemo(() => {
		if (!q.trim()) return courseGroupYears
		const lower = q.toLowerCase()
		return courseGroupYears.filter((c) =>
			`${c.groupCode} ${c.courseYearCode} ${c.courseYearName}`.toLowerCase().includes(lower),
		)
	}, [q, courseGroupYears])

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const orgIdFromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
			const empIdFromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
			const orgIdFromSession = Number(user?.organizationId ?? 0)
			const empIdFromSession = Number(user?.employeeId ?? 0)
			const orgId = orgIdFromStorage || orgIdFromSession || 1
			const empId = empIdFromStorage || empIdFromSession || 31754
			const { filtersData: f, academicData: ay } = await getCollegeFilters(orgId, empId)
			setFiltersData(f ?? [])
			setAcademicData(ay ?? [])
			const distinctCourses = distinct(f ?? [], (r) => r.fk_course_id)
			setCourses(distinctCourses)
		} finally {
			setLoadingFilters(false)
		}
	}, [user?.employeeId, user?.organizationId])

	useEffect(() => {
		// Read params first
		const c = searchParams?.get('courseId')
		const y = searchParams?.get('ayId') || searchParams?.get('academicYearId')
		const e = searchParams?.get('examId')
		const courseName = searchParams?.get('courseName') ?? ''
		const academicYear = searchParams?.get('academicYear') ?? ''
		const examName = searchParams?.get('examName') ?? ''
		const fromDate = searchParams?.get('fromDate') ?? ''
		const toDate = searchParams?.get('toDate') ?? ''
		const id = searchParams?.get('examFeeStructureId')
		setParamCourseId(c ? Number(c) : null)
		setParamYearId(y ? Number(y) : null)
		setParamExamId(e ? Number(e) : null)
		setParamCourseName(courseName)
		setParamAcademicYear(academicYear)
		setParamExamName(examName)
		setParamExamFromDate(fromDate)
		setParamExamToDate(toDate)
		setEditId(id ? Number(id) : null)

		fetchFilters()
	}, [fetchFilters])

	// Header context only: academic years + exam masters. The Course Years panel is
	// populated separately from `paramCourseId` (see loadCourseGroupYears).
	function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)
		if (paramYearId && years.some((a: any) => a.fk_academic_year_id === paramYearId)) {
			setSelectedAcademicYearId(paramYearId)
		} else if (years.length > 0) {
			setSelectedAcademicYearId(years[0].fk_academic_year_id)
		}
	}

	// Angular selectedCourse() → getCourseYears(): load the course groups and course
	// years for `courseId`, then build one selectable row per group × year combination.
	// `structureRow` (edit mode) pre-checks the combinations already saved.
	const loadCourseGroupYears = useCallback(async (courseId: number, structureRow: any | null) => {
		if (!courseId) {
			setCourseGroupYears([])
			return
		}
		const groups = await listCourseGroups(courseId).catch(() => [])
		const groupList = Array.isArray(groups) ? groups : []
		// Angular only proceeds to course years when at least one group exists.
		if (groupList.length === 0) {
			setCourseGroupYears([])
			return
		}
		const yrs = await listCourseYears(courseId).catch(() => [])
		const yearList = Array.isArray(yrs) ? yrs : []
		const savedCourseyr: any[] = Array.isArray(structureRow?.examFeeStructureCourseyr)
			? structureRow.examFeeStructureCourseyr
			: []

		const built: CourseGroupYear[] = []
		for (const g of groupList) {
			const courseGroupId = Number(g.courseGroupId ?? g.fk_course_group_id ?? g.course_group_id ?? g.id ?? 0)
			const groupCode = String(g.groupCode ?? g.group_code ?? g.courseGroupCode ?? g.course_group_code ?? '').trim()
			for (const yr of yearList) {
				const courseYearId = Number(yr.courseYearId ?? yr.fk_course_year_id ?? yr.course_year_id ?? yr.id ?? 0)
				if (!courseGroupId || !courseYearId) continue
				if (built.some((b) => b.courseGroupId === courseGroupId && b.courseYearId === courseYearId)) continue
				const courseYearName = String(yr.courseYearName ?? yr.course_year_name ?? yr.yearName ?? '')
				const courseYearCode = String(yr.courseYearCode ?? yr.course_year_code ?? '')
				const match = savedCourseyr.find(
					(x) =>
						Number(x.courseGroupId ?? x.fk_course_group_id) === courseGroupId &&
						Number(x.courseYearId ?? x.fk_course_year_id) === courseYearId,
				)
				if (match) {
					built.push({
						courseGroupId,
						groupCode,
						courseYearName,
						courseYearId,
						courseYearCode,
						check: true,
						examFeeStructureId: Number(match.examFeeStructureId ?? structureRow?.examFeeStructureId ?? 0) || undefined,
						examFeeCourseyrId: Number(match.examFeeCourseyrId ?? 0) || undefined,
					})
				} else {
					built.push({ courseGroupId, groupCode, courseYearName, courseYearId, courseYearCode, check: false })
				}
			}
		}
		setCourseGroupYears(built)
	}, [])

	// Create mode: populate the Course Years panel from the course passed in the URL
	// (Angular ngOnInit → selectedCourse(pageParams.courseId)). Edit mode builds it in
	// loadExisting once the saved structure is known (so saved combinations pre-check).
	useEffect(() => {
		if (editId) return
		if (!paramCourseId) {
			setCourseGroupYears([])
			return
		}
		void loadCourseGroupYears(paramCourseId, null)
	}, [editId, paramCourseId, loadCourseGroupYears])

	useEffect(() => {
		async function loadExamMasters() {
			setExamMasters([])
			setSelectedExamId(null)
			if (!selectedCourseId || !selectedAcademicYearId) return
			const q = buildQuery({
				'Course.courseId': selectedCourseId,
				'AcademicYear.academicYearId': selectedAcademicYearId,
				isActive: true,
			})
			const exams = await listExamMasters(q).catch(() => [])
			const list = Array.isArray(exams) ? exams : []
			setExamMasters(list)
			if (paramExamId && list.some((e: any) => (e.examId ?? e.id) === paramExamId)) {
				setSelectedExamId(paramExamId)
			} else if (list.length > 0) {
				setSelectedExamId(list[0].examId ?? list[0].id ?? null)
			}
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	// When filters are first loaded, prefer params if available
	useEffect(() => {
		if (!loadingFilters && courses.length > 0) {
			if (paramCourseId && courses.some((c: any) => c.fk_course_id === paramCourseId)) {
				handleCourseChange(paramCourseId, filtersData, academicData)
			} else {
				handleCourseChange(courses[0].fk_course_id, filtersData, academicData)
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadingFilters])

	useEffect(() => {
		async function loadExisting() {
			if (!editId) return
			const row = await getExamFeeStructure(editId).catch(() => null)
			if (!row) return

			setForm({
				examFeeStructureName: String(row.examFeeStructureName ?? ''),
				collectionStartDate: String(row.collectionStartDate ?? row.collectionStartOn ?? ''),
				collectionEndDate: String(row.collectionEndDate ?? row.collectionEndOn ?? ''),
				regularFee: String(row.regularFee ?? row.regFee ?? ''),
				suppleFee: String(row.suppleFee ?? row.supplyFee ?? ''),
				isActive: row.isActive !== false,
			})

			const rv: any = row.revaluationSubjectFees ?? row.revaluationFee ?? {}
			setRevalSubjectFees({
				one: String(rv.one ?? rv.subject1Fee ?? ''),
				two: String(rv.two ?? rv.subject2Fee ?? ''),
				three: String(rv.three ?? rv.subject3Fee ?? ''),
				four: String(rv.four ?? rv.subject4Fee ?? ''),
				five: String(rv.five ?? rv.subject5Fee ?? ''),
			})

			const fines = Array.isArray(row.examFeeFine) ? row.examFeeFine : []
			setLateFeeFines(
				fines.map((f: any) => ({
					name: String(f.fineName ?? ''),
					startDate: String(f.fineFromDate ?? ''),
					endDate: String(f.fineToDate ?? ''),
					regFeeFine: String(f.regFeeFine ?? ''),
					suppleFeeFine: String(f.supplyFeeFine ?? f.suppleFeeFine ?? ''),
				})),
			)

			const adt = Array.isArray(row.examFeeAdditionalStructure) ? row.examFeeAdditionalStructure : []
			setAdditionalFees(
				adt.map((f: any) => ({
					name: String(f.name ?? f.feeName ?? ''),
					type: String(f.type ?? '').toLowerCase().includes('supple') ? 'supple' : 'regular',
					amount: String(f.fee ?? f.amount ?? ''),
				})),
			)

			// Build the course-group/year list for the structure's course and pre-check
			// the saved combinations (Angular getExamFeeStructure → selectedCourse → getCourseYears).
			const structureCourseId = Number(
				(Array.isArray(row.examFeeStructureCourseyr) ? row.examFeeStructureCourseyr : [])[0]?.courseId ??
					paramCourseId ??
					0,
			)
			await loadCourseGroupYears(structureCourseId, row)
		}
		void loadExisting()
	}, [editId, paramCourseId, loadCourseGroupYears])

	function toggleCourseGroupYear(courseGroupId: number, courseYearId: number) {
		setCourseGroupYears((prev) =>
			prev.map((c) =>
				c.courseGroupId === courseGroupId && c.courseYearId === courseYearId ? { ...c, check: !c.check } : c,
			),
		)
	}

	function saveLateFeeRow() {
		if (!lateFeeName || !lateFeeStart || !lateFeeEnd) return
		setLateFeeFines((prev) => [...prev, { name: lateFeeName, startDate: lateFeeStart, endDate: lateFeeEnd, regFeeFine: lateFeeReg, suppleFeeFine: lateFeeSupple }])
		setLateFeeName(''); setLateFeeStart(''); setLateFeeEnd(''); setLateFeeReg(''); setLateFeeSupple('')
	}
	function removeLateFeeRow(i: number) {
		setLateFeeFines((s) => s.filter((_, idx) => idx !== i))
	}

	function addAdditionalRow() {
		if (!addFeeName || !addFeeAmount) return
		setAdditionalFees((s) => [...s, { name: addFeeName, type: addFeeType, amount: addFeeAmount }])
		setAddFeeName(''); setAddFeeAmount('')
	}
	function removeAdditionalRow(i: number) {
		setAdditionalFees((s) => s.filter((_, idx) => idx !== i))
	}

	// Angular drives course/exam from the URL params; fall back to them when the
	// college-filter lookups did not resolve a selection (e.g. admins with no employeeId).
	const effectiveCourseId = selectedCourseId ?? paramCourseId
	const effectiveExamId = selectedExamId ?? paramExamId
	const hasCheckedCourseYear = courseGroupYears.some((c) => c.check)

	const canSave = useMemo(() => {
		return (
			!!effectiveCourseId &&
			!!effectiveExamId &&
			form.examFeeStructureName.trim().length > 0 &&
			hasCheckedCourseYear
		)
	}, [form.examFeeStructureName, effectiveCourseId, effectiveExamId, hasCheckedCourseYear])

	const selectedCourseRow = courses.find((c) => c.fk_course_id === selectedCourseId)
	const selectedAcademicYear = selectedAcademicYearId
		? academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)?.academic_year
		: paramAcademicYear
	const programText = `${selectedCourseRow?.course_code ?? selectedCourseRow?.course_name ?? paramCourseName ?? '—'}${
		selectedAcademicYear ? ` / (${selectedAcademicYear})` : ''
	}`

	async function save() {
		if (!canSave) return

		// Angular addExamFeestructurePost(): one examFeeStructureCourseyr per group+year
		// combination. New rows only when checked; existing rows (examFeeCourseyrId) are
		// always sent with their current isActive so unchecking deactivates them.
		const examFeeStructureCourseyr = courseGroupYears.flatMap((c) => {
			if (c.examFeeCourseyrId) {
				return [{
					courseId: effectiveCourseId ?? undefined,
					isActive: c.check,
					courseGroupId: c.courseGroupId,
					courseYearId: c.courseYearId,
					examFeeCourseyrId: c.examFeeCourseyrId,
				}]
			}
			if (c.check) {
				return [{
					courseId: effectiveCourseId ?? undefined,
					isActive: true,
					courseGroupId: c.courseGroupId,
					courseYearId: c.courseYearId,
				}]
			}
			return []
		})

		const payload: Record<string, unknown> = {
			examFeeStructureName: form.examFeeStructureName,
			collectionStartDate: form.collectionStartDate || null,
			collectionEndDate: form.collectionEndDate || null,
			// keep both naming styles for backend compatibility
			regFee: parseNumberOrNull(form.regularFee),
			supplyFee: parseNumberOrNull(form.suppleFee),
			regularFee: parseNumberOrNull(form.regularFee),
			suppleFee: parseNumberOrNull(form.suppleFee),
			subject1Fee: parseNumberOrNull(revalSubjectFees.one ?? ''),
			subject2Fee: parseNumberOrNull(revalSubjectFees.two ?? ''),
			subject3Fee: parseNumberOrNull(revalSubjectFees.three ?? ''),
			subject4Fee: parseNumberOrNull(revalSubjectFees.four ?? ''),
			subject5Fee: parseNumberOrNull(revalSubjectFees.five ?? ''),
			isActive: form.isActive,
			reason: null,
			// relationships
			examId: effectiveExamId,
			examMaster: { examId: effectiveExamId },
			// revaluation subject fees
			revaluationSubjectFees: {
				one: parseNumberOrNull(revalSubjectFees.one ?? ''),
				two: parseNumberOrNull(revalSubjectFees.two ?? ''),
				three: parseNumberOrNull(revalSubjectFees.three ?? ''),
				four: parseNumberOrNull(revalSubjectFees.four ?? ''),
				five: parseNumberOrNull(revalSubjectFees.five ?? ''),
			},
			// nested: course years (group × year combinations)
			examFeeStructureCourseyr,
			// nested: fines
			examFeeFine: lateFeeFines.map((f) => ({
				fineName: f.name,
				fineFromDate: f.startDate || null,
				fineToDate: f.endDate || null,
				regFeeFine: parseNumberOrNull(f.regFeeFine ?? ''),
				supplyFeeFine: parseNumberOrNull(f.suppleFeeFine ?? ''),
				isActive: true,
			})),
			// nested: additional
			examFeeAdditionalStructure: additionalFees.map((r) => ({
				adtExamfeetypeCatId: null,
				type: r.type === 'regular' ? 'Regular' : 'Supple',
				includeInReg: r.type === 'regular',
				fee: parseNumberOrNull(r.amount),
				isActive: true,
			})),
		}
		if (editId) await updateExamFeeStructure(editId, payload)
		else await createExamFeeStructure(payload)
		router.push('/admin-examination-management/admin-exam-masters/re-valuation-fee-setup')
	}

	return (
		<PageContainer className="space-y-4">
		<PageHeader title={editId ? 'Edit Re-Evaluation Fee' : 'Add Re-Evaluation Fee'} subtitle={editId ? 'Update re-evaluation fee structure' : 'Create a new re-evaluation fee structure'} />
			

			<div className="app-card overflow-hidden">
				<div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
					<h2 className="app-card-title">{editId ? 'Edit Re-Evaluation Fee Structure' : 'Add Re-Evaluation Fee Structure'}</h2>
					<div className="inline-flex items-center gap-1.5 text-[12px] text-slate-700">
						<span>Filter</span>
						<Filter className="h-3.5 w-3.5" />
					</div>
				</div>

				{(
				<div className="px-3 py-3 space-y-3">
					<div className="rounded-md border bg-muted/40/50 px-4 py-3 text-[12px]">
						<div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-2">
							<div className="min-w-0 flex items-center gap-1">
								<span className="font-semibold text-slate-900 whitespace-nowrap">Program :</span>
								<span className="text-[hsl(var(--primary))] whitespace-nowrap overflow-hidden text-ellipsis">
									{programText}
								</span>
							</div>
							<div className="min-w-0 flex items-center gap-1 md:-ml-2">
								<span className="font-semibold text-slate-900 whitespace-nowrap">Exam :</span>
								<span className="text-[hsl(var(--primary))]">
									{examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)?.examName ?? paramExamName ?? '—'}
									{(() => {
										const selectedExam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
										const from = formatDisplayDate(selectedExam?.fromDate ?? selectedExam?.examFromDate ?? paramExamFromDate)
										const to = formatDisplayDate(selectedExam?.toDate ?? selectedExam?.examToDate ?? paramExamToDate)
										return from || to ? ` (${from || '—'} - ${to || '—'})` : ''
									})()}
								</span>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-1.5 md:col-span-1">
							<Label>Re-Evaluation Fee Structure <span className="text-red-500">*</span></Label>
							<Input value={form.examFeeStructureName} onChange={(e) => setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))} />
						</div>
						<div className="space-y-1.5">
							<Label>Collection Start Date</Label>
							<DatePicker
								value={parseDateValue(form.collectionStartDate)}
								onChange={(date) => setForm((s) => ({ ...s, collectionStartDate: toDateString(date) }))}
								placeholder="dd-mm-yyyy"
								className="text-[12px]"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Collection End Date</Label>
							<DatePicker
								value={parseDateValue(form.collectionEndDate)}
								onChange={(date) => setForm((s) => ({ ...s, collectionEndDate: toDateString(date) }))}
								placeholder="dd-mm-yyyy"
								className="text-[12px]"
							/>
						</div>
					</div>
				</div>
				)}
			</div>

			{/* Removed separate card — fields moved to top card */}

			{/* Layout: Course Years (left) | Re-Valuation + Late Fee + Additional Fees (right) */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
				{/* Left: Course Years */}
				<div className="lg:col-span-2 app-card p-0 overflow-hidden">
					<div className="px-4 py-3 border-b border-border bg-muted/40">
						<h3 className="text-[14px] font-semibold">Course Years</h3>
					</div>
					<div className="p-3 space-y-3">
						<Input className="h-8 text-[12px]" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
						<div className="max-h-[360px] overflow-auto space-y-1">
							{filteredCourseGroupYears.map((c) => {
								const key = `${c.courseGroupId}-${c.courseYearId}`
								// Angular label: "{{groupCode}} - {{courseYearCode}}".
								const yearLabel = c.courseYearCode || c.courseYearName || `Year ${c.courseYearId}`
								return (
									<label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 text-[12px]">
										<Checkbox checked={c.check} onCheckedChange={() => toggleCourseGroupYear(c.courseGroupId, c.courseYearId)} />
										<span>{c.groupCode ? `${c.groupCode} - ${yearLabel}` : yearLabel}</span>
									</label>
								)
							})}
							{filteredCourseGroupYears.length === 0 && <div className="text-[12px] text-muted-foreground px-2">No items</div>}
						</div>
					</div>
				</div>

				<div className="lg:col-span-10 space-y-2">
					<div className="grid grid-cols-1 lg:grid-cols-10 gap-2 items-start">
						{/* Middle: Exam Re-Valuation Fee */}
						<div className="lg:col-span-3 app-card p-0 overflow-hidden">
							<div className="px-4 py-3 border-b border-border bg-muted/40">
								<h3 className="text-[14px] font-semibold">Exam Re-Valuation Fee</h3>
							</div>
							<div className="p-3">
								<div className="space-y-0.5">
									<div className="text-[13px] font-semibold text-blue-600">Regular Fee</div>
									<div className="grid grid-cols-2 items-center gap-x-2 gap-y-1.5 max-w-md">
										<Label className="text-[12px] text-slate-600">Fee Amount</Label>
										<Input inputMode="numeric" value={form.regularFee} onChange={(e) => setForm((s) => ({ ...s, regularFee: e.target.value }))} />
									</div>
								</div>

								<div className="mt-2.5 space-y-1.5 max-w-xl">
									<div className="text-[13px] font-semibold text-blue-600">Re-Valuation Fee</div>
									<div className="grid grid-cols-2 gap-x-2 gap-y-1.5 items-center">
										<Label className="text-[12px] text-slate-600">1 Subject Fee</Label>
										<Input inputMode="numeric" value={revalSubjectFees.one ?? ''} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, one: e.target.value }))} />

										<Label className="text-[12px] text-slate-600">2 Subjects Fee</Label>
										<Input inputMode="numeric" value={revalSubjectFees.two ?? ''} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, two: e.target.value }))} />

										<Label className="text-[12px] text-slate-600">3 Subjects Fee</Label>
										<Input inputMode="numeric" value={revalSubjectFees.three ?? ''} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, three: e.target.value }))} />

										<Label className="text-[12px] text-slate-600">4 Subjects Fee</Label>
										<Input inputMode="numeric" value={revalSubjectFees.four ?? ''} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, four: e.target.value }))} />

										<Label className="text-[12px] text-slate-600">5 Subjects Fee</Label>
										<Input inputMode="numeric" value={revalSubjectFees.five ?? ''} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, five: e.target.value }))} />
									</div>
								</div>
							</div>
						</div>

						{/* Right: Late Fee Fines */}
						<div className="lg:col-span-7 app-card p-0 overflow-hidden">
						<div className="px-4 py-3 border-b border-border bg-muted/40">
							<h3 className="text-[14px] font-semibold">Late Fee Fines</h3>
						</div>
						<div className="p-3 space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
							<div className="md:col-span-3 space-y-1.5">
								<Label>Late Fee Fine Name</Label>
								<Input className="h-8 text-[12px]" value={lateFeeName} onChange={(e) => setLateFeeName(e.target.value)} />
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label className="whitespace-nowrap">Start Date</Label>
							<input
								type="date"
								className="h-8 text-[12px] w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={lateFeeStart}
								onChange={(e) => setLateFeeStart(e.target.value)}
							/>
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label className="whitespace-nowrap">End Date</Label>
							<input
								type="date"
								className="h-8 text-[12px] w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={lateFeeEnd}
								onChange={(e) => setLateFeeEnd(e.target.value)}
							/>
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Reg</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={lateFeeReg} onChange={(e) => setLateFeeReg(e.target.value)} />
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Supple</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={lateFeeSupple} onChange={(e) => setLateFeeSupple(e.target.value)} />
							</div>
							<div className="space-y-1.5 md:col-span-1">
								<Label className="invisible">Add</Label>
								<Button type="button" className="w-full h-8 text-[12px]" onClick={saveLateFeeRow}>Add</Button>
							</div>
						</div>

						<div className="rounded-md border overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-muted/40">
									<tr>
										<th className="px-2 py-1 w-14 text-left">Sl.No</th>
										<th className="px-2 py-1 text-left">Name</th>
										<th className="px-2 py-1 text-left">Fine Date</th>
										<th className="px-2 py-1 text-left">Reg</th>
										<th className="px-2 py-1 text-left">Supple</th>
										<th className="px-2 py-1 w-16 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{lateFeeFines.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={6}>No fines added</td>
										</tr>
									)}
									{lateFeeFines.map((r, i) => (
										<tr key={`${r.name}-${r.startDate}-${i}`} className="border-t">
											<td className="px-2 py-1">{i + 1}</td>
											<td className="px-2 py-1">{r.name}</td>
											<td className="px-2 py-1">
												{(() => {
													const from = formatDisplayDate(r.startDate)
													const to = formatDisplayDate(r.endDate)
													return from || to ? `${from || '—'} to ${to || '—'}` : '—'
												})()}
											</td>
											<td className="px-2 py-1">{r.regFeeFine || '—'}</td>
											<td className="px-2 py-1">{r.suppleFeeFine || '—'}</td>
											<td className="px-2 py-1">
												<Button type="button" variant="ghost" size="sm" onClick={() => removeLateFeeRow(i)}>✕</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						</div>
						</div>
					</div>

					{/* Additional fees applicable below the two cards */}
			<div className="app-card p-0 overflow-hidden">
						<div className="px-4 py-3 border-b border-border bg-muted/40">
							<h3 className="text-[14px] font-semibold">List of Additional Fees Applicable</h3>
						</div>
						<div className="p-3 space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
								<div className="md:col-span-4 space-y-1.5">
									<Label>Additional Fees *</Label>
									<Input className="h-8 text-[12px]" value={addFeeName} onChange={(e) => setAddFeeName(e.target.value)} placeholder="Fee name" />
								</div>
								<div className="md:col-span-3 space-y-1.5">
									<Label>Type</Label>
									<div className="flex items-center gap-6 h-8">
										<label className="inline-flex items-center gap-2 text-[12px]">
											<input type="radio" checked={addFeeType === 'regular'} onChange={() => setAddFeeType('regular')} />
											<span>Regular</span>
										</label>
										<label className="inline-flex items-center gap-2 text-[12px]">
											<input type="radio" checked={addFeeType === 'supple'} onChange={() => setAddFeeType('supple')} />
											<span>Supple</span>
										</label>
									</div>
								</div>
								<div className="md:col-span-4 space-y-1.5">
									<Label>Amount</Label>
									<Input inputMode="numeric" className="h-8 text-[12px]" value={addFeeAmount} onChange={(e) => setAddFeeAmount(e.target.value)} />
								</div>
								<div className="md:col-span-1 space-y-1.5">
									<Label className="invisible">Add</Label>
									<Button type="button" className="w-full h-8 text-[12px]" onClick={addAdditionalRow}>Add</Button>
								</div>
							</div>

							<div className="rounded-md border overflow-auto">
								<table className="w-full text-[12px]">
									<thead className="bg-muted/40">
										<tr>
											<th className="px-2 py-1 w-14 text-left">Sl.No</th>
											<th className="px-2 py-1 text-left">Type</th>
											<th className="px-2 py-1 text-left">Exam Type</th>
											<th className="px-2 py-1 text-left">Amount</th>
											<th className="px-2 py-1 w-16 text-left">Actions</th>
										</tr>
									</thead>
									<tbody>
										{additionalFees.length === 0 && (
											<tr>
												<td className="px-2 py-2 text-muted-foreground" colSpan={5}>No rows</td>
											</tr>
										)}
										{additionalFees.map((r, i) => (
											<tr key={`${r.name}-${i}`} className="border-t">
												<td className="px-2 py-1">{i + 1}</td>
												<td className="px-2 py-1">{r.name}</td>
												<td className="px-2 py-1" style={{ textTransform: 'capitalize' }}>{r.type}</td>
												<td className="px-2 py-1">{r.amount || '—'}</td>
												<td className="px-2 py-1">
													<Button type="button" variant="ghost" size="sm" onClick={() => removeAdditionalRow(i)}>✕</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>

					<div className="flex items-center justify-end gap-2">
						<Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => router.push('/admin-examination-management/admin-exam-masters/re-valuation-fee-setup')}>Cancel</Button>
						<Button type="button" className="h-8 text-[12px]" onClick={save} disabled={!canSave}>{editId ? 'Update' : 'Save'}</Button>
					</div>

		</PageContainer>
	)
}

