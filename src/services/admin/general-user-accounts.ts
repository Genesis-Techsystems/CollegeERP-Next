import { buildQuery, domainCreate, domainList, domainUpdate, postDetails } from '@/services/crud'
import { listActiveCollegesForGeneralSettings } from './college'

export interface GeneralUserAccount {
  userId: number
  userName?: string
  firstName?: string
  mobileNumber?: string
  collegeCode?: string
  organizationCode?: string
  collegeId?: number
  isActive?: boolean
  organizationId?: number
  userTypeId?: number
  email?: string
  lastName?: string
  password?: string
  passwordConfirm?: string
  isEditable?: boolean
  isReset?: boolean
  reason?: string
  departmentId?: number
  passwordExpDate?: string | Date
}

export interface UserTypeOption {
  userTypeId: number
  userTypeName?: string
  userTypeCode?: string
  organizationId?: number
  isActive?: boolean
}

export interface RoleOption {
  roleId: number
  roleName: string
  organizationId?: number
  isActive?: boolean
}

export interface UserRole {
  userRoleId?: number
  userId: number
  userTypeId: number
  roleId: number
  roleName?: string
  userName?: string
  firstName?: string | null
  lastName?: string | null
  resetPasswordCode?: string | null
  isActive?: boolean
}

export async function listGeneralUserAccountColleges() {
  return listActiveCollegesForGeneralSettings()
}

export async function listGeneralUserAccountsByCollege(collegeId: number): Promise<GeneralUserAccount[]> {
  return domainList<GeneralUserAccount>(
    'User',
    buildQuery({ 'College.collegeId': collegeId }),
  )
}

export async function getGeneralUserAccountById(userId: number): Promise<GeneralUserAccount | null> {
  const rows = await domainList<GeneralUserAccount>('User', buildQuery({ userId }))
  return rows[0] ?? null
}

export async function createGeneralUserAccount(
  data: Omit<GeneralUserAccount, 'userId'>,
): Promise<GeneralUserAccount> {
  return domainCreate<GeneralUserAccount>('User', data)
}

export async function updateGeneralUserAccount(
  userId: number,
  data: Partial<GeneralUserAccount>,
): Promise<GeneralUserAccount> {
  return domainUpdate<GeneralUserAccount>('User', 'userId', userId, data)
}

export async function listUserTypesByOrganization(organizationId: number): Promise<UserTypeOption[]> {
  const query = buildQuery({ 'Organization.organizationId': organizationId, isActive: true })
  const fetchRows = async (path: string): Promise<unknown[]> => {
    const res = await fetch(path, { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return []
    const body = await res.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return []
    const payload = body.data
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object') {
      const p = payload as { resultList?: unknown[]; content?: unknown[]; records?: unknown[] }
      if (Array.isArray(p.resultList)) return p.resultList
      if (Array.isArray(p.content)) return p.content
      if (Array.isArray(p.records)) return p.records
    }
    if (Array.isArray(body.resultList)) return body.resultList as unknown[]
    return []
  }

  // Match Angular exactly:
  // constants.userTypeCrudUrl = 'Usertype'
  // listDetailsByTwoIds -> /domain/list/Usertype?size=99999&query=Organization.organizationId==X.and.isActive==true
  const rows = await fetchRows(`/api/proxy/domain/list/Usertype?size=99999&query=${encodeURIComponent(query)}`)

  const toText = (v: unknown): string | undefined => {
    if (typeof v === 'string') return v.trim() || undefined
    if (typeof v === 'number') return String(v)
    return undefined
  }

  return rows
    .map((row): UserTypeOption | null => {
      if (!row || typeof row !== 'object') return null
      const src = row as Record<string, unknown>
      const nested = (src.UserType ?? src.userType ?? null) as Record<string, unknown> | null
      const userTypeId = Number(src.userTypeId ?? src.usertypeId ?? src.user_type_id ?? nested?.userTypeId ?? 0)
      if (!userTypeId) return null
      return {
        userTypeId,
        userTypeName: toText(src.userTypeName ?? src.usertypeName ?? src.usertype ?? src.name ?? nested?.userTypeName),
        userTypeCode: toText(src.userTypeCode ?? src.usertypeCode ?? src.code ?? nested?.userTypeCode),
        organizationId: Number(src.organizationId ?? src.orgId ?? nested?.organizationId ?? 0) || undefined,
        isActive: src.isActive === undefined ? true : Boolean(src.isActive),
      }
    })
    .filter((row): row is UserTypeOption => row !== null)
}

export async function listRolesByOrganization(organizationId: number): Promise<RoleOption[]> {
  return domainList<RoleOption>(
    'Role',
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
  )
}

export async function listUserRoles(userId: number): Promise<UserRole[]> {
  return domainList<UserRole>('UserRole', buildQuery({ 'User.userId': userId }))
}

export async function saveUserRoles(rows: UserRole[]): Promise<void> {
  // Angular flow uses 'userrole' (CONSTANTS.userroleUrl), not cms/userrole.
  await postDetails('userrole', rows.map((row) => ({
    userRoleId: row.userRoleId,
    userId: row.userId,
    userTypeId: row.userTypeId,
    userName: row.userName ?? null,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    resetPasswordCode: row.resetPasswordCode ?? null,
    roleId: row.roleId,
    roleName: row.roleName ?? null,
    isActive: row.isActive !== false,
  })))
}
