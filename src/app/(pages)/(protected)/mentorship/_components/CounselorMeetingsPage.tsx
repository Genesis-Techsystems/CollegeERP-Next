'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DatePicker } from '@/common/components/date-picker'
import { FilterCard } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  listActiveCollegesForDepartments,
  listCounselorActivitiesForStudent,
  listCounselorActivitiesInDateRange,
  listCounselorStudentsForEmployee,
  listCounselorStudentsInDateRange,
  searchEmployeesForMentorship,
  type MentorshipRow,
} from '@/services'
import type { College } from '@/types/college'

type MeetingRow = MentorshipRow

export type CounselorMeetingsMode = 'staff' | 'admin'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<MeetingRow>,
  activityType: { field: 'activityTypeCode', headerName: 'Activity Type', minWidth: 120 } as ColDef<MeetingRow>,
  nextDate: { field: 'nextScheduledActivityDate', headerName: 'Next Scheduled', minWidth: 130 } as ColDef<MeetingRow>,
  attendees: { field: 'attendeesName', headerName: 'Attendees', minWidth: 140 } as ColDef<MeetingRow>,
  discussion: { field: 'discussionPoints', headerName: 'Discussion Points', minWidth: 160 } as ColDef<MeetingRow>,
  summary: { field: 'summary', headerName: 'Summary', minWidth: 140 } as ColDef<MeetingRow>,
  activityDate: { field: 'activityDate', headerName: 'Activity Date', minWidth: 120 } as ColDef<MeetingRow>,
  status: { field: 'activityStatusCode', headerName: 'Status', minWidth: 100 } as ColDef<MeetingRow>,
}

function readStorageNum(key: string): number {
  return Number(readStorage(key) || 0) || 0
}

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function toYmd(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

function employeeLabel(row: MentorshipRow): string {
  const name = String(row.firstName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return `${name}${num}`.trim() || String(row.employeeId ?? '')
}

function studentOptionLabel(row: MentorshipRow): string {
  const name = String(row.studentName ?? row.firstName ?? '')
  const roll = row.rollNumber != null ? ` (${String(row.rollNumber)})` : ''
  return `${name}${roll}`.trim() || String(row.studentId ?? '')
}

type CounselorMeetingsPageProps = {
  mode: CounselorMeetingsMode
  title: string
}

export function CounselorMeetingsPage({ mode, title }: Readonly<CounselorMeetingsPageProps>) {
  const searchParams = useSearchParams()
  const queryStudentId = Number(searchParams.get('studentId') || 0) || null
  const queryCollegeId = Number(searchParams.get('collegeId') || 0) || null
  const queryEmployeeId = Number(searchParams.get('employeeId') || 0) || null

  const staffCollegeId = readStorageNum('collegeId')
  const staffEmployeeId = readStorageNum('employeeId')

  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(
    mode === 'staff' ? staffCollegeId || null : queryCollegeId,
  )
  const [employeeId, setEmployeeId] = useState<number | null>(
    mode === 'staff' ? staffEmployeeId || null : queryEmployeeId,
  )
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeSearching, setEmployeeSearching] = useState(false)
  const [students, setStudents] = useState<MentorshipRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date())
  const [toDate, setToDate] = useState<Date | null>(() => new Date())
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'admin') {
      void listActiveCollegesForDepartments()
        .then(setColleges)
        .catch(() => setColleges([]))
    }
  }, [mode])

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
      })),
    [colleges],
  )

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: String(s.studentId),
        label: studentOptionLabel(s),
      })),
    [students],
  )

  const loadStudentsForStaff = useCallback(async (cid: number, eid: number) => {
    try {
      const list = await listCounselorStudentsForEmployee(cid, eid)
      setStudents(list)
    } catch (e) {
      toastError(getErrorMessage(e))
      setStudents([])
    }
  }, [])

  useEffect(() => {
    if (mode === 'staff' && staffCollegeId && staffEmployeeId) {
      void loadStudentsForStaff(staffCollegeId, staffEmployeeId)
    }
  }, [mode, staffCollegeId, staffEmployeeId, loadStudentsForStaff])

  useEffect(() => {
    if (mode !== 'admin' || !queryCollegeId || !queryEmployeeId) return
    void (async () => {
      try {
        const list = await listCounselorStudentsForEmployee(queryCollegeId, queryEmployeeId)
        setStudents(list)
        if (queryStudentId) setStudentId(queryStudentId)
      } catch (e) {
        toastError(getErrorMessage(e))
      }
    })()
  }, [mode, queryCollegeId, queryEmployeeId, queryStudentId])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (!collegeId || q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearching(true)
    try {
      const found = await searchEmployeesForMentorship(collegeId, q)
      setEmployeeOptions(
        found.map((e) => ({
          value: String(e.employeeId),
          label: employeeLabel(e),
        })),
      )
    } catch (e) {
      toastError(getErrorMessage(e))
      setEmployeeOptions([])
    } finally {
      setEmployeeSearching(false)
    }
  }

  async function onEmployeeSelected(eid: number | null) {
    setEmployeeId(eid)
    setStudentId(null)
    setStudents([])
    setRows([])
    if (!eid || !collegeId) return
    if (mode === 'admin') {
      const from = toYmd(fromDate)
      const to = toYmd(toDate)
      if (!from || !to) return
      try {
        const list = await listCounselorStudentsInDateRange({
          collegeId,
          employeeId: eid,
          fromDate: from,
          toDate: to,
        })
        setStudents(list)
      } catch (e) {
        toastError(getErrorMessage(e))
      }
    }
  }

  async function loadMeetings() {
    const cid = mode === 'staff' ? staffCollegeId : collegeId
    const eid = mode === 'staff' ? staffEmployeeId : employeeId
    if (!cid || !eid || !studentId) {
      toastError('Please select a student')
      return
    }
    setLoading(true)
    setRows([])
    try {
      let activities: MeetingRow[] = []
      if (mode === 'admin') {
        const from = toYmd(fromDate)
        const to = toYmd(toDate)
        if (!from || !to) {
          toastError('Please select from and to dates')
          return
        }
        activities = await listCounselorActivitiesInDateRange({
          collegeId: cid,
          employeeId: eid,
          studentId,
          fromDate: from,
          toDate: to,
        })
      } else {
        activities = await listCounselorActivitiesForStudent(cid, eid, studentId)
      }
      setRows(activities)
      if (activities.length === 0) toastSuccess('No meetings found for this filter.')
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const columnDefs = useMemo<ColDef<MeetingRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.activityType,
      COL_DEFS.nextDate,
      COL_DEFS.attendees,
      COL_DEFS.discussion,
      COL_DEFS.summary,
      COL_DEFS.activityDate,
      COL_DEFS.status,
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">{title}</h1>
      </div>

      <FilterCard title="Filter" bodyClassName="space-y-4">
        {mode === 'admin' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="College *"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => {
                setCollegeId(v ? Number(v) : null)
                setEmployeeId(null)
                setStudents([])
                setStudentId(null)
                setRows([])
              }}
              options={collegeOptions}
              searchable
              className="md:col-span-3"
            />
            <Select
              label="Counselor / Employee *"
              value={employeeId ? String(employeeId) : null}
              onChange={(v) => void onEmployeeSelected(v ? Number(v) : null)}
              options={employeeOptions}
              searchable
              isLoading={employeeSearching}
              disabled={!collegeId}
              onSearch={(term) => void onEmployeeSearch(term)}
              className="md:col-span-4"
            />
            <DatePicker label="From Date *" value={fromDate} onChange={setFromDate} className="md:col-span-2" clearable={false} />
            <DatePicker label="To Date *" value={toDate} onChange={setToDate} className="md:col-span-2" clearable={false} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="Student *"
            value={studentId ? String(studentId) : null}
            onChange={(v) => {
              setStudentId(v ? Number(v) : null)
              setRows([])
            }}
            options={studentOptions}
            searchable
            className="md:col-span-4"
          />
          <div className="md:col-span-2">
            <Button type="button" onClick={() => void loadMeetings()} disabled={loading}>
              {loading ? 'Loading…' : 'Get Meetings'}
            </Button>
          </div>
        </div>
      </FilterCard>

      {rows.length > 0 || loading ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search meetings…',
              pdfDocumentTitle: title,
            }}
          />
        </TableCard>
      ) : null}
    </PageContainer>
  )
}
