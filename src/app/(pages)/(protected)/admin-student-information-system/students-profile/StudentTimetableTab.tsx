'use client'

import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import {
  buildStudentTimetableGrid,
  loadAngularStudentTimetable,
  loadStudentProfileTabData,
  timetableBreakCellBg,
  timetableCellHeightPx,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
  type TimetableSubBatch,
} from '@/services'

type AnyRow = Record<string, unknown>

const TIMETABLE_TITLE_COLOR = '#002b5c'
const HEADER_GOLD_BAR = '#d4af37'
const OUTER_BORDER = '#9ec5e8'
const FONT_TITLE = 'text-[15px] font-bold'
const FONT_TITLE_SUFFIX = 'text-[15px] font-normal'
const FONT_DAY_HEADER = 'text-[12px] sm:text-[13px] font-bold uppercase tracking-wide'
/** Subject / batch code — primary line */
const FONT_SUBJECT = 'text-[11px] sm:text-[12px] font-bold uppercase leading-tight tracking-wide'
/** Staff names, room codes — smaller secondary lines */
const FONT_META = 'text-[9px] sm:text-[10px] font-medium uppercase leading-snug tracking-normal'
const FONT_TIME = 'text-[10px] sm:text-[11px] font-bold uppercase leading-tight tracking-wide'
const FONT_BREAK_LABEL = 'text-[10px] sm:text-[11px] font-semibold uppercase leading-tight'
const FONT_HELPER = 'text-[12px]'
const HEADER_PY = 'py-3'

type StudentTimetableTabProps = {
  student: AnyRow
  activeTab: string
}

export function StudentTimetableTab({ student, activeTab }: StudentTimetableTabProps) {
  const isActive = activeTab === 'timetable'
  const [loading, setLoading] = useState(false)
  const [timetable, setTimetable] = useState<AngularStudentTimetable | null>(null)

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setLoading(true)
    setTimetable(null)

    void (async () => {
      const angular = await loadAngularStudentTimetable(student).catch(() => null)
      if (cancelled) return
      if (angular && angular.weekdays.length > 0) {
        setTimetable(angular)
        return
      }
      const rows = await loadStudentProfileTabData('timetable', student).catch(() => [])
      if (cancelled) return
      const legacy = gridToAngularFallback(buildStudentTimetableGrid(rows, student))
      setTimetable(legacy.weekdays.length > 0 ? legacy : null)
    })()
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [student, isActive])

  if (!isActive) return null

  const titleDate = timetable?.dateRangeLabel ? ` - (${timetable.dateRangeLabel})` : ''
  const weekdays = timetable?.weekdays ?? []

  return (
    <div className="student-timetable-angular text-black">
      <div
        className="overflow-hidden rounded-sm bg-white shadow-none"
        style={{ border: `1px solid ${OUTER_BORDER}` }}
      >
        <header className="bg-white">
          <div className={`flex items-center gap-2.5 px-4 ${HEADER_PY}`}>
            <Settings className="h-[18px] w-[18px] shrink-0" style={{ color: TIMETABLE_TITLE_COLOR }} aria-hidden />
            <h2 className={`${FONT_TITLE} leading-tight tracking-tight`} style={{ color: TIMETABLE_TITLE_COLOR }}>
              <span>Timetable</span>
              {titleDate ? <span className={FONT_TITLE_SUFFIX}>{titleDate}</span> : null}
            </h2>
          </div>
          <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: HEADER_GOLD_BAR }} aria-hidden />
        </header>

        {loading ? (
          <p className={`px-4 py-10 text-center ${FONT_HELPER} text-slate-600`}>Loading timetable…</p>
        ) : weekdays.length === 0 ? (
          <p className={`px-4 py-10 text-center ${FONT_HELPER} text-slate-600`}>
            No timetable entries found for this student&apos;s section.
          </p>
        ) : (
          <div className="overflow-x-auto p-2.5">
            {/* Angular: one column per weekday, independent row stacks */}
            <div className="mar flex min-w-[920px] justify-center gap-0">
              {weekdays.map((weekday) => (
                <DayColumn key={weekday.weekdayId || weekday.weekdayName} weekday={weekday} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DayColumn({ weekday }: { weekday: { weekdayName: string; timings: TimetableDayTiming[] } }) {
  const headerName = weekday.timings[0]?.weekdayName || weekday.weekdayName
  return (
    <div className="table-span flex min-w-[120px] flex-1 flex-col border border-slate-200/80">
      <div
        className={`table-th border-b border-slate-300 px-2 text-center ${FONT_DAY_HEADER} text-black ${HEADER_PY}`}
        style={{ backgroundColor: '#E8F2FE' }}
      >
        {headerName}
      </div>
      {weekday.timings.map((timing, index) => (
        <TimingCell key={`${timing.weekdayId}-${timing.startTime}-${index}`} timing={timing} />
      ))}
    </div>
  )
}

function TimingCell({ timing }: { timing: TimetableDayTiming }) {
  const heightPx = timetableCellHeightPx(timing.startTime, timing.endTime)
  const timeLabel = formatTimeRange(timing.startTime, timing.endTime)
  const isBreak = timing.isBreak
  const cellBg = isBreak
    ? timetableBreakCellBg(timing.classTimingName, true)
    : timing.colorCode

  return (
    <div
      className={`table-td border-b border-slate-200/90 px-2 py-2 text-center ${isBreak ? 'timetable-break-cell' : ''}`}
      style={{
        backgroundColor: cellBg,
        minHeight: heightPx,
        gridColumn: timing.colspan > 1 ? `span ${timing.colspan}` : undefined,
      }}
    >
      <div className="flex h-full flex-col justify-between" style={{ minHeight: heightPx }}>
        {!isBreak ? (
          <div className="flex flex-col gap-1.5">
            {timing.subBatches.map((batch, i) => (
              <SubBatchBlock key={`${batch.subjectCode}-${batch.studentBatchId}-${i}`} batch={batch} />
            ))}
          </div>
        ) : null}
        <p className={`subject-timing mt-auto text-center text-black ${isBreak ? FONT_BREAK_LABEL : FONT_TIME}`}>
          {isBreak && timing.classTimingName ? (
            <>
              <span>{timing.classTimingName.toUpperCase()}</span>
              <br />
            </>
          ) : null}
          {timeLabel ? <span>{timeLabel}</span> : null}
        </p>
      </div>
    </div>
  )
}

function SubBatchBlock({ batch }: { batch: TimetableSubBatch }) {
  const subjectLine = batch.shortName || batch.subjectCode
  const batchPrefix =
    batch.studentBatchId && batch.studentBatchName ? `[${batch.studentBatchName}]` : ''

  return (
    <div className="sub-jct space-y-0.5">
      <p className={`text-center ${FONT_SUBJECT} text-black`}>
        {batchPrefix ? <span>{batchPrefix} </span> : null}
        {subjectLine ? <span>{subjectLine.toUpperCase()}</span> : null}
      </p>
      {batch.staffName ? (
        <p className={`stff text-center ${FONT_META} text-slate-800`}>{batch.staffName.toUpperCase()}</p>
      ) : null}
      {batch.roomName ? (
        <p className={`stff text-center ${FONT_META} text-slate-800`}>{batch.roomName.toUpperCase()}</p>
      ) : null}
    </div>
  )
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatClockAmPmLocal(startTime)
  const end = formatClockAmPmLocal(endTime)
  if (start && end) return `(${start} - ${end})`
  if (start || end) return `(${start || end})`
  return ''
}

function formatClockAmPmLocal(value: string): string {
  if (!value) return ''
  const raw = value.trim()
  if (/AM|PM/i.test(raw)) return raw.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
  const match = raw.match(/(\d{1,2}):(\d{2})/)
  if (!match) return raw
  let hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${meridiem}`
}

/** Fallback when schedule API is empty — approximate column layout from weekly report rows. */
function gridToAngularFallback(grid: ReturnType<typeof buildStudentTimetableGrid>): AngularStudentTimetable {
  const weekdays: TimetableDayColumn[] = grid.dayLabels.map((dayLabel, dayIndex) => {
    const timings: TimetableDayTiming[] = []
    for (const row of grid.rows) {
      const cell = row.cells[dayIndex]
      if (!cell || cell.kind === 'empty') continue
      const startEnd = cell.timeLabel.replace(/[()]/g, '').split('-').map((s) => s.trim())
      timings.push({
        weekdayId: dayIndex + 1,
        weekdayName: dayLabel.charAt(0) + dayLabel.slice(1).toLowerCase(),
        startTime: startEnd[0] ?? '',
        endTime: startEnd[1] ?? '',
        isBreak: cell.kind === 'break',
        classTimingName: cell.kind === 'break' ? (cell.breakLabel ?? 'BREAK') : '',
        colspan: 1,
        colorCode:
          cell.kind === 'break'
            ? timetableBreakCellBg(cell.breakLabel ?? 'BREAK', true)
            : '#E6E6FA',
        cellGroupId: '',
        subBatches:
          cell.kind === 'session'
            ? cell.entries.map((e) => ({
                studentBatchId: 0,
                studentBatchName: '',
                shortName: e.title,
                subjectCode: e.title,
                staffName: e.faculty,
                roomName: e.room,
              }))
            : [],
      })
    }
    return {
      weekdayId: dayIndex + 1,
      weekdayName: dayLabel.charAt(0) + dayLabel.slice(1).toLowerCase(),
      timings,
    }
  })
  return { dateRangeLabel: grid.dateRangeLabel, weekdays: weekdays.filter((w) => w.timings.length > 0) }
}
