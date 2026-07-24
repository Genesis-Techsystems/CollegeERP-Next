'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, Pencil, PlusIcon } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  createCounselorActivities,
  listActiveCollegesForDepartments,
  listCounselorActivitiesForStudent,
  listCounselorActivitiesInDateRange,
  listCounselorStudentsForEmployee,
  listCounselorStudentsInDateRange,
  searchEmployeesForMentorship,
  updateCounselorActivity,
  type MentorshipRow,
} from '@/services'
import type { College } from '@/types/college'
import { MeetingOverviewModal } from './MeetingOverviewModal'
import { ScheduleMeetingModal } from './ScheduleMeetingModal'

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
  actions: { headerName: 'Actions', minWidth: 180, width: 180, flex: 0 } as ColDef<MeetingRow>,
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

function activityStatus(row: MeetingRow | undefined): string {
  return String(row?.activityStatusCode ?? '').toUpperCase()
}

type CounselorMeetingsPageProps = {
  mode: CounselorMeetingsMode
  title: string
}

function makeActionsRenderer(
  onEdit: (row: MeetingRow) => void,
  onMeeting: (row: MeetingRow) => void,
  onOverview: (row: MeetingRow) => void,
) {
  return (p: ICellRendererParams<MeetingRow>) => {
    const row = p.data
    if (!row) return null
    const scheduled = activityStatus(row) === 'SCHEDULED'
    return (
      <div className="flex items-center gap-1">
        {scheduled ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Edit scheduled meeting"
              onClick={() => onEdit(row)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="link"
              className="h-auto px-1 text-primary"
              onClick={() => onMeeting(row)}
            >
              Meeting
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="View meeting details"
          onClick={() => onOverview(row)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export function CounselorMeetingsPage({ mode, title }: Readonly<CounselorMeetingsPageProps>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryStudentId = Number(searchParams.get('studentId') || 0) || null
  const queryCollegeId = Number(searchParams.get('collegeId') || 0) || null
  const queryEmployeeId = Number(searchParams.get('employeeId') || 0) || null
  const queryEmpN = searchParams.get('empN')?.trim() || ''

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
  const [employees, setEmployees] = useState<MentorshipRow[]>([])
  const [employeeSearching, setEmployeeSearching] = useState(false)
  const [students, setStudents] = useState<MentorshipRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date())
  const [toDate, setToDate] = useState<Date | null>(() => new Date())
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [listReady, setListReady] = useState(false)
  const [counselorId, setCounselorId] = useState<number | null>(null)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<MeetingRow | null>(null)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [overviewRow, setOverviewRow] = useState<MeetingRow | null>(null)

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

  const resolveCounselorId = useCallback(
    (sid: number | null, activities: MeetingRow[]): number | null => {
      if (!sid) return null
      const fromStudent = Number(
        students.find((s) => Number(s.studentId) === sid)?.counselorId ?? 0,
      )
      if (fromStudent) return fromStudent
      const fromActivity = Number(activities[0]?.counselorId ?? 0)
      return fromActivity || null
    },
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

  const loadMeetings = useCallback(
    async (opts?: { sid?: number; silentEmpty?: boolean }) => {
      const cid = mode === 'staff' ? staffCollegeId : collegeId
      const eid = mode === 'staff' ? staffEmployeeId : employeeId
      const sid = opts?.sid ?? studentId
      if (!cid || !eid || !sid) {
        toastError('Please select a student')
        return
      }
      setLoading(true)
      setRows([])
      setListReady(true)
      try {
        let activities: MeetingRow[] = []
        let mappingCounselorId: number | null = null
        if (mode === 'admin') {
          const from = toYmd(fromDate)
          const to = toYmd(toDate)
          if (!from || !to) {
            toastError('Please select from and to dates')
            return
          }
          const result = await listCounselorActivitiesInDateRange({
            collegeId: cid,
            employeeId: eid,
            studentId: sid,
            fromDate: from,
            toDate: to,
          })
          activities = result.activities
          mappingCounselorId = result.counselorId
        } else {
          const result = await listCounselorActivitiesForStudent(cid, eid, sid)
          activities = result.activities
          mappingCounselorId = result.counselorId
        }
        setRows(activities)
        setCounselorId(mappingCounselorId || resolveCounselorId(sid, activities))
        if (activities.length === 0 && !opts?.silentEmpty) {
          toastSuccess('No meetings found for this filter.')
        }
      } catch (e) {
        toastError(getErrorMessage(e))
      } finally {
        setLoading(false)
      }
    },
    [
      mode,
      staffCollegeId,
      staffEmployeeId,
      collegeId,
      employeeId,
      studentId,
      fromDate,
      toDate,
      resolveCounselorId,
    ],
  )

  useEffect(() => {
    if (mode !== 'admin' || !queryCollegeId) return
    void (async () => {
      try {
        // Angular seeds employee via empN search; React Meeting History passes employeeId.
        if (queryEmployeeId) {
          const list = await listCounselorStudentsForEmployee(queryCollegeId, queryEmployeeId)
          setStudents(list)
          setEmployeeId(queryEmployeeId)
          if (queryStudentId) {
            setStudentId(queryStudentId)
            await loadMeetings({ sid: queryStudentId, silentEmpty: true })
          }
          return
        }
        if (queryEmpN.length >= 4) {
          const found = await searchEmployeesForMentorship(queryCollegeId, queryEmpN)
          setEmployees(found)
          setEmployeeOptions(
            found.map((e) => ({
              value: String(e.employeeId),
              label: employeeLabel(e),
            })),
          )
          const first = found[0]
          if (first?.employeeId) {
            const eid = Number(first.employeeId)
            setEmployeeId(eid)
            const from = toYmd(fromDate)
            const to = toYmd(toDate)
            if (from && to) {
              const list = await listCounselorStudentsInDateRange({
                collegeId: queryCollegeId,
                employeeId: eid,
                fromDate: from,
                toDate: to,
              })
              setStudents(list)
              if (queryStudentId) {
                setStudentId(queryStudentId)
                await loadMeetings({ sid: queryStudentId, silentEmpty: true })
              }
            }
          }
        }
      } catch (e) {
        toastError(getErrorMessage(e))
      }
    })()
    // Intentionally seed once from query params (Angular route.queryParams).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/query seed only
  }, [mode, queryCollegeId, queryEmployeeId, queryStudentId, queryEmpN])

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (!collegeId || q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearching(true)
    try {
      const found = await searchEmployeesForMentorship(collegeId, q)
      setEmployees(found)
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
    setListReady(false)
    setCounselorId(null)
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

  function openSchedule() {
    const cid = mode === 'staff' ? staffCollegeId : collegeId
    const mappedCounselorId =
      counselorId ||
      Number(students.find((s) => Number(s.studentId) === studentId)?.counselorId ?? 0) ||
      Number(rows[0]?.counselorId ?? 0) ||
      null
    if (!cid || !studentId) {
      toastError('Please select a student and load meetings first')
      return
    }
    if (!mappedCounselorId) {
      toastError('Counselor mapping not found for this student')
      return
    }
    setCounselorId(mappedCounselorId)
    setEditingRow(null)
    setScheduleOpen(true)
  }

  function openEdit(row: MeetingRow) {
    setEditingRow(row)
    setScheduleOpen(true)
  }

  function openOverview(row: MeetingRow) {
    setOverviewRow(row)
    setOverviewOpen(true)
  }

  function goToMeeting(row: MeetingRow) {
    const cid = mode === 'staff' ? staffCollegeId : collegeId
    const eid = mode === 'staff' ? staffEmployeeId : employeeId
    const sid = studentId ?? (Number(row.studentId ?? 0) || null)
    const student = students.find((s) => Number(s.studentId) === sid)
    const emp =
      employees.find((e) => Number(e.employeeId) === eid) ??
      (mode === 'staff'
        ? ({ empNumber: readStorage('empNumber') } as MentorshipRow)
        : undefined)
    const params = new URLSearchParams()
    if (row.counselorActivityId != null) {
      params.set('counselorActivityId', String(row.counselorActivityId))
    }
    if (row.nextScheduledActivityDate != null) {
      params.set(
        'nextScheduledActivityDate',
        format(new Date(String(row.nextScheduledActivityDate)), 'yyyy/MM/dd'),
      )
    }
    if (student) {
      params.set('student', String(student.studentName ?? student.firstName ?? ''))
    }
    if (sid) params.set('studentId', String(sid))
    if (cid) params.set('collegeId', String(cid))
    if (emp?.empNumber != null) params.set('empN', String(emp.empNumber))
    router.push(`/mentorship/teacher-meeting?${params.toString()}`)
  }

  async function onScheduleSaved(payload: MentorshipRow) {
    const activityId = Number(payload.counselorActivityId ?? 0)
    if (activityId > 0) {
      await updateCounselorActivity(activityId, payload)
      toastSuccess('Meeting updated')
    } else {
      const cid = Number(payload.counselorId ?? counselorId ?? 0)
      await createCounselorActivities([
        {
          ...payload,
          counselorId: cid || payload.counselorId,
        },
      ])
      toastSuccess('Meeting scheduled')
    }
    await loadMeetings({ silentEmpty: true })
  }

  const effectiveCollegeId = (mode === 'staff' ? staffCollegeId : collegeId) || 0
  const effectiveCounselorId =
    counselorId ||
    Number(editingRow?.counselorId ?? 0) ||
    Number(students.find((s) => Number(s.studentId) === studentId)?.counselorId ?? 0) ||
    Number(rows[0]?.counselorId ?? 0) ||
    0

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
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(openEdit, goToMeeting, openOverview),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderers close over latest handlers
    [students, employees, collegeId, employeeId, studentId, mode],
  )

  return (
    <FilteredListPage
      title={title}
      filters={
        <div className="space-y-3">
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
                  setListReady(false)
                  setCounselorId(null)
                  setEmployeeOptions([])
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
              <DatePicker
                label="From Date *"
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d)
                  setRows([])
                  setListReady(false)
                  if (d && toDate && d.getTime() > toDate.getTime()) setToDate(d)
                }}
                className="md:col-span-2"
                clearable={false}
              />
              <DatePicker
                label="To Date *"
                value={toDate}
                onChange={(d) => {
                  setToDate(d)
                  setRows([])
                  setListReady(false)
                }}
                className="md:col-span-2"
                clearable={false}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="Student *"
              value={studentId ? String(studentId) : null}
              onChange={(v) => {
                setStudentId(v ? Number(v) : null)
                setRows([])
                setListReady(false)
                setCounselorId(null)
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
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Search meetings…',
        exportPdf: true,
        pdfDocumentTitle: title,
      }}
      toolbarTrailing={
        listReady ? (
          <Button
            type="button"
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            onClick={openSchedule}
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Schedule Meeting
          </Button>
        ) : null
      }
    >
      {effectiveCollegeId > 0 && studentId && effectiveCounselorId > 0 ? (
        <ScheduleMeetingModal
          open={scheduleOpen}
          onClose={() => {
            setScheduleOpen(false)
            setEditingRow(null)
          }}
          row={editingRow}
          collegeId={effectiveCollegeId}
          counselorId={effectiveCounselorId}
          studentId={studentId}
          onSaved={onScheduleSaved}
        />
      ) : null}
      <MeetingOverviewModal
        open={overviewOpen}
        onClose={() => {
          setOverviewOpen(false)
          setOverviewRow(null)
        }}
        row={overviewRow}
      />
    </FilteredListPage>
  )
}
