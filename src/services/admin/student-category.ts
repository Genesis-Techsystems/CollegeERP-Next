import { ENTITIES } from '@/config/constants/entities'
import type { Organization } from '@/types/organization'
import type { StudentCategory } from '@/types/student-category'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listStudentCategories(): Promise<StudentCategory[]> {
  return domainList<StudentCategory>(
    ENTITIES.STUDENT_CATEGORY.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createStudentCategory(
  data: Omit<StudentCategory, 'studentCatId'>,
): Promise<StudentCategory> {
  return domainCreate<StudentCategory>(ENTITIES.STUDENT_CATEGORY.name, data)
}

export async function updateStudentCategory(
  studentCatId: number,
  data: Partial<Omit<StudentCategory, 'studentCatId'>>,
): Promise<StudentCategory> {
  return domainUpdate<StudentCategory>(
    ENTITIES.STUDENT_CATEGORY.name,
    ENTITIES.STUDENT_CATEGORY.pk,
    studentCatId,
    { studentCatId, ...data },
  )
}

export async function listActiveOrganizationsForStudentCategories(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}
