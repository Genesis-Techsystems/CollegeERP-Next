import { AppError } from '@/lib/errors'
import { domainCreate, domainList, domainUpdate } from '@/services/crud'
import { listActiveCollegesForGeneralSettings } from './college'
import { listUserTypesByOrganization } from './general-user-accounts'

/**
 * Same filter pattern as Angular `user-accounts.component.ts` (see `staff-accounts.ts`),
 * for examination / evaluation logins:
 * `listDetailsByTwoIdsWithSort(..., collegeId, 'EVALUATION', 'desc', ..., 'Usertype.userTypeCode', 'createdDt')`
 * → `College.collegeId=={collegeId}.and.Usertype.userTypeCode==EVALUATION.order(createdDt=desc)`
 *
 * Uses `domain/list/User` like {@link listStaffAccountsByCollege} — avoids a second `cms/` segment
 * when `SPRING_API_URL` already ends with `/cms` (see staff-accounts service comment).
 */
const EVALUATION_USER_TYPE_CODE = 'EVALUATION'

function examinationAccountsByCollegeQuery(collegeId: number): string {
  return `College.collegeId==${collegeId}.and.Usertype.userTypeCode==${EVALUATION_USER_TYPE_CODE}.order(createdDt=desc)`
}

/** Resolved from org user types — used for creates/updates and role assignment when `userTypeId` is absent on the row. */
export async function resolveEvaluationUserTypeId(organizationId: number): Promise<number> {
  if (!organizationId) {
    throw new AppError('VALIDATION', 'Organization is required to resolve evaluation user type.')
  }
  const types = await listUserTypesByOrganization(organizationId)
  const match = types.find(
    (t) => String(t.userTypeCode ?? '').toUpperCase() === EVALUATION_USER_TYPE_CODE.toUpperCase(),
  )
  if (!match?.userTypeId) {
    throw new AppError(
      'CONFIG',
      `No ${EVALUATION_USER_TYPE_CODE} user type is configured for this organization.`,
    )
  }
  return match.userTypeId
}

export interface ExaminationAccount {
  userId: number
  userTypeId?: number
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

export async function listExaminationAccountColleges() {
  return listActiveCollegesForGeneralSettings()
}

export async function listExaminationAccountsByCollege(collegeId: number): Promise<ExaminationAccount[]> {
  return domainList<ExaminationAccount>('User', examinationAccountsByCollegeQuery(collegeId))
}

export async function getExaminationAccountById(userId: number): Promise<ExaminationAccount | null> {
  const query = `userId==${userId}.and.Usertype.userTypeCode==${EVALUATION_USER_TYPE_CODE}`
  const rows = await domainList<ExaminationAccount>('User', query)
  return rows[0] ?? null
}

export async function createExaminationAccount(
  data: Omit<ExaminationAccount, 'userId'>,
): Promise<ExaminationAccount> {
  const userTypeId = await resolveEvaluationUserTypeId(data.organizationId ?? 0)
  return domainCreate<ExaminationAccount>('User', { ...data, userTypeId })
}

export async function updateExaminationAccount(
  userId: number,
  data: Partial<ExaminationAccount>,
): Promise<ExaminationAccount> {
  const orgId = data.organizationId ?? 0
  const userTypeId = await resolveEvaluationUserTypeId(orgId)
  return domainUpdate<ExaminationAccount>('User', 'userId', userId, { ...data, userTypeId })
}
