import { domainCreate, domainList, domainUpdate } from '@/services/crud'
import { listActiveCollegesForGeneralSettings } from './college'

const STAFF_USER_TYPE_ID = 9
const STAFF_USER_TYPE_CODE = 'STAFF'

/**
 * Same filter as Angular `user-accounts.component.ts` staff grid:
 * `listDetailsByTwoIdsWithSort(userCrudUrl, collegeId, 'STAFF', 'desc', getDetailsByCollegeIdUrl, 'Usertype.userTypeCode', 'createdDt')`
 * → `College.collegeId=={collegeId}.and.Usertype.userTypeCode==STAFF.order(createdDt=desc)`
 *
 * Uses `domain/list/User` via {@link domainList} (same as general user accounts). Avoids a second
 * `cms/` segment when `SPRING_API_URL` already ends with `/cms`.
 */
function staffUsersByCollegeQuery(collegeId: number): string {
  return `College.collegeId==${collegeId}.and.Usertype.userTypeCode==${STAFF_USER_TYPE_CODE}.order(createdDt=desc)`
}

export interface StaffAccount {
  userId: number
  firstName?: string
  lastName?: string
  userName?: string
  email?: string
  mobileNumber?: string
  password?: string
  passwordConfirm?: string
  departmentId?: number
  collegeId?: number
  collegeCode?: string
  organizationId?: number
  organizationCode?: string
  isActive?: boolean
  isEditable?: boolean
  isReset?: boolean
  reason?: string
}

export async function listStaffAccountColleges() {
  return listActiveCollegesForGeneralSettings()
}

export async function listStaffAccountsByCollege(collegeId: number): Promise<StaffAccount[]> {
  return domainList<StaffAccount>('User', staffUsersByCollegeQuery(collegeId))
}

export async function getStaffAccountById(userId: number): Promise<StaffAccount | null> {
  const query = `userId==${userId}.and.Usertype.userTypeCode==${STAFF_USER_TYPE_CODE}`
  const rows = await domainList<StaffAccount>('User', query)
  return rows[0] ?? null
}

export async function createStaffAccount(data: Omit<StaffAccount, 'userId'>): Promise<StaffAccount> {
  return domainCreate<StaffAccount>('User', { ...data, userTypeId: STAFF_USER_TYPE_ID })
}

export async function updateStaffAccount(userId: number, data: Partial<StaffAccount>): Promise<StaffAccount> {
  return domainUpdate<StaffAccount>('User', 'userId', userId, { ...data, userTypeId: STAFF_USER_TYPE_ID })
}
