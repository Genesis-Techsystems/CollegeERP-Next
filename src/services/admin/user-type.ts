/**
 * Angular parity: user-management/user-type
 *
 * Entity: Usertype
 * List: domain/list/Usertype?query=Organization.organizationId=={id}&size=99999
 *   (no isActive filter on the management list — Angular listDetailsById only)
 * Create: domain/create/Usertype
 * Update: domain/update/Usertype?query=usertypeId=={id}
 *   PK field casing from CONSTANTS.userTypeByIdUrl = 'usertypeId'
 */

import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
} from "@/services/crud";

export interface UserType {
  userTypeId: number;
  /** Angular update query key — may appear on responses as usertypeId. */
  usertypeId?: number;
  userTypeName?: string | null;
  userTypeCode?: string | null;
  organizationId?: number | string | null;
  isActive?: boolean;
  reason?: string | null;
}

/**
 * Angular: listDetailsById(Usertype, organizationId, Organization.organizationId)
 * → no `.and.isActive==true` (unlike dropdown helpers elsewhere).
 */
export async function listUserTypesByOrganizationId(
  organizationId: number,
): Promise<UserType[]> {
  if (!organizationId) return [];
  return domainList<UserType>(
    "Usertype",
    buildQuery({ "Organization.organizationId": organizationId }),
  );
}

export async function createUserType(
  data: Partial<UserType>,
): Promise<UserType> {
  return domainCreate<UserType>("Usertype", data);
}

/**
 * Angular: updateDetails(..., details.userTypeId, 'usertypeId')
 * → PUT domain/update/Usertype?query=usertypeId=={id}
 */
export async function updateUserType(
  userTypeId: number,
  data: Partial<UserType>,
): Promise<UserType> {
  return domainUpdate<UserType>("Usertype", "usertypeId", userTypeId, {
    ...data,
    userTypeId,
  });
}
