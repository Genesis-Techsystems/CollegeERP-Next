'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getAdmissionUnivFilters,
  getBatchWiseSgpaReport,
  getFeeMasterCollegeFilters,
  listBatchesByCourse,
} from '@/services'
import {
  filterBatches,
  filterColleges,
  filterCourseGroups,
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
  School,
} from 'lucide-react'
import {
  printBatchWiseSgpaReport,
  type SgpaSemesterCol,
} from '../_components/printBatchWiseSgpaReport'

type AnyRow = Record<string, any>

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[]
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`
  const link = document.createElement('a')
  link.download = filename
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`
  link.click()
}

function pivotSgpaRows(semesters: AnyRow[], students: AnyRow[]): AnyRow[] {
  const map: Record<string, AnyRow> = {}
  for (const row of students) {
    const ht = String(row.hallticket_number ?? '').trim()
    if (!ht) continue
    if (!map[ht]) {
      map[ht] = {
        hallticket_number: ht,
        first_name: row.first_name ?? '',
      }
    }
    const semester = semesters.find(
      (s) =>
        Number(s.pk_course_year_id ?? s.fk_course_year_id ?? 0) ===
        Number(row.fk_course_year_id ?? 0),
    )
    if (semester) {
      const code = String(semester.course_year_code ?? '')
      if (code) map[ht][code] = row.sgpa
    }
  }
  return Object.values(map)
}

export default function BatchWiseSgpaReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filtersData, setFiltersData] = useState<FilterRow[]>([])
  const [batchesFilter, setBatchesFilter] = useState<FilterRow[]>([])
  const [domainBatches, setDomainBatches] = useState<FilterRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number>(0)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [semesters, setSemesters] = useState<SgpaSemesterCol[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [searchText, setSearchText] = useState('')

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData])
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () => filterCourseGroups(filtersData, collegeId, courseId),
    [filtersData, collegeId, courseId],
  )
  const batches = useMemo(() => {
    const fromProc = filterBatches(batchesFilter, courseId)
    if (fromProc.length > 0) {
      return [...fromProc].sort(
        (a, b) =>
          Number(pickText(b, ['batch_name', 'batchName'])) -
          Number(pickText(a, ['batch_name', 'batchName'])),
      )
    }
    return filterBatches(domainBatches, courseId)
  }, [batchesFilter, domainBatches, courseId])

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const ht = String(r.hallticket_number ?? '').toLowerCase()
      const name = String(r.first_name ?? '').toLowerCase()
      return ht.includes(q) || name.includes(q)
    })
  }, [rows, searchText])

  function clearResults() {
    setRows([])
    setSemesters([])
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const collegeFilters = await getFeeMasterCollegeFilters(orgId, employeeId)
        if (cancelled) return

        let nextBatches = toFilterRows(collegeFilters.batchesData ?? [])
        if (nextBatches.length === 0) {
          try {
            const univ = await getAdmissionUnivFilters(orgId, employeeId)
            nextBatches = toFilterRows(univ.batchesData ?? [])
          } catch {
            /* keep empty */
          }
        }

        setFiltersData(toFilterRows(collegeFilters.filtersData ?? []))
        setBatchesFilter(nextBatches)
        const nextColleges = filterColleges(toFilterRows(collegeFilters.filtersData ?? []))
        setSkipAutoSelect(false)
        setCollegeId(
          nextColleges[0] ? pickNum(nextColleges[0], ['fk_college_id', 'collegeId']) : null,
        )
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

  useEffect(() => {
    if (!courseId) {
      setBatchId(null)
      setCourseGroupId(0)
      setDomainBatches([])
      return
    }
    if (skipAutoSelect) return

    setCourseGroupId(0)

    const fromProc = filterBatches(batchesFilter, courseId)
    if (fromProc.length > 0) {
      const sorted = [...fromProc].sort(
        (a, b) =>
          Number(pickText(b, ['batch_name', 'batchName'])) -
          Number(pickText(a, ['batch_name', 'batchName'])),
      )
      setBatchId(sorted[0] ? pickNum(sorted[0], ['fk_batch_id', 'batchId']) : null)
      return
    }

    let cancelled = false
    async function loadDomainBatches() {
      try {
        const list = await listBatchesByCourse(courseId!)
        if (cancelled) return
        const rows = toFilterRows(list ?? [])
        setDomainBatches(rows)
        const sorted = filterBatches(rows, courseId)
        setBatchId(sorted[0] ? pickNum(sorted[0], ['fk_batch_id', 'batchId']) : null)
      } catch {
        if (!cancelled) setDomainBatches([])
      }
    }
    void loadDomainBatches()
    return () => {
      cancelled = true
    }
  }, [courseId, batchesFilter, skipAutoSelect])

  async function handleGetReport() {
    if (!collegeId || !courseId || !batchId) {
      toastError('Please select College, Course, and Batch')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const data = await getBatchWiseSgpaReport({
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        batchId,
      })
      if (!data.students.length) {
        toastInfo('No records found')
        return
      }
      const sems: SgpaSemesterCol[] = (data.semesters ?? []).map((s) => ({
        course_year_code: String(s.course_year_code ?? ''),
        course_year_name: String(s.course_year_name ?? s.course_year_code ?? ''),
        pk_course_year_id: Number(s.pk_course_year_id ?? s.fk_course_year_id ?? 0) || undefined,
      }))
      setSemesters(sems.filter((s) => s.course_year_code))
      setRows(pivotSgpaRows(data.semesters ?? [], data.students))
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
    setCourseGroupId(0)
    setDomainBatches([])
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredRows.length === 0) return
    const head = `<tr>
      <th>S.No</th><th>ROLL NO</th><th>NAME OF THE STUDENT</th>
      ${semesters.map((s) => `<th>${s.course_year_name}</th>`).join('')}
    </tr>`
    const body = filteredRows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${r.hallticket_number ?? ''}</td>
        <td>${r.first_name ?? ''}</td>
        ${semesters.map((s) => `<td>${r[s.course_year_code] ?? ''}</td>`).join('')}
      </tr>`,
      )
      .join('')
    const title = `<tr><th colspan="${semesters.length + 3}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Batch Wise SGPA Report</th></tr>`
    exportHtmlTable('Batch Wise SGPA Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    const college = colleges.find((r) => pickNum(r, ['fk_college_id', 'collegeId']) === collegeId)
    const course = courses.find((r) => pickNum(r, ['fk_course_id', 'courseId']) === courseId)
    const batch = batches.find((r) => pickNum(r, ['fk_batch_id', 'batchId']) === batchId)
    printBatchWiseSgpaReport(filteredRows, {
      title: 'Batch Wise SGPA Report',
      collegeName: pickText(college ?? {}, ['college_name', 'collegeName']),
      filterSummary: [
        pickText(college ?? {}, ['college_code', 'collegeCode']),
        pickText(course ?? {}, ['course_code', 'courseCode']),
        pickText(batch ?? {}, ['batch_name', 'batchName']),
      ]
        .filter(Boolean)
        .join(' / '),
      semesters,
    })
  }

  return (
    <FilteredPage
      title="Batch Wise SGPA Report"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow className="!w-full !flex-nowrap !items-end">
            <GlobalFilterField
              label="College"
              icon={Building2}
              className="!min-w-[7rem] !flex-[1_1_0%] !max-w-none"
            >
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
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
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="!min-w-[7rem] !flex-[1_1_0%] !max-w-none"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
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
            <GlobalFilterField
              label="Batch"
              icon={School}
              className="!min-w-[9rem] !flex-[1.35_1_0%] !max-w-none"
            >
              <Select
                value={batchId ? String(batchId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setBatchId(v ? Number(v) : null)
                }}
                options={batches.map((r) => ({
                  value: String(pickNum(r, ['fk_batch_id', 'batchId'])),
                  label: pickText(r, ['batch_name', 'batchName']),
                }))}
                placeholder="Batch"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Group"
              icon={Layers}
              className="!min-w-[7.5rem] !flex-[1_1_0%] !max-w-none"
            >
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
                  clearResults()
                  setCourseGroupId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...courseGroups.map((r) => ({
                    value: String(pickNum(r, ['fk_course_group_id', 'courseGroupId'])),
                    label: pickText(r, ['group_code', 'groupCode', 'group_name']),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <div className="flex shrink-0 items-center gap-2 self-end pb-0.5">
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
        </div>
      }
      body={
        rows.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Batch Wise SGPA Report</p>
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
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 font-semibold">S.No</th>
                    <th className="px-2 py-2 font-semibold">ROLL NO</th>
                    <th className="px-2 py-2 font-semibold">NAME OF THE STUDENT</th>
                    {semesters.map((s) => (
                      <th key={s.course_year_code} className="px-2 py-2 text-center font-semibold">
                        {s.course_year_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={`${r.hallticket_number}-${i}`} className="border-t">
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{String(r.hallticket_number ?? '')}</td>
                      <td className="px-2 py-1.5">{String(r.first_name ?? '')}</td>
                      {semesters.map((s) => (
                        <td key={s.course_year_code} className="px-2 py-1.5 text-center">
                          {String(r[s.course_year_code] ?? '')}
                        </td>
                      ))}
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
