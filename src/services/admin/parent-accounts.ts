import { NEXT_API, USER_MANAGEMENT_API } from "@/config/constants/api";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainList,
  domainUpdate,
  postDetails,
} from "@/services/crud";
import { listUserTypesByOrganization } from "./general-user-accounts";

const PARENT_USER_TYPE_CODE = "PARENT";

export interface ParentAccount {
  userId: number;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  mobileNumber?: string;
  collegeCode?: string;
  collegeId?: number;
  organizationId?: number;
  organizationCode?: string;
  userTypeId?: number;
  password?: string;
  passwordConfirm?: string;
  isActive?: boolean;
  isEditable?: boolean;
  isReset?: boolean;
  reason?: string;
}

export interface ParentAccountsPage {
  rows: ParentAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CreateParentAccountInput {
  collegeId: number;
  academicYearId: number;
  studentId: number;
  organizationId: number;
  firstName: string;
  userName: string;
  email: string;
  mobileNumber: string;
  password: string;
  passwordConfirm: string;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/**
 * Angular `CrudService.listByTypeCodeWithPageNation`:
 * `GET {MAINAPI}api/userdetailsbytype?userTypeCode=PARENT&page={page}&size={size}`
 */
export async function listParentAccountsPage(
  page: number,
  pageSize: number,
): Promise<ParentAccountsPage> {
  const params = new URLSearchParams({
    userTypeCode: PARENT_USER_TYPE_CODE,
    page: String(page),
    size: String(pageSize),
  });
  const path = USER_MANAGEMENT_API.USER_DETAILS_BY_TYPE;
  const url = `/api/proxy/${path}?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<unknown> &
    Record<string, unknown>;
  if (body.success === false) {
    throw new AppError(
      "API_ERROR",
      body.message ?? "Failed to load parent accounts",
    );
  }

  let rows: ParentAccount[] = [];
  let totalCount = 0;
  let pageOut = page;
  let pageSizeOut = pageSize;

  const topTotal = body.totalCount;
  const topPage = body.page;
  const topPageSize = body.pageSize;

  const d = body.data;
  if (Array.isArray(d)) {
    rows = d as ParentAccount[];
    totalCount = Number(topTotal ?? rows.length) || rows.length;
    pageOut = Number(topPage ?? page) || page;
    pageSizeOut = Number(topPageSize ?? pageSize) || pageSize;
  } else {
    const chunk = asRecord(d);
    if (chunk) {
      const list = chunk.resultList;
      if (Array.isArray(list)) rows = list as ParentAccount[];
      totalCount =
        Number(chunk.totalCount ?? chunk.count ?? topTotal ?? rows.length) ||
        rows.length;
      pageOut = Number(chunk.page ?? topPage ?? page) || page;
      pageSizeOut =
        Number(chunk.pageSize ?? topPageSize ?? pageSize) || pageSize;
    }
  }

  return { rows, totalCount, page: pageOut, pageSize: pageSizeOut };
}

export async function getParentAccountById(
  userId: number,
): Promise<ParentAccount | null> {
  const q = buildQuery({
    userId,
    "Usertype.userTypeCode": PARENT_USER_TYPE_CODE,
  });
  const rows = await domainList<ParentAccount>("User", q);
  return rows[0] ?? null;
}

export async function updateParentAccount(
  userId: number,
  data: Partial<ParentAccount>,
): Promise<ParentAccount> {
  const payload: Record<string, unknown> = {
    ...data,
    userId,
  };
  // Angular list `updateUser` re-attaches these from the row before PUT
  if (data.collegeId != null) payload.collegeId = data.collegeId;
  if (data.organizationId != null) payload.organizationId = data.organizationId;
  if (data.userTypeId != null) payload.userTypeId = data.userTypeId;
  return domainUpdate<ParentAccount>("User", "userId", userId, payload);
}

export interface ParentSiblingRow {
  studentId?: number;
  firstName?: string | null;
  rollNumber?: string | null;
  admissionNumber?: string | null;
  collegeCode?: string | null;
  academicYear?: string | null;
  courseYearName?: string | null;
  section?: string | null;
  mobile?: string | null;
  fatherName?: string | null;
  fatherMobileNo?: string | null;
  studentPhotoPath?: string | null;
  studentStatusCode?: string | null;
  [key: string]: unknown;
}

/**
 * Angular Add Sibling `getSiblings`:
 * `domain/list/StudentDetail?query=parentUser.userId=={userId}`
 */
export async function listParentSiblingsByUserId(
  userId: number,
): Promise<ParentSiblingRow[]> {
  if (!userId) return [];
  return domainList<ParentSiblingRow>(
    "StudentDetail",
    buildQuery({ "parentUser.userId": userId }),
  );
}

/**
 * Angular Add Sibling `addParentUser`:
 * load studentdetail → set `parentId` → POST `studentdetail`
 */
export async function linkStudentAsSiblingToParent(params: {
  parentUserId: number;
  studentDetail: Record<string, unknown>;
}): Promise<void> {
  const parentUserId = Number(params.parentUserId) || 0;
  if (!parentUserId) {
    throw new AppError("VALIDATION", "Parent user id is required.");
  }
  const payload = {
    ...params.studentDetail,
    parentId: parentUserId,
  };
  await postDetails("studentdetail", payload);
}

/**
 * Academic years for Parent Manage / Add Sibling after a college is selected.
 * Uses the college's `universityId`:
 * `domain/list/AcademicYear?query=Universities.universityId=={universityId}.and.isActive==true.order(fromDate=DESC)`
 */
export async function listAcademicYearsForParentAccountCollege(
  universityId: number,
): Promise<
  Array<{
    academicYearId: number;
    academicYear?: string | null;
    organizationId?: number | null;
    fromDate?: string | null;
  }>
> {
  if (!universityId) return [];
  return domainList(
    "AcademicYear",
    buildQuery(
      { "Universities.universityId": universityId, isActive: true },
      { field: "fromDate", direction: "DESC" },
    ),
  );
}

/**
 * Angular Parent Manage colleges:
 * `domain/list/College?query=isActive==true`
 */
export async function listActiveCollegesForParentAccounts(): Promise<
  Array<{
    collegeId: number;
    collegeCode?: string | null;
    organizationId?: number | null;
    universityId?: number | null;
  }>
> {
  return domainList("College", buildQuery({ isActive: true }));
}

/**
 * Angular Parent Manage `addParentUser`:
 * `addMasterDetails(createuserUrl, parent)` → POST `/cms/api/createuser`
 */
export async function createParentAccount(
  data: CreateParentAccountInput,
): Promise<ParentAccount> {
  const collegeId = Number(data.collegeId) || 0;
  const academicYearId = Number(data.academicYearId) || 0;
  const studentId = Number(data.studentId) || 0;
  const organizationId = Number(data.organizationId) || 0;
  const firstName = str(data.firstName);
  const userName = str(data.userName);
  const email = str(data.email);
  const mobileNumber = str(data.mobileNumber);
  const password = str(data.password);
  const passwordConfirm = str(data.passwordConfirm);

  if (!collegeId || !academicYearId || !studentId) {
    throw new AppError(
      "VALIDATION",
      "College, academic year, and student are required.",
    );
  }
  if (!organizationId) {
    throw new AppError(
      "VALIDATION",
      "Organization is required to create a parent account.",
    );
  }
  if (!userName) throw new AppError("VALIDATION", "User name is required.");
  // Angular: email is pattern-only (not Validators.required)
  if (!mobileNumber)
    throw new AppError("VALIDATION", "Mobile number is required.");
  if (!password || password !== passwordConfirm) {
    throw new AppError(
      "VALIDATION",
      "Password and confirm password must match.",
    );
  }

  const types = await listUserTypesByOrganization(organizationId);
  const parentType = types.find(
    (t) => String(t.userTypeCode ?? "").toUpperCase() === PARENT_USER_TYPE_CODE,
  );
  if (!parentType?.userTypeId) {
    throw new AppError(
      "CONFIG",
      "No PARENT user type is configured for this organization.",
    );
  }

  const payload: Record<string, unknown> = {
    collegeId,
    academicYearId,
    studentId,
    organizationId,
    userTypeId: parentType.userTypeId,
    firstName: firstName || userName,
    userName,
    email,
    mobileNumber,
    password,
    passwordConfirm,
    isActive: true,
    isEditable: true,
    isReset: true,
  };

  const res = await fetch(NEXT_API.PROXY(USER_MANAGEMENT_API.CREATE_USER_CMS), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw parseApiError(res, body);
  if (body && typeof body === "object" && "success" in body) {
    const env = body as ApiResponse<ParentAccount>;
    if (env.success === false) {
      throw new AppError(
        "API_ERROR",
        env.message ?? "Failed to create parent account",
      );
    }
    if (env.data && typeof env.data === "object") {
      const created = env.data as ParentAccount;
      return {
        ...created,
        userId: Number(created.userId) || 0,
      };
    }
  }
  return { userId: 0 };
}
