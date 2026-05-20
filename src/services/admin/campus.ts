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

// ─── Campus CRUD ──────────────────────────────────────────────────────────────

/**
 * List all campuses ordered by creation date descending.
 * GET /domain/list/Campus
 */
export async function listCampuses(): Promise<Campus[]> {
  return domainList<Campus>(
    ENTITIES.CAMPUS.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCampuses(): Promise<Campus[]> {
  return domainList<Campus>(ENTITIES.CAMPUS.name, buildQuery({ isActive: true }))
}

/**
 * Create a new campus.
 * POST /domain/create/Campus
 */
export async function createCampus(data: Omit<Campus, 'campusId'>): Promise<Campus> {
  return domainCreate<Campus>(ENTITIES.CAMPUS.name, data)
}

/**
 * Update an existing campus.
 * PUT /domain/update/Campus?query=campusId=={id}
 */
export async function updateCampus(
  campusId: number,
  data: Partial<Omit<Campus, 'campusId'>>,
): Promise<Campus> {
  return domainUpdate<Campus>(ENTITIES.CAMPUS.name, ENTITIES.CAMPUS.pk, campusId, data)
}
