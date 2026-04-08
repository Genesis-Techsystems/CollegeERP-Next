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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { distinct } from '@/lib/utils'
import { buildQuery } from '@/services/crud'
import {
	getCollegeFilters,
	listCourseYears,
	listExamMasters,
	createExamFeeStructure,
} from '@/services/examination'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Filter } from 'lucide-react'

type LateFeeFine = { name: string; startDate: string; endDate: string; regFeeFine?: string; suppleFeeFine?: string }
type AdditionalFee = { name: string; type: 'regular' | 'supple'; amount: string }

export default function CreateRevaluationFeeStructurePage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])
	const [filterOpen, setFilterOpen] = useState(true)

	const [courses, setCourses] = useState<any[]>([])
	const [academicYears, setAcademicYears] = useState<any[]>([])
	const [courseYears, setCourseYears] = useState<any[]>([])
	const [examMasters, setExamMasters] = useState<any[]>([])

	// Params from previous page (if present)
	const [paramCourseId, setParamCourseId] = useState<number | null>(null)
	const [paramYearId, setParamYearId] = useState<number | null>(null)
	const [paramExamId, setParamExamId] = useState<number | null>(null)

	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
	const [selectedExamId, setSelectedExamId] = useState<number | null>(null)

	// Course years
	const [q, setQ] = useState('')
	const [selectedCourseYearIds, setSelectedCourseYearIds] = useState<Set<number>>(new Set())

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
			const { filtersData: f, academicData: ay } = await getCollegeFilters(0, 0)
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
	}, [])

	useEffect(() => {
		// Read params first
		const c = searchParams?.get('courseId')
		const y = searchParams?.get('ayId') || searchParams?.get('academicYearId')
		const e = searchParams?.get('examId')
		setParamCourseId(c ? Number(c) : null)
		setParamYearId(y ? Number(y) : null)
		setParamExamId(e ? Number(e) : null)

		fetchFilters()
	}, [fetchFilters])

	async function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setCourseYears([])
		setSelectedCourseYearIds(new Set())

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)
		if (paramYearId && years.some((a: any) => a.fk_academic_year_id === paramYearId)) {
			setSelectedAcademicYearId(paramYearId)
		} else if (years.length > 0) {
			setSelectedAcademicYearId(years[0].fk_academic_year_id)
		}

		const yrs = await listCourseYears(courseId).catch(() => [])
		setCourseYears(Array.isArray(yrs) ? yrs : [])
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

	function toggleCourseYear(id: number) {
		setSelectedCourseYearIds((s) => {
			const next = new Set(s)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function parseNumberOrNull(v: string): number | null {
		if (v === '' || v == null) return null
		const n = Number(v)
		return Number.isFinite(n) ? n : null
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
		if (!canSave) return
		const payload: Record<string, unknown> = {
			examFeeStructureName: form.examFeeStructureName,
			collectionStartDate: form.collectionStartDate || null,
			collectionEndDate: form.collectionEndDate || null,
			regularFee: parseNumberOrNull(form.regularFee),
			suppleFee: parseNumberOrNull(form.suppleFee),
			isActive: form.isActive,
			// relationships
			examId: selectedExamId,
			examMaster: { examId: selectedExamId },
			// revaluation subject fees
			revaluationSubjectFees: {
				one: parseNumberOrNull(revalSubjectFees.one ?? ''),
				two: parseNumberOrNull(revalSubjectFees.two ?? ''),
				three: parseNumberOrNull(revalSubjectFees.three ?? ''),
				four: parseNumberOrNull(revalSubjectFees.four ?? ''),
				five: parseNumberOrNull(revalSubjectFees.five ?? ''),
			},
			// nested: course years
			examFeeStructureCourseyr: Array.from(selectedCourseYearIds).map((cyId) => ({
				courseId: selectedCourseId ?? undefined,
				courseYearId: cyId,
				isActive: true,
			})),
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
				adtExamfeetypeCatId: undefined,
				type: r.type === 'regular' ? 'Regular' : 'Supple',
				includeInReg: r.type === 'regular',
				fee: parseNumberOrNull(r.amount),
				isActive: true,
			})),
		}
		await createExamFeeStructure(payload)
		router.push('/admin-examination-management/admin-exam-masters/re-valuation-fee-setup')
	}

	return (
		<div className="px-6 pb-6 pt-2 space-y-2">
			

			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--card-title))]">Add Re-Evaluation Fee Structure</h2>
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
				<div className="px-3 py-3 space-y-3">
					{/* Summary strip like reference UI */}
					<div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
							<div className="flex items-center gap-2">
								<span className="text-slate-700 font-semibold min-w-[72px]">Program :</span>
								<div className="flex-1 rounded-md border border-cyan-200 bg-white px-3 py-1.5">
									{(courses.find((c) => c.fk_course_id === selectedCourseId)?.course_code ??
										courses.find((c) => c.fk_course_id === selectedCourseId)?.course_name ??
										'—')}
									{selectedAcademicYearId ? (
										<span className="text-blue-600"> {` / ${academicYears.find((a)=>a.fk_academic_year_id===selectedAcademicYearId)?.academic_year ?? ''}`}</span>
									) : null}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-slate-700 font-semibold min-w-[48px]">Exam :</span>
								<div className="flex-1 rounded-md border border-cyan-200 bg-white px-3 py-1.5">
									<span className="text-blue-600">
										{examMasters.find((e)=> (e.examId ?? e.id) === selectedExamId)?.examName ?? '—'}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Structure name and collection dates inside same card */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-1.5 md:col-span-1">
							<Label>Re-Evaluation Fee Structure <span className="text-red-500">*</span></Label>
							<Input value={form.examFeeStructureName} onChange={(e) => setForm((s) => ({ ...s, examFeeStructureName: e.target.value }))} />
						</div>
						<div className="space-y-1.5">
							<Label>Collection Start Date</Label>
							<Input type="date" value={form.collectionStartDate} onChange={(e) => setForm((s) => ({ ...s, collectionStartDate: e.target.value }))} />
						</div>
						<div className="space-y-1.5">
							<Label>Collection End Date</Label>
							<Input type="date" value={form.collectionEndDate} onChange={(e) => setForm((s) => ({ ...s, collectionEndDate: e.target.value }))} />
						</div>
					</div>
				</div>
				)}
			</div>

			{/* Removed separate card — fields moved to top card */}

			{/* Three-column layout: Course Years | Exam Re-Valuation Fee | Late Fee Fines */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
				{/* Left: Course Years */}
				<div className="lg:col-span-2 app-card p-0 overflow-hidden">
					<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
						<h3 className="text-[14px] font-semibold">Course Years</h3>
					</div>
					<div className="p-3 space-y-3">
						<Input className="h-8 text-[12px]" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
						<div className="max-h-[360px] overflow-auto space-y-1">
							{filteredCourseYears.map((y: any) => {
								const id = y.courseYearId ?? y.id
								if (id == null) return null
								const checked = selectedCourseYearIds.has(Number(id))
								return (
									<label key={id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-[12px]">
										<Checkbox checked={checked} onCheckedChange={() => toggleCourseYear(Number(id))} />
										<span>{y.courseYearName ?? y.yearName ?? `Year ${id}`}</span>
									</label>
								)
							})}
							{filteredCourseYears.length === 0 && <div className="text-[12px] text-muted-foreground px-2">No items</div>}
						</div>
					</div>
				</div>

				{/* Middle: Exam Re-Valuation Fee */}
				<div className="lg:col-span-3 app-card p-0 overflow-hidden">
					<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
						<h3 className="text-[14px] font-semibold">Exam Re-Valuation Fee</h3>
					</div>
					<div className="p-3">
						<div className="space-y-1">
							<div className="text-[13px] font-semibold text-blue-600">Regular Fee</div>
							<div className="grid grid-cols-2 items-center gap-3 max-w-md">
								<Label className="text-[12px] text-slate-600">Fee Amount</Label>
								<Input inputMode="numeric" value={form.regularFee} onChange={(e) => setForm((s) => ({ ...s, regularFee: e.target.value }))} />
							</div>
						</div>

						<div className="mt-4 space-y-2 max-w-xl">
							<div className="text-[13px] font-semibold text-blue-600">Re-Valuation Fee</div>
							<div className="grid grid-cols-2 gap-3 items-center">
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
				<div className="lg:col-span-7 app-card p-4 space-y-3">
						<h3 className="text-[14px] font-semibold">Late Fee Fines</h3>
						<div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
							<div className="md:col-span-2 space-y-1.5">
								<Label>Late Fee Fine Name</Label>
								<Input className="h-8 text-[12px]" value={lateFeeName} onChange={(e) => setLateFeeName(e.target.value)} />
							</div>
							<div className="space-y-1.5">
								<Label>Fine Start Date</Label>
							<input
								type="date"
								className="h-8 text-[12px] w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={lateFeeStart}
								onChange={(e) => setLateFeeStart(e.target.value)}
							/>
							</div>
							<div className="space-y-1.5">
								<Label>Fine End Date</Label>
							<input
								type="date"
								className="h-8 text-[12px] w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={lateFeeEnd}
								onChange={(e) => setLateFeeEnd(e.target.value)}
							/>
							</div>
							<div className="space-y-1.5 md:col-span-1">
								<Label className="invisible">Add</Label>
								<Button type="button" className="w-full h-8 text-[12px]" onClick={saveLateFeeRow}>Add</Button>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1.5">
								<Label>Reg</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={lateFeeReg} onChange={(e) => setLateFeeReg(e.target.value)} />
							</div>
							<div className="space-y-1.5">
								<Label>Supple</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={lateFeeSupple} onChange={(e) => setLateFeeSupple(e.target.value)} />
							</div>
						</div>

						<div className="rounded-md border overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-slate-50">
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
									{lateFeeFines.length === 0 && (
										<tr>
											<td className="px-2 py-2 text-muted-foreground" colSpan={6}>No fines added</td>
										</tr>
									)}
									{lateFeeFines.map((r, i) => (
										<tr key={`${r.name}-${r.startDate}-${i}`} className="border-t">
											<td className="px-2 py-1">{i + 1}</td>
											<td className="px-2 py-1">{r.name}</td>
											<td className="px-2 py-1">{[r.startDate, r.endDate].filter(Boolean).join(' to ') || '—'}</td>
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

			{/* Additional fees applicable (full width) */}
			<div className="app-card p-4 space-y-3">
						<h3 className="text-[14px] font-semibold">List of Additional Fees Applicable</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
							<div className="space-y-1.5">
								<Label>Additional Fees *</Label>
								<Input className="h-8 text-[12px]" value={addFeeName} onChange={(e) => setAddFeeName(e.target.value)} placeholder="Fee name" />
							</div>
							<div className="space-y-1.5">
								<Label>Type</Label>
								<div className="flex items-center gap-6 h-8">
									<label className="inline-flex items-center gap-2 text-[12px]">
										<input type="radio" checked={addFeeType === 'regular'} onChange={() => setAddFeeType('regular')} />
										Regular
									</label>
									<label className="inline-flex items-center gap-2 text-[12px]">
										<input type="radio" checked={addFeeType === 'supple'} onChange={() => setAddFeeType('supple')} />
										Supple
									</label>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label>Amount</Label>
								<Input inputMode="numeric" className="h-8 text-[12px]" value={addFeeAmount} onChange={(e) => setAddFeeAmount(e.target.value)} />
							</div>
							<div className="space-y-1.5 md:col-span-1">
								<Label className="invisible">Add</Label>
								<Button type="button" className="w-full h-8 text-[12px]" onClick={addAdditionalRow}>Add</Button>
							</div>
						</div>

						<div className="rounded-md border overflow-auto">
							<table className="w-full text-[12px]">
								<thead className="bg-slate-50">
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

					<div className="flex items-center justify-end gap-2">
						<Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => router.push('/admin-examination-management/admin-exam-masters/re-valuation-fee-setup')}>Cancel</Button>
						<Button type="button" className="h-8 text-[12px]" onClick={save} disabled={!canSave}>Save</Button>
					</div>
			
		</div>
	)
}

