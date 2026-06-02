'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon, Trash2 } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ConfirmDialog, FilterCard } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  deleteCollegeEvent,
  listAcademicYearsForCollege,
  listActiveCollegesForDepartments,
  listCollegeCalendarMonthEvents,
  listEventsByCollegeAndYear,
  listGeneralDetailsByMaster,
  listStaffAudienceEvents,
  listStudentAudienceEvents,
  saveCollegeEvents,
  type CollegeEventRow,
} from '@/services'
import { GM_CODES } from '@/config/constants/ui'
import type { College } from '@/types/college'
import { EventModal } from './EventModal'
import { EventsMonthCalendar } from './EventsMonthCalendar'

export type CollegeEventsVariant = 'manage' | 'calendar-view' | 'staff' | 'student' | 'school'

type CollegeEventsPageProps = {
  title: string
  variant: CollegeEventsVariant
}

function readStorageNum(key: string): number {
  if (typeof globalThis.window === 'undefined') return 0
  return Number(globalThis.localStorage.getItem(key) || 0) || 0
}

function formatDisplayDate(raw: string | undefined): string {
  if (!raw) return ''
  const dt = new Date(raw)
  if (Number.isNaN(dt.getTime())) return raw
  return format(dt, 'dd MMM yyyy')
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CollegeEventRow>,
  name: { field: 'eventName', headerName: 'Event Name', minWidth: 160 } as ColDef<CollegeEventRow>,
  startDate: { headerName: 'Start Date', minWidth: 120 } as ColDef<CollegeEventRow>,
  type: { field: 'eventTypeName', headerName: 'Event Type', minWidth: 120 } as ColDef<CollegeEventRow>,
  audience: { field: 'audienceTypeDisplayName', headerName: 'Audience', minWidth: 120 } as ColDef<CollegeEventRow>,
  holiday: { field: 'isHoliday', headerName: 'Holiday', minWidth: 90, flex: 0 } as ColDef<CollegeEventRow>,
  status: { field: 'eventStatusDisplayName', headerName: 'Status', minWidth: 110 } as ColDef<CollegeEventRow>,
  actions: { headerName: 'Actions', minWidth: 100, width: 100, flex: 0 } as ColDef<CollegeEventRow>,
}

function holidayRenderer(p: ICellRendererParams<CollegeEventRow>) {
  return <StatusBadge status={p.data?.isHoliday === true} label={p.data?.isHoliday ? 'Yes' : 'No'} />
}

export function CollegeEventsPage({ title, variant }: Readonly<CollegeEventsPageProps>) {
  const isManage = variant === 'manage'
  const isStaff = variant === 'staff'
  const isStudent = variant === 'student'
  const isCalendarView = variant === 'calendar-view'
  const useMonthCalendar = isManage || isCalendarView || isStaff || isStudent
  const useStorageFilters = isStaff || isStudent || variant === 'school'

  const [colleges, setColleges] = useState<College[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(
    useStorageFilters ? readStorageNum('collegeId') || null : null,
  )
  const [academicYears, setAcademicYears] = useState<{ academicYearId?: number; academicYear?: string }[]>([])
  const [academicYearId, setAcademicYearId] = useState<number | null>(
    useStorageFilters ? readStorageNum('academicYearId') || null : null,
  )
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date())
  const [rows, setRows] = useState<CollegeEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CollegeEventRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CollegeEventRow | null>(null)
  const [staffAudienceId, setStaffAudienceId] = useState<number | null>(null)
  const [calendarLoaded, setCalendarLoaded] = useState(false)
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | undefined>(undefined)

  const universityId = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId)?.universityId,
    [colleges, collegeId],
  )

  useEffect(() => {
    if (!useStorageFilters) {
      void listActiveCollegesForDepartments()
        .then(setColleges)
        .catch(() => setColleges([]))
    } else if (collegeId) {
      void listActiveCollegesForDepartments()
        .then((list) => setColleges(list.filter((c) => c.collegeId === collegeId)))
        .catch(() => setColleges([]))
    }
  }, [useStorageFilters, collegeId])

  useEffect(() => {
    if (isStaff) {
      void listGeneralDetailsByMaster(GM_CODES.AUDIENCE).then((list) => {
        const emp = list.find(
          (a) => String((a as { generalDetailCode?: string }).generalDetailCode) === 'EMP',
        )
        if (emp) setStaffAudienceId(Number((emp as { generalDetailId?: number }).generalDetailId))
      })
    }
    if (isStudent) {
      void listGeneralDetailsByMaster(GM_CODES.AUDIENCE).then((list) => {
        const std = list.find(
          (a) => String((a as { generalDetailCode?: string }).generalDetailCode) === 'STD',
        )
        if (std) setStaffAudienceId(Number((std as { generalDetailId?: number }).generalDetailId))
      })
    }
  }, [isStaff, isStudent])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? String(c.collegeId) })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId),
        label: String(ay.academicYear ?? ay.academicYearId),
      })),
    [academicYears],
  )

  async function onCollegeChange(cid: number | null) {
    setCollegeId(cid)
    setAcademicYearId(null)
    setAcademicYears([])
    setRows([])
    if (!cid) return
    try {
      const ay = await listAcademicYearsForCollege(cid)
      setAcademicYears(ay)
      if (ay.length > 0 && variant === 'calendar-view') {
        setAcademicYearId(Number(ay[0]!.academicYearId))
      }
    } catch {
      setAcademicYears([])
    }
  }

  const loadEvents = useCallback(async () => {
    if (!collegeId || !academicYearId) return
    setLoading(true)
    setRows([])
    try {
      let data: CollegeEventRow[] = []
      const apiDate = useMonthCalendar ? viewMonth : selectedDate
      if (isCalendarView) {
        const all = await listEventsByCollegeAndYear(collegeId, academicYearId)
        const month = viewMonth.getMonth()
        const year = viewMonth.getFullYear()
        data = all.filter((row) => {
          const raw = row.startDate ?? row.eventDate
          if (!raw) return false
          const d = new Date(String(raw))
          return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year
        })
      } else if (isStaff && staffAudienceId) {
        data = await listStaffAudienceEvents({
          collegeId,
          academicYearId,
          departmentId: readStorageNum('empDeptId'),
          audienceTypeId: staffAudienceId,
          date: apiDate,
        })
      } else if (isStudent && staffAudienceId) {
        data = await listStudentAudienceEvents({
          collegeId,
          academicYearId,
          groupSectionId: readStorageNum('groupSectionId'),
          audienceTypeId: staffAudienceId,
          date: apiDate,
        })
      } else {
        data = await listCollegeCalendarMonthEvents({
          collegeId,
          academicYearId,
          date: apiDate,
        })
      }
      setRows(data)
      setCalendarLoaded(true)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [collegeId, academicYearId, selectedDate, viewMonth, variant, isStaff, isStudent, isCalendarView, staffAudienceId, useMonthCalendar])

  useEffect(() => {
    if (collegeId && academicYearId && (useStorageFilters || isCalendarView)) {
      void loadEvents()
    }
  }, [collegeId, academicYearId, useStorageFilters, isCalendarView, loadEvents])

  useEffect(() => {
    if (!calendarLoaded || !collegeId || !academicYearId || !useMonthCalendar) return
    void loadEvents()
  }, [viewMonth, calendarLoaded, collegeId, academicYearId, useMonthCalendar, loadEvents])

  function makeActionsRenderer() {
    return (p: ICellRendererParams<CollegeEventRow>) =>
      isManage ? (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditing(p.data ?? null)
              setModalOpen(true)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => setDeleteTarget(p.data ?? null)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null
  }

  const columnDefs = useMemo<ColDef<CollegeEventRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      {
        ...COL_DEFS.startDate,
        valueGetter: (p) => formatDisplayDate(String(p.data?.startDate ?? p.data?.eventDate ?? '')),
      },
      COL_DEFS.type,
      COL_DEFS.audience,
      { ...COL_DEFS.holiday, cellRenderer: holidayRenderer },
      COL_DEFS.status,
      ...(isManage ? [{ ...COL_DEFS.actions, cellRenderer: makeActionsRenderer() }] : []),
    ],
    [isManage],
  )

  async function handleSaveEvent(payload: CollegeEventRow) {
    try {
      await saveCollegeEvents([payload])
      toastSuccess(editing ? 'Event updated' : 'Event created')
      setModalOpen(false)
      setEditing(null)
      await loadEvents()
    } catch (e) {
      toastError(getErrorMessage(e))
      throw e
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.eventId) return
    try {
      await deleteCollegeEvent(deleteTarget.eventId)
      toastSuccess('Event deleted')
      setDeleteTarget(null)
      await loadEvents()
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const showFilters = !useStorageFilters || isStaff || isStudent

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">{title}</h1>
      </div>

      {showFilters ? (
        <FilterCard title="Filter" bodyClassName="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {!useStorageFilters ? (
              <>
                <Select
                  label="College *"
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => void onCollegeChange(v ? Number(v) : null)}
                  options={collegeOptions}
                  searchable
                  className="md:col-span-3"
                />
                <Select
                  label="Academic Year *"
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => {
                    setAcademicYearId(v ? Number(v) : null)
                    setRows([])
                  }}
                  options={academicYearOptions}
                  searchable
                  disabled={!collegeId}
                  className="md:col-span-3"
                />
              </>
            ) : null}
            {!useMonthCalendar ? (
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={(d) => setSelectedDate(d ?? new Date())}
                clearable={false}
                className="md:col-span-2"
              />
            ) : null}
            <div className="md:col-span-2">
              <Button
                type="button"
                onClick={() => void loadEvents()}
                disabled={loading || !collegeId || !academicYearId}
              >
                {loading ? 'Loading…' : 'Get Events'}
              </Button>
            </div>
          </div>
        </FilterCard>
      ) : null}

      {useMonthCalendar && calendarLoaded ? (
        <EventsMonthCalendar
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          events={rows}
          selectedDate={selectedDate}
          readOnly={!isManage}
          onSelectDate={
            isManage
              ? (day) => {
                  setSelectedDate(day)
                  setModalDefaultDate(day)
                  setEditing(null)
                  setModalOpen(true)
                }
              : (day) => setSelectedDate(day)
          }
          onEventClick={
            isManage
              ? (ev) => {
                  setEditing(ev)
                  setModalDefaultDate(undefined)
                  setModalOpen(true)
                }
              : undefined
          }
        />
      ) : null}

      {!useMonthCalendar && (rows.length > 0 || loading) ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search events…',
              pdfDocumentTitle: title,
            }}
            toolbarTrailing={
              isManage && collegeId && academicYearId ? (
                <Button
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={() => {
                    setEditing(null)
                    setModalOpen(true)
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  Add Event
                </Button>
              ) : undefined
            }
          />
        </TableCard>
      ) : null}

      {useMonthCalendar && isManage && calendarLoaded && rows.length > 0 ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search events…',
              pdfDocumentTitle: title,
            }}
          />
        </TableCard>
      ) : null}

      {isManage && collegeId && academicYearId ? (
        <EventModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
            setModalDefaultDate(undefined)
          }}
          row={editing}
          collegeId={collegeId}
          academicYearId={academicYearId}
          universityId={universityId}
          defaultStartDate={modalDefaultDate}
          onSubmit={handleSaveEvent}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete event"
        description={`Delete "${deleteTarget?.eventName ?? 'this event'}"?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </PageContainer>
  )
}
