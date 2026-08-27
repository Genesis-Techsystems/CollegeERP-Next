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
  variant?: "screen" | "print";
  className?: string;
  /**
   * `view` — synced rows + calculateHeight (view-timetable).
   * `assign-resource` — Angular create-timetable: column stacks, 1px gaps, natural height.
   */
  cellColorMode?: CellColorMode;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
};

/**
 * Angular create-timetable: inline-table columns, border-spacing 1px, padding 20px 8px.
 * Angular view-timetable: synced rows with calculateHeight (duration × 140px).
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

  if (cellColorMode === "assign-resource" && variant === "screen") {
    return (
      <AssignResourceColumnGrid
        weekdays={weekdays}
        className={className}
        onTimingClick={onTimingClick}
      />
    );
  }

  return (
    <SyncedRowGrid
      weekdays={weekdays}
      variant={variant}
      className={className}
      cellColorMode={cellColorMode}
      onTimingClick={onTimingClick}
    />
  );
}

/** Angular create-timetable.component — column stacks with 1px white gutters. */
function AssignResourceColumnGrid({
  weekdays,
  className,
  onTimingClick,
}: {
  weekdays: TimetableDayColumn[];
  className: string;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="my-[15px] flex w-full min-w-[720px] justify-center gap-px bg-white">
        {weekdays.map((weekday) => (
          <DayColumn
            key={weekday.weekdayId || weekday.weekdayName}
            weekday={weekday}
            variant="screen"
            cellColorMode="assign-resource"
            onTimingClick={onTimingClick}
          />
        ))}
      </div>
    </div>
  );
}

/** Angular view-timetable — horizontal row sync + calculateHeight. */
function SyncedRowGrid({
  weekdays,
  variant,
  className,
  cellColorMode,
  onTimingClick,
}: {
  weekdays: TimetableDayColumn[];
  variant: "screen" | "print";
  className: string;
  cellColorMode: CellColorMode;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  const rowCount = Math.max(...weekdays.map((w) => w.timings.length), 0);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div
        className="my-[15px] w-full min-w-[720px]"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${weekdays.length}, minmax(120px, 1fr))`,
        }}
      >
        {weekdays.map((weekday) => (
          <DayHeader
            key={weekday.weekdayId || weekday.weekdayName}
            weekday={weekday}
          />
        ))}

        {Array.from({ length: rowCount }, (_, rowIndex) => {
          const rowTimings = weekdays.map((w) => w.timings[rowIndex]);
          const rowHeightPx = resolveRowHeight(rowTimings, variant);

          return weekdays.map((weekday) => {
            const timing = weekday.timings[rowIndex];
            if (!timing) {
              return (
                <EmptyTimingCell
                  key={`${weekday.weekdayId}-empty-${rowIndex}`}
                  heightPx={rowHeightPx}
                  cellColorMode={cellColorMode}
                />
              );
            }

            return (
              <TimingCell
                key={`${timing.weekdayId}-${timing.startTime}-${rowIndex}`}
                timing={timing}
                variant={variant}
                weekday={weekday}
                cellColorMode={cellColorMode}
                heightPx={rowHeightPx}
                onTimingClick={onTimingClick}
              />
            );
          });
        })}
      </div>
    </div>
  );
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

  return (
    <div
      className="flex min-w-[120px] flex-col gap-px"
      style={{
        width: "16.6%",
        flex: "1 1 16.6%",
      }}
    >
      <DayHeader weekday={weekday} nameOverride={headerName} />
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

function DayHeader({
  weekday,
  nameOverride,
}: {
  weekday: TimetableDayColumn;
  nameOverride?: string;
}) {
  const headerName =
    nameOverride || weekday.timings[0]?.weekdayName || weekday.weekdayName;
  const borderColor = TIMETABLE_CELL_BORDER;

  return (
    <div
      className="px-[5px] py-[15px] text-center text-[19px] font-medium uppercase leading-none text-black"
      style={{
        backgroundColor: TIMETABLE_HEADER_ROW_BG,
        border: `1px solid ${borderColor}`,
        color: "#000",
      }}
    >
      {headerName}
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

function resolveRowHeight(
  rowTimings: (TimetableDayTiming | undefined)[],
  variant: "screen" | "print",
): number {
  let max = 0;
  for (const timing of rowTimings) {
    if (!timing) continue;
    max = Math.max(max, timingHeightPx(timing, variant));
  }
  return max || 96;
}

function timingHeightPx(
  timing: TimetableDayTiming,
  variant: "screen" | "print",
): number {
  if (variant === "print") {
    return Math.round(
      Math.max(
        0.25,
        (parseTimeMins(timing.endTime) - parseTimeMins(timing.startTime)) / 60,
      ) * 90,
    );
  }
  return timetableCellHeightPx(timing.startTime, timing.endTime);
}

function EmptyTimingCell({
  heightPx,
  cellColorMode,
}: {
  heightPx: number;
  cellColorMode: CellColorMode;
}) {
  return (
    <div
      style={{
        height: heightPx,
        minHeight: heightPx,
        border: `1px solid ${TIMETABLE_CELL_BORDER}`,
        backgroundColor: "#ffffff",
      }}
    />
  );
}

function TimingCell({
  timing,
  variant,
  weekday,
  cellColorMode,
  heightPx,
  onTimingClick,
}: {
  timing: TimetableDayTiming;
  variant: "screen" | "print";
  weekday: TimetableDayColumn;
  cellColorMode: CellColorMode;
  heightPx?: number;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
}) {
  const isAssign = cellColorMode === "assign-resource";
  const useNaturalHeight = isAssign && variant === "screen";
  const nameLooksLikeBreak = /break/i.test(timing.classTimingName ?? "");
  const isBreak = timing.isBreak || nameLooksLikeBreak;
  const weekdayName = weekday.weekdayName || timing.weekdayName || "";
  const cellBg = cellBackground(timing, isBreak, cellColorMode, weekdayName);
  const borderColor = TIMETABLE_CELL_BORDER;
  const timeLabel = formatTimeRange(timing.startTime, timing.endTime);
  const clickable = !isBreak && Boolean(onTimingClick);

  const allBatches = timing.subBatches ?? [];
  const visibleBatches =
    variant === "screen"
      ? allBatches.slice(0, MAX_VISIBLE_SUB_BATCHES)
      : allBatches;
  const hiddenCount =
    variant === "screen"
      ? Math.max(0, allBatches.length - MAX_VISIBLE_SUB_BATCHES)
      : 0;

  const fixedHeightPx =
    heightPx ??
    (useNaturalHeight ? undefined : timingHeightPx(timing, variant));

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`flex text-center text-black${
        clickable ? " cursor-pointer hover:brightness-95" : ""
      }${isBreak ? " bg-[#efefef]" : ""}`}
      style={{
        backgroundColor: isBreak ? undefined : cellBg,
        height: "stretch",
        border: `1px solid ${borderColor}`,
        ...(fixedHeightPx != null
          ? { height: fixedHeightPx, minHeight: fixedHeightPx }
          : {}),
        boxSizing: useNaturalHeight ? "border-box" : "content-box",
        padding: useNaturalHeight ? "20px 8px" : isAssign ? "20px 8px" : "0",
        alignItems: "center",
        justifyContent: "center",
        overflow: useNaturalHeight ? "visible" : "hidden",
      }}
      onClick={() => {
        if (clickable) onTimingClick?.(timing, weekday);
      }}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onTimingClick?.(timing, weekday);
        }
      }}
      title={
        hiddenCount > 0
          ? `Click to view all ${allBatches.length} allocations`
          : undefined
      }
    >
      <div className="flex w-full flex-col items-center justify-center">
        {!isBreak
          ? visibleBatches.map((batch, i) => (
              <SubBatchBlock
                key={`${batch.subjectCode}-${batch.studentBatchId}-${i}`}
                batch={batch}
                preferShortName={isAssign}
              />
            ))
          : null}
        {hiddenCount > 0 ? (
          <p className="m-0 text-center text-[10px] font-semibold leading-tight text-black">
            +{hiddenCount} more
          </p>
        ) : null}
        <p
          className="subject-timing m-0 text-center text-[smaller] leading-snug text-black"
          style={{
            paddingTop: isBreak || visibleBatches.length === 0 ? 0 : 13,
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
  preferShortName,
}: {
  batch: TimetableSubBatch;
  preferShortName: boolean;
}) {
  const subjectLine = preferShortName
    ? batch.shortName || batch.subjectCode
    : batch.subjectCode || batch.shortName;
  const batchPrefix =
    batch.studentBatchId != null && batch.studentBatchName
      ? `[${batch.studentBatchName}]`
      : "";
  const tooltip = batch.subjectName || subjectLine || undefined;

  return (
    <div className="mb-0.5 w-full last:mb-0">
      <p
        className="sub-jct m-0 text-center text-[15px] font-medium leading-tight text-black"
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
