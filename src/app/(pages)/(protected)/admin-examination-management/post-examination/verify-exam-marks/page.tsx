'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredListPage } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/common/components/select'
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

/** Angular file names: trafointernalItem/trafoexternalItem/trafoItem/alltrafoItem. */
const REPORT_TITLE: Record<VerifyExamMarksMode, string> = {
  internal: 'Internal Marks Status Report',
  external: 'External Marks Status Report',
  evaluation: 'External Evaluation Status Report',
  all: 'Exam Marks Status Report',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Plain HTML table of the report rows — feeds both Excel export and print. */
function buildReportTableHtml(rows: AnyRow[], keys: string[]): string {
  const head = keys.map((k) => `<th>${escapeHtml(toTitle(k))}</th>`).join('')
  const body = rows
    .map(
      (row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(String(row?.[k] ?? ''))}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * Angular exportAsExcel(): HTML-table workbook via
 * data:application/vnd.ms-excel;base64 download.
 */
function exportTableAsExcel(fileName: string, tableHtml: string, header: string): void {
  const uri = 'data:application/vnd.ms-excel;base64,'
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${header}${tableHtml}</body></html>`
  const link = document.createElement('a')
  link.download = `${fileName}.xls`
  link.href = uri + window.btoa(unescape(encodeURIComponent(template)))
  link.click()
}

/** Angular printPage(): print the report (title + college/exam header + table). */
function printReport(title: string, headerHtml: string, tableHtml: string): void {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page { size: A4 landscape; margin: 12mm; }
body { font: 11px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111827; margin: 0; }
h1 { font-size: 15px; margin: 0 0 4px; }
p { margin: 0 0 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #f1f5f9; font-weight: 600; }
tr { break-inside: avoid; }
</style></head><body>${headerHtml}${tableHtml}</body></html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)
  const fdoc = frame.contentDocument
  const win = frame.contentWindow
  if (!fdoc || !win) {
    frame.remove()
    return
  }
  fdoc.open()
  fdoc.write(html)
  fdoc.close()
  win.addEventListener('afterprint', () => frame.remove())
  setTimeout(() => {
    win.focus()
    win.print()
  }, 50)
}

export default function VerifyExamMarksPage() {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<VerifyExamMarksMode>('internal')
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([])
  const [examRows, setExamRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])

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
  }

  function reportHeaderHtml(): string {
    const college = colleges.find((x) => numFrom(x, COLLEGE_ID_KEYS) === Number(collegeId))
    const collegeName = strFrom(college ?? {}, ['collegeName', 'college_name', 'collegeCode', 'college_code'])
    const exam = exams.find((x) => numFrom(x, EXAM_ID_KEYS) === Number(examId))
    const examName = strFrom(exam ?? {}, ['exam_name', 'examName', 'exam'])
    const sub = [collegeName, examName].filter(Boolean).join(' / ')
    return `<h1>${escapeHtml(MODE_LABEL[mode])}</h1>${sub ? `<p>${escapeHtml(sub)}</p>` : ''}`
  }

  function reportKeys(): string[] {
    return rows.length ? Object.keys(rows[0]) : []
  }

  /** Angular exportAsExcel('internal'|'external'|'evaluation'|'all'). */
  function handleExportExcel() {
    if (!rows.length) return
    exportTableAsExcel(REPORT_TITLE[mode], buildReportTableHtml(rows, reportKeys()), reportHeaderHtml())
  }

  /** Angular printPage(). */
  function handlePrintReport() {
    if (!rows.length) return
    printReport(REPORT_TITLE[mode], reportHeaderHtml(), buildReportTableHtml(rows, reportKeys()))
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!rows.length) return []
    const keys = Object.keys(rows[0])
    const ordered = [
      ...keys.filter((k) => ['id', 'college', 'Course_Code', 'Academic_Year', 'Course_Group', 'Course_Year', 'Subject'].includes(k)),
      ...keys.filter((k) => !['id', 'college', 'Course_Code', 'Academic_Year', 'Course_Group', 'Course_Year', 'Subject'].includes(k)),
    ]
    return ordered.map((key) => ({
      field: key,
      headerName: toTitle(key),
      minWidth: key.length > 15 ? 190 : 130,
    }))
  }, [rows])

  return (
    <FilteredListPage
      title="Verify Exam Marks"
      filters={(
        <div className="space-y-3">
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
      )}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      exportCsv
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        exportPdf: false,
      }}
      toolbarLeading={rows.length > 0 ? (
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">{MODE_LABEL[mode]}</span>
      ) : undefined}
      toolbarTrailing={(
        <>
          <Button type="button" variant="outline" size="sm" className="h-[30px] px-3 text-[12px]" onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-[30px] px-3 text-[12px]" onClick={handlePrintReport}>
            Print Report
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-[30px] px-3 text-[12px]" onClick={resetFilters}>
            Reset
          </Button>
        </>
      )}
    />
  )
}

