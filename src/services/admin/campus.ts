/**
 * Campus CRUD service.
 *
 * API endpoints:
 *   GET    /domain/list/Campus?size=99999&query=order(createdDt=DESC)
 *   POST   /domain/create/Campus
 *   PUT    /domain/update/Campus?query=campusId=={id}
 */

import type { Campus } from '@/types/campus'
import { domainList, domainCreate, domainUpdate, buildQuery } from '../crud'
import { ENTITIES } from '@/config/constants/entities'

type CampusWriteInput = Partial<Omit<Campus, 'campusId'>> & Record<string, unknown>

/** Match Angular campus create/update payload shape. */
function buildAngularCampusPayload(
  data: CampusWriteInput,
  campusId?: number,
): Record<string, unknown> {
  const isActive = data.isActive !== false
  const reason = isActive
    ? 'active'
    : (typeof data.reason === 'string' && data.reason.trim() ? data.reason.trim() : 'inactive')

  const payload: Record<string, unknown> = {
    organizationId: data.organizationId,
    campusName: data.campusName,
    campusCode: data.campusCode,
    countryId: data.countryId ?? null,
    stateId: data.stateId ?? null,
    districtId: data.districtId,
    isActive,
    reason,
  }

  if (campusId != null) {
    payload.campusId = campusId
  }

  return payload
}

// ─── Campus CRUD ──────────────────────────────────────────────────────────────

export async function listCampuses(): Promise<Campus[]> {
  return domainList<Campus>(
    ENTITIES.CAMPUS.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCampuses(): Promise<Campus[]> {
  return domainList<Campus>(ENTITIES.CAMPUS.name, buildQuery({ isActive: true }))
}

export async function createCampus(data: Omit<Campus, 'campusId'>): Promise<Campus> {
  const payload = buildAngularCampusPayload(data)
  return domainCreate<Campus>(ENTITIES.CAMPUS.name, payload)
}

export async function updateCampus(
  campusId: number,
  data: Partial<Omit<Campus, 'campusId'>>,
): Promise<Campus> {
  const payload = buildAngularCampusPayload(data, campusId)
  return domainUpdate<Campus>(ENTITIES.CAMPUS.name, ENTITIES.CAMPUS.pk, campusId, payload)
}
