'use client'

/**
 * Angular `accounts-and-fees/fee-reports/daywise-online-fee-payments`
 * Day Wise Online Fee Payment Reports.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { format } from 'date-fns'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from '@/common/export-html-table'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from '@/hooks/useCollegeLogo'
import { printHtmlInIframe } from '@/lib/print'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  getDaywiseOnlineErpFeePayments,
  getFeeMasterCollegeFilters,
} from '@/services'

type OnlineFeeRow = Record<string, unknown>

const EXCEL_COLUMNS = [
  { key: 'siNo', header: 'SI.No' },
  { key: 'college_code', header: 'College' },
  { key: 'courseDisplay', header: 'Course' },
  { key: 'hallticket_number', header: 'Hallticket' },
  { key: 'first_name', header: 'Student Name' },
  { key: 'payment_receipts_no', header: 'Receipt No' },
  { key: 'transaction_no', header: 'Merchant Ref.No' },
  { key: 'payment_mode', header: 'Payment Mode' },
  { key: 'amount', header: 'Amount' },
  { key: 'transDateDisplay', header: 'Transaction Date' },
  { key: 'statusDisplay', header: 'Transaction Status' },
] as const

function statusDisplay(row: OnlineFeeRow): string {
  return String(row.order_status ?? '') === 'SUC' ? 'SUCCESS' : 'REJECTED'
}

function transDateDisplay(row: OnlineFeeRow): string {
  const raw = row.trans_date
  if (raw == null || String(raw).trim() === '') return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return format(d, 'MMM d, yyyy')
}

function courseDisplay(row: OnlineFeeRow): string {
  return [row.course_code, row.group_code, row.course_year_code]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' / ')
}

const COL_DEFS = {
  siNo: {
    headerName: 'SI.No',
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<OnlineFeeRow>,
  college: {
    field: 'college_code',
    headerName: 'College',
    minWidth: 100,
  } as ColDef<OnlineFeeRow>,
  course: {
    headerName: 'Course',
    minWidth: 160,
    valueGetter: (p) => (p.data ? courseDisplay(p.data) : ''),
  } as ColDef<OnlineFeeRow>,
  hallticket: {
    field: 'hallticket_number',
    headerName: 'Hallticket',
    minWidth: 120,
  } as ColDef<OnlineFeeRow>,
  student: {
    field: 'first_name',
    headerName: 'Student Name',
    minWidth: 160,
  } as ColDef<OnlineFeeRow>,
  receiptNo: {
    field: 'payment_receipts_no',
    headerName: 'Receipt No',
    minWidth: 120,
  } as ColDef<OnlineFeeRow>,
  merchantRef: {
    field: 'transaction_no',
    headerName: 'Merchant Ref.No',
    minWidth: 140,
  } as ColDef<OnlineFeeRow>,
  paymentMode: {
    field: 'payment_mode',
    headerName: 'Payment Mode',
    minWidth: 120,
  } as ColDef<OnlineFeeRow>,
  amount: {
    field: 'amount',
    headerName: 'Amount',
    minWidth: 100,
    cellClass: 'text-center',
  } as ColDef<OnlineFeeRow>,
  transDate: {
    headerName: 'Transaction Date',
    minWidth: 130,
    valueGetter: (p) => (p.data ? transDateDisplay(p.data) : ''),
  } as ColDef<OnlineFeeRow>,
  status: {
    headerName: 'Transaction Status',
    minWidth: 130,
    valueGetter: (p) => (p.data ? statusDisplay(p.data) : ''),
  } as ColDef<OnlineFeeRow>,
}

export default function DaywiseOnlineFeePaymentsPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem('organizationId') ?? 0,
  )
  const sessionEmpId = Number(
    globalThis?.localStorage?.getItem('employeeId') ?? 0,
  )

  const [dateMode, setDateMode] = useState<'all' | 'range'>('all')
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [courseYearId, setCourseYearId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(new Date())
  const [toDate, setToDate] = useState<Date | null>(new Date())

  const [rows, setRows] = useState<OnlineFeeRow[]>([])
  const [listLoaded, setListLoaded] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [dataDetails, setDataDetails] = useState('')
  const orgCode = String(
    globalThis?.localStorage?.getItem('orgCode') ?? '',
  ).toUpperCase()

  const collegeLogo = useCollegeLogo(
    collegeId && collegeId !== '0' ? Number(collegeId) : null,
  )

  const filtersQuery = useQuery({
    queryKey: QK.feesCollection.daywiseOnlineFeePayments.filters(
      orgId,
      sessionEmpId,
    ),
    queryFn: () => getFeeMasterCollegeFilters(orgId, sessionEmpId),
    enabled: orgId > 0 && sessionEmpId > 0,
  })

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  )
  const academicData = useMemo(
    () => (filtersQuery.data?.academicData ?? []) as FilterRow[],
    [filtersQuery.data?.academicData],
  )

  const collegeNum = collegeId === '0' ? 0 : Number(collegeId) || 0

  const clearResults = () => {
    setRows([])
    setListLoaded(false)
    setDataDetails('')
  }

  useEffect(() => {
    if (collegeId || filtersData.length === 0) return
    const colleges = filterColleges(filtersData)
    if (colleges.length === 0) return
    setCollegeId(String(pickNum(colleges[0], ['fk_college_id', 'collegeId'])))
  }, [filtersData, collegeId])

  const collegeOptions = useMemo(() => {
    return filterColleges(filtersData).map((c) => ({
      value: String(pickNum(c, ['fk_college_id', 'collegeId'])),
      label: pickText(c, ['college_code', 'collegeCode', 'college_name']) || '—',
    }))
  }, [filtersData])

  const ayOptions = useMemo(() => {
    const opts = filterAcademicYears(
      academicData,
      collegeNum || null,
      filtersData,
    ).map((a) => ({
      value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])),
      label: pickText(a, ['academic_year', 'academicYear']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
  }, [academicData, collegeNum, filtersData])

  const courseOptions = useMemo(() => {
    const source = filtersData.filter(
      (r) => pickNum(r, ['fk_college_id', 'collegeId']) === collegeNum,
    )
    const opts = filterCourses(
      source.length ? source : filtersData,
      collegeNum || null,
    ).map((c) => ({
      value: String(pickNum(c, ['fk_course_id', 'courseId'])),
      label: pickText(c, ['course_code', 'courseCode', 'course_name']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
  }, [filtersData, collegeNum])

  const groupOptions = useMemo(() => {
    const opts = filterCourseGroups(
      filtersData,
      collegeNum || null,
      courseId && courseId !== '0' ? Number(courseId) : null,
    ).map((g) => ({
      value: String(pickNum(g, ['fk_course_group_id', 'courseGroupId'])),
      label: pickText(g, ['group_code', 'groupCode', 'group_name']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
  }, [filtersData, collegeNum, courseId])

  const yearOptions = useMemo(() => {
    const opts = filterCourseYears(
      filtersData,
      collegeNum || null,
      courseId && courseId !== '0' ? Number(courseId) : null,
      courseGroupId && courseGroupId !== '0' ? Number(courseGroupId) : null,
    ).map((y) => ({
      value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])),
      label:
        pickText(y, ['course_year_name', 'courseYearName', 'year_name']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
  }, [filtersData, collegeNum, courseId, courseGroupId])

  useEffect(() => {
    if (!collegeId) return
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    clearResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId])

  useEffect(() => {
    if (!collegeId || academicYearId || ayOptions.length <= 1) return
    setAcademicYearId(ayOptions[1]?.value ?? '0')
  }, [collegeId, academicYearId, ayOptions])

  useEffect(() => {
    if (!academicYearId) return
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    clearResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId])

  useEffect(() => {
    if (!academicYearId || courseId) return
    if (courseOptions.length > 1) setCourseId(courseOptions[1]?.value ?? '0')
    else setCourseId('0')
  }, [academicYearId, courseId, courseOptions])

  useEffect(() => {
    if (!courseId) return
    setCourseGroupId(null)
    setCourseYearId(null)
    clearResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    if (!courseId || courseGroupId) return
    if (courseId === '0') {
      setCourseGroupId('0')
      return
    }
    if (groupOptions.length > 1) setCourseGroupId(groupOptions[1]?.value ?? '0')
    else setCourseGroupId('0')
  }, [courseId, courseGroupId, groupOptions])

  useEffect(() => {
    if (!courseGroupId) return
    setCourseYearId(null)
    clearResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseGroupId])

  useEffect(() => {
    if (!courseGroupId || courseYearId) return
    if (courseGroupId === '0') {
      setCourseYearId('0')
      return
    }
    if (yearOptions.length > 1) setCourseYearId(yearOptions[1]?.value ?? '0')
    else setCourseYearId('0')
  }, [courseGroupId, courseYearId, yearOptions])

  useEffect(() => {
    if (dateMode !== 'range' || !fromDate || !toDate) return
    if (fromDate.getTime() > toDate.getTime()) setToDate(fromDate)
  }, [dateMode, fromDate, toDate])

  const buildDataDetails = useCallback(
    (fDate: string, tDate: string) => {
      const parts: string[] = []
      if (collegeId) {
        const c = filterColleges(filtersData).find(
          (r) =>
            String(pickNum(r, ['fk_college_id', 'collegeId'])) === collegeId,
        )
        const code = pickText(c, ['college_code', 'collegeCode'])
        if (code) parts.push(code)
      }
      if (academicYearId && academicYearId !== '0') {
        const a = ayOptions.find((o) => o.value === academicYearId)
        if (a?.label && a.label !== 'All') parts.push(a.label)
      }
      if (courseId && courseId !== '0') {
        const c = courseOptions.find((o) => o.value === courseId)
        if (c?.label && c.label !== 'All') parts.push(c.label)
      }
      if (courseGroupId && courseGroupId !== '0') {
        const g = groupOptions.find((o) => o.value === courseGroupId)
        if (g?.label && g.label !== 'All') parts.push(g.label)
      }
      if (courseYearId && courseYearId !== '0') {
        const y = yearOptions.find((o) => o.value === courseYearId)
        if (y?.label && y.label !== 'All') parts.push(y.label)
      }
      parts.push(`${fDate}-${tDate}`)
      return parts.filter(Boolean).join(' / ')
    },
    [
      collegeId,
      filtersData,
      academicYearId,
      ayOptions,
      courseId,
      courseOptions,
      courseGroupId,
      groupOptions,
      courseYearId,
      yearOptions,
    ],
  )

  async function handleGetList() {
    if (!collegeId) {
      toastError('Please select College.')
      return
    }

    let selectedFDate = '1900-01-01'
    let selectedTDate = '1900-01-01'
    if (dateMode === 'range') {
      if (!fromDate || !toDate) {
        toastError('Please select From / To Date.')
        return
      }
      selectedFDate = format(fromDate, 'yyyy-MM-dd')
      selectedTDate = format(toDate, 'yyyy-MM-dd')
    }

    setLoadingList(true)
    setListLoaded(true)
    try {
      const list = await getDaywiseOnlineErpFeePayments({
        collegeId: collegeNum,
        courseId: Number(courseId) || 0,
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        fromDate: selectedFDate,
        toDate: selectedTDate,
      })
      setRows(list)
      setDataDetails(buildDataDetails(selectedFDate, selectedTDate))
      if (list.length === 0) toastSuccess('No records found.')
    } catch (e) {
      setRows([])
      toastError(getErrorMessage(e) || 'Failed to load online fee payments')
    } finally {
      setLoadingList(false)
    }
  }

  const columnDefs = useMemo<ColDef<OnlineFeeRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.course,
      COL_DEFS.hallticket,
      COL_DEFS.student,
      COL_DEFS.receiptNo,
      COL_DEFS.merchantRef,
      COL_DEFS.paymentMode,
      COL_DEFS.amount,
      COL_DEFS.transDate,
      COL_DEFS.status,
    ],
    [],
  )

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        college_code: String(row.college_code ?? ''),
        courseDisplay: courseDisplay(row),
        hallticket_number: String(row.hallticket_number ?? ''),
        first_name: String(row.first_name ?? ''),
        payment_receipts_no: String(row.payment_receipts_no ?? ''),
        transaction_no: String(row.transaction_no ?? ''),
        payment_mode: String(row.payment_mode ?? ''),
        amount: row.amount ?? '',
        transDateDisplay: transDateDisplay(row),
        statusDisplay: statusDisplay(row),
      })),
    [rows],
  )

  const selectedCollegeName = useMemo(() => {
    if (!collegeId) return ''
    const c = filterColleges(filtersData).find(
      (r) => String(pickNum(r, ['fk_college_id', 'collegeId'])) === collegeId,
    )
    return (
      pickText(c, ['college_name', 'collegeName', 'college_code']) || 'College'
    )
  }, [collegeId, filtersData])

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError('No records to export.')
      return
    }
    const title = 'Daywise Online Fee Payment Report'
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(title)} - ${escapeHtml(dataDetails)}</div>
    </div>`
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    )
    exportHtmlTableAsExcel(`${title}.xls`, tableHtml, headerHtml)
  }, [dataDetails, exportFlatRows])

  const handlePrintReport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError('No records to print.')
      return
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO
    const reportTitle = 'Day Wise Online Fee Payment Reports'
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    )
    const headerHtml =
      orgCode === 'SUK'
        ? `<div style="text-align:center;margin-bottom:12px;">
        <img src="${escapeHtml(logoSrc)}" alt="" style="height:120px;max-width:90%;object-fit:contain;" />
        <p style="font-size:16px;font-weight:700;margin:8px 0 4px;">${escapeHtml(selectedCollegeName)}</p>
        <p style="font-size:13px;margin:2px 0;">${escapeHtml(dataDetails)}</p>
        <p style="font-size:13px;font-weight:600;margin:2px 0;">${reportTitle}</p>
      </div>`
        : `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <img src="${escapeHtml(logoSrc)}" alt="" style="height:72px;width:auto;object-fit:contain;" />
        <div>
          <p style="font-size:16px;font-weight:700;margin:0 0 4px;text-align:left;">${escapeHtml(selectedCollegeName)}</p>
          <p style="font-size:13px;margin:2px 0;text-align:left;">${escapeHtml(dataDetails)}</p>
          <p style="font-size:13px;font-weight:600;margin:2px 0;text-align:left;">${reportTitle}</p>
        </div>
      </div>`

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${reportTitle}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`)
  }, [
    collegeLogo,
    dataDetails,
    exportFlatRows,
    orgCode,
    selectedCollegeName,
  ])

  const showTable = listLoaded && rows.length > 0
  const pageTitle = showTable
    ? dataDetails
      ? `Day Wise Online Fee Payment Reports — ${dataDetails}`
      : 'Day Wise Online Fee Payment Reports'
    : 'Day Wise Online Fee Payment Reports'

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => setCollegeId(v)}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              value={academicYearId}
              onChange={(v) => setAcademicYearId(v ?? '0')}
              options={ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              value={courseId}
              onChange={(v) => setCourseId(v ?? '0')}
              options={courseOptions}
              placeholder="Course"
            />
            <Select
              label="Course Group"
              value={courseGroupId}
              onChange={(v) => setCourseGroupId(v ?? '0')}
              options={groupOptions}
              placeholder="Course Group"
            />
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={(v) => setCourseYearId(v ?? '0')}
              options={yearOptions}
              placeholder="Course Year"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <RadioGroup
                value={dateMode}
                onValueChange={(v) =>
                  setDateMode(v === 'range' ? 'range' : 'all')
                }
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="online-date-all" />
                  <Label htmlFor="online-date-all" className="font-normal">
                    Select All Dates
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="range" id="online-date-range" />
                  <Label htmlFor="online-date-range" className="font-normal">
                    Select Date
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {dateMode === 'range' && (
              <>
                <DatePicker
                  label="From Date"
                  value={fromDate}
                  onChange={setFromDate}
                  maxDate={toDate ?? undefined}
                />
                <DatePicker
                  label="To Date"
                  value={toDate}
                  onChange={setToDate}
                  minDate={fromDate ?? undefined}
                />
              </>
            )}
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList || !collegeId}
              onClick={() => void handleGetList()}
            >
              {loadingList ? 'Loading…' : 'Get List'}
            </Button>
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      pagination
      loading={loadingList || filtersQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        exportExcel: false,
      }}
      toolbarTrailing={
        showTable ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handlePrintReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </>
        ) : null
      }
    />
  )
}
