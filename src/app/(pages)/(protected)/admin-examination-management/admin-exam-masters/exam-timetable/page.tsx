'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
	Select as ShadcnSelect,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { distinct } from '@/lib/utils'
import {
	getUnivExamFiltersAll,
	resolveExamLoginEmpId,
	getExamFiltersNoTimetable,
	getExamTimetableDetails,
	listCourseGroups,
	listCourseYears,
} from '@/services/examination'
import { useSessionContext } from '@/context/SessionContext'
import { toDateOnlyISO } from '@/common/generic-functions'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, ShieldAlert, GraduationCap, Calendar, ScrollText } from 'lucide-react'
import { FilteredPage } from '@/components/layout'
import CheckConflictsModal from './CheckConflictsModal'

function pickAyId(row: any): number {
	return Number(row?.fk_academic_year_id ?? row?.academicYearId ?? row?.fk_academicYearId ?? 0)
}

export default function ExamTimetablePage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { user } = useSessionContext()
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
	const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)
	/** Course years scoped from {@link getExamFiltersNoTimetable} (Angular CollegesListDetails), not raw domain course years only. */
	const [examScopedCourseYears, setExamScopedCourseYears] = useState<{ courseYearId: number; courseYearName: string }[]>(
		[],
	)

	// Branch rows and date columns
	const [branches, setBranches] = useState<any[]>([])
	const [dates, setDates] = useState<Date[]>([])

	// Schedules kept client-side for now (mirroring UI structure)
	const [scheduleMap, setScheduleMap] = useState<Record<string, any>>({})

	// Modal state for creating schedule
	const [open, setOpen] = useState(false)
	const [modal, setModal] = useState({
		branchId: '' as string | number,
		date: '',
		session: 'M' as 'M' | 'A',
		subjectCode: '',
		room: '',
		remarks: '',
		isRegular: true,
		isActive: true,
	})

	const [conflictsOpen, setConflictsOpen] = useState(false)
	const [loadingGrid, setLoadingGrid] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [editContext, setEditContext] = useState<{
		branchId: string | number
		branchCode?: string
		branchLabel: string
		dateStr: string
		session: 'M' | 'A'
		original: Record<string, unknown>
	} | null>(null)
	const [editForm, setEditForm] = useState({
		examDate: '',
		session: 'M' as 'M' | 'A',
		examType: 'regular' as 'regular' | 'supplementary',
	})

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
				const urlCourseId = Number(searchParams.get('courseId') ?? 0)
				const target =
					urlCourseId > 0 && distinctCourses.some((c) => Number(c.fk_course_id) === urlCourseId)
						? urlCourseId
						: distinctCourses[0].fk_course_id
				handleCourseChange(target, f)
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [user?.employeeId, searchParams])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	// Restore academicYearId from URL once the academic-year list is available.
	useEffect(() => {
		const ayId = Number(searchParams.get('academicYearId') ?? 0)
		if (ayId > 0 && academicYears.some((a: any) => pickAyId(a) === ayId)) {
			setSelectedAcademicYearId(ayId)
		}
	}, [academicYears, searchParams])

	// Restore examId from URL once exam masters load.
	useEffect(() => {
		const examId = Number(searchParams.get('examId') ?? 0)
		if (examId > 0 && examMasters.some((e: any) => Number(e.examId ?? e.id) === examId)) {
			setSelectedExamId(examId)
		}
	}, [examMasters, searchParams])

	// Restore courseYearId from URL once the effective course-year list resolves.
	useEffect(() => {
		const cyId = Number(searchParams.get('courseYearId') ?? 0)
		if (cyId <= 0) return
		const list = examScopedCourseYears.length > 0 ? examScopedCourseYears : null
		if (list && list.some((y) => y.courseYearId === cyId)) {
			setSelectedCourseYearId(cyId)
		}
	}, [examScopedCourseYears, searchParams])

	async function handleCourseChange(courseId: number, fRef = filtersData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setSelectedCourseYearId(null)
		setExamScopedCourseYears([])
		setBranches([])
		setDates([])

		// Branches are typically departments within the course
		const filtered = (fRef ?? []).filter((r: any) => Number(r.fk_course_id) === Number(courseId))
		const distinctBranches = distinct(filtered, (r: any) => r.fk_dept_id ?? r.fk_branch_id ?? r.dept_id ?? r.branch_id)
		setBranches(distinctBranches)

		const withAyIds = filtered.filter((r: any) => pickAyId(r) > 0)
		const yearSource = withAyIds.length > 0 ? withAyIds : filtered
		const distinctYears = distinct(yearSource, (r: any) => pickAyId(r)).sort(
			(a: any, b: any) =>
				Number(String(b.academic_year ?? '').split('-')[0] || 0) -
				Number(String(a.academic_year ?? '').split('-')[0] || 0),
		)
		setAcademicYears(distinctYears)

		// Load course years for the grid label (I/II/III Year ...)
		const yrs = await listCourseYears(courseId).catch(() => [])
		setCourseYears(Array.isArray(yrs) ? yrs : [])
	}

	useEffect(() => {
		setExamMasters([])
		setSelectedExamId(null)
		setDates([])
		setExamScopedCourseYears([])
		setSelectedCourseYearId(null)
		if (!selectedCourseId || !selectedAcademicYearId) return
		const rows = filtersData.filter(
			(r: any) =>
				Number(r.fk_course_id) === Number(selectedCourseId) &&
				pickAyId(r) === Number(selectedAcademicYearId),
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

	const domainCourseYearChoices = useMemo(
		() =>
			courseYears
				.map((y: any) => ({
					courseYearId: Number(y.courseYearId ?? y.id ?? 0),
					courseYearName:
						String(y.courseYearName ?? y.yearName ?? y.course_year_name ?? '').trim() ||
						`Course year ${Number(y.courseYearId ?? y.id ?? 0)}`,
				}))
				.filter((o) => o.courseYearId > 0),
		[courseYears],
	)

	const effectiveCourseYears =
		examScopedCourseYears.length > 0 ? examScopedCourseYears : domainCourseYearChoices

	useEffect(() => {
		let cancelled = false
		async function loadScopedCourseYears() {
			if (!selectedCourseId || !selectedAcademicYearId || !selectedExamId) {
				setExamScopedCourseYears([])
				setSelectedCourseYearId(null)
				return
			}
			const filterRows = await getExamFiltersNoTimetable({
				courseId: selectedCourseId,
				examId: selectedExamId,
				academicYearId: selectedAcademicYearId ?? 0,
				courseYearId: 0,
				employeeId: resolveExamLoginEmpId(user?.employeeId),
			})
			if (cancelled) return
			const rows = Array.isArray(filterRows) ? filterRows : []
			const seen = new Set<number>()
			const scoped: { courseYearId: number; courseYearName: string }[] = []
			for (const r of rows) {
				const id = Number(r.fk_course_year_id ?? r.courseYearId ?? 0)
				if (id <= 0 || seen.has(id)) continue
				seen.add(id)
				scoped.push({
					courseYearId: id,
					courseYearName:
						String(
							r.course_year_name ??
								r.course_year_code ??
								r.courseYearName ??
								r.yearName ??
								r.course_year_short_name ??
								'',
						).trim() || `Year ${id}`,
				})
			}
			scoped.sort((a, b) => a.courseYearId - b.courseYearId)
			setExamScopedCourseYears(scoped)
			const fallback = courseYears
				.map((y: any) => ({
					courseYearId: Number(y.courseYearId ?? y.id ?? 0),
					courseYearName:
						String(y.courseYearName ?? y.yearName ?? y.course_year_name ?? '').trim() ||
						`Year ${Number(y.courseYearId ?? y.id ?? 0)}`,
				}))
				.filter((o) => o.courseYearId > 0)
			const next = scoped.length > 0 ? scoped : fallback
			setSelectedCourseYearId((prev) => {
				if (prev != null && next.some((o) => o.courseYearId === prev)) return prev
				return next[0]?.courseYearId ?? null
			})
		}
		void loadScopedCourseYears()
		return () => {
			cancelled = true
		}
	}, [selectedCourseId, selectedAcademicYearId, selectedExamId, user?.employeeId, courseYears])

	// When exam changes, build date headers
	useEffect(() => {
		async function hydrateFromApi() {
			if (!selectedExamId || !selectedCourseId || !selectedCourseYearId) return
			setLoadingGrid(true)
			try {
				// We'll accumulate branches from filters/entities first,
				// then merge with any discovered in timetable rows.
				let baseBranches: any[] = []
				function buildRangeFromDates(startStr?: string, endStr?: string) {
					if (!startStr || !endStr) return null
					const start = new Date(startStr)
					const end = new Date(endStr)
					if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
					const out: Date[] = []
					const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
					const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate())
					while (cur <= endD) {
						out.push(new Date(cur))
						cur.setDate(cur.getDate() + 1)
					}
					return out
				}

				// Use filters proc to get branches/groups when no timetable yet
				const filterRows = await getExamFiltersNoTimetable({
					courseId: selectedCourseId,
					examId: selectedExamId,
					academicYearId: selectedAcademicYearId ?? 0,
					courseYearId: 0,
					employeeId: resolveExamLoginEmpId(user?.employeeId),
				})
				if (Array.isArray(filterRows) && filterRows.length > 0) {
					// Try to find rows having group code/name
					const grpRows = filterRows.filter(
						(r: any) =>
							r.group_code ||
							r.group_short_name ||
							r.course_group_code ||
							r.courseGroupCode ||
							r.dept_code ||
							r.branch_code,
					)
					if (grpRows.length > 0) {
						const mapped = grpRows.map((r: any) => {
							const code =
								r.group_code ??
								r.group_short_name ??
								r.course_group_code ??
								r.courseGroupCode ??
								r.dept_code ??
								r.branch_code ??
								r.groupName
							const normCode = String(code ?? '').trim().toUpperCase()
							const id = r.group_id ?? r.course_group_id ?? r.dept_id ?? r.branch_id ?? r.groupId ?? r.id ?? normCode
							return { fk_dept_id: id, dept_code: normCode }
						})
						// Deduplicate by code
						const unique = distinct(mapped, (x: any) => x.dept_code)
						let final = unique
						// Merge with course group entity list to ensure full coverage
						try {
							const cg = await listCourseGroups(selectedCourseId)
							const mappedCg = (Array.isArray(cg) ? cg : []).map((g: any) => ({
								fk_dept_id: g.courseGroupId ?? g.id ?? g.groupId,
								dept_code: String(g.courseGroupCode ?? g.groupCode ?? g.code ?? '').trim().toUpperCase(),
							}))
							final = distinct([...unique, ...mappedCg], (x: any) => x.dept_code)
						} catch {}
						baseBranches = final
						setBranches(final)
					}
				}

				const data = await getExamTimetableDetails(selectedCourseYearId, selectedCourseId, selectedExamId)
				// Try to infer shapes:
				// 1) If array of rows with fields dept/branch + examDate + session + subjectCode
				if (Array.isArray(data)) {
					// If exam master doesn't provide dates, compute from payload's fromDate/toDate
					const anyRow: any = data[0]
					const range = buildRangeFromDates(anyRow?.fromDate, anyRow?.toDate)

					// branches
					const brIdx = new Map<string | number, any>()
					const dateIdx = new Map<string, Date>()
					const map: Record<string, any[]> = {}

					function entrySignature(entry: Record<string, unknown>) {
						const sid = Number(
							entry.examTimetableDetId ??
								entry.examTimetableDetailId ??
								entry.fk_exam_timetable_det_id ??
								entry.exam_time_table_det_id ??
								0,
						)
						if (sid > 0) return `id:${sid}`
						const subject = String(entry.subjectCode ?? '')
						const sess = String(entry.session ?? '')
						const reg = String(entry.isRegular ?? true)
						return `s:${subject}|${sess}|${reg}`
					}

					function pushScheduleEntry(scheduleKey: string, payload: Record<string, unknown>) {
						if (!map[scheduleKey]) map[scheduleKey] = []
						const sig = entrySignature(payload)
						if (!map[scheduleKey].some((existing) => entrySignature(existing) === sig)) {
							map[scheduleKey].push(payload)
						}
					}

					for (const row of data) {
						// Prefer matching by group/branch code; fall back to ids
						const groupCodeRaw =
							row.groupCode ?? row.courseGroupCode ?? row.group_code ?? row.deptCode ?? row.branchCode ?? row.dept_code
						const groupCode = String(groupCodeRaw ?? '').trim().toUpperCase()
						let bid =
							row.courseGroupId ??
							(row.courseGroupIds ? String(row.courseGroupIds).split(',')[0] : undefined) ??
							row.deptId ??
							row.departmentId ??
							row.branchId ??
							row.fk_dept_id ??
							row.fk_branch_id ??
							row.dept_id ??
							row.branch_id
						// If id missing, try to find by code among branches
						if ((bid == null || bid === '') && groupCode) {
							const found = branches.find((b: any) => String(b.dept_code) === groupCode)
							if (found) bid = found.fk_dept_id
						}
						const bname =
							groupCode || row.deptCode || row.departmentCode || row.branchCode || row.deptName || row.departmentName || row.branchName
						if (bid != null && !brIdx.has(bid)) brIdx.set(bid, { fk_dept_id: bid, dept_code: bname })
						const ds = String(row.examDate ?? row.date ?? row.examOn ?? row.exam_day ?? '')
						if (ds) {
							// Normalize to YYYY-MM-DD without timezone shifts
							const dateKeyFromApi = (ds.match(/\d{4}-\d{2}-\d{2}/)?.[0]) ?? fmtYMD(new Date(ds))
							const parts = dateKeyFromApi.split('-').map((x) => Number(x))
							const dd = new Date(parts[0], parts[1] - 1, parts[2])
							if (!isNaN(dd.getTime())) dateIdx.set(dateKeyFromApi, dd)
						}
						const dateKey = ds ? (ds.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? fmtYMD(new Date(ds))) : ''
						const sessRaw = row.session ?? row.examSession ?? row.sessionCode ?? row.examSessionName ?? row.examsessioninCatCode ?? ''
						const sess = String(sessRaw).trim().toUpperCase().startsWith('A') ? 'A' : 'M'
						const supp =
							row.isSupplementary === true ||
							row.is_supplementary === true ||
							String(row.examPaperType ?? row.paperType ?? row.examAppearingType ?? '').toUpperCase().includes('SUP')
						const isRegularExplicit = row.isRegular !== undefined && row.isRegular !== null ? !!row.isRegular : undefined
						const isRegular = isRegularExplicit !== undefined ? isRegularExplicit : !supp
						const payload = {
							branchId: bid ?? groupCode,
							date: dateKey,
							session: sess,
							subjectCode: row.subjectCode ?? row.paperCode ?? row.subCode ?? '',
							subjectName:
								row.subjectName ??
								row.subject_name ??
								row.sub_name ??
								row.paperTitle ??
								row.paper_title ??
								'',
							room: row.room ?? row.block ?? '',
							remarks: row.remarks ?? '',
							isRegular,
							isActive: row.isActive ?? true,
							examTimetableDetId:
								row.examTimetableDetId ??
								row.examTimetableDetailId ??
								row.fk_exam_timetable_det_id ??
								row.exam_time_table_det_id,
						}
						const branchPrefixes = Array.from(
							new Set([bid, groupCode].filter((x) => x != null && String(x).trim() !== '').map(String)),
						)
						for (const p of branchPrefixes) {
							pushScheduleEntry(`${p}-${dateKey}-${sess}`, payload)
						}
					}
					// Prefer timetable-derived branches, then filter/entity list.
					// Always de-dupe by group CODE — filter rows and timetable rows can
					// carry different ids for the same CSE/CSD/… and otherwise show twice.
					const byCode = new Map<string, any>()
					for (const x of [...Array.from(brIdx.values()), ...baseBranches]) {
						const code = String(x.dept_code ?? x.groupCode ?? x.branch_code ?? '')
							.trim()
							.toUpperCase()
						if (!code) continue
						const existing = byCode.get(code)
						if (!existing) {
							byCode.set(code, { ...x, dept_code: code })
							continue
						}
						// Keep a numeric courseGroupId when only one side has it
						const nextId = x.fk_dept_id ?? x.courseGroupId ?? x.dept_id
						const prevId = existing.fk_dept_id ?? existing.courseGroupId ?? existing.dept_id
						if ((prevId == null || prevId === '') && nextId != null && nextId !== '') {
							byCode.set(code, { ...existing, fk_dept_id: nextId, dept_code: code })
						}
					}
					setBranches(Array.from(byCode.values()))
					// dates from master range if available, else collected from rows
					if (range) {
						setDates(range)
					} else {
						const dts = Array.from(dateIdx.values()).sort((a, b) => a.getTime() - b.getTime())
						setDates(dts)
					}
					setScheduleMap(map)
					return
				}
				// 2) If object shape has branches and dates arrays
				if (data && typeof data === 'object') {
					if (Array.isArray(data.branches)) setBranches(data.branches)
					if (Array.isArray(data.dates)) {
						const dts = (data.dates as any[])
							.map((v) => new Date(v))
							.filter((d) => !isNaN(d.getTime()))
							.sort((a, b) => a.getTime() - b.getTime())
						setDates(dts)
					}
					if (data.schedule) setScheduleMap(data.schedule as any)
				}
			} catch {
				// ignore network errors for now
			} finally {
				setLoadingGrid(false)
			}
		}
		hydrateFromApi()

		function parseDate(val: any): Date | null {
			if (!val) return null
			const d = new Date(val)
			if (!isNaN(d.getTime())) return d
			// try yyyy-MM-dd
			const parts = String(val).split('-')
			if (parts.length === 3) {
				const dd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
				return isNaN(dd.getTime()) ? null : dd
			}
			return null
		}
		if (!selectedExamId) return
		const ex = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId) ?? {}
		const start = parseDate(ex.examStartDate ?? ex.examFromDate ?? ex.fromDate ?? ex.startDate)
		const end = parseDate(ex.examEndDate ?? ex.examToDate ?? ex.toDate ?? ex.endDate)
		if (!start || !end) {
			setDates([])
			return
		}
		const arr: Date[] = []
		const cur = new Date(start)
		while (cur <= end) {
			arr.push(new Date(cur))
			cur.setDate(cur.getDate() + 1)
		}
		setDates(arr)
	}, [selectedExamId, examMasters, selectedCourseId, selectedCourseYearId, selectedAcademicYearId, user?.employeeId])

	const titleLine = useMemo(() => {
		const course = courses.find((c) => c.fk_course_id === selectedCourseId)
		const ay = academicYears.find((a) => pickAyId(a) === Number(selectedAcademicYearId))
		const cyEff = effectiveCourseYears.find((y) => Number(y.courseYearId) === Number(selectedCourseYearId))
		const cyLegacy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
		const cyLabel = cyEff?.courseYearName ?? cyLegacy?.courseYearName ?? cyLegacy?.yearName
		const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
		return [
			course?.course_code ?? course?.course_name,
			ay?.academic_year ?? ay?.academicYear,
			cyLabel,
			exam?.examName,
		].filter(Boolean).join(' / ')
	}, [
		academicYears,
		courseYears,
		courses,
		effectiveCourseYears,
		examMasters,
		selectedAcademicYearId,
		selectedCourseId,
		selectedCourseYearId,
		selectedExamId,
	])

	const regulationLabel = useMemo(() => {
		const cy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
		const row =
			(filtersData ?? []).find(
				(r: any) =>
					Number(r.fk_course_id) === Number(selectedCourseId) &&
					pickAyId(r) === Number(selectedAcademicYearId) &&
					Number(r.fk_exam_id) === Number(selectedExamId),
			) ?? null
		const fromCy =
			String(
				cy?.regulationName ??
					cy?.regulationCode ??
					cy?.regulation_name ??
					cy?.regulationShortName ??
					'',
			).trim()
		const fromRow = String(row?.regulation_code ?? row?.regulation_short_name ?? row?.reg_short_name ?? '').trim()
		return fromCy || fromRow || ''
	}, [courseYears, filtersData, selectedAcademicYearId, selectedCourseId, selectedCourseYearId, selectedExamId])

	function formatExamMasterRange(ex: Record<string, unknown>) {
		const fmt = (v: unknown) => {
			if (v == null || v === '') return ''
			try {
				const d = new Date(String(v))
				if (Number.isNaN(d.getTime())) return String(v)
				return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
			} catch {
				return String(v)
			}
		}
		const a = fmt(ex.examStartDate ?? ex.examFromDate ?? ex.fromDate ?? ex.startDate)
		const b = fmt(ex.examEndDate ?? ex.examToDate ?? ex.toDate ?? ex.endDate)
		if (!a || !b) return ''
		return `(${a} - ${b})`
	}

	const editExamRangeText = useMemo(() => {
		const ex = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId) ?? {}
		return formatExamMasterRange(ex as Record<string, unknown>)
	}, [examMasters, selectedExamId])

	function matchesTimetableEntry(a: Record<string, unknown>, b: Record<string, unknown>) {
		const sidA = Number(a.examTimetableDetId ?? a.fk_exam_timetable_det_id ?? 0)
		const sidB = Number(b.examTimetableDetId ?? b.fk_exam_timetable_det_id ?? 0)
		if (sidA > 0 && sidB > 0 && sidA === sidB) return true
		if (sidA > 0 || sidB > 0) return false
		return (
			String(a.subjectCode ?? '') === String(b.subjectCode ?? '') &&
			Boolean(a.isRegular) === Boolean(b.isRegular) &&
			String(a.session ?? '') === String(b.session ?? '')
		)
	}

	function openEditTimetable(branch: any, dateStr: string, sess: 'M' | 'A', slot: Record<string, unknown>) {
		const bid = branch.fk_dept_id ?? branch.fk_branch_id ?? branch.dept_id ?? branch.branch_id ?? branch.dept_code
		const bcode = branch.dept_code ?? branch.branch_code
		const branchLabel =
			bcode ??
			branch.dept_name ??
			branch.branch_name ??
			String(bid ?? '')
		setEditContext({
			branchId: bid,
			branchCode: bcode ? String(bcode) : undefined,
			branchLabel: String(branchLabel),
			dateStr,
			session: sess,
			original: { ...slot, session: sess },
		})
		setEditForm({
			examDate: dateStr,
			session: sess,
			examType: slot.isRegular === false ? 'supplementary' : 'regular',
		})
		setEditOpen(true)
	}

	function saveEditTimetable(e: React.FormEvent) {
		e.preventDefault()
		if (!editContext) return
		const { branchId, branchCode, dateStr, session, original } = editContext
		const prefixes = Array.from(new Set([branchId, branchCode].filter((x) => x != null && String(x).trim() !== '').map(String)))
		const newDate = editForm.examDate
		const newSess = editForm.session
		const isRegular = editForm.examType === 'regular'

		setScheduleMap((prev) => {
			const next: Record<string, unknown> = { ...prev }
			const normalizeList = (v: unknown) => (Array.isArray(v) ? [...v] : v != null ? [v] : [])
			const inPlace = newDate === dateStr && newSess === session

			if (inPlace) {
				for (const p of prefixes) {
					const cellKey = `${p}-${dateStr}-${session}`
					let list = normalizeList(next[cellKey])
					const idx = list.findIndex((entry) => matchesTimetableEntry(entry as Record<string, unknown>, original))
					if (idx >= 0) {
						list[idx] = { ...(list[idx] as Record<string, unknown>), date: newDate, session: newSess, isRegular }
						next[cellKey] = list
					}
				}
				return next
			}

			for (const p of prefixes) {
				const oldKey = `${p}-${dateStr}-${session}`
				const newKey = `${p}-${newDate}-${newSess}`
				let listOld = normalizeList(next[oldKey])
				const idx = listOld.findIndex((entry) => matchesTimetableEntry(entry as Record<string, unknown>, original))
				const base =
					idx >= 0 ? { ...(listOld[idx] as Record<string, unknown>) } : ({ ...original } as Record<string, unknown>)
				const updated: Record<string, unknown> = {
					...base,
					date: newDate,
					session: newSess,
					isRegular,
				}

				if (idx >= 0) listOld = listOld.filter((_, i) => i !== idx)
				next[oldKey] = listOld.length ? listOld : []

				let listNew = normalizeList(next[newKey])
				listNew = listNew.filter((entry) => !matchesTimetableEntry(entry as Record<string, unknown>, original))
				listNew.push(updated)
				next[newKey] = listNew
			}

			return next
		})
		setEditOpen(false)
		setEditContext(null)
	}

	function openCreateSchedule() {
		if (!selectedCourseId || !selectedAcademicYearId || !selectedExamId || !selectedCourseYearId) {
			router.push('/admin-examination-management/admin-exam-masters/exam-timetable/create')
			return
		}
		const course = courses.find((c) => c.fk_course_id === selectedCourseId)
		const ay = academicYears.find((a) => pickAyId(a) === Number(selectedAcademicYearId))
		const cyEff = effectiveCourseYears.find((y) => Number(y.courseYearId) === Number(selectedCourseYearId))
		const cyLegacy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
		const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
		const params = new URLSearchParams({
			courseId: String(selectedCourseId),
			academicYearId: String(selectedAcademicYearId),
			examId: String(selectedExamId),
			courseYearId: String(selectedCourseYearId),
			courseName: String(course?.course_code ?? course?.course_name ?? ''),
			academicYear: String(ay?.academic_year ?? ay?.academicYear ?? ''),
			courseYearName: String(cyEff?.courseYearName ?? cyLegacy?.courseYearName ?? cyLegacy?.yearName ?? ''),
			examName: String(exam?.examName ?? ''),
			fromDate: String(exam?.examFromDate ?? exam?.fromDate ?? ''),
			toDate: String(exam?.examToDate ?? exam?.toDate ?? ''),
		})
		router.push(`/admin-examination-management/admin-exam-masters/exam-timetable/create?${params.toString()}`)
	}

	function saveSchedule(e: any) {
		e.preventDefault()
		const key = `${modal.branchId}-${modal.date}-${modal.session}`
		setScheduleMap((prev) => {
			const next = { ...prev } as Record<string, any[]>
			const entry = {
				...modal,
				examTimetableDetId: undefined as unknown,
			}
			const cur = next[key]
			const list = Array.isArray(cur) ? [...cur] : cur ? [cur] : []
			list.push(entry)
			next[key] = list
			return next
		})
		setOpen(false)
	}

	function fmtYMD(date: Date) {
		const y = date.getFullYear()
		const m = String(date.getMonth() + 1).padStart(2, '0')
		const d2 = String(date.getDate()).padStart(2, '0')
		return `${y}-${m}-${d2}`
	}

	function listForSession(branchId: string | number, branchCode: string | undefined, dateStr: string, sess: 'M' | 'A') {
		const k1 = `${branchId}-${dateStr}-${sess}`
		const k2 = branchCode ? `${branchCode}-${dateStr}-${sess}` : ''
		const merged: any[] = []
		const seen = new Set<string>()
		function addFrom(key: string) {
			const raw = scheduleMap[key]
			const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : []
			for (const item of arr) {
				const code = String(item?.subjectCode ?? '')
				const sid = Number(item?.examTimetableDetId ?? item?.fk_exam_timetable_det_id ?? 0)
				const sig = sid > 0 ? `id:${sid}` : `${code}|${String(item?.isRegular ?? true)}`
				if (!seen.has(sig)) {
					seen.add(sig)
					merged.push(item)
				}
			}
		}
		addFrom(k1)
		if (k2 && k2 !== k1) addFrom(k2)
		return merged
	}

	function getCellBadge(branch: any, d: Date) {
		const branchId = branch.fk_dept_id ?? branch.fk_branch_id ?? branch.dept_id ?? branch.branch_id ?? branch.dept_code
		const branchCode = branch.dept_code ?? branch.branch_code
		const dateStr = fmtYMD(d)
		const mList = listForSession(branchId, branchCode, dateStr, 'M')
		const aList = listForSession(branchId, branchCode, dateStr, 'A')

		function renderChip(item: any, sess: 'M' | 'A', index: number, branchRow: any) {
			const cls =
				sess === 'M'
					? 'border-yellow-200 bg-yellow-50 text-yellow-800'
					: 'border-indigo-200 bg-indigo-50 text-indigo-700'
			const badge = sess === 'M' ? 'bg-yellow-600' : 'bg-indigo-600'
			const rs = item?.isRegular === false ? 'S' : 'R'
			return (
				<button
					type="button"
					key={`${sess}-${index}-${item?.examTimetableDetId ?? ''}-${item?.subjectCode ?? ''}-${String(item?.isRegular)}`}
					className={`inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-90 hover:ring-2 hover:ring-sky-400/50 ${cls}`}
					title="Click to edit"
					onClick={() => openEditTimetable(branchRow, dateStr, sess, item as Record<string, unknown>)}
				>
					{item?.subjectCode || '—'}
					<span className={`inline-block shrink-0 rounded px-1 text-[10px] text-white ${badge}`}>{sess}</span>
					<span className="inline-block shrink-0 rounded bg-red-600 px-0.5 text-[9px] font-bold leading-4 text-white">{rs}</span>
				</button>
			)
		}

		if (!mList.length && !aList.length) {
			return (
				<div className="flex min-h-[44px] items-center justify-center px-0.5">
					<span className="text-slate-300 text-[12px] leading-5">—</span>
				</div>
			)
		}

		return (
			<div className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 px-0.5 py-1">
				{mList.map((item, i) => renderChip(item, 'M', i, branch))}
				{aList.map((item, i) => renderChip(item, 'A', i, branch))}
			</div>
		)
	}

	return (
		<FilteredPage
			title="Exam University Timetable"
			filters={
				<GlobalFilterBarRow columns={2}>
					<GlobalFilterField label="Course" icon={GraduationCap}>
						<Select
							value={selectedCourseId != null ? String(selectedCourseId) : null}
							onChange={(v) => handleCourseChange(Number(v), filtersData)}
							options={courses.map((c) => ({
								value: String(c.fk_course_id),
								label: String(c.course_code ?? c.course_name ?? ''),
							}))}
							placeholder={loadingFilters ? 'Loading…' : 'Select Course'}
							disabled={loadingFilters}
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Exam Year" icon={Calendar}>
						<Select
							value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : null}
							onChange={(v) => setSelectedAcademicYearId(Number(v))}
							options={academicYears.map((a) => ({
								value: String(a.fk_academic_year_id),
								label: String(a.academic_year ?? ''),
							}))}
							placeholder="Select Exam Year"
							disabled={academicYears.length === 0}
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Exam Master" icon={ScrollText}>
						<Select
							value={selectedExamId != null ? String(selectedExamId) : null}
							onChange={(v) => {
								setSelectedExamId(Number(v))
								setDates([])
							}}
							options={examMasters.map((e) => ({
								value: String(e.examId ?? e.id),
								label: String(e.examName ?? '—'),
							}))}
							placeholder="Select Exam Master"
							disabled={examMasters.length === 0}
							searchable
						/>
					</GlobalFilterField>
					<GlobalFilterField label="Course Year" icon={GraduationCap}>
						<Select
							value={selectedCourseYearId != null ? String(selectedCourseYearId) : null}
							onChange={(v) => setSelectedCourseYearId(Number(v))}
							options={effectiveCourseYears.map((y) => ({
								value: String(y.courseYearId),
								label: String(y.courseYearName),
							}))}
							placeholder="Select Course Year"
							disabled={effectiveCourseYears.length === 0}
							searchable
						/>
					</GlobalFilterField>
				</GlobalFilterBarRow>
			}
		>
			{selectedCourseYearId != null && titleLine && (
				<div className="app-card">
					<div className="px-4 py-3 border-b border-border bg-card">
						<p className="text-[13px] font-medium text-[hsl(var(--primary))]">{titleLine}</p>
					</div>
					<div className="px-3 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3 text-[12px]">
							<span className="inline-flex items-center gap-1">
								<span className="inline-block rounded bg-yellow-600 text-white h-4 px-1 text-[10px] leading-4">M</span> MORNING
							</span>
							<span className="inline-flex items-center gap-1">
								<span className="inline-block rounded bg-indigo-600 text-white h-4 px-1 text-[10px] leading-4">A</span> AFTERNOON
							</span>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setConflictsOpen(true)}
								disabled={!selectedExamId || !selectedAcademicYearId}
							>
								<ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
								Check Conflicts
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={openCreateSchedule}
							>
								+ Create Schedule
							</Button>
						</div>
					</div>

					{loadingGrid && (
						<div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
							Loading timetable…
						</div>
					)}

					<div className="overflow-auto">
						<table className="w-full border-separate border-spacing-0 border-t border-border">
							<thead>
								<tr>
									<th
										className="sticky left-0 top-0 z-30 w-48 min-w-[12rem] border-b border-r border-primary/20 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-primary"
										style={{
											backgroundImage:
												'linear-gradient(hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.08))',
											backgroundColor: 'hsl(var(--card))',
										}}
									>
										BRANCH
									</th>
									{dates.map((d) => {
										const day = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
										const dayNum = d.toLocaleDateString('en-GB', {
											day: '2-digit',
											month: 'short',
											year: 'numeric',
										}).replace(/(\d+) (\w+) (\d+)/, '$1 $2, $3')
										return (
											<th
												key={d.toISOString()}
												className="sticky top-0 z-20 min-w-[160px] border-b border-r border-primary/20 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-primary"
												style={{
													backgroundImage:
														'linear-gradient(hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.08))',
													backgroundColor: 'hsl(var(--card))',
												}}
											>
												<div>{dayNum}</div>
												<div className="text-[10px] font-medium normal-case tracking-normal text-primary/70">({day})</div>
											</th>
										)
									})}
								</tr>
							</thead>
							<tbody>
								{branches.map((b, i) => {
									const id = b.fk_dept_id ?? b.fk_branch_id ?? b.dept_id ?? b.branch_id
									const name =
										b.dept_code ??
										b.dept_name ??
										b.departmentCode ??
										b.departmentName ??
										b.deptShortName ??
										b.branch_code ??
										b.branch_name ??
										b.branchShortName ??
										b.branchName ??
										`Branch ${i + 1}`
									return (
										<tr key={id ?? `row-${i}`} className="hover:bg-muted/30">
											<td className="sticky left-0 z-10 w-48 min-w-[12rem] border-b border-r border-border bg-card px-3 py-2 text-[12px] font-medium text-blue-700">
												{name}
											</td>
											{dates.map((d) => (
												<td key={`${id}-${d.toISOString()}`} className="border-b border-r border-border px-2 py-2 text-center align-top">
													{getCellBadge(b, d)}
												</td>
											))}
										</tr>
									)
								})}
								{branches.length === 0 && (
									<tr key="no-rows">
										<td className="px-3 py-6 text-center text-[12px] text-muted-foreground" colSpan={Math.max(1, dates.length) + 1}>
											Select filters to view timetable grid
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<CheckConflictsModal
				open={conflictsOpen}
				onClose={() => setConflictsOpen(false)}
				examId={selectedExamId}
				academicYearId={selectedAcademicYearId}
			/>

			<Dialog
				open={editOpen}
				onOpenChange={(v) => {
					setEditOpen(v)
					if (!v) setEditContext(null)
				}}
			>
				<DialogContent className="gap-2 px-6 pb-6 pt-4 sm:max-w-lg">
					<DialogHeader className="space-y-0 p-0">
						<DialogTitle className="flex items-center gap-1.5 text-[15px] font-semibold leading-snug text-[#1565C0]">
							<LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
							Edit Exam University Timetable
						</DialogTitle>
					</DialogHeader>
					<Separator className="-mx-6 shrink-0" />
					{editContext && (
						<form onSubmit={saveEditTimetable} className="space-y-4">
							<div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-[#1565C0]">
								<p>
									<span className="font-semibold">Course details: </span>
									{(() => {
										const cyEff = effectiveCourseYears.find((y) => Number(y.courseYearId) === Number(selectedCourseYearId))
										const cyLegacy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
										const yr = cyEff?.courseYearName ?? cyLegacy?.courseYearName ?? cyLegacy?.yearName ?? ''
										return [editContext.branchLabel, yr, regulationLabel].filter(Boolean).join(' / ')
									})()}
								</p>
								{editExamRangeText ? (
									<p>
										<span className="font-semibold">Exam details: </span>
										{editExamRangeText}
									</p>
								) : null}
								<p>
									<span className="font-semibold">Subject details: </span>
									{(() => {
										const name = String(editContext.original.subjectName ?? '').trim()
										const code = String(editContext.original.subjectCode ?? '')
										return name ? `${name} (${code})` : code || '—'
									})()}
								</p>
							</div>
							<div className="space-y-1">
								<Label>Exam Date</Label>
								<Input
									type="date"
									className="h-9 text-[12px]"
									value={editForm.examDate}
									onChange={(e) => setEditForm((s) => ({ ...s, examDate: e.target.value }))}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label>Exam Session *</Label>
								<ShadcnSelect value={editForm.session} onValueChange={(v) => setEditForm((s) => ({ ...s, session: v as 'M' | 'A' }))}>
									<SelectTrigger className="h-9 text-[12px]">
										<SelectValue placeholder="Select session" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="M">Morning</SelectItem>
										<SelectItem value="A">Afternoon</SelectItem>
									</SelectContent>
								</ShadcnSelect>
							</div>
							<div className="space-y-1">
								<Label>Exam Type *</Label>
								<ShadcnSelect
									value={editForm.examType}
									onValueChange={(v) =>
										setEditForm((s) => ({ ...s, examType: v as 'regular' | 'supplementary' }))
									}
								>
									<SelectTrigger className="h-9 text-[12px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="regular">Regular</SelectItem>
										<SelectItem value="supplementary">Supplementary</SelectItem>
									</SelectContent>
								</ShadcnSelect>
							</div>
							<DialogFooter className="gap-2 sm:gap-0">
								<Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
									Close
								</Button>
								<Button type="submit" className="bg-[#1565C0] hover:bg-[#0D47A1]">
									Save
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">Create Schedule</DialogTitle>
					</DialogHeader>
					<form onSubmit={saveSchedule} className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Branch</Label>
								<ShadcnSelect
									value={
										modal.branchId === '' || modal.branchId === undefined ? undefined : String(modal.branchId)
									}
									onValueChange={(v) => setModal((s) => ({ ...s, branchId: v }))}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Branch" />
									</SelectTrigger>
									<SelectContent>
										{branches.map((b, i) => {
											const id = b.fk_dept_id ?? b.fk_branch_id ?? b.dept_id ?? b.branch_id
											const name = b.dept_code ?? b.dept_name ?? b.branch_code ?? b.branch_name ?? `Branch ${i + 1}`
											return (
												<SelectItem key={id} value={String(id)}>
													{name}
												</SelectItem>
											)
										})}
									</SelectContent>
								</ShadcnSelect>
							</div>
							<div className="space-y-1">
								<Label>Date</Label>
								<ShadcnSelect
									value={modal.date ? modal.date : undefined}
									onValueChange={(v) => setModal((s) => ({ ...s, date: v }))}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Date" />
									</SelectTrigger>
									<SelectContent>
										{dates.map((d) => {
											const val = toDateOnlyISO(d)
											const label = d.toLocaleDateString('en-GB', {
												day: '2-digit',
												month: 'short',
												year: 'numeric',
												weekday: 'short',
											})
											return (
												<SelectItem key={val} value={val}>
													{label}
												</SelectItem>
											)
										})}
									</SelectContent>
								</ShadcnSelect>
							</div>
							<div className="space-y-1">
								<Label>Session</Label>
								<ShadcnSelect value={modal.session} onValueChange={(v) => setModal((s) => ({ ...s, session: v as 'M' | 'A' }))}>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Session" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="M">Morning</SelectItem>
										<SelectItem value="A">Afternoon</SelectItem>
									</SelectContent>
								</ShadcnSelect>
							</div>
							<div className="space-y-1">
								<Label>Subject/Paper Code</Label>
								<Input className="h-8 text-[12px]" value={modal.subjectCode} onChange={(e) => setModal((s) => ({ ...s, subjectCode: e.target.value }))} />
							</div>
							<div className="space-y-1">
								<Label>Room/Block</Label>
								<Input className="h-8 text-[12px]" value={modal.room} onChange={(e) => setModal((s) => ({ ...s, room: e.target.value }))} />
							</div>
							<div className="space-y-1 sm:col-span-2">
								<Label>Remarks</Label>
								<Input className="h-8 text-[12px]" value={modal.remarks} onChange={(e) => setModal((s) => ({ ...s, remarks: e.target.value }))} />
							</div>
							<div className="flex items-center gap-3 sm:col-span-2">
								<label className="flex items-center gap-2 text-[12px]">
									<Checkbox checked={modal.isRegular} onCheckedChange={(v) => setModal((s) => ({ ...s, isRegular: !!v }))} />
									<span>Regular</span>
								</label>
								<label className="flex items-center gap-2 text-[12px]">
									<Checkbox checked={modal.isActive} onCheckedChange={(v) => setModal((s) => ({ ...s, isActive: !!v }))} />
									<span>Active</span>
								</label>
							</div>
						</div>
						<DialogFooter className="pt-2">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								Close
							</Button>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</FilteredPage>
	)
}

