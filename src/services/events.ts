import { EVENTS_API, NEXT_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainSoftDelete,
  domainUpdate,
  postDetails,
  uploadFile,
} from "./crud";
import { listAcademicYearsForCollege } from "./timetable-management";
import type {
  CollegeEventRow,
  DepartmentEventAudienceRow,
  DepartmentEventPhotoRow,
  DepartmentEventResourceRow,
  DepartmentEventRow,
  EventTypeRow,
} from "@/types/events";

export type {
  CollegeEventRow,
  DepartmentEventAudienceRow,
  DepartmentEventPhotoRow,
  DepartmentEventResourceRow,
  DepartmentEventRow,
  EventTypeRow,
};

function asRows<T>(data: unknown): T[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as T[];
    return [list as T];
  }
  if (typeof data === "object") return [data as T];
  return [];
}

/**
 * Angular add-event / college-calendar `date` query value (`d/MM/yyyy`).
 * Month is zero-padded like Angular string-concat; year is the real 4-digit year
 * (Angular accidentally pads year when day < 10 via `0 + year` — do not copy that).
 * Keep literal `/` in the request URL — Angular `listByFiveIds` does not encode as `%2F`.
 */
export function formatEventCalendarDate(d: Date): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const monthStr = month < 10 ? `0${month}` : String(month);
  return `${day}/${monthStr}/${year}`;
}

/** Angular `listByFiveIds` query — values concatenated, date slashes left literal. */
function buildUnencodedQuery(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("&");
}

/**
 * GET `collegecalendar?…` with Angular listByFiveIds/listByThreeIds semantics:
 * - literal `/` in `date` (not `%2F`)
 * - statusCode 200 + data → rows (Angular school-calender / add-event)
 * - empty / unsuccessful → empty list (Angular shows empty table / calendar)
 */
async function fetchCollegeCalendar(
  params: Record<string, string | number>,
): Promise<CollegeEventRow[]> {
  const res = await fetch(
    `${NEXT_API.PROXY(EVENTS_API.COLLEGE_CALENDAR)}?${buildUnencodedQuery(params)}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown> & {
    statusCode?: number | string;
    resultList?: unknown;
  };
  const status = body.statusCode != null ? Number(body.statusCode) : 200;
  if (status !== 200) {
    throw parseApiError(res, body);
  }
  // Angular: `if (result.data && result.data !== '') { holidaysList = result.data }`
  const fromData = asRows<CollegeEventRow>(body.data);
  if (fromData.length > 0) return fromData;
  if (Array.isArray(body.resultList) && body.resultList.length > 0) {
    return body.resultList as CollegeEventRow[];
  }
  return [];
}

function pickEventTypeCollegeId(
  row: Partial<EventTypeRow> & Record<string, unknown>,
): number {
  const nested = (row.college ?? row.College) as
    | { collegeId?: number }
    | undefined;
  const n = Number(row.collegeId ?? nested?.collegeId ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Flatten nested College FK fields Spring returns on list payloads. */
function normalizeEventTypeRow(row: EventTypeRow): EventTypeRow {
  const r = row as EventTypeRow & Record<string, unknown>;
  const nested = (r.college ?? r.College) as
    | { collegeId?: number; collegeCode?: string; collegeName?: string }
    | undefined;
  const collegeId = pickEventTypeCollegeId(r);
  return {
    ...row,
    collegeId: collegeId || row.collegeId,
    collegeCode: row.collegeCode ?? nested?.collegeCode ?? nested?.collegeName,
  };
}

/** Angular EventType create/update body — PK + flat + nested College. */
function buildEventTypePayload(
  data: Partial<EventTypeRow>,
  eventTypeId?: number,
): Record<string, unknown> {
  const collegeId = pickEventTypeCollegeId(
    data as Partial<EventTypeRow> & Record<string, unknown>,
  );
  const isActive = data.isActive !== false;
  const payload: Record<string, unknown> = {
    collegeId,
    college: { collegeId },
    eventTypeName: String(data.eventTypeName ?? "").trim(),
    isActive,
    reason: isActive
      ? "active"
      : typeof data.reason === "string" && data.reason.trim()
        ? data.reason.trim()
        : "inactive",
  };
  if (eventTypeId != null) {
    payload.eventTypeId = eventTypeId;
  }
  return payload;
}

export async function listEventTypes(): Promise<EventTypeRow[]> {
  const rows = await domainList<EventTypeRow>(
    ENTITIES.EVENT_TYPE.name,
    buildQuery({}),
  );
  return rows.map(normalizeEventTypeRow);
}

export async function listEventTypesByCollege(
  collegeId: number,
): Promise<EventTypeRow[]> {
  const rows = await domainList<EventTypeRow>(
    ENTITIES.EVENT_TYPE.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
  return rows.map(normalizeEventTypeRow);
}

export async function createEventType(
  data: EventTypeRow,
): Promise<EventTypeRow> {
  return domainCreate<EventTypeRow>(
    ENTITIES.EVENT_TYPE.name,
    buildEventTypePayload(data),
  );
}

export async function updateEventType(
  eventTypeId: number,
  data: Partial<EventTypeRow>,
): Promise<EventTypeRow> {
  return domainUpdate<EventTypeRow>(
    ENTITIES.EVENT_TYPE.name,
    ENTITIES.EVENT_TYPE.pk,
    eventTypeId,
    buildEventTypePayload(data, eventTypeId),
  );
}

export function eventTypeDuplicate(
  rows: EventTypeRow[],
  collegeId: number,
  name: string,
  excludeId?: number,
): boolean {
  const key = name.trim().toLowerCase();
  return rows.some(
    (r) =>
      Number(r.collegeId) === collegeId &&
      String(r.eventTypeName ?? "")
        .trim()
        .toLowerCase() === key &&
      Number(r.eventTypeId) !== excludeId,
  );
}

/** All events for college + academic year — `domain/list/Event`. */
export async function listEventsByCollegeAndYear(
  collegeId: number,
  academicYearId: number,
): Promise<CollegeEventRow[]> {
  try {
    return await domainList<CollegeEventRow>(
      ENTITIES.EVENT.name,
      buildQuery({
        "College.collegeId": collegeId,
        "AcademicYear.academicYearId": academicYearId,
        isActive: true,
      }),
    );
  } catch {
    // Angular AllEventsList treats empty / unsuccessful as empty table.
    return [];
  }
}

/** Month/day events — `collegecalendar` five-param (Angular add-event / college-calendar). */
export async function listCollegeCalendarMonthEvents(params: {
  collegeId: number;
  academicYearId: number;
  date: Date;
}): Promise<CollegeEventRow[]> {
  return fetchCollegeCalendar({
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    eventsFor: "month",
    date: formatEventCalendarDate(params.date),
    isActive: "true",
  });
}

/**
 * School calendar / holidays list — Angular school-calender
 * GET `/cms/collegecalendar?collegeId=17&academicYearId=101&isHoliday=true`
 * Browser: `/api/proxy/collegecalendar?collegeId=…&academicYearId=…&isHoliday=true`
 */
export async function listSchoolCalendarEvents(
  collegeId: number,
  academicYearId: number,
): Promise<CollegeEventRow[]> {
  const cid = Number(collegeId);
  const ayId = Number(academicYearId);
  if (!cid || !ayId) return [];

  // Keep param order identical to Angular DevTools.
  const qs = `collegeId=${cid}&academicYearId=${ayId}&isHoliday=true`;
  const res = await fetch(
    `${NEXT_API.PROXY(EVENTS_API.COLLEGE_CALENDAR)}?${qs}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown> & {
    statusCode?: number | string;
    resultList?: unknown;
  };
  const status = body.statusCode != null ? Number(body.statusCode) : 200;
  if (status !== 200) {
    throw parseApiError(res, body);
  }
  const fromData = asRows<CollegeEventRow>(body.data);
  if (fromData.length > 0) return fromData;
  if (Array.isArray(body.resultList) && body.resultList.length > 0) {
    return body.resultList as CollegeEventRow[];
  }
  return [];
}

/** Staff audience events — `eventsByAudience` seven-param. */
export async function listStaffAudienceEvents(params: {
  collegeId: number;
  academicYearId: number;
  departmentId: number;
  audienceTypeId: number;
  date: Date;
}): Promise<CollegeEventRow[]> {
  const qs = buildUnencodedQuery({
    eventsFor: "E",
    collegeId: params.collegeId,
    deptId: params.departmentId,
    eventAudienceId: params.audienceTypeId,
    date: formatEventCalendarDate(params.date),
    academicYearId: params.academicYearId,
    status: "true",
  });
  const res = await fetch(
    `${NEXT_API.PROXY(EVENTS_API.EVENTS_BY_AUDIENCE)}?${qs}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (body.success === false) return [];
  return asRows<CollegeEventRow>(body.data);
}

/** Student audience events — `eventsByAudience` for student section. */
export async function listStudentAudienceEvents(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  audienceTypeId: number;
  date: Date;
}): Promise<CollegeEventRow[]> {
  const qs = buildUnencodedQuery({
    eventsFor: "S",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    sectionId: params.groupSectionId,
    eventAudienceId: params.audienceTypeId,
    date: formatEventCalendarDate(params.date),
    status: "true",
  });
  const res = await fetch(
    `${NEXT_API.PROXY(EVENTS_API.EVENTS_BY_AUDIENCE)}?${qs}`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown>;
  if (body.success === false) return [];
  return asRows<CollegeEventRow>(body.data);
}

export async function saveCollegeEvents(
  rows: CollegeEventRow[],
): Promise<void> {
  await postDetails(EVENTS_API.EVENTS, rows);
}

export async function deleteCollegeEvent(eventId: number): Promise<void> {
  await domainSoftDelete(ENTITIES.EVENT.name, ENTITIES.EVENT.pk, eventId);
}

function normalizeDepartmentEventRow(
  row: DepartmentEventRow,
): DepartmentEventRow {
  const r = row as DepartmentEventRow & Record<string, unknown>;
  const audiences =
    r.departmentEventAudienceDTOs ?? r.departmentEventAudienceDTOS ?? [];
  const resources =
    r.departmentEventResourceDTOS ?? r.departmentEventResourceDTOs ?? [];
  const photos = r.departmentEventPhotoDTOS ?? r.departmentEventPhotoDTOs ?? [];
  return {
    ...row,
    departmentEventAudienceDTOs: Array.isArray(audiences)
      ? (audiences as DepartmentEventAudienceRow[])
      : [],
    departmentEventResourceDTOS: Array.isArray(resources)
      ? (resources as DepartmentEventResourceRow[])
      : [],
    departmentEventPhotoDTOS: Array.isArray(photos)
      ? (photos as DepartmentEventPhotoRow[])
      : [],
  };
}

export async function listDepartmentEvents(): Promise<DepartmentEventRow[]> {
  const rows = await domainList<DepartmentEventRow>(
    ENTITIES.DEPARTMENT_EVENT.name,
    buildQuery({}),
  );
  return rows.map(normalizeDepartmentEventRow);
}

export async function createDepartmentEvent(
  data: DepartmentEventRow,
): Promise<DepartmentEventRow> {
  return postDetails<DepartmentEventRow>(EVENTS_API.DEPARTMENT_EVENT, data);
}

export async function updateDepartmentEvent(
  data: DepartmentEventRow,
): Promise<DepartmentEventRow> {
  return postDetails<DepartmentEventRow>(EVENTS_API.DEPARTMENT_EVENT, data);
}

/** Angular `departmentEvent/uploadFiles` multipart after save. */
export async function uploadDepartmentEventFiles(
  formData: FormData,
): Promise<unknown> {
  return uploadFile(EVENTS_API.DEPARTMENT_EVENT_UPLOAD, formData);
}

export { listAcademicYearsForCollege };
