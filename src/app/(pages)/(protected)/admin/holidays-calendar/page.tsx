'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { APP_CONFIG } from '@/config/constants/app'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import {
  listAcademicYearsByUniversityForHolidayCalendar,
  listActiveCollegesForHolidayCalendar,
  listHolidayCalendarByCollegeAndAcademicYear,
} from '@/services'
import type { College } from '@/types/college'
import type { HolidayCalendar } from '@/types/holiday-calendar'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'

const COLS: ColDef<HolidayCalendar>[] = [
  { headerName: 'SI.No', width: 70, flex: 0, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'eventName', headerName: 'Event Name', minWidth: 180, flex: 1.2 },
  { field: 'eventTypeName', headerName: 'Event Type', minWidth: 140, flex: 1 },
  {
    colId: 'eventDate',
    headerName: 'Event Date',
    minWidth: 130,
    flex: 1,
    valueGetter: (p) => {
      const raw = p.data?.eventDate ?? p.data?.startDate
      if (!raw) return '-'
      const dt = new Date(raw)
      if (Number.isNaN(dt.getTime())) return String(raw)
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
  },
  {
    colId: 'audienceTypeDisplayName',
    headerName: 'Event Audience',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => {
      const flat = p.data?.audienceTypeDisplayName
      if (flat) return flat
      const list = p.data?.eventAudiences ?? []
      const names = list.map((item) => item.audienceTypeDisplayName).filter(Boolean)
      return names.length ? names.join(', ') : '-'
    },
  },
  { field: 'eventStatusDisplayName', headerName: 'Status', minWidth: 120, flex: 0.9 },
]

export default function HolidaysCalendarPage() {
  const [collegeId, setCollegeId] = useState<number | undefined>(undefined)
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined)
  const showTable = Boolean(collegeId && academicYearId)

  const collegesQuery = useQuery({
    queryKey: ['HolidayCalendar', 'colleges'],
    queryFn: listActiveCollegesForHolidayCalendar,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const selectedCollege = useMemo<College | undefined>(
    () => collegesQuery.data?.find((c) => c.collegeId === collegeId),
    [collegesQuery.data, collegeId],
  )

  const academicYearsQuery = useQuery({
    queryKey: ['HolidayCalendar', 'academicYears', selectedCollege?.universityId],
    queryFn: () => listAcademicYearsByUniversityForHolidayCalendar(selectedCollege!.universityId),
    enabled: Boolean(selectedCollege?.universityId),
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const holidaysQuery = useQuery({
    queryKey: QK.holidayCalendar.list(collegeId, academicYearId),
    queryFn: () => listHolidayCalendarByCollegeAndAcademicYear(Number(collegeId), Number(academicYearId)),
    enabled: Boolean(collegeId && academicYearId),
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const collegeOptions = useMemo(
    () => (collegesQuery.data ?? []).map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName })),
    [collegesQuery.data],
  )
  const academicYearOptions = useMemo(
    () => (academicYearsQuery.data ?? []).map((y) => ({ value: String(y.academicYearId), label: y.academicYear })),
    [academicYearsQuery.data],
  )

  return (
    <FilteredListPage
      title="Holidays Calendar"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(value) => {
              const next = value ? Number(value) : undefined
              setCollegeId(next)
              setAcademicYearId(undefined)
            }}
            options={collegeOptions}
            placeholder="Select college"
            searchable
          />
          <Select
            label="Academic Year"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(value) => setAcademicYearId(value ? Number(value) : undefined)}
            options={academicYearOptions}
            placeholder="Select academic year"
            searchable
            disabled={!collegeId}
          />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => { setCollegeId(undefined); setAcademicYearId(undefined) }}>Reset</Button>
          </div>
        </div>
      )}
      rowData={showTable ? (holidaysQuery.data ?? []) : []}
      columnDefs={COLS}
      loading={holidaysQuery.isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search holidays…', pdfDocumentTitle: 'Holidays Calendar' }}
    />
  )
}
