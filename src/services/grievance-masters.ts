/**
 * Grievance Masters — Angular `apps/grievance/grievance-masters`.
 * Entities: GrievanceCategory, ComplaintsList, GrievanceCommittee, CommitteeMember.
 */

import { GRIEVANCE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  postDetailsEnvelope,
} from "@/services/crud";

export type GrievanceCategory = {
  categoryId: number;
  grievanceCategory: string;
  grievanceCategoryCode: string;
  isActive: boolean;
  reason?: string | null;
};

export type GrievantType = {
  complaintListId: number;
  grvCategoryId: number;
  grvCategoryCode?: string;
  grievanceCategory?: string;
  complaintShortDesc: string;
  complaintDesc?: string | null;
  instructionsNotes?: string | null;
  isActive: boolean;
  reason?: string | null;
};

export type GrievanceCommittee = {
  grvCommitteeId: number;
  organizationId: number;
  orgCode?: string;
  orgName?: string;
  committeeName: string;
  committeeCode: string;
  escalateInDays?: number | null;
  hierarchyLevel?: number | null;
  isActive: boolean;
  reason?: string | null;
};

export type GrievanceCommitteeMember = {
  committeeMemberId: number;
  organizationId: number;
  collegeId?: number | null;
  departmentId?: number | null;
  employeeId: number;
  grvCommitteeId: number;
  grvCommitteeName?: string;
  committeeCode?: string;
  fromDate?: string | null;
  toDate?: string | null;
  isApprover?: boolean | null;
  isActive: boolean;
  reason?: string | null;
  orgCode?: string;
  collegeCode?: string;
  deptCode?: string;
  empName?: string;
  firstName?: string;
  empNumber?: string;
};

type SoftStatus = { isActive: boolean; reason?: string | null };

function withSoftStatus<T extends SoftStatus>(data: T): T {
  const isActive = data.isActive !== false;
  return {
    ...data,
    isActive,
    reason: isActive ? data.reason?.trim() || "active" : (data.reason ?? ""),
  };
}

// ─── Grievance Category ─────────────────────────────────────────────────────

/** Angular `listAllDetails(GrievanceCategory)`. */
export async function listAllGrievanceCategories(): Promise<
  GrievanceCategory[]
> {
  return domainList<GrievanceCategory>(
    GRIEVANCE_API.CATEGORY,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createGrievanceCategory(
  data: Omit<GrievanceCategory, "categoryId">,
): Promise<GrievanceCategory> {
  return domainCreate<GrievanceCategory>(
    GRIEVANCE_API.CATEGORY,
    withSoftStatus(data),
  );
}

export async function updateGrievanceCategory(
  categoryId: number,
  data: Partial<Omit<GrievanceCategory, "categoryId">>,
): Promise<GrievanceCategory> {
  return domainUpdate<GrievanceCategory>(
    GRIEVANCE_API.CATEGORY,
    "categoryId",
    categoryId,
    withSoftStatus({ categoryId, ...data } as GrievanceCategory),
  );
}

// ─── Grievant Types (ComplaintsList) ────────────────────────────────────────

/** Angular `listAllDetails(ComplaintsList)`. */
export async function listAllGrievantTypes(): Promise<GrievantType[]> {
  return domainList<GrievantType>(
    GRIEVANCE_API.COMPLAINTS_LIST,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Angular `listDetailsById(GrievanceCategory, 'true', isActive)` for type modal. */
export async function listActiveGrievanceCategoriesForTypes(): Promise<
  GrievanceCategory[]
> {
  return domainList<GrievanceCategory>(
    GRIEVANCE_API.CATEGORY,
    buildQuery({ isActive: true }),
  );
}

export async function createGrievantType(
  data: Omit<GrievantType, "complaintListId">,
): Promise<GrievantType> {
  return domainCreate<GrievantType>(
    GRIEVANCE_API.COMPLAINTS_LIST,
    withSoftStatus(data),
  );
}

export async function updateGrievantType(
  complaintListId: number,
  data: Partial<Omit<GrievantType, "complaintListId">>,
): Promise<GrievantType> {
  return domainUpdate<GrievantType>(
    GRIEVANCE_API.COMPLAINTS_LIST,
    "complaintListId",
    complaintListId,
    withSoftStatus({ complaintListId, ...data } as GrievantType),
  );
}

// ─── Grievance Committees ───────────────────────────────────────────────────

/** Angular `listAllDetails(GrievanceCommittee)`. */
export async function listAllGrievanceCommittees(): Promise<
  GrievanceCommittee[]
> {
  return domainList<GrievanceCommittee>(
    GRIEVANCE_API.COMMITTEE,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createGrievanceCommittee(
  data: Omit<GrievanceCommittee, "grvCommitteeId">,
): Promise<GrievanceCommittee> {
  return domainCreate<GrievanceCommittee>(
    GRIEVANCE_API.COMMITTEE,
    withSoftStatus(data),
  );
}

export async function updateGrievanceCommittee(
  grvCommitteeId: number,
  data: Partial<Omit<GrievanceCommittee, "grvCommitteeId">>,
): Promise<GrievanceCommittee> {
  return domainUpdate<GrievanceCommittee>(
    GRIEVANCE_API.COMMITTEE,
    "grvCommitteeId",
    grvCommitteeId,
    withSoftStatus({ grvCommitteeId, ...data } as GrievanceCommittee),
  );
}

/** Angular `listDetailsById(Organization, 'true', isActive)`. */
export async function listActiveOrganizationsForGrievanceMasters() {
  return domainList<{
    organizationId: number;
    orgCode?: string;
    orgName?: string;
  }>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }));
}

// ─── Committee Members ──────────────────────────────────────────────────────

/**
 * Angular `listDetailsById(CommitteeMember, grvCommitteeId, 'GrievanceCommittee.grvCommitteeId')`.
 */
export async function listGrievanceCommitteeMembers(
  grvCommitteeId: number,
): Promise<GrievanceCommitteeMember[]> {
  if (!grvCommitteeId) return [];
  return domainList<GrievanceCommitteeMember>(
    GRIEVANCE_API.COMMITTEE_MEMBER,
    buildQuery({ "GrievanceCommittee.grvCommitteeId": grvCommitteeId }),
  );
}

export async function createGrievanceCommitteeMember(
  data: Omit<GrievanceCommitteeMember, "committeeMemberId">,
): Promise<GrievanceCommitteeMember> {
  return domainCreate<GrievanceCommitteeMember>(
    GRIEVANCE_API.COMMITTEE_MEMBER,
    withSoftStatus(data),
  );
}

export async function updateGrievanceCommitteeMember(
  committeeMemberId: number,
  data: Partial<Omit<GrievanceCommitteeMember, "committeeMemberId">>,
): Promise<GrievanceCommitteeMember> {
  return domainUpdate<GrievanceCommitteeMember>(
    GRIEVANCE_API.COMMITTEE_MEMBER,
    "committeeMemberId",
    committeeMemberId,
    withSoftStatus({ committeeMemberId, ...data } as GrievanceCommitteeMember),
  );
}

/** Angular colleges by org: `Organization.organizationId` + `isActive`. */
export async function listCollegesForGrievanceMember(organizationId: number) {
  if (!organizationId) return [];
  return domainList<{
    collegeId: number;
    collegeCode?: string;
    collegeName?: string;
  }>(
    ENTITIES.COLLEGE.name,
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
  );
}

/** Angular departments by college: `College.collegeId` + `isActive`. */
export async function listDepartmentsForGrievanceMember(collegeId: number) {
  if (!collegeId) return [];
  return domainList<{
    departmentId: number;
    deptCode?: string;
    departmentName?: string;
  }>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

export type GrievanceEmployeeOption = {
  employeeId: number;
  firstName?: string;
  empNumber?: string;
  empName?: string;
};

/**
 * Add-member employee lookup (Angular `selectedDept` on add modal):
 * - IGRC: org + isActive + ACTV
 * - else: all isActive + ACTV (no college filter)
 */
export async function listEmployeesForGrievanceMemberAdd(params: {
  committeeCode?: string | null;
  organizationId?: number | null;
}): Promise<GrievanceEmployeeOption[]> {
  const { committeeCode, organizationId } = params;
  if (committeeCode === "IGRC") {
    if (!organizationId) return [];
    return domainList<GrievanceEmployeeOption>(
      ENTITIES.EMPLOYEE_DETAIL.name,
      buildQuery({
        "Organization.organizationId": organizationId,
        isActive: true,
        "employeeStatus.generalDetailCode": GM_CODES.EMP_ACTIVE_STATUS,
      }),
    );
  }
  return domainList<GrievanceEmployeeOption>(
    ENTITIES.EMPLOYEE_DETAIL.name,
    buildQuery({
      isActive: true,
      "employeeStatus.generalDetailCode": GM_CODES.EMP_ACTIVE_STATUS,
    }),
  );
}

/**
 * Edit-member employee lookup (Angular `selectedDept` on edit modal):
 * - IGRC: org + isActive + ACTV
 * - else: college + isActive + ACTV
 */
export async function listEmployeesForGrievanceMemberEdit(params: {
  committeeCode?: string | null;
  organizationId?: number | null;
  collegeId?: number | null;
}): Promise<GrievanceEmployeeOption[]> {
  const { committeeCode, organizationId, collegeId } = params;
  if (committeeCode === "IGRC") {
    if (!organizationId) return [];
    return domainList<GrievanceEmployeeOption>(
      ENTITIES.EMPLOYEE_DETAIL.name,
      buildQuery({
        "Organization.organizationId": organizationId,
        isActive: true,
        "employeeStatus.generalDetailCode": GM_CODES.EMP_ACTIVE_STATUS,
      }),
    );
  }
  if (!collegeId) return [];
  return domainList<GrievanceEmployeeOption>(
    ENTITIES.EMPLOYEE_DETAIL.name,
    buildQuery({
      "College.collegeId": collegeId,
      isActive: true,
      "employeeStatus.generalDetailCode": GM_CODES.EMP_ACTIVE_STATUS,
    }),
  );
}

// ─── Admin Grievances List (Angular `/grievance/complaint`) ──────────────────

export type AdminGrievanceRow = {
  complaintId: number;
  committeeName?: string;
  committeeCode?: string;
  grvCommitteeId?: number;
  stdName?: string;
  complaintDesc?: string;
  incident?: string;
  complainDate?: string;
  ackEmpName?: string | null;
  wfCode?: string;
  complaintDocPath?: string | null;
  isAcknowledged?: boolean;
  grvOnCatdetId?: number | null;
  [key: string]: unknown;
};

/**
 * Angular `listDetailsByIdWithSort(Complaint, 'true', 'desc', isActive, 'createdDt')`
 * → `isActive==true.order(createdDt=desc)`.
 */
export async function listAdminGrievances(): Promise<AdminGrievanceRow[]> {
  return domainList<AdminGrievanceRow>(
    GRIEVANCE_API.COMPLAINT,
    buildQuery({ isActive: true }, { field: "createdDt", direction: "DESC" }),
  );
}

/**
 * Angular `listDetailsById(Complaint, 'true', 'isAcknowledged')`
 * → `isAcknowledged==true` (loaded on init into `grievancedList`; table uses active list).
 */
export async function listAcknowledgedAdminGrievances(): Promise<
  AdminGrievanceRow[]
> {
  return domainList<AdminGrievanceRow>(
    GRIEVANCE_API.COMPLAINT,
    buildQuery({ isAcknowledged: true }),
  );
}

/**
 * Angular transfer save: `crudService.add(complaintUrl, details)` — POST `complaint`
 * with the mutated complaint row (`grvCommitteeId`, `grvOnCatdetId`).
 */
export async function transferAdminGrievance(
  payload: AdminGrievanceRow,
): Promise<string | undefined> {
  const envelope = await postDetailsEnvelope(
    GRIEVANCE_API.COMPLAINT_POST,
    payload,
  );
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to transfer grievance");
  }
  return envelope.message;
}
