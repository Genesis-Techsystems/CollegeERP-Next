/**
 * Angular parity: user-management/faculty-data-security-level
 *
 * Employee search: GET employeesearch?q={term}&empStatus=ACTV (length > 4)
 * List: domain/list/EmployeeDataSecurity?query=employeeDetailId.employeeId=={id}.and.isActive==true
 * Create: domain/create/EmployeeDataSecurity (employeeDetailId stamped from selected employeeId)
 * Update: domain/update/EmployeeDataSecurity?query=empDataSecurityId=={id}
 */

import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
} from "@/services/crud";
import { listActiveCollegesForGeneralSettings } from "@/services/admin/college";
import { listDepartmentsByCollege } from "@/services/admin/department";
import { listActiveCoursesByUniversity } from "@/services/admin/course-group";
import { listActiveCourseGroupsByCourse } from "@/services/admin/university-curriculum";
import { listActiveCourseYearsByCourse } from "@/services/admin/university-curriculum";

const ENTITY = "EmployeeDataSecurity";
const PK = "empDataSecurityId";

export interface FacultySecurityEmployee {
  employeeId: number;
  firstName?: string | null;
  empNumber?: string | null;
  collegeCode?: string | null;
  empDeptName?: string | null;
  designation?: string | null;
  photoPath?: string | null;
  empStatus?: string | null;
}

export interface EmployeeDataSecurity {
  empDataSecurityId: number;
  employeeDetailId?: number | string | null;
  collegeId?: number | string | null;
  collegeCode?: string | null;
  employeeDepartmentId?: number | string | null;
  employeeDepartmentCode?: string | null;
  courseId?: number | string | null;
  courseCode?: string | null;
  courseGroupId?: number | string | null;
  courseGroupCode?: string | null;
  courseYearId?: number | string | null;
  courseYearCode?: string | null;
  subjectId?: number | string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
  isActive?: boolean;
  reason?: string | null;
  createdDt?: string | null;
}

export interface FacultySecuritySubject {
  subjectId: number;
  subjectName?: string | null;
  subjectCode?: string | null;
}

/**
 * Angular `enteredEmployee` / `listByTwoIds(employeesearch, q, 'ACTV', 'q', 'empStatus')`
 * Trigger only when search length > 4 (5+ characters).
 */
export async function searchEmployeesForFacultyDataSecurity(
  term: string,
): Promise<FacultySecurityEmployee[]> {
  const q = term.trim();
  if (q.length <= 4) return [];

  const data = await fetchDetails<unknown>("employeesearch", {
    q,
    empStatus: "ACTV",
  });

  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { resultList?: unknown[]; data?: unknown[] }).resultList ??
        (data as { data?: unknown[] }).data ??
        [])
      : [];

  return (rows as Record<string, unknown>[])
    .map((r): FacultySecurityEmployee | null => {
      const employeeId = Number(r.employeeId ?? 0) || 0;
      if (!employeeId) return null;
      return {
        employeeId,
        firstName: (r.firstName as string) ?? null,
        empNumber: (r.empNumber as string) ?? null,
        collegeCode: (r.collegeCode as string) ?? null,
        empDeptName: (r.empDeptName as string) ?? null,
        designation: (r.designation as string) ?? null,
        photoPath: (r.photoPath as string) ?? null,
        empStatus: (r.empStatus as string) ?? null,
      };
    })
    .filter((r): r is FacultySecurityEmployee => r != null);
}

/**
 * Angular `listDetailsByTwoIds(EmployeeDataSecurity, employeeId, 'true',
 *   'employeeDetailId.employeeId', isActive)`
 */
export async function listEmployeeDataSecurityByEmployeeId(
  employeeId: number,
): Promise<EmployeeDataSecurity[]> {
  if (!employeeId) return [];
  return domainList<EmployeeDataSecurity>(
    ENTITY,
    buildQuery({
      "employeeDetailId.employeeId": employeeId,
      isActive: true,
    }),
  );
}

export async function createEmployeeDataSecurity(
  data: Partial<EmployeeDataSecurity>,
): Promise<EmployeeDataSecurity> {
  return domainCreate<EmployeeDataSecurity>(ENTITY, data);
}

export async function updateEmployeeDataSecurity(
  empDataSecurityId: number,
  data: Partial<EmployeeDataSecurity>,
): Promise<EmployeeDataSecurity> {
  return domainUpdate<EmployeeDataSecurity>(ENTITY, PK, empDataSecurityId, {
    ...data,
    empDataSecurityId,
  });
}

/** Modal dropdowns — re-export Angular-shaped helpers. */
export {
  listActiveCollegesForGeneralSettings as listCollegesForFacultyDataSecurity,
  listDepartmentsByCollege as listDepartmentsForFacultyDataSecurity,
  listActiveCoursesByUniversity as listCoursesForFacultyDataSecurity,
  listActiveCourseGroupsByCourse as listCourseGroupsForFacultyDataSecurity,
  listActiveCourseYearsByCourse as listCourseYearsForFacultyDataSecurity,
};

/**
 * Angular modal `subjectList`:
 * Subject?query=Course.courseId=={courseId}.and.isActive==true
 */
export async function listSubjectsForFacultyDataSecurity(
  courseId: number,
): Promise<FacultySecuritySubject[]> {
  if (!courseId) return [];
  const rows = await domainList<FacultySecuritySubject>(
    "Subject",
    buildQuery({ "Course.courseId": courseId, isActive: true }),
  );
  return rows
    .map((r) => ({
      subjectId: Number(r.subjectId) || 0,
      subjectName: r.subjectName ?? null,
      subjectCode: r.subjectCode ?? null,
    }))
    .filter((r) => r.subjectId > 0);
}

export function facultyEmployeeLabel(emp: FacultySecurityEmployee): string {
  const name = emp.firstName?.trim() ?? "";
  const num = emp.empNumber?.trim() ?? "";
  if (name && num) return `${name}(${num})`;
  return name || num || String(emp.employeeId);
}
