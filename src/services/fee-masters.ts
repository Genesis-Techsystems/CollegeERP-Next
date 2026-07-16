import { ENTITIES } from "@/config/constants/entities";
import { FEE_API, NEXT_API } from "@/config/constants/api";
import type { FeeCategory, FeeCategoryPayload } from "@/types/fee-category";
import type {
  FeeParticular,
  FeeParticularPayload,
} from "@/types/fee-particular";
import type {
  CollegeFeeStructureCreatePayload,
  CollegeFeeStructureRow,
  FeeStructureCourseYearTab,
  UnivFeeStructureDetailRow,
  UnivFeeStructureRow,
} from "@/types/fee-structure";
import type { ApiResponse } from "@/types/api";
import { AppError, parseApiError } from "@/lib/errors";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  cmsDomainList,
  domainCreate,
  domainList,
  domainUpdate,
  getAllRecords,
  postDetails,
} from "./crud";
import { getGeneralDetails } from "./exam-master";

type AnyRow = Record<string, unknown>;

function pickCourseYearId(row: AnyRow): number {
  for (const key of [
    "courseYearId",
    "fk_course_year_id",
    "courseyearId",
    "CourseYear.courseYearId",
  ]) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const nested = row.CourseYear as AnyRow | undefined;
  if (nested) {
    const n = Number(nested.courseYearId ?? nested.fk_course_year_id);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export type FeeMasterCollegeFilters = {
  filtersData: AnyRow[];
  academicData: AnyRow[];
  batchesData: AnyRow[];
  regulationData: AnyRow[];
};

export type UnivFeeMasterFilters = {
  filtersData: AnyRow[];
  academicData: AnyRow[];
};

function splitProcFilterGroups(groups: AnyRow[][]): {
  filtersData: AnyRow[];
  academicData: AnyRow[];
  batchesData: AnyRow[];
  regulationData: AnyRow[];
} {
  let filtersData: AnyRow[] = [];
  let academicData: AnyRow[] = [];
  let batchesData: AnyRow[] = [];
  let regulationData: AnyRow[] = [];

  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0] ?? {};
    if (first.flag === "clg_filters") filtersData = group;
    if (first.clg_filters_ay === "clg_filters_ay") academicData = group;
    if (
      first.clg_filters_batches === "clg_filters_batches" ||
      first.flag === "clg_filters_batches"
    ) {
      batchesData = group;
    }
    if (first.clg_filters_regulation === "clg_filters_regulation")
      regulationData = group;
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

  // Some tenants return batches without the marker row — detect by batch id columns.
  if (batchesData.length === 0) {
    const batchGroup = groups.find((g) => {
      if (!Array.isArray(g) || g.length === 0) return false;
      const sample = g.find(
        (r) =>
          Number(r?.fk_batch_id ?? r?.batchId ?? 0) > 0 &&
          String(r?.batch_name ?? r?.batchName ?? "").trim() !== "",
      );
      return Boolean(sample);
    });
    if (batchGroup?.length) batchesData = batchGroup;
  }

  return { filtersData, academicData, batchesData, regulationData };
}

function fallbackUnivFiltersWhenEmpty(
  groups: AnyRow[][],
  filtersData: AnyRow[],
): AnyRow[] {
  if (filtersData.length > 0) return filtersData;
  const clgGroup = groups.find(
    (g) =>
      Array.isArray(g) &&
      g.length > 0 &&
      String(g[0]?.flag ?? "") === "clg_filters",
  );
  if (clgGroup?.length) return clgGroup;
  const flattened = groups.flatMap((g) => (Array.isArray(g) ? g : []));
  const withUniversity = flattened.filter(
    (r) =>
      Number(r?.fk_university_id ?? r?.universityId ?? 0) > 0 &&
      String(r?.clg_filters_ay ?? "").trim() !== "clg_filters_ay",
  );
  return withUniversity.length > 0 ? withUniversity : flattened;
}

export type PaginatedFeeStructures = {
  rows: CollegeFeeStructureRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const UNIV_FEE_STRUCTURE_CONTEXT_KEY = "feeMasters:univFeeStructure";

// ── Fee Categories ────────────────────────────────────────────────────────────

export async function listFeeCategories(): Promise<FeeCategory[]> {
  return domainList<FeeCategory>(
    ENTITIES.FEE_CATEGORY.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createFeeCategory(
  data: FeeCategoryPayload,
): Promise<FeeCategory> {
  return domainCreate<FeeCategory>(ENTITIES.FEE_CATEGORY.name, data);
}

export async function updateFeeCategory(
  feeCategoryId: number,
  data: Partial<FeeCategoryPayload>,
): Promise<FeeCategory> {
  return domainUpdate<FeeCategory>(
    ENTITIES.FEE_CATEGORY.name,
    ENTITIES.FEE_CATEGORY.pk,
    feeCategoryId,
    data,
  );
}

// ── Fee Particulars ───────────────────────────────────────────────────────────

export async function listFeeParticulars(): Promise<FeeParticular[]> {
  return domainList<FeeParticular>(
    ENTITIES.FEE_PARTICULAR.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createFeeParticular(
  data: FeeParticularPayload,
): Promise<FeeParticular> {
  return domainCreate<FeeParticular>(ENTITIES.FEE_PARTICULAR.name, data);
}

export async function updateFeeParticular(
  feeParticularsId: number,
  data: Partial<FeeParticularPayload>,
): Promise<FeeParticular> {
  return domainUpdate<FeeParticular>(
    ENTITIES.FEE_PARTICULAR.name,
    ENTITIES.FEE_PARTICULAR.pk,
    feeParticularsId,
    data,
  );
}

// ── College fee structures (list) ─────────────────────────────────────────────

export async function getFeeMasterCollegeFilters(
  orgId: number,
  employeeId: number,
): Promise<FeeMasterCollegeFilters> {
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
  return splitProcFilterGroups(groups);
}

/** `getAllRecords/s_get_univwisedetails_bycode` — university fee structure filters (Angular parity). */
export async function getUnivFeeMasterFilters(
  orgId: number,
  employeeId: number,
): Promise<UnivFeeMasterFilters> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_univwisedetails_bycode",
    {
      in_flag: "clg_filters",
      in_org_id: orgId || 0,
      in_university_id: 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_regulation_id: 0,
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
  const split = splitProcFilterGroups(groups);
  return {
    filtersData: fallbackUnivFiltersWhenEmpty(groups, split.filtersData),
    academicData: split.academicData,
  };
}

export async function listCollegeFeeStructures(params: {
  collegeId: number;
  batchId?: number;
  academicYearId?: number;
  isAcademicFee: boolean;
  page?: number;
  size?: number;
}): Promise<PaginatedFeeStructures> {
  const page = params.page ?? 0;
  const size = params.size ?? 100;
  const query = new URLSearchParams({
    collegeId: String(params.collegeId),
    isAcademicFee: String(params.isAcademicFee),
    isActive: "true",
    page: String(page),
    size: String(size),
  });

  if (params.isAcademicFee && params.academicYearId) {
    query.set("academicYearId", String(params.academicYearId));
  } else if (params.batchId) {
    query.set("batchId", String(params.batchId));
  }

  const res = await fetch(
    NEXT_API.PROXY(FEE_API.FEE_STRUCTURES_LIST) + `?${query}`,
    {
      cache: "no-store",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }

  const body = (await res.json()) as ApiResponse<CollegeFeeStructureRow[]> & {
    totalCount?: number;
    page?: number;
    pageSize?: number;
  };

  if (!body.success) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load fee structures",
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

// ── University fee structures ─────────────────────────────────────────────────

export type UnivFeeStructureListParams = {
  universityId?: number;
  /** Angular create/list payload uses `universitiesId` for the same FK. */
  universitiesId?: number;
  courseId: number;
  academicYearId: number;
  courseGroupId: number;
};

/**
 * Angular `selectedAcademicYear` → `cms/domain/list/UnivFeeStructure` with five-id filter.
 * @example
 * universities.universityId==3.and.course.courseId==68.and.academicYear.academicYearId==101.and.courseGroup.courseGroupId==111.and.isActive==true
 */
export async function listUnivFeeStructures(
  params: UnivFeeStructureListParams,
): Promise<UnivFeeStructureRow[]> {
  const universityId = params.universityId ?? params.universitiesId ?? 0;
  const { courseId, academicYearId, courseGroupId } = params;
  if (!universityId || !courseId || !academicYearId || !courseGroupId)
    return [];

  const entity = ENTITIES.UNIV_FEE_STRUCTURE.name;
  const query = buildQuery({
    "universities.universityId": universityId,
    "course.courseId": courseId,
    "academicYear.academicYearId": academicYearId,
    "courseGroup.courseGroupId": courseGroupId,
    isActive: true,
  });

  // Angular uses `domain/list`; some deployments expose `cms/domain/list` (user URL).
  const cmsRows = await cmsDomainList<UnivFeeStructureRow>(entity, query).catch(
    () => [],
  );
  if (cmsRows.length > 0) return cmsRows;

  return domainList<UnivFeeStructureRow>(entity, query);
}

export async function createUnivFeeStructure(
  data: Omit<UnivFeeStructureRow, "univFeeStructureId">,
): Promise<UnivFeeStructureRow> {
  return domainCreate<UnivFeeStructureRow>(
    ENTITIES.UNIV_FEE_STRUCTURE.name,
    data,
  );
}

export async function updateUnivFeeStructure(
  univFeeStructureId: number,
  data: Partial<UnivFeeStructureRow>,
): Promise<UnivFeeStructureRow> {
  return domainUpdate<UnivFeeStructureRow>(
    ENTITIES.UNIV_FEE_STRUCTURE.name,
    ENTITIES.UNIV_FEE_STRUCTURE.pk,
    univFeeStructureId,
    data,
  );
}

export async function listUnivFeeStructureDetails(
  univFeeStructureId: number,
): Promise<UnivFeeStructureDetailRow[]> {
  return domainList<UnivFeeStructureDetailRow>(
    ENTITIES.UNIV_FEE_STRUCTURE_DETAILS.name,
    buildQuery({
      "UnivFeeStructure.univFeeStructureId": univFeeStructureId,
      isActive: true,
    }),
  );
}

/** Angular `UniversityRegistrationFee` / `UniversityCollegeFee` generalDetailIds. */
export const UNIV_FEE_CATEGORY_DETAIL_IDS = {
  REGISTRATION: 692,
  COLLEGE: 693,
} as const;

export type UnivFeeStructureDetailPayload = {
  univFeeStructureId: number;
  casteQuotaId: number;
  feeCategoryCatDetId: number;
  feeAmount: number;
  lateFeeAmount?: number;
  lastDayOfPayment?: string | Date;
  lastDayOfLatePayment?: string | Date;
  isActive: boolean;
  reason?: string;
  collegeId?: number | null;
  univFeeStructureDetId?: number;
};

export async function createUnivFeeStructureDetails(
  data: UnivFeeStructureDetailPayload,
): Promise<UnivFeeStructureDetailRow> {
  return domainCreate<UnivFeeStructureDetailRow>(
    ENTITIES.UNIV_FEE_STRUCTURE_DETAILS.name,
    data,
  );
}

export async function updateUnivFeeStructureDetails(
  univFeeStructureDetId: number,
  data: UnivFeeStructureDetailPayload,
): Promise<UnivFeeStructureDetailRow> {
  return domainUpdate<UnivFeeStructureDetailRow>(
    ENTITIES.UNIV_FEE_STRUCTURE_DETAILS.name,
    ENTITIES.UNIV_FEE_STRUCTURE_DETAILS.pk,
    univFeeStructureDetId,
    data,
  );
}

export function setUnivFeeStructureContext(row: UnivFeeStructureRow): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(UNIV_FEE_STRUCTURE_CONTEXT_KEY, JSON.stringify(row));
}

export function getUnivFeeStructureContext(): UnivFeeStructureRow | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(UNIV_FEE_STRUCTURE_CONTEXT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UnivFeeStructureRow;
  } catch {
    return null;
  }
}

export function clearUnivFeeStructureContext(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(UNIV_FEE_STRUCTURE_CONTEXT_KEY);
}

// ── Add college fee structure ─────────────────────────────────────────────────

export async function listFeeCategoriesByCollege(
  collegeId: number,
): Promise<FeeCategory[]> {
  if (!collegeId) return [];
  return domainList<FeeCategory>(
    ENTITIES.FEE_CATEGORY.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

export async function listFeeParticularsByCollege(
  collegeId: number,
): Promise<FeeParticular[]> {
  if (!collegeId) return [];
  return domainList<FeeParticular>(
    ENTITIES.FEE_PARTICULAR.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

export async function listCourseYearsForFeeStructure(
  courseId: number,
  isLateral: boolean,
): Promise<FeeStructureCourseYearTab[]> {
  if (!courseId) return [];
  const queries = [
    buildQuery(
      { "Course.courseId": courseId, isFeeYear: true, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
    buildQuery(
      { courseId, isFeeYear: true, isActive: true },
      { field: "sortOrder", direction: "ASC" },
    ),
  ];

  let rows: AnyRow[] = [];
  for (const query of queries) {
    try {
      rows = await domainList<AnyRow>(ENTITIES.COURSE_YEAR.name, query);
      if (rows.length > 0) break;
    } catch {
      // try next query shape
    }
  }

  const filtered = isLateral
    ? rows.filter((r) => Number(r.yearNo ?? 0) !== 1)
    : rows;
  const tabs: FeeStructureCourseYearTab[] = [];
  for (const row of filtered) {
    const yearNo = Number(row.yearNo ?? 0);
    if (tabs.some((t) => t.yearNo === yearNo)) continue;
    tabs.push({
      yearNo,
      courseYearId: pickCourseYearId(row),
      courseYearName: String(row.courseYearName ?? row.course_year_name ?? ""),
      feeLabel: String(
        row.feeLabel ??
          row.courseYearName ??
          row.course_year_name ??
          `Year ${yearNo}`,
      ),
      sortOrder: Number(row.sortOrder ?? yearNo),
      particulars: [],
    });
  }
  return tabs.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listQuotaOptions() {
  return getGeneralDetails(GM_CODES.QUOTA);
}

export async function createCollegeFeeStructure(
  payload: CollegeFeeStructureCreatePayload,
): Promise<unknown> {
  return postDetails<unknown>(FEE_API.FEE_STRUCTURES_LIST, payload);
}
