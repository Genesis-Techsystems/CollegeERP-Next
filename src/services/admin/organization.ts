/**
 * Organization CRUD service + geo hierarchy helpers.
 *
 * API endpoints:
 *   GET    /domain/list/Organization?size=99999&query=order(createdDt=DESC)
 *   POST   /domain/create/Organization
 *   PUT    /domain/update/Organization?query=organizationId=={id}
 *   POST   /organizationlogoupload  (multipart/form-data)
 *
 *   GET    /domain/list/Country?size=99999
 *   GET    /domain/list/State?size=99999&query=Organization.countryId=={countryId}
 *   GET    /domain/list/District?size=99999&query=Organization.stateId=={stateId}
 *   GET    /domain/list/City?size=99999&query=Organization.districtId=={districtId}
 */

import type { Organization, Country, State, District, City } from '@/types/organization'
import { domainList, domainCreate, domainUpdate, buildQuery, uploadFile } from '../crud'
import { ORG_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'

// ─── Organization CRUD ────────────────────────────────────────────────────────

/**
 * List all organizations ordered by creation date descending.
 * GET /domain/list/Organization
 */
export async function listOrganizations(): Promise<Organization[]> {
  return domainList<Organization>(
    ENTITIES.ORGANIZATION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

/**
 * Create a new organization.
 * POST /domain/create/Organization
 */
export async function createOrganization(data: Omit<Organization, 'organizationId'>): Promise<Organization> {
  return domainCreate<Organization>(ENTITIES.ORGANIZATION.name, data)
}

/**
 * Update an existing organization.
 * PUT /domain/update/Organization?query=organizationId=={id}
 */
export async function updateOrganization(
  organizationId: number,
  data: Partial<Omit<Organization, 'organizationId'>>,
): Promise<Organization> {
  return domainUpdate<Organization>(ENTITIES.ORGANIZATION.name, ENTITIES.ORGANIZATION.pk, organizationId, data)
}

/**
 * Upload (or replace) an organization's logo.
 * POST /organizationlogoupload  (multipart/form-data)
 */
export async function uploadOrganizationLogo(
  organizationId: number,
  orgCode: string,
  file: File,
): Promise<void> {
  const formData = new FormData()
  formData.append('organizationId', String(organizationId))
  formData.append('orgCode', orgCode)
  formData.append('organizationLogo', file, file.name)
  await uploadFile(ORG_API.LOGO_UPLOAD, formData)
}

// ─── Geo hierarchy ────────────────────────────────────────────────────────────

/**
 * List all active organizations (used in Campus modal's org dropdown).
 * GET /domain/list/Organization?query=isActive==true
 */
export async function listActiveOrganizations(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}

/**
 * List all countries.
 * GET /domain/list/Country
 */
export async function listCountries(): Promise<Country[]> {
  return domainList<Country>(ENTITIES.COUNTRY.name)
}

/**
 * List states for a given country.
 * GET /domain/list/State?query=Country.countryId=={countryId}
 */
export async function listStatesByCountry(countryId: number): Promise<State[]> {
  return domainList<State>(ENTITIES.STATE.name, buildQuery({ 'Country.countryId': countryId }))
}

/**
 * List districts for a given state.
 * GET /domain/list/District?query=State.stateId=={stateId}
 */
export async function listDistrictsByState(stateId: number): Promise<District[]> {
  return domainList<District>(ENTITIES.DISTRICT.name, buildQuery({ 'State.stateId': stateId }))
}

/**
 * List cities for a given district.
 * GET /domain/list/City?query=District.districtId=={districtId}
 */
export async function listCitiesByDistrict(districtId: number): Promise<City[]> {
  return domainList<City>(ENTITIES.CITY.name, buildQuery({ 'District.districtId': districtId }))
}
