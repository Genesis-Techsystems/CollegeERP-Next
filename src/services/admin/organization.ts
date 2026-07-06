/**
 * Organization CRUD service + geo hierarchy helpers.
 *
 * API endpoints:
 *   GET    /domain/list/Organization?size=99999&query=order(createdDt=DESC)
 *   POST   /domain/create/Organization
 *   PUT    /domain/update/Organization?query=organizationId=={id}
 *   POST   /organizationlogoupload  (multipart/form-data)
 */

import type { Organization, Country, State, District, City } from '@/types/organization'
import { domainList, domainCreate, domainUpdate, buildQuery, uploadFile } from '../crud'
import { ORG_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'

type OrganizationWriteInput = Partial<Omit<Organization, 'organizationId'>> & Record<string, unknown>

function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim()
  return text.length > 0 ? text : null
}

/** Match Angular date payload: keep list ISO when unchanged, else yyyy-MM-ddT13:00:00.000Z */
function toAngularLicenseDate(
  value: string | undefined | null,
  existing?: string | null,
): string | null {
  if (value == null || !String(value).trim()) return null
  const text = String(value).trim()
  if (text.includes('T')) return text
  const dateOnly = text.slice(0, 10)
  if (existing) {
    const existingDate = existing.slice(0, 10)
    if (existingDate === dateOnly) return existing
  }
  return `${dateOnly}T13:00:00.000Z`
}

/**
 * Build Organization create/update body matching Angular `organization.component` payload.
 */
function buildAngularOrganizationPayload(
  data: OrganizationWriteInput,
  organizationId?: number,
  existing?: Organization,
): Record<string, unknown> {
  const isActive = data.isActive !== false
  const pincodeRaw = data.pincode
  const pincode =
    pincodeRaw == null || String(pincodeRaw).trim() === '' ? null : Number(pincodeRaw)

  const licensesRaw = data.noIssuedLicenses
  const noIssuedLicenses =
    licensesRaw == null || String(licensesRaw).trim() === ''
      ? null
      : Number(licensesRaw)

  const payload: Record<string, unknown> = {
    orgName: asString(data.orgName),
    orgCode: asString(data.orgCode),
    mobileNumber: asString(data.mobileNumber),
    landlineNumber: asString(data.landlineNumber),
    address: asString(data.address),
    countryId: data.countryId ?? existing?.countryId ?? null,
    stateId: data.stateId ?? existing?.stateId ?? null,
    districtId: data.districtId,
    mandal: asString(data.mandal),
    cityId: data.cityId ?? existing?.cityId ?? null,
    pincode,
    email: asString(data.email),
    fax: asNullableString(data.fax),
    googleUrl: asNullableString(data.googleUrl),
    facebookUrl: asNullableString(data.facebookUrl),
    linkedinUrl: asNullableString(data.linkedinUrl),
    licenseFdate: toAngularLicenseDate(
      data.licenseFdate as string | undefined,
      existing?.licenseFdate,
    ),
    licenseTdate: toAngularLicenseDate(
      data.licenseTdate as string | undefined,
      existing?.licenseTdate,
    ),
    noIssuedLicenses: Number.isFinite(noIssuedLicenses as number) ? noIssuedLicenses : null,
    url: asString(data.url),
    isActive,
    reason: isActive ? 'Active' : asString(data.reason).trim() || 'Inactive',
    upload: null,
  }

  if (organizationId != null) {
    payload.organizationId = organizationId
  }
  if (existing?.logoPath) {
    payload.logoPath = existing.logoPath
  }

  return payload
}

// ─── Organization CRUD ────────────────────────────────────────────────────────

export async function listOrganizations(): Promise<Organization[]> {
  return domainList<Organization>(
    ENTITIES.ORGANIZATION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createOrganization(data: Omit<Organization, 'organizationId'>): Promise<Organization> {
  const payload = buildAngularOrganizationPayload(data)
  return domainCreate<Organization>(ENTITIES.ORGANIZATION.name, payload)
}

export async function updateOrganization(
  organizationId: number,
  data: Partial<Omit<Organization, 'organizationId'>>,
  existing?: Organization,
): Promise<Organization> {
  const payload = buildAngularOrganizationPayload(data, organizationId, existing)
  return domainUpdate<Organization>(
    ENTITIES.ORGANIZATION.name,
    ENTITIES.ORGANIZATION.pk,
    organizationId,
    payload,
  )
}

function isAllowedOrganizationLogo(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg'].includes(extension)) return true
  return ['image/png', 'image/jpeg'].includes(file.type.toLowerCase())
}

export async function uploadOrganizationLogo(
  organizationId: number,
  orgCode: string,
  file: File,
): Promise<void> {
  if (!isAllowedOrganizationLogo(file)) {
    throw new Error('Logo must be a .png, .jpg, or .jpeg file only.')
  }
  const formData = new FormData()
  formData.append('organizationId', String(organizationId))
  formData.append('orgCode', orgCode)
  formData.append('organizationLogo', file, file.name)
  await uploadFile(ORG_API.LOGO_UPLOAD, formData)
}

// ─── Geo hierarchy ────────────────────────────────────────────────────────────

export async function listActiveOrganizations(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}

export async function listCountries(): Promise<Country[]> {
  return domainList<Country>(ENTITIES.COUNTRY.name)
}

export async function listStatesByCountry(countryId: number): Promise<State[]> {
  return domainList<State>(ENTITIES.STATE.name, buildQuery({ 'Country.countryId': countryId }))
}

export async function listDistrictsByState(stateId: number): Promise<District[]> {
  return domainList<District>(ENTITIES.DISTRICT.name, buildQuery({ 'State.stateId': stateId }))
}

export async function listCitiesByDistrict(districtId: number): Promise<City[]> {
  return domainList<City>(ENTITIES.CITY.name, buildQuery({ 'District.districtId': districtId }))
}
