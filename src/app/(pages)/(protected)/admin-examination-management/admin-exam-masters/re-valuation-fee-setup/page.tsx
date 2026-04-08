'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCard } from '@/common/components/table/TableCard'
import { DataTable } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import { createExamFeeStructure, getCollegeFilters, listCourseYears, listExamFeeStructures, listExamMasters, updateExamFeeStructure } from '@/services/examination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, ChevronDown, Filter } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'

export default function RevaluationFeeSetupPage() {
	const router = useRouter()
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])
	const [filterOpen, setFilterOpen] = useState(true)

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

	// Modal state
	const [modalOpen, setModalOpen] = useState(false)
	const [editing, setEditing] = useState<any | null>(null)
	const [saving, setSaving] = useState(false)
	const [form, setForm] = useState({
		examFeeStructureName: '',
		collectionStartDate: '',
		collectionEndDate: '',
		regularFee: '',
		suppleFee: '',
		isActive: true,
	})

	// Add-page specific state
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [selectedCourseYearIds, setSelectedCourseYearIds] = useState<number[]>([])
	const [revalSubjectFees, setRevalSubjectFees] = useState<{ one?: string; two?: string; three?: string; four?: string; five?: string }>({
		one: '',
		two: '',
		three: '',
		four: '',
		five: '',
	})
	type LateFeeFine = { name: string; startDate: string; endDate: string; regFeeFine?: string; suppleFeeFine?: string }
	const [lateFeeName, setLateFeeName] = useState('')
	const [lateFeeStart, setLateFeeStart] = useState('')
	const [lateFeeEnd, setLateFeeEnd] = useState('')
	const [lateFeeReg, setLateFeeReg] = useState('')
	const [lateFeeSupple, setLateFeeSupple] = useState('')
	const [lateFeeFines, setLateFeeFines] = useState<LateFeeFine[]>([])

	type AdditionalFee = { name: string; type: 'regular' | 'supple'; amount: string }
	const [addFeeName, setAddFeeName] = useState('')
	const [addFeeType, setAddFeeType] = useState<'regular' | 'supple'>('regular')
	const [addFeeAmount, setAddFeeAmount] = useState('')
	const [additionalFees, setAdditionalFees] = useState<AdditionalFee[]>([])

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

			// Also load Course Years for the selected course
			const years = selectedCourseId ? await listCourseYears(selectedCourseId) : []
			setCourseYears(Array.isArray(years) ? years : [])
			setSelectedCourseYearIds([])
			setHasFetched(false)
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	async function handleGetList() {
		if (!selectedExamId) return
		setLoadingList(true)
		try {
			const where: Record<string, unknown> = {
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
		{ field: 'isActive', headerName: 'Status', minWidth: 110, valueGetter: (p) => (p.value ? 'Active' : 'InActive') },
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

	function openAdd() {
		setEditing(null)
		setForm({
			examFeeStructureName: '',
			collectionStartDate: '',
			collectionEndDate: '',
			regularFee: '',
			suppleFee: '',
			isActive: true,
		})
		setSelectedCourseYearIds([])
		setRevalSubjectFees({ one: '', two: '', three: '', four: '', five: '' })
		setLateFeeName(''); setLateFeeStart(''); setLateFeeEnd(''); setLateFeeReg(''); setLateFeeSupple('')
		setLateFeeFines([])
		setAddFeeName(''); setAddFeeType('regular'); setAddFeeAmount('')
		setAdditionalFees([])
		setModalOpen(true)
	}

	function openEdit(row: any) {
		setEditing(row)
		setForm({
			examFeeStructureName: row?.examFeeStructureName ?? '',
			collectionStartDate: String(row?.collectionStartDate ?? ''),
			collectionEndDate: String(row?.collectionEndDate ?? ''),
			regularFee: String(row?.regularFee ?? row?.regFee ?? ''),
			suppleFee: String(row?.suppleFee ?? row?.supplyFee ?? ''),
			isActive: row?.isActive !== undefined ? !!row.isActive : true,
		})
		setModalOpen(true)
	}

	function closeModal() {
		setModalOpen(false)
		setEditing(null)
		setSaving(false)
	}

	async function save(e: any) {
		e.preventDefault()
		if (!selectedExamId) return
		setSaving(true)
		try {
			const payload: Record<string, unknown> = {
				examFeeStructureName: form.examFeeStructureName,
				collectionStartDate: form.collectionStartDate || null,
				collectionEndDate: form.collectionEndDate || null,
				regularFee: form.regularFee === '' ? null : Number(form.regularFee),
				suppleFee: form.suppleFee === '' ? null : Number(form.suppleFee),
				isActive: form.isActive,
				examId: selectedExamId,
				examMaster: { examId: selectedExamId },
			}
			if (selectedCollegeId) {
				payload['collegeId'] = selectedCollegeId
				payload['College'] = { collegeId: selectedCollegeId } as any
			}
			// Extended fields (backend may ignore if not mapped)
			payload['courseYearIds'] = selectedCourseYearIds
			payload['revaluationSubjectFees'] = revalSubjectFees
			payload['lateFeeFines'] = lateFeeFines
			payload['additionalFees'] = additionalFees
			const id = editing?.examFeeStructureId ?? editing?.id
			if (id != null) await updateExamFeeStructure(Number(id), payload)
			else await createExamFeeStructure(payload)

			closeModal()
			await handleGetList()
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="px-6 pb-6 pt-2 space-y-3">
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Re-Evaluation Fee Setup</h2>
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
					<div className="rounded-xl border border-slate-200 bg-white p-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
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

							<div className="space-y-1 lg:col-span-3">
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

							<div className="lg:col-span-1 flex items-end justify-end">
								<Button onClick={handleGetList} disabled={!selectedExamId || loadingList} className="h-8 px-3 text-[12px] w-full lg:w-auto">
									Get List
								</Button>
							</div>
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
							router.push('/admin-examination-management/admin-exam-masters/re-valuation-fee-setup/create')
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

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">
							{editing ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure'}
						</DialogTitle>
					</DialogHeader>
					<form onSubmit={save} className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label>Re-Valuation Fee Structure *</Label>
								<Input
									value={form.examFeeStructureName}
									onChange={(e) => setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label>Regular Fee</Label>
								<Input
									type="number"
									value={form.regularFee}
									onChange={(e) => setForm((s) => ({ ...s, regularFee: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Supple Fee</Label>
								<Input
									type="number"
									value={form.suppleFee}
									onChange={(e) => setForm((s) => ({ ...s, suppleFee: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Collection Start Date</Label>
								<Input
									type="date"
									value={form.collectionStartDate}
									onChange={(e) => setForm((s) => ({ ...s, collectionStartDate: e.target.value }))}
								/>
							</div>
							<div className="space-y-1">
								<Label>Collection End Date</Label>
								<Input
									type="date"
									value={form.collectionEndDate}
									onChange={(e) => setForm((s) => ({ ...s, collectionEndDate: e.target.value }))}
								/>
							</div>
							<div className="flex items-center gap-2 pt-5">
								<Checkbox
									id="rvIsActive"
									checked={form.isActive}
									onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: Boolean(v) }))}
								/>
								<Label htmlFor="rvIsActive">Active</Label>
							</div>
						</div>

						<div className="app-card border rounded-md">
							<div className="px-3 py-2 border-b bg-slate-50/60">
								<h3 className="text-[13px] font-medium">Course Years</h3>
							</div>
							<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto">
								{courseYears.map((cy: any) => {
									const id = cy.courseYearId ?? cy.id ?? cy.yearId
									const label = cy.courseYearName ?? cy.yearName ?? cy.name ?? ''
									const checked = selectedCourseYearIds.includes(id)
									return (
										<label key={id} className="flex items-center gap-2 text-[12px]">
											<input
												type="checkbox"
												checked={checked}
												onChange={(e) => {
													setSelectedCourseYearIds((prev) =>
														e.target.checked ? [...prev, id] : prev.filter((x) => x !== id),
													)
												}}
											/>
											<span>{label}</span>
										</label>
									)
								})}
							</div>
						</div>

						<div className="app-card border rounded-md">
							<div className="px-3 py-2 border-b bg-slate-50/60">
								<h3 className="text-[13px] font-medium">Exam Re-Valuation Fee</h3>
							</div>
							<div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label>1 Subject Fee</Label>
									<Input type="number" value={revalSubjectFees.one} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, one: e.target.value }))} />
								</div>
								<div className="space-y-1">
									<Label>2 Subjects Fee</Label>
									<Input type="number" value={revalSubjectFees.two} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, two: e.target.value }))} />
								</div>
								<div className="space-y-1">
									<Label>3 Subjects Fee</Label>
									<Input type="number" value={revalSubjectFees.three} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, three: e.target.value }))} />
								</div>
								<div className="space-y-1">
									<Label>4 Subjects Fee</Label>
									<Input type="number" value={revalSubjectFees.four} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, four: e.target.value }))} />
								</div>
								<div className="space-y-1">
									<Label>5 Subjects Fee</Label>
									<Input type="number" value={revalSubjectFees.five} onChange={(e) => setRevalSubjectFees((s) => ({ ...s, five: e.target.value }))} />
								</div>
							</div>
						</div>

						<div className="app-card border rounded-md">
							<div className="px-3 py-2 border-b bg-slate-50/60">
								<h3 className="text-[13px] font-medium">Late Fee Fines</h3>
							</div>
							<div className="p-3 space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div className="space-y-1">
										<Label>Late Fee Fine Name</Label>
										<Input value={lateFeeName} onChange={(e) => setLateFeeName(e.target.value)} />
									</div>
									<div className="space-y-1">
										<Label>Reg Fee Fine</Label>
										<Input type="number" value={lateFeeReg} onChange={(e) => setLateFeeReg(e.target.value)} />
									</div>
									<div className="space-y-1">
										<Label>Supple Fee Fine</Label>
										<Input type="number" value={lateFeeSupple} onChange={(e) => setLateFeeSupple(e.target.value)} />
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1">
											<Label>Fine Start Date</Label>
											<Input type="date" value={lateFeeStart} onChange={(e) => setLateFeeStart(e.target.value)} />
										</div>
										<div className="space-y-1">
											<Label>Fine End Date</Label>
											<Input type="date" value={lateFeeEnd} onChange={(e) => setLateFeeEnd(e.target.value)} />
										</div>
									</div>
								</div>
								<div className="flex justify-end">
									<Button
										type="button"
										onClick={() => {
											if (!lateFeeName.trim()) return
											setLateFeeFines((prev) => [...prev, { name: lateFeeName, startDate: lateFeeStart, endDate: lateFeeEnd, regFeeFine: lateFeeReg, suppleFeeFine: lateFeeSupple }])
											setLateFeeName(''); setLateFeeStart(''); setLateFeeEnd(''); setLateFeeReg(''); setLateFeeSupple('')
										}}
									>
										Add
									</Button>
								</div>
								<div className="rounded-md border">
									<table className="w-full text-left text-[12px]">
										<thead className="bg-slate-50">
											<tr>
												<th className="px-2 py-1 w-12">Sl.No</th>
												<th className="px-2 py-1">Fine Name</th>
												<th className="px-2 py-1">Fine Date</th>
												<th className="px-2 py-1">Reg Fee Fine</th>
												<th className="px-2 py-1">Supple Fee Fine</th>
												<th className="px-2 py-1 w-16">Actions</th>
											</tr>
										</thead>
										<tbody>
											{lateFeeFines.map((f, i) => (
												<tr key={i} className="border-t">
													<td className="px-2 py-1">{i + 1}</td>
													<td className="px-2 py-1">{f.name}</td>
													<td className="px-2 py-1">{[f.startDate, f.endDate].filter(Boolean).join(' to ') || '—'}</td>
													<td className="px-2 py-1">{f.regFeeFine || '—'}</td>
													<td className="px-2 py-1">{f.suppleFeeFine || '—'}</td>
													<td className="px-2 py-1">
														<Button type="button" size="sm" variant="ghost" onClick={() => setLateFeeFines((prev) => prev.filter((_, idx) => idx !== i))}>
															Remove
														</Button>
													</td>
												</tr>
											))}
											{lateFeeFines.length === 0 && (
												<tr>
													<td className="px-2 py-3 text-center text-muted-foreground" colSpan={6}>No fines added</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<div className="app-card border rounded-md">
							<div className="px-3 py-2 border-b bg-slate-50/60">
								<h3 className="text-[13px] font-medium">List of Additional Fees Applicable</h3>
							</div>
							<div className="p-3 space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
									<div className="space-y-1">
										<Label>Additional Fees *</Label>
										<Input value={addFeeName} onChange={(e) => setAddFeeName(e.target.value)} placeholder="Fee name" />
									</div>
									<div className="space-y-1">
										<Label>Type</Label>
										<div className="flex items-center gap-5 text-[12px]">
											<label className="flex items-center gap-2">
												<input type="radio" checked={addFeeType === 'regular'} onChange={() => setAddFeeType('regular')} />
												Regular
											</label>
											<label className="flex items-center gap-2">
												<input type="radio" checked={addFeeType === 'supple'} onChange={() => setAddFeeType('supple')} />
												Supple
											</label>
										</div>
									</div>
									<div className="space-y-1">
										<Label>Amount</Label>
										<Input type="number" value={addFeeAmount} onChange={(e) => setAddFeeAmount(e.target.value)} />
									</div>
								</div>
								<div className="flex justify-end">
									<Button
										type="button"
										onClick={() => {
											if (!addFeeName.trim()) return
											setAdditionalFees((prev) => [...prev, { name: addFeeName, type: addFeeType, amount: addFeeAmount }])
											setAddFeeName(''); setAddFeeAmount('')
										}}
									>
										Add
									</Button>
								</div>
								<div className="rounded-md border">
									<table className="w-full text-left text-[12px]">
										<thead className="bg-slate-50">
											<tr>
												<th className="px-2 py-1 w-12">Sl.No</th>
												<th className="px-2 py-1">Type</th>
												<th className="px-2 py-1">Exam Type</th>
												<th className="px-2 py-1">Amount</th>
												<th className="px-2 py-1 w-16">Actions</th>
											</tr>
										</thead>
										<tbody>
											{additionalFees.map((f, i) => (
												<tr key={i} className="border-t">
													<td className="px-2 py-1">{i + 1}</td>
													<td className="px-2 py-1">{f.name}</td>
													<td className="px-2 py-1" style={{ textTransform: 'capitalize' }}>{f.type}</td>
													<td className="px-2 py-1">{f.amount || '—'}</td>
													<td className="px-2 py-1">
														<Button type="button" size="sm" variant="ghost" onClick={() => setAdditionalFees((prev) => prev.filter((_, idx) => idx !== i))}>
															Remove
														</Button>
													</td>
												</tr>
											))}
											{additionalFees.length === 0 && (
												<tr>
													<td className="px-2 py-3 text-center text-muted-foreground" colSpan={5}>No additional fees</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
						<DialogFooter className="pt-3">
							<Button type="button" variant="outline" onClick={closeModal}>
								Cancel
							</Button>
							<Button type="submit" disabled={saving}>
								{editing ? 'Update' : 'Save'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}

