import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  postDetails,
} from "@/services/crud";

export interface Role {
  roleId: number;
  roleName: string;
  description?: string | null;
  organizationId?: number | null;
  orgCode?: string | null;
  collegeId?: number | null;
  collegeCode?: string | null;
  isActive: boolean;
  isEditable?: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

export interface RolePrivilegePageRow {
  pageId?: number;
  moduleId?: number;
  moduleName?: string | null;
  submoduleId?: number | null;
  submoduleName?: string | null;
  pageName?: string | null;
  checked?: boolean;
  isPresent?: boolean;
  rolePrivilegeId?: number;
  roleId?: number;
  collegeId?: number | string | null;
  organizationId?: number | string | null;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canView?: boolean;
  isActive?: boolean;
  createdDt?: string | null;
  url?: string | null;
}

/** Angular `listAllDetails(Role)` → order(createdDt=desc), no isActive filter. */
export async function listRoles(): Promise<Role[]> {
  return domainList<Role>(
    "Role",
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createRole(data: Partial<Role>): Promise<Role> {
  return domainCreate<Role>("Role", data);
}

export async function updateRole(
  roleId: number,
  data: Partial<Role>,
): Promise<Role> {
  return domainUpdate<Role>("Role", "roleId", roleId, data);
}

/** Angular: listDetailsById(Page, true, isActive). */
export async function listActivePagesForRolePrivileges(): Promise<
  RolePrivilegePageRow[]
> {
  return domainList<RolePrivilegePageRow>(
    "Page",
    buildQuery({ isActive: true }),
  );
}

/**
 * Angular: listDetailsByTwoIds(RolePrivilege, roleId, true, Role.roleId, isActive)
 * → Role.roleId==X.and.isActive==true
 */
export async function listRolePrivilegesByRoleId(
  roleId: number,
): Promise<RolePrivilegePageRow[]> {
  if (!roleId) return [];
  return domainList<RolePrivilegePageRow>(
    "RolePrivilege",
    buildQuery({ "Role.roleId": roleId, isActive: true }),
  );
}

/**
 * Angular: `add(rolePrivilegeListUrl, accessPages)` → POST roleprivilegelist
 */
export async function saveRolePrivilegeList(
  rows: RolePrivilegePageRow[],
): Promise<void> {
  await postDetails("roleprivilegelist", rows);
}
