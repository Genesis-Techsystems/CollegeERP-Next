import { STUDENT_API } from "@/config/constants/api";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  postDetailsEnvelope,
  putDetails,
  putDetailsEnvelope,
  uploadFile,
} from "@/services/crud";

type AnyRow = Record<string, any>;

function asArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.resultList)) return data.resultList as T[];
  if (Array.isArray(data?.result)) return data.result as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  return [];
}

function text(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key];
    if (value === null || value === undefined) continue;
    const out = String(value).trim();
    if (out) return out;
  }
  return "";
}

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function normalizeStudentRow(row: AnyRow): AnyRow {
  return {
    ...row,
    studentId: num(row, [
      "studentId",
      "fk_student_id",
      "student_id",
      "id",
      "studentDetailId",
    ]),
    collegeId: num(row, ["collegeId", "fk_college_id"]) || row.collegeId,
    academicYearId:
      num(row, ["academicYearId", "fk_academic_year_id"]) || row.academicYearId,
    courseYearId:
      num(row, ["courseYearId", "fk_course_year_id"]) || row.courseYearId,
    groupSectionId:
      num(row, [
        "groupSectionId",
        "fk_group_section_id",
        "group_section_id",
        "sectionId",
      ]) ||
      num((row.groupSection as AnyRow) ?? (row.GroupSection as AnyRow) ?? {}, [
        "groupSectionId",
        "fk_group_section_id",
        "id",
      ]) ||
      row.groupSectionId,
    hallticketNumber: text(row, [
      "hallticketNumber",
      "hallticket_number",
      "rollNumber",
      "roll_number",
      "admissionNumber",
      "admission_no",
    ]),
    studentName: text(row, [
      "studentName",
      "student_name",
      "studentFirstName",
      "student_first_name",
      "firstName",
      "fullName",
      "name",
    ]),
    courseName: text(row, ["courseName", "course_name", "course_code"]),
    sectionName: text(row, [
      "group_section_name",
      "groupSectionName",
      "sectionName",
      "section",
    ]),
    mobileNumber: text(row, [
      "mobileNumber",
      "mobile_number",
      "student_mobile_no",
      "phone",
    ]),
    isActive: row?.isActive ?? row?.active ?? true,
  };
}

/** Same proc split as `getCollegeFilters` in `examination.ts` — Angular uses both result sets. */
export interface StudentInfoCollegeFiltersResult {
  filtersData: AnyRow[];
  academicData: AnyRow[];
}

function splitCollegeWiseResult(groups: AnyRow[][]): {
  filtersData: AnyRow[];
  academicData: AnyRow[];
} {
  let filtersData: AnyRow[] = [];
  let academicData: AnyRow[] = [];
  for (const arr of groups) {
    if (arr.length > 0) {
      if (arr[0]?.flag === "clg_filters") filtersData = arr;
      if (arr[0]?.clg_filters_ay === "clg_filters_ay") academicData = arr;
    }
  }
  return { filtersData, academicData };
}

/** `s_get_collegewisedetails_bycode` with `clg_filters,gm_codes` + STUDENTSTATUS — Angular student-passout initial load. */
export interface PassoutCollegeFiltersResult {
  filtersData: AnyRow[];
  academicData: AnyRow[];
  studentStatusGmCodes: AnyRow[];
}

function splitPassoutCollegeWise(groups: AnyRow[][]): {
  filtersData: AnyRow[];
  academicData: AnyRow[];
  studentStatusGmCodes: AnyRow[];
} {
  let filtersData: AnyRow[] = [];
  let academicData: AnyRow[] = [];
  let studentStatusGmCodes: AnyRow[] = [];
  for (const arr of groups) {
    if (arr.length > 0) {
      const f0 = arr[0];
      if (f0?.flag === "clg_filters") filtersData = arr;
      if (f0?.clg_filters_ay === "clg_filters_ay") academicData = arr;
      if (f0?.flag === "gm_codes") studentStatusGmCodes = arr;
    }
  }
  return { filtersData, academicData, studentStatusGmCodes };
}

function fallbackFiltersWhenEmpty(
  groups: AnyRow[][],
  filtersData: AnyRow[],
): AnyRow[] {
  if (filtersData.length > 0) return filtersData;
  const clgFilters = groups.find(
    (g) =>
      Array.isArray(g) &&
      g.length > 0 &&
      String(g[0]?.flag ?? "") === "clg_filters",
  );
  if (clgFilters?.length) return clgFilters;
  const flattened = groups.flatMap((g) => (Array.isArray(g) ? g : []));
  const withCollege = flattened.filter(
    (r) =>
      num(r, ["fk_college_id", "collegeId", "fk_collegeId"]) > 0 &&
      String(r?.clg_filters_ay ?? "").trim() !== "clg_filters_ay",
  );
  return withCollege.length > 0 ? withCollege : flattened;
}

/**
 * `s_get_collegewisedetails_bycode` returns multiple arrays: `clg_filters` (college/course/…/section)
 * and `clg_filters_ay` (academic years). Exam Timetable uses `academicData` for year dropdowns when
 * years are not repeated on every filter row — student promotion must do the same.
 */
export async function getStudentInfoCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<StudentInfoCollegeFiltersResult> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_filters",
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
      in_gm_codes: "",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  const split = splitCollegeWiseResult(groups);
  const filtersData = fallbackFiltersWhenEmpty(groups, split.filtersData);

  return { filtersData, academicData: split.academicData };
}

/**
 * Angular `student-passout`: `in_flag: clg_filters,gm_codes`, `in_gm_codes: STUDENTSTATUS`.
 * Returns cascade rows + GM codes to resolve PASSEDOUT → `pk_gd_id`.
 */
export async function getPassoutCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<PassoutCollegeFiltersResult> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
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
      in_gm_codes: "STUDENTSTATUS",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  const split = splitPassoutCollegeWise(groups);
  const filtersData = fallbackFiltersWhenEmpty(groups, split.filtersData);

  return {
    filtersData,
    academicData: split.academicData,
    studentStatusGmCodes: split.studentStatusGmCodes,
  };
}

/** GM row with `gd_code === PASSEDOUT` → status id for PUT `passedout`. */
export function resolvePassedOutGeneralDetailId(
  studentStatusGmCodes: AnyRow[],
): number {
  const row = studentStatusGmCodes.find(
    (r) =>
      String(r.gd_code ?? r.GD_CODE ?? "")
        .trim()
        .toUpperCase() === "PASSEDOUT",
  );
  return num(row ?? {}, [
    "pk_gd_id",
    "gd_id",
    "generalDetailId",
    "general_detail_id",
  ]);
}

/** Same shape as Angular `listByFourIds` → GET `studentsList`. */
export async function listStudentsForPassout(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, courseGroupId, courseYearId } = params;
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId)
    return [];

  const paramSets: Record<string, string | number>[] = [
    { collegeId, academicYearId, courseGroupId, courseYearId },
    {
      college_id: collegeId,
      academic_year_id: academicYearId,
      course_group_id: courseGroupId,
      course_year_id: courseYearId,
    },
  ];

  for (const p of paramSets) {
    try {
      const data = await fetchDetails<any>("studentsList", p);
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0)
        return rows.map((row) => ({ ...normalizeStudentRow(row), ...row }));
    } catch {
      // try next shape
    }
  }

  return [];
}

/**
 * Angular `generate-student-rollno`: GET `studentsList` via `listByFourIds` or `listByFiveIds`
 * when `groupSectionId` is set.
 */
export async function listStudentsForRollNumberAssignment(params: {
  collegeId: number;
  academicYearId: number;
  courseId?: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId?: number;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId = 0,
  } = params;
  if (!collegeId || !academicYearId || !courseGroupId || !courseYearId)
    return [];

  const useSection = Number(groupSectionId) > 0;
  const g = Number(groupSectionId);

  const base: Record<string, number> = {
    collegeId,
    academicYearId,
    courseGroupId,
    courseYearId,
  };
  if (courseId) base.courseId = courseId;

  const baseSnake: Record<string, number> = {
    college_id: collegeId,
    academic_year_id: academicYearId,
    course_group_id: courseGroupId,
    course_year_id: courseYearId,
  };
  if (courseId) baseSnake.course_id = courseId;

  const paramSets: Record<string, string | number>[] = useSection
    ? [
        { ...base, groupSectionId: g },
        { ...base, group_section_id: g },
        { ...baseSnake, group_section_id: g },
      ]
    : [base, baseSnake];

  for (const p of paramSets) {
    try {
      const data = await fetchDetails<any>("studentsList", p);
      return asArray<AnyRow>(data).map((row) => ({
        ...normalizeStudentRow(row),
        ...row,
      }));
    } catch {
      // next variant
    }
  }

  return [];
}

/**
 * Angular **Parent → Manage** (`#/admin-user-management/parent/manage`): student dropdown after
 * College + Academic Year. Tries legacy `studentsList` query shapes, then `Student` domain list.
 */
export async function listStudentsForParentAccountManage(params: {
  collegeId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const collegeId = Number(params.collegeId);
  const academicYearId = Number(params.academicYearId);
  if (!collegeId || !academicYearId) return [];

  const paramSets: Record<string, string | number>[] = [
    { collegeId, academicYearId },
    { college_id: collegeId, academic_year_id: academicYearId },
    { collegeId, academicYearId, statusCode: "INCOLLEGE" },
    {
      college_id: collegeId,
      academic_year_id: academicYearId,
      status_code: "INCOLLEGE",
    },
    { collegeId, academicYearId, statusCode: "ACTIVE" },
  ];

  for (const p of paramSets) {
    try {
      const data = await fetchDetails<any>("studentsList", p);
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0)
        return rows.map((row) => ({ ...normalizeStudentRow(row), ...row }));
    } catch {
      // try next shape
    }
  }

  const queryVariants = [
    buildQuery({
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      isActive: true,
    }),
    buildQuery({
      collegeId,
      academicYearId,
      isActive: true,
    }),
  ];

  for (const query of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("Student", query);
      if (rows.length > 0) return rows.map((row) => normalizeStudentRow(row));
    } catch {
      // next variant
    }
  }

  return [];
}

/** Angular `addMasterDetails(updateRollnoUrl, students)` — POST batch roll / hallticket updates. */
export async function submitStudentRollNumbers(
  rows: AnyRow[],
): Promise<unknown> {
  if (!rows.length) throw new Error("No students to save");
  return postDetails<unknown>("updateRollno", rows);
}

/**
 * Angular student-subjects page:
 *   domain/list/StudentSubject?query=college+academicYear+student+courseYear+isActive
 */
export async function listStudentSubjectsForStudent(params: {
  collegeId: number;
  academicYearId: number;
  studentId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, studentId, courseYearId } = params;
  if (!collegeId || !academicYearId || !studentId || !courseYearId) return [];

  // Exact Angular `listDetailsByFiveIds` shape (includes isActive==true).
  const queryVariants = [
    buildQuery({
      "college.collegeId": collegeId,
      "academicYear.academicYearId": academicYearId,
      "studentDetail.studentId": studentId,
      "courseYear.courseYearId": courseYearId,
      isActive: true,
    }),
    buildQuery({
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      "StudentDetail.studentId": studentId,
      "CourseYear.courseYearId": courseYearId,
      isActive: true,
    }),
    buildQuery({
      collegeId,
      academicYearId,
      studentId,
      courseYearId,
      isActive: true,
    }),
  ];

  for (const q of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("StudentSubject", q);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }

  return [];
}

/** Student Co-Curriculum activity list by student id (StdCCActivitiesDetails). */
export async function listStudentCcActivities(
  studentId: number,
): Promise<AnyRow[]> {
  if (!studentId) return [];
  const queries = [
    buildQuery(
      { "studentDetail.studentId": studentId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      { "StudentDetail.studentId": studentId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      { studentId, isActive: true },
      { field: "createdDt", direction: "DESC" },
    ),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("StdCCActivitiesDetails", q);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // next query shape
    }
  }
  return [];
}

/** GeneralDetail rows by general master code (STDCCATYPE / STDCCA etc.). */
export async function listGeneralDetailsByCode(
  code: string,
): Promise<AnyRow[]> {
  const c = String(code ?? "").trim();
  if (!c) return [];
  const queries = [
    buildQuery({ "GeneralMaster.generalMasterCode": c, isActive: true }),
    buildQuery({ "generalMaster.generalMasterCode": c, isActive: true }),
    buildQuery({ generalMasterCode: c, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("GeneralDetail", q);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // next query shape
    }
  }
  return [];
}

/** Create StdCCActivitiesDetails row. */
export async function createStudentCcActivity(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainCreate<AnyRow>("StdCCActivitiesDetails", payload);
}

/** Update StdCCActivitiesDetails by stdCcactivityId. */
export async function updateStudentCcActivity(
  stdCcactivityId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    "StdCCActivitiesDetails",
    "stdCcactivityId",
    stdCcactivityId,
    payload,
  );
}

/**
 * Angular passout payload fields — mirrors `changeStudentSections` object push (reason + from/to + status).
 */
export function buildStudentPassoutPayload(
  row: AnyRow,
  passedOutGdId: number,
  fromToDateTime: string,
): Record<string, unknown> {
  return {
    academicYearId: num(row, ["academicYearId", "fk_academic_year_id"]),
    admissionNumber: row.admissionNumber ?? null,
    applicationNo: row.applicationNo ?? null,
    batchId: row.batchId ?? null,
    collegeId: num(row, ["collegeId", "fk_college_id"]),
    courseGroupId: num(row, ["courseGroupId", "fk_course_group_id"]),
    courseId: num(row, ["courseId", "fk_course_id"]),
    courseYearId: num(row, ["courseYearId", "fk_course_year_id"]),
    dateOfBirth: row.dateOfBirth ?? null,
    fatherAddress: row.fatherAddress ?? null,
    fatherEmailId: row.fatherEmailId ?? null,
    fatherMobileNo: row.fatherMobileNo ?? null,
    fatherName: row.fatherName ?? null,
    fatherQualification: row.fatherQualification ?? null,
    firstName: row.firstName ?? null,
    genderId: row.genderId ?? null,
    groupSectionId: num(row, [
      "groupSectionId",
      "fk_group_section_id",
      "group_section_id",
    ]),
    guardianAddress: row.guardianAddress ?? null,
    guardianEmailId: row.guardianEmailId ?? null,
    guardianMobileNo: row.guardianMobileNo ?? null,
    guardianName: row.guardianName ?? null,
    hallticketNumber: row.hallticketNumber ?? null,
    isActive: row.isActive ?? true,
    isLateral: row.isLateral ?? null,
    isMinority: row.isMinority ?? null,
    isPresent: true,
    isScholarship: row.isScholarship ?? null,
    lastName: row.lastName ?? null,
    middleName: row.middleName ?? null,
    mobile: row.mobile ?? null,
    motherEmailId: row.motherEmailId ?? null,
    motherMobileNo: row.motherMobileNo ?? null,
    motherName: row.motherName ?? null,
    permanentAddress: row.permanentAddress ?? null,
    permanentPincode: row.permanentPincode ?? null,
    permanentStreet: row.permanentStreet ?? null,
    premanentMandal: row.premanentMandal ?? null,
    presentAddress: row.presentAddress ?? null,
    presentMandal: row.presentMandal ?? null,
    presentPincode: row.presentPincode ?? null,
    presentStreet: row.presentStreet ?? null,
    primaryContact: row.primaryContact ?? null,
    qualifyingId: row.qualifyingId ?? null,
    quotaId: row.quotaId ?? null,
    reason: "student passedout",
    regulationId: row.regulationId ?? null,
    rfid: row.rfid ?? null,
    rollNumber: row.rollNumber ?? null,
    sscNo: row.sscNo ?? null,
    stdEmailId: row.stdEmailId ?? null,
    studentAppId: row.studentAppId ?? null,
    studentEmailId: row.studentEmailId ?? null,
    studentId: num(row, ["studentId", "fk_student_id"]),
    studentPhotoPath: row.studentPhotoPath ?? null,
    studentStatusId: passedOutGdId,
    toDate: fromToDateTime,
    userId: row.userId ?? null,
    fromDate: fromToDateTime,
  };
}

/** ISO datetime at local noon — aligns with Angular `momentWithTime` for pass-out date. */
export function passoutDateTimeFromPicker(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x.toISOString();
}

/** PUT `passedout` with JSON array — Angular `crudService.update(passedoutUrl, sectionStudents)`. */
export async function submitStudentPassout(
  rows: Record<string, unknown>[],
): Promise<unknown> {
  if (!rows.length) throw new Error("No students to pass out");
  return putDetails<unknown>("passedout", rows);
}

/** Mirrors Angular `genericFunctions.momentWithTime()`. */
export function modifyStudentSectionDateTime(d: Date | null): string {
  if (!d) return "";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Angular modify-student-section `changeStudentSections` payload — PUT `studentsList`
 * with `groupSectionId`, `fromDate`/`toDate`, and `isStudentModification: true`.
 */
export function buildModifyStudentSectionPayload(
  row: AnyRow,
  targetSectionId: number,
  fromDate: Date | null,
  toDate: Date | null = fromDate,
): Record<string, unknown> {
  const fromDateTime = modifyStudentSectionDateTime(fromDate);
  const toDateTime = modifyStudentSectionDateTime(toDate ?? fromDate);
  return {
    academicYearId: num(row, ["academicYearId", "fk_academic_year_id"]),
    admissionNumber: row.admissionNumber ?? null,
    applicationNo: row.applicationNo ?? null,
    batchId: row.batchId ?? null,
    collegeId: num(row, ["collegeId", "fk_college_id"]),
    courseGroupId: num(row, ["courseGroupId", "fk_course_group_id"]),
    courseId: num(row, ["courseId", "fk_course_id"]),
    courseYearId: num(row, ["courseYearId", "fk_course_year_id"]),
    dateOfBirth: row.dateOfBirth ?? null,
    fatherAddress: row.fatherAddress ?? null,
    fatherEmailId: row.fatherEmailId ?? null,
    fatherMobileNo: row.fatherMobileNo ?? null,
    fatherName: row.fatherName ?? null,
    fatherQualification: row.fatherQualification ?? null,
    firstName: row.firstName ?? row.studentName ?? row.student_name ?? null,
    genderId: row.genderId ?? null,
    groupSectionId: targetSectionId,
    guardianAddress: row.guardianAddress ?? null,
    guardianEmailId: row.guardianEmailId ?? null,
    guardianMobileNo: row.guardianMobileNo ?? null,
    guardianName: row.guardianName ?? null,
    hallticketNumber: row.hallticketNumber ?? null,
    isActive: row.isActive ?? true,
    isLateral: row.isLateral ?? null,
    isMinority: row.isMinority ?? null,
    isPresent: row.isPresent ?? true,
    isScholarship: row.isScholarship ?? null,
    isStudentModification: true,
    lastName: row.lastName ?? null,
    middleName: row.middleName ?? null,
    mobile: row.mobile ?? null,
    motherEmailId: row.motherEmailId ?? null,
    motherMobileNo: row.motherMobileNo ?? null,
    motherName: row.motherName ?? null,
    permanentAddress: row.permanentAddress ?? null,
    permanentPincode: row.permanentPincode ?? null,
    permanentStreet: row.permanentStreet ?? null,
    premanentMandal: row.premanentMandal ?? null,
    presentAddress: row.presentAddress ?? null,
    presentMandal: row.presentMandal ?? null,
    presentPincode: row.presentPincode ?? null,
    presentStreet: row.presentStreet ?? null,
    primaryContact: row.primaryContact ?? null,
    qualifyingId: row.qualifyingId ?? null,
    quotaId: row.quotaId ?? null,
    reason: row.reason ?? null,
    regulationId: row.regulationId ?? null,
    rfid: row.rfid ?? null,
    rollNumber: row.rollNumber ?? null,
    sscNo: row.sscNo ?? null,
    stdEmailId: row.stdEmailId ?? null,
    studentAppId: row.studentAppId ?? null,
    studentEmailId: row.studentEmailId ?? null,
    studentId: num(row, ["studentId", "fk_student_id"]),
    studentPhotoPath: row.studentPhotoPath ?? null,
    studentStatusId: row.studentStatusId ?? null,
    toDate: toDateTime,
    userId: row.userId ?? null,
    fromDate: fromDateTime,
  };
}

/**
 * Angular modify-student-section — PUT `studentsList`.
 * Returns the full envelope so the page can surface attendance / academic-batch conflicts.
 */
export async function submitModifyStudentSections(
  rows: Record<string, unknown>[],
): Promise<ApiResponse<unknown>> {
  if (!rows.length) throw new Error("No students selected for section change");
  return putDetailsEnvelope<unknown>(STUDENT_API.STUDENT, rows);
}

/** Section / cascade rows only — not the `clg_filters_ay` list (see `getStudentInfoCollegeFilters`). */
export async function getStudentInfoFilters(
  orgId: number,
  employeeId: number,
): Promise<AnyRow[]> {
  const { filtersData } = await getStudentInfoCollegeFilters(orgId, employeeId);
  return filtersData;
}

/** Angular students-list `selectedYear` / `selectedAcademicYear` — `clg_sec_filters` proc. */
export async function listStudentSectionsByProc(params: {
  organizationId: number;
  employeeId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const {
    organizationId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
  } = params;
  if (
    !collegeId ||
    !courseId ||
    !courseGroupId ||
    !courseYearId ||
    !academicYearId
  )
    return [];

  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_sec_filters",
        in_org_id: organizationId || 0,
        in_college_id: collegeId,
        in_course_id: courseId,
        in_course_group_id: courseGroupId,
        in_course_year_id: courseYearId,
        in_group_section_id: 0,
        in_academic_year_id: academicYearId,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: employeeId || 0,
        in_loginuser_roleid: 0,
        in_subject: "",
        in_employee: "",
        in_gm_codes: "",
      },
    );
    const groups = Array.isArray(data?.result)
      ? (data.result as unknown[])
      : [];
    for (const g of groups) {
      if (Array.isArray(g) && g.length > 0) {
        return (g as AnyRow[]).sort(
          (a, b) =>
            num(a, [
              "pk_group_section_id",
              "groupSectionId",
              "group_section_id",
            ]) -
            num(b, [
              "pk_group_section_id",
              "groupSectionId",
              "group_section_id",
            ]),
        );
      }
    }
  } catch {
    // fallback below
  }

  return listGroupSectionsByFilters({
    collegeId,
    academicYearId,
    courseGroupId,
    courseYearId,
  });
}

/** Angular students-list `getStudents` — `studentsList` via `listByFiveIds` or `listBySixIds`. */
export async function listStudentsForStudentDetails(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId?: number;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId = 0,
  } = params;
  if (
    !collegeId ||
    !academicYearId ||
    !courseId ||
    !courseGroupId ||
    !courseYearId
  )
    return [];

  const useSection = Number(groupSectionId) > 0;
  const g = Number(groupSectionId);

  const fiveIdSets: Record<string, string | number>[] = [
    { collegeId, academicYearId, courseId, courseGroupId, courseYearId },
    {
      CollegeId: collegeId,
      AcademicYearId: academicYearId,
      CourseId: courseId,
      CourseGroupId: courseGroupId,
      CourseYearId: courseYearId,
    },
    {
      college_id: collegeId,
      academic_year_id: academicYearId,
      course_id: courseId,
      course_group_id: courseGroupId,
      course_year_id: courseYearId,
    },
  ];

  const sixIdSets: Record<string, string | number>[] = [
    {
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      groupSectionId: g,
    },
    {
      CollegeId: collegeId,
      AcademicYearId: academicYearId,
      CourseId: courseId,
      CourseGroupId: courseGroupId,
      CourseYearId: courseYearId,
      GroupSectionId: g,
    },
    {
      college_id: collegeId,
      academic_year_id: academicYearId,
      course_id: courseId,
      course_group_id: courseGroupId,
      course_year_id: courseYearId,
      group_section_id: g,
    },
    { ...fiveIdSets[0]!, groupSectionId: g },
    { ...fiveIdSets[2]!, group_section_id: g },
  ];

  const paramSets = useSection ? sixIdSets : fiveIdSets;
  let lastRows: AnyRow[] = [];

  for (const p of paramSets) {
    try {
      const data = await fetchDetails<any>("studentsList", p);
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0) {
        return rows.map((row) => ({ ...normalizeStudentRow(row), ...row }));
      }
      lastRows = rows;
    } catch {
      // try next shape
    }
  }

  return lastRows.map((row) => ({ ...normalizeStudentRow(row), ...row }));
}

/** Angular `sendStudentMailsUrl` — POST student credential emails. */
export async function sendStudentCredentials(
  rows: Array<{ studentId: number; collegeId: number }>,
): Promise<unknown> {
  if (!rows.length) throw new Error("No students selected");
  const paths = ["sendStudentMails", "sendstudentmails"];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await postDetails(path, rows);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to send student credentials");
}

/** Angular HOD quick edit — POST `studentdetail` with updated profile fields. */
export async function updateStudentQuickProfile(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails("studentdetail", payload);
}

export async function searchStudentsByKeyword(term: string): Promise<AnyRow[]> {
  const q = term.trim();
  if (!q) return [];
  try {
    const data = await fetchDetails<any>("studentsearch", {
      isActive: "true",
      q,
    });
    return asArray<AnyRow>(data).map(normalizeStudentRow);
  } catch {
    // Some environments expose only domain access. Keep fallback permissive.
    const rows = await domainList<AnyRow>(
      "StudentProfile",
      buildQuery({ isActive: true, firstName: q }),
    );
    return rows.map(normalizeStudentRow);
  }
}

export async function listStudentsBySection(
  sectionId: number,
): Promise<AnyRow[]> {
  if (!sectionId) return [];

  const endpointVariants = [
    "studentdetailsbysection",
    "studentsbysection",
    "studentSectionDetails",
  ];
  for (const path of endpointVariants) {
    try {
      const data = await fetchDetails<any>(path, {
        groupSectionId: sectionId,
        isActive: "true",
      });
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0) return rows.map(normalizeStudentRow);
    } catch {
      // Try next endpoint variation.
    }
  }

  // Fallback using StudentAcademicbatch mapping.
  const queryVariants = [
    buildQuery({ "GroupSection.groupSectionId": sectionId, isActive: true }),
    buildQuery({ "groupSection.groupSectionId": sectionId, isActive: true }),
    buildQuery({ groupSectionId: sectionId, isActive: true }),
  ];

  for (const query of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("StudentAcademicbatch", query);
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const mapped = rows.map((row) => {
        const nested = (row.studentDetail ??
          row.studentProfile ??
          row.StudentDetail ??
          {}) as AnyRow;
        return normalizeStudentRow({
          ...nested,
          ...row,
          studentId:
            nested.studentId ??
            row.studentId ??
            row.fk_student_id ??
            row.student_id,
          studentName: nested.firstName ?? row.studentName ?? row.student_name,
          hallticketNumber:
            nested.hallticketNumber ??
            nested.rollNumber ??
            row.hallticketNumber ??
            row.rollNumber,
        });
      });
      if (mapped.length > 0) return mapped;
    } catch {
      // Try next query variation.
    }
  }

  return [];
}

/** Promotion student list contract: studentsList?collegeId&courseGroupId&groupSectionId */
export async function listStudentsForPromotionPreview(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseGroupId, groupSectionId } = params;
  if (!collegeId || !courseGroupId || !groupSectionId) return [];

  try {
    const data = await fetchDetails<any>("studentsList", {
      collegeId,
      courseGroupId,
      groupSectionId,
    });
    const rows = asArray<AnyRow>(data);
    if (rows.length > 0) return rows.map((row) => normalizeStudentRow(row));
  } catch {
    // fallback below
  }

  return listStudentsBySection(groupSectionId);
}

/**
 * Angular `selectedSection` → `listByFourIds(studentsList, collegeId, courseGroupId, groupSectionId, 'INCOLLEGE', …)`.
 */
export async function listStudentsForLabAssignment(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseGroupId, groupSectionId } = params;
  if (!collegeId || !courseGroupId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<any>("studentsList", {
      collegeId,
      courseGroupId,
      groupSectionId,
      statusCode: "INCOLLEGE",
    });
    return asArray<AnyRow>(data).map((row) => {
      const normalized = normalizeStudentRow(row);
      return {
        ...normalized,
        firstName: text(row, [
          "firstName",
          "studentName",
          "student_name",
          "fullName",
          "name",
        ]),
        rollNumber: text(row, [
          "rollNumber",
          "roll_number",
          "hallticketNumber",
          "hallticket_number",
          "admissionNumber",
        ]),
        genderDisplayName: text(row, [
          "genderDisplayName",
          "gender",
          "genderCode",
        ]),
      };
    });
  } catch {
    return [];
  }
}

/** Angular `getSubjectTypes` → GeneralDetail where master code is SUBTYPE; pick LAB. */
export async function getLabSubjectTypeId(): Promise<number> {
  const rows = await listGeneralDetailsByCode("SUBTYPE");
  const lab = rows.find(
    (r) =>
      String(
        r?.generalDetailCode ?? r?.general_detail_code ?? "",
      ).toUpperCase() === "LAB",
  );
  return Number(lab?.generalDetailId ?? lab?.general_detail_id ?? 0) || 0;
}

export async function listStudentsForModifyStudentBatches(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseGroupId, groupSectionId } = params;
  if (!collegeId || !courseGroupId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<any>("studentsList", {
      collegeId,
      courseGroupId,
      groupSectionId,
    });
    return asArray<AnyRow>(data).map(normalizeStudentRow);
  } catch {
    return [];
  }
}

/**
 * Angular `getSections` → domain/list/Studentbatch?
 * `subjecttype.generalDetailId==LAB.and.College.collegeId==….and.isActive==true.and.Course.courseId==…`
 */
export async function listStudentLabBatches(params: {
  collegeId: number;
  courseId: number;
  subjectTypeId?: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseId } = params;
  const subjectTypeId =
    params.subjectTypeId && params.subjectTypeId > 0
      ? params.subjectTypeId
      : await getLabSubjectTypeId();
  if (!collegeId || !courseId || !subjectTypeId) return [];
  const query = buildQuery({
    "subjecttype.generalDetailId": subjectTypeId,
    "College.collegeId": collegeId,
    isActive: true,
    "Course.courseId": courseId,
  });
  try {
    return await domainList<AnyRow>("Studentbatch", query);
  } catch {
    return [];
  }
}

/**
 * Angular `getTimetable` → `timetablescurr?College.collegeId&AcademicYear.academicYearId&groupSectionId`.
 */
export async function listSectionTimetableCurr(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params;
  if (!collegeId || !academicYearId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<any>("timetablescurr", {
      "College.collegeId": collegeId,
      "AcademicYear.academicYearId": academicYearId,
      groupSectionId,
    });
    return asArray<AnyRow>(data);
  } catch {
    return [];
  }
}

/**
 * Angular `selectedSection` → `listByThreeIds(batchwisestudents, collegeId, groupSectionId, 'LAB', …)`.
 */
export async function listBatchwiseLabStudents(params: {
  collegeId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, groupSectionId } = params;
  if (!collegeId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<any>("batchwisestudents", {
      collegeId,
      groupSectionId,
      subjectTypeCode: "LAB",
    });
    return asArray<AnyRow>(data);
  } catch {
    return [];
  }
}

/**
 * Angular `selectedSection` data fan-out: studentsList + Studentbatch + batchwisestudents + timetablescurr.
 * Loads batches first so distribution can match studentbatchId → Lab panels.
 */
export async function loadAssignStudentsToLabBatches(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  groupSectionId: number;
  academicYearId: number;
}): Promise<LabBatchAssignmentBundle> {
  const { collegeId, courseId, courseGroupId, groupSectionId, academicYearId } =
    params;
  if (
    !collegeId ||
    !courseId ||
    !courseGroupId ||
    !groupSectionId ||
    !academicYearId
  ) {
    return {
      students: [],
      studentBatches: [],
      batchWiseStudents: [],
      timetables: [],
    };
  }

  const subjectTypeId = await getLabSubjectTypeId();
  const [students, studentBatches, batchWiseStudents, timetables] =
    await Promise.all([
      listStudentsForLabAssignment({
        collegeId,
        courseGroupId,
        groupSectionId,
      }),
      listStudentLabBatches({ collegeId, courseId, subjectTypeId }),
      listBatchwiseLabStudents({ collegeId, groupSectionId }),
      listSectionTimetableCurr({ collegeId, academicYearId, groupSectionId }),
    ]);

  return { students, studentBatches, batchWiseStudents, timetables };
}

export type LabBatchAssignmentBundle = {
  students: AnyRow[];
  studentBatches: AnyRow[];
  batchWiseStudents: AnyRow[];
  timetables: AnyRow[];
};

/**
 * Angular `assignStudents` → `crudService.add(batchwisestudents, batchStudents)`.
 */
export async function submitLabBatchStudentAssignments(
  rows: AnyRow[],
): Promise<unknown> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No students to assign to lab batches");
  }
  return postDetails<unknown>("batchwisestudents", rows);
}

/**
 * Students in a section's LAB batch (source batch).
 * Mirrors Angular `getBatchWiseStudents`: intersect section roster with
 * `batchwisestudents` (subjectTypeCode=LAB, studentbatchId) by studentId.
 */
export async function listLabBatchStudentsForModify(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
  studentbatchId: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseGroupId, groupSectionId, studentbatchId } = params;
  if (!collegeId || !courseGroupId || !groupSectionId || !studentbatchId)
    return [];
  try {
    const [studentsRaw, batchRaw] = await Promise.all([
      fetchDetails<any>(STUDENT_API.STUDENT, {
        collegeId,
        courseGroupId,
        groupSectionId,
      }),
      fetchDetails<any>("batchwisestudents", {
        collegeId,
        groupSectionId,
        subjectTypeCode: "LAB",
        studentbatchId,
      }),
    ]);
    const sectionStudents = asArray<AnyRow>(studentsRaw).map((r) =>
      normalizeStudentRow(r),
    );
    const sectionStudentIds = new Set(
      sectionStudents.map((r) =>
        num(r, ["studentId", "fk_student_id", "student_id"]),
      ),
    );
    const sectionByStudentId = new Map(
      sectionStudents.map((r) => [
        num(r, ["studentId", "fk_student_id", "student_id"]),
        r,
      ]),
    );
    return asArray<AnyRow>(batchRaw)
      .filter((b) =>
        sectionStudentIds.has(
          num(b, ["studentId", "fk_student_id", "student_id"]),
        ),
      )
      .map((b) => {
        const sid = num(b, ["studentId", "fk_student_id", "student_id"]);
        const sectionRow = sectionByStudentId.get(sid) ?? {};
        return {
          ...sectionRow,
          ...normalizeStudentRow(b),
          studentFirstName:
            text(b, ["studentFirstName", "student_first_name"]) ||
            text(sectionRow, [
              "studentFirstName",
              "student_first_name",
              "studentName",
              "firstName",
            ]),
          rollNumber:
            text(b, ["rollNumber", "roll_number"]) ||
            text(sectionRow, [
              "rollNumber",
              "roll_number",
              "hallticketNumber",
              "registerNo",
            ]),
          checked: false,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Reassign selected students to a target LAB batch with date range.
 * Mirrors Angular `changeBatchStudents` → `crudService.add('batchwisestudents', rows)`.
 */
export async function submitLabBatchChange(rows: AnyRow[]): Promise<unknown> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No students selected for lab batch change");
  }
  return postDetails<unknown>(STUDENT_API.BATCH_WISE_STUDENTS, rows);
}

/** Elective groups mapped to a section (Angular `electivegroupyrmapping` listByThreeIds). */
export async function listSectionElectiveGroups(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, groupSectionId } = params;
  if (!collegeId || !academicYearId || !groupSectionId) return [];
  try {
    const data = await fetchDetails<any>("electivegroupyrmapping", {
      collegeId,
      academicYearId,
      groupSectionId,
    });
    return asArray<AnyRow>(data);
  } catch {
    return [];
  }
}

/**
 * Students currently in a section's elective batch.
 * Mirrors Angular `selectedElective`: intersect the section's student list (`StudentList`)
 * with the elective batch roster (`batchwisestudents` subjectTypeCode=ELECTIVE) by studentId.
 */
export async function listElectiveBatchStudents(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
  electiveGroupyrMappingId: number;
}): Promise<AnyRow[]> {
  const { collegeId, courseGroupId, groupSectionId, electiveGroupyrMappingId } =
    params;
  if (
    !collegeId ||
    !courseGroupId ||
    !groupSectionId ||
    !electiveGroupyrMappingId
  )
    return [];
  try {
    const [studentsRaw, batchRaw] = await Promise.all([
      fetchDetails<any>(STUDENT_API.STUDENT, {
        collegeId,
        courseGroupId,
        groupSectionId,
      }),
      fetchDetails<any>("batchwisestudents", {
        collegeId,
        groupSectionId,
        subjectTypeCode: "ELECTIVE",
        electiveGroupyrMappingId,
        isActive: "true",
      }),
    ]);
    const sectionStudentIds = new Set(
      asArray<AnyRow>(studentsRaw).map((r) =>
        num(r, ["studentId", "fk_student_id", "student_id"]),
      ),
    );
    return asArray<AnyRow>(batchRaw)
      .filter((b) =>
        sectionStudentIds.has(
          num(b, ["studentId", "fk_student_id", "student_id"]),
        ),
      )
      .map((b) => ({ ...normalizeStudentRow(b), checked: false }));
  } catch {
    return [];
  }
}

/**
 * Reassign selected students to a target elective batch.
 * Mirrors Angular `assignStudents` → `crudService.update('batchWiseStudentsElective', rows)`.
 */
export async function submitElectiveBatchChange(
  rows: AnyRow[],
): Promise<unknown> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No students selected for elective batch change");
  }
  return putDetails<unknown>("batchWiseStudentsElective", rows);
}

export async function listStudentBatchesByCollegeCourse(params: {
  collegeId: number;
  courseId: number;
}): Promise<AnyRow[]> {
  return listStudentLabBatches(params);
}

export async function listAcademicBatchesOfStudent(
  studentId: number,
): Promise<AnyRow[]> {
  if (!studentId) return [];
  const query = buildQuery({ "studentDetail.studentId": studentId });
  try {
    return await domainList<AnyRow>("StudentAcademicbatch", query);
  } catch {
    return [];
  }
}

export async function updateAcademicBatchRecord(
  record: AnyRow,
): Promise<AnyRow> {
  const id = num(record, ["studentAcademicbatchId", "studentAcademicBatchId"]);
  if (!id) throw new Error("Missing academic batch id");
  // Angular: PUT academicbatchupdate with [mutated StudentAcademicbatch row]
  await putDetails(STUDENT_API.ACADEMIC_BATCH_UPDATE, [record]);
  return record;
}

export async function listCourseGroupsForStudentCourseChange(params: {
  organizationId: number;
  employeeId: number;
  collegeId: number;
  courseId: number;
}): Promise<AnyRow[]> {
  const { organizationId, employeeId, collegeId, courseId } = params;
  if (!organizationId || !collegeId || !courseId) return [];
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_filters",
        in_org_id: organizationId,
        in_college_id: collegeId,
        in_course_id: courseId,
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
        in_gm_codes: "",
      },
    );
    const groups = Array.isArray(data?.result) ? data.result : [];
    const filterRows =
      groups.find(
        (arr) => Array.isArray(arr) && arr[0]?.flag === "clg_filters",
      ) ?? [];
    const unique = new Map<number, AnyRow>();
    for (const row of filterRows) {
      const id = num(row, [
        "fk_course_group_id",
        "courseGroupId",
        "course_group_id",
      ]);
      if (id <= 0 || unique.has(id)) continue;
      unique.set(id, row);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

export async function submitStudentCourseGroupChange(
  payloadRows: Record<string, unknown>[],
): Promise<unknown> {
  if (!payloadRows.length)
    throw new Error("No students selected for course-group change");
  const paths = ["addStudentCourseGroups", "addstudentcoursegroups"];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await postDetails<unknown>(path, payloadRows);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to change student course group");
}

/**
 * Angular Modify Academic Batch `getfilterDetails`:
 * `getAllRecords/s_get_collegewisedetails_bycode` with `in_flag=clg_filters`,
 * `in_college_id=0`, `in_course_id=<student.courseId>`, then take the
 * `clg_filters_batches` result set filtered by course.
 */
export async function listBatchesForModifyAcademicBatch(params: {
  organizationId: number;
  employeeId: number;
  courseId: number;
}): Promise<AnyRow[]> {
  const { organizationId, employeeId, courseId } = params;
  if (!organizationId || !courseId) return [];
  try {
    const data = await getAllRecords<{ result: AnyRow[][] }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_filters",
        in_org_id: organizationId,
        in_college_id: 0,
        in_course_id: courseId,
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
        in_gm_codes: "",
      },
    );
    const groups = Array.isArray(data?.result) ? data.result : [];
    let batches =
      groups.find(
        (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          (arr[0]?.clg_filters_batches === "clg_filters_batches" ||
            arr[0]?.flag === "clg_filters_batches"),
      ) ?? [];
    if (batches.length === 0) {
      batches =
        groups.find(
          (arr) =>
            Array.isArray(arr) &&
            arr.some(
              (r) =>
                num(r, ["fk_batch_id", "batchId"]) > 0 &&
                String(r?.batch_name ?? r?.batchName ?? "").trim() !== "",
            ),
        ) ?? [];
    }
    const unique = new Map<number, AnyRow>();
    for (const row of batches) {
      if (num(row, ["fk_course_id", "courseId"]) !== courseId) continue;
      const id = num(row, ["fk_batch_id", "batchId", "batch_id"]);
      if (id <= 0 || unique.has(id)) continue;
      unique.set(id, row);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

export async function submitStudentBatchChange(
  payloadRows: Record<string, unknown>[],
): Promise<unknown> {
  if (!payloadRows.length)
    throw new Error("No students selected for batch change");
  const paths = ["addStudentBatches", "addstudentbatches"];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await postDetails<unknown>(path, payloadRows);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to change student batch");
}

/** Angular assign-student-to-section — PUT `assignsectiontostudents`. */
export async function submitAssignedStudentSections(
  rows: AnyRow[],
): Promise<unknown> {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error("No students selected for section assignment");
  return putDetails<unknown>(STUDENT_API.ASSIGN_SECTION, rows);
}

export async function submitAssignedStudentRegulations(
  rows: AnyRow[],
): Promise<unknown> {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error("No students selected for regulation assignment");
  return postDetails<unknown>("addStudentslist", rows);
}

/** Resolve university id: URL param → student fields → College row (studentdetail often omits universityId). */
export async function resolveUniversityIdForReadmission(
  student: AnyRow,
  universityIdFromUrl: number,
): Promise<number> {
  if (universityIdFromUrl > 0) return universityIdFromUrl;

  const direct = num(student, [
    "universityId",
    "fk_university_id",
    "fk_universityId",
    "univId",
    "univ_id",
  ]);
  if (direct > 0) return direct;

  const nested =
    student?.university ??
    student?.University ??
    student?.college?.university ??
    student?.College?.university;
  if (nested && typeof nested === "object") {
    const nid = num(nested as AnyRow, ["universityId", "fk_university_id"]);
    if (nid > 0) return nid;
  }

  const collegeId = num(student, ["collegeId", "fk_college_id"]);
  if (!collegeId) return 0;

  const collegeQueries = [
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
    buildQuery({ collegeId, isActive: true }),
  ];
  for (const q of collegeQueries) {
    try {
      const rows = await domainList<AnyRow>("College", q);
      const c = rows[0];
      if (c) {
        const uid = num(c, [
          "universityId",
          "fk_university_id",
          "University.universityId",
        ]);
        if (uid > 0) return uid;
        const univ = c.university ?? c.University;
        if (univ && typeof univ === "object") {
          const u2 = num(univ as AnyRow, ["universityId"]);
          if (u2 > 0) return u2;
        }
      }
    } catch {
      // next query
    }
  }
  return 0;
}

const COLLEGE_ID_KEYS = [
  "collegeId",
  "fk_college_id",
  "college_id",
  "fk_collegeId",
] as const;
const AY_ID_KEYS = [
  "academicYearId",
  "fk_academic_year_id",
  "academic_year_id",
  "acdmYearId",
] as const;

function dedupeRowsByNumericKey<T extends AnyRow>(
  rows: T[],
  keyPick: (r: T) => number,
): T[] {
  const seen = new Set<number>();
  return rows.filter((r) => {
    const k = keyPick(r);
    if (!Number.isFinite(k) || k <= 0 || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Same academic-year resolution as Student Promotion (`clg_filters` + `clg_filters_ay` from
 * `s_get_collegewisedetails_bycode`). Domain `AcademicYear` list is often empty in this app; the proc is not.
 */
export function academicYearRowsForCollegeFromProc(
  filtersData: AnyRow[],
  academicData: AnyRow[],
  collegeId: number,
): AnyRow[] {
  if (!collegeId) return [];

  const pickCol = (r: AnyRow) => num(r, [...COLLEGE_ID_KEYS]);
  const pickAy = (r: AnyRow) => num(r, [...AY_ID_KEYS]);

  const byFilters = dedupeRowsByNumericKey(
    filtersData.filter((r) => pickCol(r) === collegeId),
    pickAy,
  ).filter((r) => pickAy(r) > 0);
  if (byFilters.length > 0) return byFilters;

  const collegeRow = filtersData.find((r) => pickCol(r) === collegeId);
  const univFromCollege = num(collegeRow ?? {}, [
    "fk_university_id",
    "universityId",
    "univId",
  ]);

  return dedupeRowsByNumericKey(
    academicData.filter((r) => {
      const cid = pickCol(r);
      if (cid > 0) return cid === collegeId;
      if (univFromCollege > 0)
        return num(r, ["fk_university_id", "universityId"]) === univFromCollege;
      return true;
    }),
    pickAy,
  ).filter((r) => pickAy(r) > 0);
}

/**
 * Academic years for readmission: by university (Angular parity), with fallbacks when API shape differs.
 */
export async function listAcademicYearsForReadmission(
  universityId: number,
  collegeId: number,
): Promise<AnyRow[]> {
  let univ = universityId;
  if (univ <= 0 && collegeId > 0) {
    univ = await resolveUniversityIdForReadmission({ collegeId }, 0);
  }
  if (univ > 0) {
    const uniQueries: { label: string; q: string }[] = [
      {
        label: "University.universityId",
        q: buildQuery(
          { "University.universityId": univ, isActive: true },
          { field: "fromDate", direction: "DESC" },
        ),
      },
      {
        label: "Universities.universityId",
        q: buildQuery(
          { "Universities.universityId": univ, isActive: true },
          { field: "fromDate", direction: "DESC" },
        ),
      },
      {
        label: "universityId flat",
        q: buildQuery(
          { universityId: univ, isActive: true },
          { field: "fromDate", direction: "DESC" },
        ),
      },
    ];
    for (const { q } of uniQueries) {
      try {
        const rows = await domainList<AnyRow>("AcademicYear", q);
        if (rows.length > 0) return rows;
      } catch {
        // try next
      }
    }
  }

  if (collegeId > 0) {
    const byCollege = [
      buildQuery(
        { "College.collegeId": collegeId, isActive: true },
        { field: "fromDate", direction: "DESC" },
      ),
      buildQuery(
        { "college.collegeId": collegeId, isActive: true },
        { field: "fromDate", direction: "DESC" },
      ),
    ];
    for (const q of byCollege) {
      try {
        const rows = await domainList<AnyRow>("AcademicYear", q);
        if (rows.length > 0) return rows;
      } catch {
        // next
      }
    }
  }

  return [];
}

/**
 * When domain `list/AcademicYear` is empty, use `s_get_collegewisedetails_bycode` (same as Student Promotion).
 */
export async function listAcademicYearsForReadmissionWithProcFallback(
  universityId: number,
  collegeId: number,
  organizationId: number,
  employeeId: number,
): Promise<AnyRow[]> {
  const domainRows = await listAcademicYearsForReadmission(
    universityId,
    collegeId,
  );
  if (domainRows.length > 0) return domainRows;
  if (organizationId <= 0) return [];

  try {
    const { filtersData, academicData } = await getStudentInfoCollegeFilters(
      organizationId,
      employeeId,
    );
    return academicYearRowsForCollegeFromProc(
      Array.isArray(filtersData) ? filtersData : [],
      Array.isArray(academicData) ? academicData : [],
      collegeId,
    );
  } catch {
    return [];
  }
}

/**
 * Course dropdown for SIS cascades — some DBs only match alternate JPA association paths or flat keys.
 */
export async function listCoursesForUniversityCascade(
  universityId: number,
): Promise<AnyRow[]> {
  if (!universityId) return [];
  const queries = [
    buildQuery({ "University.universityId": universityId, isActive: true }),
    buildQuery({ "Universities.universityId": universityId, isActive: true }),
    buildQuery({ universityId, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("Course", q);
      if (rows.length > 0) return rows;
    } catch {
      // next shape
    }
  }
  return [];
}

/** Course group dropdown — alternate query shapes for different Hibernate mappings. */
export async function listCourseGroupsForCourseCascade(
  courseId: number,
): Promise<AnyRow[]> {
  if (!courseId) return [];
  const queries = [
    buildQuery({ "Course.courseId": courseId, isActive: true }),
    buildQuery({ courseId, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("CourseGroup", q);
      if (rows.length > 0) return rows;
    } catch {
      // next shape
    }
  }
  return [];
}

/**
 * Group sections for readmission: prefer **four-field** query when college is known (Student Promotion path);
 * then three-id query (some Angular screens omit College in the filter).
 */
export async function listGroupSectionsForReadmission(params: {
  courseYearId: number;
  academicYearId: number;
  courseGroupId: number;
  collegeId?: number;
}): Promise<AnyRow[]> {
  const { courseYearId, academicYearId, courseGroupId, collegeId } = params;
  if (!courseYearId || !academicYearId || !courseGroupId) return [];

  if (collegeId) {
    const byCollege = await listGroupSectionsByFilters({
      collegeId,
      academicYearId,
      courseGroupId,
      courseYearId,
    });
    if (byCollege.length > 0) return byCollege;
  }

  const threeIdQueries = [
    buildQuery({
      "CourseYear.courseYearId": courseYearId,
      "AcademicYear.academicYearId": academicYearId,
      "CourseGroup.courseGroupId": courseGroupId,
      isActive: true,
    }),
    buildQuery({
      "CourseYear.courseYearId": courseYearId,
      "AcademicYear.academicYearId": academicYearId,
      "CourseGroup.courseGroupId": courseGroupId,
    }),
  ];

  for (const q of threeIdQueries) {
    try {
      const rows = await domainList<AnyRow>("GroupSection", q);
      if (rows.length > 0) return rows;
    } catch {
      // next variant
    }
  }

  return [];
}

export async function listGroupSectionsByFilters(params: {
  collegeId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const n = (v: unknown) => {
    const x = typeof v === "number" ? v : Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const normalize = (row: AnyRow): AnyRow => ({
    ...row,
    groupSectionId: n(
      row.groupSectionId ??
        row.pk_group_section_id ??
        row.fk_group_section_id ??
        row.group_section_id,
    ),
    collegeId: n(row.collegeId ?? row.fk_college_id ?? row.college_id),
    academicYearId: n(
      row.academicYearId ?? row.fk_academic_year_id ?? row.academic_year_id,
    ),
    courseGroupId: n(
      row.courseGroupId ?? row.fk_course_group_id ?? row.course_group_id,
    ),
    courseYearId: n(
      row.courseYearId ?? row.fk_course_year_id ?? row.course_year_id,
    ),
    groupSectionName: String(
      row.groupSectionName ?? row.section ?? row.group_section_name ?? "",
    ),
    groupSectionCode: String(
      row.groupSectionCode ?? row.section_code ?? row.group_section_code ?? "",
    ),
    sortOrder: n(row.sortOrder ?? row.sort_order),
  });

  const base = {
    "College.collegeId": params.collegeId,
    "AcademicYear.academicYearId": params.academicYearId,
    "CourseGroup.courseGroupId": params.courseGroupId,
    "CourseYear.courseYearId": params.courseYearId,
    isActive: true,
  } as const;

  const baseNoActive = {
    "College.collegeId": params.collegeId,
    "AcademicYear.academicYearId": params.academicYearId,
    "CourseGroup.courseGroupId": params.courseGroupId,
    "CourseYear.courseYearId": params.courseYearId,
  } as const;

  const queryVariants = [
    buildQuery(base),
    buildQuery({
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      isActive: true,
    }),
    buildQuery(baseNoActive),
  ];

  for (const query of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("GroupSection", query);
      if (Array.isArray(rows) && rows.length > 0) return rows.map(normalize);
    } catch {
      // try next variant
    }
  }

  return [];
}

export async function promoteStudents(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  // Return the FULL envelope (do not throw on success:false): a promotion that hits
  // a conflict comes back success:false with the conflicting academic-batches in
  // `data`, which the page surfaces in its "Academic Batches" modal. Angular's
  // student-promotions treats success:false as a non-fatal conflict result, not an error.
  return (await postDetailsEnvelope<AnyRow>(
    "promotestudent",
    payload,
  )) as unknown as AnyRow;
}

export async function submitStudentDetain(
  payload: Record<string, unknown> | Record<string, unknown>[],
): Promise<AnyRow> {
  return postDetails<AnyRow>("detainrecommended", payload);
}

/**
 * Numeric generalDetailId for STUDENTSTATUS code DETAINRECOMMENDED — the value the
 * `detainrecommended` proc consumes (Angular student-detain-modal parity). Detain must
 * write this numeric id as `studentStatusId`, NOT the string code "DETAINRECOMMENDED".
 */
export async function resolveDetainRecommendedGeneralDetailId(): Promise<number> {
  const rows = await listGeneralDetailsByCode("STUDENTSTATUS");
  const row = rows.find(
    (r) =>
      String(r.generalDetailCode ?? r.gd_code ?? "")
        .trim()
        .toUpperCase() === "DETAINRECOMMENDED",
  );
  return num(row ?? {}, [
    "generalDetailId",
    "pk_gd_id",
    "gd_id",
    "general_detail_id",
  ]);
}

export async function listCollegesByOrganization(
  organizationId: number,
): Promise<AnyRow[]> {
  if (!organizationId) return [];
  const queries = [
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
    buildQuery({
      "organization.organizationId": organizationId,
      isActive: true,
    }),
    buildQuery({ organizationId, isActive: true }),
  ];

  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>("College", query);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // try next query variant
    }
  }
  return [];
}

function coerceStudentDetail(data: unknown): AnyRow | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const row = data as AnyRow;
    // Some endpoints wrap the row as `{ data: {...} }` / `{ result: {...} }`
    if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
      return row.data as AnyRow;
    }
    if (
      row.result &&
      typeof row.result === "object" &&
      !Array.isArray(row.result)
    ) {
      return row.result as AnyRow;
    }
    return row;
  }
  if (Array.isArray(data) && data.length > 0) return data[0] as AnyRow;
  const list = asArray<AnyRow>(data);
  return list[0] ?? null;
}

function pickStudentDetailRow(data: unknown): AnyRow | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as AnyRow;
    if (Array.isArray(obj.resultList) && obj.resultList.length > 0) {
      return obj.resultList[0] as AnyRow;
    }
    return obj;
  }
  if (Array.isArray(data) && data.length > 0) return data[0] as AnyRow;
  return null;
}

/** Legacy GET: /studentdetail?studentId= */
export async function fetchStudentDetail(
  studentId: number,
): Promise<AnyRow | null> {
  if (!studentId) return null;
  try {
    const data = await fetchDetails<any>("studentdetail", { studentId });
    return coerceStudentDetail(data);
  } catch {
    return null;
  }
}

/**
 * Angular login `getStudent(userId)` — GET /studentdetail?userId=
 * Used when session.studentId is missing but the user is a student portal login.
 */
export async function fetchStudentDetailByUserId(
  userId: number,
): Promise<AnyRow | null> {
  if (!userId) return null;
  try {
    const data = await fetchDetails<any>("studentdetail", { userId });
    return coerceStudentDetail(data);
  } catch {
    return null;
  }
}

export async function listStudentRegulationsByCourse(
  courseId: number,
): Promise<AnyRow[]> {
  if (!courseId) return [];
  const queries = [
    buildQuery(
      { "Course.courseId": courseId, isActive: true },
      { field: "regulationCode", direction: "DESC" },
    ),
    buildQuery({ courseId, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("Regulation", q);
      if (rows.length > 0) return rows;
    } catch {
      // next variant
    }
  }
  return [];
}

export async function listStudentCourseYearsByCourse(
  courseId: number,
): Promise<AnyRow[]> {
  if (!courseId) return [];
  const queries = [
    buildQuery(
      { "Course.courseId": courseId, isActive: true },
      { field: "yearNo", direction: "ASC" },
    ),
    buildQuery(
      { "course.courseId": courseId, isActive: true },
      { field: "yearNo", direction: "ASC" },
    ),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("CourseYear", q);
      if (rows.length > 0) return rows;
    } catch {
      // next variant
    }
  }
  return [];
}

/** Legacy POST path used by Angular readmission screen */
export async function submitStudentReadmission(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return postDetails<AnyRow>("readmission", payload);
}

export async function listDetainedStudentsForReadmission(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];

  const endpointVariants = [
    "detainstudentslist",
    "detainedstudentslist",
    "studentdetainlist",
  ];
  for (const path of endpointVariants) {
    try {
      const data = await fetchDetails<any>(path, { collegeId, status: "true" });
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0) return rows.map((row) => normalizeStudentRow(row));
    } catch {
      // try next endpoint variation
    }
  }

  const queryVariants = [
    buildQuery({
      "College.collegeId": collegeId,
      studentStatusCode: "DETAINRECOMMENDED",
      isActive: true,
    }),
    buildQuery({
      "College.collegeId": collegeId,
      studentStatusCode: "DTND",
      isActive: true,
    }),
  ];

  for (const query of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("Student", query);
      if (rows.length > 0) return rows.map((row) => normalizeStudentRow(row));
    } catch {
      // fallback next query
    }
  }

  return [];
}

/** Legacy: GET studentsList?collegeId&academicYearId&statusCode=DISCONTINUED — discontinued students list */
export async function listDiscontinuedStudents(
  collegeId: number,
  academicYearId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !academicYearId) return [];

  const paramSets: Record<string, string | number>[] = [
    { collegeId, academicYearId, statusCode: "DISCONTINUED" },
    { collegeId, academicYearId, status_code: "DISCONTINUED" },
  ];

  for (const params of paramSets) {
    try {
      const data = await fetchDetails<any>("studentsList", params);
      const rows = asArray<AnyRow>(data);
      if (rows.length > 0)
        return rows.map((row) => ({ ...normalizeStudentRow(row), ...row }));
    } catch {
      // try next param shape
    }
  }

  return [];
}

/**
 * Legacy POST used by Angular student-discontinue (`addMasterDetails` → `discontinue`).
 * Sends an array of discontinue rows (batch).
 */
export async function submitStudentDiscontinue(
  rows: Record<string, unknown>[],
): Promise<unknown> {
  if (!rows.length) throw new Error("No rows to submit");
  return postDetails<unknown>("discontinue", rows);
}

export async function listStudentSubjectsForStudentSemester(params: {
  collegeId: number;
  studentId: number;
  courseYearId: number;
  academicYearId?: number;
}): Promise<AnyRow[]> {
  const { collegeId, studentId, courseYearId, academicYearId } = params;
  if (!collegeId || !studentId || !courseYearId) return [];

  if (academicYearId) {
    const withAy = await listStudentSubjectsForStudent({
      collegeId,
      academicYearId,
      studentId,
      courseYearId,
    });
    if (withAy.length > 0) return withAy;
  }

  const queryVariants = [
    buildQuery({
      "studentDetail.studentId": studentId,
      "courseYear.courseYearId": courseYearId,
      isActive: true,
    }),
    buildQuery({
      "StudentDetail.studentId": studentId,
      "CourseYear.courseYearId": courseYearId,
      isActive: true,
    }),
    buildQuery({ studentId, courseYearId, isActive: true }),
  ];

  for (const q of queryVariants) {
    try {
      const rows = await domainList<AnyRow>("StudentSubject", q);
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }

  return [];
}

/** Sub-castes for a caste — Angular `getSubCastesByCasteIdUrl`. */
export async function listSubCastesByCasteId(
  casteId: number,
): Promise<AnyRow[]> {
  if (!casteId) return [];
  const queries = [
    buildQuery({ "Caste.casteId": casteId, isActive: true }),
    buildQuery({ casteId, isActive: true }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("SubCaste", q);
      if (rows.length > 0) return rows;
    } catch {
      // next shape
    }
  }
  return [];
}

/** Document repository rows for student certificate step — college-scoped with global fallback. */
export async function listDocumentRepositoriesForStudentByCollege(
  collegeId: number,
): Promise<AnyRow[]> {
  const queries = collegeId
    ? [
        buildQuery({
          "College.collegeId": collegeId,
          isForStudent: true,
          isActive: true,
        }),
        buildQuery({ collegeId, isForStudent: true, isActive: true }),
        buildQuery({ isForStudent: true, isActive: true }),
      ]
    : [buildQuery({ isForStudent: true, isActive: true })];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>("DocumentRepository", q);
      if (rows.length > 0) return rows;
    } catch {
      // next shape
    }
  }
  return [];
}

/** Angular edit-student — POST full `studentdetail` payload. */
export async function saveStudentDetail(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails("studentdetail", payload);
}

/** Angular `updateStudentUploadUrl` — photos + document soft copies. */
export async function uploadStudentDetailFiles(
  formData: FormData,
): Promise<void> {
  await uploadFile(STUDENT_API.DETAIL_UPLOAD, formData);
}

/** Angular `uploadStudentSignaturePathUrl` — signature upload (endpoint name varies by env). */
export async function uploadStudentSignatureFile(
  formData: FormData,
): Promise<void> {
  const paths = [
    "uploadStudentSignaturePath",
    "uploadstudentsignature",
    "studentSignatureUpload",
  ];
  let lastError: unknown;
  for (const path of paths) {
    try {
      await uploadFile(path, formData);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to upload student signature");
}
