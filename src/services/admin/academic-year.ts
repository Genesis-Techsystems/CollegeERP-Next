import { ENTITIES } from '@/config/constants/entities'
import type { AcademicYear } from '@/types/academic-year'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listAcademicYears(): Promise<AcademicYear[]> {
  return domainList<AcademicYear>(
    ENTITIES.ACADEMIC_YEAR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createAcademicYear(data: Omit<AcademicYear, 'academicYearId'>): Promise<AcademicYear> {
  return domainCreate<AcademicYear>(ENTITIES.ACADEMIC_YEAR.name, data)
}

export async function updateAcademicYear(
  academicYearId: number,
  data: Partial<Omit<AcademicYear, 'academicYearId'>>,
): Promise<AcademicYear> {
  return domainUpdate<AcademicYear>(ENTITIES.ACADEMIC_YEAR.name, ENTITIES.ACADEMIC_YEAR.pk, academicYearId, {
    academicYearId,
    ...data,
  })
}
