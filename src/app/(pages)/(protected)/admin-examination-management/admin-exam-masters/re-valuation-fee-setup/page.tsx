'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCard, DataTable } from '@/common/components/table'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import { getCollegeFilters, listExamFeeStructures, listExamMasters } from '@/services/examination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Pencil, Plus, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'

// ── Pure renderer ─────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
	return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function RevaluationFeeSetupPage() {
	const router = useRouter()
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])
	const [filterOpen] = useState(true)

	const [universities, setUniversities] = useState<any[]>([])
	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])
	const [colleges, setColleges] = useState<any[]>([])

	const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
	const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)

	const [rows, setRows] = useState<any[]>([])
	const [loadingList, setLoadingList] = useState(false)
	const [q, setQ] = useState('')
	const [hasFetched, setHasFetched] = useState(false)

	const fetchFilters = useCallback(async () => {
		setLoadingFilters(true)
		try {
			const { filtersData: filters, academicData: academic } = await getCollegeFilters(0, 0)
			setFiltersData(filters ?? [])
			setAcademicData(academic ?? [])
			const unis = distinct(filters ?? [], (r) => r.fk_university_id)
			setUniversities(unis)
			if (unis.length > 0) {
				handleUniversityChange(unis[0].fk_university_id, filters, academic)
			}
		} finally {
			setLoadingFilters(false)
		}
	}, [])

	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	function handleUniversityChange(universityId: number, filtersRef = filtersData, academicRef = academicData) {
		setSelectedUniversityId(universityId)
		setSelectedCourseId(null)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setSelectedCollegeId(null)
		setRows([])
		setHasFetched(false)

		const filtered = (filtersRef ?? []).filter((r: any) => r.fk_university_id === universityId)
		const distinctCourses = distinct(filtered, (r: any) => r.fk_course_id)
		setCourses(distinctCourses)

		const years = distinct((academicRef ?? []).filter((a: any) => a.fk_university_id === universityId), (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)
		setColleges([])
	}

	useEffect(() => {
		if (!selectedUniversityId || !selectedCourseId) {
			setColleges([])
			setSelectedCollegeId(null)
			return
		}
		const filtered = (filtersData ?? []).filter(
			(r: any) => r.fk_university_id === selectedUniversityId && r.fk_course_id === selectedCourseId,
		)
		const distinctColleges = distinct(filtered, (r: any) => r.fk_college_id)
		setColleges(distinctColleges)
		setSelectedCollegeId(distinctColleges.length > 0 ? distinctColleges[0].fk_college_id : null)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedUniversityId])

	useEffect(() => {
		async function loadExamMasters() {
			setExamMasters([])
			setSelectedExamId(null)
			setRows([])
			if (!selectedCourseId || !selectedAcademicYearId) return

			const query = buildQuery({
				'Course.courseId': selectedCourseId,
				'AcademicYear.academicYearId': selectedAcademicYearId,
				isActive: true,
			})
			const exams = await listExamMasters(query)
			const list = Array.isArray(exams) ? exams : []
			setExamMasters(list)
			if (list.length > 0) setSelectedExamId(list[0].examId ?? list[0].id ?? null)

			setHasFetched(false)
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	async function handleGetList() {
		if (!selectedExamId) return
		setLoadingList(true)
		try {
			const where: Record<string, string | number | boolean> = {
				'ExamMaster.examId': selectedExamId,
				isActive: true,
			}
			if (selectedCollegeId) where['College.collegeId'] = selectedCollegeId
			const query = buildQuery(where)
			const data = await listExamFeeStructures(query)
			setRows(Array.isArray(data) ? data : [])
			setHasFetched(true)
		} finally {
			setLoadingList(false)
		}
	}

	useEffect(() => {
		if (!selectedExamId) return
		void handleGetList()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedExamId, selectedCollegeId])

	const filteredRows = useMemo(() => {
		if (!q.trim()) return rows
		const lower = q.toLowerCase()
		return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(lower))
	}, [q, rows])

	const cols = useMemo<ColDef<any>[]>(() => [
		{ headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
		{ field: 'examFeeStructureName', headerName: 'Re-Valuation Fee Structure', minWidth: 260 },
		{
			headerName: 'Exam Master',
			minWidth: 260,
			valueGetter: (p) => p.data?.examMaster?.examName ?? p.data?.examMasterName ?? p.data?.examName ?? '—',
		},
		{
			headerName: 'Collection Start Date',
			minWidth: 170,
			valueGetter: (p) => {
				const v = p.data?.collectionStartDate ?? p.data?.collectionStartOn ?? p.data?.fromDate
				if (!v) return '—'
				const d = new Date(v)
				return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString()
			},
		},
		{
			headerName: 'Collection End Date',
			minWidth: 170,
			valueGetter: (p) => {
				const v = p.data?.collectionEndDate ?? p.data?.collectionEndOn ?? p.data?.toDate
				if (!v) return '—'
				const d = new Date(v)
				return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString()
			},
		},
		{ headerName: 'Regular Fee', minWidth: 130, valueGetter: (p) => p.data?.regularFee ?? p.data?.regFee ?? '—' },
		{ headerName: 'Supple Fee', minWidth: 130, valueGetter: (p) => p.data?.suppleFee ?? p.data?.supplyFee ?? '—' },
		{ field: 'isActive', headerName: 'Status', minWidth: 110, cellRenderer: statusRenderer },
		{
			headerName: 'Actions',
			minWidth: 110,
			cellRenderer: (p: any) => (
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.preventDefault()
						e.stopPropagation()
						openEdit(p.data)
					}}
					disabled={!selectedExamId}
				>
					<Pencil className="h-4 w-4" />
				</Button>
			),
		},
	], [selectedExamId])

	function openEdit(row: any) {
		const selectedExam = examMasters.find((e: any) => Number(e.examId ?? e.id) === Number(selectedExamId))
		const selectedCourse = courses.find((c: any) => Number(c.fk_course_id) === Number(selectedCourseId))
		const selectedYear = academicYears.find((a: any) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId))
		const id = Number(row?.examFeeStructureId ?? row?.id ?? 0)
		if (!id) return
		const params = new URLSearchParams({
			examFeeStructureId: String(id),
			courseId: String(selectedCourseId ?? ''),
			academicYearId: String(selectedAcademicYearId ?? ''),
			examId: String(selectedExamId ?? ''),
			courseName: String(selectedCourse?.course_name ?? selectedCourse?.course_code ?? ''),
			academicYear: String(selectedYear?.academic_year ?? ''),
			examName: String(selectedExam?.examName ?? ''),
			fromDate: String(selectedExam?.fromDate ?? selectedExam?.examFromDate ?? ''),
			toDate: String(selectedExam?.toDate ?? selectedExam?.examToDate ?? ''),
		})
		router.push(`/admin-examination-management/admin-exam-masters/re-valuation-fee-setup/create?${params.toString()}`)
	}

	return (
		<PageContainer className="space-y-5">
		<PageHeader title="Re-Evaluation Fee Setup" subtitle="Configure re-evaluation fee structures" />
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Re-Evaluation Fee Setup</h2>
					<div className="inline-flex items-center gap-1.5 text-[12px] text-slate-700">
						<span>Filter</span>
						<Filter className="h-3.5 w-3.5" />
					</div>
				</div>
				{filterOpen && (
				<div className="px-3 py-3 bg-white">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-15 gap-3 items-end">
							<div className="space-y-1 lg:col-span-2">
								<Label>University *</Label>
								<Select
									value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
									onValueChange={(v) => handleUniversityChange(Number(v))}
									disabled={loadingFilters}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder={loadingFilters ? 'Loading…' : 'Select University'} />
									</SelectTrigger>
									<SelectContent>
										{universities.map((u) => (
											<SelectItem key={u.fk_university_id} value={String(u.fk_university_id)}>
												{u.university_code ?? u.university_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1 lg:col-span-2">
								<Label>Course *</Label>
								<Select
									value={selectedCourseId != null ? String(selectedCourseId) : undefined}
									onValueChange={(v) => setSelectedCourseId(Number(v))}
									disabled={courses.length === 0}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select Course" />
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

							<div className="space-y-1 lg:col-span-2">
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

							<div className="space-y-1 lg:col-span-6">
								<Label>Exam Master *</Label>
								<Select
									value={selectedExamId != null ? String(selectedExamId) : undefined}
									onValueChange={(v) => { setSelectedExamId(Number(v)); setRows([]); setHasFetched(false) }}
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

							<div className="space-y-1 lg:col-span-3">
								<Label>College</Label>
								<Select
									value={selectedCollegeId != null ? String(selectedCollegeId) : undefined}
									onValueChange={(v) => setSelectedCollegeId(Number(v))}
									disabled={colleges.length === 0}
								>
									<SelectTrigger className="h-8 text-[12px]">
										<SelectValue placeholder="Select College" />
									</SelectTrigger>
									<SelectContent>
										{colleges.map((c) => (
											<SelectItem key={c.fk_college_id} value={String(c.fk_college_id)}>
												{c.college_code ?? c.college_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
				</div>
				)}
			</div>

			{hasFetched && (
			<TableCard
				headerLeft={
					<Input
						className="h-9 max-w-sm text-[12px]"
						placeholder="Search…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						disabled={rows.length === 0}
					/>
				}
				headerRight={
					<Button
						className="h-8 text-[12px]"
						onClick={() => {
							if (!selectedExamId) return
							const selectedExam = examMasters.find((e: any) => Number(e.examId ?? e.id) === Number(selectedExamId))
							const selectedCourse = courses.find((c: any) => Number(c.fk_course_id) === Number(selectedCourseId))
							const selectedYear = academicYears.find((a: any) => Number(a.fk_academic_year_id) === Number(selectedAcademicYearId))
							const params = new URLSearchParams({
								courseId: String(selectedCourseId ?? ''),
								academicYearId: String(selectedAcademicYearId ?? ''),
								examId: String(selectedExamId ?? ''),
								courseName: String(selectedCourse?.course_name ?? selectedCourse?.course_code ?? ''),
								academicYear: String(selectedYear?.academic_year ?? ''),
								examName: String(selectedExam?.examName ?? ''),
								fromDate: String(selectedExam?.fromDate ?? selectedExam?.examFromDate ?? ''),
								toDate: String(selectedExam?.toDate ?? selectedExam?.examToDate ?? ''),
							})
							router.push(`/admin-examination-management/admin-exam-masters/re-valuation-fee-setup/create?${params.toString()}`)
						}}
						disabled={!selectedExamId}
					>
						<Plus className="mr-1.5 h-4 w-4" />
						Add Exam Fee Structure
					</Button>
				}
			>
				<DataTable rowData={filteredRows} columnDefs={cols} loading={loadingList} pagination />
			</TableCard>
			)}
		</PageContainer>
	)
}

