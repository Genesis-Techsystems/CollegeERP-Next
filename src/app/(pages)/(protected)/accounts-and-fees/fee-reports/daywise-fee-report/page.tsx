'use client'

/**
 * Angular `accounts-and-fees/fee-reports/day-wise-fee-report`
 * (menu: Day Wise Receipts / reports/admin-fee-reports/daywise-fee-report).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { Printer } from 'lucide-react'
import { DatePicker, MonthYearPicker } from '@/common/components/date-picker'
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
import { useCollegeLogo } from '@/hooks/useCollegeLogo'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  getDayWiseFeeCollection,
  getFeeMasterCollegeFilters,
  listAccountantEmployeesByCollege,
  type DayWiseFeeCollectionRow,
} from '@/services'

const PAYMENT_STATUS_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
]

const EXCEL_COLUMNS = [
  { key: 'siNo', header: 'S.No' },
  { key: 'course_code', header: 'Course' },
  { key: 'studentDisplay', header: 'Student Name' },
  { key: 'rollNumber', header: 'USN' },
  { key: 'payTypeDisplay', header: 'Pay Type' },
  { key: 'receiptDateDisplay', header: 'Payment Date' },
  { key: 'payment_receipts_no', header: 'Receipt No.' },
  { key: 'transaction_no', header: 'Merchant Ref. No.' },
  { key: 'receipt_amount', header: 'Amount' },
] as const

function payTypeDisplay(row: DayWiseFeeCollectionRow): string {
  const pay = String(row.pay_type ?? '').trim()
  const mode = String(row.payment_mode ?? '').trim()
  const card = String(row.card_name ?? '').trim()
  if (!mode) return pay
  const modePart = card ? `${mode}-${card}` : mode
  return pay ? `${pay} (${modePart})` : `(${modePart})`
}

function receiptDateDisplay(row: DayWiseFeeCollectionRow): string {
  const raw = row.receipt_date
  if (raw == null || String(raw).trim() === '') return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return format(d, 'dd/MM/yyyy , H:mm:ss')
}

function studentNameRenderer(p: ICellRendererParams<DayWiseFeeCollectionRow>) {
  const row = p.data
  if (!row) return null
  const name = String(row.firstName ?? '')
  const isEmp = row.empNumber != null && String(row.empNumber).trim() !== ''
  return (
    <span>
      {name}{' '}
      <span className="font-medium text-blue-600">
        ({isEmp ? 'EMP' : 'STD'})
      </span>
    </span>
  )
}

const COL_DEFS = {
  siNo: {
    headerName: 'S.No',
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<DayWiseFeeCollectionRow>,
  course: {
    field: 'course_code',
    headerName: 'Course',
    minWidth: 110,
    valueFormatter: (p) => String(p.value ?? '-') || '-',
  } as ColDef<DayWiseFeeCollectionRow>,
  student: {
    headerName: 'Student Name',
    minWidth: 180,
    valueGetter: (p) => String(p.data?.firstName ?? ''),
  } as ColDef<DayWiseFeeCollectionRow>,
  usn: {
    field: 'rollNumber',
    headerName: 'USN',
    minWidth: 120,
  } as ColDef<DayWiseFeeCollectionRow>,
  payType: {
    headerName: 'Pay Type',
    minWidth: 140,
    valueGetter: (p) => (p.data ? payTypeDisplay(p.data) : ''),
  } as ColDef<DayWiseFeeCollectionRow>,
  paymentDate: {
    headerName: 'Payment Date',
    minWidth: 150,
    valueGetter: (p) => (p.data ? receiptDateDisplay(p.data) : ''),
  } as ColDef<DayWiseFeeCollectionRow>,
  receiptNo: {
    field: 'payment_receipts_no',
    headerName: 'Receipt No.',
    minWidth: 120,
  } as ColDef<DayWiseFeeCollectionRow>,
  merchantRef: {
    field: 'transaction_no',
    headerName: 'Merchant Ref. No.',
    minWidth: 140,
  } as ColDef<DayWiseFeeCollectionRow>,
  amount: {
    field: 'receipt_amount',
    headerName: 'Amount',
    minWidth: 100,
    cellClass: 'text-center',
  } as ColDef<DayWiseFeeCollectionRow>,
}

export default function DayWiseFeeReportPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem('organizationId') ?? 0,
  )
  const sessionEmpId = Number(
    globalThis?.localStorage?.getItem('employeeId') ?? 0,
  )
  const userRole = String(
    globalThis?.localStorage?.getItem('userRole') ?? '',
  ).toUpperCase()
  const isFinanceOfficer =
    String(globalThis?.localStorage?.getItem('isFinanceOfficer') ?? 'false') ===
    'true'
  const isAccountant =
    String(globalThis?.localStorage?.getItem('isAccountant') ?? 'false') ===
    'true'

  const [mode, setMode] = useState<'day' | 'month'>('day')
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [courseYearId, setCourseYearId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string>('0')
  const [paymentStatus, setPaymentStatus] = useState<string | null>('online')
  const [reportDate, setReportDate] = useState<Date | null>(new Date())
  const [fromMonth, setFromMonth] = useState<Date | null>(new Date())
  const [toMonth, setToMonth] = useState<Date | null>(new Date())

  const [rows, setRows] = useState<DayWiseFeeCollectionRow[]>([])
  const [listLoaded, setListLoaded] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [dataDetails, setDataDetails] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)

  const collegeLogo = useCollegeLogo(
    collegeId && collegeId !== '0' ? Number(collegeId) : null,
  )

  const filtersQuery = useQuery({
    queryKey: QK.feesCollection.dayWiseFeeReport.filters(orgId, sessionEmpId),
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

  const accountantsQuery = useQuery({
    queryKey: QK.feesCollection.dayWiseFeeReport.accountants(collegeNum),
    queryFn: () => listAccountantEmployeesByCollege(collegeNum),
    enabled: collegeNum > 0 && !isFinanceOfficer,
  })

  useEffect(() => {
    if (collegeId || filtersData.length === 0) return
    const colleges = filterColleges(filtersData)
    if (colleges.length === 0) return
    setCollegeId(String(pickNum(colleges[0], ['fk_college_id', 'collegeId'])))
  }, [filtersData, collegeId])

  useEffect(() => {
    if (userRole === 'ADMIN') return
    if (sessionEmpId > 0) setEmployeeId(String(sessionEmpId))
  }, [sessionEmpId, userRole])

  const clearResults = () => {
    setRows([])
    setListLoaded(false)
    setDataDetails('')
    setTotalAmount(0)
  }

  const collegeOptions = useMemo(() => {
    const opts = filterColleges(filtersData).map((c) => ({
      value: String(pickNum(c, ['fk_college_id', 'collegeId'])),
      label: pickText(c, ['college_code', 'collegeCode', 'college_name']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
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
    const source =
      academicYearId && academicYearId !== '0'
        ? filtersData.filter(
            (r) => pickNum(r, ['fk_college_id', 'collegeId']) === collegeNum,
          )
        : []
    const opts = filterCourses(
      source.length ? source : filtersData,
      collegeNum || null,
    ).map((c) => ({
      value: String(pickNum(c, ['fk_course_id', 'courseId'])),
      label: pickText(c, ['course_code', 'courseCode', 'course_name']) || '—',
    }))
    return [{ value: '0', label: 'All' }, ...opts]
  }, [filtersData, collegeNum, academicYearId])

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

  const employeeOptions = useMemo(() => {
    const opts = (accountantsQuery.data ?? []).map((e) => ({
      value: String(e.employeeId ?? ''),
      label: String(e.firstName ?? e.employeeId ?? '—'),
    }))
    return [{ value: '0', label: 'All' }, ...opts.filter((o) => o.value)]
  }, [accountantsQuery.data])

  // Cascade resets (Angular selectedCollege / selectedAcademicYear / …)
  useEffect(() => {
    if (!collegeId) return
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setEmployeeId(userRole === 'ADMIN' ? '0' : String(sessionEmpId || 0))
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
    if (academicYearId === '0') {
      setCourseId('0')
      return
    }
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

  const selectedCollegeName = useMemo(() => {
    if (!collegeId || collegeId === '0') return 'All Colleges'
    const c = filterColleges(filtersData).find(
      (r) => String(pickNum(r, ['fk_college_id', 'collegeId'])) === collegeId,
    )
    return (
      pickText(c, ['college_name', 'collegeName', 'college_code']) || 'College'
    )
  }, [collegeId, filtersData])

  const buildDataDetails = useCallback(
    (dateLabel: string) => {
      const parts: string[] = []
      if (collegeId && collegeId !== '0') {
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
      parts.push(dateLabel)
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
    const empId =
      isAccountant === false
        ? Number(employeeId) || 0
        : Number(employeeId) || sessionEmpId || 0

    let fromDate = ''
    let toDate = ''
    let dateLabel = ''

    if (mode === 'day') {
      if (!reportDate) {
        toastError('Please select Date.')
        return
      }
      fromDate = format(reportDate, 'yyyy-MM-dd')
      toDate = fromDate
      dateLabel = fromDate
    } else {
      if (!fromMonth || !toMonth) {
        toastError('Please select From / To Month.')
        return
      }
      fromDate = format(fromMonth, 'yyyy-MM-dd')
      toDate = format(toMonth, 'yyyy-MM-dd')
      dateLabel = `${fromDate}-${toDate}`
    }

    setLoadingList(true)
    setListLoaded(true)
    try {
      const list = await getDayWiseFeeCollection({
        collegeId: collegeNum,
        employeeId: mode === 'month' ? 0 : empId,
        academicYearId: Number(academicYearId) || 0,
        courseId: Number(courseId) || 0,
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        fromDate,
        toDate,
        paymentStatus: paymentStatus || 'online',
      })
      setRows(list)
      setDataDetails(buildDataDetails(dateLabel))
      const sum = list.reduce(
        (acc, r) => acc + (Number(r.receipt_amount) || 0),
        0,
      )
      setTotalAmount(sum)
      if (list.length === 0) toastSuccess('No records found.')
    } catch (e) {
      setRows([])
      setTotalAmount(0)
      toastError(getErrorMessage(e) || 'Failed to load fee report')
    } finally {
      setLoadingList(false)
    }
  }

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        course_code: row.course_code ?? '-',
        studentDisplay: `${row.firstName ?? ''} (${row.empNumber != null && String(row.empNumber).trim() !== '' ? 'EMP' : 'STD'})`,
        rollNumber: row.rollNumber ?? '',
        payTypeDisplay: payTypeDisplay(row),
        receiptDateDisplay: receiptDateDisplay(row),
        payment_receipts_no: row.payment_receipts_no ?? '',
        transaction_no: row.transaction_no ?? '',
        receipt_amount: row.receipt_amount ?? '',
      })),
    [rows],
  )

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError('No records to export.')
      return
    }
    const title =
      mode === 'month' ? 'Monthly Fee Report' : 'Day Wise Fee Report'
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:18px;font-weight:bold;">${escapeHtml(selectedCollegeName)}</div>
      <div style="font-size:14px;font-weight:bold;margin-top:6px;">( ${escapeHtml(title)} )</div>
      <div style="margin-top:4px;">${escapeHtml(dataDetails)}</div>
    </div>`
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      [
        ...exportFlatRows,
        {
          siNo: '',
          course_code: '',
          studentDisplay: '',
          rollNumber: '',
          payTypeDisplay: '',
          receiptDateDisplay: '',
          payment_receipts_no: '',
          transaction_no: 'Total',
          receipt_amount: totalAmount,
        },
      ] as Record<string, unknown>[],
    )
    exportHtmlTableAsExcel(`${title}.xls`, tableHtml, headerHtml)
  }, [
    dataDetails,
    exportFlatRows,
    mode,
    selectedCollegeName,
    totalAmount,
  ])

  const handlePdfExport = useCallback(async () => {
    if (exportFlatRows.length === 0) {
      toastError('No records to export.')
      return
    }
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null
      try {
        const res = await fetch(collegeLogo)
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer())
          const isPng =
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47
          logoImage = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes)
        }
      } catch {
        logoImage = null
      }

      const pageWidth = 842
      const pageHeight = 595
      const marginX = 28
      const marginTop = 22
      const marginBottom = 24
      const cellSize = 8
      const rowH = 16
      const title =
        mode === 'month' ? 'Monthly Fee Report' : 'Day Wise Fee Report'
      const colWidths = [36, 70, 120, 90, 100, 100, 90, 100, 70]
      const cols = EXCEL_COLUMNS

      const truncate = (text: string, maxWidth: number, bold = false) => {
        const f = bold ? fontBold : font
        let t = text
        if (f.widthOfTextAtSize(t, cellSize) <= maxWidth) return t
        while (
          t.length > 0 &&
          f.widthOfTextAtSize(`${t}…`, cellSize) > maxWidth
        ) {
          t = t.slice(0, -1)
        }
        return t ? `${t}…` : ''
      }

      let page = pdfDoc.addPage([pageWidth, pageHeight])
      let y = pageHeight - marginTop

      const drawHeader = () => {
        const logoSize = 48
        const textX = marginX + (logoImage ? logoSize + 12 : 0)
        if (logoImage) {
          page.drawImage(logoImage, {
            x: marginX,
            y: y - logoSize,
            width: logoSize,
            height: logoSize,
          })
        }
        page.drawText(selectedCollegeName, {
          x: textX,
          y: y - 16,
          size: 14,
          font: fontBold,
          color: rgb(0.275, 0.408, 0.518),
        })
        page.drawText(`( ${title} )`, {
          x: textX,
          y: y - 34,
          size: 11,
          font,
        })
        if (dataDetails) {
          page.drawText(truncate(dataDetails, pageWidth - textX - marginX), {
            x: textX,
            y: y - 50,
            size: 9,
            font,
          })
        }
        y -= logoImage ? logoSize + 12 : 58
        page.drawLine({
          start: { x: marginX, y },
          end: { x: pageWidth - marginX, y },
          thickness: 1,
        })
        y -= 12
      }

      const drawTableHeader = () => {
        let x = marginX
        for (let i = 0; i < cols.length; i++) {
          const w = colWidths[i]
          page.drawRectangle({
            x,
            y: y - rowH,
            width: w,
            height: rowH,
            borderWidth: 0.5,
            borderColor: rgb(0.6, 0.6, 0.6),
          })
          page.drawText(truncate(cols[i].header, w - 4, true), {
            x: x + 2,
            y: y - rowH + 4,
            size: cellSize,
            font: fontBold,
          })
          x += w
        }
        y -= rowH
      }

      const ensureSpace = () => {
        if (y - rowH < marginBottom) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - marginTop
          drawHeader()
          drawTableHeader()
        }
      }

      drawHeader()
      drawTableHeader()

      for (const row of exportFlatRows) {
        ensureSpace()
        let x = marginX
        for (let i = 0; i < cols.length; i++) {
          const w = colWidths[i]
          const raw = String(
            (row as Record<string, unknown>)[cols[i].key] ?? '',
          )
          page.drawRectangle({
            x,
            y: y - rowH,
            width: w,
            height: rowH,
            borderWidth: 0.5,
            borderColor: rgb(0.6, 0.6, 0.6),
          })
          page.drawText(truncate(raw, w - 4), {
            x: x + 2,
            y: y - rowH + 4,
            size: cellSize,
            font,
          })
          x += w
        }
        y -= rowH
      }

      ensureSpace()
      {
        let x = marginX
        for (let i = 0; i < cols.length; i++) {
          const w = colWidths[i]
          const label =
            i === cols.length - 2
              ? 'Total'
              : i === cols.length - 1
                ? String(totalAmount)
                : ''
          page.drawRectangle({
            x,
            y: y - rowH,
            width: w,
            height: rowH,
            borderWidth: 0.5,
            borderColor: rgb(0.6, 0.6, 0.6),
            color: rgb(0.95, 0.95, 0.95),
          })
          if (label) {
            page.drawText(truncate(label, w - 4, true), {
              x: x + 2,
              y: y - rowH + 4,
              size: cellSize,
              font: fontBold,
            })
          }
          x += w
        }
      }

      const bytes = await pdfDoc.save()
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toastError(getErrorMessage(e) || 'Failed to export PDF')
    }
  }, [
    collegeLogo,
    dataDetails,
    exportFlatRows,
    mode,
    selectedCollegeName,
    totalAmount,
  ])

  const columnDefs = useMemo<ColDef<DayWiseFeeCollectionRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.course,
      { ...COL_DEFS.student, cellRenderer: studentNameRenderer },
      COL_DEFS.usn,
      COL_DEFS.payType,
      COL_DEFS.paymentDate,
      COL_DEFS.receiptNo,
      COL_DEFS.merchantRef,
      COL_DEFS.amount,
    ],
    [],
  )

  const showTable = listLoaded && rows.length > 0
  const pageTitle =
    showTable && dataDetails
      ? `${mode === 'month' ? 'Monthly Fee Report' : 'Day Wise Fee Report'} - (${dataDetails})`
      : mode === 'month'
        ? 'Monthly Fee Report'
        : 'Day Wise Fee Report'

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="space-y-3">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              setMode(v === 'month' ? 'month' : 'day')
              clearResults()
            }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="day" id="dwfr-day" />
              <Label htmlFor="dwfr-day" className="cursor-pointer font-normal">
                Day Wise Fee Receipts
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="month" id="dwfr-month" />
              <Label htmlFor="dwfr-month" className="cursor-pointer font-normal">
                Monthly Fee Receipts
              </Label>
            </div>
          </RadioGroup>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={setCollegeId}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
            <Select
              label="Academic Year"
              value={academicYearId}
              onChange={setAcademicYearId}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
            <Select
              label="Course"
              value={courseId}
              onChange={setCourseId}
              options={courseOptions}
              placeholder="Course"
              disabled={!academicYearId}
            />
            <Select
              label="Course Group"
              value={courseGroupId}
              onChange={setCourseGroupId}
              options={groupOptions}
              placeholder="Course Group"
              disabled={!courseId}
            />
            <Select
              label="Course Year"
              value={courseYearId}
              onChange={setCourseYearId}
              options={yearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            {mode === 'day' && !isFinanceOfficer ? (
              <Select
                label="Employee"
                value={employeeId}
                onChange={(v) => {
                  setEmployeeId(v ?? '0')
                  clearResults()
                }}
                options={employeeOptions}
                placeholder="Employee"
                isLoading={accountantsQuery.isLoading}
                disabled={!collegeId || collegeId === '0'}
              />
            ) : null}

            {mode === 'day' ? (
              <DatePicker
                label="Date"
                value={reportDate}
                onChange={(d) => {
                  setReportDate(d)
                  clearResults()
                }}
              />
            ) : (
              <>
                <MonthYearPicker
                  label="From Month and Year"
                  value={fromMonth}
                  onChange={(d) => {
                    setFromMonth(d)
                    clearResults()
                  }}
                />
                <MonthYearPicker
                  label="To Month and Year"
                  value={toMonth}
                  onChange={(d) => {
                    setToMonth(d)
                    clearResults()
                  }}
                />
              </>
            )}

            <Select
              label="Payment Status"
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={PAYMENT_STATUS_OPTIONS}
              placeholder="Payment Status"
            />

            <Button
              type="button"
              className="h-9 w-fit self-end px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? 'Loading…' : 'Get List'}
            </Button>
          </div>
        </div>
      }
      filtersFooter={
        showTable ? (
          <p className="px-1 pt-1 text-sm font-semibold text-foreground">
            Total Amount: {totalAmount}
          </p>
        ) : null
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || filtersQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        exportExcel: true,
        exportPdf: true,
        excelDocumentTitle: pageTitle,
        excelFileName:
          mode === 'month' ? 'Monthly Fee Report.xls' : 'Day Wise Fee Report.xls',
        pdfDocumentTitle: pageTitle,
      }}
      onExportExcel={handleExcelExport}
      onExportPdf={() => void handlePdfExport()}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  )
}
