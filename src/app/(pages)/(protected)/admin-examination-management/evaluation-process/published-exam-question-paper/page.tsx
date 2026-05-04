'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, type SelectOption } from '@/common/components/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  generateSecretCodeForPublishedQp,
  getFinalizeQuestionPaperFilters,
  listPublishedExamQuestionPapers,
  validateSecretCodeForPublishedQp,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function subjectNameRenderer(p: { data?: AnyRow }) {
  return (
    <span>
      {pickText(p.data, ['subject_name', 'subjectName'])}{' '}
      <span className="text-blue-700">({pickText(p.data, ['subjectcode', 'subject_code', 'subjectCode'])})</span>
    </span>
  )
}

function makeActionsRenderer(
  minio: string,
  loading: boolean,
  onGeneratePassCode: (row: AnyRow) => Promise<void>,
  onEnterPassCode: (row: AnyRow) => void,
) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {}
    const hasPath = Boolean(pickText(row, ['questionpaper_path']))
    const validSecret = String(row?.isvalidsecretcode ?? '0') === '1'
    return (
      <div className="flex items-center gap-2">
        {hasPath && (
          <button
            type="button"
            className="text-[12px] text-blue-700 hover:underline"
            onClick={() => window.open(`${minio}${pickText(row, ['questionpaper_path'])}`, '_blank')}
          >
            View
          </button>
        )}
        {!validSecret && (
          <Button size="sm" className="h-7 px-2.5 text-[12px]" disabled={loading} onClick={() => void onGeneratePassCode(row)}>
            Get PassCode
          </Button>
        )}
        {validSecret && !hasPath && (
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[12px]" disabled={loading} onClick={() => onEnterPassCode(row)}>
            Enter PassCode
          </Button>
        )}
      </div>
    )
  }
}

export default function PublishedExamQuestionPaperPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [passcodeOpen, setPasscodeOpen] = useState(false)
  const [passcodeValue, setPasscodeValue] = useState('')
  const [passcodeRow, setPasscodeRow] = useState<AnyRow | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const minio = String(globalThis?.localStorage?.getItem('MINIO') ?? '')

  const courses = useMemo(() => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [baseRows, courseId, academicYearId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getFinalizeQuestionPaperFilters(employeeId).catch(() => [])
        const r = Array.isArray(list) ? list : []
        setBaseRows(r)
        if (r[0]) setCourseId(pickNum(r[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])
  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId])

  async function getList() {
    if (!examId) {
      toastError('Please select Exam.')
      return
    }
    setLoading(true)
    try {
      const list = await listPublishedExamQuestionPapers({
        employeeId,
        examId,
        orgId,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function onGeneratePassCode(row: AnyRow) {
    setLoading(true)
    try {
      await generateSecretCodeForPublishedQp({
        examQuestionPaperCollegeId: pickNum(row, ['pk_examquestionpaper_college_id']),
        empId: pickNum(row, ['fk_publishedby_emp_id']) || employeeId,
        examName: pickText(row, ['exam_name', 'examName']),
        subjectName: pickText(row, ['subject_name', 'subjectName']),
        subjectCode: pickText(row, ['subjectcode', 'subject_code', 'subjectCode']),
        examDate: pickText(row, ['exam_date', 'examDate']),
      })
      toastSuccess('PassCode generated successfully.')
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to generate PassCode.')
    } finally {
      setLoading(false)
    }
  }

  function onEnterPassCode(row: AnyRow) {
    setPasscodeRow(row)
    setPasscodeValue('')
    setPasscodeOpen(true)
  }

  async function onValidatePassCode() {
    if (!passcodeRow || !passcodeValue.trim()) {
      toastError('Enter passcode.')
      return
    }
    setLoading(true)
    try {
      const result = await validateSecretCodeForPublishedQp({
        code: btoa(passcodeValue.trim()),
        examQuestionPaperCollegeId: pickNum(passcodeRow, ['pk_examquestionpaper_college_id']),
        empId: pickNum(passcodeRow, ['fk_publishedby_emp_id']) || employeeId,
      })
      const returnedPath = typeof result === 'string' ? result : String(result ?? '')
      if (returnedPath && returnedPath !== 'Secret Code is Expired') {
        setRows((prev) =>
          prev.map((r) =>
            pickNum(r, ['pk_examquestionpaper_college_id']) === pickNum(passcodeRow, ['pk_examquestionpaper_college_id'])
              ? { ...r, questionpaper_path: returnedPath }
              : r,
          ),
        )
        toastSuccess('PassCode validated successfully.')
      } else {
        toastError(returnedPath || 'Secret Code is expired.')
      }
      setPasscodeOpen(false)
      setPasscodeRow(null)
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to validate PassCode.')
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 68, minWidth: 68, maxWidth: 74, flex: 0 },
      { field: 'coursegroupcodes', headerName: 'Course Group', minWidth: 110, maxWidth: 130, flex: 1, valueGetter: (p) => p.data?.group_code ?? p.data?.coursegroupcodes ?? '-' },
      { field: 'courseyearcode', headerName: 'Course Year', minWidth: 108, maxWidth: 126, flex: 1, valueGetter: (p) => p.data?.course_year_code ?? p.data?.courseyearcode ?? '-' },
      {
        headerName: 'Subject Name',
        minWidth: 260,
        flex: 2.4,
        cellRenderer: subjectNameRenderer,
      },
      { field: 'questionPaper', headerName: 'Question Paper', minWidth: 230, flex: 2.2, valueGetter: (p) => p.data?.questionpaper_title ?? '-' },
      {
        headerName: 'Actions',
        minWidth: 230,
        maxWidth: 270,
        flex: 1.7,
        cellRenderer: makeActionsRenderer(minio, loading, onGeneratePassCode, onEnterPassCode),
      },
    ],
    [loading, minio],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Published Exam Question Paper" subtitle="View published question papers" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Published Exam Question Paper</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode']) } as SelectOption))}
                  placeholder="Course"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) } as SelectOption))}
                  placeholder="Academic Year"
                />
              </div>
              <div className="md:col-span-5">
                <Label className="text-[12px] text-muted-foreground">Exam</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) } as SelectOption))}
                  placeholder="Exam"
                />
              </div>
              <div className="md:col-span-1">
                <Button className="h-8 px-3 text-[12px] w-full" onClick={getList} disabled={loading}>
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden p-4">
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            loading={loading}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search by subject, paper, course group…',
              pdfDocumentTitle: 'Published Exam Question Paper',
            }}
          />
        </div>
      )}

      <Dialog open={passcodeOpen} onOpenChange={setPasscodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">Enter PassCode</DialogTitle>
          </DialogHeader>
          <Input
            value={passcodeValue}
            onChange={(e) => setPasscodeValue(e.target.value)}
            placeholder="Enter passcode"
            className="h-9 text-[12px]"
          />
          <DialogFooter>
            <Button onClick={() => void onValidatePassCode()} disabled={loading}>Ok</Button>
            <Button variant="outline" onClick={() => setPasscodeOpen(false)} disabled={loading}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

