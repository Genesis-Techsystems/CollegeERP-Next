import { NEXT_API, USER_MANAGEMENT_API } from "@/config/constants/api";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainList,
  domainUpdate,
  fetchDetails,
} from "@/services/crud";
import { listUserTypesByOrganization } from "./general-user-accounts";

const STUDENT_USER_TYPE_CODE = "STUDENT";

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function firstStrFromRow(m: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(m[k]);
    if (v) return v;
  }
  return "";
}

function emailFromStudentRow(m: Record<string, unknown>): string {
  return firstStrFromRow(m, [
    "email",
    "studentEmail",
    "stdEmailId",
    "student_email",
    "std_email_id",
    "emailId",
    "mailId",
    "stdEmail",
    "studentEmailId",
    "collegeEmail",
  ]);
}

function mobileFromStudentRow(m: Record<string, unknown>): string {
  return firstStrFromRow(m, [
    "mobileNumber",
    "mobile_number",
    "student_mobile_no",
    "phone",
    "mobile",
    "contactNumber",
    "primaryContact",
    "fatherMobile",
    "motherMobile",
    "smsMobile",
    "whatsappNo",
    "whatsapp_no",
    "stdMobile",
  ]);
}

/** Password expiry — many `User` create flows require a non-null `passwordExpDate` (see general-user-accounts). */
function defaultPasswordExpDateIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function departmentIdFromStudentRow(
  s: Record<string, unknown>,
): number | undefined {
  let id =
    Number(s.departmentId ?? s.fk_department_id ?? s.fk_departmentId ?? 0) || 0;
  if (id) return id;
  const nested = s.Department ?? s.department;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const d = nested as Record<string, unknown>;
    id = Number(d.departmentId ?? d.deptId ?? 0) || 0;
  }
  return id || undefined;
}

function extractStudentAccountFromCreateResponse(
  body: unknown,
): StudentAccount | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const tryRow = (row: unknown): StudentAccount | null => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const r = row as Record<string, unknown>;
    const userId = Number(r.userId ?? r.user_id ?? 0);
    if (!userId) return null;
    return {
      userId,
      firstName: str(r.firstName) || undefined,
      lastName: str(r.lastName) || undefined,
      userName: str(r.userName ?? r.username) || undefined,
      email: str(r.email) || undefined,
      mobileNumber: str(r.mobileNumber) || undefined,
      collegeId: Number(r.collegeId ?? 0) || undefined,
      organizationId: Number(r.organizationId ?? 0) || undefined,
      userTypeId: Number(r.userTypeId ?? 0) || undefined,
    };
  };

  const fromData = tryRow(b.data);
  if (fromData) return fromData;
  const direct = tryRow(b);
  if (direct) return direct;
  const list = b.resultList;
  if (Array.isArray(list) && list[0]) return tryRow(list[0]);
  return null;
}

/**
 * POST `cms/api/createuser` — Spring CMS student user creation (dev parity:
 * `https://host:8443/cms/api/createuser`).
 */
async function createStudentUserViaCmsApi(
  payload: Record<string, unknown>,
): Promise<StudentAccount> {
  const res = await fetch(NEXT_API.PROXY(USER_MANAGEMENT_API.CREATE_USER_CMS), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw parseApiError(res, body);
  }
  if (body && typeof body === "object" && "success" in body) {
    const env = body as ApiResponse<StudentAccount>;
    if (env.success === false) {
      throw new AppError(
        "API_ERROR",
        env.message ?? "Failed to create student user",
      );
    }
  }
  const extracted = extractStudentAccountFromCreateResponse(body);
  if (extracted) return extracted;
  // Angular CMS sometimes returns `success: true` with empty `data` after create.
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as ApiResponse<unknown>).success === true
  ) {
    return { userId: 0 };
  }
  throw new AppError(
    "API_ERROR",
    "Create user succeeded but the response had no user id.",
  );
}

export interface StudentAccount {
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

export interface StudentAccountsPage {
  rows: StudentAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Angular `CrudService.listByTypeCodeWithPageNation`:
 * `GET {MAINAPI}api/userdetailsbytype?userTypeCode=STUDENT&page={page}&size={size}`
 */
export async function listStudentAccountsPage(
  page: number,
  pageSize: number,
): Promise<StudentAccountsPage> {
  const params = new URLSearchParams({
    userTypeCode: STUDENT_USER_TYPE_CODE,
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
      body.message ?? "Failed to load student accounts",
    );
  }

  let rows: StudentAccount[] = [];
  let totalCount = 0;
  let pageOut = page;
  let pageSizeOut = pageSize;

  const topTotal = body.totalCount;
  const topPage = body.page;
  const topPageSize = body.pageSize;

  const d = body.data;
  if (Array.isArray(d)) {
    rows = (d as Record<string, unknown>[]).map(normalizeStudentAccountRow);
    totalCount = Number(topTotal ?? rows.length) || rows.length;
    pageOut = Number(topPage ?? page) || page;
    pageSizeOut = Number(topPageSize ?? pageSize) || pageSize;
  } else {
    const chunk = asRecord(d);
    if (chunk) {
      const list = chunk.resultList;
      if (Array.isArray(list)) {
        rows = (list as Record<string, unknown>[]).map(
          normalizeStudentAccountRow,
        );
      }
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

export async function getStudentAccountById(
  userId: number,
): Promise<StudentAccount | null> {
  const q = buildQuery({
    userId,
    "Usertype.userTypeCode": STUDENT_USER_TYPE_CODE,
  });
  const rows = await domainList<Record<string, unknown>>("User", q);
  const raw = rows[0];
  if (!raw) {
    const fallback = await domainList<Record<string, unknown>>(
      "User",
      buildQuery({ userId }),
    );
    if (!fallback[0]) return null;
    return normalizeStudentAccountRow(fallback[0]);
  }
  return normalizeStudentAccountRow(raw);
}

function normalizeStudentAccountRow(
  raw: Record<string, unknown>,
): StudentAccount {
  const nestedCollege = asRecord(raw.College) ?? asRecord(raw.college);
  const nestedOrg = asRecord(raw.Organization) ?? asRecord(raw.organization);
  const nestedType =
    asRecord(raw.Usertype) ?? asRecord(raw.userType) ?? asRecord(raw.usertype);
  return {
    userId: Number(raw.userId ?? 0),
    firstName: str(raw.firstName) || undefined,
    lastName: str(raw.lastName) || undefined,
    userName: str(raw.userName ?? raw.username) || undefined,
    email: str(raw.email) || undefined,
    mobileNumber: str(raw.mobileNumber) || undefined,
    collegeCode:
      str(raw.collegeCode) || str(nestedCollege?.collegeCode) || undefined,
    collegeId:
      Number(raw.collegeId ?? nestedCollege?.collegeId ?? 0) || undefined,
    organizationId:
      Number(raw.organizationId ?? nestedOrg?.organizationId ?? 0) || undefined,
    organizationCode:
      str(raw.organizationCode) ||
      str(nestedOrg?.organizationCode) ||
      undefined,
    userTypeId:
      Number(raw.userTypeId ?? nestedType?.userTypeId ?? 0) || undefined,
    password: str(raw.password) || undefined,
    passwordConfirm: str(raw.passwordConfirm) || undefined,
    isActive: raw.isActive !== false,
    isEditable: raw.isEditable === true,
    isReset: raw.isReset === true,
    reason: str(raw.reason) || undefined,
  };
}

export async function updateStudentAccount(
  userId: number,
  data: Partial<StudentAccount>,
): Promise<StudentAccount> {
  const payload: Record<string, unknown> = {
    userId,
    firstName: data.firstName,
    lastName: data.lastName,
    userName: data.userName,
    email: data.email,
    mobileNumber: data.mobileNumber,
    isActive: data.isActive,
    isEditable: data.isEditable,
    isReset: data.isReset,
    reason: data.reason,
  };
  if (data.collegeId) payload.collegeId = data.collegeId;
  if (data.organizationId) payload.organizationId = data.organizationId;
  if (data.userTypeId) payload.userTypeId = data.userTypeId;
  if (data.password) {
    payload.password = data.password;
    payload.passwordConfirm = data.passwordConfirm ?? data.password;
  }
  return domainUpdate<StudentAccount>("User", "userId", userId, payload);
}

/** Minimal row for “Add student account” student picker (by college). */
export interface StudentForAccountPick {
  studentId: number;
  firstName?: string;
  lastName?: string;
  hallticketNumber?: string;
  rollNumber?: string;
}

function mergeStudentRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const nestedBlocks = [
    row.studentDetail,
    row.StudentDetail,
    row.studentProfile,
    row.StudentProfile,
  ].filter(
    (v): v is Record<string, unknown> =>
      Boolean(v) && typeof v === "object" && !Array.isArray(v),
  ) as Record<string, unknown>[];
  const nested = nestedBlocks.reduce<Record<string, unknown>>(
    (acc, cur) => ({ ...acc, ...cur }),
    {},
  );
  // Nested detail objects carry names; shallow row is often the shell.
  return { ...row, ...nested };
}

/** Display + search string for student picker (Angular-style: hallticket (FULL NAME)). */
function displayNameForStudentPick(m: Record<string, unknown>): string {
  const tokens = [
    str(m.firstName ?? m.first_name),
    str(m.lastName ?? m.last_name),
    str(m.studentName),
    str(m.fullName),
    str(m.name),
    str(m.student_name),
    str(m.candidateName),
    str(m.surName ?? m.surname),
  ].filter(Boolean);
  const joined = tokens.join(" ").replace(/\s+/g, " ").trim();
  if (joined) return joined;
  return str(m.studentName) || str(m.fullName) || str(m.name) || "";
}

function hallticketForPick(m: Record<string, unknown>): string {
  return str(
    m.hallticketNumber ??
      m.hallTicketNumber ??
      m.rollNumber ??
      m.roll_no ??
      m.admissionNumber ??
      m.hallTicket,
  );
}

function pickStudentId(m: Record<string, unknown>): number {
  const id = Number(m.studentId ?? m.fk_student_id ?? m.student_id ?? 0);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function rowsFromSearchPayload(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.resultList))
      return d.resultList as Record<string, unknown>[];
    if (Array.isArray(d.result)) return d.result as Record<string, unknown>[];
    if (Array.isArray(d.rows)) return d.rows as Record<string, unknown>[];
    if (Array.isArray(d.content)) return d.content as Record<string, unknown>[];
  }
  return [];
}

function mapSearchRowsToPicks(
  rawRows: Record<string, unknown>[],
): StudentForAccountPick[] {
  const seen = new Set<number>();
  const out: StudentForAccountPick[] = [];
  for (const raw of rawRows) {
    const merged = mergeStudentRow(raw);
    const studentId = pickStudentId(merged);
    if (!studentId || seen.has(studentId)) continue;
    seen.add(studentId);
    const ht = hallticketForPick(merged);
    const display = displayNameForStudentPick(merged);
    const fn =
      str(merged.firstName ?? merged.first_name) ||
      str(merged.studentName) ||
      display ||
      undefined;
    const ln = str(merged.lastName ?? merged.last_name) || undefined;
    out.push({
      studentId,
      firstName: fn,
      lastName: ln,
      hallticketNumber: ht || undefined,
      rollNumber: str(merged.rollNumber) || str(merged.roll_no) || undefined,
    });
  }
  return out;
}

/**
 * CMS student search for the add-student-account picker (`/cms/studentsearch?collegeId=&q=`).
 */
export async function searchStudentsByCollegeForStudentAccount(
  collegeId: number,
  query: string,
): Promise<StudentForAccountPick[]> {
  const q = query.trim();
  if (!collegeId || !q) return [];
  try {
    const data = await fetchDetails<unknown>(
      USER_MANAGEMENT_API.STUDENT_SEARCH,
      { collegeId, q },
    );
    return mapSearchRowsToPicks(rowsFromSearchPayload(data));
  } catch {
    try {
      const data = await fetchDetails<unknown>("studentsearch", {
        collegeId,
        q,
        isActive: "true",
      });
      return mapSearchRowsToPicks(rowsFromSearchPayload(data));
    } catch {
      return [];
    }
  }
}

/**
 * Students in a college for linking a login **User** (Angular add-student-account modal).
 * Uses `domain/list/Student` with college filter — same family as other student pickers.
 */
export async function listStudentsByCollegeForStudentAccount(
  collegeId: number,
): Promise<StudentForAccountPick[]> {
  if (!collegeId) return [];
  const queries = [
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
    buildQuery({ "College.collegeId": collegeId }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<Record<string, unknown>>("Student", q);
      if (!rows.length) continue;
      const seen = new Set<number>();
      const out: StudentForAccountPick[] = [];
      for (const raw of rows) {
        const merged = mergeStudentRow(raw);
        const studentId = pickStudentId(merged);
        if (!studentId || seen.has(studentId)) continue;
        seen.add(studentId);
        const ht = hallticketForPick(merged);
        const display = displayNameForStudentPick(merged);
        const fn =
          str(merged.firstName ?? merged.first_name) ||
          str(merged.studentName) ||
          display ||
          undefined;
        const ln = str(merged.lastName ?? merged.last_name) || undefined;
        out.push({
          studentId,
          firstName: fn,
          lastName: ln,
          hallticketNumber: ht || undefined,
          rollNumber:
            str(merged.rollNumber) || str(merged.roll_no) || undefined,
        });
      }
      return out;
    } catch {
      // try next query shape
    }
  }
  return [];
}

export interface CreateStudentUserAccountForm {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  mobileNumber: string;
  password: string;
  passwordConfirm: string;
  /** Angular add-modal flags (defaults match Angular FormGroup). */
  isActive?: boolean;
  isEditable?: boolean;
  isReset?: boolean;
  reason?: string;
}

/** Row returned by Angular `creatingUserForStudentsUrl` when bulk create cannot create some accounts. */
export interface DefaultStudentAccountFailureRow {
  firstName?: string;
  lastName?: string;
  rollNumber?: string;
  academicYear?: string;
  collegeCode?: string;
  courseCode?: string;
  groupCode?: string;
  courseYearName?: string;
  section?: string;
  studentStatusCode?: string;
  isActive?: boolean;
}

/**
 * Creates a **User** for the selected **Student** via the same CMS endpoint as Angular:
 * `POST …/cms/api/createuser` (proxied as `/api/proxy/cms/api/createuser`).
 * With `account`, uses the add-student modal form. Without it, derives fields from **Student**
 * and uses a fixed bootstrap password.
 */
export async function createStudentUserAccountForStudent(params: {
  studentId: number;
  collegeId: number;
  organizationId: number;
  account?: CreateStudentUserAccountForm;
}): Promise<StudentAccount> {
  const { studentId, collegeId, organizationId, account } = params;
  if (!studentId || !collegeId) {
    throw new AppError("VALIDATION", "College and student are required.");
  }

  const rows = await domainList<Record<string, unknown>>(
    "Student",
    buildQuery({ studentId }),
  );
  const raw = rows[0];
  if (!raw) throw new AppError("NOT_FOUND", "Student record not found.");

  const s = mergeStudentRow(raw);
  const orgNested = s.Organization ?? s.organization;
  let orgFromNested = 0;
  if (orgNested && typeof orgNested === "object" && !Array.isArray(orgNested)) {
    const o = orgNested as Record<string, unknown>;
    orgFromNested = Number(o.organizationId ?? o.organizationid ?? 0) || 0;
  }
  const orgId =
    Number(organizationId) ||
    orgFromNested ||
    Number(
      s.organizationId ??
        s.fk_organization_id ??
        s.orgId ??
        s.orgOrganizationId ??
        s["Organization.organizationId"] ??
        0,
    );
  if (!orgId) {
    throw new AppError(
      "VALIDATION",
      "Organization is missing for this college. Cannot resolve STUDENT user type.",
    );
  }

  const types = await listUserTypesByOrganization(orgId);
  const studType = types.find(
    (t) =>
      String(t.userTypeCode ?? "").toUpperCase() === STUDENT_USER_TYPE_CODE,
  );
  if (!studType?.userTypeId) {
    throw new AppError(
      "CONFIG",
      "No STUDENT user type is configured for this organization.",
    );
  }

  const hallDefault = str(
    s.hallticketNumber ??
      s.hallTicketNumber ??
      s.rollNumber ??
      s.roll_no ??
      s.admissionNumber,
  );

  let firstName: string;
  let lastName: string;
  let userName: string;
  let email: string;
  let mobileNumber: string | undefined;
  let pwd: string;
  let pwdConfirm: string;

  if (account) {
    firstName =
      str(account.firstName) ||
      str(s.firstName ?? s.studentName) ||
      hallDefault;
    lastName = str(account.lastName) || str(s.lastName);
    userName = str(account.userName);
    const emailFromForm = str(account.email);
    const mobileFromForm = str(account.mobileNumber);
    email =
      emailFromForm ||
      emailFromStudentRow(s) ||
      (userName ? `${userName}@student.local` : "");
    mobileNumber = mobileFromForm || mobileFromStudentRow(s) || undefined;
    pwd = str(account.password);
    pwdConfirm = str(account.passwordConfirm);
    if (!userName) {
      throw new AppError("VALIDATION", "User name is required.");
    }
    if (!email) {
      throw new AppError("VALIDATION", "Email is required.");
    }
    if (!pwd || pwd !== pwdConfirm) {
      throw new AppError(
        "VALIDATION",
        "Password and confirm password must match.",
      );
    }
  } else {
    if (!hallDefault) {
      throw new AppError(
        "VALIDATION",
        "Student has no hall ticket / roll number to use as user name.",
      );
    }
    userName = hallDefault;
    firstName = str(s.firstName ?? s.studentName) || userName;
    lastName = str(s.lastName);
    const emailRaw = str(s.email ?? s.studentEmail);
    email = emailRaw || `${userName}@student.local`;
    mobileNumber =
      str(s.mobileNumber ?? s.mobile_no ?? s.student_mobile_no) || undefined;
    pwd = "Student@123";
    pwdConfirm = pwd;
  }

  const departmentId = departmentIdFromStudentRow(s);

  // Angular add-modal defaults: isActive=true, isEditable=false, isReset=false
  const isActive = account?.isActive !== false;
  const isEditable = account?.isEditable === true;
  const isReset = account?.isReset === true;
  const reason = str(account?.reason) || (isActive ? "active" : "inactive");

  const payload: Record<string, unknown> = {
    userTypeId: studType.userTypeId,
    collegeId,
    organizationId: orgId,
    firstName,
    lastName,
    userName,
    email,
    password: pwd,
    passwordConfirm: pwdConfirm,
    passwordExpDate: defaultPasswordExpDateIso(),
    isActive,
    isEditable,
    isReset,
    reason,
  };
  const mob = str(mobileNumber ?? "");
  if (mob) payload.mobileNumber = mob;
  if (departmentId) payload.departmentId = departmentId;

  return createStudentUserViaCmsApi({ ...payload, studentId });
}

/**
 * Angular `defaultStudentUserAcount` → `listAllMasterDetail(creatingUserForStudentsUrl)`.
 * Creates default student user accounts (username/password = roll number) and returns
 * students for whom account creation failed (shown in the Default Accounts modal).
 */
export async function createDefaultStudentUserAccounts(): Promise<
  DefaultStudentAccountFailureRow[]
> {
  const data = await fetchDetails<unknown>(
    USER_MANAGEMENT_API.CREATING_USER_FOR_STUDENTS,
  );
  if (Array.isArray(data)) return data as DefaultStudentAccountFailureRow[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.resultList))
      return d.resultList as DefaultStudentAccountFailureRow[];
    if (Array.isArray(d.result))
      return d.result as DefaultStudentAccountFailureRow[];
    if (Array.isArray(d.rows))
      return d.rows as DefaultStudentAccountFailureRow[];
  }
  return [];
}
