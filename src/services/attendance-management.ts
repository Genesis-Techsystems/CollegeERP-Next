import { ATTENDANCE_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { parseApiError } from '@/lib/errors'
import { buildQuery, domainList, getAllRecords } from './crud'
import { unwrapStaffAttendanceProcRows, type AnySmsRow } from './email-sms'

export type StaffNotMarkedRow = AnySmsRow

/** Angular `listDetailsByTwoIds(EmpDeptHeads, deptId, 'true', 'department.departmentId', isActive)`. */
export async function listDepartmentHeadsByDepartment(departmentId: number): Promise<StaffNotMarkedRow[]> {
  if (!departmentId) return []
  return domainList<StaffNotMarkedRow>(
    ENTITIES.EMP_DEPT_HEADS.name,
    buildQuery({ 'department.departmentId': departmentId, isActive: true }),
  )
}

/**
 * Angular `getStaffAttendance(attendanceNotTakenStaffUrl, '0', ymd, deptId, courseGroupId, issamedept)`.
 * `collegeId` is always `0` on this screen.
 */
export async function listStaffAttendanceNotMarkedByDepartment(params: {
  dateYmd: string
  departmentId: number
  courseGroupId: number
  isSameDept: boolean
}): Promise<StaffNotMarkedRow[]> {
  const { dateYmd, departmentId, courseGroupId, isSameDept } = params
  const raw = await getAllRecords<unknown>(ATTENDANCE_API.S_REP_ATTENDANCE_NOT_TAKEN_STAFF, {
    in_collegeId: 0,
    in_fdate: dateYmd,
    in_tdate: dateYmd,
    in_deptId: departmentId,
    in_course_group_id: courseGroupId,
    in_issamedept: isSameDept ? 1 : 0,
  })
  return unwrapStaffAttendanceProcRows(raw)
}

/** Angular `download()` — GET blob Excel for current filter. */
export async function downloadStaffAttendanceNotMarkedReport(params: {
  dateYmd: string
  departmentId: number
  courseGroupId: number
  isSameDept: boolean
}): Promise<void> {
  const { dateYmd, departmentId, courseGroupId, isSameDept } = params
  const qs = new URLSearchParams({
    in_collegeId: '0',
    in_fdate: dateYmd,
    in_tdate: dateYmd,
    in_deptId: String(departmentId),
    in_course_group_id: String(courseGroupId),
    in_issamedept: isSameDept ? '1' : '0',
  })
  const res = await fetch(`/api/proxy/${ATTENDANCE_API.DOWNLOAD_STAFF_NOT_MARKED}?${qs}`, {
    credentials: 'include',
  })
  if (!res.ok) throw parseApiError(res, await res.json().catch(() => null))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Staff Not Marking Attendance Report'
  a.click()
  URL.revokeObjectURL(url)
}
