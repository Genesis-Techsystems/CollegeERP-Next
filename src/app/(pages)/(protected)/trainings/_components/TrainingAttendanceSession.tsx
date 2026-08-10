'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { SearchInput } from '@/common/components/search'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { useSession } from '@/hooks/useSession'
import {
  listTrainingAttendanceBySession,
  listTrainingSessionsByDetailAndDate,
  listTrainingStudentsByTraining,
  saveTrainingAttendance,
} from '@/services'
import type { TrainingSession, TrainingStudent } from '@/types/trainings'
import { cn } from '@/lib/utils'

export type AttendanceMode = 'mark' | 'view'

/** Angular `CONSTANTS.dateFormate`: `d MMM, y`. */
function formatAngularDate(value?: string | null): string {
  if (!value) return ''
  const raw = String(value).slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}/.test(raw) ? parseISO(raw) : new Date(value)
  if (!isValid(d)) return String(value)
  return format(d, 'd MMM, yyyy')
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null
  const raw = String(value).slice(0, 10)
  const d = /^\d{4}-\d{2}-\d{2}/.test(raw) ? parseISO(raw) : new Date(value)
  return isValid(d) ? d : null
}

/** Internal day key (stable compare). */
function toYmd(date: Date | null): string {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

/** Angular `momentFormatYMD` — sessionDate query value `YYYY/MM/DD`. */
function toAngularSessionDate(date: Date | null): string {
  if (!date) return ''
  return format(date, 'yyyy/MM/dd')
}

/** Angular `tConvert` — e.g. `09:00:00` → `9:00 AM`. */
function tConvert(time?: string | null): string {
  if (!time) return ''
  const match = String(time).match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
  if (!match) return String(time)
  const hour = Number(match[1])
  const mins = match[2]
  const ampm = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 || 12
  return `${h12}:${mins} ${ampm}`
}

/** Angular: `{{firstName}} - ({{rollNumber|empNumber}})` */
function personLabel(row: TrainingStudent): string {
  const name = row.firstName ?? '—'
  const id = row.rollNumber ?? row.empNumber ?? ''
  return id ? `${name} - (${id})` : name
}

function absentLabel(row: TrainingStudent): string {
  const name = row.firstName ?? '—'
  const id = row.studentId != null
    ? (row.rollNumber ?? '')
    : (row.empNumber ?? '')
  return id ? `${name} - ${id}` : name
}

interface Props {
  mode: AttendanceMode
}

export function TrainingAttendanceSession({ mode }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSession()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)

  const collegeCode = searchParams.get('collegeCode') ?? ''
  const traningId = Number(searchParams.get('traningId') ?? 0)
  const traningDetId = Number(searchParams.get('traningDetId') ?? 0)
  const paStartDate = searchParams.get('paStartDate')
  const paEndDate = searchParams.get('paEndDate')
  const paTrainingTitle = searchParams.get('paTrainingTitle') ?? ''
  const trainingDetailTitle = searchParams.get('trainingDetailTitle') ?? ''

  const minDate = parseYmd(paStartDate)
  const maxDate = parseYmd(paEndDate)

  // Init once from query (Angular: day = paStartDate). Avoid depending on a new Date() each render.
  const [day, setDay] = useState<Date | null>(() => parseYmd(paStartDate) ?? new Date())
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [trainingSessionId, setTrainingSessionId] = useState<string | null>(null)

  const [rows, setRows] = useState<TrainingStudent[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markAllPresent, setMarkAllPresent] = useState(true)
  const [search, setSearch] = useState('')

  // Sync only when the query string changes — not on a fresh Date object identity.
  useEffect(() => {
    const next = parseYmd(paStartDate)
    if (!next) return
    setDay((prev) => (toYmd(prev) === toYmd(next) ? prev : next))
  }, [paStartDate])

  const sessionDateParam = toAngularSessionDate(day)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setSessions([])
      setTrainingSessionId(null)
      setRows([])
      if (!traningDetId || !sessionDateParam) return

      setLoadingSessions(true)
      try {
        // Angular query:
        // TrainingDetail.traningDetId==X.and.sessionDate==YYYY/MM/DD.and.isActive==true
        const list = await listTrainingSessionsByDetailAndDate(
          traningDetId,
          sessionDateParam,
        )
        if (!cancelled) setSessions(list)
      } catch {
        if (!cancelled) setSessions([])
      } finally {
        if (!cancelled) setLoadingSessions(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [traningDetId, sessionDateParam])

  const loadRegistrants = useCallback(
    async (sessionId: number) => {
      if (!traningId || sessionId <= 0) {
        setRows([])
        return
      }
      setLoadingRows(true)
      setError(null)
      try {
        // Angular: training.traningId, then trainingSession.trainingSessionId
        const [registered, attendance] = await Promise.all([
          listTrainingStudentsByTraining(traningId),
          listTrainingAttendanceBySession(sessionId),
        ])

        const merged = registered.map((reg) => {
          const next: TrainingStudent = { ...reg }
          if (attendance.length > 0) {
            const match =
              reg.employeeId != null
                ? attendance.find((a) => a.employeeId === reg.employeeId)
                : attendance.find((a) => a.studentId === reg.studentId)

            if (match) {
              next.trainingStdAttendenceId = match.trainingStdAttendenceId
              next.isActive = match.isActive
              next.trainingSessionId = match.trainingSessionId
              next.attendenceCapturedEmpId = match.attendenceCapturedEmpId
              next.attendanceDate = match.attendanceDate
              next.isPresent = !!match.isPresent
              next.checked = !!match.isPresent
            } else {
              // No prior mark for this person — default Present (Angular mark flow)
              next.trainingSessionId = sessionId
              next.isPresent = true
              next.checked = true
              next.isActive = true
            }
          } else {
            next.trainingSessionId = sessionId
            next.isPresent = true
            next.checked = true
            next.isActive = true
          }
          return next
        })

        setRows(merged)
        setMarkAllPresent(merged.every((r) => r.isPresent))
      } catch (e) {
        setRows([])
        setError(e instanceof Error ? e.message : 'Failed to load attendance')
      } finally {
        setLoadingRows(false)
      }
    },
    [traningId],
  )

  useEffect(() => {
    if (!trainingSessionId) {
      setRows([])
      return
    }
    void loadRegistrants(Number(trainingSessionId))
  }, [trainingSessionId, loadRegistrants])

  const absents = useMemo(() => rows.filter((r) => !r.isPresent), [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.firstName,
        r.rollNumber,
        r.empNumber,
        personLabel(r),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  function toggleAll() {
    if (mode !== 'mark') return
    const nextPresent = !markAllPresent
    setMarkAllPresent(nextPresent)
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        checked: nextPresent,
        isPresent: nextPresent,
      })),
    )
  }

  function toggleRow(indexInFiltered: number, checked: boolean) {
    if (mode !== 'mark') return
    const target = filteredRows[indexInFiltered]
    if (!target) return
    setRows((prev) => {
      const next = prev.map((r) =>
        r.trainingStdId === target.trainingStdId &&
        r.studentId === target.studentId &&
        r.employeeId === target.employeeId
          ? { ...r, checked, isPresent: checked }
          : r,
      )
      setMarkAllPresent(next.every((r) => r.isPresent))
      return next
    })
  }

  async function handleSave() {
    if (mode !== 'mark' || rows.length === 0) return
    setSaving(true)
    setError(null)
    try {
      // Angular: POST trainingstdattend with full registrant array
      const payload = rows.map((r) => ({
        ...r,
        attendenceCapturedEmpId:
          employeeId > 0 ? employeeId : r.attendenceCapturedEmpId,
        attendanceDate: format(new Date(), 'yyyy-MM-dd'),
        trainingSessionId: Number(trainingSessionId),
        isPresent: !!r.isPresent,
        checked: !!r.checked,
      }))
      await saveTrainingAttendance(payload)
      await loadRegistrants(Number(trainingSessionId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const title =
    mode === 'mark' ? 'Mark Training Attendance' : 'View Training Attendance'

  const detailRange = [
    formatAngularDate(paStartDate),
    formatAngularDate(paEndDate),
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <FilteredPage
      title={title}
      filters={(
        <div className="space-y-4">
          <div className="space-y-2 text-sm border border-border/60 rounded-md p-3">
            <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1.5">
              <span className="text-[hsl(var(--primary))]/80">College :</span>
              <span className="font-medium text-primary">{collegeCode || '—'}</span>

              <span className="text-[hsl(var(--primary))]/80">Training :</span>
              <span className="font-medium text-primary">
                {paTrainingTitle || '—'}
              </span>

              <span className="text-[hsl(var(--primary))]/80">
                Training Details :
              </span>
              <span className="font-medium text-primary">
                {trainingDetailTitle || '—'}
                {detailRange && (
                  <span className="text-foreground font-normal">
                    {' '}
                    ({detailRange})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
            <DatePicker
              label="Day *"
              value={day}
              onChange={(d) => setDay(d)}
              minDate={minDate ?? undefined}
              maxDate={maxDate ?? undefined}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
            <Select
              label="Sessions *"
              value={trainingSessionId}
              onChange={setTrainingSessionId}
              options={sessions.map((s) => ({
                value: String(s.trainingSessionId),
                // Angular: {{tConvert(fromTime)}}-{{tConvert(toTime)}}
                label: `${tConvert(s.fromTime)}-${tConvert(s.toTime)}`,
              }))}
              placeholder="Select session"
              isLoading={loadingSessions}
              disabled={!day || sessions.length === 0}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 rounded bg-red-50 px-3 py-2">
              {error}
            </p>
          )}
        </div>
      )}
    >
      {rows.length === 0 && !loadingRows && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      )}

      {(rows.length > 0 || loadingRows) && (
        <div className="rounded-md border border-border bg-card p-4 space-y-3">
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-xs">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search"
              />
            </div>
            <span className="text-sm text-foreground">
              Total Students: {rows.length}
            </span>
          </div>

          {/* Angular: 70% table | 30% Absentees */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sky-50/80 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium w-16">
                      Sl.No
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      First Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium min-w-[140px]">
                      {mode === 'mark' ? (
                        // Checkbox renders as <button> — do not wrap in another <button>/<label>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox
                            checked={markAllPresent}
                            onCheckedChange={() => toggleAll()}
                          />
                          <span
                            className="cursor-pointer select-none"
                            onClick={toggleAll}
                          >
                            {markAllPresent ? 'UnMark All' : 'Mark All'}
                          </span>
                        </div>
                      ) : (
                        'Status'
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRows && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loadingRows &&
                    filteredRows.map((row, index) => (
                      <tr
                        key={`${row.trainingStdId ?? index}-${row.studentId ?? row.employeeId}`}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5 text-center">{index + 1}</td>
                        <td className="px-3 py-2.5">{personLabel(row)}</td>
                        <td className="px-3 py-2.5">
                          {mode === 'view' ? (
                            <span
                              className={cn(
                                'text-sm font-medium',
                                row.isPresent
                                  ? 'text-green-600'
                                  : 'text-red-600',
                              )}
                            >
                              {row.isPresent ? 'Present' : 'Absent'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={!!row.checked}
                                onCheckedChange={(v) =>
                                  toggleRow(index, v === true)
                                }
                              />
                              <span
                                className={cn(
                                  'text-sm font-medium cursor-pointer select-none',
                                  row.checked
                                    ? 'text-green-600'
                                    : 'text-red-600',
                                )}
                                onClick={() =>
                                  toggleRow(index, !row.checked)
                                }
                              >
                                {row.checked ? 'Present' : 'Absent'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border border-border bg-card overflow-hidden">
              <h3 className="px-3 py-2 text-sm font-bold text-primary border-b border-border flex items-baseline gap-2 uppercase tracking-wide">
                Absentees
                <span className="text-base font-semibold normal-case tracking-normal">
                  {absents.length}
                </span>
              </h3>
              <div className="px-3 py-3 min-h-[120px] text-sm space-y-1.5">
                {absents.length === 0 ? (
                  <p className="text-muted-foreground">No absents found.</p>
                ) : (
                  absents.map((a, i) => (
                    <p
                      key={`${a.trainingStdId ?? i}-${a.studentId ?? a.employeeId}`}
                    >
                      {absentLabel(a)}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            {mode === 'mark' && rows.length > 0 && (
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save Attendance'}
              </Button>
            )}
          </div>
        </div>
      )}
    </FilteredPage>
  )
}
