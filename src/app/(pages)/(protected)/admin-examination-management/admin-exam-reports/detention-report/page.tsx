'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getAdmissionUnivFilters,
  getBatchWiseDetentionReport,
  getFeeMasterCollegeFilters,
  listBatchesByCourse,
} from '@/services'
import {
  filterBatches,
  filterColleges,
  filterCourses,
  pickNum,
  pickText,
  type FilterRow,
} from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'
import { toastError, toastInfo } from '@/lib/toast'
import {
  Building2,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { printDetentionReport } from '../_components/printDetentionReport'

type AnyRow = Record<string, any>

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`
  const link = document.createElement('a')
  link.download = filename
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`
  link.click()
}

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[]
}

export default function DetentionReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filtersData, setFiltersData] = useState<FilterRow[]>([])
  const [batchesFilter, setBatchesFilter] = useState<FilterRow[]>([])
  const [domainBatches, setDomainBatches] = useState<FilterRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<number | null>(null)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [searchText, setSearchText] = useState('')

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData])
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId),
    [filtersData, collegeId],
  )

  /** Prefer proc batches; fall back to domain Batch list for the selected course. */
  const batches = useMemo(() => {
    const fromProc = filterBatches(batchesFilter, courseId)
    if (fromProc.length > 0) return fromProc
    return filterBatches(domainBatches, courseId)
  }, [batchesFilter, domainBatches, courseId])

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const ht = pickText(r, ['hallticket_number', 'hall_ticketno']).toLowerCase()
      const name = pickText(r, ['student_name', 'studentName']).toLowerCase()
      const group = pickText(r, ['group_code', 'groupCode']).toLowerCase()
      const batch = pickText(r, ['batch_name', 'batchName']).toLowerCase()
      return ht.includes(q) || name.includes(q) || group.includes(q) || batch.includes(q)
    })
  }, [rows, searchText])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const collegeFilters = await getFeeMasterCollegeFilters(orgId, employeeId)
        if (cancelled) return

        let nextBatches = toFilterRows(collegeFilters.batchesData ?? [])
        // College-wise proc sometimes omits the batches group; univ-wise usually has it.
        if (nextBatches.length === 0) {
          const univFilters = await getAdmissionUnivFilters(orgId, employeeId).catch(() => null)
          nextBatches = toFilterRows(univFilters?.batchesData ?? [])
        }

        setFiltersData(toFilterRows(collegeFilters.filtersData ?? []))
        setBatchesFilter(nextBatches)

        const nextColleges = filterColleges(toFilterRows(collegeFilters.filtersData ?? []))
        setSkipAutoSelect(false)
        setCollegeId(nextColleges[0] ? pickNum(nextColleges[0], ['fk_college_id', 'collegeId']) : null)
      } catch {
        if (!cancelled) toastError('Failed to load filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [orgId, employeeId])

  useEffect(() => {
    if (!collegeId) {
      setCourseId(null)
      return
    }
    if (skipAutoSelect) return
    const list = filterCourses(filtersData, collegeId)
    setCourseId(list[0] ? pickNum(list[0], ['fk_course_id', 'courseId']) : null)
  }, [collegeId, filtersData, skipAutoSelect])

  // Domain Batch fallback when proc has no batches for the selected course.
  useEffect(() => {
    let cancelled = false
    async function loadDomainBatches() {
      if (!courseId) {
        setDomainBatches([])
        return
      }
      const fromProc = filterBatches(batchesFilter, courseId)
      if (fromProc.length > 0) {
        setDomainBatches([])
        return
      }
      try {
        const list = await listBatchesByCourse(courseId)
        if (cancelled) return
        setDomainBatches(
          toFilterRows(
            list.map((b) => ({
              fk_batch_id: b.batchId,
              batchId: b.batchId,
              batch_name: b.batchName,
              batchName: b.batchName,
              fk_course_id: courseId,
              courseId,
            })),
          ),
        )
      } catch {
        if (!cancelled) setDomainBatches([])
      }
    }
    void loadDomainBatches()
    return () => {
      cancelled = true
    }
  }, [courseId, batchesFilter])

  useEffect(() => {
    if (!courseId) {
      setBatchId(null)
      return
    }
    if (skipAutoSelect) return
    const list = batches
    setBatchId(list[0] ? pickNum(list[0], ['fk_batch_id', 'batchId']) : null)
  }, [courseId, batches, skipAutoSelect])

  async function handleGetReport() {
    if (!collegeId || !batchId) {
      toastError('Please select College and Batch')
      return
    }
    setLoading(true)
    setRows([])
    try {
      const data = await getBatchWiseDetentionReport({
        collegeId,
        courseId: courseId || 0,
        batchId,
      })
      if (data.length === 0) {
        toastInfo('No data found for selected filters.')
        return
      }
      setRows(data)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSkipAutoSelect(true)
    setCollegeId(null)
    setCourseId(null)
    setBatchId(null)
    setDomainBatches([])
    setRows([])
    setSearchText('')
  }

  function handleExportExcel() {
    if (filteredRows.length === 0) return
    const head = `<tr><th>S.No</th><th>Hall Ticket No</th><th>Student Name</th><th>Group Code</th><th>Course Year Code</th><th>Batch Name</th></tr>`
    const body = filteredRows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${pickText(r, ['hallticket_number', 'hall_ticketno'])}</td><td>${pickText(r, ['student_name', 'studentName'])}</td><td>${pickText(r, ['group_code', 'groupCode'])}</td><td>${pickText(r, ['course_year_code', 'courseYearCode'])}</td><td>${pickText(r, ['batch_name', 'batchName'])}</td></tr>`,
      )
      .join('')
    const title = `<tr><th colspan="6" style="text-align:center;font-size:21px;font-weight:bold;background:#f2f2f2;">Detention Report</th></tr>`
    exportHtmlTable('Detention Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    const college = colleges.find(
      (r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
    )
    printDetentionReport(filteredRows, {
      title: 'Detention Report',
      collegeName: pickText(college ?? {}, ['college_name', 'collegeName']),
    })
  }

  return (
    <FilteredPage
      title="Detention Report"
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="College" icon={Building2}>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => {
                setSkipAutoSelect(false)
                setRows([])
                setCollegeId(v ? Number(v) : null)
              }}
              options={colleges.map((r) => ({
                value: String(pickNum(r, ['fk_college_id', 'collegeId'])),
                label: pickText(r, ['college_code', 'collegeCode', 'college_name']),
              }))}
              placeholder="College"
              searchable
              isLoading={loading && filtersData.length === 0}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Course" icon={GraduationCap}>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => {
                setSkipAutoSelect(false)
                setRows([])
                setCourseId(v ? Number(v) : null)
              }}
              options={courses.map((r) => ({
                value: String(pickNum(r, ['fk_course_id', 'courseId'])),
                label: pickText(r, ['course_code', 'courseCode', 'course_name']),
              }))}
              placeholder="Course"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Batch" icon={Layers}>
            <Select
              value={batchId ? String(batchId) : null}
              onChange={(v) => {
                setRows([])
                setBatchId(v ? Number(v) : null)
              }}
              options={batches.map((r) => ({
                value: String(pickNum(r, ['fk_batch_id', 'batchId'])),
                label: pickText(r, ['batch_name', 'batchName']),
              }))}
              placeholder="Batch"
              searchable
              isLoading={Boolean(courseId) && loading}
            />
          </GlobalFilterField>
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
            <Button
              type="button"
              className="h-8 text-[12px]"
              onClick={() => void handleGetReport()}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Get Report'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 text-[12px]"
              onClick={handleReset}
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </GlobalFilterBarRow>
      }
      body={
        rows.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Detention Report</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search"
                  className="h-8 w-48 text-[12px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">S.No</th>
                    <th className="px-3 py-2 font-semibold">Hall Ticket No</th>
                    <th className="px-3 py-2 font-semibold">Student Name</th>
                    <th className="px-3 py-2 font-semibold">Group Code</th>
                    <th className="px-3 py-2 font-semibold">Course Year Code</th>
                    <th className="px-3 py-2 font-semibold">Batch Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr
                      key={`${pickText(row, ['hallticket_number', 'hall_ticketno'])}-${i}`}
                      className="border-t"
                    >
                      <td className="px-3 py-1.5 text-center">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        {pickText(row, ['hallticket_number', 'hall_ticketno'])}
                      </td>
                      <td className="px-3 py-1.5">
                        {pickText(row, ['student_name', 'studentName'])}
                      </td>
                      <td className="px-3 py-1.5">{pickText(row, ['group_code', 'groupCode'])}</td>
                      <td className="px-3 py-1.5">
                        {pickText(row, ['course_year_code', 'courseYearCode'])}
                      </td>
                      <td className="px-3 py-1.5">{pickText(row, ['batch_name', 'batchName'])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      }
    />
  )
}
