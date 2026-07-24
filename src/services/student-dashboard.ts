/**
 * Angular `student-dashboard` API helpers — audience notifications + today timings.
 * Reuses existing events / timetable / student-information services.
 */

import { EVENTS_API, NEXT_API } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import { parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import { listStudentAudienceEvents, type CollegeEventRow } from "./events";
import { listGeneralDetailsByCode } from "./student-information";
import {
  loadAngularStudentTimetable,
  type TimetableDayTiming,
} from "./student-timetable";

export type StudentDashboardNotification = Record<string, unknown>;

type AnyRow = Record<string, unknown>;

function asRows<T>(data: unknown): T[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as T[];
    return [list as T];
  }
  return [data as T];
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function text(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Angular audience master code `AUDTYPE` → student detail code `STD`. */
export async function resolveStudentAudienceId(): Promise<number> {
  const rows = await listGeneralDetailsByCode(GM_CODES.AUDIENCE);
  const std = rows.find(
    (r) =>
      String(
        (r as AnyRow).generalDetailCode ??
          (r as AnyRow).general_detail_code ??
          "",
      ).toUpperCase() === "STD",
  );
  return positiveId(
    (std as AnyRow | undefined)?.generalDetailId,
    (std as AnyRow | undefined)?.general_detail_id,
  );
}

/**
 * Angular `notificationbyaudience` seven-param list for student portal.
 * Keys match Angular listBySevenIds casing exactly.
 */
export async function listStudentAudienceNotifications(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  notificationAudienceId: number;
  studentId: number;
}): Promise<StudentDashboardNotification[]> {
  if (
    !params.collegeId ||
    !params.academicYearId ||
    !params.groupSectionId ||
    !params.notificationAudienceId ||
    !params.studentId
  ) {
    return [];
  }
  const qs = [
    `notificationFor=S`,
    `collegeId=${params.collegeId}`,
    `academicYearId=${params.academicYearId}`,
    `sectionId=${params.groupSectionId}`,
    `notificationAudienceId=${params.notificationAudienceId}`,
    `status=true`,
    `studentId=${params.studentId}`,
  ].join("&");
  const res = await fetch(
    `${NEXT_API.PROXY(EVENTS_API.NOTIFICATIONBYAUDIENCE)}?${qs}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (body.success === false) return [];
  return asRows<StudentDashboardNotification>(body.data);
}

/** Angular `getEvents` — student section audience events for a date. */
export async function listStudentDashboardEvents(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  audienceTypeId: number;
  date?: Date;
}): Promise<CollegeEventRow[]> {
  return listStudentAudienceEvents({
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    groupSectionId: params.groupSectionId,
    audienceTypeId: params.audienceTypeId,
    date: params.date ?? new Date(),
  });
}

/** Angular `selectedTimetable` filtered to today's weekday. */
export async function loadStudentTodayTimetable(
  student: AnyRow,
  weekdayName?: string,
): Promise<TimetableDayTiming[]> {
  const angular = await loadAngularStudentTimetable(student);
  if (!angular?.weekdays?.length) return [];
  const today =
    weekdayName || new Date().toLocaleDateString("en-US", { weekday: "long" });
  const day = angular.weekdays.find(
    (d) => d.weekdayName.toLowerCase() === today.toLowerCase(),
  );
  return day?.timings ?? [];
}

/** Map studentdetail fields used by Angular student-dashboard localStorage. */
export function studentDashboardProfileFromDetail(
  student: AnyRow,
  fallback?: {
    firstName?: string;
    academicYear?: string;
    collegeName?: string;
  },
) {
  const photoPath = text(student, [
    "photoPath",
    "photo_path",
    "studentPhotoPath",
  ]);
  const uNumber = text(student, [
    "rollNumber",
    "uNumber",
    "universityNumber",
    "studentNumber",
  ]);
  const uName =
    text(student, ["studentName", "fullName", "name"]) ||
    [text(student, ["firstName"]), text(student, ["lastName"])]
      .filter(Boolean)
      .join(" ") ||
    fallback?.firstName ||
    "";
  return {
    photoPath,
    uNumber,
    uName,
    courseName: text(student, ["courseName", "course_name", "groupName"]),
    academicYear:
      text(student, ["academicYear", "academicYearName", "academic_year"]) ||
      fallback?.academicYear ||
      "",
    groupCode: text(student, ["groupCode", "courseGroupCode", "group_code"]),
    courseYearName: text(student, [
      "courseYearName",
      "fromCourseYearName",
      "course_year_name",
    ]),
    section: text(student, ["section", "sectionName", "groupSectionName"]),
    groupSectionId: positiveId(
      student.groupSectionId,
      student.fk_group_section_id,
      student["GroupSection.groupSectionId"],
    ),
    studentStatusCode: text(student, [
      "studentStatusCode",
      "statusCode",
      "student_status_code",
    ]),
    studentId: positiveId(student.studentId, student.studentDetailId),
    collegeId: positiveId(student.collegeId, student["College.collegeId"]),
    academicYearId: positiveId(
      student.academicYearId,
      student.fk_academic_year_id,
    ),
  };
}

/** Angular `tConvert` — 24h "HH:mm" / "HH:mm:ss" → "h:mm AM/PM". */
export function formatStudentDashboardTime(time: string): string {
  if (!time) return "";
  const m = String(time).match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return time;
  const hour24 = Number(m[1]);
  const mins = m[2];
  const ampm = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${mins} ${ampm}`;
}
