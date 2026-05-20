'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  addUnivEcCollegeDetails,
  getExamCenterByCodeRows,
  updateInActiveUnivEcCollegeDetails,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function makeEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    if (!p.data) return null
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-700" onClick={() => onEdit(p.data)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function ExamCenterCoursesPage() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [groupSubjectRows, setGroupSubjectRows] = useState<Row[]>([])
  const [existsRows, setExistsRows] = useState<Row[]>([])
  const [subjectRows, setSubjectRows] = useState<Row[]>([])

  const [candidateSearch, setCandidateSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  const [showSections, setShowSections] = useState(false)

  const [form, setForm] = useState({
    courseId: '',
    academicYearId: '',
    examId: '',
    univExamcenterId: '',
    univEcCollegeId: '',
    regulationId: '',
    courseGroupId: '',
    courseYearId: '',
  })

  const [selectedSubjects, setSelectedSubjects] = useState<Row[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(form.courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, form.courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            r.is_internal_exam !== true,
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, form.courseId, form.academicYearId],
  )
  const centers = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            num(r.fk_exam_id) === Number(form.examId),
        ),
        (r) => num(r.fk_univ_examcenter_id),
      ),
    [baseRows, form.courseId, form.academicYearId, form.examId],
  )
  const centerColleges = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(form.courseId) &&
            num(r.fk_academic_year_id) === Number(form.academicYearId) &&
            num(r.fk_exam_id) === Number(form.examId) &&
            num(r.fk_univ_examcenter_id) === Number(form.univExamcenterId),
        ),
        (r) => num(r.fk_college_id),
      ),
    [baseRows, form.courseId, form.academicYearId, form.examId, form.univExamcenterId],
  )
  const regulations = useMemo(
    () => dedupeBy(baseRows.filter((r) => num(r.fk_course_id) === Number(form.courseId) && num(r.fk_regulation_id) > 0), (r) => num(r.fk_regulation_id)),
    [baseRows, form.courseId],
  )

  const courseGroups = useMemo(
    () => dedupeBy(groupSubjectRows, (r) => num(r.fk_course_group_id)),
    [groupSubjectRows],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        groupSubjectRows.filter((r) => num(r.fk_course_group_id) === Number(form.courseGroupId)),
        (r) => num(r.fk_course_year_id),
      ),
    [groupSubjectRows, form.courseGroupId],
  )

  const courseOptions: SelectOption[] = useMemo(() => courses.map((c) => ({ value: String(num(c.fk_course_id)), label: txt(c.course_code) })), [courses])
  const ayOptions: SelectOption[] = useMemo(() => academicYears.map((a) => ({ value: String(num(a.fk_academic_year_id)), label: txt(a.academic_year) })), [academicYears])
  const examOptions: SelectOption[] = useMemo(
    () => exams.map((e) => ({ value: String(num(e.fk_exam_id)), label: `${txt(e.exam_name)} (${txt(e.from_date)} - ${txt(e.to_date)})` })),
    [exams],
  )
  const centerOptions: SelectOption[] = useMemo(() => centers.map((c) => ({ value: String(num(c.fk_univ_examcenter_id)), label: txt(c.examcenter_code) })), [centers])
  const collegeOptions: SelectOption[] = useMemo(() => centerColleges.map((c) => ({ value: String(num(c.fk_college_id)), label: txt(c.college_code) })), [centerColleges])
  const regulationOptions: SelectOption[] = useMemo(() => regulations.map((r) => ({ value: String(num(r.fk_regulation_id)), label: txt(r.regulation_code) })), [regulations])

  const filteredSubjectRows = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase()
    if (!q) return subjectRows
    return subjectRows.filter((r) => `${txt(r.subject_code)} ${txt(r.subject_name)}`.toLowerCase().includes(q))
  }, [subjectRows, candidateSearch])
  const filteredCourseYears = useMemo(() => {
    const q = yearSearch.trim().toLowerCase()
    if (!q) return courseYears
    return courseYears.filter((y) => txt(y.course_year_code).toLowerCase().includes(q))
  }, [courseYears, yearSearch])
  const headerText = useMemo(() => {
    const c = courses.find((x) => num(x.fk_course_id) === Number(form.courseId))
    const ay = academicYears.find((x) => num(x.fk_academic_year_id) === Number(form.academicYearId))
    const e = exams.find((x) => num(x.fk_exam_id) === Number(form.examId))
    const ec = centers.find((x) => num(x.fk_univ_examcenter_id) === Number(form.univExamcenterId))
    const clg = centerColleges.find((x) => num(x.fk_college_id) === Number(form.univEcCollegeId))
    const reg = regulations.find((x) => num(x.fk_regulation_id) === Number(form.regulationId))
    return `${txt(c?.course_code)} / ${txt(ay?.academic_year)} / ${txt(e?.exam_name)} / ${txt(ec?.examcenter_code)} / ${txt(clg?.college_code)} / ${txt(reg?.regulation_code)}`
  }, [courses, academicYears, exams, centers, centerColleges, regulations, form])

  const tableColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Course Group', minWidth: 140, valueGetter: (p) => txt(p.data?.group_code) },
      { headerName: 'Course Year', minWidth: 140, valueGetter: (p) => txt(p.data?.course_year_code) },
      { headerName: 'Subject', minWidth: 180, valueGetter: (p) => txt(p.data?.subject_code) },
      { headerName: 'Actions', width: 80, flex: 0, cellRenderer: makeEditRenderer((row) => { setEditRow(row); setEditForm({ isActive: row?.isActive === true, reason: txt(row?.reason) }); setEditOpen(true) }) },
    ],
    [],
  )

  const loadFilters = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const rows = await getExamCenterByCodeRows({ flag: 'exam_center_clg_filters' })
      const examCenterRows = rows.filter((r) => txt(r.flag) === 'exam_center_filters' || txt(r.flag) === '')
      const regulationRows = rows.filter((r) => txt(r.flag) === 'regulations')
      setBaseRows([...examCenterRows, ...regulationRows])
    } catch (e) {
      toastError(e, 'Failed to load filters')
      setBaseRows([])
    } finally {
      setLoadingFilters(false)
    }
  }, [])

  useEffect(() => {
    void loadFilters()
  }, [loadFilters])

  useEffect(() => {
    if (!courseOptions.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: courseOptions[0].value }))
  }, [courseOptions, form.courseId])

  useEffect(() => {
    const v = ayOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, academicYearId: v, examId: '', univExamcenterId: '', univEcCollegeId: '', regulationId: '', courseGroupId: '', courseYearId: '' }))
  }, [form.courseId, ayOptions])

  useEffect(() => {
    const v = examOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, examId: v, univExamcenterId: '', univEcCollegeId: '', courseGroupId: '', courseYearId: '' }))
  }, [form.academicYearId, examOptions])

  useEffect(() => {
    const v = centerOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, univExamcenterId: v, univEcCollegeId: '', courseGroupId: '', courseYearId: '' }))
  }, [form.examId, centerOptions])

  useEffect(() => {
    const college = collegeOptions[0]?.value ?? ''
    const reg = regulationOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, univEcCollegeId: college, regulationId: reg }))
  }, [form.univExamcenterId, collegeOptions, regulationOptions])

  async function onGetList() {
    if (!form.courseId || !form.academicYearId || !form.examId || !form.univExamcenterId || !form.univEcCollegeId || !form.regulationId) {
      toastError('Select all filters.')
      return
    }
    setLoadingList(true)
    try {
      const rows = await getExamCenterByCodeRows({
        flag: 'ec_grp_yr_subjects',
        univExamcenterId: Number(form.univExamcenterId),
        collegeId: Number(form.univEcCollegeId),
        courseId: Number(form.courseId),
        courseGroupId: 0,
        courseYearId: 0,
        examId: Number(form.examId),
        academicYearId: Number(form.academicYearId),
        regulationId: Number(form.regulationId),
      })
      setGroupSubjectRows(rows)
      const exists = rows.filter((r) => num(r.row_exists) !== 0)
      setExistsRows(exists)
      setCourseGroupDefault(rows)
      setShowSections(true)
    } catch (e) {
      toastError(e, 'Failed to get list')
      setShowSections(false)
      setGroupSubjectRows([])
      setExistsRows([])
      setSubjectRows([])
    } finally {
      setLoadingList(false)
    }
  }

  function setCourseGroupDefault(rows: Row[]) {
    const groups = dedupeBy(rows, (r) => num(r.fk_course_group_id))
    const firstGroup = groups[0]
    const groupId = num(firstGroup?.fk_course_group_id)
    if (!groupId) {
      setForm((f) => ({ ...f, courseGroupId: '', courseYearId: '' }))
      setSubjectRows([])
      return
    }
    const years = dedupeBy(rows.filter((r) => num(r.fk_course_group_id) === groupId), (r) => num(r.fk_course_year_id))
    const firstYear = num(years[0]?.fk_course_year_id)
    setForm((f) => ({ ...f, courseGroupId: String(groupId), courseYearId: firstYear ? String(firstYear) : '' }))
    const subjects = dedupeBy(
      rows.filter((r) => num(r.fk_course_group_id) === groupId && num(r.fk_course_year_id) === firstYear),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }))
    setSubjectRows(subjects)
  }

  function onSelectCourseGroup(value: string) {
    const groupId = Number(value)
    const years = dedupeBy(
      groupSubjectRows.filter((r) => num(r.fk_course_group_id) === groupId),
      (r) => num(r.fk_course_year_id),
    )
    const firstYear = num(years[0]?.fk_course_year_id)
    setForm((f) => ({ ...f, courseGroupId: value, courseYearId: firstYear ? String(firstYear) : '' }))
    const subjects = dedupeBy(
      groupSubjectRows.filter((r) => num(r.fk_course_group_id) === groupId && num(r.fk_course_year_id) === firstYear),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }))
    setSubjectRows(subjects)
  }

  function onSelectCourseYear(value: string) {
    const groupId = Number(form.courseGroupId)
    const yearId = Number(value)
    setForm((f) => ({ ...f, courseYearId: value }))
    const subjects = dedupeBy(
      groupSubjectRows.filter((r) => num(r.fk_course_group_id) === groupId && num(r.fk_course_year_id) === yearId),
      (r) => num(r.fk_subject_id),
    ).map((r) => ({ ...r, checked: false }))
    setSubjectRows(subjects)
  }

  function toggleSubject(idx: number, checked: boolean) {
    setSubjectRows((rows) => rows.map((r, i) => (i === idx ? { ...r, checked } : r)))
    const subject = filteredSubjectRows[idx]
    if (!subject || num(subject.row_exists) !== 0) return
    if (checked) {
      setSelectedSubjects((arr) => [
        ...arr,
        {
          univEcCollegeId:
            centerColleges.find((x) => num(x.fk_college_id) === Number(form.univEcCollegeId))?.fk_univ_ec_college_id ??
            0,
          courseGroupId: Number(form.courseGroupId),
          courseYearId: Number(form.courseYearId),
          subjectId: num(subject.fk_subject_id),
        },
      ])
    } else {
      setSelectedSubjects((arr) => arr.filter((s) => num(s.subjectId) !== num(subject.fk_subject_id)))
    }
  }

  async function onAssign() {
    if (!selectedSubjects.length) {
      toastError('Please select subjects.')
      return
    }
    setAssigning(true)
    try {
      await addUnivEcCollegeDetails(selectedSubjects)
      toastSuccess('Subjects assigned.')
      setSelectedSubjects([])
      await onGetList()
    } catch (e) {
      toastError(e, 'Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  async function onSaveEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editRow) return
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    try {
      await updateInActiveUnivEcCollegeDetails({
        ...editRow,
        isActive: editForm.isActive,
        reason: editForm.isActive ? '' : editForm.reason.trim(),
      })
      toastSuccess('Updated.')
      setEditOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Update failed')
    }
  }

  const courseGroupOptions: SelectOption[] = useMemo(
    () => courseGroups.map((g) => ({ value: String(num(g.fk_course_group_id)), label: txt(g.group_code) })),
    [courseGroups],
  )
  const courseYearOptions: SelectOption[] = useMemo(
    () => courseYears.map((y) => ({ value: String(num(y.fk_course_year_id)), label: txt(y.course_year_code) })),
    [courseYears],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam center courses" subtitle="Exam papers delivery process · Exam center courses/groups/years/subjects" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="app-card-title">
              Exam Center Courses/Groups/Years/Subjects
            </h2>
          </div>
          <button type="button" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="space-y-1 md:col-span-2"><Label>Program</Label><Select options={courseOptions} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={loadingFilters} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Academic Year</Label><Select options={ayOptions} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))} /></div>
            <div className="space-y-1 md:col-span-3"><Label>Exam</Label><Select options={examOptions} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Center</Label><Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Center Colleges</Label><Select options={collegeOptions} value={form.univEcCollegeId} onChange={(v) => setForm((f) => ({ ...f, univEcCollegeId: v }))} /></div>
            <div className="space-y-1 md:col-span-1"><Label>Regulation</Label><Select options={regulationOptions} value={form.regulationId} onChange={(v) => setForm((f) => ({ ...f, regulationId: v }))} /></div>
            <div className="md:col-span-12 flex justify-end"><Button type="button" onClick={() => void onGetList()} disabled={loadingList}>Get List</Button></div>
          </div>
        )}
      </div>

      {showSections && (
        <>
          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border"><h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Exam Center Colleges - {headerText}</h3></div>
          <div className="app-card p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-3 border rounded-md p-2">
                <SearchInput value={candidateSearch} onChange={setCandidateSearch} placeholder="Search…" className="w-full max-w-sm mb-2" />
                <Label className="text-[12px]">Course Group</Label>
                <Select options={courseGroupOptions} value={form.courseGroupId} onChange={onSelectCourseGroup} />
              </div>
              <div className="md:col-span-3 border rounded-md p-2">
                <SearchInput value={yearSearch} onChange={setYearSearch} placeholder="Search…" className="w-full max-w-sm mb-2" />
                <Label className="text-[12px]">Course Year</Label>
                <Select
                  options={filteredCourseYears.map((y) => ({ value: String(num(y.fk_course_year_id)), label: txt(y.course_year_code) }))}
                  value={form.courseYearId}
                  onChange={onSelectCourseYear}
                />
              </div>
              <div className="md:col-span-5 border rounded-md p-2">
                <SearchInput value={candidateSearch} onChange={setCandidateSearch} placeholder="Search…" className="w-full max-w-sm mb-2" />
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead><tr className="border-b"><th className="text-left py-1 w-[56px]">Select</th><th className="text-left py-1">Subject</th></tr></thead>
                    <tbody>
                      {filteredSubjectRows.map((s, idx) => {
                        const exists = num(s.row_exists) !== 0
                        return (
                          <tr key={`${num(s.fk_subject_id)}-${idx}`} className={`border-b ${exists ? 'bg-amber-50' : ''}`}>
                            <td className="py-1"><Checkbox checked={Boolean((s as AnyRow).checked)} disabled={exists} onCheckedChange={(v) => toggleSubject(idx, v === true)} /></td>
                            <td className="py-1">{txt(s.subject_code)} - {txt(s.subject_name)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:col-span-1 flex items-end justify-center pb-1">
                <Button size="sm" onClick={() => void onAssign()} disabled={assigning}>Assign</Button>
              </div>
            </div>
          </div>

          <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-border"><h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">Exam Center Colleges - {headerText}</h3></div>
          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={existsRows}
                columnDefs={tableColumnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Center Courses',
                }}
              />
            </div>
          </div>
        </>
      )}

      <FormModal open={editOpen} onClose={() => setEditOpen(false)} title="Update Subject" onSubmit={onSaveEdit} size="lg">
        <div className="space-y-2">
          <div className="text-sm"><span className="text-muted-foreground">Subject:</span> <span className="text-blue-700">{txt(editRow?.subject_code)} - {txt(editRow?.subject_name)}</span></div>
          <ActiveStatusField isActive={editForm.isActive} reason={editForm.reason} onActiveChange={(v) => setEditForm((f) => ({ ...f, isActive: v === true }))} onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))} />
        </div>
      </FormModal>
    </PageContainer>
  )
}

