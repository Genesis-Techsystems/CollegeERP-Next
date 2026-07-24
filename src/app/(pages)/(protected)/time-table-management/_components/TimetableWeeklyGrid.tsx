"use client";

import {
  TIMETABLE_HEADER_ROW_BG,
  timetableBreakCellBg,
  timetableCellHeightPx,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
  type TimetableSubBatch,
} from "@/services";
import { formatClockAmPm } from "../_lib/timetable-filters";

type TimetableWeeklyGridProps = {
  timetable: AngularStudentTimetable;
  /** Screen uses 140px/hour; print layout uses 90px/hour (Angular parity). */
  variant?: "screen" | "print";
  className?: string;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
};

/**
 * Angular view-timetable day-column layout:
 * columns = weekdays (API order), rows within a day = stacked timings.
 * Cell content is vertically centered (Angular `vertical-align: middle`).
 */
export function TimetableWeeklyGrid({
  timetable,
  variant = "screen",
  className = "",
  onTimingClick,
}: TimetableWeeklyGridProps) {
  const weekdays = timetable.weekdays ?? [];
  if (weekdays.length === 0) return null;

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
  );
}

function DayColumn({
  weekday,
  variant,
  onTimingClick,
}: {
  weekday: TimetableDayColumn;
  variant: "screen" | "print";
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  const headerName = weekday.timings[0]?.weekdayName || weekday.weekdayName;
  return (
    <div
      className="table-span flex flex-col border border-[#ddd]"
      style={{ width: "16.6%", minWidth: 120, flex: "1 1 16.6%" }}
    >
      <div
        className="table-th border-b border-[#ddd] px-[5px] py-[15px] text-center text-[19px] font-medium uppercase leading-none text-black"
        style={{ backgroundColor: TIMETABLE_HEADER_ROW_BG }}
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
  );
}

function TimingCell({
  timing,
  variant,
  weekday,
  onTimingClick,
}: {
  timing: TimetableDayTiming;
  variant: "screen" | "print";
  weekday: TimetableDayColumn;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  const heightPx =
    variant === "print"
      ? Math.round(
          Math.max(
            0.25,
            (parseTimeMins(timing.endTime) - parseTimeMins(timing.startTime)) /
              60,
          ) * 90,
        )
      : timetableCellHeightPx(timing.startTime, timing.endTime);
  const timeLabel = formatTimeRange(timing.startTime, timing.endTime);
  const nameLooksLikeBreak = /break/i.test(timing.classTimingName ?? "");
  const isBreak = timing.isBreak || nameLooksLikeBreak;
  // Angular: [ngStyle]="{'background': timing.color}" + .break → #efefef
  // Unmatched weekday names (e.g. "Thrusday") leave color empty → white.
  const cellBg = isBreak
    ? timetableBreakCellBg(timing.classTimingName, true)
    : timing.colorCode || "#ffffff";

  return (
    <div
      role={!isBreak && onTimingClick ? "button" : undefined}
      tabIndex={!isBreak && onTimingClick ? 0 : undefined}
      className={`table-td flex border-b border-[#ddd] p-0 text-center ${!isBreak && onTimingClick ? "cursor-pointer hover:brightness-95" : ""}`}
      style={{
        backgroundColor: cellBg,
        minHeight: heightPx,
        height: heightPx,
        // Angular td: vertical-align middle — center the whole content block
        alignItems: "center",
        justifyContent: "center",
        gridColumn: timing.colspan > 1 ? `span ${timing.colspan}` : undefined,
      }}
      onClick={() => {
        if (!isBreak) onTimingClick?.(timing, weekday);
      }}
      onKeyDown={(e) => {
        if (!isBreak && onTimingClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onTimingClick(timing, weekday);
        }
      }}
    >
      <div className="flex w-full flex-col items-center justify-center px-1 py-1">
        {!isBreak
          ? timing.subBatches.map((batch, i) => (
              <SubBatchBlock
                key={`${batch.subjectCode}-${batch.studentBatchId}-${i}`}
                batch={batch}
              />
            ))
          : null}
        {/* Angular .subject-timing { font-size: smaller; padding-top: 13px } */}
        <p
          className="subject-timing m-0 text-center text-[smaller] leading-snug text-black"
          style={{
            paddingTop: isBreak || timing.subBatches.length === 0 ? 0 : 13,
          }}
        >
          {isBreak && timing.classTimingName ? (
            <>
              <span>{timing.classTimingName}</span>
              <br />
            </>
          ) : null}
          {timeLabel ? <span>{timeLabel}</span> : null}
        </p>
      </div>
    </div>
  );
}

function SubBatchBlock({ batch }: { batch: TimetableSubBatch }) {
  // Angular active template uses subjectCode (shortName is commented out).
  const subjectLine = batch.subjectCode || batch.shortName;
  const batchPrefix =
    batch.studentBatchId && batch.studentBatchName
      ? `[${batch.studentBatchName}]`
      : "";
  const tooltip = batch.subjectName || subjectLine || undefined;

  return (
    <div className="sub-jct w-full">
      <p
        className="m-0 text-center text-[15px] font-medium leading-tight text-black"
        title={tooltip}
      >
        {batchPrefix ? <span>{batchPrefix} </span> : null}
        {subjectLine ? <span>{subjectLine}</span> : null}
      </p>
      {batch.staffName ? (
        <p className="stff m-0 text-center text-[10px] leading-tight text-black">
          {batch.staffName}
        </p>
      ) : null}
      {batch.roomName ? (
        <p className="stff m-0 text-center text-[10px] leading-tight text-black">
          {batch.roomName}
        </p>
      ) : null}
    </div>
  );
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatClockAmPm(startTime);
  const end = formatClockAmPm(endTime);
  if (start && end) return `(${start} - ${end})`;
  if (start || end) return `(${start || end})`;
  return "";
}

function parseTimeMins(value: string): number {
  if (!value) return 0;
  const match = value.trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (/PM/i.test(value) && hours < 12) hours += 12;
  if (/AM/i.test(value) && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
