import type { College } from '@/types/college'
import type { ConfigAutoNumber } from '@/types/config-auto-number'
import type { Course } from '@/types/course'
import type { Organization } from '@/types/organization'
import { buildQuery, domainList, postDetails } from '../crud'
import { ENTITIES } from '@/config/constants/entities'

export async function listActiveOrganizationsForConfigAutoNumber(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}

export async function listActiveCollegesByOrganizationForConfigAutoNumber(organizationId: number): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
  )
}

export async function listActiveCoursesByUniversityForConfigAutoNumber(universityId: number): Promise<Course[]> {
  return domainList<Course>(
    ENTITIES.COURSE.name,
    buildQuery({ 'Universities.universityId': universityId, isActive: true }),
  )
}

export async function listConfigAutoNumbers(
  organizationId: number,
  collegeId: number,
): Promise<ConfigAutoNumber[]> {
  // Angular used domain/list with two query conditions:
  // Organization.organizationId and College.collegeId.
  return domainList<ConfigAutoNumber>(
    'ConfigAutonumber',
    buildQuery({
      'Organization.organizationId': organizationId,
      'College.collegeId': collegeId,
    }),
  )
}

export async function createConfigAutoNumber(data: ConfigAutoNumber): Promise<void> {
  await postDetails('configautonumbers', data)
}

export async function saveConfigAutoNumberList(data: ConfigAutoNumber[]): Promise<void> {
  await postDetails('configautonumberslist', data)
}

