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
import { getCollegeFilters, getExamFiltersNoTimetable, getExamTimetableDetails, listCourseGroups, listCourseYears, listExamMasters } from '@/services/examination'
import { buildQuery } from '@/services/crud'
import { toDateOnlyISO } from '@/common/generic-functions'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'

export default function ExamTimetablePage() {
	const router = useRouter()
	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])

	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])
	const [filterOpen, setFilterOpen] = useState(true)

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)

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

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const { filtersData: f, academicData: ay } = await getCollegeFilters(0, 0)
			setFiltersData(f ?? [])
			setAcademicData(ay ?? [])
			const distinctCourses = distinct(f ?? [], (r) => r.fk_course_id)
			setCourses(distinctCourses)
			if (distinctCourses.length > 0) {
				const firstCourseId = distinctCourses[0].fk_course_id
				handleCourseChange(firstCourseId, f, ay)
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
		setSelectedCourseYearId(null)
		setBranches([])
		setDates([])

		// Branches are typically departments within the course
		const filtered = (fRef ?? []).filter((r: any) => r.fk_course_id === courseId)
		const distinctBranches = distinct(filtered, (r: any) => r.fk_dept_id ?? r.fk_branch_id ?? r.dept_id ?? r.branch_id)
		setBranches(distinctBranches)

		// Academic years are per-university but acceptable as a global list here
		const distinctYears = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(distinctYears)

		// Load course years for the grid label (I/II/III Year ...)
		const yrs = await listCourseYears(courseId).catch(() => [])
		setCourseYears(Array.isArray(yrs) ? yrs : [])
	}

	useEffect(() => {
		async function loadExamMasters() {
			setExamMasters([])
			setSelectedExamId(null)
			setDates([])
			if (!selectedCourseId || !selectedAcademicYearId) return

			const q = buildQuery({
				'Course.courseId': selectedCourseId,
				'AcademicYear.academicYearId': selectedAcademicYearId,
				isActive: true,
			})
			const exams = await listExamMasters(q).catch(() => [])
			const list = Array.isArray(exams) ? exams : []
			setExamMasters(list)
			if (list.length > 0) setSelectedExamId(list[0].examId ?? list[0].id ?? null)
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	// When exam changes, build date headers
	useEffect(() => {
		async function hydrateFromApi() {
			if (!selectedExamId || !selectedCourseId || !selectedCourseYearId) return
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
					// Use 0 as in the Angular API reference to fetch the complete branch list
					courseYearId: 0,
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
					const map: Record<string, any> = {}
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
						const key = `${bid ?? groupCode}-${dateKey}-${sess}`
						map[key] = {
							branchId: bid ?? groupCode,
							date: dateKey,
							session: sess,
							subjectCode: row.subjectCode ?? row.paperCode ?? row.subCode ?? '',
							room: row.room ?? row.block ?? '',
							remarks: row.remarks ?? '',
							isRegular: row.isRegular ?? true,
							isActive: row.isActive ?? true,
						}
					}
					// Merge with previously found branches, de-dupe by code
					const mergedBranches = distinct(
						[...Array.from(brIdx.values()), ...baseBranches],
						(x: any) => Number(x.dept_id ?? x.courseGroupId ?? 0),
					)
					setBranches(mergedBranches)
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
	}, [selectedExamId, examMasters, selectedCourseId, selectedCourseYearId])

	const titleLine = useMemo(() => {
		const course = courses.find((c) => c.fk_course_id === selectedCourseId)
		const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
		const cy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
		const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
		return [
			course?.course_code ?? course?.course_name,
			ay?.academic_year,
			cy?.courseYearName ?? cy?.yearName,
			exam?.examName,
		].filter(Boolean).join(' / ')
	}, [academicYears, courseYears, courses, examMasters, selectedAcademicYearId, selectedCourseId, selectedCourseYearId, selectedExamId])

	function openCreateSchedule() {
		if (!selectedCourseId || !selectedAcademicYearId || !selectedExamId || !selectedCourseYearId) {
			router.push('/admin-examination-management/admin-exam-masters/exam-timetable/create')
			return
		}
		const course = courses.find((c) => c.fk_course_id === selectedCourseId)
		const ay = academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)
		const cy = courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)
		const exam = examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)
		const params = new URLSearchParams({
			courseId: String(selectedCourseId),
			academicYearId: String(selectedAcademicYearId),
			examId: String(selectedExamId),
			courseYearId: String(selectedCourseYearId),
			courseName: String(course?.course_code ?? course?.course_name ?? ''),
			academicYear: String(ay?.academic_year ?? ''),
			courseYearName: String(cy?.courseYearName ?? cy?.yearName ?? ''),
			examName: String(exam?.examName ?? ''),
			fromDate: String(exam?.examFromDate ?? exam?.fromDate ?? ''),
			toDate: String(exam?.examToDate ?? exam?.toDate ?? ''),
		})
		router.push(`/admin-examination-management/admin-exam-masters/exam-timetable/create?${params.toString()}`)
	}

	function saveSchedule(e: any) {
		e.preventDefault()
		const key = `${modal.branchId}-${modal.date}-${modal.session}`
		setScheduleMap((prev) => ({
			...prev,
			[key]: {
				...modal,
			},
		}))
		setOpen(false)
	}

	function fmtYMD(date: Date) {
		const y = date.getFullYear()
		const m = String(date.getMonth() + 1).padStart(2, '0')
		const d2 = String(date.getDate()).padStart(2, '0')
		return `${y}-${m}-${d2}`
	}

	function getCellBadge(branch: any, d: Date) {
		const branchId = branch.fk_dept_id ?? branch.fk_branch_id ?? branch.dept_id ?? branch.branch_id ?? branch.dept_code
		const branchCode = branch.dept_code ?? branch.branch_code
		const dateStr = fmtYMD(d)
		// Try both ID- and CODE-based keys
		const mKey = `${branchId}-${dateStr}-M`
		const aKey = `${branchId}-${dateStr}-A`
		const mAltKey = branchCode ? `${branchCode}-${dateStr}-M` : ''
		const aAltKey = branchCode ? `${branchCode}-${dateStr}-A` : ''
		const m = scheduleMap[mKey] ?? (mAltKey ? scheduleMap[mAltKey] : undefined)
		const a = scheduleMap[aKey] ?? (aAltKey ? scheduleMap[aAltKey] : undefined)
		return (
			<div className="flex items-center justify-center gap-1">
				{m ? (
					<span className="inline-flex items-center gap-1 rounded-md border-yellow-200 bg-yellow-50 text-yellow-800 h-5 px-2 text-[11px] font-medium">
						{m.subjectCode || '—'} <span className="inline-block rounded bg-yellow-600 text-white h-4 px-1 text-[10px]">M</span>
					</span>
				) : (
					<span className="text-slate-300 text-[12px]">—</span>
				)}
				{a ? (
					<span className="inline-flex items-center gap-1 rounded-md border-indigo-200 bg-indigo-50 text-indigo-700 h-5 px-2 text-[11px] font-medium">
						{a.subjectCode || '—'} <span className="inline-block rounded bg-indigo-600 text-white h-4 px-1 text-[10px]">A</span>
					</span>
				) : (
					<span className="text-slate-300 text-[12px]">—</span>
				)}
			</div>
		)
	}

	return (
		<PageContainer className="space-y-5">
		<PageHeader title="Exam University Timetable" subtitle="Manage university exam timetables" />
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Exam University Timetable</h2>
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
					<div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
						<div className="space-y-1">
							<Label>Course *</Label>
							<Select
								value={selectedCourseId != null ? String(selectedCourseId) : undefined}
								onValueChange={(v) => handleCourseChange(Number(v))}
								disabled={loadingFilters}
							>
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
							<Label>Exam Year *</Label>
							<Select
								value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined}
								onValueChange={(v) => setSelectedAcademicYearId(Number(v))}
								disabled={academicYears.length === 0}
							>
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
							<Label>Exam Master *</Label>
							<Select
								value={selectedExamId != null ? String(selectedExamId) : undefined}
								onValueChange={(v) => { setSelectedExamId(Number(v)); setDates([]) }}
								disabled={examMasters.length === 0}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Exam Master" />
								</SelectTrigger>
								<SelectContent>
									{examMasters.map((e) => (
										<SelectItem key={e.examId ?? e.id} value={String(e.examId ?? e.id)}>
											{e.examName ?? '—'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label>Course Year *</Label>
							<Select
								value={selectedCourseYearId != null ? String(selectedCourseYearId) : undefined}
								onValueChange={(v) => setSelectedCourseYearId(Number(v))}
								disabled={courseYears.length === 0}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Course Year" />
								</SelectTrigger>
								<SelectContent>
									{courseYears.map((y: any) => (
										<SelectItem key={y.courseYearId ?? y.id} value={String(y.courseYearId ?? y.id)}>
											{y.courseYearName ?? y.yearName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				)}
			</div>

			{selectedCourseYearId != null && titleLine && (
				<div className="app-card">
					<div className="px-3 py-2.5 border-b border-slate-200 bg-white">
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
						<Button size="sm" onClick={openCreateSchedule} disabled={!selectedExamId || dates.length === 0 || branches.length === 0}>
							+ Create Schedule
						</Button>
					</div>

					<div className="overflow-auto">
						<table className="w-full border-t border-slate-200">
							<thead className="bg-slate-50">
								<tr>
									<th className="sticky left-0 bg-slate-50 border-r border-slate-200 px-3 py-2 text-left text-[12px] font-semibold w-48">BRANCH</th>
									{dates.map((d) => {
										const day = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
										const dayNum = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
										return (
											<th key={d.toISOString()} className="min-w-[160px] px-3 py-2 text-[12px] font-semibold border-r border-slate-200">
												<div>{dayNum}</div>
												<div className="text-[11px] text-muted-foreground">({day})</div>
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
										<tr key={id ?? `row-${i}`} className="even:bg-white odd:bg-slate-50/40">
											<td className="sticky left-0 bg-white odd:bg-slate-50/40 border-r border-slate-200 px-3 py-2 text-[12px] font-medium w-48 text-blue-700">
												{name}
											</td>
											{dates.map((d) => (
												<td key={`${id}-${d.toISOString()}`} className="border-l border-slate-200 px-2 py-2 text-center align-middle">
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

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">Create Schedule</DialogTitle>
					</DialogHeader>
					<form onSubmit={saveSchedule} className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Branch</Label>
								<Select value={String(modal.branchId)} onValueChange={(v) => setModal((s) => ({ ...s, branchId: v }))}>
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
								</Select>
							</div>
							<div className="space-y-1">
								<Label>Date</Label>
								<Select value={modal.date} onValueChange={(v) => setModal((s) => ({ ...s, date: v }))}>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Date" />
									</SelectTrigger>
									<SelectContent>
										{dates.map((d) => {
											const val = toDateOnlyISO(d)
											const label = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })
											return (
												<SelectItem key={val} value={val}>
													{label}
												</SelectItem>
											)
										})}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label>Session</Label>
								<Select value={modal.session} onValueChange={(v) => setModal((s) => ({ ...s, session: v as 'M' | 'A' }))}>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Session" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="M">Morning</SelectItem>
										<SelectItem value="A">Afternoon</SelectItem>
									</SelectContent>
								</Select>
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
		</PageContainer>
	)
}

