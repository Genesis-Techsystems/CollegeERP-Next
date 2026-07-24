import { TIMETABLE_REPORT_API } from "@/config/constants/api";
import type { ApiResponse } from "@/types/api";
import { fetchDetails, getAllRecords } from "@/services/crud";

type AnyRow = Record<string, unknown>;

function procNameFromStoredProcPath(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

export type WeeklyTimetableReportIds = {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  groupSectionId: number;
};

/** Angular `student-timetable.selectedSection`: `s_rep_tt_get_timetable_details` + `WeeklyTimeTable`. */
export async function fetchWeeklyTimetableReportRows(
  ids: WeeklyTimetableReportIds,
): Promise<AnyRow[]> {
  const {
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
    groupSectionId,
  } = ids;
  if (!collegeId || !academicYearId || !groupSectionId) return [];

  try {
    const raw = await getAllRecords<unknown>(
      procNameFromStoredProcPath(
        TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS,
      ),
      {
        in_flag: "WeeklyTimeTable",
        in_fdate: "1990-01-01",
        in_tdate: "1990-01-01",
        in_collegeId: collegeId,
        in_courseId: courseId || 0,
        in_CourseGroupId: courseGroupId || 0,
        in_CourseYearId: courseYearId || 0,
        in_academicYearId: academicYearId,
        in_sectionId: groupSectionId,
        in_empId: "0",
        in_academicYearName: "",
        in_deptId: "0",
      },
    );

    const rows = unwrapWeeklyReportRows(raw);
    return normalizeTimetableRows(rows);
  } catch {
    return [];
  }
}

function unwrapWeeklyReportRows(data: unknown): unknown {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as AnyRow;
    const r = o.result;
    if (Array.isArray(r)) {
      if (r.length > 0 && Array.isArray(r[0])) return r[0];
      if (
        r.length > 0 &&
        r[0] &&
        typeof r[0] === "object" &&
        !Array.isArray(r[0])
      ) {
        return r;
      }
    }
    if (Array.isArray(o.resultList)) return o.resultList;
  }
  return data;
}

function toQuery(params: Record<string, string | number>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Unwrap Spring envelope — timetablescurr often uses top-level `resultList`, not `data`. */
function unwrapApiData(
  body: ApiResponse<unknown> & { result?: unknown; resultList?: unknown },
): unknown {
  const hasPayload =
    body?.data != null ||
    Array.isArray(body?.resultList) ||
    body?.result != null;

  if (!body?.success && !hasPayload) {
    throw new Error(body?.message ?? "Timetable request failed");
  }

  const data = body.data;
  if (data != null) {
    if (Array.isArray(data)) return data;
    if (typeof data === "object") {
      const page = data as AnyRow;
      if (Array.isArray(page.resultList)) return page.resultList;
      for (const key of [
        "timeTableList",
        "timetableList",
        "timetableDetails",
        "timetableDetailList",
        "sectionTimeTable",
        "details",
      ]) {
        if (Array.isArray(page[key])) return page[key];
      }
    }
    return data;
  }

  if (Array.isArray(body.resultList)) return body.resultList;
  if (body.result != null) return body.result;
  return body;
}

async function fetchProxyPayload(
  path: string,
  params: Record<string, string | number>,
): Promise<unknown> {
  const res = await fetch(`/api/proxy/${path}${toQuery(params)}`);
  if (!res.ok) {
    throw new Error(`Timetable request failed (${res.status})`);
  }
  const body = (await res.json()) as ApiResponse<unknown> & {
    result?: unknown;
  };
  return unwrapApiData(body);
}

const DAY_BY_NUMBER: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
  7: "SUNDAY",
};

const DAY_KEY_PREFIXES: { prefix: string; day: string }[] = [
  { prefix: "monday", day: "MONDAY" },
  { prefix: "mon", day: "MONDAY" },
  { prefix: "tuesday", day: "TUESDAY" },
  { prefix: "tues", day: "TUESDAY" },
  { prefix: "tue", day: "TUESDAY" },
  { prefix: "wednesday", day: "WEDNESDAY" },
  { prefix: "wed", day: "WEDNESDAY" },
  { prefix: "thursday", day: "THURSDAY" },
  { prefix: "thurs", day: "THURSDAY" },
  { prefix: "thur", day: "THURSDAY" },
  { prefix: "thu", day: "THURSDAY" },
  { prefix: "friday", day: "FRIDAY" },
  { prefix: "fri", day: "FRIDAY" },
  { prefix: "saturday", day: "SATURDAY" },
  { prefix: "sat", day: "SATURDAY" },
  { prefix: "sunday", day: "SUNDAY" },
  { prefix: "sun", day: "SUNDAY" },
];

export type TimetableSlotEntry = {
  title: string;
  faculty: string;
  room: string;
};

export type TimetableGridCell = {
  kind: "break" | "session" | "empty";
  /** Present when `kind === 'break'` — drives background (Angular: lunch often white, short break gray). */
  breakVariant?: "short" | "lunch" | "tea" | "other";
  breakLabel?: string;
  entries: TimetableSlotEntry[];
  timeLabel: string;
};

export type TimetableGridRow = {
  slotKey: string;
  sortOrder: number;
  cells: TimetableGridCell[];
};

export type StudentTimetableGrid = {
  dayLabels: string[];
  rows: TimetableGridRow[];
  dateRangeLabel: string;
};

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/** Angular `student-timetable.component.ts` day column backgrounds. */
const DAY_CELL_BG: Record<string, string> = {
  MONDAY: "#ADD8E6",
  TUESDAY: "#90EE90",
  WEDNESDAY: "#FFFFE0",
  THURSDAY: "#FFB6C1",
  FRIDAY: "#FFDAB9",
  SATURDAY: "#E6E6FA",
  SUNDAY: "#D3D3D3",
};

function dayColorFromWeekdayName(weekdayName: string): string {
  // Angular view-timetable uses exact string equality only.
  // Misspellings like "Thrusday" get no pastel → white cell (matches Angular UI).
  const n = weekdayName.trim();
  if (n === "Monday") return DAY_CELL_BG.MONDAY;
  if (n === "Tuesday") return DAY_CELL_BG.TUESDAY;
  if (n === "Wednesday") return DAY_CELL_BG.WEDNESDAY;
  if (n === "Thursday") return DAY_CELL_BG.THURSDAY;
  if (n === "Friday") return DAY_CELL_BG.FRIDAY;
  if (n === "Saturday") return DAY_CELL_BG.SATURDAY;
  if (n === "Sunday") return DAY_CELL_BG.SUNDAY;
  return "";
}

/** Angular view-timetable `.table-th` header background. */
export const TIMETABLE_HEADER_ROW_BG = "#C3D9FF";

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const out = String(value).trim();
    if (out) return out;
  }
  return "";
}

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function normalizeDay(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper === "THRUSDAY") return "THURSDAY";
  if (DAY_ORDER.includes(upper)) return upper;
  const map: Record<string, string> = {
    MON: "MONDAY",
    TUE: "TUESDAY",
    TUES: "TUESDAY",
    WED: "WEDNESDAY",
    THU: "THURSDAY",
    THUR: "THURSDAY",
    FRI: "FRIDAY",
    SAT: "SATURDAY",
    SUN: "SUNDAY",
  };
  return map[upper.slice(0, 3)] ?? upper;
}

function parseTimeValue(value: unknown): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  if (typeof value === "number" && value < 24) return value * 60;
  const raw = String(value).trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const d = new Date(`1970-01-01T${raw.replace(/\s*(AM|PM)/i, " $1")}`);
  if (!Number.isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] ?? "").toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** 12-hour clock with AM/PM — Angular timetable `(9:30 AM - 10:30 AM)`. */
function formatClockAmPm(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/AM|PM/i.test(raw)) {
    return raw
      .replace(/\s+/g, " ")
      .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  }
  const mins = parseTimeValue(value);
  if (mins >= Number.MAX_SAFE_INTEGER) return raw;
  const hours24 = Math.floor(mins / 60);
  const minutes = mins % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function normalizePeriodTimeDisplayAmPm(periodTime: string): string {
  const s = periodTime.trim();
  if (!s) return "";
  const inner = s.replace(/^\(+/, "").replace(/\)+$/, "").trim();
  const parts = inner.split(/\s*-\s*/);
  if (parts.length >= 2) {
    const a = formatClockAmPm(parts[0]);
    const b = formatClockAmPm(parts[1]);
    if (a && b) return `(${a} - ${b})`;
  }
  const one = formatClockAmPm(inner);
  if (one) return `(${one})`;
  return s.startsWith("(") ? s : `(${inner})`;
}

function formatTimeLabel(row: AnyRow): string {
  const from = text(row, [
    "fromTime",
    "startTime",
    "from_time",
    "periodFromTime",
    "period_from_time",
  ]);
  const to = text(row, [
    "toTime",
    "endTime",
    "to_time",
    "periodToTime",
    "period_to_time",
  ]);
  const fromFmt = formatClockAmPm(from || row.fromTime);
  const toFmt = formatClockAmPm(to || row.toTime);
  if (fromFmt && toFmt) return `(${fromFmt} - ${toFmt})`;
  if (fromFmt || toFmt) return `(${fromFmt || toFmt})`;
  const periodTime = text(row, ["Period_Time", "period_time"]);
  if (periodTime) return normalizePeriodTimeDisplayAmPm(periodTime);
  return "";
}

function breakVariantFromLabel(
  label: string,
): "short" | "lunch" | "tea" | "other" {
  const u = label.toUpperCase();
  if (u.includes("LUNCH")) return "lunch";
  if (u.includes("SHORT")) return "short";
  if (u.includes("TEA")) return "tea";
  return "other";
}

function formatHeaderDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isBreakRow(row: AnyRow): boolean {
  const subject = text(row, [
    "subjectName",
    "subject_name",
    "Subject_Name",
    "subjectCode",
    "subject_code",
    "periodName",
    "period_name",
  ]).toUpperCase();
  const periodType = text(row, [
    "periodType",
    "period_type",
    "sessionType",
    "session_type",
  ]).toUpperCase();
  return subject.includes("BREAK") || periodType.includes("BREAK");
}

function breakLabel(row: AnyRow): string {
  const raw = text(row, [
    "subjectName",
    "subject_name",
    "Subject_Name",
    "periodName",
    "period_name",
    "subjectCode",
    "subject_code",
  ]);
  const u = raw.toUpperCase();
  if (!u) return "BREAK";
  if (u.includes("SHORT")) return "SHORT BREAK";
  if (u.includes("LUNCH")) return "LUNCH BREAK";
  if (u.includes("TEA")) return "TEA BREAK";
  return u;
}

function batchPrefix(row: AnyRow): string {
  const batch = text(row, [
    "batchName",
    "batch_name",
    "batchCode",
    "batch_code",
    "studentBatchCode",
    "student_batch_code",
    "labBatchName",
    "lab_batch_name",
  ]);
  if (!batch) return "";
  const clean = batch.replace(/^\[|\]$/g, "").trim();
  return clean ? `[${clean}]` : "";
}

function subjectTitle(row: AnyRow): string {
  const code = text(row, [
    "subjectCode",
    "subject_code",
    "subCode",
    "sub_code",
    "Subject_Code",
  ]);
  const name = text(row, [
    "subjectName",
    "subject_name",
    "Subject_Name",
    "subName",
    "sub_name",
    "courseName",
    "course_name",
  ]);
  const prefix = batchPrefix(row);
  const base = name || code;
  if (!base) return prefix;
  if (prefix && !base.startsWith("[")) return `${prefix}${base}`;
  return base;
}

function facultyNames(row: AnyRow): string {
  return text(row, [
    "facultyName",
    "faculty_name",
    "Faculty_Name",
    "facultyNames",
    "faculty_names",
    "employeeName",
    "employee_name",
    "Employee_Name",
    "employeeNames",
    "employee_names",
    "staffName",
    "staff_name",
    "Staff_Name",
    "instructorName",
    "instructor_name",
    "Teacher_Name",
    "empName",
    "emp_name",
  ]);
}

function roomCode(row: AnyRow): string {
  return text(row, [
    "roomNo",
    "room_no",
    "Room_No",
    "roomName",
    "room_name",
    "roomCode",
    "room_code",
    "location",
    "Location",
    "hallNo",
    "hall_no",
  ]);
}

function slotKey(row: AnyRow): string {
  const period = num(row, [
    "periodNo",
    "period_no",
    "periodNumber",
    "period",
    "Period",
    "periodId",
    "period_id",
  ]);
  const from = parseTimeValue(
    row.fromTime ??
      row.startTime ??
      row.from_time ??
      row.periodFromTime ??
      row.period_from_time,
  );
  const to = parseTimeValue(
    row.toTime ??
      row.endTime ??
      row.to_time ??
      row.periodToTime ??
      row.period_to_time,
  );
  if (period > 0) return `p-${period}-${from}-${to}`;
  return `t-${from}-${to}`;
}

function slotSortOrder(row: AnyRow): number {
  const period = num(row, [
    "periodNo",
    "period_no",
    "periodNumber",
    "period",
    "Period",
    "periodId",
    "period_id",
  ]);
  const from = parseTimeValue(
    row.fromTime ??
      row.startTime ??
      row.from_time ??
      row.periodFromTime ??
      row.period_from_time,
  );
  return (period > 0 ? period * 10_000 : 0) + from;
}

function dayFromPropertyKey(key: string): string {
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  for (const { prefix, day } of DAY_KEY_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(prefix)) return day;
  }
  return "";
}

function dayFromDetailListKey(key: string): string {
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  for (const { prefix, day } of DAY_KEY_PREFIXES) {
    if (normalized === prefix) return day;
    if (
      normalized.startsWith(prefix) &&
      /(details?|list|slots|subjects|cells|entries|dto|data|wise)/i.test(
        normalized.slice(prefix.length),
      )
    ) {
      return day;
    }
  }
  return "";
}

function stripDayPrefixFromKey(key: string): string {
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  for (const { prefix } of DAY_KEY_PREFIXES) {
    if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  }
  return normalized;
}

function resolveDayFromRow(row: AnyRow): string {
  const weekDayObj = row.weekDay ?? row.weekday ?? row.WeekDay;
  if (
    weekDayObj &&
    typeof weekDayObj === "object" &&
    !Array.isArray(weekDayObj)
  ) {
    const nested = text(weekDayObj as AnyRow, [
      "weekDay",
      "dayName",
      "name",
      "weekDayName",
      "weekdayName",
      "code",
    ]);
    if (nested) return normalizeDay(nested);
  }

  const direct = text(row, [
    "weekDay",
    "weekday",
    "WeekDay_Name",
    "week_day_name",
    "dayName",
    "day_name",
    "week_day",
    "weekDayName",
    "weekdayName",
    "wdName",
    "dayNm",
    "day",
    "dayCode",
    "gdValue",
    "gd_value",
  ]);
  if (direct) return normalizeDay(direct);

  const dayNo = num(row, [
    "dayNo",
    "day_no",
    "colNo",
    "col_no",
    "columnNo",
    "weekdayNo",
    "weekdaySno",
    "weekDaySno",
    "weekDayId",
    "weekdayId",
    "fk_weekday_id",
    "fk_week_day_id",
  ]);
  if (dayNo >= 1 && dayNo <= 7) return DAY_BY_NUMBER[dayNo] ?? "";

  return "";
}

function assignDayField(cell: AnyRow, key: string, value: unknown): void {
  if (value == null || value === "") return;
  const lower = stripDayPrefixFromKey(key);
  if (/subject|course|paper|subname|subcode/i.test(lower)) {
    cell.subjectName = String(value);
    return;
  }
  if (/faculty|staff|emp|instructor|teacher/i.test(lower)) {
    cell.facultyName = String(value);
    return;
  }
  if (/room|hall|location|venue/i.test(lower)) {
    cell.roomNo = String(value);
    return;
  }
  if (/batch|group/i.test(lower)) {
    cell.batchName = String(value);
    return;
  }
  cell[key] = value;
}

/** Per-day array columns, e.g. mondayDetails / tuesdayDetailList with multiple lab batches. */
function expandPerDayDetailArrays(
  row: AnyRow,
  inheritedPeriod: AnyRow,
): AnyRow[] {
  const slots: AnyRow[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const day = dayFromDetailListKey(key);
    if (!day) continue;
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        slots.push({
          ...inheritedPeriod,
          ...row,
          ...(item as AnyRow),
          weekDay: day,
        });
      }
    }
  }
  return slots;
}

/** One period row with per-day columns (wide matrix from timetablescurr). */
function expandWideMatrixRow(row: AnyRow): AnyRow[] {
  const shared: AnyRow = {};
  const slots = new Map<string, AnyRow>();

  for (const [key, value] of Object.entries(row)) {
    const day = dayFromPropertyKey(key);
    if (!day) {
      if (
        !dayFromPropertyKey(key) &&
        !/^(mon|tue|wed|thu|fri|sat|sun)/i.test(key)
      ) {
        shared[key] = value;
      }
      continue;
    }

    const cell = slots.get(day) ?? { weekDay: day };
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(cell, value as AnyRow);
    } else {
      assignDayField(cell, key, value);
    }
    slots.set(day, cell);
  }

  if (slots.size === 0) return [];
  return [...slots.values()].map((cell) => ({ ...shared, ...cell }));
}

/** Normalize API payloads (flat list, nested lists, or day-keyed objects) into slot rows. */
export function expandTimetableRows(data: unknown): AnyRow[] {
  const out: AnyRow[] = [];

  function walk(
    node: unknown,
    inheritedDay = "",
    inheritedPeriod: AnyRow = {},
  ): void {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item, inheritedDay, inheritedPeriod);
      return;
    }

    if (typeof node !== "object") return;

    const row = node as AnyRow;
    const arrayKeys = [
      "resultList",
      "result",
      "data",
      "rows",
      "list",
      "timetable",
      "timetableList",
      "timeTableList",
      "sectionTimetable",
      "studentTimetable",
      "timetableCurr",
      "timetablescurr",
      "timetablesCurr",
      "sectionTimeTable",
      "sectionTimetable",
      "timetableDetails",
      "timetableDetailList",
      "schedule",
      "scheduleList",
      "periods",
      "periodList",
      "slots",
      "dayWiseDetails",
      "daywiseDetails",
      "dayWiseList",
      "timetableCellList",
      "cellList",
      "timeTableDayWiseList",
      "timeTableDetailsList",
      "timeTableDetailList",
      "sectionTimeTableDetails",
      "ttDayWiseList",
      "ttDetails",
      "detailList",
      "cells",
      "dayCells",
      "periodDetails",
      "periodDetailList",
      "timeTableDayWiseDTOList",
      "timeTableDaywiseDTOList",
    ];
    for (const key of arrayKeys) {
      if (Array.isArray(row[key])) {
        walk(row[key], inheritedDay, row);
        return;
      }
    }

    const nestedResult = row.result;
    if (Array.isArray(nestedResult)) {
      if (nestedResult.length > 0 && Array.isArray(nestedResult[0])) {
        walk(nestedResult[0], inheritedDay, row);
      } else {
        walk(nestedResult, inheritedDay, row);
      }
      return;
    }

    const gridSource =
      row.timeTable ??
      row.time_table ??
      row.timeTableGrid ??
      row.time_table_grid ??
      row.timetableGrid ??
      row.grid;
    if (Array.isArray(gridSource) && gridSource.length > 0) {
      const dayLabels = (
        Array.isArray(row.weekDays) ? row.weekDays : (row.weekdays ?? DAY_ORDER)
      ) as unknown[];
      for (const periodRow of gridSource) {
        if (!Array.isArray(periodRow)) {
          walk(periodRow, inheritedDay, row);
          continue;
        }
        for (let col = 0; col < periodRow.length; col++) {
          const cell = periodRow[col];
          if (cell == null || cell === "") continue;
          const dayLabel = dayLabels[col];
          const day =
            typeof dayLabel === "string"
              ? normalizeDay(dayLabel)
              : resolveDayFromRow(dayLabel as AnyRow) || DAY_ORDER[col] || "";
          if (typeof cell === "object") {
            walk({ ...row, ...(cell as AnyRow), weekDay: day }, day, row);
          } else if (day) {
            out.push({ ...row, weekDay: day, subjectName: String(cell) });
          }
        }
      }
      return;
    }

    if (Array.isArray(row.weekDays) && Array.isArray(row.periods)) {
      for (const period of row.periods as AnyRow[]) {
        const cells = period.cells ?? period.cellList ?? period.dayCells;
        if (!Array.isArray(cells)) continue;
        for (let i = 0; i < cells.length; i++) {
          const dayLabel = row.weekDays[i];
          const day =
            typeof dayLabel === "string"
              ? normalizeDay(dayLabel)
              : resolveDayFromRow(dayLabel as AnyRow);
          walk(
            { ...row, ...period, ...(cells[i] as AnyRow), weekDay: day },
            day,
            row,
          );
        }
      }
      return;
    }

    const dayDetailRows = expandPerDayDetailArrays(row, inheritedPeriod);
    if (dayDetailRows.length > 0) {
      for (const slot of dayDetailRows) out.push(slot);
      return;
    }

    const wideRows = expandWideMatrixRow(row);
    if (wideRows.length > 0) {
      for (const slot of wideRows) {
        out.push({ ...inheritedPeriod, ...slot });
      }
      return;
    }

    const day = resolveDayFromRow(row) || inheritedDay;
    let expandedChild = false;

    for (const [key, value] of Object.entries(row)) {
      const dayFromKey = dayFromPropertyKey(key);
      if (dayFromKey && value && typeof value === "object") {
        expandedChild = true;
        if (Array.isArray(value)) {
          for (const item of value) {
            walk(item, dayFromKey, row);
          }
        } else {
          walk(value, dayFromKey, row);
        }
      }
    }

    if (expandedChild) return;

    const schedule =
      row.schedule ?? row.scheduleList ?? row.periods ?? row.periodList;
    if (Array.isArray(schedule)) {
      for (const item of schedule) {
        walk(item, day || inheritedDay, row);
      }
      return;
    }

    if (day) {
      out.push({ ...inheritedPeriod, ...row, weekDay: day });
      return;
    }

    const hasSlotData =
      text(row, [
        "subjectName",
        "subject_name",
        "Subject_Name",
        "subjectCode",
        "subject_code",
        "subName",
        "sub_name",
        "subCode",
        "sub_code",
        "periodName",
        "period_name",
      ]) ||
      num(row, ["periodNo", "period_no", "periodNumber", "period", "Period"]) >
        0;

    if (hasSlotData) {
      const resolvedDay = resolveDayFromRow(row) || inheritedDay;
      if (resolvedDay) {
        out.push({ ...inheritedPeriod, ...row, weekDay: resolvedDay });
      }
    }
  }

  walk(data);
  return out;
}

function collectSlotLikeRows(data: unknown): AnyRow[] {
  const found: AnyRow[] = [];

  function collect(node: unknown): void {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) collect(item);
      return;
    }
    if (typeof node !== "object") return;

    const row = node as AnyRow;
    const hasDay = Boolean(resolveDayFromRow(row));
    const hasSubject = Boolean(
      text(row, [
        "subjectName",
        "subject_name",
        "Subject_Name",
        "subjectCode",
        "subject_code",
        "subName",
        "subCode",
      ]),
    );
    const hasPeriod =
      num(row, ["periodNo", "period_no", "periodNumber", "period", "Period"]) >
        0 ||
      Boolean(
        text(row, [
          "fromTime",
          "from_time",
          "periodFromTime",
          "period_from_time",
          "startTime",
        ]),
      );
    const isBreak = isBreakRow(row);

    if (hasDay || hasSubject || hasPeriod || isBreak) {
      found.push(row);
      return;
    }

    for (const value of Object.values(row)) collect(value);
  }

  collect(data);
  return found;
}

/** Expand API payload; fall back to collecting slot-like rows from nested envelopes. */
export function normalizeTimetableRows(payload: unknown): AnyRow[] {
  const expanded = expandTimetableRows(payload);
  if (expanded.length > 0) return expanded;

  const collected = collectSlotLikeRows(payload);
  return collected.filter(
    (row) =>
      resolveDayFromRow(row) ||
      text(row, [
        "subjectName",
        "subject_name",
        "Subject_Name",
        "subjectCode",
        "subject_code",
        "subName",
        "subCode",
      ]) ||
      isBreakRow(row),
  );
}

export type StudentTimetableFetchParams = {
  studentId?: number;
  collegeId?: number;
  academicYearId?: number;
  groupSectionId?: number;
  courseGroupId?: number;
  courseYearId?: number;
  check?: number;
};

/**
 * Angular students-profile Time Table tab: GET `timetablescurr` with `studentId` + `check=1`,
 * then section/college filters as fallback.
 */
export async function fetchStudentTimetableRows(
  params: StudentTimetableFetchParams,
): Promise<AnyRow[]> {
  const {
    studentId = 0,
    collegeId = 0,
    academicYearId = 0,
    groupSectionId = 0,
    courseGroupId = 0,
    courseYearId = 0,
    check,
  } = params;

  const attempts: Record<string, string | number>[] = [];

  if (studentId) {
    if (check != null) attempts.push({ studentId, check });
    attempts.push({ studentId });
    if (groupSectionId) attempts.push({ studentId, groupSectionId });
    if (collegeId && academicYearId)
      attempts.push({ studentId, collegeId, academicYearId });
  }

  if (groupSectionId && collegeId && academicYearId) {
    attempts.push({
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      groupSectionId,
    });
    attempts.push({ collegeId, academicYearId, groupSectionId });
    if (courseGroupId)
      attempts.push({
        collegeId,
        academicYearId,
        groupSectionId,
        courseGroupId,
      });
    if (courseYearId)
      attempts.push({
        collegeId,
        academicYearId,
        groupSectionId,
        courseYearId,
      });
  }

  const paths = [
    "timetablescurr",
    "timetablesCurr",
    "studenttimetable",
    "sectiontimetable",
  ];

  for (const path of paths) {
    for (const query of attempts) {
      try {
        const payload = await fetchProxyPayload(path, query);
        const rows = normalizeTimetableRows(payload);
        if (rows.length > 0) return rows;
      } catch {
        // try next endpoint / param set
      }
    }
  }

  return [];
}

export function timetableDateRangeLabel(
  student: AnyRow,
  rows: AnyRow[],
): string {
  const fromKeyGroups = [
    [
      "academicYearFromDate",
      "academic_year_from_date",
      "academicYearStartDate",
      "academic_year_start_date",
      "academicYearFrom",
      "timetableFromDate",
      "fromDate",
      "yearFromDate",
      "year_from_date",
      "ayFromDate",
      "ay_from_date",
      "startDate",
      "start_date",
      "fromDt",
      "from_dt",
      "fDate",
      "f_date",
      "yearStartDate",
      "year_start_date",
    ],
    [
      "academicYearToDate",
      "academic_year_to_date",
      "academicYearEndDate",
      "academic_year_end_date",
      "academicYearTo",
      "timetableToDate",
      "toDate",
      "yearToDate",
      "year_to_date",
      "ayToDate",
      "ay_to_date",
      "endDate",
      "end_date",
      "toDt",
      "to_dt",
      "tDate",
      "t_date",
      "yearEndDate",
      "year_end_date",
    ],
  ] as const;

  function pickFromRow(root: AnyRow, keys: string[]): string {
    return text(root, keys);
  }

  /** Studentdetail often keeps dates on `academicYear` / `AcademicYear`, not flattened on the root. */
  function pickFromNestedAcademicYear(keys: string[]): string {
    const candidates: unknown[] = [
      student.academicYear,
      student.AcademicYear,
      student.academic_year,
      (student.groupSection as AnyRow)?.academicYear,
      (student.groupSection as AnyRow)?.AcademicYear,
      (student.groupSection as AnyRow)?.academic_year,
      (student.studentDetail as AnyRow)?.academicYear,
      (student.studentDetail as AnyRow)?.AcademicYear,
      (student.StudentDetail as AnyRow)?.academicYear,
      (student.StudentDetail as AnyRow)?.AcademicYear,
      student.academicYearDTO,
      student.academicYearDto,
    ];
    for (const c of candidates) {
      if (!c || typeof c !== "object" || Array.isArray(c)) continue;
      const v = text(c as AnyRow, keys);
      if (v) return v;
    }
    return "";
  }

  let from =
    pickFromRow(student, [...fromKeyGroups[0]]) ||
    pickFromNestedAcademicYear([...fromKeyGroups[0]]);
  let to =
    pickFromRow(student, [...fromKeyGroups[1]]) ||
    pickFromNestedAcademicYear([...fromKeyGroups[1]]);

  if (!from || !to) {
    if (rows.length > 0) {
      const fromRow =
        rows.find((r) => {
          const x =
            r.fromDate ??
            r.startDate ??
            r.timetableFromDate ??
            r.effectiveFromDate ??
            r.Academic_Year_From;
          return x != null && String(x).trim() !== "";
        }) ?? rows[0];
      const toRow =
        rows.find((r) => {
          const x =
            r.toDate ??
            r.endDate ??
            r.timetableToDate ??
            r.effectiveToDate ??
            r.Academic_Year_To;
          return x != null && String(x).trim() !== "";
        }) ?? rows[0];
      if (!from && fromRow) {
        from =
          text(fromRow as AnyRow, [
            "fromDate",
            "startDate",
            "timetableFromDate",
            "effectiveFromDate",
            "Academic_Year_From",
            "academic_year_from",
            "in_fdate",
          ]) || String(fromRow.fromDate ?? fromRow.startDate ?? "").trim();
      }
      if (!to && toRow) {
        to =
          text(toRow as AnyRow, [
            "toDate",
            "endDate",
            "timetableToDate",
            "effectiveToDate",
            "Academic_Year_To",
            "academic_year_to",
            "in_tdate",
          ]) || String(toRow.toDate ?? toRow.endDate ?? "").trim();
      }
    }
  }

  const fromLabel = formatHeaderDate(from);
  const toLabel = formatHeaderDate(to);
  if (fromLabel && toLabel) return `${fromLabel} - ${toLabel}`;
  return fromLabel || toLabel || "";
}

export function buildStudentTimetableGrid(
  rowsInput: unknown,
  student?: AnyRow,
): StudentTimetableGrid {
  const rows = Array.isArray(rowsInput)
    ? (rowsInput as AnyRow[])
    : normalizeTimetableRows(rowsInput);
  const daySet = new Set<string>();
  const slotMap = new Map<
    string,
    { sortOrder: number; byDay: Map<string, AnyRow[]> }
  >();

  for (const row of rows) {
    const day = resolveDayFromRow(row);
    if (!day) continue;
    daySet.add(day);

    const key = slotKey(row);
    const sortOrder = slotSortOrder(row);
    let slot = slotMap.get(key);
    if (!slot) {
      slot = { sortOrder, byDay: new Map() };
      slotMap.set(key, slot);
    } else if (sortOrder < slot.sortOrder) {
      slot.sortOrder = sortOrder;
    }

    const dayRows = slot.byDay.get(day) ?? [];
    dayRows.push(row);
    slot.byDay.set(day, dayRows);
  }

  const dayLabels = DAY_ORDER.filter((d) => daySet.has(d));
  if (dayLabels.length === 0) {
    for (const d of [...daySet].sort()) dayLabels.push(d);
  }

  const gridRows: TimetableGridRow[] = [...slotMap.entries()]
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([key, slot]) => {
      const cells: TimetableGridCell[] = dayLabels.map((day) => {
        const dayRows = slot.byDay.get(day) ?? [];
        if (dayRows.length === 0) {
          return { kind: "empty", entries: [], timeLabel: "" };
        }

        if (dayRows.every(isBreakRow)) {
          const bl = breakLabel(dayRows[0]);
          return {
            kind: "break",
            breakVariant: breakVariantFromLabel(bl),
            breakLabel: bl,
            entries: [],
            timeLabel: formatTimeLabel(dayRows[0]),
          };
        }

        const entries: TimetableSlotEntry[] = dayRows
          .filter((r) => !isBreakRow(r))
          .map((r) => ({
            title: subjectTitle(r),
            faculty: facultyNames(r),
            room: roomCode(r),
          }));

        const timeLabel = formatTimeLabel(
          dayRows.find((r) => formatTimeLabel(r)) ?? dayRows[0],
        );
        return {
          kind: entries.length > 0 ? "session" : "empty",
          entries,
          timeLabel,
        };
      });

      return { slotKey: key, sortOrder: slot.sortOrder, cells };
    });

  return {
    dayLabels,
    rows: gridRows,
    dateRangeLabel: student
      ? timetableDateRangeLabel(student, rows)
      : timetableDateRangeLabel({}, rows),
  };
}

export function timetableDayHeaderBg(_day: string): string {
  return TIMETABLE_HEADER_ROW_BG;
}

export function timetableDayCellBg(day: string): string {
  return DAY_CELL_BG[day] ?? "#E6E6FA";
}

// ─── Angular students-profile timetable (timetablescurr + schedules) ─────────

export type TimetableSubBatch = {
  studentBatchId: number;
  studentBatchName: string;
  shortName: string;
  subjectCode: string;
  /** Angular matTooltip on subject code. */
  subjectName: string;
  staffName: string;
  roomName: string;
};

export type TimetableDayTiming = {
  weekdayId: number;
  weekdayName: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  classTimingName: string;
  colspan: number;
  colorCode: string;
  cellGroupId: string;
  subBatches: TimetableSubBatch[];
  /** Raw schedule id — used by assign-resource dialog (Angular parity). */
  timetableScheduleId?: number;
  subjectResource?: AnyRow[];
};

export type TimetableDayColumn = {
  weekdayId: number;
  weekdayName: string;
  timings: TimetableDayTiming[];
  /** Non-merged period rows for the weekday (assign-resource periods picker). */
  classTimings?: AnyRow[];
};

export type AngularStudentTimetable = {
  dateRangeLabel: string;
  weekdays: TimetableDayColumn[];
};

function asDetailRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const o = data as AnyRow;
    if (Array.isArray(o.resultList)) return o.resultList as AnyRow[];
    if (Array.isArray(o.result)) return o.result as AnyRow[];
    if (Array.isArray(o.data)) return o.data as AnyRow[];
  }
  return [];
}

function mapSubjectResource(res: AnyRow): TimetableSubBatch {
  return {
    studentBatchId: num(res, ["studentBatchId", "fk_student_batch_id"]),
    studentBatchName: text(res, [
      "studentBatchName",
      "student_batch_name",
      "batchName",
    ]),
    shortName: text(res, ["shortName", "short_name", "subjectShortName"]),
    subjectCode: text(res, ["subjectCode", "subject_code"]),
    subjectName: text(res, ["subjectName", "subject_name"]),
    staffName: text(res, [
      "staffName",
      "staff_name",
      "employeeName",
      "facultyName",
    ]),
    roomName: text(res, ["roomName", "room_name", "roomNo", "room_no"]),
  };
}

function subjectResourcesFromTiming(timing: AnyRow): AnyRow[] {
  const raw =
    timing.subjectResource ??
    timing.subjectResources ??
    timing.subject_resource ??
    timing.SubjectResource;
  if (Array.isArray(raw)) return raw as AnyRow[];
  return [];
}

function buildSubBatches(subjectResource: AnyRow[]): TimetableSubBatch[] {
  const subBatches: TimetableSubBatch[] = [];
  for (const res of subjectResource) {
    const typeCode = text(res, [
      "subjectTypeCode",
      "subject_type_code",
    ]).toUpperCase();
    const batchId = num(res, ["studentBatchId", "fk_student_batch_id"]);
    if (typeCode === "LAB" && batchId > 0) {
      const existing = subBatches.find((b) => b.studentBatchId === batchId);
      if (existing) {
        const extra = text(res, ["staffName", "staff_name"]);
        if (extra) {
          existing.staffName = existing.staffName
            ? `${existing.staffName} , ${extra}`
            : extra;
        }
      } else {
        subBatches.push(mapSubjectResource(res));
      }
    } else {
      subBatches.push(mapSubjectResource(res));
    }
  }
  return subBatches;
}

/** Angular view-timetable `.break { background: #efefef !important; }`. */
export function timetableBreakCellBg(
  _classTimingName: string,
  isBreak: boolean,
): string {
  if (!isBreak) return "";
  return "#efefef";
}

function mapScheduleTiming(
  timing: AnyRow,
  subBatches: TimetableSubBatch[],
): TimetableDayTiming {
  const weekdayName = text(timing, [
    "weekdayName",
    "weekday_name",
    "weekDayName",
  ]);
  const resources = subjectResourcesFromTiming(timing);
  const cellGroupId = resources[0]
    ? text(resources[0], ["cellGroupId", "cell_group_id"])
    : "";
  const classTimingName = text(timing, [
    "classTimingName",
    "class_timing_name",
    "periodName",
  ]);
  const isBreak =
    Boolean(timing.isBreak ?? timing.is_break) ||
    /break/i.test(classTimingName);

  return {
    weekdayId: num(timing, ["weekdayId", "fk_weekday_id", "weekday_id"]),
    weekdayName,
    startTime: text(timing, [
      "startTime",
      "start_time",
      "fromTime",
      "from_time",
    ]),
    endTime: text(timing, ["endTime", "end_time", "toTime", "to_time"]),
    isBreak,
    classTimingName,
    colspan: Math.max(1, Number(timing.colspan ?? timing.colSpan ?? 1) || 1),
    colorCode: isBreak
      ? timetableBreakCellBg(classTimingName, true)
      : dayColorFromWeekdayName(weekdayName),
    cellGroupId,
    subBatches,
    timetableScheduleId: num(timing, [
      "timetableScheduleId",
      "timetable_schedule_id",
    ]),
    subjectResource: resources,
  };
}

/** Mirrors Angular `selectedTimetable()` schedule grouping. */
export function buildAngularStudentTimetable(
  scheduleTimings: AnyRow[],
  timetableMeta?: AnyRow | null,
): AngularStudentTimetable {
  type WeekdayAcc = {
    weekdayId: number;
    weekdayName: string;
    classTimings: AnyRow[];
  };
  const weekdayMap = new Map<number, WeekdayAcc>();

  for (const raw of scheduleTimings) {
    const timing = { ...raw };
    const resources = subjectResourcesFromTiming(timing);
    if (resources.length > 0 && resources[0].colorCode != null) {
      timing.colorCode = resources[0].colorCode;
    }
    const weekdayId = num(timing, ["weekdayId", "fk_weekday_id"]);
    const weekdayName = text(timing, ["weekdayName", "weekday_name"]);
    timing.colorCode = dayColorFromWeekdayName(weekdayName);

    const existing = weekdayMap.get(weekdayId);
    if (existing) {
      existing.classTimings.push(timing);
    } else {
      weekdayMap.set(weekdayId, {
        weekdayId,
        weekdayName,
        classTimings: [timing],
      });
    }
  }

  const weekdays: TimetableDayColumn[] = [];

  for (const weekday of weekdayMap.values()) {
    const timings: TimetableDayTiming[] = [];

    for (const classTiming of weekday.classTimings) {
      const resources = subjectResourcesFromTiming(classTiming);
      const subBatches = buildSubBatches(resources);
      const cellGroupId = resources[0]
        ? text(resources[0], ["cellGroupId", "cell_group_id"])
        : "";

      if (resources.length > 0 && cellGroupId) {
        const existing = timings.find(
          (t) => t.cellGroupId && t.cellGroupId === cellGroupId,
        );
        if (existing) {
          existing.colspan = (existing.colspan || 1) + 1;
          continue;
        }
      }

      timings.push(mapScheduleTiming(classTiming, subBatches));
    }

    if (timings.length > 0) {
      weekdays.push({
        weekdayId: weekday.weekdayId,
        weekdayName: timings[0].weekdayName || weekday.weekdayName,
        timings,
        classTimings: weekday.classTimings,
      });
    }
  }

  // Angular preserves API encounter order (Map insertion order) — do not sort.
  // Sorting breaks misspelled names like "Thrusday" and can swap Fri/Thu.

  let dateRangeLabel = "";
  if (timetableMeta) {
    const from = formatHeaderDate(
      timetableMeta.startDate ??
        timetableMeta.start_date ??
        timetableMeta.timetable_startdate,
    );
    const to = formatHeaderDate(
      timetableMeta.endDate ??
        timetableMeta.end_date ??
        timetableMeta.timetable_enddate,
    );
    if (from && to) dateRangeLabel = `${from} - ${to}`;
  }

  return { dateRangeLabel, weekdays };
}

async function fetchTimetableScurrList(
  collegeId: number,
  academicYearId: number,
  groupSectionId: number,
): Promise<AnyRow[]> {
  const paramSets: Record<string, string | number>[] = [
    {
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      groupSectionId,
      isActive: "true",
    },
    { collegeId, academicYearId, groupSectionId, isActive: "true" },
    { collegeId, academicYearId, groupSectionId },
  ];
  for (const params of paramSets) {
    try {
      const data = await fetchDetails<unknown>("timetablescurr", params);
      const rows = asDetailRows(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

async function fetchScheduleTimingsForTimetable(
  collegeId: number,
  academicYearId: number,
  groupSectionId: number,
  timetableId: number,
): Promise<AnyRow[]> {
  if (!timetableId) return [];
  const paramSets: Record<string, string | number>[] = [
    {
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    },
    {
      collegeId,
      academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    },
    { collegeId, academicYearId, groupSectionId, timetableId },
  ];
  for (const params of paramSets) {
    try {
      const data = await fetchDetails<unknown>("schedules", params);
      const rows = asDetailRows(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

/**
 * Angular students-profile Time Table tab: `timetablescurr` → pick timetable → `schedules` timings.
 */
export async function loadAngularStudentTimetable(
  student: AnyRow,
): Promise<AngularStudentTimetable | null> {
  const collegeId = num(student, ["collegeId", "fk_college_id"]);
  const academicYearId = num(student, [
    "academicYearId",
    "fk_academic_year_id",
  ]);
  const groupSectionId = num(student, [
    "groupSectionId",
    "fk_group_section_id",
    "group_section_id",
  ]);
  if (!collegeId || !academicYearId || !groupSectionId) return null;

  const timetables = await fetchTimetableScurrList(
    collegeId,
    academicYearId,
    groupSectionId,
  );
  if (timetables.length === 0) return null;

  const timetable =
    timetables.find((t) => num(t, ["timetableId", "fk_timetable_id"]) > 0) ??
    timetables[0];
  const timetableId = num(timetable, ["timetableId", "fk_timetable_id"]);

  const scheduleTimings = await fetchScheduleTimingsForTimetable(
    collegeId,
    academicYearId,
    groupSectionId,
    timetableId,
  );
  if (scheduleTimings.length === 0) return null;

  return buildAngularStudentTimetable(scheduleTimings, timetable);
}

/** Angular `calculateHeight`: duration in hours × 140px. */
export function timetableCellHeightPx(
  startTime: string,
  endTime: string,
): number {
  const start = parseTimeValue(startTime);
  const end = parseTimeValue(endTime);
  if (start >= Number.MAX_SAFE_INTEGER || end >= Number.MAX_SAFE_INTEGER)
    return 96;
  const durationHours = Math.max(0.25, (end - start) / 60);
  return Math.round(durationHours * 140);
}
