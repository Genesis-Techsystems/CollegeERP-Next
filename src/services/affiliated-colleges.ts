import {
  AFFILIATED_COLLEGES_API,
  NEXT_API,
  STUDENT_API,
} from "@/config/constants/api";
import { UNIV_BULK_UPLOAD_TYPES } from "@/common/affiliated-colleges-constants";
import { ENTITIES } from "@/config/constants/entities";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import type {
  AffiliatedCollegeFilterRow,
  AffiliatedSummaryRow,
  UnivCollegeWisePaymentPayload,
  UnivCollegeWisePaymentRow,
} from "@/types/affiliated-colleges";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  getAllRecordsEnvelope,
  postDetails,
  putDetails,
} from "./crud";
import { listStaffSubjectRows } from "./admin/staff-subject-mapping";
import { getFeeMasterCollegeFilters } from "./fee-masters";
import {
  listStudentSubjectsForStudent,
  normalizeStudentRow,
} from "./student-information";

type AnyRow = Record<string, unknown>;

function readStorageId(key: string): number {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis))
    return 0;
  const n = Number(globalThis.localStorage.getItem(key) ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function resolveAffiliatedOrgId(): number {
  return readStorageId("organizationId");
}

export function resolveAffiliatedEmployeeId(
  sessionEmployeeId?: number | null,
): number {
  const fromStorage = readStorageId("employeeId");
  const fromSession = Number(sessionEmployeeId ?? 0);
  return fromStorage || fromSession || 0;
}

export function resolveAffiliatedUniversityId(): number {
  return readStorageId("universityId");
}

/** `s_get_collegewisedetails_bycode` with `in_flag=clg_filters` — summaries and bulk uploads. */
export async function getAffiliatedCollegeFilters(
  orgId: number,
  employeeId: number,
) {
  return getFeeMasterCollegeFilters(orgId, employeeId);
}

/** `s_get_collegewisedetails_bycode` with `in_flag=clg_exam_filters` — exam payments cascade. */
export async function getAffiliatedCollegeExamFilters(
  orgId: number,
  employeeId: number,
): Promise<{
  filtersData: AffiliatedCollegeFilterRow[];
  regulationData: AffiliatedCollegeFilterRow[];
}> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_exam_filters",
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
  let filtersData: AffiliatedCollegeFilterRow[] = [];
  let regulationData: AffiliatedCollegeFilterRow[] = [];

  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0] ?? {};
    if (first.flag === "clg_exam_filters") filtersData = group;
    if (first.flag === "regulation_details") regulationData = group;
  }

  if (filtersData.length === 0) {
    const match = groups.find(
      (g) =>
        Array.isArray(g) &&
        g.length > 0 &&
        String(g[0]?.flag ?? "") === "clg_exam_filters",
    );
    if (match?.length) filtersData = match;
  }

  return { filtersData, regulationData };
}

export type AffiliatedUploadSummaryParams = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId?: number;
  univUploadfileId?: number;
  comments?: string;
  fromDate?: string;
  toDate?: string;
};

/** `s_pop_univ_upload_std_bulk` or `s_pop_univ_upload_std_subjects` with `in_flag=summary`. */
export async function getAffiliatedUploadSummary(
  params: AffiliatedUploadSummaryParams,
  options?: { subjectsSummary?: boolean },
): Promise<AffiliatedSummaryRow[]> {
  const proc = options?.subjectsSummary
    ? "s_pop_univ_upload_std_subjects"
    : "s_pop_univ_upload_std_bulk";
  const data = await getAllRecords<{ result: AffiliatedSummaryRow[][] }>(
    proc,
    {
      in_flag: "summary",
      in_college_id: params.collegeId,
      in_academic_year_id: params.academicYearId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_regulation_id: params.regulationId ?? 0,
      in_univ_uploadfile_id: params.univUploadfileId ?? 0,
      in_comments: params.comments ?? "",
    },
  );

  const rows = data?.result?.[0];
  return Array.isArray(rows) ? rows : [];
}

/**
 * Angular `studentDostUploadUrl` / `s_pop_univ_upload_dost_std_bulk` with `in_flag=summary`.
 * College + academic year only (course/group/year sent as 0).
 */
export async function getAffiliatedDostUploadSummary(params: {
  collegeId: number;
  academicYearId: number;
}): Promise<AffiliatedSummaryRow[]> {
  const data = await getAllRecords<{ result: AffiliatedSummaryRow[][] }>(
    "s_pop_univ_upload_dost_std_bulk",
    {
      in_flag: "summary",
      in_college_id: params.collegeId,
      in_academic_year_id: params.academicYearId,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_regulation_id: 0,
      in_univ_uploadfile_id: 0,
      in_comments: "",
    },
  );

  const rows = data?.result?.[0];
  return Array.isArray(rows) ? rows : [];
}

async function postAffiliatedMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(NEXT_API.PROXY(path), {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body?.success) {
    throw new AppError("API_ERROR", body?.message ?? "Upload failed");
  }
  return body.data as T;
}

/** Angular `result.data.insertedRecords` — tolerate nested / alternate shapes from proxy. */
function extractInsertedRecords(data: unknown, depth = 0): AnyRow[] {
  if (depth > 6) return [];
  if (Array.isArray(data)) {
    if (
      data.length > 0 &&
      data[0] &&
      typeof data[0] === "object" &&
      !Array.isArray(data[0])
    ) {
      return data as AnyRow[];
    }
    if (data.length > 0 && Array.isArray(data[0])) {
      return extractInsertedRecords(data[0], depth + 1);
    }
    return data as AnyRow[];
  }
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return [];
    try {
      return extractInsertedRecords(JSON.parse(trimmed), depth + 1);
    } catch {
      return [];
    }
  }
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    if (
      /inserted_?records/i.test(key) &&
      Array.isArray(value) &&
      value.length > 0
    ) {
      return value as AnyRow[];
    }
  }

  if (Array.isArray(obj.resultList) && obj.resultList.length > 0) {
    return obj.resultList as AnyRow[];
  }
  if (Array.isArray(obj.content) && obj.content.length > 0) {
    return obj.content as AnyRow[];
  }

  if (Array.isArray(obj.result)) {
    const result = obj.result as unknown[];
    if (result.length > 0 && Array.isArray(result[0])) {
      const nested = result[0] as AnyRow[];
      if (nested.length > 0) return nested;
    }
    if (
      result.length > 0 &&
      result[0] &&
      typeof result[0] === "object" &&
      !Array.isArray(result[0])
    ) {
      return result as AnyRow[];
    }
  }

  if (obj.data != null) {
    const nested = extractInsertedRecords(obj.data, depth + 1);
    if (nested.length > 0) return nested;
  }

  return [];
}

export type AffiliatedStudentImportMeta = {
  universityCode: string;
  collegeCode: string;
  courseCode: string;
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
};

/** `s_pop_univ_upload_std_bulk` / `in_flag=template` — sample headers and dictionary data. */
function normalizeUnivUploadTemplateResult(data: unknown): unknown[][] {
  if (Array.isArray(data)) return data as unknown[][];
  if (data && typeof data === "object") {
    const obj = data as { result?: unknown; data?: { result?: unknown } };
    const result = obj.result ?? obj.data?.result;
    if (Array.isArray(result)) return result as unknown[][];
  }
  return [];
}

export async function getAffiliatedStudentUploadTemplate(
  params: AffiliatedUploadSummaryParams,
): Promise<unknown[][]> {
  const data = await getAllRecords<unknown>("s_pop_univ_upload_std_bulk", {
    in_flag: "template",
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId ?? 0,
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    in_comments: params.comments ?? "",
  });
  return normalizeUnivUploadTemplateResult(data);
}

/** Angular `importAffiliatedStudentDetailsUrl` — stage uploaded Excel rows. */
export async function importAffiliatedStudentFile(
  file: File,
  meta: AffiliatedStudentImportMeta,
): Promise<AnyRow[]> {
  const formData = new FormData();
  formData.append("universityCode", meta.universityCode);
  formData.append("collegeCode", meta.collegeCode);
  formData.append("courseCode", meta.courseCode);
  formData.append("collegeId", String(meta.collegeId));
  formData.append("academicYearId", String(meta.academicYearId));
  formData.append("courseId", String(meta.courseId));
  formData.append("courseGroupId", String(meta.courseGroupId));
  formData.append("courseYearId", String(meta.courseYearId));
  formData.append("fileTypeCatDetId", String(UNIV_BULK_UPLOAD_TYPES.STUDENT));
  formData.append("fileDescription", meta.fileDescription);
  formData.append("fileUploadedByEmpId", String(meta.fileUploadedByEmpId));
  formData.append("file", file, file.name);

  const data = await postAffiliatedMultipart<AnyRow[]>(
    AFFILIATED_COLLEGES_API.IMPORT_AFFILIATED_STUDENT_DETAILS,
    formData,
  );
  return Array.isArray(data) ? data : [];
}

export type AffiliatedCollegeSummaryParams = {
  inFlag: string;
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  filetypeCatdetId?: number;
  univUploadfileId?: number;
};

/** `s_get_affilated_college_summary_details` — university report and file summaries. */
export async function getAffiliatedCollegeSummaryReport(
  params: AffiliatedCollegeSummaryParams,
): Promise<AffiliatedSummaryRow[]> {
  const data = await getAllRecords<{ result: AffiliatedSummaryRow[][] }>(
    "s_get_affilated_college_summary_details",
    {
      in_flag: params.inFlag,
      in_college_id: params.collegeId,
      in_academic_year_id: params.academicYearId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_filetype_catdet_id: params.filetypeCatdetId ?? 0,
      in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    },
  );

  const rows = data?.result?.[0];
  return Array.isArray(rows) ? rows : [];
}

export async function listUnivCollegeWisePayments(
  collegeId: number,
  examId: number,
): Promise<UnivCollegeWisePaymentRow[]> {
  const parts: Record<string, string | number | boolean> = { isActive: true };
  if (collegeId > 0) parts["college.collegeId"] = collegeId;
  if (examId > 0) parts["examMaster.examId"] = examId;
  return domainList<UnivCollegeWisePaymentRow>(
    ENTITIES.UNIV_COLLEGE_WISE_PAYMENT.name,
    buildQuery(parts),
  );
}

export async function createUnivCollegeWisePayment(
  payload: UnivCollegeWisePaymentPayload,
): Promise<unknown> {
  return domainCreate(ENTITIES.UNIV_COLLEGE_WISE_PAYMENT.name, payload);
}

export async function updateUnivCollegeWisePayment(
  id: number,
  payload: Partial<UnivCollegeWisePaymentPayload>,
): Promise<unknown> {
  return domainUpdate(
    ENTITIES.UNIV_COLLEGE_WISE_PAYMENT.name,
    ENTITIES.UNIV_COLLEGE_WISE_PAYMENT.pk,
    id,
    payload,
  );
}

/** Angular `studentSearchUrl` — search by name or roll no (min ~5 chars). */
export async function searchAffiliatedStudents(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length < 5) return [];
  try {
    const data = await fetchDetails<AnyRow[]>("studentsearch", {
      isActive: "true",
      q,
    });
    const rows = Array.isArray(data) ? data : [];
    return rows.map(normalizeStudentRow);
  } catch {
    try {
      const rows = await domainList<AnyRow>(
        "StudentProfile",
        buildQuery({ isActive: true, firstName: q }),
      );
      return rows.map(normalizeStudentRow);
    } catch {
      return [];
    }
  }
}

/** Angular `subjectcourseyrsUrl` — subjects available for section. */
export async function listAffiliatedSubjectCourseYears(params: {
  collegeId: number;
  academicYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  return listStaffSubjectRows(params);
}

/** Angular `studentSubjectUrl` — existing student exam subjects. */
export async function listAffiliatedStudentSubjects(params: {
  collegeId: number;
  academicYearId: number;
  studentId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  return listStudentSubjectsForStudent(params);
}

export type AffiliatedStudentSubjectPayload = {
  isActive: boolean;
  collegeId: number;
  studentId: number;
  studentbatchId: number;
  regulationId: number;
  courseId: number;
  courseYearId: number;
  sectionId: number;
  academicYearId: number;
  subjectTypeId: number;
  subjectId: number;
  subCredits: number;
  cbcsSubjectRegulationFacultyId: number | null;
};

/** Angular `studentsubjectsUrl` — POST batch assign subjects. */
export async function assignAffiliatedStudentSubjects(
  rows: AffiliatedStudentSubjectPayload[],
): Promise<unknown> {
  if (!rows.length) throw new Error("No subjects to save");
  const paths = [STUDENT_API.SUBJECTS, "studentsubjects"];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await postDetails(path, rows);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Failed to assign student subjects");
}

export type UpdateAffiliatedStudentSubjectPayload = {
  isActive: boolean;
  reason?: string;
  studentId: number;
  subjectId: number;
  studentSubjectId?: number;
};

/** Angular `updateStudnetSubjectsUrl` — PUT array with isActive / reason / studentId / subjectId. */
export async function updateAffiliatedStudentSubject(
  payload: UpdateAffiliatedStudentSubjectPayload,
): Promise<unknown> {
  const body = [
    {
      isActive: payload.isActive,
      reason: payload.reason ?? (payload.isActive ? "active" : ""),
      studentId: payload.studentId,
      subjectId: payload.subjectId,
    },
  ];

  const paths = ["updateStudentSubjects", "updatestudnetsubjects"];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await putDetails(path, body);
    } catch (error) {
      lastError = error;
    }
  }

  const pk = payload.studentSubjectId ?? 0;
  if (pk > 0) {
    return domainUpdate("StudentSubject", "studentSubjectId", pk, body[0]);
  }

  throw lastError ?? new Error("Failed to update student subject");
}

function normalizeFetchRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as AnyRow[];
    if (Array.isArray(obj.result)) return obj.result as AnyRow[];
  }
  return [];
}

/** Angular `listByIds(url, pk, 'univUploadFileId')` — tries path variants until one succeeds. */
export async function listAffiliatedRowsByUploadFileId(
  paths: string[],
  univUploadFileId: number,
): Promise<AnyRow[]> {
  if (!univUploadFileId) return [];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, { univUploadFileId });
      return normalizeFetchRows(data);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

export async function getAffiliatedStudentUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [AFFILIATED_COLLEGES_API.AFFILIATED_STD_DETAILS, "getaffiliatedstddetails"],
    univUploadFileId,
  );
}

/** `GET tables/getStudentSubjects?univUploadFileId=` — view-subjects-data (Angular listByIds). */
export async function getAffiliatedSubjectUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [AFFILIATED_COLLEGES_API.STUDENT_SUBJECTS_BY_UPLOAD],
    univUploadFileId,
  );
}

export async function getAffiliatedAttendanceUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [
      AFFILIATED_COLLEGES_API.STUDENT_ATTENDANCE_BY_UPLOAD,
      "getstudentattendance",
    ],
    univUploadFileId,
  );
}

export async function getAffiliatedExamRegUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [AFFILIATED_COLLEGES_API.UNIVERSITY_APPROVAL, "getuniversitieapproval"],
    univUploadFileId,
  );
}

export async function getAffiliatedExamFeeUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [AFFILIATED_COLLEGES_API.UNIV_STG_EXAM_STD_FEE, "getunivstgexamstdfee"],
    univUploadFileId,
  );
}

export async function getAffiliatedExamMarksUploadDetails(
  univUploadFileId: number,
): Promise<AnyRow[]> {
  return listAffiliatedRowsByUploadFileId(
    [
      AFFILIATED_COLLEGES_API.UNIV_STG_EXAM_STD_FEE,
      "getunivstgexamstdmarks",
      "getunivstgexammarks",
    ],
    univUploadFileId,
  );
}

export type UnivUploadProcParams = {
  inFlag: string;
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId?: number;
  courseYearId?: number;
  regulationId?: number;
  comments?: string;
  univUploadfileId?: number;
  examId?: number;
  fromDate?: string;
  toDate?: string;
  studentId?: number;
  fkUnivCollegewisePaymentId?: number;
};

async function callUnivUploadStoredProc<T>(
  procPath: string,
  params: UnivUploadProcParams,
): Promise<T[][]> {
  const body: Record<string, string | number> = {
    in_flag: params.inFlag,
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId ?? 0,
    in_course_year_id: params.courseYearId ?? 0,
    in_regulation_id: params.regulationId ?? 0,
    in_comments: params.comments ?? "",
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
  };
  if (params.examId != null) body.in_exam_id = params.examId;
  if (params.fromDate != null) body.in_from_date = params.fromDate;
  if (params.toDate != null) body.in_to_date = params.toDate;
  if (params.studentId != null) body.in_student_id = params.studentId;
  if (params.fkUnivCollegewisePaymentId != null) {
    body.fk_univ_collegewise_payment_id = params.fkUnivCollegewisePaymentId;
  }

  const data = await getAllRecords<{ result: T[][] }>(procPath, body);
  return Array.isArray(data?.result) ? data.result : [];
}

function firstResultGroup<T>(groups: T[][]): T[] {
  const rows = groups[0];
  return Array.isArray(rows) ? rows : [];
}

/** Angular `verifyStaging` — `in_flag=verify`. */
export async function verifyAffiliatedStudentUpload(
  params: AffiliatedUploadSummaryParams & { univUploadfileId: number },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    "s_pop_univ_upload_std_bulk",
    {
      inFlag: "verify",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      univUploadfileId: params.univUploadfileId,
      comments: params.comments ?? "",
    },
  );
  return firstResultGroup(groups);
}

/** Angular `loadStaging` — `in_flag=submit_univ`. */
export async function submitAffiliatedStudentUpload(
  params: AffiliatedUploadSummaryParams & {
    univUploadfileId: number;
    comments: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    "s_pop_univ_upload_std_bulk",
    {
      inFlag: "submit_univ",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      univUploadfileId: params.univUploadfileId,
      comments: params.comments,
    },
  );
  return firstResultGroup(groups);
}

const SUBJECT_UPLOAD_PROC = "s_pop_univ_upload_std_subjects";

/** Angular `studentSubjectTemplateUrl` / `in_flag=template`. */
export async function getAffiliatedStudentSubjectsUploadTemplate(
  params: AffiliatedUploadSummaryParams,
): Promise<unknown[][]> {
  const data = await getAllRecords<unknown>(SUBJECT_UPLOAD_PROC, {
    in_flag: "template",
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId ?? 0,
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    in_comments: params.comments ?? "",
  });
  return normalizeUnivUploadTemplateResult(data);
}

export type AffiliatedStudentSubjectsImportMeta = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  regulationId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
};

/** Angular `studentSubjectsStagingUrl` — JSON `data` blob + Excel file. */
export async function importAffiliatedStudentSubjectsFile(
  file: File,
  meta: AffiliatedStudentSubjectsImportMeta,
): Promise<AnyRow[]> {
  const payload = {
    collegeId: meta.collegeId,
    academicYearId: meta.academicYearId,
    courseId: meta.courseId,
    courseGroupId: meta.courseGroupId,
    courseYearId: meta.courseYearId,
    fileTypeCatDetId: UNIV_BULK_UPLOAD_TYPES.SUBJECT,
    fileDescription: meta.fileDescription,
    fileUploadedByEmpId: meta.fileUploadedByEmpId,
    regulationId: meta.regulationId,
  };
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("file", file, file.name);
  const data = await postAffiliatedMultipart<{ insertedRecords?: AnyRow[] } | AnyRow[]>(
    STUDENT_API.STUDENT_SUBJECTS_STAGING,
    formData,
  );
  if (Array.isArray(data)) return data;
  const inserted = (data as { insertedRecords?: AnyRow[] })?.insertedRecords;
  return Array.isArray(inserted) ? inserted : [];
}

/** Angular `verifyStaging` on subject proc — `in_flag=verify`. */
export async function verifyAffiliatedStudentSubjectsUpload(
  params: AffiliatedUploadSummaryParams & { univUploadfileId: number },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(SUBJECT_UPLOAD_PROC, {
    inFlag: "verify",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: params.regulationId ?? 0,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments ?? "",
  });
  return firstResultGroup(groups);
}

/** Angular `loadStaging` on subject proc — `in_flag=submit_univ`. */
export async function submitAffiliatedStudentSubjectsUpload(
  params: AffiliatedUploadSummaryParams & {
    univUploadfileId: number;
    comments: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(SUBJECT_UPLOAD_PROC, {
    inFlag: "submit_univ",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: params.regulationId ?? 0,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments,
  });
  return firstResultGroup(groups);
}

const ATTENDANCE_UPLOAD_PROC = "s_pop_univ_upload_std_attendance";

/** Angular `unvStudentAttendenceUploadUrl` / `in_flag=summary`. */
export async function getAffiliatedAttendanceUploadSummary(
  params: AffiliatedUploadSummaryParams & {
    fromDate: string;
    toDate: string;
  },
): Promise<AffiliatedSummaryRow[]> {
  const groups = await callUnivUploadStoredProc<AffiliatedSummaryRow>(
    ATTENDANCE_UPLOAD_PROC,
    {
      inFlag: "summary",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: 0,
      fromDate: params.fromDate,
      toDate: params.toDate,
    },
  );
  return firstResultGroup(groups);
}

/** Angular attendance upload `in_flag=template`. */
export async function getAffiliatedStudentAttendanceUploadTemplate(
  params: AffiliatedUploadSummaryParams & {
    fromDate: string;
    toDate: string;
  },
): Promise<unknown[][]> {
  const data = await getAllRecords<unknown>(ATTENDANCE_UPLOAD_PROC, {
    in_flag: "template",
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: 0,
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    in_comments: params.comments ?? "",
    in_from_date: params.fromDate,
    in_to_date: params.toDate,
  });
  return normalizeUnivUploadTemplateResult(data);
}

export type AffiliatedStudentAttendanceImportMeta = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
  fromDate: string;
  toDate: string;
};

/** Angular `studentAttendenceStageingUrl` — JSON `data` blob + Excel file. */
export async function importAffiliatedStudentAttendanceFile(
  file: File,
  meta: AffiliatedStudentAttendanceImportMeta,
): Promise<AnyRow[]> {
  const payload = {
    collegeId: meta.collegeId,
    academicYearId: meta.academicYearId,
    courseId: meta.courseId,
    courseGroupId: meta.courseGroupId,
    courseYearId: meta.courseYearId,
    fileTypeCatDetId: UNIV_BULK_UPLOAD_TYPES.ATTENDANCE,
    fileDescription: meta.fileDescription,
    fileUploadedByEmpId: meta.fileUploadedByEmpId,
    fromDate: meta.fromDate,
    toDate: meta.toDate,
  };
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("file", file, file.name);
  const data = await postAffiliatedMultipart<{ insertedRecords?: AnyRow[] } | AnyRow[]>(
    AFFILIATED_COLLEGES_API.STUDENT_ATTENDENCE_STAGEING,
    formData,
  );
  if (Array.isArray(data)) return data;
  const inserted = (data as { insertedRecords?: AnyRow[] })?.insertedRecords;
  return Array.isArray(inserted) ? inserted : [];
}

/** Angular `verifyStaging` on attendance proc — `in_flag=verify`. */
export async function verifyAffiliatedStudentAttendanceUpload(
  params: AffiliatedUploadSummaryParams & {
    univUploadfileId: number;
    fromDate: string;
    toDate: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(ATTENDANCE_UPLOAD_PROC, {
    inFlag: "verify",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: 0,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments ?? "",
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  return firstResultGroup(groups);
}

/** Angular `loadStaging` on attendance proc — `in_flag=submit_univ`. */
export async function submitAffiliatedStudentAttendanceUpload(
  params: AffiliatedUploadSummaryParams & {
    univUploadfileId: number;
    comments: string;
    fromDate: string;
    toDate: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(ATTENDANCE_UPLOAD_PROC, {
    inFlag: "submit_univ",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: 0,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  return firstResultGroup(groups);
}

const EXAM_REGISTRATION_UPLOAD_PROC = "s_pop_univ_upload_std_exam_registration";

/** Angular `studentExamRegistrationUrl` / `in_flag=summary`. */
export async function getAffiliatedExamRegistrationSummary(
  params: AffiliatedUploadSummaryParams & { examId: number },
): Promise<AffiliatedSummaryRow[]> {
  const groups = await callUnivUploadStoredProc<AffiliatedSummaryRow>(
    EXAM_REGISTRATION_UPLOAD_PROC,
    {
      inFlag: "summary",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      examId: params.examId,
      studentId: 0,
      univUploadfileId: params.univUploadfileId ?? 0,
      comments: params.comments ?? "",
    },
  );
  return firstResultGroup(groups);
}

/** Angular exam registration upload `in_flag=template`. */
export async function getAffiliatedExamRegistrationUploadTemplate(
  params: AffiliatedUploadSummaryParams & { examId: number },
): Promise<unknown[][]> {
  const data = await getAllRecords<unknown>(EXAM_REGISTRATION_UPLOAD_PROC, {
    in_flag: "template",
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId ?? 0,
    in_exam_id: params.examId,
    in_student_id: 0,
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    in_comments: params.comments ?? "",
  });
  return normalizeUnivUploadTemplateResult(data);
}

export type AffiliatedExamRegistrationImportMeta = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
};

/** Angular `uploadUnivStgExamRegUrl` — JSON `data` blob + Excel file. */
export async function importAffiliatedExamRegistrationFile(
  file: File,
  meta: AffiliatedExamRegistrationImportMeta,
): Promise<AnyRow[]> {
  const payload = {
    collegeId: meta.collegeId,
    academicYearId: meta.academicYearId,
    courseId: meta.courseId,
    courseGroupId: meta.courseGroupId,
    courseYearId: meta.courseYearId,
    examId: meta.examId,
    fileTypeCatDetId: UNIV_BULK_UPLOAD_TYPES.EXAM_REGISTRATION,
    fileDescription: meta.fileDescription,
    fileUploadedByEmpId: meta.fileUploadedByEmpId,
  };
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("file", file, file.name);
  const res = await fetch(
    NEXT_API.PROXY(AFFILIATED_COLLEGES_API.UPLOAD_UNIV_STG_EXAM_REG),
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw parseApiError(res, errBody);
  }
  const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  if (!body?.success) {
    throw new AppError("API_ERROR", body?.message ?? "Upload failed");
  }
  // Angular: result.data.insertedRecords — also accept top-level / nested shapes
  const rows = extractInsertedRecords(body);
  if (rows.length > 0) return rows;
  return extractInsertedRecords(body.data);
}

/** Angular `verifyStaging` on exam registration proc — `in_flag=verify`. */
export async function verifyAffiliatedExamRegistrationUpload(
  params: AffiliatedUploadSummaryParams & {
    examId: number;
    univUploadfileId: number;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    EXAM_REGISTRATION_UPLOAD_PROC,
    {
      inFlag: "verify",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      examId: params.examId,
      studentId: 0,
      univUploadfileId: params.univUploadfileId,
      comments: params.comments ?? "",
    },
  );
  return firstResultGroup(groups);
}

/** Angular `loadStaging` on exam registration proc — `in_flag=submit_univ`. */
export async function submitAffiliatedExamRegistrationUpload(
  params: AffiliatedUploadSummaryParams & {
    examId: number;
    univUploadfileId: number;
    comments: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    EXAM_REGISTRATION_UPLOAD_PROC,
    {
      inFlag: "submit_univ",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      examId: params.examId,
      studentId: 0,
      univUploadfileId: params.univUploadfileId,
      comments: params.comments,
    },
  );
  return firstResultGroup(groups);
}

const EXAM_MARKS_UPLOAD_PROC = "s_pop_univ_upload_std_exam_marks";

/** Angular `studentExamMarksTemplateUrl` / `in_flag=summary`. */
export async function getAffiliatedExamMarksSummary(
  params: AffiliatedUploadSummaryParams & { examId: number },
): Promise<AffiliatedSummaryRow[]> {
  const groups = await callUnivUploadStoredProc<AffiliatedSummaryRow>(
    EXAM_MARKS_UPLOAD_PROC,
    {
      inFlag: "summary",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: params.courseGroupId,
      courseYearId: params.courseYearId,
      regulationId: params.regulationId ?? 0,
      examId: params.examId,
      univUploadfileId: params.univUploadfileId ?? 0,
      comments: params.comments ?? "",
    },
  );
  return firstResultGroup(groups);
}

/** Angular exam marks upload `in_flag=template`. */
export async function getAffiliatedExamMarksUploadTemplate(
  params: AffiliatedUploadSummaryParams & { examId: number },
): Promise<unknown[][]> {
  const data = await getAllRecords<unknown>(EXAM_MARKS_UPLOAD_PROC, {
    in_flag: "template",
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_regulation_id: params.regulationId ?? 0,
    in_univ_uploadfile_id: params.univUploadfileId ?? 0,
    in_comments: params.comments ?? "",
  });
  return normalizeUnivUploadTemplateResult(data);
}

export type AffiliatedExamMarksImportMeta = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  examId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
};

/** Angular `uploadStudentMarksUrl` — JSON `data` blob + Excel file. */
export async function importAffiliatedExamMarksFile(
  file: File,
  meta: AffiliatedExamMarksImportMeta,
): Promise<AnyRow[]> {
  const payload = {
    collegeId: meta.collegeId,
    academicYearId: meta.academicYearId,
    courseId: meta.courseId,
    examId: meta.examId,
    courseGroupId: meta.courseGroupId,
    courseYearId: meta.courseYearId,
    fileTypeCatDetId: UNIV_BULK_UPLOAD_TYPES.EXAM_MARKS,
    fileDescription: meta.fileDescription,
    fileUploadedByEmpId: meta.fileUploadedByEmpId,
  };
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("file", file, file.name);
  const res = await fetch(
    NEXT_API.PROXY(AFFILIATED_COLLEGES_API.UPLOAD_STUDENT_MARKS),
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw parseApiError(res, errBody);
  }
  const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
  if (!body?.success) {
    throw new AppError("API_ERROR", body?.message ?? "Upload failed");
  }
  const rows = extractInsertedRecords(body);
  if (rows.length > 0) return rows;
  return extractInsertedRecords(body.data);
}

/** Angular `verifyStaging` on exam marks proc — `in_flag=verify`. */
export async function verifyAffiliatedExamMarksUpload(
  params: AffiliatedUploadSummaryParams & {
    examId: number;
    univUploadfileId: number;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(EXAM_MARKS_UPLOAD_PROC, {
    inFlag: "verify",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: params.regulationId ?? 0,
    examId: params.examId,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments ?? "",
  });
  return firstResultGroup(groups);
}

/** Angular `loadStaging` on exam marks proc — `in_flag=submit_univ`. */
export async function submitAffiliatedExamMarksUpload(
  params: AffiliatedUploadSummaryParams & {
    examId: number;
    univUploadfileId: number;
    comments: string;
  },
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(EXAM_MARKS_UPLOAD_PROC, {
    inFlag: "submit_univ",
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
    regulationId: params.regulationId ?? 0,
    examId: params.examId,
    univUploadfileId: params.univUploadfileId,
    comments: params.comments,
  });
  return firstResultGroup(groups);
}

/** Angular college-uploads-approval `getDeatils` — `s_get_univ_uploads_approval` / `summary`. */
export async function getCollegeUploadsApprovalSummary(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
}): Promise<AffiliatedSummaryRow[]> {
  const groups = await callUnivUploadStoredProc<AffiliatedSummaryRow>(
    "s_get_univ_uploads_approval",
    {
      inFlag: "summary",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: params.courseId,
      courseGroupId: 0,
      courseYearId: 0,
    },
  );
  return firstResultGroup(groups);
}

/** Angular view pages — `submitted_detail_list` on type-specific stored procs. */
export async function getCollegeUploadApprovalDetails(
  procPath: string,
  params: UnivUploadProcParams,
): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(procPath, {
    ...params,
    inFlag: "submitted_detail_list",
  });
  return firstResultGroup(groups);
}

/** Angular `loadStaging` — approve / load committed data. */
export async function loadCollegeUploadApproval(
  procPath: string,
  params: UnivUploadProcParams,
): Promise<unknown> {
  const groups = await callUnivUploadStoredProc<AnyRow>(procPath, {
    ...params,
    inFlag: "load",
  });
  return firstResultGroup(groups);
}

/** Angular `rejectStageing` — always uses `s_get_univ_uploads_approval` / `denied`. */
export async function rejectCollegeUploadApproval(
  params: UnivUploadProcParams,
): Promise<unknown> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    "s_get_univ_uploads_approval",
    {
      ...params,
      inFlag: "denied",
    },
  );
  return firstResultGroup(groups);
}

/** Angular `loadStaging` — `in_flag=load` on dost proc. */
export async function loadAffiliatedDostUpload(params: {
  collegeId: number;
  academicYearId: number;
  univUploadfileId: number;
}): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    "s_pop_univ_upload_dost_std_bulk",
    {
      inFlag: "load",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      univUploadfileId: params.univUploadfileId,
    },
  );
  return firstResultGroup(groups);
}

export type AffiliatedDostImportMeta = {
  collegeId: number;
  academicYearId: number;
  fileDescription: string;
  fileUploadedByEmpId: number;
};

/** Angular `importStdDostDetailsUrl` — JSON `data` blob + file (affiliated college flow). */
export async function importAffiliatedDostFile(
  file: File,
  meta: AffiliatedDostImportMeta,
): Promise<AnyRow[]> {
  const payload = {
    collegeId: meta.collegeId,
    academicYearId: meta.academicYearId,
    fileTypeCatDetId: UNIV_BULK_UPLOAD_TYPES.DOST,
    fileDescription: meta.fileDescription,
    fileUploadedByEmpId: meta.fileUploadedByEmpId,
  };
  const formData = new FormData();
  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("file", file, file.name);
  const data = await postAffiliatedMultipart<AnyRow[]>(
    STUDENT_API.IMPORT_STD_DOST_DETAILS,
    formData,
  );
  return Array.isArray(data) ? data : [];
}

/** Angular `verifyStaging` — `in_flag=verify` on dost proc. */
export async function verifyAffiliatedDostUpload(params: {
  collegeId: number;
  academicYearId: number;
  univUploadfileId: number;
}): Promise<AnyRow[]> {
  const groups = await callUnivUploadStoredProc<AnyRow>(
    "s_pop_univ_upload_dost_std_bulk",
    {
      inFlag: "verify",
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      courseId: 0,
      courseGroupId: 0,
      courseYearId: 0,
      univUploadfileId: params.univUploadfileId,
    },
  );
  return firstResultGroup(groups);
}

/** Angular `getStdAdditionalDetailsSummaryUrl` — signature/photo summaries. */
export type AffiliatedAdditionalDetailsFlag =
  | "std_signature"
  | "std_photo_path";

export async function getAffiliatedStdAdditionalDetailsSummary(params: {
  flag: AffiliatedAdditionalDetailsFlag;
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AffiliatedSummaryRow[]> {
  // Angular surfaces `result.message` (e.g. "No Records(s) found.") as info toast
  // when success:false — do not throw for empty-result responses.
  const envelope = await getAllRecordsEnvelope<{
    result?: AffiliatedSummaryRow[][];
  }>("s_get_std_additional_details_summary", {
    in_flag: params.flag,
    in_college_id: params.collegeId,
    in_academic_year_id: params.academicYearId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_exam_id: 0,
  });

  const rows = envelope.data?.result?.[0];
  if (Array.isArray(rows) && rows.length > 0) return rows;

  const msg = (envelope.message ?? "").trim();
  if (!envelope.success || /no record/i.test(msg)) {
    return [];
  }
  if (msg) {
    throw new AppError("API_ERROR", msg, envelope);
  }
  return [];
}

/** Angular signature-bulk-upload — Organization list (`isActive=true`). */
export async function listAffiliatedOrganizationsForUpload(): Promise<
  { orgCode: string; orgName?: string; organizationId?: number }[]
> {
  const rows = await domainList<{
    orgCode?: string;
    orgName?: string;
    organizationId?: number;
  }>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }));
  return (Array.isArray(rows) ? rows : []).filter(
    (r) => r.orgCode != null && String(r.orgCode).trim() !== "",
  ) as { orgCode: string; orgName?: string; organizationId?: number }[];
}

export type AffiliatedMediaVerifyRow = {
  fileName: string;
  status: string;
  message: string;
};

export type AffiliatedMediaUploadRow = {
  fileName: string;
  status?: string;
  message?: string;
  studentSignaturePath?: string;
};

async function postAffiliatedMediaFormData<T>(
  path: string,
  formData: FormData,
): Promise<{ message: string; data: T }> {
  const res = await fetch(NEXT_API.PROXY(path), {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) return { message: "Success", data: null as T };
  if (!body.success) {
    throw new AppError("API_ERROR", body.message ?? "Request failed", body);
  }
  return { message: body.message ?? "Success", data: body.data as T };
}

/** Angular `validateStudentSignatureUrl`. */
export async function validateAffiliatedStudentSignatures(
  formData: FormData,
): Promise<AffiliatedMediaVerifyRow[]> {
  const { data } = await postAffiliatedMediaFormData<
    AffiliatedMediaVerifyRow[] | { result?: AffiliatedMediaVerifyRow[] }
  >(STUDENT_API.VALIDATE_STUDENT_SIGNATURE, formData);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { result?: unknown }).result)) {
    return (data as { result: AffiliatedMediaVerifyRow[] }).result;
  }
  return [];
}

/** Angular `bulkUploadStudentSignaturesUrl` — returns `uploadedSuccess`. */
export async function bulkUploadAffiliatedStudentSignatures(
  formData: FormData,
): Promise<{ message: string; files: AffiliatedMediaUploadRow[] }> {
  const { message, data } = await postAffiliatedMediaFormData<
    | AffiliatedMediaUploadRow[]
    | { uploadedSuccess?: AffiliatedMediaUploadRow[]; additionalDetails?: unknown }
  >(STUDENT_API.BULK_UPLOAD_STUDENT_SIGNATURES, formData);
  if (Array.isArray(data)) return { message, files: data };
  const uploaded = (data as { uploadedSuccess?: AffiliatedMediaUploadRow[] })
    ?.uploadedSuccess;
  return { message, files: Array.isArray(uploaded) ? uploaded : [] };
}

/** Angular `uploadPhotosAndSignaturesUrl` — direct upload (no verify). */
export async function uploadAffiliatedPhotosAndSignatures(
  formData: FormData,
): Promise<{ message: string; files: AffiliatedMediaUploadRow[] }> {
  const { message, data } = await postAffiliatedMediaFormData<
    | AffiliatedMediaUploadRow[]
    | { uploadedSuccess?: AffiliatedMediaUploadRow[] }
  >(STUDENT_API.UPLOAD_PHOTOS_AND_SIGNATURES, formData);
  if (Array.isArray(data)) return { message, files: data };
  const uploaded = (data as { uploadedSuccess?: AffiliatedMediaUploadRow[] })
    ?.uploadedSuccess;
  return { message, files: Array.isArray(uploaded) ? uploaded : [] };
}

export { UNIV_BULK_UPLOAD_TYPES };
