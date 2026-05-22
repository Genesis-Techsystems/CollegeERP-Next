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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/common/components/date-picker'
import { asRecordArray } from '@/common/generic-functions'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import { format } from 'date-fns'
import {
	getCollegeFilters,
	listCourseGroups,
	listCourseYears,
	listExamFeeStructures,
	listExamMasters,
} from '@/services/examination'
import { createExamFeeStructure, updateExamFeeStructure } from '@/services/examination'
import { useRouter, useSearchParams } from 'next/navigation'
import { toastError, toastSuccess } from '@/lib/toast'
import { listGeneralDetailsByMaster } from '@/services/examination'
import { PageContainer, PageHeader } from '@/components/layout'

type FineRow = {
	fineName: string
	fineFromDate: string
	fineToDate: string
	regFeeFine?: string
	suppleFeeFine?: string
}

function formatDateTime(value?: string) {
	if (!value) return ''
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return value
	return format(d, 'dd-MM-yyyy')
}

function parseDateValue(value?: string) {
	if (!value) return null
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

function toDateString(value: Date | null) {
	if (!value) return ''
	return format(value, 'yyyy-MM-dd')
}

export default function CreateExamFeeStructurePage() {
	const { user } = useSessionContext()
	const router = useRouter()
	const searchParams = useSearchParams()
	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])

	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [courseGroups, setCourseGroups] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

	// Left: Course Years selection
	const [q, setQ] = useState('')
	const [selectedCourseYearIds, setSelectedCourseYearIds] = useState<Set<number>>(new Set())

	// Main form
	const [form, setForm] = useState({
		examFeeStructureName: '',
		collectionStartDate: '',
		collectionEndDate: '',
		// fees
		regFee: '',
		suppleFee: '',
		subject1Fee: '',
		subject2Fee: '',
		subject3Fee: '',
		subject4Fee: '',
		subject5Fee: '',
		subject6Fee: '',
		subject7Fee: '',
		isActive: true,
	})

	// Late fee fines table (local state only for now)
	const [fineDraft, setFineDraft] = useState<FineRow>({
		fineName: '',
		fineFromDate: '',
		fineToDate: '',
		regFeeFine: '',
		suppleFeeFine: '',
	})
	const [fines, setFines] = useState<FineRow[]>([])

	// Additional fees — master data + rows
	const [additionalTypes, setAdditionalTypes] = useState<any[]>([])
	const [additionalDraft, setAdditionalDraft] = useState({
		typeId: '' as string,
		typeName: '' as string,
		examType: 'REG' as 'REG' | 'SUPPLE',
		includeInReg: false,
		amount: '' as string,
	})
	const [additionalRows, setAdditionalRows] = useState<
		{ typeId: string | number; typeName: string; examType: 'REG' | 'SUPPLE'; includeInReg: boolean; amount: string }[]
	>([])

	// Re-evaluation fees — local rows (captured here for parity; saved via dedicated module)
	const [revalDraft, setRevalDraft] = useState({
		typeName: 'Revaluation',
		fromDate: '',
		toDate: '',
		amount: '',
	})
	const [revalRows, setRevalRows] = useState<{ typeName: string; fromDate: string; toDate: string; amount: string }[]>([])

	const pageParams = useMemo(
		() => ({
			check: Number(searchParams.get('check') ?? 1),
			universityId: Number(searchParams.get('universityId') ?? 0),
			universityCode: String(searchParams.get('universityCode') ?? ''),
			courseId: Number(searchParams.get('courseId') ?? 0),
			courseName: String(searchParams.get('courseName') ?? ''),
			academicYearId: Number(searchParams.get('academicYearId') ?? 0),
			academicYear: String(searchParams.get('academicYear') ?? ''),
			examId: Number(searchParams.get('examId') ?? 0),
			examName: String(searchParams.get('examName') ?? ''),
			fromDate: String(searchParams.get('fromDate') ?? ''),
			toDate: String(searchParams.get('toDate') ?? ''),
			examFeeStructureId: Number(searchParams.get('examFeeStructureId') ?? 0),
		}),
		[searchParams],
	)
	const isEditMode = pageParams.examFeeStructureId > 0

	const additionalTypeOptions = useMemo(
		() =>
			(additionalTypes ?? [])
				.map((t: any) => ({
					value: String(t.generalDetailId ?? t.id ?? t.general_detail_id ?? ''),
					label:
						String(
							t.generalDetailName ??
							t.generalDetailDisplayName ??
							t.name ??
							t.label ??
							t.general_detail_name ??
							''
						).trim(),
				}))
				.filter((x) => x.value && x.label),
		[additionalTypes]
	)

	// Render one row per course year. Earlier code duplicated each year across
	// every course-group code, but the selection state (and the save payload)
	// keys solely on courseYearId — duplicates therefore checked together and
	// produced the "click one, several toggle" bug.
	const displayCourseYears = useMemo(() => {
		if (!Array.isArray(courseYears) || courseYears.length === 0) return []
		return courseYears
	}, [courseYears])

	const filteredCourseYears = useMemo(() => {
		const list = displayCourseYears
		if (!q.trim()) return list
		const lower = q.toLowerCase()
		return list.filter((y: any) => {
			const code = String(y.courseYearCode ?? y.course_year_code ?? '')
			const name = String(y.courseYearName ?? y.yearName ?? '')
			const grp = String(y.__displayGroupCode ?? y.groupCode ?? y.group_code ?? y.courseGroupCode ?? y.course_group_code ?? '')
			return `${grp} ${code} ${name}`.toLowerCase().includes(lower)
		})
	}, [q, displayCourseYears])

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
			if (distinctCourses.length > 0) {
				handleCourseChange(distinctCourses[0].fk_course_id, f, ay)
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [user?.employeeId, user?.organizationId])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	useEffect(() => {
		// Legacy add-page arrives with preselected context from list page.
		if (!courses.length) return
		if (pageParams.courseId && courses.some((c) => Number(c.fk_course_id) === Number(pageParams.courseId))) {
			setSelectedCourseId(pageParams.courseId)
		}
		if (pageParams.academicYearId && academicYears.some((a) => Number(a.fk_academic_year_id) === Number(pageParams.academicYearId))) {
			setSelectedAcademicYearId(pageParams.academicYearId)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [courses, academicYears, pageParams.courseId, pageParams.academicYearId])

	// Load Additional Fee Types (ADDFEETYPE)
	useEffect(() => {
		async function loadTypes() {
			try {
				const rows = await listGeneralDetailsByMaster('ADDFEETYPE').catch(() => [])
				setAdditionalTypes(Array.isArray(rows) ? rows : [])
			} catch {
				setAdditionalTypes([])
			}
		}
		loadTypes()
	}, [])

	async function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setCourseGroups([])
		setCourseYears([])
		setSelectedCourseYearIds(new Set())

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)
		// Preselect first academic year if available for faster entry
		if (years.length > 0) {
			setSelectedAcademicYearId(years[0].fk_academic_year_id)
		}

		const groups = await listCourseGroups(courseId).catch(() => [])
		const groupList = Array.isArray(groups) ? groups : []
		setCourseGroups(groupList)
		const groupCodeById = new Map<number, string>()
		for (const g of groupList) {
			const gid = Number(
				g.fk_course_group_id ??
				g.courseGroupId ??
				g.course_group_id ??
				g.fk_coursegroup_id ??
				g.id ??
				0
			)
			if (!gid) continue
			groupCodeById.set(
				gid,
				String(g.group_code ?? g.groupCode ?? g.courseGroupCode ?? g.course_group_code ?? '')
			)
		}

		// Load only the currently selected course context (chosen from previous page).
		const yrs = await listCourseYears(courseId).catch(() => [])
		setCourseYears(
			Array.isArray(yrs)
				? yrs.map((r: any) => {
						const gid = Number(r.fk_course_group_id ?? r.courseGroupId ?? r.course_group_id ?? 0)
						return {
							...r,
							groupCode:
								r.groupCode ??
								r.group_code ??
								r.courseGroupCode ??
								r.course_group_code ??
								(gid ? groupCodeById.get(gid) : undefined),
						}
					})
				: []
		)
	}

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
			if (pageParams.examId && list.some((e: any) => Number(e.examId ?? e.id) === Number(pageParams.examId))) {
				setSelectedExamId(pageParams.examId)
			} else if (list.length > 0) {
				setSelectedExamId(list[0].examId ?? list[0].id ?? null)
			}
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId, pageParams.examId])

	useEffect(() => {
		async function loadExisting() {
			if (!isEditMode) return
			const query = buildQuery({ examFeeStructureId: pageParams.examFeeStructureId })
			const rows = await listExamFeeStructures(query).catch(() => [])
			const row = Array.isArray(rows) ? rows[0] : null
			if (!row) return

			setForm((s) => ({
				...s,
				examFeeStructureName: String(row.examFeeStructureName ?? ''),
				collectionStartDate: toDateString(parseDateValue(String(row.collectionStartDate ?? ''))),
				collectionEndDate: toDateString(parseDateValue(String(row.collectionEndDate ?? ''))),
				regFee: row.regFee != null ? String(row.regFee) : '',
				suppleFee: row.supplyFee != null ? String(row.supplyFee) : (row.suppleFee != null ? String(row.suppleFee) : ''),
				subject1Fee: row.subject1Fee != null ? String(row.subject1Fee) : '',
				subject2Fee: row.subject2Fee != null ? String(row.subject2Fee) : '',
				subject3Fee: row.subject3Fee != null ? String(row.subject3Fee) : '',
				subject4Fee: row.subject4Fee != null ? String(row.subject4Fee) : '',
				subject5Fee: row.subject5Fee != null ? String(row.subject5Fee) : '',
				subject6Fee: row.subject6Fee != null ? String(row.subject6Fee) : '',
				subject7Fee: row.subject7Fee != null ? String(row.subject7Fee) : '',
				isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
			}))

			const activeCourseYears = asRecordArray(row.examFeeStructureCourseyr)
				.filter((x) => x.isActive !== false)
				.map((x) => Number(x.courseYearId))
				.filter((x) => Number.isFinite(x) && x > 0)
			setSelectedCourseYearIds(new Set(activeCourseYears))

			const fineRows = asRecordArray(row.examFeeFine)
				.filter((x) => x.isActive !== false)
				.map((x) => ({
					fineName: String(x.fineName ?? ''),
					fineFromDate: toDateString(parseDateValue(String(x.fineFromDate ?? ''))),
					fineToDate: toDateString(parseDateValue(String(x.fineToDate ?? ''))),
					regFeeFine: x.regFeeFine != null ? String(x.regFeeFine) : '',
					suppleFeeFine: x.supplyFeeFine != null ? String(x.supplyFeeFine) : '',
				}))
			setFines(fineRows)

			const addRows = asRecordArray(row.examFeeAdditionalStructure)
				.filter((x) => x.isActive !== false)
				.map((x) => ({
					typeId: String(x.adtExamfeetypeCatId ?? ''),
					typeName: String(x.adtExamfeetypeCatDisplayName ?? x.type ?? ''),
					examType: String(x.type ?? '').toLowerCase().includes('supp') ? 'SUPPLE' as const : 'REG' as const,
					includeInReg: Boolean(x.includeInReg),
					amount: x.fee != null ? String(x.fee) : '',
				}))
			setAdditionalRows(addRows)
		}
		loadExisting()
	}, [isEditMode, pageParams.examFeeStructureId])

	function toggleCourseYear(id: number) {
		setSelectedCourseYearIds((s) => {
			const next = new Set(s)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function addFineRow() {
		if (!fineDraft.fineName || !fineDraft.fineFromDate || !fineDraft.fineToDate) return
		setFines((s) => [...s, fineDraft])
		setFineDraft({
			fineName: '',
			fineFromDate: '',
			fineToDate: '',
			regFeeFine: '',
			suppleFeeFine: '',
		})
	}
	function removeFineRow(i: number) {
		setFines((s) => s.filter((_, idx) => idx !== i))
	}

	function addAdditionalRow() {
		if (!additionalDraft.typeId || !additionalDraft.amount) return
		const selected = additionalTypeOptions.find((t) => t.value === String(additionalDraft.typeId))
		const typeName = additionalDraft.typeName || selected?.label || '—'
		setAdditionalRows((s) => [
			...s,
			{
				typeId: additionalDraft.typeId,
				typeName,
				examType: additionalDraft.examType,
				includeInReg: additionalDraft.includeInReg,
				amount: additionalDraft.amount,
			},
		])
		setAdditionalDraft({
			typeId: '',
			typeName: '',
			examType: 'REG',
			includeInReg: false,
			amount: '',
		})
	}
	function removeAdditionalRow(i: number) {
		setAdditionalRows((s) => s.filter((_, idx) => idx !== i))
	}

	function addRevalRow() {
		if (!revalDraft.amount || !revalDraft.fromDate || !revalDraft.toDate) return
		setRevalRows((s) => [...s, revalDraft])
		setRevalDraft({ typeName: 'Revaluation', fromDate: '', toDate: '', amount: '' })
	}
	function removeRevalRow(i: number) {
		setRevalRows((s) => s.filter((_, idx) => idx !== i))
	}

	function parseNumberOrNull(v: string): number | null {
		if (v === '' || v == null) return null
		const n = Number(v)
		return Number.isFinite(n) ? n : null
	}

	function validate(): string[] {
		const errs: string[] = []
		if (!selectedCourseId) errs.push('Course is required')
		if (!selectedAcademicYearId) errs.push('Exam Year is required')
		if (!selectedExamId) errs.push('Exam Master is required')
		if (!form.examFeeStructureName.trim()) errs.push('Exam Fee Structure name is required')
		if (selectedCourseYearIds.size === 0) errs.push('Select at least one Course Year')
		if (form.collectionStartDate && form.collectionEndDate) {
			const s = new Date(form.collectionStartDate).getTime()
			const e = new Date(form.collectionEndDate).getTime()
			if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
				errs.push('Collection End Date must be on or after Start Date')
			}
		}
		// Numeric sanity checks
		const numericFields = [
			['Reg Fee', form.regFee],
			['Supple Fee', form.suppleFee],
			['1 Subject Fee', form.subject1Fee],
			['2 Subject Fee', form.subject2Fee],
			['3 Subject Fee', form.subject3Fee],
			['4 Subject Fee', form.subject4Fee],
			['5 Subject Fee', form.subject5Fee],
			['6 Subject Fee', form.subject6Fee],
			['7 Subject Fee', form.subject7Fee],
		] as const
		for (const [label, value] of numericFields) {
			if (value !== '' && parseNumberOrNull(value) == null) {
				errs.push(`${label} must be a number`)
			}
		}
		return errs
	}

	const canSave = useMemo(() => {
		return (
			!!selectedCourseId &&
			!!selectedAcademicYearId &&
			!!selectedExamId &&
			form.examFeeStructureName.trim().length > 0 &&
			selectedCourseYearIds.size > 0
		)
	}, [form.examFeeStructureName, selectedAcademicYearId, selectedCourseId, selectedCourseYearIds.size, selectedExamId])

	async function save() {
		const errors = validate()
		if (errors.length > 0) {
			toastError(errors.join('\n'))
			return
		}

		const payload: Record<string, unknown> = {
			examFeeStructureName: form.examFeeStructureName,
			collectionStartDate: form.collectionStartDate || null,
			collectionEndDate: form.collectionEndDate || null,
			regFee: parseNumberOrNull(form.regFee),
			supplyFee: parseNumberOrNull(form.suppleFee),
			subject1Fee: parseNumberOrNull(form.subject1Fee),
			subject2Fee: parseNumberOrNull(form.subject2Fee),
			subject3Fee: parseNumberOrNull(form.subject3Fee),
			subject4Fee: parseNumberOrNull(form.subject4Fee),
			subject5Fee: parseNumberOrNull(form.subject5Fee),
			subject6Fee: parseNumberOrNull(form.subject6Fee),
			subject7Fee: parseNumberOrNull(form.subject7Fee),
			isActive: form.isActive,
			// relationships
			examId: selectedExamId,
			examMaster: { examId: selectedExamId },
			// nested: course year applicability
			examFeeStructureCourseyr: Array.from(selectedCourseYearIds).map((cyId) => ({
				courseId: selectedCourseId ?? undefined,
				courseYearId: cyId,
				isActive: true,
			})),
			// nested: fines
			examFeeFine: fines.map((f) => ({
				fineName: f.fineName,
				fineFromDate: f.fineFromDate || null,
				fineToDate: f.fineToDate || null,
				regFeeFine: f.regFeeFine === '' ? null : Number(f.regFeeFine),
				supplyFeeFine: f.suppleFeeFine === '' ? null : Number(f.suppleFeeFine),
				isActive: true,
			})),
			// nested: additional fees (ADDFEETYPE)
			examFeeAdditionalStructure: additionalRows.map((r) => ({
				adtExamfeetypeCatId: Number(r.typeId) || undefined,
				fee: r.amount === '' ? null : Number(r.amount),
				includeInReg: r.includeInReg,
				type: r.examType === 'REG' ? 'Regular' : 'Supple',
				isActive: true,
			})),
			// Note: Revaluation fees are managed in a dedicated module; captured here for UI parity only.
		}

		try {
			if (isEditMode) {
				await updateExamFeeStructure(pageParams.examFeeStructureId, {
					...payload,
					examFeeStructureId: pageParams.examFeeStructureId,
				})
			} else {
				await createExamFeeStructure(payload)
			}
			touchFormAfterSave()
			toastSuccess(`Exam fee structure ${isEditMode ? 'updated' : 'saved'}`)
			// Navigate back to list
			router.push('/admin-examination-management/admin-exam-masters/exam-fee-setup')
		} catch (err) {
			toastError(err, `Failed to ${isEditMode ? 'update' : 'save'} exam fee structure`)
		}
	}

	function touchFormAfterSave() {
		// simple reset to prevent accidental resubmits if user navigates back
		setSelectedCourseYearIds(new Set())
		setFines([])
	}

	return (
		<PageContainer className="space-y-4">
		<PageHeader title={isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure'} subtitle={isEditMode ? 'Update existing exam fee structure' : 'Create a new exam fee structure'} />
			<div className="app-card overflow-hidden">
				<div className="px-4 py-3 border-b border-border bg-muted/40">
					<h2 className="app-card-title">{isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure'}</h2>
				</div>

				<div className="px-3 py-3 space-y-3">
					<div className="mb-3 rounded-md border bg-muted/40/50 px-3 py-2 text-[12px]">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							<div>
								<span className="font-semibold">Program :</span>{' '}
								<span className="text-[hsl(var(--primary))]">
									{pageParams.universityCode || '—'} / {pageParams.courseName || '—'} / ({pageParams.academicYear || '—'})
								</span>
							</div>
							<div>
								<span className="font-semibold">Exam :</span>{' '}
								<span className="text-[hsl(var(--primary))]">
									{pageParams.examName || '—'}{' '}
									{pageParams.fromDate || pageParams.toDate
										? `(${formatDateTime(pageParams.fromDate) || '—'} - ${formatDateTime(pageParams.toDate) || '—'})`
										: ''}
								</span>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label>Exam Fee Structure <span className="text-red-500">*</span></Label>
							<Input value={form.examFeeStructureName} onChange={(e) => setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))} />
						</div>
						<div className="grid grid-cols-2 gap-3">
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
				</div>
			</div>

			{/* Two-column layout */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
				{/* Left: Course Years */}
				<div className="lg:col-span-1 app-card p-0 overflow-hidden">
					<div className="px-4 py-3 border-b border-border bg-muted/40">
						<h3 className="text-[14px] font-semibold">Course Years</h3>
					</div>
					<div className="p-3 space-y-3">
						<Input
							className="h-8 text-[12px]"
							placeholder="Search…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
						<div className="max-h-[360px] overflow-y-auto scrollbar-hidden space-y-1">
							{filteredCourseYears.map((y: any) => {
								const id = y.courseYearId ?? y.id
								if (id == null) return null
								const checked = selectedCourseYearIds.has(Number(id))
								const yearName = String(y.courseYearName ?? y.yearName ?? '').trim()
								const yearCode = String(y.courseYearCode ?? y.course_year_code ?? '').trim()
								// Angular screen displays course-year code format (e.g. IYEARISEM).
								const yearLabel = yearCode || yearName || `Year ${id}`
								const branchFromYearCode = yearCode.includes('-') ? yearCode.split('-')[0].trim() : ''
								const groupLabel =
									String(
										y.__displayGroupCode ??
										y.groupCode ??
										y.group_code ??
										y.courseGroupCode ??
										y.course_group_code ??
										branchFromYearCode ??
										y.branchCode ??
										y.branch_code ??
										y.specializationCode ??
										y.specialization_code ??
										y.deptCode ??
										y.dept_code ??
										''
									).trim()
								return (
									<label key={String(y.__rowKey ?? id)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 text-[12px]">
										<Checkbox checked={checked} onCheckedChange={() => toggleCourseYear(Number(id))} />
										<span>
											{groupLabel ? `${groupLabel} - ` : ''}
											{yearLabel}
										</span>
									</label>
								)
							})}
							{filteredCourseYears.length === 0 && <div className="text-[12px] text-muted-foreground px-2">No items</div>}
						</div>
					</div>
				</div>

				{/* Right: Main form */}
				<div className="lg:col-span-3 space-y-3">
					<div className="app-card p-4 space-y-3">
						<div className="rounded-md border">
							<div className="px-3 py-2 border-b bg-muted/40">
								<h4 className="text-[13px] font-semibold">Exam Fee</h4>
							</div>
							<div className="p-3 space-y-3">
								<div className="grid grid-cols-6 gap-3 text-[12px] text-blue-700 font-medium">
									<div>Regular Fee</div>
									<div className="whitespace-nowrap">Supplementary Fee</div>
									<div />
									<div />
									<div />
									<div />
								</div>
								<div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
									<div className="space-y-1.5">
										<Input placeholder="Reg Fee" inputMode="numeric" value={form.regFee} onChange={(e) => setForm((s) => ({ ...s, regFee: e.target.value }))} />
									</div>
									<div className="space-y-1.5">
										<Input placeholder="1 Subject Fee" inputMode="numeric" value={form.subject1Fee} onChange={(e) => setForm((s) => ({ ...s, subject1Fee: e.target.value }))} />
									</div>
									<div className="space-y-1.5">
										<Input placeholder="2 Subject Fee" inputMode="numeric" value={form.subject2Fee} onChange={(e) => setForm((s) => ({ ...s, subject2Fee: e.target.value }))} />
									</div>
									<div className="space-y-1.5">
										<Input placeholder="3 Subject Fee" inputMode="numeric" value={form.subject3Fee} onChange={(e) => setForm((s) => ({ ...s, subject3Fee: e.target.value }))} />
									</div>
									<div className="space-y-1.5">
										<Input placeholder="4 Subject Fee" inputMode="numeric" value={form.subject4Fee} onChange={(e) => setForm((s) => ({ ...s, subject4Fee: e.target.value }))} />
									</div>
									<div className="space-y-1.5">
										<Input placeholder="Supple Fee" inputMode="numeric" value={form.suppleFee} onChange={(e) => setForm((s) => ({ ...s, suppleFee: e.target.value }))} />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Late Fee Fines */}
					<div className="app-card overflow-hidden">
						<div className="px-4 py-2.5 border-b border-border bg-muted/40">
							<h3 className="text-[14px] font-semibold">Late Fee Fines</h3>
						</div>
						<div className="p-4 space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
							<div className="md:col-span-3 space-y-1.5">
								<Label>Late Fee Fine Name</Label>
								<Input className="h-8 text-[12px]" value={fineDraft.fineName} onChange={(e) => setFineDraft((s) => ({ ...s, fineName: e.target.value }))} />
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Fine Start Date</Label>
								<DatePicker
									value={parseDateValue(fineDraft.fineFromDate)}
									onChange={(date) => setFineDraft((s) => ({ ...s, fineFromDate: toDateString(date) }))}
									placeholder="dd-mm-yyyy"
									className="text-[12px]"
								/>
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Fine End Date</Label>
								<DatePicker
									value={parseDateValue(fineDraft.fineToDate)}
									onChange={(date) => setFineDraft((s) => ({ ...s, fineToDate: toDateString(date) }))}
									placeholder="dd-mm-yyyy"
									className="text-[12px]"
								/>
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Reg</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={fineDraft.regFeeFine ?? ''} onChange={(e) => setFineDraft((s) => ({ ...s, regFeeFine: e.target.value }))} />
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Supple</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={fineDraft.suppleFeeFine ?? ''} onChange={(e) => setFineDraft((s) => ({ ...s, suppleFeeFine: e.target.value }))} />
							</div>
							<div className="md:col-span-1 space-y-1.5">
								<Label className="invisible">Add</Label>
								<Button type="button" className="w-full h-8 text-[12px]" onClick={addFineRow}>Add</Button>
							</div>
						</div>

						<div className="rounded-md border overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-muted/40">
									<tr>
										<th className="px-2 py-1 w-14 text-left">Sl.No</th>
										<th className="px-2 py-1 text-left">Fine Name</th>
										<th className="px-2 py-1 text-left">Fine Date</th>
										<th className="px-2 py-1 text-left">Reg Fee Fine</th>
										<th className="px-2 py-1 text-left">Supple Fee Fine</th>
										<th className="px-2 py-1 w-16 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{fines.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={6}>No fines added</td>
										</tr>
									)}
									{fines.map((r, i) => (
										<tr key={`${r.fineName}-${r.fineFromDate}-${i}`} className="border-t">
											<td className="px-2 py-1">{i + 1}</td>
											<td className="px-2 py-1">{r.fineName}</td>
											<td className="px-2 py-1">
												{r.fineFromDate ? new Date(r.fineFromDate).toLocaleDateString() : ''} {r.fineToDate ? `- ${new Date(r.fineToDate).toLocaleDateString()}` : ''}
											</td>
											<td className="px-2 py-1">{r.regFeeFine || '—'}</td>
											<td className="px-2 py-1">{r.suppleFeeFine || '—'}</td>
											<td className="px-2 py-1">
												<Button type="button" variant="ghost" size="sm" onClick={() => removeFineRow(i)}>✕</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						</div>
					</div>

					{/* Re-evaluation fees applicable */}
					<div className="app-card overflow-hidden">
						<div className="px-4 py-2.5 border-b border-border bg-muted/40">
							<h3 className="text-[14px] font-semibold">Re-evaluation Fees Applicable</h3>
						</div>
						<div className="p-4 space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
							<div className="md:col-span-2 space-y-1.5">
								<Label>Exam Revision Type</Label>
								<Select
									value={revalDraft.typeName}
									onValueChange={(v) => setRevalDraft((s) => ({ ...s, typeName: v }))}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Revaluation">Revaluation</SelectItem>
										<SelectItem value="Re-Totaling">Re-Totaling</SelectItem>
										<SelectItem value="Photocopy">Photocopy</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>From Date</Label>
								<DatePicker
									value={parseDateValue(revalDraft.fromDate)}
									onChange={(date) => setRevalDraft((s) => ({ ...s, fromDate: toDateString(date) }))}
									placeholder="dd-mm-yyyy"
									className="text-[12px]"
								/>
							</div>
							<div className="space-y-1.5">
								<Label>To Date</Label>
								<DatePicker
									value={parseDateValue(revalDraft.toDate)}
									onChange={(date) => setRevalDraft((s) => ({ ...s, toDate: toDateString(date) }))}
									placeholder="dd-mm-yyyy"
									className="text-[12px]"
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Amount</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={revalDraft.amount} onChange={(e) => setRevalDraft((s) => ({ ...s, amount: e.target.value }))} />
							</div>
							<div className="space-y-1.5">
								<Label className="invisible">Add</Label>
								<Button type="button" className="w-full h-8 text-[12px]" onClick={addRevalRow}>Add</Button>
							</div>
						</div>
						<div className="rounded-md border overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-muted/40">
									<tr>
										<th className="px-2 py-1 w-14 text-left">Sl.No</th>
										<th className="px-2 py-1 text-left">Type</th>
										<th className="px-2 py-1 text-left">From Date</th>
										<th className="px-2 py-1 text-left">To Date</th>
										<th className="px-2 py-1 text-left">Amount</th>
										<th className="px-2 py-1 w-16 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{revalRows.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={6}>No rows</td>
										</tr>
									)}
									{revalRows.map((r, i) => (
										<tr key={`${r.typeName}-${r.fromDate}-${i}`} className="border-t">
											<td className="px-2 py-1">{i + 1}</td>
											<td className="px-2 py-1">{r.typeName}</td>
											<td className="px-2 py-1">{r.fromDate ? new Date(r.fromDate).toLocaleDateString() : '—'}</td>
											<td className="px-2 py-1">{r.toDate ? new Date(r.toDate).toLocaleDateString() : '—'}</td>
											<td className="px-2 py-1">{r.amount || '—'}</td>
											<td className="px-2 py-1">
												<Button type="button" variant="ghost" size="sm" onClick={() => removeRevalRow(i)}>✕</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						</div>
					</div>

					{/* Additional fees applicable */}
					<div className="app-card overflow-hidden">
						<div className="px-4 py-2.5 border-b border-border bg-muted/40">
							<h3 className="text-[14px] font-semibold">List of Additional Fees Applicable</h3>
						</div>
						<div className="p-4 space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
							<div className="md:col-span-2 space-y-1.5">
								<Label>Additional Fees *</Label>
								<Select
									value={additionalDraft.typeId || undefined}
									onValueChange={(v) => {
										const selected = additionalTypeOptions.find((x) => x.value === v)
										setAdditionalDraft((s) => ({ ...s, typeId: v, typeName: selected?.label ?? '' }))
									}}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Fee Type" />
									</SelectTrigger>
									<SelectContent>
										{additionalTypeOptions.length === 0 && (
											<SelectItem value="__no_data__" disabled>
												No fee types available
											</SelectItem>
										)}
										{additionalTypeOptions.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label className="block">Exam Type</Label>
								<div className="flex items-center gap-6 h-8">
									<label className="inline-flex items-center gap-2 text-[12px]">
										<input type="radio" checked={additionalDraft.examType === 'REG'} onChange={() => setAdditionalDraft((s) => ({ ...s, examType: 'REG' }))} />
										Regular
									</label>
									<label className="inline-flex items-center gap-2 text-[12px]">
										<input type="radio" checked={additionalDraft.examType === 'SUPPLE'} onChange={() => setAdditionalDraft((s) => ({ ...s, examType: 'SUPPLE' }))} />
										Supple
									</label>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label>Include In Reg</Label>
								<div className="h-8 flex items-center">
									<Checkbox checked={additionalDraft.includeInReg} onCheckedChange={(v) => setAdditionalDraft((s) => ({ ...s, includeInReg: Boolean(v) }))} />
								</div>
							</div>
							<div className="space-y-1.5">
								<Label>Amount</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={additionalDraft.amount} onChange={(e) => setAdditionalDraft((s) => ({ ...s, amount: e.target.value }))} />
							</div>
							<div className="space-y-1.5">
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
										<th className="px-2 py-1 text-left">Include In Reg</th>
										<th className="px-2 py-1 w-16 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{additionalRows.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={6}>No rows</td>
										</tr>
									)}
									{additionalRows.map((r, i) => {
										const type = additionalTypes.find((t: any) => String(t.generalDetailId ?? t.id) === String(r.typeId))
										const name = r.typeName || type?.generalDetailName || '—'
										return (
											<tr key={`${r.typeId}-${i}`} className="border-t">
												<td className="px-2 py-1">{i + 1}</td>
												<td className="px-2 py-1">{name}</td>
												<td className="px-2 py-1">{r.examType === 'REG' ? 'Regular' : 'Supple'}</td>
												<td className="px-2 py-1">{r.amount || '—'}</td>
												<td className="px-2 py-1">{r.includeInReg ? 'Yes' : 'No'}</td>
												<td className="px-2 py-1">
													<Button type="button" variant="ghost" size="sm" onClick={() => removeAdditionalRow(i)}>✕</Button>
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2">
						<Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => router.push('/admin-examination-management/admin-exam-masters/exam-fee-setup')}>Cancel</Button>
						<Button type="button" className="h-8 text-[12px]" onClick={save} disabled={!canSave}>{isEditMode ? 'Update' : 'Save'}</Button>
					</div>
				</div>
			</div>
		</PageContainer>
	)
}

