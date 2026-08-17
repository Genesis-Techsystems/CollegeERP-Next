import { format } from "date-fns";
import {
  ASSIGNMENT_API,
  EMPLOYEE_API,
  ENTITIES,
  GM_CODES,
} from "@/config/constants";
import {
  buildQuery,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  uploadFile,
} from "@/services/crud";
import { listGeneralDetailsByCode } from "@/services/student-information";
import type { StaffSubjectClass } from "@/services/staff-dashboard";
import { getStaffSubjectsForToday } from "@/services/staff-dashboard";

type AnyRow = Record<string, unknown>;

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as AnyRow;
    if (Array.isArray(o.resultList)) return o.resultList as T[];
    if (Array.isArray(o.content)) return o.content as T[];
  }
  return [];
}

function normalizeEmployeeSearch(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const o = data as AnyRow;
    if (Array.isArray(o.resultList)) return o.resultList as AnyRow[];
  }
  return [];
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatClassDateYmdSlash(d = new Date()): string {
  return format(d, "yyyy/MM/dd");
}

function formatPayloadDateYmd(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return format(value, "yyyy-MM-dd");
  const s = String(value).trim();
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return s.slice(0, 10);
}

function stripCmsPath(value: unknown): unknown {
  if (value == null || typeof value !== "string") return value;
  const parts = value.split("cms/");
  return parts.length > 1 ? parts[1] : value;
}

function uniqByCourseYearId(rows: StaffSubjectClass[]): StaffSubjectClass[] {
  const seen = new Set<number>();
  const out: StaffSubjectClass[] = [];
  for (const row of rows) {
    const id = Number(row.courseYearId ?? 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function dedupeMyClasses(rows: StaffSubjectClass[]): StaffSubjectClass[] {
  const out: StaffSubjectClass[] = [];
  for (const row of rows) {
    const exists = out.some(
      (x) =>
        x.collegeId === row.collegeId &&
        x.academicYearId === row.academicYearId &&
        x.courseId === row.courseId &&
        x.courseGroupId === row.courseGroupId &&
        x.groupSectionId === row.groupSectionId,
    );
    if (!exists) out.push(row);
  }
  return out;
}

function sortAssignmentsByDueDateDesc(rows: AnyRow[]): AnyRow[] {
  return [...rows].sort((a, b) => {
    const da = new Date(String(a.submissionDueDate ?? 0)).getTime();
    const db = new Date(String(b.submissionDueDate ?? 0)).getTime();
    return db - da;
  });
}

function sortSubmissionsBySubmittedOnAsc(rows: AnyRow[]): AnyRow[] {
  return [...rows].sort((a, b) => {
    const da = new Date(String(a.assignmentSubmittedOn ?? 0)).getTime();
    const db = new Date(String(b.assignmentSubmittedOn ?? 0)).getTime();
    return da - db;
  });
}

/** Angular `staffSubjects?employeeId=&status=true&classDate=YYYY/MM/DD` — uniq by courseYearId for list filter. */
export async function loadAssignmentCourseYearOptions(params: {
  employeeId: number;
  classDate?: string;
}): Promise<StaffSubjectClass[]> {
  const rows = await getStaffSubjectsForToday({
    employeeId: params.employeeId,
    classDate: params.classDate ?? formatClassDateYmdSlash(),
  });
  return uniqByCourseYearId(rows);
}

/** Angular modal `getCourses` / `getCoursesByCurrentDate`. */
export async function loadStaffSubjectsForAssignmentDate(params: {
  employeeId: number;
  classDate: string;
}): Promise<StaffSubjectClass[]> {
  return getStaffSubjectsForToday({
    employeeId: params.employeeId,
    classDate: params.classDate,
  });
}

export function buildAssignmentMyClasses(
  rows: StaffSubjectClass[],
): StaffSubjectClass[] {
  return dedupeMyClasses(rows);
}

export function subjectsForGroupSection(
  rows: StaffSubjectClass[],
  groupSectionId: number,
): StaffSubjectClass[] {
  return rows.filter((x) => Number(x.groupSectionId) === groupSectionId);
}

/**
 * Angular `subjectunittopic?collegeId=&academicYearId=&subjectId=&courseyearId=&status=true`
 */
export async function listSubjectUnitTopicsForAssignment(params: {
  collegeId: number;
  academicYearId: number;
  subjectId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  const { collegeId, academicYearId, subjectId, courseYearId } = params;
  if (!collegeId || !academicYearId || !subjectId || !courseYearId) return [];
  try {
    const data = await fetchDetails<unknown>("subjectunittopic", {
      collegeId,
      academicYearId,
      subjectId,
      courseyearId: courseYearId,
      status: "true",
    });
    return asArray<AnyRow>(data);
  } catch {
    return [];
  }
}

export async function listAssignmentTypes(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.ASSIGN_TYPE) as Promise<AnyRow[]>;
}

export async function listAssignmentStatuses(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.ASSIGN_STATUS) as Promise<AnyRow[]>;
}

/**
 * Angular `employeesearch?deptId=&q=&empStatus=ACTV` (keyup, min 5 chars).
 */
export async function searchDeptEmployeesForAssignments(
  deptId: number,
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length < 5 || !deptId) return [];
  const paths = [EMPLOYEE_API.EMPLOYEE_SEARCH, "employeesearch"] as const;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, {
        deptId,
        q,
        empStatus: "ACTV",
      });
      return normalizeEmployeeSearch(data);
    } catch {
      // try next path
    }
  }
  return [];
}

/** Angular `employeesearch?deptId=&q=` for query-param restore. */
export async function searchDeptEmployeesByQuery(
  deptId: number,
  q: string,
): Promise<AnyRow[]> {
  if (!deptId || !q.trim()) return [];
  const paths = [EMPLOYEE_API.EMPLOYEE_SEARCH, "employeesearch"] as const;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, { deptId, q });
      return normalizeEmployeeSearch(data);
    } catch {
      // try next path
    }
  }
  return [];
}

/**
 * Angular `listDetailsByTwoIds(Assignment, empId, true, empDetail.employeeId, isActive)`.
 */
export async function listStaffAssignments(params: {
  employeeId: number;
  groupSectionId?: number;
}): Promise<AnyRow[]> {
  const employeeId = positiveId(params.employeeId);
  if (!employeeId) return [];

  const filters: Record<string, unknown> = {
    "empDetail.employeeId": employeeId,
    isActive: true,
  };
  const sectionId = positiveId(params.groupSectionId);
  if (sectionId > 0) {
    filters["GroupSection.groupSectionId"] = sectionId;
  }

  const query = buildQuery(filters);
  const rows = await domainList<AnyRow>(ASSIGNMENT_API.ASSIGNMENT, query);
  return sortAssignmentsByDueDateDesc(Array.isArray(rows) ? rows : []);
}

/**
 * Angular `listDetailsByTwoIds(StudentAssignment, assignmentId, true, assignment.assignmentId, isActive)`.
 */
export async function listStudentAssignmentsForStaff(params: {
  assignmentId: number;
}): Promise<AnyRow[]> {
  const assignmentId = positiveId(params.assignmentId);
  if (!assignmentId) return [];
  const query = buildQuery({
    "assignment.assignmentId": assignmentId,
    isActive: true,
  });
  const rows = await domainList<AnyRow>(
    ASSIGNMENT_API.STUDENT_ASSIGNMENT,
    query,
  );
  return sortSubmissionsBySubmittedOnAsc(Array.isArray(rows) ? rows : []);
}

export async function listAssignmentReviewWorkflowStages(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  const query = buildQuery({
    isActive: true,
    wfForCode: GM_CODES.ASSIGN_STATUS_WF,
    "College.collegeId": collegeId,
  });
  const stages = await domainList<AnyRow>(ENTITIES.WORKFLOW_STAGE.name, query);
  return (Array.isArray(stages) ? stages : []).filter((s) => {
    const code = String(s.wfCode ?? "");
    return code === "Review" || code === "Completed" || code === "Reopen";
  });
}

export type AssignmentSavePayload = AnyRow & {
  assignmentDoc1?: File | null;
  assignmentDoc2?: File | null;
};

function buildAssignmentBody(
  form: AnyRow,
  staffRows: StaffSubjectClass[],
): AnyRow {
  const groupSectionId = positiveId(form.groupSectionId);
  const subjectId = positiveId(form.subjectId);
  const match =
    staffRows.find(
      (x) =>
        Number(x.groupSectionId) === groupSectionId &&
        Number(x.subjectId) === subjectId,
    ) ?? staffRows[0];

  const allowLate = form.allowLateSubmission === true;
  const submissionDue = formatPayloadDateYmd(form.submissionDueDate);

  const body: AnyRow = {
    groupSectionId,
    subjectId,
    subjectUnitTopicId: positiveId(form.subjectUnitTopicId) || null,
    assignTypeCatId: positiveId(form.assignTypeCatId) || null,
    assignmentStatusCatId: positiveId(form.assignmentStatusCatId),
    allowLateDueDate: allowLate
      ? formatPayloadDateYmd(form.allowLateDueDate)
      : submissionDue,
    title: String(form.title ?? "").trim(),
    description: form.description ?? null,
    assignmentStartDate: formatPayloadDateYmd(form.assignmentStartDate),
    submissionDueDate: submissionDue,
    isActive: form.isActive !== false,
    allowLateSubmission: allowLate,
    reason: form.reason ?? (form.isActive !== false ? "active" : null),
    collegeId: match?.collegeId ?? null,
    academicYearId: match?.academicYearId ?? null,
    courseGroupId: match?.courseGroupId ?? null,
    employeeId: match?.employeeId ?? null,
    subjectTypeCode: match?.subjectType ?? match?.subjectTypeCode ?? null,
  };

  if (form.assgnmentDocPath != null) {
    body.assgnmentDocPath = stripCmsPath(form.assgnmentDocPath);
  }
  if (form.assignmentDocPath1 != null) {
    body.assignmentDocPath1 = stripCmsPath(form.assignmentDocPath1);
  }

  return body;
}

function extractCreatedAssignmentId(data: unknown): string {
  if (data == null || data === "") return "";
  if (typeof data === "string" || typeof data === "number") return String(data);
  if (typeof data === "object") {
    const o = data as AnyRow;
    const id = o.assignmentId ?? o.data ?? o.id;
    if (id != null && id !== "") return String(id);
  }
  return "";
}

async function uploadAssignmentDocuments(
  assignmentId: string | number,
  doc1?: File | null,
  doc2?: File | null,
): Promise<void> {
  if (!assignmentId || (!doc1 && !doc2)) return;
  const formData = new FormData();
  formData.append("assignmentId", String(assignmentId));
  if (doc1) formData.append("assignmentDoc1", doc1, doc1.name);
  if (doc2) formData.append("assignmentDoc2", doc2, doc2.name);
  await uploadFile(ASSIGNMENT_API.UPLOAD, formData);
}

/** Angular `add(assignmentUrl, details)` then optional `assignmentupload`. */
export async function createStaffAssignment(params: {
  form: AnyRow;
  staffRows: StaffSubjectClass[];
  assignmentDoc1?: File | null;
  assignmentDoc2?: File | null;
}): Promise<void> {
  const body = buildAssignmentBody(params.form, params.staffRows);
  const created = await postDetails<unknown>(
    ASSIGNMENT_API.ASSIGNMENT_POST,
    body,
  );
  const assignmentId = extractCreatedAssignmentId(created);
  if (assignmentId) {
    await uploadAssignmentDocuments(
      assignmentId,
      params.assignmentDoc1,
      params.assignmentDoc2,
    );
  }
}

/** Angular `updateDetails(assignmentCrudUrl, details, assignmentId, assignmentId)`. */
export async function updateStaffAssignment(params: {
  form: AnyRow;
  staffRows: StaffSubjectClass[];
  assignmentId: number;
  assignmentDoc1?: File | null;
  assignmentDoc2?: File | null;
}): Promise<void> {
  const body = buildAssignmentBody(params.form, params.staffRows);
  body.assignmentId = params.assignmentId;
  await domainUpdate(
    ASSIGNMENT_API.ASSIGNMENT,
    "assignmentId",
    params.assignmentId,
    body,
  );
  await uploadAssignmentDocuments(
    params.assignmentId,
    params.assignmentDoc1,
    params.assignmentDoc2,
  );
}

/**
 * Angular staff-assignment-report `selectedEmployee` —
 * `staffSubjects?collegeId=&academicYearId=&employeeId=` (no classDate).
 */
export async function listStaffSubjectsForAssignmentReport(params: {
  collegeId: number;
  academicYearId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  const collegeId = positiveId(params.collegeId);
  const academicYearId = positiveId(params.academicYearId);
  const employeeId = positiveId(params.employeeId);
  if (!collegeId || !academicYearId || !employeeId) return [];
  try {
    const data = await fetchDetails<unknown>(EMPLOYEE_API.STAFF_SUBJECTS, {
      collegeId,
      academicYearId,
      employeeId,
    });
    return asArray<AnyRow>(data);
  } catch {
    return [];
  }
}

/**
 * Angular staff-assignment-report `getClassDiary` —
 * `getAllRecords/s_get_assignment_details?in_flag=&in_emp_id=&in_subject_id=`.
 * Returns `result[0]` rows (dynamic columns including `Submission_File`).
 */
export async function getStaffAssignmentReportDetails(params: {
  employeeId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  const employeeId = positiveId(params.employeeId);
  const subjectId = positiveId(params.subjectId);
  if (!employeeId || !subjectId) return [];
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      ASSIGNMENT_API.GET_DETAILS.replace(/^getAllRecords\//, ""),
      {
        in_flag: "",
        in_emp_id: employeeId,
        in_subject_id: subjectId,
      },
    );
    const raw = data?.result;
    if (!Array.isArray(raw)) return [];
    const first = raw[0];
    if (Array.isArray(first)) {
      return first.filter((r): r is AnyRow => !!r && typeof r === "object");
    }
    if (first && typeof first === "object") return [first as AnyRow];
    return [];
  } catch (error: unknown) {
    const msg = String(error instanceof Error ? error.message : (error ?? ""));
    if (msg.toLowerCase().includes("no record")) return [];
    throw error;
  }
}

/** Angular review save → `add(studentAssignmentUrl, studentAssignment)`. */
export async function saveStudentAssignmentReview(
  details: AnyRow,
): Promise<void> {
  const assignmentDetails =
    details.assignmentDetails && typeof details.assignmentDetails === "object"
      ? (details.assignmentDetails as AnyRow)
      : {};

  const payload: AnyRow = {
    studentAssignmentId: details.studentAssignmentId,
    assignmentSubmittedOn: details.assignmentSubmittedOn,
    isActive: details.isActive ?? true,
    statusUpdatedOn: details.statusUpdatedOn,
    studentDescription: details.studentDescription,
    studentSummary: details.studentSummary,
    isReviewCompleted: details.isReviewCompleted,
    marksSecured: details.marksSecured,
    reason: details.reason,
    reviewComments: details.reviewComments,
    statusComments: details.statusComments,
    submssionFile: stripCmsPath(details.submssionFile),
    assignmentId: positiveId(
      assignmentDetails.assignmentId,
      details.assignmentId,
    ),
    collegeId: details.collegeId,
    workflowStageId: details.workflowStageId,
    studentId: details.studentId,
  };

  await postDetails(ASSIGNMENT_API.STUDENT_ASSIGNMENT_POST, payload);
}
