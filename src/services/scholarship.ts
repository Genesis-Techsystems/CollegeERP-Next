import { ENTITIES } from "@/config/constants/entities";
import type { Batch } from "@/types/batch";
import { NEXT_API, SCHOLARSHIP_API } from "@/config/constants/api";
import type { ApiResponse } from "@/types/api";
import type {
  AssignScholarshipStudent,
  FeeSchStructurePayload,
  FeeSchStructureRow,
  ScholarshipTypeAndValue,
  ScholarshipValuePayload,
  ScholarshipValueRow,
  SchAccountsPreceeding,
  SchPreceeding,
  SchPreceedingPayload,
  SchStdPreceeding,
  ScholarshipApplication,
  ScholarshipApplicationPayload,
  ScholarshipType,
  ScholarshipTypePayload,
  UpdateStdStudentScholarshipPayload,
} from "@/types/scholarship";
import { AppError, parseApiError } from "@/lib/errors";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainSoftDelete,
  domainUpdate,
  fetchDetails,
  postDetails,
  putDetails,
} from "./crud";
import { listAcademicYearsByUniversity } from "./pre-examination";
import { listActiveCollegesForGeneralSettings } from "./admin/college";
import {
  getFeeMasterCollegeFilters,
  type FeeMasterCollegeFilters,
} from "./fee-masters";

type AnyRow = Record<string, unknown>;

function num(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function str(...values: unknown[]): string {
  for (const value of values) {
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function normalizeFeeSchStructure(row: FeeSchStructureRow): FeeSchStructureRow {
  const r = row as AnyRow;
  const college = r.College as AnyRow | undefined;
  const course = r.Course as AnyRow | undefined;
  const batch = r.Batch as AnyRow | undefined;
  const academicYear = r.AcademicYear as AnyRow | undefined;
  const scholarshipType = r.ScholarshipType as AnyRow | undefined;

  const collegeId = num(
    row.collegeId,
    r.collegeId,
    college?.collegeId,
    r["College.collegeId"],
  );
  const courseId = num(
    row.courseId,
    r.courseId,
    course?.courseId,
    r["Course.courseId"],
  );
  const batchId = num(
    row.batchId,
    r.batchId,
    batch?.batchId,
    r["Batch.batchId"],
  );
  const academicYearId = num(
    row.academicYearId,
    r.academicYearId,
    academicYear?.academicYearId,
    r["AcademicYear.academicYearId"],
  );
  const scholarshipTypeId = num(
    row.scholarshipTypeId,
    r.scholarshipTypeId,
    scholarshipType?.scholarshipTypeId,
    r["ScholarshipType.scholarshipTypeId"],
  );

  return {
    ...row,
    feeSchStructureId: num(row.feeSchStructureId, r.feeSchStructureId),
    collegeId: collegeId || undefined,
    courseId: courseId || undefined,
    batchId: batchId || undefined,
    academicYearId: academicYearId || undefined,
    universityId:
      num(row.universityId, r.universityId, college?.universityId) || undefined,
    scholarshipTypeId: scholarshipTypeId || undefined,
    scholarshipType: str(
      row.scholarshipType,
      scholarshipType?.scholarshipTypeCode,
      r.scholarshipTypeCode,
    ),
    scholarshipTypeDesc: str(
      row.scholarshipTypeDesc,
      scholarshipType?.scholarshipTypeDesc,
      r.scholarshipTypeDescription,
    ),
    scholarshipAmount: Number(
      row.scholarshipAmount ?? r.scholarshipAmount ?? 0,
    ),
    isForLateral: Boolean(row.isForLateral ?? r.isForLateral),
  };
}

function normalizeScholarshipValue(
  row: ScholarshipValueRow,
): ScholarshipValueRow {
  const r = row as AnyRow;
  const category = r.FeeCategory as AnyRow | undefined;
  const particular = r.FeeParticular as AnyRow | undefined;
  const courseYear = r.CourseYear as AnyRow | undefined;

  const courseYearId = num(
    row.courseYearId,
    r.courseYearId,
    r.fk_course_year_id,
    r.courseyearId,
    courseYear?.courseYearId,
    courseYear?.fk_course_year_id,
    r["CourseYear.courseYearId"],
  );
  const yearNo = Number(
    row.yearNo ?? r.yearNo ?? courseYear?.yearNo ?? r["CourseYear.yearNo"] ?? 0,
  );

  return {
    ...row,
    scholarshipValueId: num(row.scholarshipValueId, r.scholarshipValueId),
    feeSchStructureId: num(
      row.feeSchStructureId,
      r.feeSchStructureId,
      r["FeeSchStructure.feeSchStructureId"],
    ),
    feeCategoryId: num(
      row.feeCategoryId,
      r.feeCategoryId,
      category?.feeCategoryId,
      r["FeeCategory.feeCategoryId"],
    ),
    feeParticularsId: num(
      row.feeParticularsId,
      r.feeParticularsId,
      particular?.feeParticularsId,
      r["FeeParticular.feeParticularsId"],
    ),
    courseYearId: courseYearId || undefined,
    yearNo: yearNo || undefined,
    scholarshipAmount: Number(
      row.scholarshipAmount ??
        row.feeAmount ??
        r.scholarshipAmount ??
        r.feeAmount ??
        0,
    ),
    feeAmount: Number(
      row.feeAmount ??
        row.scholarshipAmount ??
        r.feeAmount ??
        r.scholarshipAmount ??
        0,
    ),
    categoryName: str(
      row.categoryName,
      category?.categoryName,
      category?.categoryCode,
    ),
    particularName: str(
      row.particularName,
      row.particularsName,
      particular?.particularsName,
    ),
    particularsName: str(row.particularsName, particular?.particularsName),
  };
}

export type PaginatedSchPreceedings = {
  rows: SchPreceeding[];
  totalCount: number;
  page: number;
  pageSize: number;
};

async function proxyGet<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<
  ApiResponse<T> & { totalCount?: number; page?: number; pageSize?: number }
> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  const res = await fetch(`${NEXT_API.PROXY(path)}?${query}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  return res.json();
}

// ── Scholarship Type ──────────────────────────────────────────────────────────

export async function listScholarshipTypes(): Promise<ScholarshipType[]> {
  return domainList<ScholarshipType>(
    ENTITIES.SCHOLARSHIP_TYPE.name,
    buildQuery({}, { field: "sortOrder", direction: "ASC" }),
  );
}

export async function createScholarshipType(
  data: ScholarshipTypePayload,
): Promise<ScholarshipType> {
  return domainCreate<ScholarshipType>(ENTITIES.SCHOLARSHIP_TYPE.name, data);
}

export async function updateScholarshipType(
  scholarshipTypeId: number,
  data: Partial<ScholarshipTypePayload>,
): Promise<ScholarshipType> {
  return domainUpdate<ScholarshipType>(
    ENTITIES.SCHOLARSHIP_TYPE.name,
    ENTITIES.SCHOLARSHIP_TYPE.pk,
    scholarshipTypeId,
    data,
  );
}

// ── Scholarship Application ─────────────────────────────────────────────────────

export async function listScholarshipApplications(
  collegeId: number,
  academicYearId: number,
): Promise<ScholarshipApplication[]> {
  if (!collegeId || !academicYearId) return [];
  return domainList<ScholarshipApplication>(
    ENTITIES.SCH_STD_APPLICATION.name,
    buildQuery(
      {
        "College.collegeId": collegeId,
        "AcademicYear.academicYearId": academicYearId,
      },
      { field: "createdDt", direction: "DESC" },
    ),
  );
}

/** Angular `crudService.add(scholarShipAppCrudUrl, scholarShipDetails)` — body is an array. */
export async function createScholarshipApplication(
  data: ScholarshipApplicationPayload | ScholarshipApplicationPayload[],
): Promise<unknown> {
  const body = Array.isArray(data) ? data : [data];
  return postDetails(SCHOLARSHIP_API.SCHOLARSHIP_APP, body);
}

export async function updateScholarshipApplication(
  schStdApplicationId: number,
  data: Partial<ScholarshipApplicationPayload>,
): Promise<ScholarshipApplication> {
  return domainUpdate<ScholarshipApplication>(
    ENTITIES.SCH_STD_APPLICATION.name,
    ENTITIES.SCH_STD_APPLICATION.pk,
    schStdApplicationId,
    data,
  );
}

// ── Proceedings ─────────────────────────────────────────────────────────────────

export async function listSchPreceedings(params: {
  collegeId: number;
  academicYearId: number;
  financialYearId: number;
  page?: number;
  size?: number;
}): Promise<PaginatedSchPreceedings> {
  const page = params.page ?? 0;
  const size = params.size ?? 50;
  const body = await proxyGet<SchPreceeding[]>(
    SCHOLARSHIP_API.SCH_PRECEEDINGS,
    {
      collegeId: params.collegeId,
      academicYearId: params.academicYearId,
      financialYearId: params.financialYearId,
      isActive: "true",
      page,
      size,
    },
  );
  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load proceedings",
    );
  }
  const rows = Array.isArray(body.data) ? body.data : [];
  return {
    rows,
    totalCount: Number(body.totalCount ?? rows.length) || rows.length,
    page: Number(body.page ?? page) || page,
    pageSize: Number(body.pageSize ?? size) || size,
  };
}

export async function createSchPreceeding(
  data: SchPreceedingPayload,
): Promise<unknown> {
  return postDetails(SCHOLARSHIP_API.SCH_PRECEEDINGS, data);
}

export async function updateSchPreceeding(
  schPreceedingId: number,
  data: Partial<SchPreceedingPayload>,
): Promise<SchPreceeding> {
  return domainUpdate<SchPreceeding>(
    ENTITIES.SCH_PRECEEDING.name,
    ENTITIES.SCH_PRECEEDING.pk,
    schPreceedingId,
    data,
  );
}

export async function listSchStdPreceedings(
  schPreceedingId: number,
): Promise<SchStdPreceeding[]> {
  if (!schPreceedingId) return [];
  return domainList<SchStdPreceeding>(
    ENTITIES.SCH_STD_PRECEEDING.name,
    buildQuery({ "SchPreceeding.schPreceedingId": schPreceedingId }),
  );
}

/** Angular `listByIds(schstgstdpreceedings, preceedingNo, 'preceedingNo')`. */
export async function listSchStgStdPreceedings(
  preceedingNo: string,
): Promise<AnyRow[]> {
  const no = preceedingNo.trim();
  if (!no) return [];
  const body = await proxyGet<AnyRow[]>(
    SCHOLARSHIP_API.SCH_STG_STD_PRECEEDINGS,
    {
      preceedingNo: no,
    },
  );
  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load staging preceedings",
    );
  }
  return Array.isArray(body.data) ? body.data : [];
}

/** Angular `crudService.add(schStdPreceedingUrl, preStaggings)`. */
export async function createSchStdPreceedings(data: unknown): Promise<unknown> {
  return postDetails(SCHOLARSHIP_API.SCH_STD_PRECEEDING, data);
}

// ── Account Proceedings ─────────────────────────────────────────────────────────

export async function listSchAccountsPreceedings(
  collegeId?: number,
): Promise<SchAccountsPreceeding[]> {
  const query = collegeId
    ? buildQuery({ "College.collegeId": collegeId, isActive: true })
    : buildQuery({ isActive: true });
  return domainList<SchAccountsPreceeding>(
    ENTITIES.SCH_ACCOUNTS_PRECEEDING.name,
    query,
  );
}

export async function createSchAccountsPreceeding(
  data: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(SCHOLARSHIP_API.SCH_ACCOUNTS_PRECEEDINGS, data);
}

export async function updateSchAccountsPreceeding(
  schAccountsPreceedingId: number,
  data: Record<string, unknown>,
): Promise<unknown> {
  return domainUpdate(
    ENTITIES.SCH_ACCOUNTS_PRECEEDING.name,
    ENTITIES.SCH_ACCOUNTS_PRECEEDING.pk,
    schAccountsPreceedingId,
    data,
  );
}

/** Angular fee-reports: `schPreceedingsByAccPrecedingId?accPrecedingId=`. */
export async function listPreceedingsByAccountId(
  schAccountsPreceedingId: number,
): Promise<SchPreceeding[]> {
  if (!schAccountsPreceedingId) return [];
  const data = await fetchDetails<SchPreceeding[]>(
    SCHOLARSHIP_API.SCH_PRECEEDINGS_BY_ACC,
    {
      accPrecedingId: schAccountsPreceedingId,
    },
  );
  return Array.isArray(data) ? data : [];
}

/** Angular view-std-preceedings: domain list SchPreceeding by id (includes `stdPreceedings`). */
export async function getSchPreceedingById(
  schPreceedingId: number,
): Promise<
  | (SchPreceeding & {
      stdPreceedings?: Record<string, unknown>[];
      collegeCode?: string;
      academicYear?: string;
    })
  | null
> {
  if (!schPreceedingId) return null;
  const queries = [
    buildQuery({ schPreceedingId, isActive: true }),
    buildQuery({
      "SchPreceeding.schPreceedingId": schPreceedingId,
      isActive: true,
    }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<
        SchPreceeding & {
          stdPreceedings?: Record<string, unknown>[];
          collegeCode?: string;
          academicYear?: string;
        }
      >(ENTITIES.SCH_PRECEEDING.name, query);
      if (rows[0]) return rows[0];
    } catch {
      // try next query shape
    }
  }
  return null;
}

export async function listNullPreceedings(
  collegeId: number,
): Promise<SchPreceeding[]> {
  const data = await fetchDetails<SchPreceeding[]>(
    SCHOLARSHIP_API.GET_NULL_PRECEEDINGS,
    { collegeId },
  );
  return Array.isArray(data) ? data : [];
}

// ── Fee Scholarship Structure (Scholarship Value) ───────────────────────────────

export async function listFeeSchStructures(filters: {
  collegeId: number;
  academicYearId?: number;
  courseId?: number;
  batchId?: number;
}): Promise<FeeSchStructureRow[]> {
  const conditions: Record<string, string | number | boolean> = {
    "College.collegeId": filters.collegeId,
    isActive: true,
  };
  if (filters.academicYearId)
    conditions["AcademicYear.academicYearId"] = filters.academicYearId;
  if (filters.courseId) conditions["Course.courseId"] = filters.courseId;
  if (filters.batchId) conditions["Batch.batchId"] = filters.batchId;
  return domainList<FeeSchStructureRow>(
    ENTITIES.FEE_SCH_STRUCTURE.name,
    buildQuery(conditions),
  );
}

export async function createFeeSchStructure(
  data: FeeSchStructurePayload,
): Promise<FeeSchStructureRow> {
  return domainCreate<FeeSchStructureRow>(
    ENTITIES.FEE_SCH_STRUCTURE.name,
    data,
  );
}

export async function getFeeSchStructureById(
  feeSchStructureId: number,
): Promise<FeeSchStructureRow | null> {
  const queries = [
    buildQuery({ feeSchStructureId }),
    buildQuery({ "FeeSchStructure.feeSchStructureId": feeSchStructureId }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<FeeSchStructureRow>(
        ENTITIES.FEE_SCH_STRUCTURE.name,
        query,
      );
      if (rows.length > 0) return normalizeFeeSchStructure(rows[0]);
    } catch {
      // try next query shape
    }
  }
  return null;
}

export async function updateFeeSchStructure(
  feeSchStructureId: number,
  data: Partial<FeeSchStructurePayload>,
): Promise<FeeSchStructureRow> {
  return domainUpdate<FeeSchStructureRow>(
    ENTITIES.FEE_SCH_STRUCTURE.name,
    ENTITIES.FEE_SCH_STRUCTURE.pk,
    feeSchStructureId,
    data,
  );
}

export async function listScholarshipValuesByStructure(
  feeSchStructureId: number,
): Promise<ScholarshipValueRow[]> {
  const queries = [
    buildQuery({
      "FeeSchStructure.feeSchStructureId": feeSchStructureId,
      isActive: true,
    }),
    buildQuery({ feeSchStructureId, isActive: true }),
    buildQuery({ "FeeSchStructure.feeSchStructureId": feeSchStructureId }),
    buildQuery({ feeSchStructureId }),
  ];
  const byId = new Map<number, ScholarshipValueRow>();
  for (const query of queries) {
    try {
      const rows = await domainList<ScholarshipValueRow>(
        ENTITIES.SCHOLARSHIP_VALUE.name,
        query,
      );
      for (const row of rows) {
        const normalized = normalizeScholarshipValue(row);
        if (normalized.scholarshipValueId) {
          byId.set(normalized.scholarshipValueId, normalized);
        }
      }
    } catch {
      // try next query shape
    }
  }
  return [...byId.values()];
}

export async function createScholarshipValue(
  data: ScholarshipValuePayload,
): Promise<ScholarshipValueRow> {
  return domainCreate<ScholarshipValueRow>(
    ENTITIES.SCHOLARSHIP_VALUE.name,
    data,
  );
}

export async function updateScholarshipValue(
  scholarshipValueId: number,
  data: Partial<ScholarshipValuePayload>,
): Promise<ScholarshipValueRow> {
  return domainUpdate<ScholarshipValueRow>(
    ENTITIES.SCHOLARSHIP_VALUE.name,
    ENTITIES.SCHOLARSHIP_VALUE.pk,
    scholarshipValueId,
    data,
  );
}

export async function deleteScholarshipValue(
  scholarshipValueId: number,
): Promise<void> {
  await domainSoftDelete(
    ENTITIES.SCHOLARSHIP_VALUE.name,
    ENTITIES.SCHOLARSHIP_VALUE.pk,
    scholarshipValueId,
  );
}

// ── Assign Scholarship ────────────────────────────────────────────────────────────

export async function listBatchesByCourse(courseId: number): Promise<Batch[]> {
  if (!courseId) return [];
  const queries = [
    buildQuery({ "Course.courseId": courseId, isActive: true }),
    buildQuery({ courseId, isActive: true }),
  ];
  for (const query of queries) {
    try {
      const rows = await domainList<Batch>(ENTITIES.BATCH.name, query);
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export async function getScholarshipTypeAndValues(params: {
  collegeId: number;
  courseId: number;
  batchId?: number;
  academicYearId?: number;
}): Promise<ScholarshipTypeAndValue[]> {
  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    courseId: params.courseId,
  };
  if (params.batchId) {
    query.batchId = params.batchId;
  } else if (params.academicYearId) {
    query.academicYearId = params.academicYearId;
  }
  const data = await fetchDetails<unknown>(
    SCHOLARSHIP_API.GET_SCHOLARSHIP_TYPE_AND_VALUES,
    query,
  );
  return unwrapDetailRows(data).map(normalizeScholarshipTypeAndValue);
}

function normalizeScholarshipTypeAndValue(
  row: AnyRow,
): ScholarshipTypeAndValue {
  const feeDto = row.feeSchStructureDTO as AnyRow[] | undefined;
  const firstStructure = Array.isArray(feeDto) ? feeDto[0] : undefined;
  return {
    scholarshipTypeId: num(row.scholarshipTypeId, row.id),
    scholarshipTypeCode: str(
      row.scholarshipTypeCode,
      row.scholarshipTypeDesc,
      row.name,
    ),
    scholarshipAmount: Number(
      firstStructure?.scholarshipAmount ??
        row.scholarshipAmount ??
        row.amount ??
        0,
    ),
  };
}

export async function getStudentsScholarshipDetails(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId?: number;
  batchId?: number;
  scholarshipTypeId?: number;
}): Promise<AssignScholarshipStudent[]> {
  const query: Record<string, string | number> = {
    collegeId: params.collegeId,
    courseId: params.courseId,
    courseGroupId: params.courseGroupId,
    courseYearId: params.courseYearId,
  };
  if (params.academicYearId) query.academicYearId = params.academicYearId;
  if (params.batchId) query.batchId = params.batchId;
  if (params.scholarshipTypeId)
    query.scholarshipTypeId = params.scholarshipTypeId;
  const data = await fetchDetails<unknown>(
    SCHOLARSHIP_API.GET_STUDENTS_SCHOLARSHIP_DETAILS,
    query,
  );
  const rows = unwrapDetailRows(data);
  return rows.map((row) =>
    normalizeAssignScholarshipStudent(row as AssignScholarshipStudent),
  );
}

function unwrapDetailRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const record = data as AnyRow;
    for (const key of ["result", "resultList", "data", "rows", "list"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as AnyRow[];
    }
  }
  return [];
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "y" ||
      normalized === "yes"
    );
  }
  return false;
}

function normalizeAssignScholarshipStudent(
  row: AssignScholarshipStudent,
): AssignScholarshipStudent {
  const r = row as AnyRow;
  const details = (r.students_details ?? r.StudentDetail ?? r.studentDetail) as
    | AnyRow
    | undefined;
  const scholarship = (r.students_scholarships ??
    r.studentScholarship ??
    r.studentsScholarships) as AnyRow | undefined;

  const studentId = num(
    row.studentId,
    details?.studentId,
    details?.student_id,
    r["StudentDetail.studentId"],
  );
  const hasScholarshipRecord =
    scholarship != null && typeof scholarship === "object";
  const unAssigned =
    hasScholarshipRecord && isTruthyFlag(scholarship?.unAssigned);
  const isAssigned = hasScholarshipRecord && !unAssigned;

  return {
    studentId,
    firstName: str(row.firstName, details?.firstName, r.studentName),
    rollNumber: str(
      row.rollNumber,
      details?.hallticketNumber,
      details?.rollNumber,
      r.rollNo,
    ),
    studentPhotoPath: str(row.studentPhotoPath, details?.studentPhotoPath),
    isAssigned,
    scholarshipAmount: Number(
      scholarship?.amount ??
        row.scholarshipAmount ??
        r.scholarshipAmount ??
        r.value ??
        0,
    ),
    assignedType: str(
      row.assignedType,
      scholarship?.scholarshipTypeCode,
      scholarship?.assignedType,
      r.scholarshipTypeCode,
    ),
    scholarshipTypeId:
      num(
        row.scholarshipTypeId,
        scholarship?.scholarshipTypeId,
        scholarship?.scholarshipTypesId,
      ) || undefined,
    scholarshipValueId:
      num(row.scholarshipValueId, scholarship?.scholarshipValueId) || undefined,
    studentScholarshipId:
      num(row.studentScholarshipId, scholarship?.studentScholarshipId) ||
      undefined,
    courseName: str(details?.courseName),
    courseGroupName: str(details?.courseGroupName),
    courseYearName: str(details?.courseYearName),
    batchName: str(details?.batchName),
    checked: false,
  };
}

export async function updateStdStudentScholarship(
  payload: UpdateStdStudentScholarshipPayload[],
): Promise<unknown> {
  return putDetails(SCHOLARSHIP_API.UPDATE_STD_STUDENT_SCHOLARSHIP, payload);
}

// ── Upload ──────────────────────────────────────────────────────────────────────

export async function uploadStdPreceedings(
  formData: FormData,
): Promise<unknown> {
  const res = await fetch(
    NEXT_API.PROXY(SCHOLARSHIP_API.UPLOAD_STD_PRECEEDINGS),
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = await res.json();
  if (!body.success) {
    throw new AppError("API_ERROR", body.message ?? "Upload failed");
  }
  return body.data;
}

// ── Shared filters ──────────────────────────────────────────────────────────────

export { listActiveCollegesForGeneralSettings, listAcademicYearsByUniversity };
export type { FeeMasterCollegeFilters };

export async function getScholarshipCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<FeeMasterCollegeFilters> {
  return getFeeMasterCollegeFilters(orgId, employeeId);
}

export async function listFinancialYearsByUniversity(
  universityId: number,
): Promise<AnyRow[]> {
  if (!universityId) return [];
  return domainList<AnyRow>(
    ENTITIES.FINANCIAL_YEAR.name,
    buildQuery(
      { "Universities.universityId": universityId, isActive: true },
      { field: "toDate", direction: "DESC" },
    ),
  );
}

export async function searchStudentsForScholarship(
  q: string,
  collegeId: number,
): Promise<AnyRow[]> {
  const term = q.trim();
  if (term.length < 4 || !collegeId) return [];
  const data = await fetchDetails<AnyRow[]>("studentsearch", {
    q: term,
    collegeId,
  });
  return Array.isArray(data) ? data : [];
}
