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
import { PageContainer } from '@/components/layout'
import { useBreadcrumbLabel } from '@/common/components/breadcrumb'
import { GM_CODES } from '@/config/constants/ui'

const REVISION_GENERAL_MASTER_ID = 103

type FineRow = {
	fineName: string
	fineFromDate: string
	fineToDate: string
	regFeeFine?: string
	suppleFeeFine?: string
	examFeeFineId?: number
	serverSnapshot?: Record<string, unknown>
}

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

type AdditionalFeeRow = {
	typeId: string | number
	typeName: string
	examType: 'REG' | 'SUPPLE'
	includeInReg: boolean
	amount: string
	feeAddtId?: number
	serverSnapshot?: Record<string, unknown>
}

type RevalFeeRow = {
	typeId: string | number
	typeName: string
	fromDate: string
	toDate: string
	amount: string
	feeAddtId?: number
	serverSnapshot?: Record<string, unknown>
}

function isRevisionFeeItem(item: Record<string, unknown>) {
	const masterId = Number(item.generalMasterId ?? 0)
	const masterCode = String(item.generalMasterCode ?? '')
	return masterId === REVISION_GENERAL_MASTER_ID || masterCode === GM_CODES.REVISION_TYPE
}

function toBackendDateTime(dateStr: string, original?: unknown) {
	if (!dateStr) return null
	if (original) {
		const orig = new Date(String(original))
		const next = new Date(dateStr)
		if (
			!Number.isNaN(orig.getTime()) &&
			!Number.isNaN(next.getTime()) &&
			orig.toISOString().slice(0, 10) === next.toISOString().slice(0, 10)
		) {
			return String(original)
		}
	}
	const d = new Date(dateStr)
	return Number.isNaN(d.getTime()) ? null : d.toISOString()
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
	const [examMasters, setExamMasters] = useState<any[]>([])

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

	// Left: Course Years selection — Angular `courseGroupYears` (course groups × course years).
	const [q, setQ] = useState('')
	const [courseGroupYears, setCourseGroupYears] = useState<CourseGroupYear[]>([])

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
	const [deletedFines, setDeletedFines] = useState<Record<string, unknown>[]>([])

	// Additional fees — master data + rows
	const [additionalTypes, setAdditionalTypes] = useState<any[]>([])
	const [examFeeTypes, setExamFeeTypes] = useState<any[]>([])
	const [revisionTypes, setRevisionTypes] = useState<any[]>([])
	const [additionalDraft, setAdditionalDraft] = useState({
		typeId: '' as string,
		typeName: '' as string,
		examType: 'REG' as 'REG' | 'SUPPLE',
		includeInReg: false,
		amount: '' as string,
	})
	const [additionalRows, setAdditionalRows] = useState<AdditionalFeeRow[]>([])
	const [deletedAdditionalFees, setDeletedAdditionalFees] = useState<Record<string, unknown>[]>([])

	// Re-evaluation fees — merged into examFeeAdditionalStructure on save (Angular parity)
	const [revalDraft, setRevalDraft] = useState({
		typeId: '' as string,
		typeName: 'Revaluation',
		fromDate: '',
		toDate: '',
		amount: '',
	})
	const [revalRows, setRevalRows] = useState<RevalFeeRow[]>([])
	const [deletedRevisionFees, setDeletedRevisionFees] = useState<Record<string, unknown>[]>([])
	const [loadedCollegeId, setLoadedCollegeId] = useState<number | null>(null)
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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
			collegeId: Number(searchParams.get('collegeId') ?? 0),
		}),
		[searchParams],
	)
	const isEditMode = pageParams.examFeeStructureId > 0

	useBreadcrumbLabel(isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure')

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

	// Load additional fee types, exam fee types (Regular/Supple), and revision types
	useEffect(() => {
		async function loadTypes() {
			try {
				const [additional, examTypes, revision] = await Promise.all([
					listGeneralDetailsByMaster(GM_CODES.ADDITIONAL_FEE_TYPE).catch(() => []),
					listGeneralDetailsByMaster(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
					listGeneralDetailsByMaster(GM_CODES.REVISION_TYPE).catch(() => []),
				])
				setAdditionalTypes(Array.isArray(additional) ? additional : [])
				const regSupple = (Array.isArray(examTypes) ? examTypes : []).filter((t: any) => {
					const code = String(t.generalDetailCode ?? '').toLowerCase()
					return code === 'regular' || code === 'supple'
				})
				setExamFeeTypes(regSupple)
				const revisionList = Array.isArray(revision) ? revision : []
				setRevisionTypes(revisionList)
				if (revisionList.length > 0) {
					const first = revisionList[0]
					setRevalDraft((s) => ({
						...s,
						typeId: String(first.generalDetailId ?? first.id ?? ''),
						typeName: String(first.generalDetailDisplayName ?? first.generalDetailName ?? 'Revaluation'),
					}))
				}
			} catch {
				setAdditionalTypes([])
				setExamFeeTypes([])
				setRevisionTypes([])
			}
		}
		loadTypes()
	}, [])

	// Header context only: academic years + exam masters. The Course Years panel is
	// populated separately from `pageParams.courseId` (see loadCourseGroupYears).
	function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)
		// Preselect first academic year if available for faster entry
		if (years.length > 0) {
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
			for (const y of yearList) {
				const courseYearId = Number(y.courseYearId ?? y.fk_course_year_id ?? y.course_year_id ?? y.id ?? 0)
				if (!courseGroupId || !courseYearId) continue
				if (built.some((b) => b.courseGroupId === courseGroupId && b.courseYearId === courseYearId)) continue
				const courseYearName = String(y.courseYearName ?? y.course_year_name ?? y.yearName ?? '')
				const courseYearCode = String(y.courseYearCode ?? y.course_year_code ?? '')
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

	// Create mode: populate the Course Years panel from the course passed in the URL
	// (Angular ngOnInit → selectedCourse(pageParams.courseId)). Edit mode builds it in
	// loadExisting once the saved structure is known (so saved combinations pre-check).
	useEffect(() => {
		if (isEditMode) return
		if (!pageParams.courseId) {
			setCourseGroupYears([])
			return
		}
		void loadCourseGroupYears(pageParams.courseId, null)
	}, [isEditMode, pageParams.courseId, loadCourseGroupYears])

	useEffect(() => {
		async function loadExisting() {
			if (!isEditMode) return
			const query = buildQuery({ examFeeStructureId: pageParams.examFeeStructureId })
			const rows = await listExamFeeStructures(query).catch(() => [])
			const row = Array.isArray(rows) ? rows[0] : null
			if (!row) return

			const rowCollegeId = Number(row.collegeId ?? 0)
			setLoadedCollegeId(rowCollegeId > 0 ? rowCollegeId : null)

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

			// Build the course-group/year list for the structure's course and pre-check
			// the saved combinations (Angular getExamFeeStructure → selectedCourse → getCourseYears).
			const structureCourseId = Number(
				asRecordArray(row.examFeeStructureCourseyr)[0]?.courseId ?? pageParams.courseId ?? 0,
			)
			await loadCourseGroupYears(structureCourseId, row)

			const fineRows = asRecordArray(row.examFeeFine)
				.filter((x) => x.isActive !== false)
				.map((x) => ({
					fineName: String(x.fineName ?? ''),
					fineFromDate: toDateString(parseDateValue(String(x.fineFromDate ?? ''))),
					fineToDate: toDateString(parseDateValue(String(x.fineToDate ?? ''))),
					regFeeFine: x.regFeeFine != null ? String(x.regFeeFine) : '',
					suppleFeeFine: x.supplyFeeFine != null ? String(x.supplyFeeFine) : '',
					examFeeFineId: x.examFeeFineId != null ? Number(x.examFeeFineId) : undefined,
					serverSnapshot: { ...x },
				}))
			setFines(fineRows)
			setDeletedFines([])

			const additionalLoaded: AdditionalFeeRow[] = []
			const revisionLoaded: RevalFeeRow[] = []
			for (const x of asRecordArray(row.examFeeAdditionalStructure).filter((item) => item.isActive !== false)) {
				const snapshot = { ...x }
				if (isRevisionFeeItem(x)) {
					revisionLoaded.push({
						typeId: String(x.adtExamfeetypeCatId ?? ''),
						typeName: String(x.adtExamfeetypeCatDisplayName ?? x.adtExamfeetypeCatCode ?? x.type ?? ''),
						fromDate: toDateString(parseDateValue(String(x.fromDate ?? ''))),
						toDate: toDateString(parseDateValue(String(x.toDate ?? ''))),
						amount: x.fee != null ? String(x.fee) : '',
						feeAddtId: x.feeAddtId != null ? Number(x.feeAddtId) : undefined,
						serverSnapshot: snapshot,
					})
				} else {
					const displayCode = String(x.examTypeCatDisplayCode ?? '')
					additionalLoaded.push({
						typeId: String(x.adtExamfeetypeCatId ?? ''),
						typeName: String(x.adtExamfeetypeCatDisplayName ?? x.type ?? ''),
						examType: displayCode.toLowerCase().includes('supp') ? 'SUPPLE' : 'REG',
						includeInReg: Boolean(x.includeInReg),
						amount: x.fee != null ? String(x.fee) : '',
						feeAddtId: x.feeAddtId != null ? Number(x.feeAddtId) : undefined,
						serverSnapshot: snapshot,
					})
				}
			}
			setAdditionalRows(additionalLoaded)
			setRevalRows(revisionLoaded)
			setDeletedAdditionalFees([])
			setDeletedRevisionFees([])
		}
		loadExisting()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isEditMode, pageParams.examFeeStructureId, pageParams.courseId, loadCourseGroupYears])

	function toggleCourseGroupYear(courseGroupId: number, courseYearId: number) {
		setCourseGroupYears((prev) =>
			prev.map((c) =>
				c.courseGroupId === courseGroupId && c.courseYearId === courseYearId ? { ...c, check: !c.check } : c,
			),
		)
	}

	function addFineRow() {
		if (!fineDraft.fineName.trim()) {
			toastError('Late Fee Fine Name is required')
			return
		}
		if (!fineDraft.fineFromDate || !fineDraft.fineToDate) {
			toastError('Fine Start Date and Fine End Date are required')
			return
		}
		const fineStart = new Date(fineDraft.fineFromDate).getTime()
		const fineEnd = new Date(fineDraft.fineToDate).getTime()
		if (Number.isFinite(fineStart) && Number.isFinite(fineEnd) && fineStart > fineEnd) {
			toastError('Fine End Date must be on or after Start Date')
			return
		}
		if (fineDraft.regFeeFine !== '' && parseNumberOrNull(fineDraft.regFeeFine ?? '') == null) {
			toastError('Reg fee fine must be a number')
			return
		}
		if (fineDraft.suppleFeeFine !== '' && parseNumberOrNull(fineDraft.suppleFeeFine ?? '') == null) {
			toastError('Supple fee fine must be a number')
			return
		}
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
		setFines((s) => {
			const row = s[i]
			if (row?.examFeeFineId != null && row.serverSnapshot) {
				setDeletedFines((d) => [...d, { ...row.serverSnapshot, isActive: false }])
			}
			return s.filter((_, idx) => idx !== i)
		})
	}

	function addAdditionalRow() {
		if (!additionalDraft.typeId) {
			toastError('Additional fee type is required')
			return
		}
		if (!additionalDraft.amount.trim()) {
			toastError('Additional fee amount is required')
			return
		}
		if (parseNumberOrNull(additionalDraft.amount) == null) {
			toastError('Additional fee amount must be a number')
			return
		}
		const selected = additionalTypeOptions.find((t) => t.value === String(additionalDraft.typeId))
		const typeName = additionalDraft.typeName || selected?.label || '—'
		const examTypeCat = examFeeTypes.find((t) => {
			const code = String(t.generalDetailCode ?? '')
			return additionalDraft.examType === 'REG' ? code === 'Regular' : code === 'Supple'
		})
		setAdditionalRows((s) => [
			...s,
			{
				typeId: additionalDraft.typeId,
				typeName,
				examType: additionalDraft.examType,
				includeInReg: additionalDraft.includeInReg,
				amount: additionalDraft.amount,
				serverSnapshot: {
					collegeId: effectiveCollegeId ?? null,
					examTypeCatId: examTypeCat?.generalDetailId,
					examTypeCatDisplayCode: additionalDraft.examType === 'REG' ? 'Regular' : 'Supple',
					includeInRev: false,
					isActive: true,
				},
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
		setAdditionalRows((s) => {
			const row = s[i]
			if (row?.feeAddtId && row.serverSnapshot) {
				setDeletedAdditionalFees((d) => [...d, { ...row.serverSnapshot, isActive: false }])
			}
			return s.filter((_, idx) => idx !== i)
		})
	}

	function addRevalRow() {
		if (!revalDraft.typeId) {
			toastError('Re-evaluation type is required')
			return
		}
		if (!revalDraft.fromDate || !revalDraft.toDate) {
			toastError('Re-evaluation From Date and To Date are required')
			return
		}
		if (!revalDraft.amount.trim()) {
			toastError('Re-evaluation amount is required')
			return
		}
		if (parseNumberOrNull(revalDraft.amount) == null) {
			toastError('Re-evaluation amount must be a number')
			return
		}
		const revalStart = new Date(revalDraft.fromDate).getTime()
		const revalEnd = new Date(revalDraft.toDate).getTime()
		if (Number.isFinite(revalStart) && Number.isFinite(revalEnd) && revalStart > revalEnd) {
			toastError('Re-evaluation To Date must be on or after From Date')
			return
		}
		setRevalRows((s) => [...s, { ...revalDraft }])
		setRevalDraft((s) => ({
			...s,
			fromDate: '',
			toDate: '',
			amount: '',
		}))
	}
	function removeRevalRow(i: number) {
		setRevalRows((s) => {
			const row = s[i]
			if (row?.feeAddtId && row.serverSnapshot) {
				setDeletedRevisionFees((d) => [...d, { ...row.serverSnapshot, isActive: false }])
			}
			return s.filter((_, idx) => idx !== i)
		})
	}

	function parseNumberOrNull(v: string): number | null {
		if (v === '' || v == null) return null
		const n = Number(v)
		return Number.isFinite(n) ? n : null
	}

	// Angular drives course/exam from the URL params; fall back to them when the
	// college-filter lookups did not resolve a selection (e.g. admins with no employeeId).
	const effectiveCourseId = selectedCourseId ?? (pageParams.courseId > 0 ? pageParams.courseId : null)
	const effectiveExamId = selectedExamId ?? (pageParams.examId > 0 ? pageParams.examId : null)
	const effectiveCollegeId = pageParams.collegeId > 0 ? pageParams.collegeId : loadedCollegeId
	const hasCheckedCourseYear = courseGroupYears.some((c) => c.check)

	function validate(): string[] {
		const errs: string[] = []
		const next: Record<string, string> = {}
		if (!effectiveCourseId) errs.push('Course is required')
		if (!effectiveExamId) errs.push('Exam Master is required')
		if (!form.examFeeStructureName.trim()) {
			errs.push('Exam Fee Structure name is required')
			next.examFeeStructureName = 'Exam Fee Structure name is required'
		}
		if (!hasCheckedCourseYear) {
			errs.push('Select at least one Course Year')
			next.courseYears = 'Select at least one Course Year'
		}
		if (form.collectionStartDate && form.collectionEndDate) {
			const s = new Date(form.collectionStartDate).getTime()
			const e = new Date(form.collectionEndDate).getTime()
			if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
				errs.push('Collection End Date must be on or after Start Date')
				next.collectionEndDate = 'Collection End Date must be on or after Start Date'
			}
		}
		// Numeric sanity checks
		const numericFields = [
			['regFee', 'Reg Fee', form.regFee],
			['suppleFee', 'Supple Fee', form.suppleFee],
			['subject1Fee', '1 Subject Fee', form.subject1Fee],
			['subject2Fee', '2 Subject Fee', form.subject2Fee],
			['subject3Fee', '3 Subject Fee', form.subject3Fee],
			['subject4Fee', '4 Subject Fee', form.subject4Fee],
			['subject5Fee', '5 Subject Fee', form.subject5Fee],
			['subject6Fee', '6 Subject Fee', form.subject6Fee],
			['subject7Fee', '7 Subject Fee', form.subject7Fee],
		] as const
		for (const [key, label, value] of numericFields) {
			if (value !== '' && parseNumberOrNull(value) == null) {
				errs.push(`${label} must be a number`)
				next[key] = `${label} must be a number`
			}
		}
		setFieldErrors(next)
		return errs
	}

	const canSave = useMemo(() => {
		return (
			!!effectiveCourseId &&
			!!effectiveExamId &&
			form.examFeeStructureName.trim().length > 0 &&
			hasCheckedCourseYear
		)
	}, [form.examFeeStructureName, effectiveCourseId, effectiveExamId, hasCheckedCourseYear])

	async function save() {
		const errors = validate()
		if (errors.length > 0) {
			toastError(errors.join('\n'))
			return
		}

		const collegeId = effectiveCollegeId ?? null

		// Angular addExamFeestructurePost(): one examFeeStructureCourseyr per group+year
		// combination. New rows only when checked; existing rows (examFeeCourseyrId) are
		// always sent with their current isActive so unchecking deactivates them.
		const examFeeStructureCourseyr = courseGroupYears.flatMap((c) => {
			const base = {
				collegeId,
				courseGroupId: c.courseGroupId,
				courseYearId: c.courseYearId,
			}
			if (c.examFeeCourseyrId) {
				return [{
					...base,
					isActive: c.check,
					examFeeCourseyrId: c.examFeeCourseyrId,
				}]
			}
			if (c.check) {
				return [{ ...base, isActive: true }]
			}
			return []
		})

		const buildAdditionalFeePayload = (row: AdditionalFeeRow): Record<string, unknown> => {
			const base = row.serverSnapshot ?? {}
			const examTypeCat = examFeeTypes.find((t) => {
				const code = String(t.generalDetailCode ?? '')
				return row.examType === 'REG' ? code === 'Regular' : code === 'Supple'
			})
			const typeOption = additionalTypes.find((t) => String(t.generalDetailId ?? t.id) === String(row.typeId))
			return {
				...base,
				...(row.feeAddtId ? { feeAddtId: row.feeAddtId } : {}),
				adtExamfeetypeCatId: Number(row.typeId) || base.adtExamfeetypeCatId,
				fee: row.amount === '' ? null : Number(row.amount),
				includeInReg: row.includeInReg,
				includeInRev: false,
				type: row.typeName || base.type || typeOption?.generalDetailDisplayName || typeOption?.generalDetailName,
				isActive: true,
				collegeId,
				examTypeCatId: examTypeCat?.generalDetailId ?? base.examTypeCatId,
				examTypeCatDisplayCode: row.examType === 'REG' ? 'Regular' : 'Supple',
			}
		}

		const buildFinePayload = (row: FineRow): Record<string, unknown> => {
			const base = row.serverSnapshot ?? {}
			return {
				...base,
				...(row.examFeeFineId ? { examFeeFineId: row.examFeeFineId } : {}),
				fineName: row.fineName,
				fineFromDate: row.fineFromDate || null,
				fineToDate: row.fineToDate || null,
				regFeeFine: row.regFeeFine === '' || row.regFeeFine == null ? null : Number(row.regFeeFine),
				supplyFeeFine: row.suppleFeeFine === '' || row.suppleFeeFine == null ? null : Number(row.suppleFeeFine),
				isActive: true,
				collegeId,
				...(isEditMode && pageParams.examFeeStructureId
					? {
							examFeeStructureId: pageParams.examFeeStructureId,
							examFeeStructureName: form.examFeeStructureName,
						}
					: {}),
			}
		}

		const buildRevisionFeePayload = (row: RevalFeeRow): Record<string, unknown> => {
			const base = row.serverSnapshot ?? {}
			const revisionType = revisionTypes.find((t) => String(t.generalDetailId ?? t.id) === String(row.typeId))
			return {
				...base,
				...(row.feeAddtId ? { feeAddtId: row.feeAddtId } : {}),
				adtExamfeetypeCatId: Number(row.typeId) || base.adtExamfeetypeCatId,
				fee: row.amount === '' ? null : Number(row.amount),
				includeInRev: true,
				includeInReg: false,
				fromDate: toBackendDateTime(row.fromDate, base.fromDate),
				toDate: toBackendDateTime(row.toDate, base.toDate),
				isActive: true,
				collegeId,
				generalMasterId: REVISION_GENERAL_MASTER_ID,
				generalMasterCode: GM_CODES.REVISION_TYPE,
				adtExamfeetypeCatCode: revisionType?.generalDetailDisplayName ?? base.adtExamfeetypeCatCode ?? row.typeName,
			}
		}

		const payload: Record<string, unknown> = {
			collegeId,
			examId: effectiveExamId,
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
			examFeeStructureCourseyr,
			examFeeFine: [...fines.map(buildFinePayload), ...deletedFines],
			examFeeAdditionalStructure: [
				...additionalRows.map(buildAdditionalFeePayload),
				...revalRows.map(buildRevisionFeePayload),
				...deletedAdditionalFees,
				...deletedRevisionFees,
			],
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
		setCourseGroupYears((prev) => prev.map((c) => ({ ...c, check: false })))
		setFines([])
	}

	return (
		<PageContainer className="space-y-4">
			<h2 className="text-lg font-semibold tracking-tight text-foreground">
				{isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure'}
			</h2>
			<div className="app-card overflow-hidden">
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
							<Input
								value={form.examFeeStructureName}
								onChange={(e) => {
									setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))
									if (fieldErrors.examFeeStructureName) {
										setFieldErrors((prev) => {
											const next = { ...prev }
											delete next.examFeeStructureName
											return next
										})
									}
								}}
								placeholder="Enter exam fee structure name"
								aria-invalid={Boolean(fieldErrors.examFeeStructureName)}
							/>
							{fieldErrors.examFeeStructureName ? (
								<p className="text-[11px] text-destructive">{fieldErrors.examFeeStructureName}</p>
							) : null}
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
									onChange={(date) => {
										setForm((s) => ({ ...s, collectionEndDate: toDateString(date) }))
										if (fieldErrors.collectionEndDate) {
											setFieldErrors((prev) => {
												const next = { ...prev }
												delete next.collectionEndDate
												return next
											})
										}
									}}
									placeholder="dd-mm-yyyy"
									className="text-[12px]"
								/>
								{fieldErrors.collectionEndDate ? (
									<p className="text-[11px] text-destructive">{fieldErrors.collectionEndDate}</p>
								) : null}
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
							placeholder="Search course years…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
						{fieldErrors.courseYears ? (
							<p className="text-[11px] text-destructive px-1">{fieldErrors.courseYears}</p>
						) : null}
						<div className="max-h-[360px] overflow-y-auto scrollbar-hidden space-y-1">
							{filteredCourseGroupYears.map((c) => {
								const key = `${c.courseGroupId}-${c.courseYearId}`
								// Angular label: "{{groupCode}} - {{courseYearCode}}".
								const yearLabel = c.courseYearCode || c.courseYearName || `Year ${c.courseYearId}`
								return (
									<label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 text-[12px]">
										<Checkbox
											checked={c.check}
											onCheckedChange={() => {
												toggleCourseGroupYear(c.courseGroupId, c.courseYearId)
												if (fieldErrors.courseYears) {
													setFieldErrors((prev) => {
														const next = { ...prev }
														delete next.courseYears
														return next
													})
												}
											}}
										/>
										<span>
											{c.groupCode ? `${c.groupCode} - ` : ''}
											{yearLabel}
										</span>
									</label>
								)
							})}
							{filteredCourseGroupYears.length === 0 && <div className="text-[12px] text-muted-foreground px-2">No items</div>}
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
								<Input
									className="h-8 text-[12px]"
									placeholder="Enter fine name"
									value={fineDraft.fineName}
									onChange={(e) => setFineDraft((s) => ({ ...s, fineName: e.target.value }))}
								/>
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
								<Input
									inputMode="numeric"
									className="h-8 text-[12px]"
									placeholder="Reg fee fine"
									value={fineDraft.regFeeFine ?? ''}
									onChange={(e) => setFineDraft((s) => ({ ...s, regFeeFine: e.target.value }))}
								/>
							</div>
							<div className="md:col-span-2 space-y-1.5">
								<Label>Supple</Label>
								<Input
									inputMode="numeric"
									className="h-8 text-[12px]"
									placeholder="Supple fee fine"
									value={fineDraft.suppleFeeFine ?? ''}
									onChange={(e) => setFineDraft((s) => ({ ...s, suppleFeeFine: e.target.value }))}
								/>
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
									value={revalDraft.typeId || undefined}
									onValueChange={(v) => {
										const selected = revisionTypes.find((t) => String(t.generalDetailId ?? t.id) === v)
										setRevalDraft((s) => ({
											...s,
											typeId: v,
											typeName: String(selected?.generalDetailDisplayName ?? selected?.generalDetailName ?? v),
										}))
									}}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select re-valuation type" />
									</SelectTrigger>
									<SelectContent>
										{revisionTypes.length === 0 && (
											<SelectItem value="__no_data__" disabled>
												No revision types available
											</SelectItem>
										)}
										{revisionTypes.map((t) => {
											const id = String(t.generalDetailId ?? t.id ?? '')
											const label = String(t.generalDetailDisplayName ?? t.generalDetailName ?? id)
											return (
												<SelectItem key={id} value={id}>
													{label}
												</SelectItem>
											)
										})}
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
								<Input
									inputMode="numeric"
									className="h-8 text-[12px]"
									placeholder="Amount"
									value={revalDraft.amount}
									onChange={(e) => setRevalDraft((s) => ({ ...s, amount: e.target.value }))}
								/>
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
										<SelectValue placeholder="Select additional fee type" />
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
								<Input
									inputMode="numeric"
									className="h-8 text-[12px]"
									placeholder="Amount"
									value={additionalDraft.amount}
									onChange={(e) => setAdditionalDraft((s) => ({ ...s, amount: e.target.value }))}
								/>
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

