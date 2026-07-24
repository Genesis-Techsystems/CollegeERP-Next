'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { FileSpreadsheet, Printer } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from '@/hooks/useCollegeLogo'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  listAcademicYearsForCollege,
  listActiveCollegesForGeneralSettings,
  listSchoolCalendarEvents,
  type CollegeEventRow,
} from '@/services'

/** Positive id helper (Angular localStorage ids are always > 0). */
function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function writeStorage(key: string, value: number | string) {
  if (typeof globalThis.window === 'undefined') return
  globalThis.localStorage.setItem(key, String(value))
}

/**
 * College Calendar holidays are keyed by the **college default / current**
 * academic year (Angular login → localStorage `academicYearId`, e.g. 101),
 * not a student's enrollment year (often 94/95 with no holiday rows).
 */
function pickCollegeCalendarAcademicYearId(
  years: Array<Record<string, unknown>>,
  preferredId: number,
): number {
  if (!years.length) return preferredId

  const idOf = (y: Record<string, unknown>) => positiveId(y.academicYearId)

  const def = years.find(
    (y) => y.isDefault === true || y.isDefault === 'true' || y.isDefault === 1,
  )
  if (def) return idOf(def)

  const today = Date.now()
  const inRange = years.find((y) => {
    const from = y.fromDate ? new Date(String(y.fromDate)).getTime() : NaN
    const to = y.toDate ? new Date(String(y.toDate)).getTime() : NaN
    return Number.isFinite(from) && Number.isFinite(to) && today >= from && today <= to
  })
  if (inRange) return idOf(inRange)

  if (preferredId && years.some((y) => idOf(y) === preferredId)) {
    return preferredId
  }

  const sorted = [...years].sort((a, b) => {
    const ta = new Date(String(a.fromDate ?? 0)).getTime()
    const tb = new Date(String(b.fromDate ?? 0)).getTime()
    return tb - ta
  })
  return idOf(sorted[0] ?? {}) || preferredId
}

/** Angular school-calender: `startDate | date: 'MMM d, y'`. */
function formatEventDate(raw: string | undefined): string {
  if (!raw) return '-'
  const dt = new Date(String(raw))
  if (Number.isNaN(dt.getTime())) return String(raw)
  return format(dt, 'MMM d, yyyy')
}

function eventStartRaw(row: CollegeEventRow | undefined): string {
  return String(row?.startDate ?? row?.eventDate ?? '')
}

const COL_DEFS: ColDef<CollegeEventRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'eventName', headerName: 'Event Name', minWidth: 180, flex: 1.2 },
  { field: 'eventTypeName', headerName: 'Event Type', minWidth: 140, flex: 1 },
  {
    colId: 'eventDate',
    headerName: 'Event Date',
    minWidth: 130,
    flex: 1,
    valueGetter: (p) => formatEventDate(eventStartRaw(p.data) || undefined),
  },
]

/**
 * Angular `printPage()` → `window.print()` on the **same** page.
 * Body class hides AppShell (which otherwise prints a blank white sheet) and
 * shows only the portaled letterhead + table.
 */
function printSchoolCalendarReport() {
  if (typeof document === 'undefined') return
  const prevTitle = document.title
  document.title = ''
  document.body.classList.add('school-calendar-printing')

  const restore = () => {
    document.body.classList.remove('school-calendar-printing')
    document.title = prevTitle
    globalThis.window.removeEventListener('afterprint', restore)
  }
  globalThis.window.addEventListener('afterprint', restore)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      globalThis.window.print()
      setTimeout(restore, 1500)
    })
  })
}

/**
 * Angular `SchoolCalenderComponent.exportAsExcel()`:
 * - reads `#excelTable` innerHTML (hidden title + mat-table)
 * - wraps in Excel HTML template
 * - downloads `College Calendar.xls`
 */
function exportAsExcel(excelTableEl: HTMLElement | null) {
  if (!excelTableEl || typeof document === 'undefined') {
    toastError('Nothing to export.')
    return
  }

  const template =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>'

  const fill = (s: string, c: Record<string, string>) =>
    s.replace(/{(\w+)}/g, (_, key: string) => c[key] ?? '')

  const html = fill(template, {
    worksheet: 'Worksheet',
    table: excelTableEl.innerHTML,
  })

  const link = document.createElement('a')
  // Angular: trafoexternalItem = 'College Calendar'
  link.download = 'College Calendar.xls'

  // Blob download is more reliable for large holiday lists; same .xls content as Angular.
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}

/**
 * Angular `getData()` letterhead line:
 * `localStorage.userName + '(' + localStorage.rollNumber + ')'`
 */
function buildAngularStudentDetails(userName: string, rollNumber: string): string {
  const name = userName.trim()
  const roll = rollNumber.trim()
  if (!name) return ''
  if (roll && roll !== name) return `${name}(${roll})`
  return name
}

function studentDisplayNameFromDetail(detail: Record<string, unknown>): string {
  const parts = [detail.firstName, detail.middleName, detail.lastName]
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
  if (parts.length) return parts.join(' ')
  for (const key of ['studentName', 'name', 'userName'] as const) {
    const v = String(detail[key] ?? '').trim()
    if (v) return v
  }
  return ''
}

function studentRollFromDetail(detail: Record<string, unknown>): string {
  for (const key of [
    'hallticketNumber',
    'hallTicketNumber',
    'rollNumber',
    'rollNo',
    'admissionNumber',
  ] as const) {
    const v = String(detail[key] ?? '').trim()
    if (v) return v
  }
  return ''
}

/**
 * Angular `SchoolCalenderComponent`:
 * - getData() → GET collegecalendar?collegeId=&academicYearId=&isHoliday=true
 * - getColleges() → GET domain/list/College?size=99999&query=isActive==true
 */
export function SchoolCalendarPage() {
  const { user } = useSessionContext()

  const [collegeId, setCollegeId] = useState(0)
  const [collegeName, setCollegeName] = useState('')
  const [studentDetails, setStudentDetails] = useState('')
  const [rows, setRows] = useState<CollegeEventRow[]>([])
  const [loading, setLoading] = useState(true)

  const orgCode = user?.organizationCode || readStorage('orgCode')
  const logoUrl = useCollegeLogo(collegeId || null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // ── Angular getColleges() ──────────────────────────────────────────
        // GET /api/proxy/domain/list/College?size=99999&query=isActive==true
        const colleges = await listActiveCollegesForGeneralSettings()
        if (cancelled) return

        // Resolve collegeId like Angular localStorage, then session, then list.
        let cid = positiveId(
          user?.collegeId,
          readStorage('collegeId'),
        )
        if (!cid && colleges.length > 0) {
          const byName = colleges.find(
            (c) =>
              c.collegeName ===
              (user?.collegeName || readStorage('currentCollege')),
          )
          cid = positiveId(byName?.collegeId, colleges[0]?.collegeId)
        }

        // Angular uses localStorage academicYearId. Student React sessions often
        // carry enrollment year (94) while holidays live on college default (101).
        // Try session/storage first; if empty, fall back to isDefault / current year.
        const preferredAy = positiveId(
          readStorage('academicYearId'),
          user?.academicYearId,
        )
        let ayId = preferredAy

        if (!cid) {
          toastError(
            'College / academic year not found. Please log in again.',
          )
          setRows([])
          return
        }

        const years = (await listAcademicYearsForCollege(cid)) as Array<
          Record<string, unknown>
        >
        if (cancelled) return

        if (!ayId) {
          ayId = pickCollegeCalendarAcademicYearId(years, 0)
        }

        if (!ayId) {
          toastError(
            'College / academic year not found. Please log in again.',
          )
          setRows([])
          return
        }

        const name =
          user?.collegeName ||
          readStorage('currentCollege') ||
          colleges.find((c) => Number(c.collegeId) === cid)?.collegeName ||
          readStorage('collegeName') ||
          ''
        if (name) writeStorage('currentCollege', name)

        // Angular letterhead: userName(rollNumber) from localStorage after login getStudent().
        let printUserName = readStorage('userName') || user?.userName || ''
        let printRoll = readStorage('rollNumber')
        // Session sync incorrectly mirrored userName into rollNumber — ignore that.
        if (printRoll && printRoll === (user?.userName || printUserName)) {
          printRoll = ''
        }
        const sid = positiveId(user?.studentId, readStorage('studentId'))
        const uid = positiveId(user?.userId)
        if (sid || uid) {
          const detail = (sid
            ? await fetchStudentDetail(sid)
            : await fetchStudentDetailByUserId(uid)) as Record<
            string,
            unknown
          > | null
          if (cancelled) return
          if (detail) {
            const fromDetail = studentDisplayNameFromDetail(detail)
            const rollFromDetail = studentRollFromDetail(detail)
            if (fromDetail) {
              printUserName = fromDetail
              writeStorage('userName', fromDetail)
            }
            if (rollFromDetail) {
              printRoll = rollFromDetail
              writeStorage('rollNumber', rollFromDetail)
            }
          }
        }
        const detailsLine = buildAngularStudentDetails(printUserName, printRoll)

        if (!cancelled) {
          setCollegeId(cid)
          setCollegeName(name)
          setStudentDetails(detailsLine)
        }

        // ── Angular getData() ──────────────────────────────────────────────
        // GET /api/proxy/collegecalendar?collegeId=&academicYearId=&isHoliday=true
        let data = await listSchoolCalendarEvents(cid, ayId)
        if (
          (!Array.isArray(data) || data.length === 0) &&
          years.length > 0
        ) {
          const fallbackAy = pickCollegeCalendarAcademicYearId(years, 0)
          if (fallbackAy > 0 && fallbackAy !== ayId) {
            data = await listSchoolCalendarEvents(cid, fallbackAy)
            if (Array.isArray(data) && data.length > 0) ayId = fallbackAy
          }
        }
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (!cancelled) {
          toastError(getErrorMessage(e))
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    user?.collegeId,
    user?.academicYearId,
    user?.collegeName,
    user?.studentId,
    user?.userId,
    user?.userName,
  ])

  const columnDefs = useMemo(() => COL_DEFS, [])
  const [portalReady, setPortalReady] = useState(false)
  const excelTableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setPortalReady(true)
  }, [])

  const printSheet = (
    <div id="school-calendar-print-root" className="school-calendar-print">
      {orgCode !== 'SUK' ? (
        <table className="letterhead">
          <tbody>
            <tr>
              <td className="logo-cell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || DEFAULT_COLLEGE_LOGO}
                  alt=""
                  className="portraitLogo"
                />
              </td>
              <td className="text-cell">
                <p className="collegeName">{collegeName}</p>
                <p className="title">College Calendar</p>
                <p className="details">{studentDetails}</p>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="suk-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || DEFAULT_COLLEGE_LOGO}
            alt=""
            className="suk-logo"
          />
          <p className="collegeName">{collegeName}</p>
          <p className="title">College Calendar</p>
          <p className="details">{studentDetails}</p>
        </div>
      )}

      <table className="school-calendar-print-table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>SI.No</th>
            <th>Event Name</th>
            <th>Event Type</th>
            <th>Event Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(
                (row as { collegeCalendarId?: number }).collegeCalendarId ??
                  row.eventId ??
                  index,
              )}
              className={index % 2 === 1 ? 'alt' : undefined}
            >
              <td className="ctr">{index + 1}</td>
              <td>{row.eventName ?? ''}</td>
              <td>{row.eventTypeName ?? ''}</td>
              <td>{formatEventDate(eventStartRaw(row) || undefined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div id="printNone">
        <ListPage
          title="College Calendar"
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search',
            exportExcel: false,
            exportPdf: false,
          }}
          toolbarTrailing={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={() => exportAsExcel(excelTableRef.current)}
                disabled={loading || rows.length === 0}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-[12px]"
                onClick={() => printSchoolCalendarReport()}
                disabled={loading || rows.length === 0}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>
          }
        />
      </div>

      {/*
        Angular `#excelTable` — off-screen source for exportAsExcel().
        Contains hidden title + holidays table (same columns as screen grid).
      */}
      <div
        ref={excelTableRef}
        id="excelTable"
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
      >
        <strong style={{ display: 'none' }}>
          {`College Calendar \u00A0-\u00A0(${collegeName}) `}
        </strong>
        <table id="schoolCalender">
          <thead>
            <tr>
              <th>SI.No</th>
              <th>Event Name</th>
              <th>Event Type</th>
              <th>Event Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(
                  (row as { collegeCalendarId?: number }).collegeCalendarId ??
                    row.eventId ??
                    index,
                )}
              >
                <td className="text-ctr">{index + 1}</td>
                <td>{row.eventName ?? ''}</td>
                <td>{row.eventTypeName ?? ''}</td>
                <td>{formatEventDate(eventStartRaw(row) || undefined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Portal to body so AppShell overflow/opacity cannot blank the sheet. */}
      {portalReady
        ? createPortal(printSheet, document.body)
        : null}

      <style jsx global>{`
        /* Screen: keep print sheet out of the layout (Angular print block is off-screen / CSS-hidden). */
        #school-calendar-print-root {
          display: none !important;
        }

        @media print {
          @page {
            margin: 0;
          }

          /* Hide AppShell + page UI; only the portaled print root remains. */
          body.school-calendar-printing > *:not(#school-calendar-print-root) {
            display: none !important;
            visibility: hidden !important;
          }

          body.school-calendar-printing,
          body.school-calendar-printing #school-calendar-print-root {
            display: block !important;
            visibility: visible !important;
            background: #fff !important;
            color: #000 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body.school-calendar-printing #school-calendar-print-root {
            padding: 16px 18px !important;
            position: static !important;
          }

          #school-calendar-print-root .letterhead {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          #school-calendar-print-root .letterhead td {
            border: none !important;
            vertical-align: top;
            padding: 0;
          }
          #school-calendar-print-root .logo-cell {
            width: 120px;
          }
          #school-calendar-print-root .portraitLogo {
            height: 90px;
            width: auto;
            max-width: 120px;
            object-fit: contain;
          }
          #school-calendar-print-root .suk-header {
            text-align: center;
          }
          #school-calendar-print-root .suk-logo {
            max-height: 100px;
            max-width: 100%;
            object-fit: contain;
          }
          #school-calendar-print-root .collegeName {
            text-align: center !important;
            font-size: 26px !important;
            margin-top: 20px !important;
            margin-bottom: -10px !important;
            font-weight: 550 !important;
            color: #000 !important;
          }
          #school-calendar-print-root .title {
            text-align: center !important;
            font-size: 24px !important;
            margin-top: 6px !important;
            margin-bottom: -10px !important;
            font-weight: 550 !important;
            color: #000 !important;
          }
          #school-calendar-print-root .details {
            text-align: center !important;
            font-size: 22px !important;
            margin-top: 8px !important;
            font-weight: 500 !important;
            color: #000 !important;
          }
          #school-calendar-print-root .school-calendar-print-table {
            width: 97% !important;
            margin: 12px 16px 0 !important;
            border-collapse: collapse !important;
            font-size: 13px;
          }
          #school-calendar-print-root .school-calendar-print-table th,
          #school-calendar-print-root .school-calendar-print-table td {
            border: 1px solid #96aacb !important;
            padding: 6px 8px;
            color: #000 !important;
          }
          #school-calendar-print-root .school-calendar-print-table th {
            background: #c5d4eb !important;
            font-weight: 700;
            text-align: center !important;
          }
          #school-calendar-print-root .school-calendar-print-table td {
            text-align: left;
          }
          #school-calendar-print-root .school-calendar-print-table td.ctr {
            text-align: center !important;
          }
          #school-calendar-print-root .school-calendar-print-table tr.alt td {
            background: #eef3f9 !important;
          }
          #school-calendar-print-root thead {
            display: table-header-group;
          }
          #school-calendar-print-root tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  )
}
