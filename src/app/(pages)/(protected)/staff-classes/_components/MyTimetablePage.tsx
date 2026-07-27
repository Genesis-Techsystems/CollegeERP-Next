'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Printer, Clock3 } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { toastError, toastInfo } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import {
  buildStaffMyTimetable,
  filterMyTimetableDayDetails,
  filterMyTimetableDayProxies,
  getMyTimetableDefaultDayName,
  loadMyTimetableAcceptedProxies,
  loadMyTimetableSchedules,
  MY_TIMETABLE_WEEKDAYS,
  subjectResourceOf,
  tConvert,
  type MyTimetableSchedule,
  type MyTimetableTiming,
} from '@/services'

type AnyRow = Record<string, unknown>

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function formatProxyDate(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ProxyStatus({ name }: { name: unknown }) {
  const n = String(name ?? '')
  if (n === 'Accepted') {
    return <span className="text-emerald-600 font-medium">{n}</span>
  }
  if (n === 'Rejected') {
    return <span className="text-destructive font-medium">{n}</span>
  }
  return <span className="text-amber-600 font-medium">{n}</span>
}

function TimetableCell({
  timing,
  forPrint = false,
}: {
  timing: MyTimetableTiming
  forPrint?: boolean
}) {
  const subBatches = Array.isArray(timing.subBatches) ? timing.subBatches : []
  const resources = Array.isArray(timing.subjectResource) ? timing.subjectResource : []
  const fg = forPrint ? '#000' : String(timing.color ?? '#000')
  const bg = forPrint
    ? undefined
    : timing.isBreak === true
      ? '#efefef'
      : timing.colorCode != null
        ? String(timing.colorCode)
        : undefined

  return (
    <td
      className={cn(
        'border border-[#ddd] px-2 py-2 align-top text-left',
        timing.isBreak === true && !forPrint && 'break',
        forPrint && 'my-timetable-print-cell',
      )}
      colSpan={Math.max(1, Number(timing.colspan ?? 1) || 1)}
      style={forPrint ? undefined : { background: bg, cursor: 'pointer' }}
    >
      {subBatches.length > 0 ? (
        subBatches.map((batch, i) => (
          <div key={`${String(batch.studentBatchId ?? i)}-${i}`} className="mb-1 last:mb-0">
            <p
              className={cn('font-medium text-[15px]', forPrint && 'text-black')}
              style={forPrint ? undefined : { color: fg }}
            >
              {batch.studentBatchId != null ? `[${String(batch.studentBatchName ?? '')}]` : ''}{' '}
              {batch.shortName != null
                ? `${String(batch.subjectName ?? '')} - ${String(batch.shortName)}`
                : `${String(batch.subjectName ?? '')} - ${String(batch.subjectCode ?? '')}`}
            </p>
            <p
              className={cn('text-[10px]', forPrint && 'text-black')}
              style={forPrint ? undefined : { color: fg }}
            >
              {String(timing.collegeCode ?? '')} / {String(timing.academicYearName ?? '')} /{' '}
              {String(timing.courseName ?? '')} / {String(timing.groupName ?? '')} /{' '}
              {String(timing.courseYearName ?? '')} / Section -{' '}
              {String(timing.groupSectionName ?? '')}
            </p>
            <p
              className={cn(
                'text-[12px] font-semibold',
                forPrint ? 'my-timetable-print-time text-blue-700' : 'text-blue-700',
              )}
            >
              {tConvert(timing.startTime)} - {tConvert(timing.endTime)}
            </p>
          </div>
        ))
      ) : resources.length === 0 ? (
        <p className="text-sm">{String(timing.classTimingName ?? '')}</p>
      ) : null}
    </td>
  )
}

function WeekTimetableTable({
  schedule,
  forPrint = false,
}: {
  schedule: MyTimetableSchedule
  forPrint?: boolean
}) {
  return (
    <table
      className={cn(
        'w-full min-w-[720px] border-separate border-spacing-px text-sm',
        forPrint && 'my-timetable-print-table',
      )}
    >
      <tbody>
        {schedule.weekdays.map((weekday) => (
          <tr key={weekday.weekdayId}>
            <th
              className={cn(
                'border border-[#ddd] px-[5px] py-[5px] text-left font-medium uppercase',
                forPrint ? 'bg-white text-black' : 'bg-[#C3D9FF]',
              )}
            >
              {weekday.weekdayName}
            </th>
            {weekday.timings.map((timing, ti) => (
              <TimetableCell
                key={`${weekday.weekdayId}-${ti}`}
                timing={timing}
                forPrint={forPrint}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Angular `staff-classes/my-timetable` — week grid + day-wise tabs + print + proxies.
 */
export function MyTimetablePage() {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading)

  const employeeName =
    String(
      user?.firstName ??
        readStorage('uName') ??
        readStorage('firstName') ??
        user?.userName ??
        readStorage('userName') ??
        '',
    ) || ''
  const collegeName = readStorage('currentCollege')

  const defaultDay = useMemo(() => getMyTimetableDefaultDayName(), [])

  const [viewMode, setViewMode] = useState<'1' | '2'>('1')
  const [activeDay, setActiveDay] = useState(defaultDay)
  const [loading, setLoading] = useState(false)
  const [empScheduleDetails, setEmpScheduleDetails] = useState<AnyRow[]>([])
  const [schedule, setSchedule] = useState<MyTimetableSchedule>({ weekdays: [] })
  const [acceptedWorkloads, setAcceptedWorkloads] = useState<AnyRow[]>([])
  const [dayDetails, setDayDetails] = useState<AnyRow[]>([])
  const [dayWiseProxies, setDayWiseProxies] = useState<AnyRow[]>([])
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyDaySelection = useCallback(
    (dayName: string, schedules: AnyRow[], proxies: AnyRow[], notifyIfEmpty = false) => {
      const proxiesForDay = filterMyTimetableDayProxies(proxies, dayName)
      const details = filterMyTimetableDayDetails(schedules, dayName)

      if (!mountedRef.current) return

      setDayWiseProxies(proxiesForDay)
      setDayDetails(details)

      if (
        notifyIfEmpty &&
        schedules.length > 0 &&
        details.length === 0 &&
        proxiesForDay.length === 0
      ) {
        toastInfo('No Classes Today.')
      }
    },
    [],
  )

  useEffect(() => {
    if (sessionLoading || isResolving || !employeeId) return

    let cancelled = false

    async function loadTimetable() {
      setLoading(true)
      try {
        const [scheduleRes, proxies] = await Promise.all([
          loadMyTimetableSchedules(employeeId),
          loadMyTimetableAcceptedProxies(employeeId),
        ])

        if (cancelled || !mountedRef.current) return

        if (!scheduleRes.success) {
          toastError(scheduleRes.message ?? 'Failed to load timetable')
          setEmpScheduleDetails([])
          setSchedule({ weekdays: [] })
          setAcceptedWorkloads(proxies)
          applyDaySelection(getMyTimetableDefaultDayName(), [], proxies)
          return
        }

        const rows = scheduleRes.rows
        setAcceptedWorkloads(proxies)
        setEmpScheduleDetails(rows)

        if (rows.length === 0) {
          setSchedule({ weekdays: [] })
          toastInfo('No classes allocated in timetable for you')
          applyDaySelection(getMyTimetableDefaultDayName(), [], proxies)
          return
        }

        const built = buildStaffMyTimetable(rows)
        setSchedule(built)
        applyDaySelection(getMyTimetableDefaultDayName(), rows, proxies)
      } catch (e) {
        if (cancelled || !mountedRef.current) return
        toastError(getErrorMessage(e))
        setEmpScheduleDetails([])
        setSchedule({ weekdays: [] })
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false)
      }
    }

    void loadTimetable()

    return () => {
      cancelled = true
    }
  }, [sessionLoading, isResolving, employeeId, applyDaySelection])

  function onDayTabChange(dayName: string) {
    setActiveDay(dayName)
    applyDaySelection(dayName, empScheduleDetails, acceptedWorkloads, true)
  }

  const hasWeekGrid = schedule.weekdays.length > 0

  return (
    <>
      <div id="printNone" className="print:hidden">
        <PageContainer>
          <div className="app-data-table app-data-table-card flex flex-col">
            <div className="app-data-table-heading px-5 pt-5 pb-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                My Timetable
              </h2>
            </div>

            <div className="px-5 py-3">
              <RadioGroup
                value={viewMode}
                onValueChange={(v) => setViewMode(v as '1' | '2')}
                className="flex flex-wrap items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="week-timetable" />
                  <Label htmlFor="week-timetable" className="cursor-pointer font-normal">
                    Week Timetable
                  </Label>
                </div>
                <div className="flex items-center gap-2 pl-2">
                  <RadioGroupItem value="2" id="day-timetable" />
                  <Label htmlFor="day-timetable" className="cursor-pointer font-normal">
                    Day-wise Timetable
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="border-t border-border">
              {viewMode === '1' ? (
                <>
                  <div className="flex items-center gap-2 px-5 pt-4 pb-3">
                    <Clock3 className="h-5 w-5 text-foreground" aria-hidden />
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Timetable
                    </h3>
                  </div>
                  <div className="border-t border-border px-5 py-4">
                    <div className="mb-3 flex justify-end">
                      <Button
                        type="button"
                        className="h-9 text-[12px]"
                        onClick={() => window.print()}
                        disabled={!hasWeekGrid}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Timetable
                      </Button>
                    </div>
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : hasWeekGrid ? (
                      <div className="overflow-x-auto">
                        <WeekTimetableTable schedule={schedule} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No timetable data available.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-5 pt-4 pb-3">
                    <Clock3 className="h-5 w-5 text-foreground" aria-hidden />
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Timetable
                    </h3>
                  </div>
                  <Tabs
                    value={activeDay}
                    onValueChange={onDayTabChange}
                  >
                    <TabsList className="h-auto w-full justify-between gap-0 rounded-none border-y border-border bg-transparent px-5 p-0">
                      {MY_TIMETABLE_WEEKDAYS.map((day) => (
                        <TabsTrigger
                          key={day}
                          value={day}
                          className="flex-1 rounded-none border-b-2 border-transparent px-2 py-2.5 text-center text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                        >
                          {day}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {MY_TIMETABLE_WEEKDAYS.map((day) => (
                      <TabsContent key={day} value={day} className="mt-0 px-5 py-4">
                        {loading && dayDetails.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Loading…</p>
                        ) : null}

                        {dayDetails.map((detail, idx) => {
                          const res = subjectResourceOf(detail)
                          return (
                            <div
                              key={`${String(detail.timetableScheduleId ?? idx)}-${idx}`}
                              className="mb-3 rounded-md border-2 border-[#e4e4e4] p-3"
                            >
                              <p className="text-[15px] font-medium text-blue-700">
                                {String(res.subjectName ?? '')} (
                                <span className="text-foreground">
                                  {String(res.subjectTypeName ?? '')}
                                  {String(res.subjectTypeName) === 'LAB' && res.studentBatchName
                                    ? ` - ${String(res.studentBatchName)}`
                                    : ''}
                                </span>
                                )
                              </p>
                              <div className="mt-2 flex flex-wrap justify-between gap-3 border-b border-[#cecece] pb-3 text-sm">
                                <p>
                                  Course :{' '}
                                  <span className="text-[15px] font-medium">
                                    {String(detail.collegeCode ?? '')} /{' '}
                                    {String(detail.academicYearName ?? '')} /{' '}
                                    {String(detail.courseName ?? '')} /{' '}
                                    {String(detail.groupName ?? '')} /{' '}
                                    {String(detail.courseYearName ?? '')} -{' '}
                                    {String(detail.groupSectionName ?? '')}
                                  </span>
                                </p>
                                <p>
                                  Timing :{' '}
                                  <span className="text-[15px] font-medium">
                                    {String(detail.classTimingName ?? '')}(
                                    {tConvert(detail.startTime)} - {tConvert(detail.endTime)})
                                  </span>
                                </p>
                              </div>
                            </div>
                          )
                        })}

                        {dayWiseProxies.length > 0 ? (
                          <div className="mt-4 rounded-md border-2 border-[#e4e4e4] p-3">
                            <p className="mb-2 text-base font-medium text-blue-700">
                              Scheduled Proxies
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[900px] border-separate border-spacing-px text-sm">
                                <thead>
                                  <tr>
                                    {[
                                      'SI.No',
                                      'Requested Staff',
                                      'Requested Subject',
                                      'Requested Date',
                                      'Course',
                                      'Timing',
                                      'Status',
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        className="bg-[#C3D9FF] px-[5px] py-[5px] text-left font-medium"
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dayWiseProxies.map((proxy, i) => (
                                    <tr key={`${String(proxy.staffProxyId ?? i)}-${i}`}>
                                      <td className="border border-[#ddd] px-2 py-1">{i + 1}</td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        {String(proxy.assignedFirstName ?? '')}
                                      </td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        {String(proxy.subjectName ?? '')} (
                                        {String(proxy.proxySubjecttypeDisplayName ?? '')})
                                      </td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        {formatProxyDate(proxy.proxyDate)}
                                      </td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        {String(proxy.collegeCode ?? '')}/
                                        {String(proxy.courseName ?? '')}/
                                        {String(proxy.groupName ?? '')}/
                                        {String(proxy.courseYearName ?? '')}
                                        /section {String(proxy.groupSectionName ?? '')}
                                      </td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        {String(proxy.startTime ?? '')} -{' '}
                                        {String(proxy.endTime ?? '')}
                                      </td>
                                      <td className="border border-[#ddd] px-2 py-1">
                                        <ProxyStatus name={proxy.processStatusName} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </TabsContent>
                    ))}
                  </Tabs>
                </>
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Angular print-only block — no cell fill colours (screen grid keeps API colours). */}
      <div className="my-timetable-print hidden print:block">
        <p className="my-timetable-print-college text-center text-[23px] text-black">
          {collegeName}
        </p>
        <p className="my-timetable-print-title text-center text-[20px] text-black">
          Employee Week Timetable
        </p>
        <p className="my-timetable-print-emp mb-1 text-right text-[18px] text-black">
          Employee: {employeeName}
        </p>
        <div className="border border-black">
          <WeekTimetableTable schedule={schedule} forPrint />
        </div>
      </div>
    </>
  )
}
