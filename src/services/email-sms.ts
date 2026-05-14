import { COMMUNICATION_API } from '@/config/constants/api'
import { AppError, parseApiError } from '@/lib/errors'
import { buildQuery, domainList, fetchDetails, getAllRecords, postDetails } from './crud'

/** Generic row from SMS-related list / POST payloads. */
export type AnySmsRow = Record<string, unknown>

/** Angular `send-staff-sms` / `sendBulkEmailtoEmployeesForAttendance` row shape. */
export function buildStaffAttendanceNotMarkedSmsMessage(row: AnySmsRow): string {
  const faculty = String(row.faculty ?? '')
  const empNum = row.emp_number
  const emp = empNum != null && empNum !== '' ? `(${String(empNum)})` : ''
  const subj = String(row.subject_name ?? '')
  const stype = String(row.subject_type ?? '')
  const sec = String(row.SEC_Display_Name ?? '')
  const days = String(row.days ?? '')
  const start = String(row.Starttime ?? '')
  const end = String(row.Endtime ?? '')
  return `${faculty}${emp}.Subject:${subj}(${stype}), Course:${sec},${days} (${start}-${end}) attendance has not marked.`
}

/** Unwraps `getAllRecords` payload where rows live at `data.result[0]` (array of rows). */
export function unwrapStaffAttendanceProcRows(data: unknown): AnySmsRow[] {
  if (Array.isArray(data)) {
    const first = data[0]
    if (Array.isArray(first)) return first as AnySmsRow[]
    if (first && typeof first === 'object') return [first as AnySmsRow]
    return data as AnySmsRow[]
  }
  if (data && typeof data === 'object' && 'result' in data) {
    const result = (data as { result?: unknown }).result
    if (Array.isArray(result) && result.length > 0) {
      const block = result[0]
      if (Array.isArray(block)) return block as AnySmsRow[]
      if (block && typeof block === 'object') return [block as AnySmsRow]
    }
  }
  return []
}

/**
 * Angular `getStaffAttendance(attendanceNotTakenStaffUrl, collegeId, ymd, deptId, 0, 0)`.
 * When "all employees", `collegeId` is the selected college and `departmentId` is `0`.
 * When "by department", `collegeId` is the department's college and `departmentId` is the selected dept.
 */
export async function listStaffAttendanceNotMarked(params: {
  collegeId: number
  dateYmd: string
  departmentId: number
}): Promise<AnySmsRow[]> {
  const { collegeId, dateYmd, departmentId } = params
  const raw = await getAllRecords<unknown>(COMMUNICATION_API.S_REP_ATTENDANCE_NOT_TAKEN_STAFF, {
    in_collegeId: collegeId,
    in_fdate: dateYmd,
    in_tdate: dateYmd,
    in_deptId: departmentId,
    in_course_group_id: 0,
    in_issamedept: 0,
  })
  return unwrapStaffAttendanceProcRows(raw)
}

/** Angular `crudService.add(sendBulkEmailtoEmployeesForAttendanceUrl, rows)` — mirrors staff attendance email payload. */
export async function sendBulkEmailToEmployeesForAttendance(rows: AnySmsRow[]): Promise<void> {
  await postDetails<unknown>(COMMUNICATION_API.SEND_BULK_EMAIL_EMPLOYEES_ATTENDANCE, rows)
}

/** Angular `domain/list/SmsPattern` — `messagepatternfor==ABSENT`. */
export async function listSmsPatternsForAbsent(): Promise<AnySmsRow[]> {
  return domainList<AnySmsRow>('SmsPattern', 'messagepatternfor==ABSENT')
}

const PROXY_BASE = '/api/proxy'

function absentStudentsArrayFromEnvelope(body: Record<string, unknown> | null): AnySmsRow[] {
  if (!body) return []
  if (body.success === false) {
    throw new AppError('API_ERROR', String(body.message ?? 'Request failed'))
  }
  const data = body.data
  if (Array.isArray(data)) return data as AnySmsRow[]
  const sc = Number(body.statusCode ?? 0)
  if (sc === 200 && !Array.isArray(data)) return []
  if (body.success !== true && sc !== 200 && sc !== 0) {
    throw new AppError('API_ERROR', String(body.message ?? 'Request failed'))
  }
  return []
}

/**
 * Angular `crudService.add(getSmsToSbsentStudentsUrl, absentees)` — POST body includes
 * `collegeId`, `academicYearId`, null course fields, `attendanceDate`, flags, and `day`.
 */
export async function fetchAbsentStudentsForSms(payload: Record<string, unknown>): Promise<AnySmsRow[]> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.GET_SMS_TO_ABSENT_STUDENTS}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  return absentStudentsArrayFromEnvelope(body)
}

/** Angular `listByThreeIds(smshistory, date, collegeId, patternId, ...)`. */
export async function listSmsHistoryAbsentees(params: {
  date: string
  collegeId: number
  patternId: number
}): Promise<AnySmsRow[]> {
  const data = await fetchDetails<unknown>(COMMUNICATION_API.SMS_HISTORY, {
    date: params.date,
    collegeId: params.collegeId,
    patternId: params.patternId,
  })
  return Array.isArray(data) ? (data as AnySmsRow[]) : []
}

/** Normalizes legacy GET `data` payloads (array or paged wrappers) into row objects. */
export function unwrapEmailOrSmsHistoryRows(data: unknown): AnySmsRow[] {
  if (Array.isArray(data)) return data as AnySmsRow[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const k of ['resultList', 'records', 'content', 'rows'] as const) {
      const v = o[k]
      if (Array.isArray(v)) return v as AnySmsRow[]
    }
  }
  return []
}

/**
 * Email send log for a college — tries legacy GET {@link COMMUNICATION_API.EMAIL_HISTORY}, then
 * `domain/list/EmailLog` with `College.collegeId`, then flat `collegeId` query.
 */
export async function listEmailLogsForCollege(params: {
  collegeId: number
  fromDate?: string
  toDate?: string
}): Promise<AnySmsRow[]> {
  const { collegeId, fromDate, toDate } = params
  if (!collegeId) return []

  const q: Record<string, string | number> = { collegeId }
  if (fromDate) q.fromDate = fromDate
  if (toDate) q.toDate = toDate

  try {
    const data = await fetchDetails<unknown>(COMMUNICATION_API.EMAIL_HISTORY, q)
    const rows = unwrapEmailOrSmsHistoryRows(data)
    if (rows.length > 0) return rows
  } catch {
    // Fall through to domain list.
  }

  const queries = [
    buildQuery({ 'College.collegeId': collegeId }, { field: 'createdDt', direction: 'DESC' }),
    buildQuery({ collegeId }, { field: 'createdDt', direction: 'DESC' }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnySmsRow>('EmailLog', query)
      if (rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

/** Angular `crudService.add(sendBulkSmsToMultiUsersUrl, students)`. */
export async function sendBulkSmsToMultiUsers(rows: AnySmsRow[]): Promise<void> {
  await postDetails<unknown>(COMMUNICATION_API.SEND_BULK_SMS_TO_MULTI_USERS, rows)
}

/** Row shape from `domain/list/User` with college + role filters (Angular send-login-details). */
export type SendLoginDetailsUserRow = Record<string, unknown> & {
  userId?: number
  userName?: string
  mobileNumber?: string
  email?: string
  checked?: boolean
}

/**
 * Payload mirrors Angular `send-student-sms.component.ts` `sendSms()`:
 * form values + `isSmsAlert`, `patternId`, `numbers` (mobile strings).
 */
export interface SendBulkSmsToStudentsPayload {
  collegeId: number
  academicYearId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  groupSectionId: number
  messageContent: string
  isSmsAlert: boolean
  patternId: number
  numbers: string[]
}

export async function sendBulkSmsToStudents(payload: SendBulkSmsToStudentsPayload): Promise<void> {
  await postDetails<unknown>(COMMUNICATION_API.SEND_BULK_SMS, payload)
}

/**
 * Angular `listDetailsByThreeIds` on `User`:
 * `College.collegeId=={collegeId}.and.userRoles.role.roleId=={roleId}.and.userRoles.isActive==true`
 */
export async function listUsersForSendLoginDetails(
  collegeId: number,
  roleId: number,
): Promise<SendLoginDetailsUserRow[]> {
  if (!collegeId || !roleId) return []
  const query = `College.collegeId==${collegeId}.and.userRoles.role.roleId==${roleId}.and.userRoles.isActive==true`
  return domainList<SendLoginDetailsUserRow>('User', query)
}

/** Angular `crudService.add(smslogindetailUrl, sendSMS)` — array of selected user objects. */
export async function sendLoginDetailsSms(rows: SendLoginDetailsUserRow[]): Promise<void> {
  await postDetails<unknown>(COMMUNICATION_API.SMS_LOGIN_DETAIL, rows)
}

function legacyMasterPostOk(body: Record<string, unknown> | null): boolean {
  if (!body) return false
  if (body.success === true) return true
  const sc = Number(body.statusCode ?? 0)
  if (sc === 200 && body.data != null && body.data !== '') return true
  return false
}

function assertLegacyMasterPost(body: Record<string, unknown> | null, fallback: string): void {
  if (legacyMasterPostOk(body)) return
  const msg = body && typeof body.message === 'string' ? body.message : fallback
  throw new AppError('API_ERROR', msg)
}

/**
 * Angular `crudService.upload(uploadFileForEmailUrl, formData)` — multipart; `data` is attachment path.
 */
export async function uploadFileForEmail(formData: FormData): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.UPLOAD_FILE_FOR_EMAIL}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  const sc = Number(body?.statusCode ?? 0)
  const ok = body?.success === true && (sc === 0 || sc === 200)
  if (ok || body?.success === true) {
    const data = body?.data
    if (data != null && data !== '') return typeof data === 'string' ? data : String(data)
  }
  if (body?.success === false) {
    throw new AppError('API_ERROR', String(body.message ?? 'Upload failed'))
  }
  throw new AppError('API_ERROR', String(body?.message ?? 'Upload failed'))
}

/** Angular `addMasterDetails(sendBulkEmailtoStudentsUrl, studentsList)`. */
export async function sendBulkEmailToStudents(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.SEND_BULK_EMAIL_TO_STUDENTS}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  assertLegacyMasterPost(body, 'Send bulk email to students failed')
}

/** Angular `addMasterDetails(sendBulkEmailtoSectionStudentsUrl, studentsList)`. */
export async function sendBulkEmailToSectionStudents(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.SEND_BULK_EMAIL_TO_SECTION_STUDENTS}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  assertLegacyMasterPost(body, 'Send bulk email to section students failed')
}

/** Angular `department-wise-email` student mode — `addMasterDetails(sendBulkEmailtoStudentsByCYurl, email)`. */
export async function sendBulkEmailToStudentsByCourseYears(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.SEND_BULK_EMAIL_TO_STUDENTS_BY_CY}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  assertLegacyMasterPost(body, 'Send bulk email to students by course years failed')
}

/**
 * Angular `department-wise-email` employee mode — `addMasterDetails(sendBulkEmailtoEmployeesUrl, email)`.
 * Not the same path as {@link sendBulkEmailToEmployeesForAttendance}.
 */
export async function sendBulkEmailToEmployeesDepartmentWise(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.SEND_BULK_EMAIL_TO_EMPLOYEES}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  assertLegacyMasterPost(body, 'Send bulk email to employees failed')
}

/**
 * Angular principal / staff → admin email — legacy `addMasterDetails` POST.
 * Payload aligns with {@link sendBulkEmailToEmployeesDepartmentWise} but targets admin users via `userIds`.
 */
export async function sendBulkEmailToAdminFromStaff(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${PROXY_BASE}/${COMMUNICATION_API.SEND_BULK_EMAIL_TO_ADMIN}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok) throw parseApiError(res, body)
  assertLegacyMasterPost(body, 'Send bulk email to admin failed')
}
