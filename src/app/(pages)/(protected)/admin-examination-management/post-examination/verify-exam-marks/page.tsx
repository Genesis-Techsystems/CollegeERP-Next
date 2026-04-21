'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import { toastError } from '@/lib/toast'
import {
  getSessionUser,
  getVerifyExamMarksColleges,
  getVerifyExamMarksExams,
  getVerifyExamMarksFilters,
  getVerifyExamMarksReport,
  type VerifyExamMarksMode,
} from '@/services'

type AnyRow = Record<string, any>
const COLLEGE_ID_KEYS = ['collegeId', 'fk_college_id', 'college_id', 'id']
const EXAM_ID_KEYS = ['fk_exam_id', 'examId', 'exam_id', 'id']
const COURSE_GROUP_ID_KEYS = ['fk_course_group_id', 'courseGroupId', 'course_group_id', 'id']
const SUBJECT_ID_KEYS = ['fk_subject_id', 'subjectId', 'subject_id', 'id']

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = String(row?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, keys)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function toTitle(key: string): string {
  return key
    .replaceAll('_', ' ')
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replaceAll(/\b\w/g, (ch) => ch.toUpperCase())
}

const MODE_LABEL: Record<VerifyExamMarksMode, string> = {
  internal: 'Internal Marks Status',
  external: 'External Marks Status',
  evaluation: 'External Evaluation Status',
  all: 'Exam Marks Status',
}

export default function VerifyExamMarksPage() {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<VerifyExamMarksMode>('internal')
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([])
  const [examRows, setExamRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [searchText, setSearchText] = useState('')

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(0)
  const [subjectId, setSubjectId] = useState<number | null>(0)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const employeeFromStorage = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
        const organizationFromStorage = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

        let employeeId = employeeFromStorage
        let organizationId = organizationFromStorage

        if (!employeeId || !organizationId) {
          const sessionUser = await getSessionUser().catch(() => null)
          if (!employeeId) {
            employeeId = Number(sessionUser?.employeeId ?? sessionUser?.userId ?? 0)
          }
          if (!organizationId) {
            organizationId = Number(sessionUser?.organizationId ?? 0)
          }
        }

        const [list, collegesData, examsData] = await Promise.all([
          getVerifyExamMarksFilters({ organizationId, employeeId }).catch(() => []),
          getVerifyExamMarksColleges().catch(() => []),
          getVerifyExamMarksExams(employeeId).catch(() => []),
        ])
        setFilters(Array.isArray(list) ? list : [])
        setCollegeRows(Array.isArray(collegesData) ? collegesData : [])
        setExamRows(Array.isArray(examsData) ? examsData : [])
      } catch (error) {
        setFilters([])
        setCollegeRows([])
        setExamRows([])
        toastError(error, 'Failed to load filters')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  const colleges = useMemo(() => {
    const fromDomain = dedupeBy(collegeRows, COLLEGE_ID_KEYS)
    if (fromDomain.length > 0) return fromDomain
    return dedupeBy(filters, COLLEGE_ID_KEYS)
  }, [collegeRows, filters])
  const exams = useMemo(
    () => {
      const fromExamApi = dedupeBy(examRows, EXAM_ID_KEYS).filter(
        (x) => !(x.is_internal_exam || x.isInternalExam),
      )
      if (fromExamApi.length > 0) return fromExamApi
      return dedupeBy(
        filters.filter((x) => numFrom(x, COLLEGE_ID_KEYS) === Number(collegeId)),
        EXAM_ID_KEYS,
      ).filter((x) => !(x.is_internal_exam || x.isInternalExam))
    },
    [examRows, filters, collegeId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, COLLEGE_ID_KEYS) === Number(collegeId) &&
            numFrom(x, EXAM_ID_KEYS) === Number(examId),
        ),
        COURSE_GROUP_ID_KEYS,
      ),
    [filters, collegeId, examId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, COLLEGE_ID_KEYS) === Number(collegeId) &&
            numFrom(x, EXAM_ID_KEYS) === Number(examId) &&
            (courseGroupId
              ? numFrom(x, COURSE_GROUP_ID_KEYS) === Number(courseGroupId)
              : true),
        ),
        SUBJECT_ID_KEYS,
      ),
    [filters, collegeId, examId, courseGroupId],
  )

  useEffect(() => {
    if (!collegeId && colleges[0]) {
      setCollegeId(numFrom(colleges[0], COLLEGE_ID_KEYS))
    }
  }, [colleges, collegeId])

  useEffect(() => {
    if (!examId && exams[0]) {
      setExamId(numFrom(exams[0], EXAM_ID_KEYS))
    }
  }, [exams, examId])

  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(numFrom(x, COLLEGE_ID_KEYS)),
        label:
          strFrom(x, ['collegeCode', 'college_code', 'collegeName', 'college_name', 'name']) ||
          `College ${numFrom(x, COLLEGE_ID_KEYS)}`,
      })),
    [colleges],
  )
  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        value: String(numFrom(x, EXAM_ID_KEYS)),
        label: strFrom(x, ['exam_name', 'examName', 'exam']) || `Exam ${numFrom(x, EXAM_ID_KEYS)}`,
      })),
    [exams],
  )
  const courseGroupOptions = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...courseGroups.map((x) => ({
        value: String(numFrom(x, COURSE_GROUP_ID_KEYS)),
        label:
          strFrom(x, ['group_code', 'groupCode', 'course_group', 'courseGroup']) ||
          `Group ${numFrom(x, COURSE_GROUP_ID_KEYS)}`,
      })),
    ],
    [courseGroups],
  )
  const subjectOptions = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...subjects.map((x) => ({
        value: String(numFrom(x, SUBJECT_ID_KEYS)),
        label:
          strFrom(x, ['subject_name', 'subjectName', 'subject_code', 'subjectCode', 'subject']) ||
          `Subject ${numFrom(x, SUBJECT_ID_KEYS)}`,
      })),
    ],
    [subjects],
  )

  async function onGetList() {
    if (!collegeId || !examId) return
    setLoading(true)
    try {
      const data = await getVerifyExamMarksReport({
        mode,
        examId,
        collegeId,
        courseGroupId: courseGroupId ?? 0,
        subjectId: subjectId ?? 0,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      setRows([])
      toastError(error, 'Failed to fetch verify exam marks')
    } finally {
      setLoading(false)
    }
  }

  function resetFilters() {
    setCourseGroupId(0)
    setSubjectId(0)
    setRows([])
    setSearchText('')
  }

  const visibleRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(q)),
    )
  }, [rows, searchText])

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!visibleRows.length) return []
    const keys = Object.keys(visibleRows[0])
    const ordered = [
      ...keys.filter((k) => ['id', 'college', 'Course_Code', 'Academic_Year', 'Course_Group', 'Course_Year', 'Subject'].includes(k)),
      ...keys.filter((k) => !['id', 'college', 'Course_Code', 'Academic_Year', 'Course_Group', 'Course_Year', 'Subject'].includes(k)),
    ]
    return ordered.map((key) => ({
      field: key,
      headerName: toTitle(key),
      minWidth: key.length > 15 ? 190 : 130,
    }))
  }, [visibleRows])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Verify Exam Marks" subtitle="Post Examination" />

      <div className="app-card p-3 space-y-3">
        <RadioGroup
          value={mode}
          onValueChange={(value) => {
            setMode(value as VerifyExamMarksMode)
            setRows([])
          }}
          className="flex flex-wrap items-center gap-6"
        >
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="internal" id="mode-internal" />
            Internal Marks Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="external" id="mode-external" />
            External Marks Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="evaluation" id="mode-evaluation" />
            External Evaluation Status
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="all" id="mode-all" />
            All
          </label>
        </RadioGroup>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
            />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select
              value={String(courseGroupId ?? 0)}
              onChange={(v) => setCourseGroupId(v ? Number(v) : 0)}
              options={courseGroupOptions}
              placeholder="Course Group"
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Subject</Label>
            <Select
              value={String(subjectId ?? 0)}
              onChange={(v) => setSubjectId(v ? Number(v) : 0)}
              options={subjectOptions}
              placeholder="Subject"
              searchable
            />
          </div>
          <div className="md:col-span-1 flex gap-2">
            <Button className="h-8 text-[12px] flex-1" onClick={() => void onGetList()} disabled={loading}>
              Get List
            </Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <TableCard title={MODE_LABEL[mode]} subtitle="Verify exam marks report">
          <div className="mb-3 flex gap-2">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search"
              className="h-8 text-[12px] max-w-xs"
            />
            <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={resetFilters}>
              Reset
            </Button>
          </div>
          <DataTable rowData={visibleRows} columnDefs={columnDefs} loading={loading} pagination />
        </TableCard>
      )}
    </PageContainer>
  )
}

