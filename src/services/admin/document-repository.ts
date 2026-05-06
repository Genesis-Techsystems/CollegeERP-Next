import { GM_CODES } from '@/config/constants/ui'
import { ENTITIES } from '@/config/constants/entities'
import type { College } from '@/types/college'
import type { Course } from '@/types/course'
import type { DocumentRepository } from '@/types/document-repository'
import type { Organization } from '@/types/organization'
import type { University } from '@/types/university'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type GeneralDetail = {
  generalDetailId: number
  generalDetailCode?: string
  name?: string
}

export async function listDocumentRepositories(): Promise<DocumentRepository[]> {
  return domainList<DocumentRepository>(
    ENTITIES.DOCUMENT_REPOSITORY.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createDocumentRepository(
  data: Omit<DocumentRepository, 'documentRepositoryId'>,
): Promise<DocumentRepository> {
  return domainCreate<DocumentRepository>(ENTITIES.DOCUMENT_REPOSITORY.name, data)
}

export async function updateDocumentRepository(
  documentRepositoryId: number,
  data: Partial<Omit<DocumentRepository, 'documentRepositoryId'>>,
): Promise<DocumentRepository> {
  return domainUpdate<DocumentRepository>(
    ENTITIES.DOCUMENT_REPOSITORY.name,
    ENTITIES.DOCUMENT_REPOSITORY.pk,
    documentRepositoryId,
    { documentRepositoryId, ...data },
  )
}

export async function listActiveOrganizationsForDocumentRepository(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}

export async function listActiveUniversitiesForDocumentRepository(): Promise<University[]> {
  return domainList<University>(ENTITIES.UNIVERSITIES.name, buildQuery({ isActive: true }))
}

export async function listActiveCollegesByUniversityForDocumentRepository(universityId: number): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ 'Universities.universityId': universityId, isActive: true }))
}

export async function listActiveCoursesByUniversityForDocumentRepository(universityId: number): Promise<Course[]> {
  return domainList<Course>(ENTITIES.COURSE.name, buildQuery({ 'Universities.universityId': universityId, isActive: true }))
}

async function listGeneralDetailsByCode(code: string): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }),
  )
}

export async function listDocTypesForDocumentRepository(): Promise<GeneralDetail[]> {
  return listGeneralDetailsByCode(GM_CODES.DOC_TYPE)
}

export async function listDocFormTypesForDocumentRepository(): Promise<GeneralDetail[]> {
  return listGeneralDetailsByCode(GM_CODES.DOC_FORM_TYPE)
}

