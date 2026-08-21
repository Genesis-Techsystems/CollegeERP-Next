import { ENTITIES } from "@/config/constants/entities";
import type { College } from "@/types/college";
import type { Department } from "@/types/department";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  getAllRecords,
} from "../crud";

export async function listDepartments(): Promise<Department[]> {
  return domainList<Department>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Active departments only — mirrors Angular `listDetailsById(Department, 'true', isActive)`. */
export async function listActiveDepartments(): Promise<Department[]> {
  return domainList<Department>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({ isActive: true }),
  );
}

/** Calls procedure `s_get_dept_details?in_og_id=&in_clg_id=`.
 * Falls back to domain Department list when the proc is unavailable / errors.
 */
export async function listDepartmentsByProcedure(
  organizationId?: number,
  collegeId?: number,
): Promise<Department[]> {
  const ogId =
    organizationId ??
    Number(globalThis?.localStorage?.getItem("organizationId") || 0);

  const clgId =
    collegeId ?? Number(globalThis?.localStorage?.getItem("collegeId") || 0);

  if (ogId > 0 && clgId > 0) {
    try {
      const response = await getAllRecords<any>("s_get_dept_details", {
        in_og_id: ogId,
        in_clg_id: clgId,
      });

      let rows: any[] = [];

      if (Array.isArray(response)) {
        rows = response;
      } else if (Array.isArray(response?.result)) {
        rows = response.result;
      } else if (Array.isArray(response?.data?.result)) {
        rows = response.data.result;
      }

      while (rows.length > 0 && Array.isArray(rows[0])) {
        rows = rows.flat();
      }

      const mapped = rows
        .filter((d) => d && typeof d === "object")
        .map((d) => ({
          departmentId: Number(
            d.fk_emp_dept_id ?? d.departmentId ?? d.department_id ?? 0,
          ),
          collegeId: clgId,
          deptName: String(d.dept_name ?? d.deptName ?? ""),
          deptCode: String(d.dept_code ?? d.deptCode ?? ""),
          isActive: true,
          ...d,
        })) as Department[];

      if (mapped.some((d) => d.departmentId > 0)) {
        return mapped.filter((d) => d.departmentId > 0);
      }
    } catch {
      // Proc missing / Internal Server Error on some campuses — use domain list.
    }
  }

  if (clgId > 0) {
    try {
      return await listDepartmentsByCollege(clgId);
    } catch {
      // fall through
    }
  }

  try {
    return await listActiveDepartments();
  } catch {
    return [];
  }
}

export async function createDepartment(
  data: Omit<Department, "departmentId">,
): Promise<Department> {
  return domainCreate<Department>(ENTITIES.DEPARTMENT.name, data);
}

export async function updateDepartment(
  departmentId: number,
  data: Partial<Omit<Department, "departmentId">>,
): Promise<Department> {
  return domainUpdate<Department>(
    ENTITIES.DEPARTMENT.name,
    ENTITIES.DEPARTMENT.pk,
    departmentId,
    {
      departmentId,
      ...data,
    },
  );
}

export async function listActiveCollegesForDepartments(): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ isActive: true }),
  );
}

export async function listDepartmentsByCollege(
  collegeId: number,
): Promise<Department[]> {
  return domainList<Department>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}
