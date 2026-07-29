'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { FileSpreadsheet, Printer } from 'lucide-react'
import type { ColDef } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { usePageNavLabel } from '@/common/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from '@/hooks/useCollegeLogo'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listActiveCollegesForGeneralSettings,
  listSchoolCalendarEvents,
  type CollegeEventRow,
} from '@/services'

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

/**
 * Angular `startDate | date: 'MMM d, y'`
 */
function formatEventDate(raw: string | undefined): string {
  if (!raw) return '-'
  const dt = new Date(String(raw))
  if (Number.isNaN(dt.getTime())) return String(raw)
  return format(dt, 'MMM d, yyyy')
}

function eventStartRaw(row: CollegeEventRow | undefined): string {
  return String(row?.startDate ?? row?.eventDate ?? '')
}

/**
 * Angular school-calender columns:
 * id | eventName | eventTypeName | eventDate (startDate | date:'MMM d, y')
 */
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
 * Angular `printPage()` → `window.print()`
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
 * Angular `exportAsExcel()`:
 * - reads `#excelTable` innerHTML
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
  link.download = 'College Calendar.xls'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
}

/**
 * Angular letterhead line: `localStorage.userName + '(' + localStorage.rollNumber + ')'`
 */
function buildStudentDetails(userName: string, rollNumber: string): string {
  const name = userName.trim()
  const roll = rollNumber.trim()
  if (!name) return ''
  if (roll && roll !== name) return `${name}(${roll})`
  return name
}

/**
 * College Calendar — Angular `SchoolCalenderComponent` parity.
 *
 * Angular getData():
 *   collegeId  = +localStorage.getItem('collegeId')
 *   academicYearId = +localStorage.getItem('academicYearId')
 *   GET collegecalendar?collegeId=&academicYearId=&isHoliday=true
 *
 * Angular getColleges() — called after data, only for print logo.
 */
export function SchoolCalendarPage() {
  const { user } = useSessionContext()
  const navLabel = usePageNavLabel()
  const pageTitle = navLabel ?? 'College Calendar'

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
        // ── Angular getData() ─────────────────────────────────────────────
        // Uses localStorage directly — no fallback year resolution.
        const cid = positiveId(readStorage('collegeId'), user?.collegeId)
        const ayId = positiveId(readStorage('academicYearId'), user?.academicYearId)

        if (!cid || !ayId) {
          if (!cancelled) setRows([])
          return
        }

        // Letterhead: userName(rollNumber) — Angular `getData()` sets this.
        const userName = readStorage('userName') || user?.userName || ''
        const rollNumber = readStorage('rollNumber') || ''
        const detailsLine = buildStudentDetails(userName, rollNumber)

        // College name for letterhead — Angular `localStorage.getItem('currentCollege')`.
        const name =
          readStorage('currentCollege') ||
          user?.collegeName ||
          readStorage('collegeName') ||
          ''

        if (!cancelled) {
          setCollegeName(name)
          setStudentDetails(detailsLine)
        }

        // GET collegecalendar?collegeId=&academicYearId=&isHoliday=true
        const data = await listSchoolCalendarEvents(cid, ayId)

        if (!cancelled) {
          setCollegeId(cid)
          setRows(Array.isArray(data) ? data : [])
        }

        // ── Angular getColleges() ─────────────────────────────────────────
        // Called after data loads, only to resolve the college logo.
        // We use useCollegeLogo(collegeId) hook which handles this — no separate call needed.
        if (!name && !cancelled) {
          try {
            const colleges = await listActiveCollegesForGeneralSettings()
            if (!cancelled) {
              const found = colleges.find((c) => Number(c.collegeId) === cid)
              if (found?.collegeName) setCollegeName(found.collegeName)
            }
          } catch {
            // logo fallback — non-critical
          }
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
          title={pageTitle}
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

      {/* Angular #excelTable — off-screen source for exportAsExcel(). */}
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

      {/* Portal to body so AppShell cannot blank the print sheet. */}
      {portalReady ? createPortal(printSheet, document.body) : null}

      <style jsx global>{`
        #school-calendar-print-root {
          display: none !important;
        }

        @media print {
          @page {
            margin: 0;
          }

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
