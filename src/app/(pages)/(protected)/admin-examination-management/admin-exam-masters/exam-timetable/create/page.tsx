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
import { useSearchParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import {
	getCollegeFilters,
	listCourseYears,
	listExamMasters,
	getExamSubjectsForSchedule,
	getUnivExamSubjectFilters,
} from '@/services/examination'
import { PageContainer, PageHeader } from '@/components/layout'

type Slot = {
	date: string
	startTime: string
	endTime: string
	subject?: string
	venue?: string
}

export default function CreateExamTimetablePage() {
	const searchParams = useSearchParams()
	// Filters
	const [loadingFilters, setLoadingFilters] = useState(true)
	const [filtersData, setFiltersData] = useState<any[]>([])
	const [academicData, setAcademicData] = useState<any[]>([])

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
	const [subjects, setSubjects] = useState<{ code: string; name?: string }[]>([])
	const [selectedRegulation, setSelectedRegulation] = useState<string | null>(null)
	const [selectedSubjectCode, setSelectedSubjectCode] = useState<string | null>(null)

	// Timetable slots
	const [slotDraft, setSlotDraft] = useState<Slot>({ date: '', startTime: '', endTime: '' })
	const [slots, setSlots] = useState<Slot[]>([])
	// Course groups (UI mirroring)
	const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
	function toggleGroup(code: string) {
		setSelectedGroups((s) => {
			const next = new Set(s)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})
	}

	// Staged rows (table)
	type StagedRow = {
		examDate: string
		session: 'M' | 'A'
		groupCode: string
		subjectCode: string
	}
	const [stagedRows, setStagedRows] = useState<StagedRow[]>([])

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

	async function handleCourseChange(courseId: number, fRef = filtersData, ayRef = academicData) {
		setSelectedCourseId(courseId)
		setSelectedAcademicYearId(null)
		setSelectedExamId(null)
		setExamMasters([])
		setCourseYears([])
		setSelectedCourseYearIds(new Set())
		setSelectedCourseYearId(null)
		setSubjects([])
		setSelectedSubjectCode(null)

		const years = distinct(ayRef ?? [], (a: any) => a.fk_academic_year_id)
		setAcademicYears(years)

		const yrs = await listCourseYears(courseId).catch(() => [])
		const arr = Array.isArray(yrs) ? yrs : []
		setCourseYears(arr)
		if (arr.length > 0) {
			const first = arr[0].courseYearId ?? arr[0].id ?? null
			if (first != null) setSelectedCourseYearId(first)
		}
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
			if (list.length > 0) setSelectedExamId(list[0].examId ?? list[0].id ?? null)
		}
		loadExamMasters()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedCourseId, selectedAcademicYearId])

	useEffect(() => {
		if (!loadingFilters && courses.length > 0) {
			if (paramCourseId && courses.some((c: any) => c.fk_course_id === paramCourseId)) {
				handleCourseChange(paramCourseId, filtersData, academicData)
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadingFilters])

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
			let rows: any[] = []
			// Primary
			rows = await getUnivExamSubjectFilters({
				courseId: selectedCourseId,
				examId: selectedExamId,
				academicYearId: selectedAcademicYearId,
				courseYearId: selectedCourseYearId,
			}).catch(() => [])
			// Fallback
			if (!rows || (Array.isArray(rows) && rows.length === 0)) {
				rows = await getExamSubjectsForSchedule({
					courseId: selectedCourseId,
					examId: selectedExamId,
					academicYearId: selectedAcademicYearId,
					courseYearId: selectedCourseYearId,
				}).catch(() => [])
			}
			const mapped = (rows ?? []).map((r: any) => {
				const code = String(r.subject_code ?? r.subjectCode ?? r.code ?? '')
				const name = String(r.subject_name ?? r.subjectName ?? r.name ?? '')
				return { code, name }
			}).filter((x) => x.code)
			// Deduplicate by code
			const seen = new Set<string>()
			const uniq: { code: string; name?: string }[] = []
			for (const s of mapped) {
				if (!seen.has(s.code)) {
					seen.add(s.code)
					uniq.push(s)
				}
			}
			setSubjects(uniq)
		}
		loadSubjects()
	}, [selectedCourseId, selectedAcademicYearId, selectedExamId, selectedCourseYearId])

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
		if (!slotDraft.date || !session || !selectedSubjectCode || selectedGroups.size === 0) return
		const rows: StagedRow[] = []
		for (const code of Array.from(selectedGroups)) {
			rows.push({
				examDate: slotDraft.date,
				session,
				groupCode: code,
				subjectCode: selectedSubjectCode,
			})
		}
		setStagedRows((s) => [...s, ...rows])
	}

	function removeStagedRow(idx: number) {
		setStagedRows((s) => s.filter((_, i) => i !== idx))
	}

	const canAdd = useMemo(() => {
		const hasDate = !!slotDraft.date
		const hasSession = !!slotDraft.startTime
		const hasSubject = !!selectedSubjectCode
		const hasGroups = selectedGroups.size > 0
		return hasDate && hasSession && hasSubject && hasGroups
	}, [slotDraft.date, slotDraft.startTime, selectedSubjectCode, selectedGroups])

	const summaryLine = useMemo(() => {
		const course = paramCourseName || courses.find((c) => c.fk_course_id === selectedCourseId)?.course_code || courses.find((c) => c.fk_course_id === selectedCourseId)?.course_name || ''
		const ay = paramAcademicYear || academicYears.find((a) => a.fk_academic_year_id === selectedAcademicYearId)?.academic_year || ''
		const cy = searchParams?.get('courseYearName') || courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)?.courseYearName || courseYears.find((y: any) => (y.courseYearId ?? y.id) === selectedCourseYearId)?.yearName || ''
		const ex = paramExamName || examMasters.find((e) => (e.examId ?? e.id) === selectedExamId)?.examName || ''
		return [course, ay, cy, ex].filter(Boolean).join(' / ')
	}, [paramCourseName, courses, selectedCourseId, paramAcademicYear, academicYears, selectedAcademicYearId, searchParams, courseYears, selectedCourseYearId, paramExamName, examMasters, selectedExamId])

	return (
		<PageContainer className="space-y-5">
		<PageHeader title="Create Exam Timetable" subtitle="Schedule exam dates and times" />
			{/* Header card */}
			<div className="app-card overflow-hidden">
				<div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
					<h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Create Exam Timetable</h2>
				</div>

				<div className="px-3 py-3">
					<div className="mb-3 rounded-md border bg-slate-50/50 px-3 py-2 text-[13px] font-medium text-[hsl(var(--primary))]">
						{summaryLine || '—'}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
						<div className="space-y-1 md:col-span-3">
							<Label>Exam Date *</Label>
							<input
								type="date"
								className="h-8 text-[12px] w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
								value={slotDraft.date}
								onChange={(e) => setSlotDraft((s) => ({ ...s, date: e.target.value }))}
							/>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Exam Session *</Label>
							<Select
								value={slotDraft.startTime ? (slotDraft.startTime < '12:00' ? 'M' : 'A') : undefined}
								onValueChange={(v) => {
									// map session to indicative times
									if (v === 'M') setSlotDraft((s) => ({ ...s, startTime: '09:45', endTime: '16:00' }))
									else setSlotDraft((s) => ({ ...s, startTime: '13:00', endTime: '16:00' }))
								}}
							>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Session" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="M">MORNING (09:45AM - 04:00PM)</SelectItem>
									<SelectItem value="A">AFTERNOON (01:00PM - 04:00PM)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Regulation *</Label>
							<Select value={selectedRegulation ?? undefined} onValueChange={(v) => setSelectedRegulation(v)}>
								<SelectTrigger className="h-8 text-[12px]">
									<SelectValue placeholder="Select Regulation" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="R25">R25</SelectItem>
									<SelectItem value="R20">R20</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 md:col-span-3">
							<Label>Subject</Label>
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
				{!!slotDraft.date && !!slotDraft.startTime && !!selectedRegulation && !!selectedSubjectCode && (
				<div className="grid grid-cols-12 gap-3 items-start">
					<div className="col-span-3 rounded-md border overflow-hidden">
						<div className="px-3 py-2 bg-slate-50 border-b text-[12px] font-medium">Select Course Group</div>
						<div className="p-2 space-y-1 max-h-72 overflow-auto">
							{['AIML','CIV','CME','CSD','EEE','IT','MECH'].map((code) => {
								const checked = selectedGroups.has(code)
								return (
									<label key={code} className="flex items-center gap-2 text-[12px]">
										<input type="checkbox" checked={checked} onChange={() => toggleGroup(code)} />
										<span>{code} <span className="text-muted-foreground">(Regular)</span></span>
									</label>
								)
							})}
						</div>
					</div>
					<div className="col-span-2 rounded-md border overflow-hidden flex flex-col">
						<div className="px-3 py-2 bg-slate-50 border-b text-[12px] font-medium">Selected Course Groups</div>
						<div className="p-2 min-h-[12rem] text-[12px] flex-1">
							{Array.from(selectedGroups).length === 0
								? '—'
								: Array.from(selectedGroups).map((g) => (
										<div key={g}><span className="font-medium">{g}</span> <span className="text-muted-foreground">(Regular)</span></div>
								  ))}
						</div>
						<div className="p-2 border-t flex justify-end">
							<Button type="button" variant="outline" className="h-8 text-[12px]" onClick={addSelectedToStage} disabled={!canAdd}>
								Add to Table
							</Button>
						</div>
					</div>
					<div className="col-span-7 rounded-md border">
						<div className="px-3 py-2 bg-slate-50 border-b text-[12px] font-medium">
							{slotDraft.startTime && slotDraft.startTime < '12:00' ? '(9:45 AM - 4:00 PM)' : '(1:00 PM - 4:00 PM)'}
						</div>
						<div className="overflow-auto">
							<table className="w-full min-w-[760px] text-[12px]">
								<thead className="bg-slate-50">
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
						<Button type="button" className="h-8 text-[12px]" onClick={() => alert('Saved (stub)')}>
							Save
						</Button>
					</div>
				)}
			</div>
		</PageContainer>
	)
}

