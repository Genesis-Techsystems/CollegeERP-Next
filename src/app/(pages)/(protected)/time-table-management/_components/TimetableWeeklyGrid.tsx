'use client'

import {
  timetableBreakCellBg,
  timetableCellHeightPx,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
  type TimetableSubBatch,
} from '@/services'
import { formatClockAmPm } from '../_lib/timetable-filters'

const FONT_DAY_HEADER = 'text-[12px] sm:text-[13px] font-bold uppercase tracking-wide'
const FONT_SUBJECT = 'text-[11px] sm:text-[12px] font-bold uppercase leading-tight tracking-wide'
const FONT_META = 'text-[9px] sm:text-[10px] font-medium uppercase leading-snug tracking-normal'
const FONT_TIME = 'text-[10px] sm:text-[11px] font-bold uppercase leading-tight tracking-wide'
const FONT_BREAK_LABEL = 'text-[10px] sm:text-[11px] font-semibold uppercase leading-tight'
const HEADER_PY = 'py-3'

type TimetableWeeklyGridProps = {
  timetable: AngularStudentTimetable
  /** Screen uses 140px/hour; print layout uses 90px/hour (Angular parity). */
  variant?: 'screen' | 'print'
  className?: string
  onTimingClick?: (timing: TimetableDayTiming, weekday: TimetableDayColumn) => void
}

export function TimetableWeeklyGrid({
  timetable,
  variant = 'screen',
  className = '',
  onTimingClick,
}: TimetableWeeklyGridProps) {
  const weekdays = timetable.weekdays ?? []
  if (weekdays.length === 0) return null

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="mar flex min-w-[920px] justify-center gap-0 print:min-w-0">
        {weekdays.map((weekday) => (
          <DayColumn
            key={weekday.weekdayId || weekday.weekdayName}
            weekday={weekday}
            variant={variant}
            onTimingClick={onTimingClick}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  weekday,
  variant,
  onTimingClick,
}: {
  weekday: TimetableDayColumn
  variant: 'screen' | 'print'
  onTimingClick?: (timing: TimetableDayTiming, weekday: TimetableDayColumn) => void
}) {
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
        <TimingCell
          key={`${timing.weekdayId}-${timing.startTime}-${index}`}
          timing={timing}
          variant={variant}
          weekday={weekday}
          onTimingClick={onTimingClick}
        />
      ))}
    </div>
  )
}

function TimingCell({
  timing,
  variant,
  weekday,
  onTimingClick,
}: {
  timing: TimetableDayTiming
  variant: 'screen' | 'print'
  weekday: TimetableDayColumn
  onTimingClick?: (timing: TimetableDayTiming, weekday: TimetableDayColumn) => void
}) {
  const heightPx =
    variant === 'print'
      ? Math.round(
          Math.max(
            0.25,
            (parseTimeMins(timing.endTime) - parseTimeMins(timing.startTime)) / 60,
          ) * 90,
        )
      : timetableCellHeightPx(timing.startTime, timing.endTime)
  const timeLabel = formatTimeRange(timing.startTime, timing.endTime)
  const isBreak = timing.isBreak
  const cellBg = isBreak ? timetableBreakCellBg(timing.classTimingName, true) : timing.colorCode

  return (
    <div
      role={!isBreak && onTimingClick ? 'button' : undefined}
      tabIndex={!isBreak && onTimingClick ? 0 : undefined}
      className={`table-td border-b border-slate-200/90 px-2 py-2 text-center ${isBreak ? 'timetable-break-cell' : ''} ${!isBreak && onTimingClick ? 'cursor-pointer hover:brightness-95' : ''}`}
      style={{
        backgroundColor: cellBg,
        minHeight: heightPx,
        gridColumn: timing.colspan > 1 ? `span ${timing.colspan}` : undefined,
      }}
      onClick={() => {
        if (!isBreak) onTimingClick?.(timing, weekday)
      }}
      onKeyDown={(e) => {
        if (!isBreak && onTimingClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onTimingClick(timing, weekday)
        }
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
  const start = formatClockAmPm(startTime)
  const end = formatClockAmPm(endTime)
  if (start && end) return `(${start} - ${end})`
  if (start || end) return `(${start || end})`
  return ''
}

function parseTimeMins(value: string): number {
  if (!value) return 0
  const match = value.trim().match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  let hours = Number(match[1])
  const minutes = Number(match[2])
  if (/PM/i.test(value) && hours < 12) hours += 12
  if (/AM/i.test(value) && hours === 12) hours = 0
  return hours * 60 + minutes
}
