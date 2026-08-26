"use client";

import {
  TIMETABLE_ASSIGN_DEFAULT_CELL_BG,
  TIMETABLE_CELL_BORDER,
  TIMETABLE_HEADER_ROW_BG,
  timetableBreakCellBg,
  timetableCellHeightPx,
  timetableDayColorFromWeekdayName,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
  type TimetableSubBatch,
} from "@/services";
import { formatClockAmPm } from "../_lib/timetable-filters";

type CellColorMode = "view" | "assign-resource";

/** Max batch rows shown in a cell on screen; click opens full list. */
const MAX_VISIBLE_SUB_BATCHES = 3;

type TimetableWeeklyGridProps = {
  timetable: AngularStudentTimetable;
  /** Screen uses 140px/hour; print layout uses 90px/hour (Angular parity). */
  variant?: "screen" | "print";
  className?: string;
  /**
   * `view` — weekday pastel fills, black text (view-timetable / student profile).
   * `assign-resource` — assigned slots use subjectResource colorCode (or `#dedede`)
   * with black text; empty slots stay white (Angular create-timetable).
   */
  cellColorMode?: CellColorMode;
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
  cellColorMode = "view",
  onTimingClick,
}: TimetableWeeklyGridProps) {
  const weekdays = timetable.weekdays ?? [];
  if (weekdays.length === 0) return null;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="mar flex w-full min-w-0 justify-center gap-0 print:min-w-0">
        {weekdays.map((weekday) => (
          <DayColumn
            key={weekday.weekdayId || weekday.weekdayName}
            weekday={weekday}
            variant={variant}
            cellColorMode={cellColorMode}
            onTimingClick={onTimingClick}
          />
        ))}
      </div>
    </div>
  );
}

function isAssignedSlot(timing: TimetableDayTiming): boolean {
  return (
    timing.subBatches.length > 0 ||
    (Array.isArray(timing.subjectResource) && timing.subjectResource.length > 0)
  );
}

function cellBackground(
  timing: TimetableDayTiming,
  isBreak: boolean,
  mode: CellColorMode,
  weekdayName: string,
): string {
  if (isBreak) {
    return timetableBreakCellBg(timing.classTimingName, true) || "#efefef";
  }
  if (mode === "assign-resource") {
    if (timing.colorCode) return timing.colorCode;
    if (isAssignedSlot(timing)) return TIMETABLE_ASSIGN_DEFAULT_CELL_BG;
    return "#ffffff";
  }
  return (
    timing.colorCode ||
    timetableDayColorFromWeekdayName(weekdayName) ||
    "#ffffff"
  );
}

function cellTextColor(mode: CellColorMode): string {
  return "#000";
}

function cellBorderColor(): string {
  return TIMETABLE_CELL_BORDER;
}

function DayColumn({
  weekday,
  variant,
  cellColorMode,
  onTimingClick,
}: {
  weekday: TimetableDayColumn;
  variant: "screen" | "print";
  cellColorMode: CellColorMode;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  const headerName = weekday.timings[0]?.weekdayName || weekday.weekdayName;
  const borderColor = cellBorderColor();
  return (
    <div
      className="table-span flex flex-col border"
      style={{
        width: "16.6%",
        minWidth: 120,
        flex: "1 1 16.6%",
        borderColor,
      }}
    >
      <div
        className="table-th border-b px-[5px] py-[15px] text-center text-[19px] font-medium uppercase leading-none text-black"
        style={{
          backgroundColor: TIMETABLE_HEADER_ROW_BG,
          borderColor,
        }}
      >
        {headerName}
      </div>
      {weekday.timings.map((timing, index) => (
        <TimingCell
          key={`${timing.weekdayId}-${timing.startTime}-${index}`}
          timing={timing}
          variant={variant}
          weekday={weekday}
          cellColorMode={cellColorMode}
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
  cellColorMode,
  onTimingClick,
}: {
  timing: TimetableDayTiming;
  variant: "screen" | "print";
  weekday: TimetableDayColumn;
  cellColorMode: CellColorMode;
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
  const weekdayName = weekday.weekdayName || timing.weekdayName || "";
  const cellBg = cellBackground(timing, isBreak, cellColorMode, weekdayName);
  const textColor = cellTextColor(cellColorMode);
  const borderColor = cellBorderColor();

  // Screen: show at most 3 batches to avoid overflow; click opens full list.
  // Print: keep all entries for a complete printout.
  const allBatches = timing.subBatches ?? [];
  const visibleBatches =
    variant === "screen" ? allBatches.slice(0, MAX_VISIBLE_SUB_BATCHES) : allBatches;
  const hiddenCount =
    variant === "screen"
      ? Math.max(0, allBatches.length - MAX_VISIBLE_SUB_BATCHES)
      : 0;

  return (
    <div
      role={!isBreak && onTimingClick ? "button" : undefined}
      tabIndex={!isBreak && onTimingClick ? 0 : undefined}
      className={`table-td flex border-b p-0 text-center ${!isBreak && onTimingClick ? "cursor-pointer hover:brightness-95" : ""}`}
      style={{
        backgroundColor: cellBg,
        borderColor,
        minHeight: heightPx,
        height: heightPx,
        // Angular td: vertical-align middle — center the whole content block
        alignItems: "center",
        justifyContent: "center",
        gridColumn: timing.colspan > 1 ? `span ${timing.colspan}` : undefined,
        overflow: "hidden",
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
      title={
        hiddenCount > 0
          ? `Click to view all ${allBatches.length} allocations`
          : undefined
      }
    >
      <div className="flex w-full flex-col items-center justify-center px-1 py-1">
        {!isBreak
          ? visibleBatches.map((batch, i) => (
              <SubBatchBlock
                key={`${batch.subjectCode}-${batch.studentBatchId}-${i}`}
                batch={batch}
                color={textColor}
              />
            ))
          : null}
        {hiddenCount > 0 ? (
          <p
            className="m-0 text-center text-[10px] font-semibold leading-tight"
            style={{ color: textColor }}
          >
            +{hiddenCount} more
          </p>
        ) : null}
        {/* Angular .subject-timing { font-size: smaller; padding-top: 13px } */}
        <p
          className="subject-timing m-0 text-center text-[smaller] leading-snug"
          style={{
            color: textColor,
            paddingTop:
              isBreak || visibleBatches.length === 0 ? 0 : 13,
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

function SubBatchBlock({
  batch,
  color,
}: {
  batch: TimetableSubBatch;
  color: string;
}) {
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
        className="m-0 text-center text-[15px] font-medium leading-tight"
        style={{ color }}
        title={tooltip}
      >
        {batchPrefix ? <span>{batchPrefix} </span> : null}
        {subjectLine ? <span>{subjectLine}</span> : null}
      </p>
      {batch.staffName ? (
        <p
          className="stff m-0 text-center text-[10px] leading-tight"
          style={{ color }}
        >
          {batch.staffName}
        </p>
      ) : null}
      {batch.roomName ? (
        <p
          className="stff m-0 text-center text-[10px] leading-tight"
          style={{ color }}
        >
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
