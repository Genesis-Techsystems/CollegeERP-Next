import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listDepartments(): Promise<Department[]> {
  return domainList<Department>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

/** Active departments only — mirrors Angular `listDetailsById(Department, 'true', isActive)`. */
export async function listActiveDepartments(): Promise<Department[]> {
  return domainList<Department>(ENTITIES.DEPARTMENT.name, buildQuery({ isActive: true }))
}

export async function createDepartment(data: Omit<Department, 'departmentId'>): Promise<Department> {
  return domainCreate<Department>(ENTITIES.DEPARTMENT.name, data)
}

export async function updateDepartment(
  departmentId: number,
  data: Partial<Omit<Department, 'departmentId'>>,
): Promise<Department> {
  return domainUpdate<Department>(ENTITIES.DEPARTMENT.name, ENTITIES.DEPARTMENT.pk, departmentId, {
    departmentId,
    ...data,
  })
}

export async function listActiveCollegesForDepartments(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function listDepartmentsByCollege(collegeId: number): Promise<Department[]> {
  return domainList<Department>(
    ENTITIES.DEPARTMENT.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
  )
}
