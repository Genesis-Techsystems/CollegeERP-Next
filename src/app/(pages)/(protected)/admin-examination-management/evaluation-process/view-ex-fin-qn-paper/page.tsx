'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import { toDateStr, toDateOnlyISO } from '@/common/generic-functions'
import {
  getFinalizeQuestionPaperFilters,
  getQuestionPaperPublishDetails,
  listViewFinalQuestionPapers,
  publishQuestionPaperColleges,
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
const isPublishedValue = (row: AnyRow | null | undefined) => {
  const raw = row?.is_published ?? row?.isPublished ?? row?.ispublished
  if (raw === true || raw === 1) return true
  const text = String(raw ?? '').trim().toLowerCase()
  return text === 'true' || text === '1' || text === 'yes'
}

function subjectNameRenderer(p: { data?: AnyRow }) {
  return (
    <span>
      {pickText(p.data, ['subject_name', 'subjectName'])}{' '}
      <span className="text-blue-700">({pickText(p.data, ['subject_code', 'subjectCode'])})</span>
    </span>
  )
}

function makeQuestionPaperPathRenderer(minio: string) {
  return (p: { data?: AnyRow }) => {
    const path = pickText(p.data, ['questionpaper_path', 'questionPaperPath'])
    if (!path) return <span>-</span>
    return (
      <button type="button" className="text-[12px] text-blue-700 hover:underline" onClick={() => window.open(`${minio}${path}`, '_blank')}>
        View
      </button>
    )
  }
}

function makeActionsRenderer(
  loading: boolean,
  onSecurePublish: (row: AnyRow) => Promise<void>,
  openPublishModal: (row: AnyRow) => void,
) {
  return (p: { data?: AnyRow }) =>
    isPublishedValue(p.data) ? (
      <Button size="sm" variant="outline" className="h-7" disabled={loading} onClick={() => void onSecurePublish(p.data ?? {})}>
        Secure Publish
      </Button>
    ) : (
      <Button size="sm" className="h-7" disabled={loading} onClick={() => openPublishModal(p.data ?? {})}>
        Publish
      </Button>
    )
}

export default function ViewFinalExamQuestionPaperPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const minio = String(globalThis?.localStorage?.getItem('MINIO') ?? '')
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishRow, setPublishRow] = useState<AnyRow | null>(null)
  const [publishDate, setPublishDate] = useState('')
  const [publishTime, setPublishTime] = useState('')

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
    if (!courseId || !examId) {
      toastError('Please select Course and Exam.')
      return
    }
    setLoading(true)
    try {
      const list = await listViewFinalQuestionPapers({
        employeeId,
        courseId,
        examId,
        academicYearId: academicYearId ?? undefined,
      }).catch(() => [])
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function publishNow(row: AnyRow) {
    const qId = pickNum(row, ['pk_exam_questionpaper_id', 'questionPaperId', 'examQuestionPaperId'])
    const subjectId = pickNum(row, ['fk_subject_id', 'subjectId'])
    const ids = String(row?.fk_exam_timetable_ids ?? row?.fk_exam_timetable_id ?? row?.exam_timetable_id ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0)

    if (qId <= 0 || ids.length === 0) {
      toastError('Unable to publish: missing timetable linkage.')
      return
    }
    setLoading(true)
    try {
      const publishedDateTime = publishDate && publishTime
        ? new Date(`${publishDate}T${publishTime}`)
        : new Date()
      const payload = ids.map((id) => ({
        examQuestionPaperId: qId,
        subjectId,
        isPublished: true,
        publishedDate: publishedDateTime.toISOString(),
        questionPaperPath: pickText(row, ['questionpaper_path', 'questionPaperPath']),
        isActive: row?.is_active ?? true,
        examTimeTableId: id,
        publishedByEmpId: employeeId,
        downloadedByEmpId: employeeId,
      }))
      await publishQuestionPaperColleges(payload)
      toastSuccess('Question paper published successfully.')
      setPublishModalOpen(false)
      setPublishRow(null)
      await getList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to publish question paper.')
    } finally {
      setLoading(false)
    }
  }

  function openPublishModal(row: AnyRow) {
    const dateVal = toDateStr(row?.published_date ?? row?.publishedDate)
    const timeVal = String(row?.published_time ?? row?.publishedTime ?? '').slice(0, 8)
    const now = new Date()
    const fallbackDate = toDateOnlyISO(now)
    const fallbackTime = now.toTimeString().slice(0, 8)
    setPublishRow(row)
    setPublishDate(dateVal || fallbackDate)
    setPublishTime(timeVal || fallbackTime)
    setPublishModalOpen(true)
  }

  async function onSecurePublish(row: AnyRow) {
    const qId = pickNum(row, ['pk_exam_questionpaper_id', 'questionPaperId', 'examQuestionPaperId'])
    if (qId <= 0) return
    setLoading(true)
    try {
      const details = await getQuestionPaperPublishDetails(qId)
      toastSuccess(`Published entries: ${details.publishedList.length}`)
    } catch (error: any) {
      toastError(error?.message ?? 'Unable to fetch published details.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, minWidth: 70, maxWidth: 80, flex: 0 },
      {
        headerName: 'Subject Name',
        minWidth: 240,
        flex: 2,
        cellRenderer: subjectNameRenderer,
      },
      { field: 'questionPaper', headerName: 'Question Paper', minWidth: 200, flex: 2, valueGetter: (p) => p.data?.questionpaper_title ?? p.data?.questionPaper ?? '-' },
      { field: 'publishedDate', headerName: 'Published Date', minWidth: 120, maxWidth: 130, flex: 1, valueGetter: (p) => toDateStr(p.data?.published_date ?? p.data?.publishedDate ?? p.data?.published_datetime) || '-' },
      { field: 'publishedTime', headerName: 'Published Time', minWidth: 110, maxWidth: 120, flex: 1, valueGetter: (p) => String(p.data?.published_time ?? p.data?.publishedTime ?? p.data?.published_datetime ?? '').slice(11, 19) || '-' },
      {
        field: 'questionPaperPath',
        headerName: 'QuestionPaper Path',
        minWidth: 130,
        maxWidth: 150,
        flex: 1,
        cellRenderer: makeQuestionPaperPathRenderer(minio),
      },
      {
        headerName: 'Actions',
        minWidth: 120,
        maxWidth: 140,
        flex: 1,
        cellRenderer: makeActionsRenderer(loading, onSecurePublish, openPublishModal),
      },
    ],
    [loading, minio],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Publish Exam Question Paper" subtitle="View and publish finalized question papers" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Publish Exam Question Paper</h2>
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
                <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={`c-${pickNum(c, ['fk_course_id', 'courseId'])}`} value={String(pickNum(c, ['fk_course_id', 'courseId']))}>
                        {pickText(c, ['course_code', 'courseCode'])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
                <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((a) => (
                      <SelectItem key={`ay-${pickNum(a, ['fk_academic_year_id', 'academicYearId'])}`} value={String(pickNum(a, ['fk_academic_year_id', 'academicYearId']))}>
                        {pickText(a, ['academic_year', 'academicYear'])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-5">
                <Label className="text-[12px] text-muted-foreground">Exam</Label>
                <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={`e-${pickNum(e, ['fk_exam_id', 'examId'])}`} value={String(pickNum(e, ['fk_exam_id', 'examId']))}>
                        {pickText(e, ['exam_name', 'examName'])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="w-full max-w-sm">
              <SearchInput
                className="w-full"
                placeholder="Search"
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>
          <div className="p-4">
            <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} />
          </div>
        </div>
      )}

      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">Publish Question Paper On</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <Input value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="h-9 text-[12px]" />
            <Input value={publishTime} onChange={(e) => setPublishTime(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <DialogFooter>
            <Button onClick={() => publishRow && void publishNow(publishRow)} disabled={loading}>Ok</Button>
            <Button variant="outline" onClick={() => setPublishModalOpen(false)} disabled={loading}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
