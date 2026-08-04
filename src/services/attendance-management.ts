import { ATTENDANCE_API, NEXT_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { parseApiError } from "@/lib/errors";
import { domainListRawQuery, getAllRecords } from "./crud";
import { unwrapStaffAttendanceProcRows, type AnySmsRow } from "./email-sms";

export type StaffNotMarkedRow = AnySmsRow;

/** EmpDeptHeads row used for course-group sync (Angular `DepartmentHeads`). */
export type DepartmentHeadRow = AnySmsRow & {
  courseGroupId?: number;
  groupCode?: string;
};

/** Angular `departmentsHead[0].courseGroupId` (+ common alternate keys). */
export function courseGroupIdFromDeptHead(
  row: DepartmentHeadRow | undefined,
): number {
  if (!row) return 0;
  const nested = row.courseGroup as { courseGroupId?: number } | undefined;
  return Number(
    row.courseGroupId ??
      row.course_group_id ??
      row.fk_course_group_id ??
      nested?.courseGroupId ??
      0,
  );
}

/**
 * Angular `listDetailsByTwoIds(EmpDeptHeads, deptId, 'true', 'department.departmentId', isActive)`:
 * `domain/list/EmpDeptHeads?size=99999&query=department.departmentId=={id}.and.isActive==true`
 * (unescaped `==` — same as Angular HttpClient; encoded nested queries can return empty).
 */
export async function listDepartmentHeadsByDepartment(
  departmentId: number,
): Promise<DepartmentHeadRow[]> {
  if (!departmentId) return [];
  return domainListRawQuery<DepartmentHeadRow>(
    ENTITIES.EMP_DEPT_HEADS.name,
    `department.departmentId==${departmentId}.and.isActive==true`,
  );
}

/**
 * Angular `getStaffAttendance(attendanceNotTakenStaffUrl, '0', ymd, deptId, courseGroupId, issamedept)`:
 * `getAllRecords/s_rep_attendance_not_taken_staff/?in_collegeId=0&in_fdate=&in_tdate=&in_deptId=&in_course_group_id=&in_issamedept=`
 *
 * Payload (Other Dept Emp example from Angular DevTools):
 * `in_collegeId=0&in_fdate=YYYY-MM-DD&in_tdate=YYYY-MM-DD&in_deptId={dept}&in_course_group_id={heads[0].courseGroupId}&in_issamedept=0`
 */
export async function listStaffAttendanceNotMarkedByDepartment(params: {
  dateYmd: string;
  departmentId: number;
  courseGroupId: number;
  /** Angular `in_issamedept` — `1` Dept Emp (`R`), `0` Other Dept Emp (`G`). */
  inIssamedept: 0 | 1;
}): Promise<StaffNotMarkedRow[]> {
  const { dateYmd, departmentId, courseGroupId, inIssamedept } = params;
  // Param names/order match Angular getStaffAttendance() exactly.
  const raw = await getAllRecords<unknown>(
    ATTENDANCE_API.S_REP_ATTENDANCE_NOT_TAKEN_STAFF,
    {
      in_collegeId: 0,
      in_fdate: dateYmd,
      in_tdate: dateYmd,
      in_deptId: departmentId,
      in_course_group_id: courseGroupId,
      in_issamedept: inIssamedept,
    },
  );
  return unwrapStaffAttendanceProcRows(raw);
}

/**
 * Angular `download()` — GET Excel blob:
 * `downloadattendancenottakenlist/s_rep_attendance_not_taken_staff?in_collegeId=0&in_fdate=&in_tdate=&in_deptId=&in_course_group_id=&in_issamedept=`
 */
export async function downloadStaffAttendanceNotMarkedReport(params: {
  dateYmd: string;
  departmentId: number;
  courseGroupId: number;
  inIssamedept: 0 | 1;
}): Promise<void> {
  const { dateYmd, departmentId, courseGroupId, inIssamedept } = params;
  const qs = new URLSearchParams({
    in_collegeId: "0",
    in_fdate: dateYmd,
    in_tdate: dateYmd,
    in_deptId: String(departmentId),
    in_course_group_id: String(courseGroupId),
    in_issamedept: String(inIssamedept),
  });
  const res = await fetch(
    `${NEXT_API.PROXY(ATTENDANCE_API.DOWNLOAD_STAFF_NOT_MARKED)}?${qs}`,
    { credentials: "include" },
  );
  if (!res.ok) throw parseApiError(res, await res.json().catch(() => null));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Staff Not Marking Attendance Report";
  a.click();
  URL.revokeObjectURL(url);
}
