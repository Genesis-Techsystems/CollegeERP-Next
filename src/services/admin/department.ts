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

/** Calls procedure `s_get_dept_details?in_og_id=1&in_clg_id=16` */
export async function listDepartmentsByProcedure(
  organizationId?: number,
  collegeId?: number,
): Promise<Department[]> {
  const ogId =
    organizationId ||
    Number(globalThis?.localStorage?.getItem("organizationId") || 1);
  const clgId =
    collegeId || Number(globalThis?.localStorage?.getItem("collegeId") || 16);
  try {
    const list = await getAllRecords<Record<string, any>>(
      "s_get_dept_details",
      {
        in_og_id: ogId,
        in_clg_id: clgId,
      },
    );
    if (Array.isArray(list) && list.length > 0) {
      return list.map((d) => ({
        departmentId: Number(
          d.departmentId ??
            d.department_id ??
            d.pk_department_id ??
            d.dept_id ??
            0,
        ),
        deptName: String(
          d.deptName ?? d.dept_name ?? d.department_name ?? d.name ?? "",
        ),
        collegeCode: d.collegeCode ?? d.college_code ?? undefined,
        ...d,
      })) as Department[];
    }
  } catch {
    // Return empty list if procedure fails
  }
  return [];
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
