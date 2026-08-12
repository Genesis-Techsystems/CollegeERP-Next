/**
 * Workload Adjustment / Proxy Workload — Angular
 * `proxy-workload` + `staff-faculty-leaves/workload-adjustment` parity.
 */
import {
  ATTENDANCE_API,
  EMPLOYEE_API,
  EVENTS_API,
  SUBJECT_API,
  TIMETABLE_MGMT_API,
} from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import {
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetailsEnvelope,
} from "./crud";
import { buildQuery } from "./query";
import {
  createLiveClassSchedule,
  getDigitalLiveClassEnv,
  startZoomLiveClassSchedules,
} from "./staff-dashboard";
import { listGeneralDetailsByCode } from "./student-information";
import {
  listLeaveHolidayEvents,
  toLeaveSlashYmd,
  toLeaveYmd,
} from "./staff-faculty-leaves";
import { listAcademicYearsForCollege } from "./timetable-management";
import { listCoursesByUniversity } from "./pre-examination";
import { listActiveCollegesForGeneralSettings } from "./admin/college";

type AnyRow = Record<string, unknown>;

export const WORKLOAD_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Workload",
] as const;

/** Angular `CONSTANTS.weekdays` dno ↔ moment().day() (0=Sun). */
export const WORKLOAD_WEEKDAY_DNOS = [
  { dno: 1, fullName: "Monday" },
  { dno: 2, fullName: "Tuesday" },
  { dno: 3, fullName: "Wednesday" },
  { dno: 4, fullName: "Thursday" },
  { dno: 5, fullName: "Friday" },
  { dno: 6, fullName: "Saturday" },
] as const;

/** Angular `momentWeekday` — uses presentDate (DD-MM-YYYY) when set. */
export function getWorkloadWeekdayNumber(date?: Date): number {
  if (typeof window !== "undefined") {
    const present = window.localStorage.getItem("presentDate");
    if (present) {
      const parts = present.split("-");
      if (parts.length === 3 && parts[2]?.length === 4) {
        const [d, m, y] = parts.map(Number);
        const dt = new Date(y, m - 1, d);
        if (!Number.isNaN(dt.getTime())) return dt.getDay();
      }
    }
  }
  return (date ?? new Date()).getDay();
}

export function getDefaultWorkloadTabIndex(): number {
  const day = getWorkloadWeekdayNumber();
  // Sunday → Workload tab (index 6); Mon–Sat → 0–5
  return day === 0 ? 6 : day - 1;
}

export type WorkloadWeekday = (typeof WORKLOAD_WEEKDAYS)[number];

export function getDefaultWorkloadDayName(): WorkloadWeekday {
  const idx = getDefaultWorkloadTabIndex();
  return WORKLOAD_WEEKDAYS[idx] ?? "Monday";
}

function normalizeListPayload(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.content)) return obj.content as AnyRow[];
    if (Array.isArray(obj.result)) return obj.result as AnyRow[];
    if (Array.isArray(obj.data)) return obj.data as AnyRow[];
  }
  return [];
}

/**
 * Angular `getSubjectResourcesSchedules1Url(subjectresourcesschedules, staffId)`.
 */
export async function listSubjectResourceSchedulesForStaff(
  staffId: number,
): Promise<AnyRow[]> {
  if (!staffId) return [];
  try {
    const data = await fetchDetails<unknown>(
      SUBJECT_API.SUBJECT_RESOURCES_SCHEDULES,
      { staffId },
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular `staffproxies?assignedbyEmployeeId=&isActive=true`
 * or `?proxyEmpId=&isActive=true`
 * or `?timetableScheduleId=&proxyFormat=day&proxyDate=&isActive=true`.
 */
export async function listStaffProxies(
  params: Record<string, string | number>,
): Promise<AnyRow[]> {
  try {
    const data = await fetchDetails<unknown>(
      EMPLOYEE_API.STAFF_PROXIES,
      params,
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular StaffProxyList (`staff-faculty-details/staff-workload-adjustment`).
 *
 * HOD / staff:  `staffproxiesbyempdept?departmentId=&proxyDate=`
 * Principal:    `staffproxiesbyempdept?collegeId=&proxyDate=`
 */
export async function listStaffProxiesByEmpDept(params: {
  isPrincipal: boolean;
  departmentId?: number;
  collegeId?: number;
  proxyDate: string;
}): Promise<AnyRow[]> {
  const { isPrincipal, departmentId = 0, collegeId = 0, proxyDate } = params;
  if (!proxyDate) return [];
  const query: Record<string, string | number> = isPrincipal
    ? { collegeId, proxyDate }
    : { departmentId, proxyDate };
  if (isPrincipal ? collegeId <= 0 : departmentId <= 0) return [];
  try {
    const data = await fetchDetails<unknown>(
      EMPLOYEE_API.STAFF_PROXIESBY_EMP_DEPT,
      query,
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Angular POST `staffproxieslist` (array payload). */
export async function saveStaffProxiesList(
  rows: AnyRow[],
): Promise<{ success: boolean; message?: string }> {
  const res = await postDetailsEnvelope<unknown>(
    EMPLOYEE_API.STAFF_PROXIES_2,
    rows,
  );
  return { success: Boolean(res.success), message: res.message };
}

/** Angular domain create `StaffProxy` (Take Proxy single). */
export async function createStaffProxy(
  payload: AnyRow,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    const data = await domainCreate<unknown>(EMPLOYEE_API.STAFF_PROXY, payload);
    return { success: true, data, message: "Success" };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to save proxy",
    };
  }
}

/** Angular `updateDetails(StaffProxy, …, staffProxyId)`. */
export async function updateStaffProxy(
  staffProxyId: number,
  payload: AnyRow,
): Promise<{ success: boolean; message?: string }> {
  try {
    await domainUpdate(
      EMPLOYEE_API.STAFF_PROXY,
      "staffProxyId",
      staffProxyId,
      payload,
    );
    return { success: true, message: "Updated successfully" };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to update proxy",
    };
  }
}

/**
 * Angular `getStaffPrxy(getAllRecords/staff_for_proxy, …)`.
 */
export async function listStaffForProxy(params: {
  groupSectionId: number;
  weekdayName: string;
  startTime: string;
  endTime: string;
  empId: number;
}): Promise<AnyRow[]> {
  const { groupSectionId, weekdayName, startTime, endTime, empId } = params;
  if (!groupSectionId || !weekdayName || !empId) return [];
  try {
    const data = await getAllRecords<{ result?: unknown[][] } | unknown>(
      EMPLOYEE_API.STAFF_FOR_PROXY,
      {
        groupSectionId,
        weekdayName,
        startTime,
        endTime,
        empId,
      },
    );
    if (data && typeof data === "object" && "result" in data) {
      const result = (data as { result?: unknown[][] }).result;
      if (Array.isArray(result?.[0])) return result[0] as AnyRow[];
    }
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular `staffSubjects?collegeId&academicYearId&employeeId&groupSectionId&status=true`.
 */
export async function listStaffSubjectsForProxy(params: {
  collegeId: number;
  academicYearId: number;
  employeeId: number;
  groupSectionId: number;
  withStatus?: boolean;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    employeeId,
    groupSectionId,
    withStatus = true,
  } = params;
  if (!collegeId || !academicYearId || !employeeId || !groupSectionId) {
    return [];
  }
  const query: Record<string, string | number> = {
    collegeId,
    academicYearId,
    employeeId,
    groupSectionId,
  };
  if (withStatus) query.status = "true";
  try {
    const data = await fetchDetails<unknown>(
      EMPLOYEE_API.STAFF_SUBJECTS,
      query,
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Angular `studentattendancedetails?timetableScheduleId&attendanceDate`. */
export async function checkAttendanceTaken(
  timetableScheduleId: number,
  attendanceDate: string,
): Promise<boolean> {
  if (!timetableScheduleId || !attendanceDate) return false;
  try {
    const res = await fetchDetailsEnvelope<unknown>(
      ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
      { timetableScheduleId, attendanceDate },
    );
    return Boolean(res.success);
  } catch {
    return false;
  }
}

export async function listProxyProcessStatuses(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.PROCESS_STATUS);
}

/** Angular Take Proxy `moment.weekdays(momentGetWeekday())`. */
export function getTakeProxyWeekdayName(date?: Date): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[getWorkloadWeekdayNumber(date)] ?? "Monday";
}

/**
 * Academic years for Take Proxy: college → `Universities.universityId`
 * (`listAcademicYearsForCollege` / `listAcademicYearsByUniversity`).
 */
export async function listAcademicYearsByCollegeForTakeProxy(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    return await listAcademicYearsForCollege(collegeId);
  } catch {
    return [];
  }
}

/**
 * Take Proxy college cascade — single proc load:
 * `s_get_collegewisedetails_bycode?in_flag=clg_filters,gm_codes&in_gm_codes=QUOTA`.
 */
export async function getTakeProxyCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<{ filtersData: AnyRow[]; academicData: AnyRow[] }> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_filters,gm_codes",
      in_org_id: orgId || 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "QUOTA",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  let filtersData: AnyRow[] = [];
  let academicData: AnyRow[] = [];

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0] ?? {};
    if (first.flag === "clg_filters") filtersData = arr;
    if (first.clg_filters_ay === "clg_filters_ay") academicData = arr;
  }

  if (filtersData.length === 0) {
    const clgGroup = groups.find(
      (g) =>
        Array.isArray(g) &&
        g.length > 0 &&
        String(g[0]?.flag ?? "") === "clg_filters",
    );
    if (clgGroup?.length) filtersData = clgGroup;
  }

  return { filtersData, academicData };
}

/**
 * Courses for Take Proxy: college → `Universities.universityId`
 * (`Course?query=Universities.universityId==…&isActive==true`).
 */
export async function listCoursesByCollegeForTakeProxy(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    const colleges = await listActiveCollegesForGeneralSettings();
    const college = colleges.find((c) => Number(c.collegeId) === collegeId);
    const universityId = Number(college?.universityId ?? 0);
    if (!universityId) return [];
    return await listCoursesByUniversity(universityId);
  } catch {
    return [];
  }
}

/**
 * Angular Take Proxy sections:
 * `GroupSection` by courseYearId + academicYearId + courseGroupId + isActive.
 */
export async function listGroupSectionsForTakeProxy(params: {
  courseYearId: number;
  academicYearId: number;
  courseGroupId: number;
}): Promise<AnyRow[]> {
  const { courseYearId, academicYearId, courseGroupId } = params;
  if (!courseYearId || !academicYearId || !courseGroupId) return [];
  try {
    return await domainList<AnyRow>(
      ENTITIES.GROUP_SECTION.name,
      buildQuery({
        "CourseYear.courseYearId": courseYearId,
        "AcademicYear.academicYearId": academicYearId,
        "CourseGroup.courseGroupId": courseGroupId,
        isActive: true,
      }),
    );
  } catch {
    return [];
  }
}

/**
 * Angular Take Proxy `listByThreeIds(timetablescurr, …, 'collgeId', …)` —
 * query key casing matches Angular typo `collgeId`.
 */
export async function listTimetablesForTakeProxy(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params;
  if (!collegeId || !academicYearId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<unknown>(
      TIMETABLE_MGMT_API.TIMETABLES_CURR,
      {
        collgeId: collegeId,
        academicYearId,
        groupSectionId,
      },
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular Take Proxy `listByFiveIds(schedules, collegeId, academicYearId,
 * groupSectionId, timetableId, true, …)`.
 */
export async function listSchedulesForTakeProxy(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  timetableId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId, timetableId } = params;
  if (!collegeId || !academicYearId || !groupSectionId || !timetableId) {
    return [];
  }
  try {
    const data = await fetchDetails<unknown>(TIMETABLE_MGMT_API.SCHEDULE, {
      collegeId,
      academicYearId,
      groupSectionId,
      timetableId,
      isActive: "true",
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular WorkloadStatus `getAttendance()` —
 * `domain/list/ActualClassesSchedule?query=classEmployeeDetail.employeeId==…&…`.
 */
export async function listActualClassesScheduleForProxy(params: {
  proxyEmpId: number;
  timetableScheduleId: number;
  classDate: string;
  subjectId: number;
}): Promise<AnyRow[]> {
  const { proxyEmpId, timetableScheduleId, classDate, subjectId } = params;
  if (!proxyEmpId || !timetableScheduleId || !classDate || !subjectId) {
    return [];
  }
  try {
    const query = buildQuery({
      "classEmployeeDetail.employeeId": proxyEmpId,
      "schedule.timetableScheduleId": timetableScheduleId,
      classDate,
      "subject.subjectId": subjectId,
    });
    return await domainList<AnyRow>(
      ATTENDANCE_API.ACTUAL_CLASSES_SCHEDULE_2,
      query,
    );
  } catch {
    return [];
  }
}

/** Angular `liveSchedule(setProxyList)` after accepted proxy status change. */
export async function scheduleProxyLiveClasses(
  rows: AnyRow[],
  userId: number,
): Promise<void> {
  if (!rows.length || !userId) return;
  const env = getDigitalLiveClassEnv();

  for (const row of rows) {
    const payload: AnyRow = {
      scheduledOnDate: toLeaveYmd(row.proxyDate) ?? row.proxyDate,
      fromTime: row.startTime,
      toTime: row.endTime,
      password: "123456789",
      sessionIds: [],
      hostVideo: false,
      isOnetime: false,
      isRecurring: false,
      agenda: "Proxy",
      topic: row.subjectName,
      collegeId: row.collegeId,
      userId,
      subjecttypeCatdetId: row.proxySubjecttypeId ?? row.subjectTypeId,
      groupSectionId: row.groupSectionId,
      clsEmpId: row.proxyEmpId,
      subjectId: row.subjectId,
      stdbatchId: 18,
      weekdayId: row.weekdayId,
      classTimingId: row.classTimingId,
      timetableScheduleId: row.timetableScheduleId,
    };
    if (env === "CODIIS") payload.sessionId = 1;

    try {
      const data = await createLiveClassSchedule(payload, env);
      if (env === "ZOOM" && Array.isArray(data) && data.length > 0) {
        const ids = data
          .map((item) => Number((item as AnyRow).liveClsScheduleId ?? 0))
          .filter((id) => id > 0);
        if (ids.length > 0) await startZoomLiveClassSchedules(ids);
      }
    } catch {
      // Angular continues after partial failures
    }
  }
}

/** Group LAB proxies by subjectCourseyearId + proxyDate (Angular Workload tab). */
export function groupLabProxies(rows: AnyRow[]): AnyRow[] {
  const out: AnyRow[] = [];
  for (const row of rows) {
    const copy: AnyRow = { ...row };
    const time = {
      startTime: row.startTime,
      endTime: row.endTime,
      timetableScheduleId: row.timetableScheduleId,
    };
    if (String(row.proxySubjecttypeDisplayName) === "LAB") {
      const match = out.find(
        (x) =>
          Number(x.reason) === Number(row.subjectCourseyearId) &&
          String(x.proxyDate) === String(row.proxyDate),
      );
      if (match) {
        const times = (match.times as AnyRow[]) ?? [];
        times.push(time);
        match.times = times;
      } else {
        copy.times = [time];
        out.push(copy);
      }
    } else {
      copy.times = [time];
      out.push(copy);
    }
  }
  return out.sort((a, b) => {
    const tb = new Date(String(b.proxyDate ?? 0)).getTime();
    const ta = new Date(String(a.proxyDate ?? 0)).getTime();
    return tb - ta;
  });
}

export function subjectResourceOf(detail: AnyRow): AnyRow {
  const resources = detail.subjectResource;
  if (Array.isArray(resources) && resources[0]) {
    return resources[0] as AnyRow;
  }
  return {};
}
