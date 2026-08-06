import { COMMUNICATION_API, MENTORSHIP_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetails,
} from "./crud";
import {
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
} from "./admin/college-courses-groups";
import {
  getDigitalOnlineSyncFilters,
  type ClgFilterAcademicYearRow,
  type ClgFilterRow,
} from "./admin/digital-online-sync";
import { listAcademicYearsForCollege } from "./timetable-management";
import { searchEmployeesForHr } from "./hr-payroll";
import { searchStudentsByKeyword } from "./student-information";

export type MentorshipRow = Record<string, unknown>;

export type CounselorActivityType = MentorshipRow & {
  counselorActivityTypeId?: number;
  collegeId?: number;
  collegeCode?: string;
  activityTypeCode?: string;
  activityTypeName?: string;
  isActive?: boolean;
  reason?: string;
};

/**
 * Unwrap Spring list payloads used by mentorship endpoints.
 * Handles array `data`, nested `resultList`/`content`/`result`, and top-level envelope `resultList`
 * when `data` is null (common for studentsList / mappedcounselorstudents).
 */
function asRows(data: unknown): MentorshipRow[] {
  if (Array.isArray(data)) return data as MentorshipRow[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.resultList)) return obj.resultList as MentorshipRow[];
  if (Array.isArray(obj.content)) return obj.content as MentorshipRow[];
  if (Array.isArray(obj.result)) return obj.result as MentorshipRow[];
  if (Array.isArray(obj.data)) return obj.data as MentorshipRow[];
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.resultList))
      return nested.resultList as MentorshipRow[];
    if (Array.isArray(nested.content)) return nested.content as MentorshipRow[];
    if (Array.isArray(nested.result)) return nested.result as MentorshipRow[];
  }
  return [];
}

function asRowsFromEnvelope(body: ApiResponse<unknown>): MentorshipRow[] {
  if (Array.isArray(body.data)) return body.data as MentorshipRow[];
  const fromData = asRows(body.data);
  if (fromData.length > 0) return fromData;
  if (Array.isArray(body.resultList)) return body.resultList as MentorshipRow[];
  return [];
}

function pickNum(row: MentorshipRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: MentorshipRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v == null || v === "") continue;
    return String(v);
  }
  return "";
}

/** Normalize student / mapping rows so the Assign Counselor UI can split lists reliably. */
export function normalizeCounselorStudentRow(
  row: MentorshipRow,
): MentorshipRow {
  const nestedEmp =
    row.employeeDetail && typeof row.employeeDetail === "object"
      ? (row.employeeDetail as MentorshipRow)
      : null;
  const studentId = pickNum(row, [
    "studentId",
    "fk_student_id",
    "student_id",
    "pk_student_id",
  ]);
  const counselorId = pickNum(row, [
    "counselorId",
    "fk_counselor_id",
    "counselor_id",
  ]);
  const employeeId =
    pickNum(row, ["employeeId", "fk_employee_id", "employee_id"]) ||
    pickNum(nestedEmp ?? {}, ["employeeId", "fk_employee_id"]);
  const firstName = pickText(row, [
    "firstName",
    "studentName",
    "student_name",
    "name",
  ]);
  const rollNumber = pickText(row, [
    "rollNumber",
    "hallticketNumber",
    "hallticket_number",
    "admissionNumber",
  ]);
  let genderDisplayName = pickText(row, [
    "genderDisplayName",
    "gender",
    "genderName",
  ]);
  if (genderDisplayName === "Male") genderDisplayName = "M";
  if (genderDisplayName === "Female") genderDisplayName = "F";

  return {
    ...row,
    ...(studentId ? { studentId } : {}),
    ...(counselorId ? { counselorId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(firstName ? { firstName } : {}),
    ...(rollNumber ? { rollNumber } : {}),
    ...(genderDisplayName ? { genderDisplayName } : {}),
  };
}

function isMappingActive(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "Y" ||
    value === "y"
  );
}

/** Activity rows nested under first counselormappings result. */
export function extractCounselorActivities(data: unknown): MentorshipRow[] {
  const rows = asRows(data);
  if (rows.length === 0) return [];
  const first = rows[0];
  const dtos = first.counselorActivityDTOs;
  if (!Array.isArray(dtos)) return [];
  const counselorId = first.counselorId;
  const collegeId = first.collegeId;
  const studentId = first.studentId;
  const activities: MentorshipRow[] = (dtos as MentorshipRow[]).map((a) => ({
    ...a,
    counselorId: a.counselorId ?? counselorId,
    collegeId: a.collegeId ?? collegeId,
    studentId: a.studentId ?? studentId,
  }));
  return activities.sort((a, b) => {
    const ad = new Date(String(a.nextScheduledActivityDate ?? 0)).getTime();
    const bd = new Date(String(b.nextScheduledActivityDate ?? 0)).getTime();
    return bd - ad;
  });
}

/** Students assigned to a counselor/employee — `counselormappings?collegeId&employeeId`. */
export async function listCounselorStudentsForEmployee(
  collegeId: number,
  employeeId: number,
): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
      collegeId,
      employeeId,
    }),
  );
}

/** Counselors mapped to a student — `counselormappings?collegeId&studentId`. */
export async function listCounselorMappingsForStudent(
  collegeId: number,
  studentId: number,
): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
      collegeId,
      studentId,
    }),
  );
}

/** Staff meetings — activities for college + employee + student. */
export async function listCounselorActivitiesForStudent(
  collegeId: number,
  employeeId: number,
  studentId: number,
): Promise<{ activities: MentorshipRow[]; counselorId: number | null }> {
  const data = await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
    collegeId,
    employeeId,
    studentId,
  });
  const mapping = asRows(data)[0];
  return {
    activities: extractCounselorActivities(data),
    counselorId: Number(mapping?.counselorId ?? 0) || null,
  };
}

/** Admin student meetings — date range on counselormappings. */
export async function listCounselorActivitiesInDateRange(params: {
  collegeId: number;
  employeeId: number;
  studentId: number;
  fromDate: string;
  toDate: string;
}): Promise<{ activities: MentorshipRow[]; counselorId: number | null }> {
  const data = await fetchDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
    collegeId: params.collegeId,
    employeeId: params.employeeId,
    studentId: params.studentId,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  const mapping = asRows(data)[0];
  return {
    activities: extractCounselorActivities(data),
    counselorId: Number(mapping?.counselorId ?? 0) || null,
  };
}

/**
 * Students for counselor in date range — used by Meeting History / Student Meetings.
 * Prefer Schedule PTM helpers (`listSchedulePtmStudents`) when matching staff-mentorship.
 */
export async function listCounselorStudentsInDateRange(params: {
  collegeId: number;
  employeeId: number;
  fromDate: string;
  toDate: string;
}): Promise<MentorshipRow[]> {
  return asRows(
    await fetchDetails(MENTORSHIP_API.COUNSELOR_DETAILS, {
      collegeId: params.collegeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      employeeId: params.employeeId,
      status: "true",
    }),
  );
}

/**
 * Angular Schedule PTM `selectedEmployee`:
 * - ADMIN: `counselordetails?fromDate=&toDate=&status=true`
 * - STAFF: `counselordetails?employeeId=&fromDate=&toDate=&status=true`
 * Dates are Angular `momentFormatYMD` → `YYYY/MM/DD` (slashes). No collegeId.
 */
function toCounselorDetailsDate(value: string): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  // Accept YYYY-MM-DD or YYYY/MM/DD → always slash form for Spring.
  const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return s;
}

function isNoRecordsMessage(message: unknown): boolean {
  return String(message ?? "")
    .toLowerCase()
    .includes("no record");
}

async function fetchCounselorDetailsStudents(
  params: Record<string, string | number>,
): Promise<MentorshipRow[]> {
  const envelope = await fetchDetailsEnvelope<unknown>(
    MENTORSHIP_API.COUNSELOR_DETAILS,
    params,
  );
  if (envelope.success) return asRows(envelope.data);
  if (isNoRecordsMessage(envelope.message)) return [];
  throw new Error(envelope.message || "Failed to load counselor details");
}

export async function listSchedulePtmStudents(params: {
  fromDate: string;
  toDate: string;
  employeeId?: number | null;
  isAdmin: boolean;
}): Promise<MentorshipRow[]> {
  const fromDate = toCounselorDetailsDate(params.fromDate);
  const toDate = toCounselorDetailsDate(params.toDate);
  if (params.isAdmin) {
    return fetchCounselorDetailsStudents({
      fromDate,
      toDate,
      status: "true",
    });
  }
  if (!params.employeeId) return [];
  return fetchCounselorDetailsStudents({
    employeeId: params.employeeId,
    fromDate,
    toDate,
    status: "true",
  });
}

/**
 * Angular Schedule PTM `selectedStudent`:
 * - ADMIN: `counselormappings?collegeId=&studentId=` (collegeId from selected student)
 * - STAFF: `counselormappings?collegeId=&employeeId=&studentId=`
 */
export async function listSchedulePtmMeetings(params: {
  collegeId: number;
  studentId: number;
  employeeId?: number | null;
  isAdmin: boolean;
}): Promise<{ mapping: MentorshipRow | null; activities: MentorshipRow[] }> {
  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    studentId: params.studentId,
  };
  if (!params.isAdmin && params.employeeId) {
    query.employeeId = params.employeeId;
  }
  const envelope = await fetchDetailsEnvelope<unknown>(
    MENTORSHIP_API.COUNSELOR_MAPPINGS,
    query,
  );
  if (!envelope.success) {
    if (isNoRecordsMessage(envelope.message)) {
      return { mapping: null, activities: [] };
    }
    throw new Error(envelope.message || "Failed to load counselor mappings");
  }
  const data = envelope.data;
  const mapping = asRows(data)[0] ?? null;
  return {
    mapping,
    activities: extractCounselorActivities(data),
  };
}

/** Angular `listDetailsById(CounselorActivity, counselorActivityId)`. */
export async function getCounselorActivityById(
  counselorActivityId: number,
): Promise<MentorshipRow | null> {
  if (!counselorActivityId) return null;
  const rows = await domainList<MentorshipRow>(
    ENTITIES.COUNSELOR_ACTIVITY.name,
    buildQuery({ counselorActivityId }),
  );
  return rows[0] ?? null;
}

/**
 * Angular Schedule PTM Send SMS → `POST sendsmstostudents`.
 * Payload includes messageContent, subject, fromEmailId, isSmsAlert, numbers (studentIds),
 * and course/college fields from the counselor mapping row.
 */
export async function sendCounselorSmsToStudents(
  payload: MentorshipRow,
): Promise<void> {
  await postDetails(COMMUNICATION_API.SMS_TO_STUDENTS, payload);
}

/**
 * Angular Assign Counselor `getFiltersList`:
 * `s_get_collegewisedetails_bycode` with `in_flag=clg_filters`, `in_gm_codes=QUOTA,GENDER`.
 */
export async function getMentorshipAssignFilters(
  organizationId: number,
  employeeId: number,
): Promise<{
  filtersData: ClgFilterRow[];
  academicYearData: ClgFilterAcademicYearRow[];
}> {
  type ProcResponse = { result?: Array<Array<Record<string, unknown>>> };
  const data = await getAllRecords<ProcResponse>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_filters",
      in_org_id: organizationId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId,
      in_loginuser_roleid: 0,
      in_employee: "",
      in_subject: "",
      in_gm_codes: "QUOTA,GENDER",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  let filtersData: ClgFilterRow[] = [];
  let academicYearData: ClgFilterAcademicYearRow[] = [];

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0];
    const flag = typeof first?.flag === "string" ? first.flag : "";
    const ayFlag =
      typeof first?.clg_filters_ay === "string" ? first.clg_filters_ay : "";
    if (flag === "clg_filters" || Object.hasOwn(first ?? {}, "fk_college_id")) {
      filtersData = arr as ClgFilterRow[];
    } else if (
      ayFlag === "clg_filters_ay" ||
      Object.hasOwn(first ?? {}, "fk_academic_year_id")
    ) {
      academicYearData = arr as ClgFilterAcademicYearRow[];
    }
  }

  // Fallback to shared helper if empty (same proc, empty gm_codes).
  if (filtersData.length === 0) {
    const fallback = await getDigitalOnlineSyncFilters(
      organizationId,
      employeeId,
    );
    return {
      filtersData: fallback.filtersData,
      academicYearData: fallback.academicYearData,
    };
  }

  return { filtersData, academicYearData };
}

export type { ClgFilterAcademicYearRow, ClgFilterRow };

export async function searchEmployeesForMentorship(
  collegeId: number,
  term: string,
): Promise<MentorshipRow[]> {
  // Angular Assign Counselor: employeesearch?q=&empStatus=ACTV (no collegeId).
  return searchEmployeesForHr(term, collegeId > 0 ? collegeId : undefined);
}

export async function searchStudentsForMentorship(
  term: string,
): Promise<MentorshipRow[]> {
  return searchStudentsByKeyword(term);
}

// ── Activity type CRUD ─────────────────────────────────────────────────────────

/** Angular `listAllDetails(CounselorActivityType)` — all rows for admin grid. */
export async function listCounselorActivityTypes(): Promise<
  CounselorActivityType[]
> {
  return domainList<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    buildQuery({}),
  );
}

/**
 * Angular schedule modal:
 * `listDetailsByTwoIds(CounselorActivityType, collegeId, true, getDetailsByCollegeId, isActive)`
 */
export async function listCounselorActivityTypesByCollege(
  collegeId: number,
): Promise<CounselorActivityType[]> {
  if (!collegeId) return [];
  return domainList<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

/** Angular `addMasterDetails(counseloractivitys, rows)`. */
export async function createCounselorActivities(
  rows: MentorshipRow[],
): Promise<void> {
  await postDetails(MENTORSHIP_API.COUNSELOR_ACTIVITIES, rows);
}

/** Angular `updateDetails(CounselorActivity, details, counselorActivityId)`. */
export async function updateCounselorActivity(
  counselorActivityId: number,
  payload: MentorshipRow,
): Promise<MentorshipRow> {
  return domainUpdate<MentorshipRow>(
    ENTITIES.COUNSELOR_ACTIVITY.name,
    ENTITIES.COUNSELOR_ACTIVITY.pk,
    counselorActivityId,
    { ...payload, counselorActivityId },
  );
}

export async function createCounselorActivityType(
  payload: Omit<CounselorActivityType, "counselorActivityTypeId">,
): Promise<CounselorActivityType> {
  return domainCreate<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    payload,
  );
}

export async function updateCounselorActivityType(
  counselorActivityTypeId: number,
  payload: Partial<CounselorActivityType>,
): Promise<CounselorActivityType> {
  return domainUpdate<CounselorActivityType>(
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.name,
    ENTITIES.COUNSELOR_ACTIVITY_TYPE.pk,
    counselorActivityTypeId,
    { ...payload, counselorActivityTypeId },
  );
}

export {
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
  listAcademicYearsForCollege,
};

/** Angular `listByFiveIds(studentsList, college, ay, course, group, year)`. */
export async function listStudentsForCounselorAssignment(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<MentorshipRow[]> {
  const p = params;
  if (
    !p.collegeId ||
    !p.academicYearId ||
    !p.courseId ||
    !p.courseGroupId ||
    !p.courseYearId
  ) {
    return [];
  }
  const query = {
    collegeId: p.collegeId,
    academicYearId: p.academicYearId,
    courseId: p.courseId,
    courseGroupId: p.courseGroupId,
    courseYearId: p.courseYearId,
  };
  try {
    const body = await fetchDetailsEnvelope<unknown>("studentsList", query);
    if (!body.success) return [];
    return asRowsFromEnvelope(body).map(normalizeCounselorStudentRow);
  } catch {
    return [];
  }
}

/** Existing counselor mappings for section — `mappedcounselorstudents`. */
export async function listMappedCounselorStudents(params: {
  collegeId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<MentorshipRow[]> {
  if (!params.collegeId || !params.courseGroupId || !params.courseYearId) {
    return [];
  }
  try {
    const body = await fetchDetailsEnvelope<unknown>(
      MENTORSHIP_API.MAPPED_COUNSELOR_STUDENTS,
      {
        collegeId: params.collegeId,
        courseGroupId: params.courseGroupId,
        courseYearId: params.courseYearId,
      },
    );
    if (!body.success) return [];
    return asRowsFromEnvelope(body).map(normalizeCounselorStudentRow);
  } catch {
    return [];
  }
}

export { isMappingActive };

/** Angular `add(counselormappings, rows)`. */
export async function saveCounselorMappings(
  rows: MentorshipRow[],
): Promise<void> {
  await postDetails(MENTORSHIP_API.COUNSELOR_MAPPINGS, rows);
}

/** Students assigned to counselor — `domain/list/CounselorMapping?employeeDetail.employeeId==`. */
export async function listCounselorStudentsByEmployee(
  employeeId: number,
): Promise<MentorshipRow[]> {
  if (!employeeId) return [];
  return domainList<MentorshipRow>(
    ENTITIES.COUNSELOR_MAPPING.name,
    buildQuery({ "employeeDetail.employeeId": employeeId }),
  );
}

export function activityTypeDuplicate(
  rows: CounselorActivityType[],
  code: string,
  collegeId: number,
  excludeId?: number,
): boolean {
  const key = code.trim().toLowerCase();
  return rows.some(
    (r) =>
      r.counselorActivityTypeId !== excludeId &&
      Number(r.collegeId) === collegeId &&
      String(r.activityTypeCode ?? "")
        .trim()
        .toLowerCase() === key,
  );
}
