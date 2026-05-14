'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, List } from 'lucide-react'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { useCrudList } from '@/hooks/useCrudList'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toDateOnlyISO } from '@/common/generic-functions'
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
  if (!d) return '—'
  for (const k of keys) {
    const v = d[k]
    if (v == null) continue
    const t = String(v).trim()
    if (t !== '') return t
  }
  return '—'
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const COL_DEFS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AnySmsRow>,
  sentOn: { colId: 'sentOn', headerName: 'Sent on', minWidth: 130, flex: 0.9 } as ColDef<AnySmsRow>,
  toEmail: { colId: 'toEmail', headerName: 'To', minWidth: 180, flex: 1.1 } as ColDef<AnySmsRow>,
  subject: { colId: 'subject', headerName: 'Subject', minWidth: 200, flex: 1.4 } as ColDef<AnySmsRow>,
  fromEmail: { colId: 'fromEmail', headerName: 'From', minWidth: 160, flex: 1 } as ColDef<AnySmsRow>,
  status: { colId: 'status', headerName: 'Status', minWidth: 110, flex: 0.7 } as ColDef<AnySmsRow>,
}

function sentOnGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, [
    'sentDate',
    'sent_date',
    'emailDate',
    'email_date',
    'createdDt',
    'created_dt',
    'messagingDate',
    'messaging_date',
  ])
}

function toEmailGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, [
    'toEmail',
    'to_email',
    'recipientEmail',
    'recipient_email',
    'stdEmailId',
    'std_email_id',
    'email',
    'mailTo',
    'mail_to',
  ])
}

function subjectGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, ['subject', 'mailSubject', 'mail_subject', 'subjectLine', 'subject_line'])
}

function fromEmailGetter(p: ValueGetterParams<AnySmsRow>): string {
  return pickStr(p.data, ['fromEmail', 'from_email', 'fromEmailId', 'from_email_id', 'senderEmail', 'sender_email'])
}

function statusRenderer(p: ICellRendererParams<AnySmsRow>) {
  const d = p.data
  if (!d) return '—'
  for (const k of ['isDelivered', 'isSent', 'isSuccess', 'isActive', 'delivered'] as const) {
    const v = d[k]
    if (typeof v === 'boolean') return <StatusBadge status={v} />
  }
  const s = pickStr(d, ['status', 'deliveryStatus', 'delivery_status', 'emailStatus', 'email_status'])
  return s === '—' ? '—' : <span className="text-xs text-muted-foreground">{s}</span>
}

export default function EmailLogsPage() {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [principalLock, setPrincipalLock] = useState(false)
  const [fromDay, setFromDay] = useState<Date | null>(() => startOfMonth(new Date()))
  const [toDay, setToDay] = useState<Date | null>(() => new Date())

  const [rows, setRows] = useState<AnySmsRow[]>([])
  const [loading, setLoading] = useState(false)
  /** Second card (grid) only after user runs Get logs with valid filters. */
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
  }, [collegeId, fromDay, toDay])

  const collegeOptions = useMemo(
    () =>
      [...colleges]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ value: String(c.collegeId), label: c.collegeCode })),
    [colleges],
  )

  const loadLogs = useCallback(async () => {
    if (!collegeId || !fromDay || !toDay) {
      toastError('Select college, from date, and to date.')
      return
    }
    const fromDate = toDateOnlyISO(fromDay)
    const toDate = toDateOnlyISO(toDay)
    if (fromDate > toDate) {
      toastError('From date cannot be after to date.')
      return
    }
    setResultsVisible(true)
    setLoading(true)
    try {
      const data = await listEmailLogsForCollege({ collegeId, fromDate, toDate })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      toastError(getErrorMessage(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [collegeId, fromDay, toDay])

  const columnDefs = useMemo<ColDef<AnySmsRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.sentOn, valueGetter: sentOnGetter },
      { ...COL_DEFS.toEmail, valueGetter: toEmailGetter },
      { ...COL_DEFS.subject, valueGetter: subjectGetter },
      { ...COL_DEFS.fromEmail, valueGetter: fromEmailGetter },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card border-t-[3px] border-t-amber-300 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <List className="h-4 w-4 shrink-0" aria-hidden />
            Email logs
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-foreground hover:text-foreground/80"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            aria-controls="email-logs-filters"
          >
            Filter
            <Filter className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent id="email-logs-filters">
            <div className="grid grid-cols-1 gap-3 p-4 pt-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
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
              <DatePicker label="From *" value={fromDay} onChange={setFromDay} className="lg:col-span-3" clearable={false} />
              <DatePicker label="To *" value={toDay} onChange={setToDay} className="lg:col-span-3" clearable={false} />
              <div className="flex items-end lg:col-span-3">
                <Button type="button" className="w-full sm:w-auto" onClick={() => void loadLogs()} disabled={loading || !collegeId}>
                  {loading ? 'Loading…' : 'Get logs'}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {resultsVisible ? (
        <div className="app-card overflow-hidden p-0">
          <div className="border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">Sent email history</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Column labels map common field names from your API response. Adjust filters and use Get logs again to
              refresh.
            </p>
          </div>
          <div className="px-3 pb-3 pt-2">
            <DataTable<AnySmsRow>
              rowData={rows}
              columnDefs={columnDefs}
              loading={loading}
              pagination
              paginationPageSize={20}
              height="auto"
              getRowId={(p) => {
                const d = p.data
                if (!d) return `row-${p.node?.rowIndex ?? 0}`
                const id = Number(d.emailLogId ?? d.email_log_id ?? d.id ?? 0)
                if (id > 0) return String(id)
                return `${pickStr(d, ['createdDt', 'sentDate', 'sent_date'])}-${pickStr(d, ['subject', 'mailSubject'])}-${pickStr(d, ['toEmail', 'email'])}-${p.node?.rowIndex ?? 0}`
              }}
              toolbar={{ search: true, searchPlaceholder: 'Search logs…', pdfDocumentTitle: 'Email logs' }}
            />
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}
