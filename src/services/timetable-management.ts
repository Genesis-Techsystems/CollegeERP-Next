import {
  EMPLOYEE_API,
  SUBJECT_API,
  TIMETABLE_MGMT_API,
} from "@/config/constants/api";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  fetchDetailsById,
  getAllRecords,
  postDetails,
  postDetailsEnvelope,
  putDetails,
  putDetailsEnvelope,
} from "./crud";
import { listActiveCollegesForGeneralSettings } from "./admin/college";
import { listStaffSubjectRows } from "./admin/staff-subject-mapping";
import { listAcademicYearsByUniversity } from "./pre-examination";
import {
  buildAngularStudentTimetable,
  buildStudentTimetableGrid,
  fetchWeeklyTimetableReportRows,
  normalizeTimetableRows,
  type AngularStudentTimetable,
  type StudentTimetableGrid,
} from "./student-timetable";

export type TimetableFilterFlag = "clg_filters" | "cls_timtable_filters";

type AnyRow = Record<string, unknown>;

function normalizeListPayload(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.content)) return obj.content as AnyRow[];
    if (Array.isArray(obj.result)) return obj.result as AnyRow[];
  }
  return [];
}

/**
 * Angular `listAllDetails(url)` → GET `{endURL}domain/list/{url}?query=order(createdDt=desc)&size=99999`
 * e.g. `https://dev2.skolo.in:8443/cms/domain/list/Timetable?query=order(createdDt=desc)&size=99999`
 * (`endURL` already includes `/cms/`; proxy path is `domain/list`, not `cms/domain/list`).
 */
const TIMETABLE_LIST_QUERY = "order(createdDt=desc)";

function listTimetableEntity(
  entity: string,
  query = TIMETABLE_LIST_QUERY,
): Promise<AnyRow[]> {
  return domainList<AnyRow>(entity, query);
}

/** Angular `listAllDetails(timingSetCrudUrl)`. */
export async function listTimingSets(): Promise<AnyRow[]> {
  return listTimetableEntity(TIMETABLE_MGMT_API.TIMING_SET_ENTITY);
}

/** Angular `listAllDetails(timetableCrudUrl)`. */
export async function listTimetables(): Promise<AnyRow[]> {
  return listTimetableEntity(TIMETABLE_MGMT_API.TIMETABLE_ENTITY);
}

export async function getTimetableById(
  timetableId: number,
): Promise<AnyRow | null> {
  if (!timetableId) return null;
  const rows = await listTimetableEntity(
    TIMETABLE_MGMT_API.TIMETABLE_ENTITY,
    `timetableId==${timetableId}.order(createdDt=desc)`,
  );
  return rows[0] ?? null;
}

export type TimetableFormPayload = {
  collegeId: number;
  academicYearId: number;
  timetableName: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  reason?: string;
  timetableId?: number;
  /** When editing — preserve API ISO timestamps if calendar date unchanged (Angular round-trip). */
  originalStartDate?: string;
  originalEndDate?: string;
};

/** Angular manage-timetable: `new Date(details.startDate + 'UTC')`. */
function angularDateConvert(value: Date | string): string {
  const converted = new Date(String(value) + "UTC");
  if (!Number.isNaN(converted.getTime())) {
    return converted.toISOString();
  }
  return new Date(value).toISOString();
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Angular edit keeps existing API timestamps (e.g. startDate `…T05:30:00.000Z`)
 * when the user does not change the calendar date; new/changed dates use `+ 'UTC'`.
 */
function resolveTimetableDate(
  picked: string | Date,
  original?: string,
): string {
  const pickedDate = picked instanceof Date ? picked : new Date(String(picked));
  if (original) {
    const origDate = new Date(original);
    if (
      !Number.isNaN(pickedDate.getTime()) &&
      !Number.isNaN(origDate.getTime()) &&
      sameCalendarDay(pickedDate, origDate)
    ) {
      return origDate.toISOString();
    }
  }
  return angularDateConvert(pickedDate);
}

/** Angular `addDetails` / `updateDetails` on Timetable. */
export async function saveTimetable(
  payload: TimetableFormPayload,
): Promise<unknown> {
  const body: AnyRow = {
    collegeId: payload.collegeId,
    academicYearId: payload.academicYearId,
    timetableName: payload.timetableName.trim(),
    startDate: resolveTimetableDate(
      payload.startDate,
      payload.originalStartDate,
    ),
    endDate: resolveTimetableDate(payload.endDate, payload.originalEndDate),
    isActive: payload.isActive,
    reason: payload.isActive ? "active" : (payload.reason ?? ""),
  };
  if (payload.timetableId) {
    // Angular updateDetails sends timetableId in the PUT body as well as query
    body.timetableId = payload.timetableId;
    return domainUpdate(
      TIMETABLE_MGMT_API.TIMETABLE_ENTITY,
      "timetableId",
      payload.timetableId,
      body,
    );
  }
  return domainCreate(TIMETABLE_MGMT_API.TIMETABLE_ENTITY, body);
}

export async function listCollegesForTimetable(): Promise<AnyRow[]> {
  return listActiveCollegesForGeneralSettings() as unknown as Promise<AnyRow[]>;
}

export async function listAcademicYearsForCollege(
  collegeId: number,
): Promise<AnyRow[]> {
  const colleges = await listCollegesForTimetable();
  const college = colleges.find((c) => Number(c.collegeId) === collegeId);
  const universityId = Number(college?.universityId ?? 0);
  if (!universityId) return [];
  return listAcademicYearsByUniversity(universityId);
}

/** Angular `list(timingsetsUrl, timingSetId)` → GET `cms/timingsets/{id}`. */
export async function getTimingSetById(
  timingsetId: number,
): Promise<AnyRow | null> {
  if (!timingsetId) return null;
  try {
    const data = await fetchDetailsById<unknown>(
      TIMETABLE_MGMT_API.TIMING_SETS_BY_ID,
      timingsetId,
    );
    if (data == null || data === "") return null;
    if (typeof data === "object" && !Array.isArray(data)) {
      return data as AnyRow;
    }
    const rows = normalizeListPayload(data);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Angular `list(timingsetsUrl, timingSetId)` — class timings only (legacy helper). */
export async function listClassTimingsByTimingSet(
  timingsetId: number,
): Promise<AnyRow[]> {
  const detail = await getTimingSetById(timingsetId);
  if (!detail) return [];
  const weekdays = detail.classWeekdays;
  if (!Array.isArray(weekdays) || weekdays.length === 0) return [];
  const first = weekdays[0] as AnyRow;
  const timings = first.classTimings;
  return Array.isArray(timings) ? (timings as AnyRow[]) : [];
}

/** Angular `listDetailsById(weekdayCrudUrl, 'true', isActive)`. */
export async function listMasterWeekdays(): Promise<AnyRow[]> {
  try {
    const data = await fetchDetails<unknown>(
      TIMETABLE_MGMT_API.WEEKDAY_ENTITY,
      {
        isActive: "true",
      },
    );
    const rows = normalizeListPayload(data);
    if (rows.length > 0) return rows;
  } catch {
    // fall through
  }
  return domainList<AnyRow>(
    TIMETABLE_MGMT_API.WEEKDAY_ENTITY,
    buildQuery({ isActive: true }),
  );
}

/** Angular POST `addTimingSet` / PUT `updateTimingsets` body — full timingSlots object. */
export type TimingSetSavePayload = Record<string, unknown>;

/** Angular `add(addTimingSetUrl, timingSlots)`. */
export async function addTimingSet(
  payload: TimingSetSavePayload,
): Promise<unknown> {
  return postDetails(TIMETABLE_MGMT_API.ADD_TIMING_SET, payload);
}

/** Angular `update(updateTimingsetsUrl, timingSlots)` — full GET object + form fields. */
export async function updateTimingSet(
  payload: TimingSetSavePayload,
): Promise<unknown> {
  return putDetails(TIMETABLE_MGMT_API.UPDATE_TIMING_SETS, payload);
}

export type AllocatedTimetableViewParams = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  timetableId?: number;
};

async function fetchScheduleRowsForSection(
  params: AllocatedTimetableViewParams,
): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId, timetableId } = params;
  if (!collegeId || !academicYearId || !groupSectionId || !timetableId)
    return [];

  // Prefer Angular listByFiveIds shape first (exact param names/order).
  const paramSets: Record<string, string | number>[] = [
    {
      collegeId,
      academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    },
    { collegeId, academicYearId, groupSectionId, timetableId },
    {
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    },
  ];

  for (const query of paramSets) {
    try {
      const data = await fetchDetails<unknown>("schedules", query);
      const rows = normalizeListPayload(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

/** Load weekly matrix for “View Allocated timetable” (report proc → schedules fallback). */
export async function fetchAllocatedTimetableGrid(
  params: AllocatedTimetableViewParams,
): Promise<StudentTimetableGrid> {
  const {
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId,
    timetableId,
  } = params;

  let rows: AnyRow[] = [];
  if (timetableId) {
    const scheduleRows = await fetchScheduleRowsForSection(params);
    rows = normalizeTimetableRows(scheduleRows);
  }
  if (rows.length === 0) {
    rows = await fetchWeeklyTimetableReportRows({
      collegeId,
      courseId: courseId || 0,
      courseGroupId: courseGroupId || 0,
      courseYearId: courseYearId || 0,
      academicYearId,
      groupSectionId,
    });
  }
  if (rows.length === 0) {
    const scheduleRows = await fetchScheduleRowsForSection(params);
    rows = normalizeTimetableRows(scheduleRows);
  }

  let meta: AnyRow | undefined;
  if (timetableId) {
    const tt = await getTimetableById(timetableId);
    if (tt) meta = tt;
  }

  return buildStudentTimetableGrid(rows, meta);
}

/** Human-readable section line for modal header (course / branch / year / section). */
export function formatAllocatedSectionLabel(row: AnyRow): string {
  const parts = [
    String(row.courseName ?? row.course_name ?? "").trim(),
    String(
      row.courseGroupName ?? row.course_group_name ?? row.groupName ?? "",
    ).trim(),
    String(
      row.courseYearName ?? row.course_year_name ?? row.yearName ?? "",
    ).trim(),
    String(
      row.groupSectionName ??
        row.group_section_name ??
        row.sectionName ??
        row.section ??
        "",
    ).trim(),
  ].filter(Boolean);
  return parts.join(" / ");
}

function procContext(): { orgId: number; employeeId: number } {
  if (typeof window === "undefined") return { orgId: 0, employeeId: 0 };
  return {
    orgId: Number(localStorage.getItem("organizationId") ?? 0) || 0,
    employeeId: Number(localStorage.getItem("employeeId") ?? 0) || 0,
  };
}

function unwrapFilterGroups(
  data: unknown,
  flag: TimetableFilterFlag,
): AnyRow[] {
  const groups =
    data && typeof data === "object" && Array.isArray((data as AnyRow).result)
      ? ((data as AnyRow).result as unknown[][])
      : [];
  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0] as AnyRow;
    if (String(first.flag ?? "") === flag) return group as AnyRow[];
  }
  return groups.flatMap((g) => (Array.isArray(g) ? (g as AnyRow[]) : []));
}

/** Angular `s_get_collegewisedetails_bycode` — `clg_filters` or `cls_timtable_filters`. */
export async function fetchTimetableFilterRows(
  flag: TimetableFilterFlag,
  collegeId = 0,
): Promise<AnyRow[]> {
  const { orgId, employeeId } = procContext();
  const data = await getAllRecords<{ result: unknown[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: flag,
      in_org_id: orgId,
      in_college_id: collegeId,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: flag === "cls_timtable_filters" ? "QUOTA" : "",
    },
  );
  return unwrapFilterGroups(data, flag);
}

/** Angular `timingsetslist` for allocation page. */
export async function listTimingSetsForAllocation(
  collegeId: number,
  academicYearId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !academicYearId) return [];
  const paramSets: Record<string, string | number>[] = [
    { collegeId, academicYearId, status: "true" },
    { collegeId, academicYearId, isActive: "true" },
  ];
  for (const params of paramSets) {
    try {
      const data = await fetchDetails<unknown>("timingsetslist", params);
      const rows = normalizeListPayload(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

/** Angular `Schedule` list by timetable — marks already-allocated sections. */
export async function listSchedulesForTimetable(
  timetableId: number,
): Promise<AnyRow[]> {
  if (!timetableId) return [];
  const queries = [
    buildQuery({ "Timetable.timetableId": timetableId, isActive: true }),
    buildQuery({ timetableId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("Schedule", query);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  try {
    const data = await fetchDetails<unknown>("Schedule", {
      "Timetable.timetableId": timetableId,
      isActive: "true",
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

export type TimetableAllocationPayload = {
  collegeId: number;
  academicYearId: number;
  timetableId: number;
  timingsetId: number;
  groupSectionId: number[];
};

/** Angular POST `schedulelistbytimingset`. */
export async function saveTimetableAllocation(
  payload: TimetableAllocationPayload,
): Promise<unknown> {
  return postDetails(TIMETABLE_MGMT_API.SCHEDULE_LIST_BY_TIMING_SET, payload);
}

/** Angular manage-timetable `schedulesections?collegeId=&timetableId=`. */
export async function listScheduleSectionsForTimetable(
  collegeId: number,
  timetableId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !timetableId) return [];
  try {
    const data = await fetchDetails<unknown>(
      TIMETABLE_MGMT_API.SCHEDULE_SECTION,
      {
        collegeId,
        timetableId,
      },
    );
    const rows = normalizeListPayload(data);
    if (rows.length > 0) return rows;
    if (data && typeof data === "object" && !Array.isArray(data))
      return [data as AnyRow];
    return [];
  } catch {
    return [];
  }
}

/** Angular view-timetable `schedules` five-id GET → column grid. */
export async function fetchViewClassTimetable(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  timetableId: number;
  timetableMeta?: AnyRow | null;
}): Promise<AngularStudentTimetable | null> {
  const {
    collegeId,
    academicYearId,
    groupSectionId,
    timetableId,
    timetableMeta,
  } = params;
  if (!collegeId || !academicYearId || !groupSectionId || !timetableId)
    return null;

  const scheduleTimings = await fetchScheduleRowsForSection({
    collegeId,
    academicYearId,
    courseId: 0,
    courseGroupId: 0,
    courseYearId: 0,
    groupSectionId,
    timetableId,
  });

  if (scheduleTimings.length === 0) return null;

  let meta = timetableMeta ?? null;
  if (!meta) meta = await getTimetableById(timetableId);
  return buildAngularStudentTimetable(scheduleTimings, meta);
}

/** Angular create-timetable `listByFiveIds(schedules, ...isActive=true)` for assign-resource grid. */
export async function fetchAssignResourceSchedules(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  timetableId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId, timetableId } = params;
  if (!collegeId || !academicYearId || !groupSectionId || !timetableId)
    return [];
  try {
    const data = await fetchDetails<unknown>(TIMETABLE_MGMT_API.SCHEDULE, {
      collegeId,
      academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    });
    const rows = normalizeListPayload(data);
    if (rows.length > 0) return rows;
  } catch {
    // ignore and fallback
  }
  return fetchScheduleRowsForSection({
    collegeId,
    academicYearId,
    courseId: 0,
    courseGroupId: 0,
    courseYearId: 0,
    groupSectionId,
    timetableId,
  });
}

export type AssignResourceTimetableView = {
  grid: AngularStudentTimetable | null;
  scheduleTimings: AnyRow[];
};

export async function fetchAssignResourceTimetableView(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  timetableId: number;
  timetableMeta?: AnyRow | null;
}): Promise<AssignResourceTimetableView> {
  const scheduleTimings = await fetchAssignResourceSchedules(params);
  if (scheduleTimings.length === 0) return { grid: null, scheduleTimings: [] };
  let meta = params.timetableMeta ?? null;
  if (!meta) meta = await getTimetableById(params.timetableId);
  return {
    grid: buildAngularStudentTimetable(scheduleTimings, meta),
    scheduleTimings,
  };
}

/** Angular create-timetable `staffproxies?collegeId=&groupSectionId=&isActive=true`. */
export async function listStaffProxiesForSection(
  collegeId: number,
  groupSectionId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<unknown>(EMPLOYEE_API.STAFF_PROXIES, {
      collegeId,
      groupSectionId,
      isActive: "true",
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Angular add-resource `subjectcourseyrs` three-id fetch. */
export async function listSubjectCourseYearsForAssign(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params;
  if (!collegeId || !academicYearId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<unknown>(SUBJECT_API.SUBJECT_COURSE_YEARS, {
      collegeid: collegeId,
      academicYearId,
      groupSectionid: groupSectionId,
    });
    const rows = normalizeListPayload(data);
    if (rows.length > 0) return rows;
  } catch {
    // fallback to mapped helper
  }
  return listStaffSubjectRows({ collegeId, academicYearId, groupSectionId });
}

/** Angular add-resource `SubjectResource` by `schedule.timetableScheduleId`. */
export async function listSubjectResourcesBySchedule(
  timetableScheduleId: number,
): Promise<AnyRow[]> {
  if (!timetableScheduleId) return [];
  const queries = [
    buildQuery({
      "schedule.timetableScheduleId": timetableScheduleId,
      isActive: true,
    }),
    buildQuery({ timetableScheduleId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>(
        SUBJECT_API.SUBJECT_RESOURCE_ENTITY,
        query,
      );
      if (rows.length > 0) return rows;
    } catch {
      // next
    }
  }
  return [];
}

/** Angular add-resource `Studentbatch` by college + subjectType + course. */
export async function listStudentBatchesForLabAssign(
  collegeId: number,
  subjectTypeId: number,
  courseId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !subjectTypeId || !courseId) return [];
  const queries = [
    buildQuery({
      "college.collegeId": collegeId,
      "subjecttype.generalDetailId": subjectTypeId,
      "course.courseId": courseId,
      isActive: true,
    }),
    buildQuery({ collegeId, subjectTypeId, courseId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("Studentbatch", query);
      if (rows.length > 0) return rows;
    } catch {
      // next
    }
  }
  return [];
}

/** Angular POST `subjectresources`. */
export function saveSubjectResources(resources: AnyRow[]) {
  return postDetailsEnvelope<unknown>(SUBJECT_API.SUBJECT_RESOURCE, resources);
}

/** Angular PUT `deletestaffs`. */
export function deleteSubjectResourceStaff(items: AnyRow[]) {
  return putDetailsEnvelope<unknown>(EMPLOYEE_API.DELETE_STAFFS, items);
}
