"use client";

/**
 * Angular create-timetable matrix: period columns × weekday rows (with colspan).
 * Used only by Assign Resource To Timetable — do not reuse on view-timetable.
 */

import {
  timetableBreakCellBg,
  type AngularStudentTimetable,
  type TimetableDayColumn,
  type TimetableDayTiming,
  type TimetableSubBatch,
} from "@/services";
import { formatClockAmPm } from "../_lib/timetable-filters";

type AssignResourceTimetableMatrixProps = {
  timetable: AngularStudentTimetable;
  onTimingClick?: (
    timing: TimetableDayTiming,
    weekday: TimetableDayColumn,
  ) => void;
};

function weekdayLabel(name: string): string {
  const raw = (name || "").trim();
  if (!raw) return "";
  // Angular: weekdayName[0]+[1]+[2] then txt-uppercase
  return raw.slice(0, 3).toUpperCase();
}

function headerTimeLabel(startTime: string, endTime: string): string {
  const start = formatClockAmPm(startTime);
  const end = formatClockAmPm(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
}

function cellBackground(timing: TimetableDayTiming): string | undefined {
  if (timing.isBreak) {
    return timetableBreakCellBg(timing.classTimingName, true) || "#efefef";
  }
  return timing.colorCode || undefined;
}

function SubBatchBlock({ batch }: { batch: TimetableSubBatch }) {
  const subjectLine = batch.shortName || batch.subjectCode;
  return (
    <div className="sub-jct mb-0.5 last:mb-0">
      <p className="m-0 text-center text-[15px] font-medium leading-tight text-black">
        {batch.studentBatchId != null && batch.studentBatchName ? (
          <span>[{batch.studentBatchName}] </span>
        ) : null}
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

const MAX_VISIBLE_SUB_BATCHES = 3;

export function AssignResourceTimetableMatrix({
  timetable,
  onTimingClick,
}: AssignResourceTimetableMatrixProps) {
  const weekdays = timetable.weekdays ?? [];
  if (weekdays.length === 0) return null;

  const headerTimings = (weekdays[0].classTimings ?? []).map((raw) => {
    const startTime = String(
      raw.startTime ?? raw.start_time ?? raw.fromTime ?? "",
    );
    const endTime = String(raw.endTime ?? raw.end_time ?? raw.toTime ?? "");
    return { startTime, endTime };
  });

  // Fallback when classTimings missing: use first weekday's merged timings expanded.
  const columns =
    headerTimings.length > 0
      ? headerTimings
      : weekdays[0].timings.flatMap((t) =>
          Array.from({ length: Math.max(1, t.colspan || 1) }, () => ({
            startTime: t.startTime,
            endTime: t.endTime,
          })),
        );

  return (
    <div className="overflow-x-auto bg-white">
      <table className="mar w-full min-w-[720px] border-separate border-spacing-px text-sm">
        <thead>
          <tr>
            <th className="table-th bg-[#C3D9FF] px-[5px] py-[5px] font-medium" />
            {columns.map((col, i) => (
              <th
                key={`${col.startTime}-${col.endTime}-${i}`}
                className="table-th whitespace-nowrap bg-[#C3D9FF] px-[5px] py-[5px] text-center font-medium"
              >
                {headerTimeLabel(col.startTime, col.endTime)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekdays.map((weekday) => (
            <tr key={weekday.weekdayId || weekday.weekdayName}>
              <th className="table-th bg-[#C3D9FF] px-[5px] py-[5px] text-left font-medium uppercase whitespace-nowrap">
                {weekdayLabel(weekday.weekdayName)}
              </th>
              {weekday.timings.map((timing, ti) => {
                const bg = cellBackground(timing);
                const isBreak = Boolean(timing.isBreak);
                const resources = timing.subjectResource ?? [];
                const clickable = !isBreak && Boolean(onTimingClick);

                return (
                  <td
                    key={`${weekday.weekdayId}-${timing.timetableScheduleId ?? ti}`}
                    className={`table-td px-2 py-5 text-center align-middle text-black${isBreak ? " break" : ""}${clickable ? " cursor-pointer hover:brightness-95" : ""}`}
                    colSpan={Math.max(1, Number(timing.colspan ?? 1) || 1)}
                    style={{ background: bg }}
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={() => {
                      if (clickable) onTimingClick?.(timing, weekday);
                    }}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onTimingClick?.(timing, weekday);
                      }
                    }}
                  >
                    {(() => {
                      const allBatches = timing.subBatches ?? [];
                      const visible = allBatches.slice(
                        0,
                        MAX_VISIBLE_SUB_BATCHES,
                      );
                      const hidden = Math.max(
                        0,
                        allBatches.length - MAX_VISIBLE_SUB_BATCHES,
                      );
                      return (
                        <>
                          {visible.map((batch, i) => (
                            <SubBatchBlock
                              key={`${batch.subjectCode}-${batch.studentBatchId}-${i}`}
                              batch={batch}
                            />
                          ))}
                          {hidden > 0 ? (
                            <p className="m-0 text-center text-[10px] font-semibold text-black">
                              +{hidden} more
                            </p>
                          ) : null}
                        </>
                      );
                    })()}
                    {resources.length === 0 ? (
                      <p className="m-0 text-sm text-black">
                        {timing.classTimingName}
                      </p>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
