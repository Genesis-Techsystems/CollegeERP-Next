'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toExamApiDate } from '@/common/generic-functions'
import { listActiveCollegesForDepartments, listEmailLogsForCollege, type AnySmsRow } from '@/services'
import type { College } from '@/types/college'

function readPrincipalCollegeLock(): { locked: boolean; collegeId: number | null } {
  if (globalThis.window === undefined) return { locked: false, collegeId: null }
  const raw =
    globalThis.localStorage?.getItem('isPRINCIPAL') ?? globalThis.localStorage?.getItem('isPrincipal') ?? ''
  const locked = raw === 'true' || raw === '1'
  const cid = Number(globalThis.localStorage?.getItem('collegeId') ?? 0)
  return { locked, collegeId: Number.isFinite(cid) && cid > 0 ? cid : null }
}

function pickStr(d: AnySmsRow | undefined, keys: string[]): string {
  if (!d) return ''
  for (const k of keys) {
    const v = d[k]
    if (v == null) continue
    const t = String(v).trim()
    if (t !== '') return t
  }
  return ''
}

/** Angular `| date : 'MMMM d, y'`. */
function formatEmailDate(raw: unknown): string {
  if (raw == null || raw === '') return '—'
  const s = String(raw)
  let d = parseISO(s)
  if (!isValid(d)) d = new Date(s)
  return isValid(d) ? format(d, 'MMMM d, yyyy') : s
}

const COL_DEFS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AnySmsRow>,
  emailTo: { colId: 'emailTo', headerName: 'Email To', minWidth: 200, flex: 1.2 } as ColDef<AnySmsRow>,
  emailId: { colId: 'emailId', headerName: 'Email', minWidth: 180, flex: 1.1 } as ColDef<AnySmsRow>,
  messageSentDate: { colId: 'messageSentDate', headerName: 'Email Date', minWidth: 140, flex: 0.9 } as ColDef<AnySmsRow>,
  collegeCode: { colId: 'collegeCode', headerName: 'College', minWidth: 110, flex: 0.7 } as ColDef<AnySmsRow>,
  status: { colId: 'status', headerName: 'Status', minWidth: 110, flex: 0.7 } as ColDef<AnySmsRow>,
}

/** Angular: stdName (rollNumber) and/or empName (empNumber). */
function emailToRenderer(p: ICellRendererParams<AnySmsRow>) {
  const d = p.data
  if (!d) return '—'
  const stdName = pickStr(d, ['stdName', 'std_name'])
  const rollNumber = pickStr(d, ['rollNumber', 'roll_number'])
  const empName = pickStr(d, ['empName', 'emp_name'])
  const empNumber = pickStr(d, ['empNumber', 'emp_number'])

  const parts: ReactNode[] = []
  if (stdName) {
    parts.push(
      <span key="std">
        {stdName}
        {rollNumber ? <span className="text-muted-foreground"> ({rollNumber})</span> : null}
      </span>,
    )
  }
  if (empName) {
    parts.push(
      <span key="emp">
        {empName}
        {empNumber ? <span className="text-muted-foreground"> ({empNumber})</span> : null}
      </span>,
    )
  }
  if (parts.length === 0) return '—'
  return <span className="inline-flex flex-col gap-0.5">{parts}</span>
}

function emailIdGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, ['emailId', 'email_id', 'email']) || '—'
}

function messageSentDateGetter(p: ValueGetterParams<AnySmsRow>): string {
  return formatEmailDate(p.data?.messageSentDate ?? p.data?.message_sent_date)
}

function collegeCodeGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, ['collegeCode', 'college_code']) || '—'
}

function statusRenderer(p: ICellRendererParams<AnySmsRow>) {
  const d = p.data
  if (!d) return '—'
  const raw = d.isSuccessful ?? d.is_successful
  if (typeof raw !== 'boolean') return '—'
  return <StatusBadge status={raw} label={raw ? 'Success' : 'Fail'} />
}

export default function EmailLogsPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [principalLock, setPrincipalLock] = useState(false)
  const [day, setDay] = useState<Date | null>(() => new Date())

  const [rows, setRows] = useState<AnySmsRow[]>([])
  const [loading, setLoading] = useState(false)
  /** Grid only after user runs Get Logs with valid filters (Angular shows table when staff.length > 0). */
  const [resultsVisible, setResultsVisible] = useState(false)

  const { data: colleges, isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.emailSms.emailLogsColleges(),
    queryFn: listActiveCollegesForDepartments,
  })

  useEffect(() => {
    const { locked, collegeId: forcedCid } = readPrincipalCollegeLock()
    setPrincipalLock(locked)
    if (!colleges.length) return
    if (locked && forcedCid && colleges.some((c) => c.collegeId === forcedCid)) {
      setCollegeId(forcedCid)
      return
    }
    if (!locked) {
      setCollegeId((prev) => prev ?? colleges[0].collegeId)
    }
  }, [colleges])

  useEffect(() => {
    setResultsVisible(false)
    setRows([])
  }, [collegeId, day])

  const collegeOptions = useMemo(
    () =>
      [...colleges]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ value: String(c.collegeId), label: c.collegeCode })),
    [colleges],
  )

  const loadLogs = useCallback(async () => {
    if (!collegeId || !day) {
      toastError('Select college and date.')
      return
    }
    const messageSentDate = toExamApiDate(day)
    if (!messageSentDate) {
      toastError('Select a valid date.')
      return
    }
    setResultsVisible(true)
    setLoading(true)
    try {
      const data = await listEmailLogsForCollege({ collegeId, messageSentDate })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      toastError(getErrorMessage(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [collegeId, day])

  const columnDefs = useMemo<ColDef<AnySmsRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.emailTo, cellRenderer: emailToRenderer },
      { ...COL_DEFS.emailId, valueGetter: emailIdGetter },
      { ...COL_DEFS.messageSentDate, valueGetter: messageSentDateGetter },
      { ...COL_DEFS.collegeCode, valueGetter: collegeCodeGetter },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <FilteredListPage
      title="Email Logs"
      filters={(
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={collegeOptions}
            searchable
            disabled={principalLock}
            isLoading={collegesLoading}
            className="lg:col-span-3"
          />
          <DatePicker label="Date *" value={day} onChange={setDay} className="lg:col-span-3" clearable={false} />
          <div className="flex items-end lg:col-span-3">
            <Button type="button" className="w-full sm:w-auto" onClick={() => void loadLogs()} disabled={loading || !collegeId}>
              {loading ? 'Loading…' : 'Get Logs'}
            </Button>
          </div>
        </div>
      )}
      rowData={resultsVisible ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={20}
      height="auto"
      getRowId={(p) => {
        const d = p.data
        if (!d) return 'row-0'
        const id = Number(d.messagingRecipientsId ?? d.messaging_recipients_id ?? d.emailLogId ?? d.id ?? 0)
        if (id > 0) return String(id)
        return `${pickStr(d, ['messageSentDate', 'emailId'])}-${pickStr(d, ['stdName', 'empName'])}-${pickStr(d, ['rollNumber', 'empNumber'])}`
      }}
      toolbar={{
        search: resultsVisible,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Email Logs',
      }}
    />
  )
}
