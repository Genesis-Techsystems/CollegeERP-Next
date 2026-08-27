/**
 * Angular `staff-classes/my-classes` API parity.
 */
import {
  ASSESSMENT_API,
  ATTENDANCE_API,
  CLASS_NOTES_API,
  EMPLOYEE_API,
  MISC_REPORT_API,
  STUDENT_API,
  SUBJECT_API,
} from "@/config/constants/api";
import {
  domainList,
  fetchDetails,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetailsEnvelope,
  uploadFile,
} from "./crud";
import { buildQuery } from "./query";
import {
  formatClassDateYmdSlash,
  formatScheduleDateYmd,
  getDigitalLiveClassEnv,
  getLiveClassSchedules,
  getStaffSubjectsForToday,
  meetingCheckIn,
  tConvert,
  type DigitalLiveClassEnv,
  type LiveScheduleRow,
  type StaffSubjectClass,
} from "./staff-dashboard";
import { listStaffProxies } from "./proxy-workload";
import { listLeaveHolidayEvents } from "./staff-faculty-leaves";

type AnyRow = Record<string, unknown>;

export const MY_TIMETABLE_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Angular `weekdays_` — `new Date(proxyDate).getDay()` index → name. */
export const MY_TIMETABLE_WEEKDAYS_BY_INDEX = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type MyTimetableTiming = AnyRow & {
  weekdayId?: number;
  weekdayName?: string;
  startTime?: string;
  endTime?: string;
  classTimingName?: string;
  isBreak?: boolean;
  colorCode?: string | null;
  color?: string;
  colspan?: number;
  isLab?: boolean;
  subBatches?: AnyRow[];
  subjectResource?: AnyRow[];
};

export type MyTimetableWeekday = {
  weekdayId: number;
  weekdayName: string;
  classTimings: MyTimetableTiming[];
  timings: MyTimetableTiming[];
};

export type MyTimetableSchedule = {
  weekdays: MyTimetableWeekday[];
};

/** Angular my-timetable default tab — Sunday → index 6, else `getDay() - 1`. */
export function getMyTimetableDefaultTabIndex(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function getMyTimetableDefaultDayName(date = new Date()): string {
  return MY_TIMETABLE_WEEKDAYS[getMyTimetableDefaultTabIndex(date)] ?? "Monday";
}

/**
 * Angular `my-timetable.component` schedule matrix builder
 * (`getWeekdays` → `schedules.weekdays` / `timings` / `subBatches` / `colspan`).
 */
export function buildStaffMyTimetable(
  scheduleTimings: AnyRow[],
): MyTimetableSchedule {
  const sorted = [...scheduleTimings].sort(
    (a, b) => Number(a.weekdayId ?? 0) - Number(b.weekdayId ?? 0),
  );
  const schedules: MyTimetableSchedule = { weekdays: [] };

  for (const raw of sorted) {
    const row: MyTimetableTiming = { ...raw };
    const resources = Array.isArray(row.subjectResource)
      ? row.subjectResource
      : [];
    row.color = row.colorCode != null ? "#fff" : "#000";
    if (resources.length > 0 && resources[0]?.colorCode != null) {
      row.colorCode = resources[0].colorCode as string;
    }
    row.colspan = 1;
    row.isLab = false;

    const weekdayId = Number(row.weekdayId ?? 0);
    const fullName = String(row.weekdayName ?? "");
    const shortName =
      fullName.length >= 3
        ? fullName.slice(0, 3).toUpperCase()
        : fullName.toUpperCase();

    let weekday = schedules.weekdays.find((w) => w.weekdayId === weekdayId);
    if (!weekday) {
      weekday = {
        weekdayId,
        weekdayName: shortName,
        classTimings: [],
        timings: [],
      };
      schedules.weekdays.push(weekday);
    }
    weekday.classTimings.push(row);
  }

  for (const weekday of schedules.weekdays) {
    for (const classTiming of weekday.classTimings) {
      classTiming.subBatches = [];
      const resources = Array.isArray(classTiming.subjectResource)
        ? classTiming.subjectResource
        : [];

      for (const res of resources) {
        if (String(res.subjectTypeCode ?? "") === "LAB") {
          const batchId = res.studentBatchId;
          const existing = classTiming.subBatches!.find(
            (b) => b.studentBatchId === batchId,
          );
          if (existing) {
            existing.staffName = [existing.staffName, res.staffName]
              .filter(Boolean)
              .join(" , ");
          } else {
            classTiming.subBatches!.push({ ...res });
          }
        } else {
          classTiming.subBatches!.push({ ...res });
        }
      }

      if (resources.length > 0) {
        const cellGroupId = resources[0]?.cellGroupId;
        const existing = weekday.timings.find(
          (t) =>
            Array.isArray(t.subjectResource) &&
            t.subjectResource.length > 0 &&
            t.subjectResource[0]?.cellGroupId != null &&
            t.subjectResource[0]?.cellGroupId === cellGroupId,
        );
        if (existing) {
          if (!existing.colspan) existing.colspan = 1;
          existing.colspan = Number(existing.colspan) + 1;
          existing.isLab = true;
        } else {
          weekday.timings.push(classTiming);
        }
      } else {
        weekday.timings.push(classTiming);
      }
    }
  }

  return schedules;
}

/** Angular `getSubjectResourcesSchedules1Url(subjectresourcesschedules, empId)`. */
export async function loadMyTimetableSchedules(employeeId: number): Promise<{
  rows: AnyRow[];
  message?: string;
  success: boolean;
}> {
  if (!employeeId)
    return { rows: [], success: false, message: "Employee id missing" };
  try {
    const envelope = await fetchDetailsEnvelope<unknown>(
      SUBJECT_API.SUBJECT_RESOURCES_SCHEDULES,
      { staffId: employeeId },
    );
    if (!envelope.success) {
      return {
        rows: [],
        success: false,
        message: envelope.message ?? "Failed to load timetable",
      };
    }
    const rows = asRows<AnyRow>(envelope.data);
    return { rows, success: true, message: envelope.message };
  } catch {
    return { rows: [], success: false, message: "Failed to load timetable" };
  }
}

/**
 * Angular `listByFiveIds(staffProxies, empId, 'week', 'ACCEPTED', date, 'true', …)`.
 */
export async function loadMyTimetableAcceptedProxies(
  employeeId: number,
  proxyDate = formatClassDateYmdSlash(),
): Promise<AnyRow[]> {
  if (!employeeId) return [];
  try {
    return await listStaffProxies({
      proxyEmpId: employeeId,
      proxyFormat: "week",
      processStatusCode: "ACCEPTED",
      proxyDate,
      isActive: "true",
    });
  } catch {
    return [];
  }
}

export function filterMyTimetableDayDetails(
  empScheduleDetails: AnyRow[],
  dayName: string,
): AnyRow[] {
  return empScheduleDetails.filter((x) => String(x.weekdayName) === dayName);
}

export function filterMyTimetableDayProxies(
  acceptedWorkloads: AnyRow[],
  dayName: string,
): AnyRow[] {
  return acceptedWorkloads.filter(
    (x) =>
      MY_TIMETABLE_WEEKDAYS_BY_INDEX[new Date(String(x.proxyDate)).getDay()] ===
      dayName,
  );
}

export type MyClassRow = StaffSubjectClass & {
  collegeId?: number;
  collegeCode?: string;
  academicYearId?: number;
  academicYear?: string;
  courseId?: number;
  courseGroupId?: number;
  groupCode?: string;
  groupName?: string;
  groupSectionId?: number;
  courseYearId?: number;
  courseYearName?: string;
  section?: string;
  regulationId?: number;
  regulationCode?: string;
  regulationName?: string;
  subjectId?: number;
  subjectName?: string;
  subjectCode?: string;
  subjectType?: string;
  batchName?: string;
  studentbatchId?: number;
  subjectCourseyearId?: number;
  firstName?: string;
  employeeId?: number;
};

export type ProxySubjectRow = MyClassRow & {
  proxySubjecttypeDisplayName?: string;
  proxyFirstName?: string;
  proxyEmpId?: number;
  groupSectionName?: string;
  studentbatchId?: number;
};

function asRows<T extends Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

/**
 * Angular Schedule PTM-style merge for My Classes `getSchedules`
 * (no agenda!==Proxy filter — matches staff-classes/my-classes.component.ts).
 */
export function mergeMyClassesWithLiveSchedules(params: {
  myClasses: MyClassRow[];
  liveSchedules: LiveScheduleRow[];
  userName: string;
  env?: DigitalLiveClassEnv;
}): { myClasses: MyClassRow[]; isZoom: boolean } {
  const env = params.env ?? getDigitalLiveClassEnv();
  const isZoom = env === "ZOOM";
  const userName = params.userName;
  const myClasses = params.myClasses.map((c) => ({ ...c }));

  for (let i = 0; i < myClasses.length; i++) {
    myClasses[i].meetingId = null;
    myClasses[i].isValid = false;
    const match = params.liveSchedules.find(
      (x) =>
        x.groupSectionId === myClasses[i].groupSectionId &&
        x.subjectId === myClasses[i].subjectId &&
        Number(x.timetableScheduleId) > 0,
    );
    if (!match) continue;

    if (env === "CODIIS") {
      myClasses[i].meetingId = match.codiisMeetingId ?? null;
      myClasses[i].token = match.token;
      myClasses[i].joinUrl =
        `${match.codiisHostUrl}?token=${match.token}&&userName=${userName}&&role=1`;
    } else if (env === "ZOOM") {
      myClasses[i].meetingId = match.zoomMeetingId ?? null;
    } else {
      myClasses[i].meetingId = match.teamEventId ?? null;
      myClasses[i].joinUrl = match.teamJoinUrl;
    }
    myClasses[i].fromTime = match.fromTime;
    myClasses[i].toTime = match.toTime;
    myClasses[i].isValid = true;
  }

  return { myClasses, isZoom };
}

/** Angular `proxysubject?employeeId=&proxyDate=YYYY/MM/DD` — LAB proxies only. */
export async function listProxySubjectsForMyClasses(params: {
  employeeId: number;
  proxyDate?: string;
}): Promise<ProxySubjectRow[]> {
  try {
    const envelope = await fetchDetailsEnvelope<ProxySubjectRow[]>(
      EMPLOYEE_API.PROXY_SUBJECT,
      {
        employeeId: params.employeeId,
        proxyDate: params.proxyDate ?? formatClassDateYmdSlash(),
      },
    );
    if (!envelope.success && envelope.data == null) return [];
    const proxies = asRows<ProxySubjectRow>(envelope.data);
    const myLabProxies: ProxySubjectRow[] = [];
    for (const p of proxies) {
      if (String(p.proxySubjecttypeDisplayName ?? "") !== "LAB") continue;
      const row: ProxySubjectRow = {
        ...p,
        firstName: p.proxyFirstName ?? p.firstName,
        employeeId: Number(p.proxyEmpId ?? p.employeeId ?? 0) || undefined,
        section: String(p.groupSectionName ?? p.section ?? ""),
        subjectType: String(
          p.proxySubjecttypeDisplayName ?? p.subjectType ?? "LAB",
        ),
      };
      const exists = myLabProxies.some(
        (x) =>
          Number(x.employeeId) === Number(row.employeeId) &&
          Number(x.subjectId) === Number(row.subjectId) &&
          Number(x.studentbatchId) === Number(row.studentbatchId),
      );
      if (!exists) myLabProxies.push(row);
    }
    return myLabProxies;
  } catch {
    return [];
  }
}

/** Load staff subjects + live schedules + proxies (Angular getMyClasses flow). */
export async function loadMyClassesPage(params: {
  employeeId: number;
  userName: string;
}): Promise<{
  myClasses: MyClassRow[];
  labProxies: ProxySubjectRow[];
  isZoom: boolean;
  emptyMessage?: string;
}> {
  const classDate = formatClassDateYmdSlash();
  const subjects = (await getStaffSubjectsForToday({
    employeeId: params.employeeId,
    classDate,
  })) as MyClassRow[];

  // Proxies load in parallel with success path (Angular calls proxyClasses immediately).
  const [proxies, schedules] = await Promise.all([
    listProxySubjectsForMyClasses({
      employeeId: params.employeeId,
      proxyDate: classDate,
    }),
    getLiveClassSchedules({
      employeeId: params.employeeId,
      scheduledOnDate: formatScheduleDateYmd(),
    }),
  ]);

  if (subjects.length === 0) {
    return {
      myClasses: [],
      labProxies: proxies,
      isZoom: getDigitalLiveClassEnv() === "ZOOM",
      emptyMessage: "No Record(s) found.",
    };
  }

  try {
    const { myClasses, isZoom } = mergeMyClassesWithLiveSchedules({
      myClasses: subjects,
      liveSchedules: schedules,
      userName: params.userName,
    });
    return { myClasses, labProxies: proxies, isZoom };
  } catch {
    return {
      myClasses: subjects,
      labProxies: proxies,
      isZoom: getDigitalLiveClassEnv() === "ZOOM",
    };
  }
}

/**
 * Angular employee-courses students-list:
 * `studentsList?collegeId=&courseGroupId=&groupSectionId=`
 */
export async function listStudentsForMyClass(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<Record<string, unknown>[]> {
  const data = await fetchDetails<unknown>("studentsList", {
    collegeId: params.collegeId,
    courseGroupId: params.courseGroupId,
    groupSectionId: params.groupSectionId,
  });
  return asRows(data);
}

/**
 * Angular `getSubjectCourseYears`:
 * `subjectcourseyrs/?collegeId=&academicYearId=&groupSectionId=`
 */
export async function listSubjectCourseYearsForMyClass(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<Record<string, unknown>[]> {
  const data = await fetchDetails<unknown>(SUBJECT_API.SUBJECT_COURSE_YEARS, {
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    groupSectionId: params.groupSectionId,
  });
  return asRows(data);
}

/** Angular Zoom hostLiveClass → meetingCheckIn then join-live query. */
export async function buildZoomJoinLiveHref(
  meetingId: string | number,
): Promise<string | null> {
  const details = await meetingCheckIn({ meetingNumber: meetingId, role: 1 });
  if (!details) return null;
  const qs = new URLSearchParams({
    signature: String(details.signature ?? ""),
    meetingNumber: String(details.zoomMeetingId ?? meetingId),
    apiKey: String(details.apiKey ?? ""),
    userEmail: String(details.email ?? ""),
    passWord: String(details.password ?? ""),
  });
  return `/staff-classes/join-live?${qs.toString()}`;
}

export function classTitle(
  row: MyClassRow,
  opts?: { includeRegulation?: boolean },
): string {
  const regulation =
    opts?.includeRegulation !== false && row.regulationCode
      ? ` - ${String(row.regulationCode)}`
      : "";
  const batch =
    String(row.subjectType ?? "").toUpperCase() === "LAB" && row.batchName
      ? `${String(row.batchName)} - `
      : "";
  const head = [
    row.collegeCode,
    row.academicYear,
    row.groupCode,
    row.courseYearName,
  ]
    .filter((p) => p != null && String(p).trim() !== "")
    .join(" / ");
  const tail = `${row.section ?? ""}${regulation} - ${row.subjectName ?? ""} (${batch}${row.subjectType ?? ""})`;
  return head ? `${head} / ${tail}` : tail;
}

/**
 * Angular mark-attendance getStudents:
 * `studentsList?collegeId=&courseGroupId=&groupSectionId=&academicYearId=`
 */
export async function listStudentsForMarkAttendance(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
  academicYearId: number;
}): Promise<Record<string, unknown>[]> {
  const data = await fetchDetails<unknown>("studentsList", {
    collegeId: params.collegeId,
    courseGroupId: params.courseGroupId,
    groupSectionId: params.groupSectionId,
    academicYearId: params.academicYearId,
  });
  return asRows(data);
}

/**
 * Angular `studentsubjectsattendancelist` for LAB (8 params) / ELECTIVE (7 params).
 * LAB: + studentbatchId; ELECTIVE: without studentbatchId.
 */
export async function listStudentsForSubjectAttendance(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  regulationId: number;
  subjectId: number;
  studentbatchId?: number | null;
}): Promise<Record<string, unknown>[]> {
  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    groupSectionId: params.groupSectionId,
    regulationId: params.regulationId,
    subjectId: params.subjectId,
  };
  if (params.studentbatchId) {
    query.studentbatchId = params.studentbatchId;
  }
  const data = await fetchDetails<unknown>(
    STUDENT_API.STUDENTSUBJECTSATTENDANCELIST,
    query,
  );
  return asRows(data);
}

/** Angular View Attendance `getStudents` — three ids (no academicYearId). */
export async function listStudentsForViewAttendance(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<Record<string, unknown>[]> {
  return listStudentsForMyClass(params);
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type PeriodRow = Record<string, unknown> & {
  classTimingId?: number;
  classTimingName?: string;
  startTime?: string;
  endTime?: string;
  timetableScheduleId?: number;
  type?: string;
  subjectResource?: Array<Record<string, unknown>>;
  staffProxies?: Array<Record<string, unknown>>;
};

export function periodOptionLabel(p: PeriodRow, batchName?: string): string {
  const name = String(p.classTimingName ?? "");
  const range = `${tConvert(p.startTime)}-${tConvert(p.endTime)}`;
  const subject = String(p.subjectResource?.[0]?.subjectName ?? "");
  const proxy = p.type === "proxy" ? " (proxy)" : "";
  const batch = batchName ? ` (${batchName} )` : "";
  const staffProxy =
    Array.isArray(p.staffProxies) && p.staffProxies.length > 0
      ? ` (${String(p.staffProxies[0]?.subjectName ?? "")} - ${String(p.staffProxies[0]?.proxyFirstName ?? "")})`
      : "";
  return `${name} [${range}] ${subject}${proxy}${staffProxy}${batch}`.trim();
}

/**
 * Angular View/Mark Attendance `selectedDate` periods:
 * THEORY: subjectresourcesschedules?collegeId&academicYearId&staffId&day&groupSectionId&subjectId&timeTableDate
 * LAB: + studentBatchId
 */
export async function listPeriodsForClassAttendance(params: {
  collegeId: number;
  academicYearId: number;
  employeeId: number;
  groupSectionId: number;
  subjectId: number;
  date: Date;
  subjectType?: string;
  studentbatchId?: number | null;
}): Promise<PeriodRow[]> {
  const day = WEEKDAYS[params.date.getDay()] ?? "";
  const timeTableDate = formatClassDateYmdSlash(params.date);
  const isLab = String(params.subjectType ?? "").toUpperCase() === "LAB";

  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    staffId: params.employeeId,
    day,
    groupSectionId: params.groupSectionId,
    subjectId: params.subjectId,
    timeTableDate,
  };
  if (isLab && params.studentbatchId) {
    query.studentBatchId = params.studentbatchId;
  }

  const envelope = await fetchDetailsEnvelope<PeriodRow[]>(
    SUBJECT_API.SUBJECT_RESOURCES_SCHEDULES,
    query,
  );
  let periods: PeriodRow[] = envelope.success
    ? asRows<PeriodRow>(envelope.data)
    : [];

  // Append accepted proxy workloads for the day (Angular always merges these).
  try {
    const proxies = await listStaffProxies({
      proxyEmpId: params.employeeId,
      proxyFormat: "day",
      processStatusCode: "ACCEPTED",
      proxyDate: timeTableDate,
      isActive: "true",
      groupSectionId: params.groupSectionId,
    });
    for (const w of proxies) {
      periods.push({
        ...w,
        type: "proxy",
        staffProxies: [],
        subjectResource: [
          {
            subjectName: w.subjectName,
            subjectId: w.subjectId,
            subjectRegulationId: w.subjectRegulationId,
            studentBatchId: w.studentbatchId,
            collegeId: w.collegeId,
            courseYearStaffId: w.staffCourseyrSubjectId,
            subjectCourseYearId: w.subjectCourseyearId,
            roomId: w.roomId,
            subjectResourceId: null,
            subjectTypeId: w.proxySubjecttypeId,
            subjectTypeCode: w.proxySubjecttypeDisplayName,
            staffId: params.employeeId,
          },
        ],
      });
    }
  } catch {
    // periods without proxies still usable
  }

  return periods.map((p) => ({
    ...p,
    subjectResource: Array.isArray(p.subjectResource) ? p.subjectResource : [],
    staffProxies: Array.isArray(p.staffProxies) ? p.staffProxies : [],
  }));
}

export type AttendanceAbsentRow = Record<string, unknown> & {
  studentId?: number;
  firstName?: string;
  rollNumber?: string;
  admissionNumber?: string;
  isAbsent?: boolean;
  isPresent?: boolean;
  ettlDevicesName?: string;
  devicelogTime?: string;
  devicelogStatusCatDetCode?: string;
};

type AttendanceBundle = {
  studentId?: number;
  studentAttendances?: Array<Record<string, unknown>>;
};

/**
 * Angular View Attendance after period select (THEORY path):
 * studentabsentlist?collegeId&subjectId&attendanceDate&timetableScheduleId&groupSectionId
 * Then mark absentees from studentAttendances matching timetableScheduleId.
 */
export async function loadViewAttendanceForPeriod(params: {
  collegeId: number;
  groupSectionId: number;
  subjectId: number;
  attendanceDate: string;
  timetableScheduleId: number;
  students: Record<string, unknown>[];
  studentbatchId?: number | null;
  isLab?: boolean;
}): Promise<{
  absentees: AttendanceAbsentRow[];
  attendanceMarked: boolean;
}> {
  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    subjectId: params.subjectId,
    attendanceDate: params.attendanceDate,
    groupSectionId: params.groupSectionId,
  };
  if (params.isLab && params.studentbatchId) {
    query.studentbatchId = params.studentbatchId;
  } else {
    query.timetableScheduleId = params.timetableScheduleId;
  }

  const envelope = await fetchDetailsEnvelope<AttendanceBundle[]>(
    ATTENDANCE_API.STUDENT_ATTENDANCE,
    query,
  );

  if (!envelope.success) {
    return { absentees: [], attendanceMarked: false };
  }

  const attendances = asRows<AttendanceBundle>(envelope.data);
  const absentees: AttendanceAbsentRow[] = [];

  for (const student of params.students) {
    const sid = Number(student.studentId ?? 0);
    const match = attendances.find((a) => Number(a.studentId) === sid);
    const sa = (match?.studentAttendances ?? []).find(
      (x) => Number(x.timetableScheduleId) === params.timetableScheduleId,
    );
    if (!sa) continue;
    absentees.push({
      ...student,
      stdAttendanceId: sa.stdAttendanceId,
      isPresent: false,
      isAbsent: Boolean(sa.isAbsent),
      ettlDevicesName: sa.ettlDevicesName as string | undefined,
      devicelogTime: sa.devicelogTime as string | undefined,
      devicelogStatusCatDetCode: sa.devicelogStatusCatDetCode as
        | string
        | undefined,
    });
  }

  return { absentees, attendanceMarked: true };
}

/** Angular `studentattendancedetails?timetableScheduleId&attendanceDate&clsempId`. */
export async function getStudentAttendanceLessonDetails(params: {
  timetableScheduleId: number;
  attendanceDate: string;
  employeeId: number;
}): Promise<unknown> {
  const envelope = await fetchDetailsEnvelope<unknown>(
    ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
    {
      timetableScheduleId: params.timetableScheduleId,
      attendanceDate: params.attendanceDate,
      clsempId: params.employeeId,
    },
  );
  if (!envelope.success) return null;
  return envelope.data ?? null;
}

/** Angular mark-attendance `SubjectUnit` by `Subject.subjectId`. */
export async function listSubjectUnitsForMarkAttendance(
  subjectId: number,
): Promise<Record<string, unknown>[]> {
  if (!subjectId) return [];
  try {
    const rows = await domainList<Record<string, unknown>>(
      "SubjectUnit",
      buildQuery({ "Subject.subjectId": subjectId, isActive: true }),
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Angular mark-attendance topics by `SubjectUnit.subjectUnitsId`. */
export async function listSubjectUnitTopicsForMarkAttendance(
  subjectUnitsId: number,
): Promise<Record<string, unknown>[]> {
  if (!subjectUnitsId) return [];
  try {
    const rows = await domainList<Record<string, unknown>>(
      "SubjectUnitTopic",
      buildQuery({
        "SubjectUnit.subjectUnitsId": subjectUnitsId,
        isActive: true,
      }),
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export type MarkAttendanceSaveItem = {
  studentAttendanceDTOs: Record<string, unknown>[];
  lessonstatusDTO: Record<string, unknown> | null;
  actualClassesScheduleDTO: Record<string, unknown>;
};

/**
 * Angular `addAttendance` payload builder for POST `studentattendancedetails`.
 * First-time mark path (no existing stdAttendanceId / lessonStatus merge).
 */
export function buildMarkAttendanceSavePayload(params: {
  students: Array<Record<string, unknown>>;
  periods: PeriodRow[];
  selectedPeriodIds: number[];
  day: Date;
  employeeId: number;
  academicYearId: number;
  subjectType?: string;
  studentbatchId?: number | null;
  videoPath?: string;
  subjectUnitsId?: number | null;
  subjectUnitTopicId?: number | null;
  teachingMethodCatdetId?: number | null;
  comments?: string;
}): MarkAttendanceSaveItem[] {
  const classDate = formatScheduleDateYmd(params.day);
  const batchId =
    params.studentbatchId != null ? Number(params.studentbatchId) : null;

  const absentStudents: Record<string, unknown>[] = [];
  for (const s of params.students) {
    const isPresent = Boolean(s.isPresent);
    if (s.stdAttendanceId) {
      const staffId =
        s.attendanceTakenByEmployeeId ??
        s.takenbyEmployeeId ??
        s.classTakenByEmployeeId ??
        params.employeeId;
      absentStudents.push({
        academicYearId: s.academicYearId,
        attendanceDate: s.attendanceDate ?? classDate,
        attendanceTakenByEmployeeId: staffId,
        batchId: s.batchId,
        classTakenByEmployeeId: s.classTakenByEmployeeId ?? staffId,
        collegeId: s.collegeId,
        courseGroupId: s.courseGroupId,
        courseId: s.courseId,
        courseYearId: s.courseYearId,
        groupSectionId: s.groupSectionId,
        stdAttendanceId: s.stdAttendanceId,
        absentReason: s.absentReason,
        reason: s.reason,
        createdDt: s.createdDt,
        createdUser: s.createdUser,
        studentId: s.studentId,
        subjectResourceId: s.subjectResourceId,
        subjectId: s.subjectId,
        takenbyEmployeeId: s.takenbyEmployeeId ?? staffId,
        verifiedbyEmployeeId: s.verifiedbyEmployeeId ?? null,
        isAbsent: !isPresent,
      });
    } else if (!isPresent) {
      const staffId =
        s.attendanceTakenByEmployeeId ??
        s.takenbyEmployeeId ??
        s.classTakenByEmployeeId ??
        params.employeeId;
      absentStudents.push({
        academicYearId: s.academicYearId,
        attendanceDate: s.attendanceDate ?? classDate,
        attendanceTakenByEmployeeId: staffId,
        batchId: s.batchId,
        classTakenByEmployeeId: s.classTakenByEmployeeId ?? staffId,
        collegeId: s.collegeId,
        courseGroupId: s.courseGroupId,
        courseId: s.courseId,
        courseYearId: s.courseYearId,
        groupSectionId: s.groupSectionId,
        studentId: s.studentId,
        subjectResourceId: s.subjectResourceId,
        subjectId: s.subjectId,
        takenbyEmployeeId: s.takenbyEmployeeId ?? staffId,
        verifiedbyEmployeeId: s.verifiedbyEmployeeId ?? null,
        isAbsent: true,
      });
    }
  }

  if (absentStudents.length === 0 && params.students.length > 0) {
    const first = { ...params.students[0] };
    const staffId =
      first.attendanceTakenByEmployeeId ??
      first.takenbyEmployeeId ??
      first.classTakenByEmployeeId ??
      params.employeeId;
    absentStudents.push({
      academicYearId: first.academicYearId,
      attendanceDate: first.attendanceDate ?? classDate,
      attendanceTakenByEmployeeId: staffId,
      batchId: first.batchId,
      classTakenByEmployeeId: first.classTakenByEmployeeId ?? staffId,
      collegeId: first.collegeId,
      courseGroupId: first.courseGroupId,
      courseId: first.courseId,
      courseYearId: first.courseYearId,
      groupSectionId: first.groupSectionId,
      studentId: null,
      subjectResourceId: first.subjectResourceId,
      subjectId: first.subjectId,
      takenbyEmployeeId: first.takenbyEmployeeId ?? staffId,
      verifiedbyEmployeeId: first.verifiedbyEmployeeId ?? null,
      isAbsent: null,
      isAllPresent: true,
    });
  }

  // Angular form defaults unit/topic/method to '' (not null), so
  // `subjectUnitsId != null && subjectUnitTopicId != null` is true and
  // lessonstatusDTO is always sent — with empty strings when unset.
  const unitVal =
    params.subjectUnitsId != null && params.subjectUnitsId > 0
      ? params.subjectUnitsId
      : "";
  const topicVal =
    params.subjectUnitTopicId != null && params.subjectUnitTopicId > 0
      ? params.subjectUnitTopicId
      : "";
  const methodVal =
    params.teachingMethodCatdetId != null && params.teachingMethodCatdetId > 0
      ? params.teachingMethodCatdetId
      : "";

  const mark: MarkAttendanceSaveItem[] = [];

  for (const scheduleId of params.selectedPeriodIds) {
    const lPeriod =
      params.periods.find(
        (p) => Number(p.timetableScheduleId) === Number(scheduleId),
      ) ?? null;
    if (!lPeriod) continue;
    const resources = Array.isArray(lPeriod.subjectResource)
      ? lPeriod.subjectResource
      : [];

    for (const resource of resources) {
      const resourceType = String(resource.subjectTypeCode ?? "").toUpperCase();
      if (resourceType === "LAB") {
        if (batchId == null || Number(resource.studentBatchId) !== batchId) {
          continue;
        }
      }

      const staffId = Number(resource.staffId ?? 0) || params.employeeId;

      const actualClassesScheduleDTO: Record<string, unknown> = {
        classDate,
        attendanceTakenDate: classDate,
        fromTime: lPeriod.startTime,
        isActive: true,
        videoPath: params.videoPath ?? "",
        toTime: lPeriod.endTime,
        staffCourseyrSubjectId: resource.courseYearStaffId,
        subjectCourseyearId: resource.subjectCourseYearId,
        collegeId: resource.collegeId,
        subjecttypeId: resource.subjectTypeId,
        groupSectionId: lPeriod.groupSectionId,
        roomId: resource.roomId ?? null,
        studentbatchId: resource.studentBatchId ?? null,
        subjectId: resource.subjectId,
        classEmployeeId: params.employeeId,
        timetableScheduleId: scheduleId,
        subjectResourceId: resource.subjectResourceId,
      };

      // Angular always posts lessonstatusDTO (empty-string fields when unset).
      const lessonstatusDTO: Record<string, unknown> = {
        academicYearId: String(params.academicYearId),
        collegeId: lPeriod.collegeId ?? resource.collegeId,
        groupSectionId: lPeriod.groupSectionId,
        timetableScheduleId: scheduleId,
        subjectResourceId: resource.subjectResourceId,
        percentage: "",
        comments: params.comments ?? "",
        subjectUnitsId: unitVal,
        subjectUnitTopicId: topicVal,
        classDate,
        isActive: true,
        teachingMethodCatdetId: methodVal,
      };

      const sheduleAttendance = absentStudents.map((a) => {
        const takenBy =
          a.attendanceTakenByEmployeeId ??
          a.takenbyEmployeeId ??
          a.classTakenByEmployeeId ??
          staffId;
        return {
          academicYearId: a.academicYearId,
          attendanceDate: a.attendanceDate ?? classDate,
          attendanceTakenByEmployeeId: takenBy,
          batchId: a.batchId,
          classTakenByEmployeeId: a.classTakenByEmployeeId ?? takenBy,
          collegeId: a.collegeId,
          courseGroupId: a.courseGroupId,
          courseId: a.courseId,
          courseYearId: a.courseYearId,
          groupSectionId: a.groupSectionId,
          studentId: a.studentId,
          subjectResourceId: resource.subjectResourceId,
          subjectId: a.subjectId ?? resource.subjectId,
          takenbyEmployeeId: a.takenbyEmployeeId ?? takenBy,
          timetableScheduleId: scheduleId,
          verifiedbyEmployeeId: a.verifiedbyEmployeeId ?? null,
          isAbsent: a.isAbsent,
          ...(a.isAllPresent != null ? { isAllPresent: a.isAllPresent } : {}),
          ...(a.stdAttendanceId != null
            ? {
                stdAttendanceId: a.stdAttendanceId,
                createdDt: a.createdDt,
                absentReason: a.absentReason,
                reason: a.reason,
                createdUser: a.createdUser,
              }
            : {}),
        };
      });

      mark.push({
        studentAttendanceDTOs: sheduleAttendance,
        lessonstatusDTO,
        actualClassesScheduleDTO,
      });
    }
  }

  // Angular uniqueMark — one entry per timetableScheduleId
  const unique: MarkAttendanceSaveItem[] = [];
  for (const item of mark) {
    const tid = Number(item.actualClassesScheduleDTO.timetableScheduleId);
    if (
      unique.some(
        (u) => Number(u.actualClassesScheduleDTO.timetableScheduleId) === tid,
      )
    ) {
      continue;
    }
    unique.push(item);
  }
  return unique;
}

/**
 * Angular `crudService.add(studentSttendanceDetailsUrl, uniqueMark)` —
 * POST `studentattendancedetails`.
 */
export async function saveStudentAttendanceDetails(
  payload: MarkAttendanceSaveItem[],
): Promise<{ message?: string; data?: unknown }> {
  const envelope = await postDetailsEnvelope<unknown>(
    ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to save attendance");
  }
  return { message: envelope.message, data: envelope.data };
}

/**
 * Angular `crudService.upload(classNotesUploadUrl, formData)` —
 * POST `uploadclassnotes` with `actualClassScheduleId` + `notesDoc`.
 */
export async function uploadClassNotesForAttendance(params: {
  actualClassScheduleId: string | number;
  file: File;
}): Promise<void> {
  const formData = new FormData();
  formData.append(
    "actualClassScheduleId",
    String(params.actualClassScheduleId),
  );
  formData.append("notesDoc", params.file, params.file.name);
  await uploadFile(CLASS_NOTES_API.UPLOAD, formData);
}

/**
 * Angular `saveDeatils()` after modal Save —
 * POST `addLessonstatusList` (often empty list for basic mark-attendance).
 */
export async function saveLessonStatusList(
  payload: Record<string, unknown>[] = [],
): Promise<void> {
  await postDetailsEnvelope(ASSESSMENT_API.ADD_LESSONSTATUS, payload);
}

/**
 * Angular `selectedPeroid()` after successful save — THEORY path:
 * 1. GET `studentabsentlist?collegeId&subjectId&attendanceDate&timetableScheduleId&groupSectionId`
 * 2. GET `studentattendancedetails?timetableScheduleId&attendanceDate&clsempId`
 * 3. GET SubjectUnit domain list
 *
 * LAB path uses studentbatchId instead of timetableScheduleId on absent list,
 * and studentbatchId on lesson-details GET.
 */
export async function refreshAfterMarkAttendanceSave(params: {
  collegeId: number;
  groupSectionId: number;
  subjectId: number;
  day: Date;
  timetableScheduleId: number;
  employeeId: number;
  students: Record<string, unknown>[];
  subjectType?: string;
  studentbatchId?: number | null;
}): Promise<{
  students: Record<string, unknown>[];
  lessonDetails: unknown;
  units: Record<string, unknown>[];
}> {
  const isLab = String(params.subjectType ?? "").toUpperCase() === "LAB";
  // Angular selectedPeroid uses YYYY/MM/DD for these GETs
  const attendanceDateSlash = formatClassDateYmdSlash(params.day);
  const attendanceDateDash = formatScheduleDateYmd(params.day);

  const absentQuery: Record<string, string | number> = {
    collegeId: params.collegeId,
    subjectId: params.subjectId,
    attendanceDate: attendanceDateSlash,
    groupSectionId: params.groupSectionId,
  };
  if (isLab && params.studentbatchId) {
    absentQuery.studentbatchId = params.studentbatchId;
  } else {
    absentQuery.timetableScheduleId = params.timetableScheduleId;
  }

  const lessonParams: Record<string, string | number> =
    isLab && params.studentbatchId
      ? {
          timetableScheduleId: params.timetableScheduleId,
          attendanceDate: attendanceDateSlash,
          studentbatchId: params.studentbatchId,
        }
      : {
          timetableScheduleId: params.timetableScheduleId,
          attendanceDate: attendanceDateSlash,
          clsempId: params.employeeId,
        };

  const [absentEnvelope, lessonDetails, units] = await Promise.all([
    fetchDetailsEnvelope<AttendanceBundle[]>(
      ATTENDANCE_API.STUDENT_ATTENDANCE,
      absentQuery,
    ),
    fetchDetailsEnvelope<unknown>(
      ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
      lessonParams,
    ).then((e) => (e.success ? e.data : null)),
    listSubjectUnitsForMarkAttendance(params.subjectId),
  ]);

  const attendances = absentEnvelope.success
    ? asRows<AttendanceBundle>(absentEnvelope.data)
    : [];

  const staffId = params.employeeId;
  const students = params.students.map((s) => {
    const sid = Number(s.studentId ?? 0);
    const match = attendances.find((a) => Number(a.studentId) === sid);
    const sa = (match?.studentAttendances ?? []).find(
      (x) => Number(x.timetableScheduleId) === params.timetableScheduleId,
    );
    const base = {
      ...s,
      attendanceDate: attendanceDateDash,
      verifiedbyEmployeeId: null,
      takenbyEmployeeId: s.takenbyEmployeeId ?? staffId,
      attendanceTakenByEmployeeId: s.attendanceTakenByEmployeeId ?? staffId,
      classTakenByEmployeeId: s.classTakenByEmployeeId ?? staffId,
      checked: true,
      isPresent: true,
      isAbsent: false,
      stdAttendanceId: null,
      absentReason: null,
      reason: null,
      createdUser: null,
      createdDt: null,
    };
    if (!sa) return base;
    return {
      ...base,
      stdAttendanceId: sa.stdAttendanceId ?? null,
      absentReason: sa.absentReason ?? null,
      reason: sa.reason ?? null,
      createdDt: sa.createdDt ?? null,
      createdUser: sa.createdUser ?? null,
      checked: false,
      isPresent: false,
      isAbsent: true,
    };
  });

  return { students, lessonDetails, units };
}

/** Angular hardcoded LESSONSTATUS detail ids. */
export const LESSON_STATUS_IN_PROGRESS_ID = 190;
export const LESSON_STATUS_COMPLETED_ID = 191;

export type MarkAttendanceHolidayEvent = {
  eventName?: string;
  startDate?: string;
  endDate?: string;
};

/**
 * Angular `eventsbydate?collegeId&startDate&endDate&isHoliday=true&isweekoff=true`
 * — hides Search when any holiday/week-off exists for the selected day.
 */
export async function listMarkAttendanceHolidayEvents(params: {
  collegeId: number;
  date: Date;
}): Promise<MarkAttendanceHolidayEvent[]> {
  const ymd = formatClassDateYmdSlash(params.date);
  const rows = await listLeaveHolidayEvents({
    collegeId: params.collegeId,
    startDate: ymd,
    endDate: ymd,
  });
  return rows as MarkAttendanceHolidayEvent[];
}

export type SubjectUnitTopicLessonRow = Record<string, unknown> & {
  class_date?: string;
  subject_name?: string;
  subject_code?: string;
  unit_code?: string;
  unit_name?: string;
  topic_name?: string;
  Percentage?: number | string;
  fk_teaching_method_catdet_id?: number | null;
  fk_lessonstatus_catdet_id?: number | null;
  subjectUnitsId?: number;
  subjectUnitTopicId?: number;
  teaching_method_code?: string;
  lesson_status_code?: string;
};

/**
 * Angular `getSubjectUnitTopics()` —
 * `getAllRecords/s_get_subject_unit_topics` with `in_flag=lesson_status_details`.
 * result[0] = pending/in-progress, result[1] = history.
 */
export async function listLessonStatusSubjectUnitTopics(params: {
  organizationId: number;
  employeeId: number;
  timetableScheduleId: number;
}): Promise<{
  pending: SubjectUnitTopicLessonRow[];
  completed: SubjectUnitTopicLessonRow[];
}> {
  if (!params.timetableScheduleId) {
    return { pending: [], completed: [] };
  }
  try {
    const data = await getAllRecords<{ result?: unknown[] }>(
      MISC_REPORT_API.SUBJECT_UNIT_TOPICS_REPORT,
      {
        in_flag: "lesson_status_details",
        in_org_id: params.organizationId || 0,
        in_university_id: 0,
        in_college_id: 0,
        in_course_id: 0,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_group_section_id: 0,
        in_academic_year_id: 0,
        in_timetable_id: 0,
        in_timetable_schedule_id: params.timetableScheduleId,
        in_regulation_id: 0,
        in_subject_id: 0,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: params.employeeId || 0,
        in_loginuser_roleid: 0,
        in_gm_codes: "",
      },
    );
    const groups = Array.isArray(data?.result) ? data.result : [];
    const pendingRaw = Array.isArray(groups[0])
      ? (groups[0] as SubjectUnitTopicLessonRow[])
      : [];
    const completedRaw = Array.isArray(groups[1])
      ? (groups[1] as SubjectUnitTopicLessonRow[])
      : [];
    const pending = pendingRaw.map((row) => ({
      ...row,
      fk_lessonstatus_catdet_id:
        row.fk_lessonstatus_catdet_id == null
          ? LESSON_STATUS_IN_PROGRESS_ID
          : row.fk_lessonstatus_catdet_id,
    }));
    return { pending, completed: completedRaw };
  } catch {
    return { pending: [], completed: [] };
  }
}

/**
 * Angular `isEmptyObject(lessonStatus)` — empty `{}` / empty array = not marked.
 * Non-empty array from `studentattendancedetails` = already marked.
 */
export function isAttendanceAlreadyMarked(lessonDetails: unknown): boolean {
  if (lessonDetails == null) return false;
  if (Array.isArray(lessonDetails)) return lessonDetails.length > 0;
  if (typeof lessonDetails === "object") {
    return Object.keys(lessonDetails as object).length > 0;
  }
  return false;
}

export function getLessonStatusScheduleMeta(lessonDetails: unknown): {
  notesPath: string;
  videoPath: string;
  actualClsScheduleId: number | null;
} {
  const rows = Array.isArray(lessonDetails)
    ? (lessonDetails as AnyRow[])
    : [];
  const first = rows[0];
  const dto = (first?.actualClassesScheduleDTO ?? {}) as AnyRow;
  return {
    notesPath: String(dto.notesPath ?? "") || "",
    videoPath: String(dto.videoPath ?? "") || "",
    actualClsScheduleId:
      dto.actualClsScheduleId != null
        ? Number(dto.actualClsScheduleId) || null
        : null,
  };
}

export type LessonStatusPayloadItem = {
  classDate: string;
  comments: string;
  isActive: boolean;
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  actualClsScheduleId: number | null;
  subjectResourceId: number | null;
  timetableScheduleId: number;
  subjectUnitsId: number | null;
  unitName: string;
  unitCode: string;
  subjectUnitTopicId: number | null;
  topicName: string;
  lessonstatusCatDetId: number;
  teachingMethodCatdetId: number | null;
  percentage: number;
};

/** Angular `onPercentageChange` payload builder. */
export function buildLessonStatusPayloadFromTopicRow(params: {
  row: SubjectUnitTopicLessonRow;
  day: Date;
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
  actualClsScheduleId: number | null;
  subjectResourceId: number | null;
  timetableScheduleId: number;
}): LessonStatusPayloadItem | null {
  const pct = Number(params.row.Percentage);
  if (!Number.isFinite(pct) || pct === 0) return null;
  const statusId =
    pct === 100
      ? LESSON_STATUS_COMPLETED_ID
      : LESSON_STATUS_IN_PROGRESS_ID;
  return {
    classDate: formatScheduleDateYmd(params.day),
    comments: "",
    isActive: true,
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    groupSectionId: params.groupSectionId,
    actualClsScheduleId: params.actualClsScheduleId,
    subjectResourceId: params.subjectResourceId,
    timetableScheduleId: params.timetableScheduleId,
    subjectUnitsId:
      params.row.subjectUnitsId != null
        ? Number(params.row.subjectUnitsId)
        : null,
    unitName: String(params.row.unit_name ?? ""),
    unitCode: String(params.row.unit_code ?? ""),
    subjectUnitTopicId:
      params.row.subjectUnitTopicId != null
        ? Number(params.row.subjectUnitTopicId)
        : null,
    topicName: String(params.row.topic_name ?? ""),
    lessonstatusCatDetId: statusId,
    teachingMethodCatdetId:
      params.row.fk_teaching_method_catdet_id != null
        ? Number(params.row.fk_teaching_method_catdet_id)
        : null,
    percentage: pct,
  };
}

export type { DigitalLiveClassEnv, LiveScheduleRow };
