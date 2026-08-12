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
    organizationId ??
    Number(globalThis?.localStorage?.getItem("organizationId") || 1);

  const clgId =
    collegeId ?? Number(globalThis?.localStorage?.getItem("collegeId") || 16);

  try {
    const response = await getAllRecords<any>("s_get_dept_details", {
      in_og_id: ogId,
      in_clg_id: clgId,
    });

    console.log("DEPARTMENT API getAllRecords RESPONSE:", response);

    /*
     * Handle all possible shapes:
     *
     * 1. [{...}, {...}]
     * 2. [[{...}, {...}]]
     * 3. { result: [{...}, {...}] }
     * 4. { result: [[{...}, {...}]] }
     * 5. { data: { result: [[{...}]] } }
     */

    let rows: any[] = [];

    if (Array.isArray(response)) {
      rows = response;
    } else if (Array.isArray(response?.result)) {
      rows = response.result;
    } else if (Array.isArray(response?.data?.result)) {
      rows = response.data.result;
    }

    // Flatten nested result arrays
    while (rows.length > 0 && Array.isArray(rows[0])) {
      rows = rows.flat();
    }

    console.log("DEPARTMENT NORMALIZED ROWS:", rows);

    return rows
      .filter((d) => d && typeof d === "object")
      .map((d) => ({
        departmentId: Number(d.fk_emp_dept_id ?? 0),

        deptName: String(d.dept_name ?? ""),

        // IMPORTANT
        deptCode: String(d.dept_code ?? ""),

        ...d,
      })) as Department[];
  } catch (error) {
    console.error("DEPARTMENT API ERROR:", error);
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
