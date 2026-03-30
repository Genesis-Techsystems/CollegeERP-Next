/**
 * Generic CRUD service for Spring Boot domain entities.
 *
 * All Spring Boot domain entities follow a consistent REST pattern:
 *   GET    /domain/list/{Entity}?query={queryDSL}
 *   POST   /domain/create/{Entity}
 *   PUT    /domain/update/{Entity}?query={pkField}=={pkValue}
 *   DELETE /domain/delete/{Entity}?query={pkField}=={pkValue}
 *
 * Use this service for any straightforward CRUD operation. For complex
 * operations (file uploads, stored procs, multi-step chains) use a
 * domain-specific service that calls these functions internally.
 *
 * @example — simple list
 *   const sessions = await domainList<ExamSession>('ExamSession', buildQuery({ isActive: true }))
 *
 * @example — with ordering
 *   const years = await domainList<CourseYear>(
 *     'CourseYear',
 *     buildQuery({ 'Course.courseId': courseId, isActive: true }, { field: 'sortOrder', direction: 'ASC' })
 *   )
 *
 * @example — create
 *   const created = await domainCreate<ExamSession>('ExamSession', formValues)
 *
 * @example — update
 *   const updated = await domainUpdate<ExamSession>('ExamSession', 'examSessionId', id, formValues)
 *
 * @example — soft delete
 *   await domainSoftDelete('ExamSession', 'examSessionId', id)
 */

import { AppError, parseApiError } from '@/lib/errors'
import type { ApiResponse } from '@/types/api'

// ─── Query Builder ────────────────────────────────────────────────────────────

/**
 * Build a Spring Boot QueryDSL query string.
 *
 * Conditions are ANDed together. Values are compared with `==`.
 * Optional `orderBy` appends `.order(field=DIR)`.
 *
 * @example
 *   buildQuery({ 'Course.courseId': 5, isActive: true })
 *   // → "Course.courseId==5.and.isActive==true"
 *
 *   buildQuery({ examId: 1 }, { field: 'sortOrder', direction: 'ASC' })
 *   // → "examId==1.order(sortOrder=ASC)"
 */
export function buildQuery(
  conditions: Record<string, string | number | boolean>,
  orderBy?: { field: string; direction: 'ASC' | 'DESC' },
): string {
  const parts = Object.entries(conditions)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => `${key}==${value}`)

  let query = parts.join('.and.')

  if (orderBy) {
    query += (query ? '.' : '') + `order(${orderBy.field}=${orderBy.direction})`
  }

  return query
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List domain entities, optionally filtered by a QueryDSL query string.
 *
 * Spring Boot endpoint: GET /domain/list/{entity}?query={query}
 *
 * @param entity  - Spring Boot entity class name (e.g. 'ExamSession')
 * @param query   - Optional QueryDSL string. Build with {@link buildQuery}.
 * @returns Array of matching records (empty array if none found)
 * @throws AppError 'UNAUTHORIZED' if session expired
 * @throws AppError 'API_ERROR' if Spring Boot returns success: false
 * @throws AppError 'FETCH_FAILED' on network error
 */
export async function domainList<T>(
  entity: string,
  query?: string,
): Promise<T[]> {
  // Always request all records — Spring Boot defaults to 100 without size param.
  const url = query
    ? `/api/proxy/domain/list/${entity}?size=99999&query=${encodeURIComponent(query)}`
    : `/api/proxy/domain/list/${entity}?size=99999`

  const res = await fetch(url)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body = await res.json()

  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? `Failed to list ${entity}`)
  }

  // Spring Boot domain/list returns ApiResponse<PageResponse> where PageResponse
  // wraps the records in a `resultList` field alongside pagination metadata.
  // Shape: { success, data: { resultList: T[], totalCount, ... }, paginated: true }
  const raw = body.data

  if (raw == null) return []

  // PageResponse: { resultList: T[], totalCount, ... } — the normal domain/list case
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'resultList' in raw) {
    const list = (raw as { resultList?: T[] | T | null }).resultList
    if (list == null) return []
    if (Array.isArray(list)) return list
    // Single-object quirk inside resultList
    return [list as unknown as T]
  }

  // Direct array (non-standard endpoints that skip PageResponse)
  if (Array.isArray(raw)) return raw as T[]

  // Single entity object (domain/get pattern or 1-result Spring Boot quirk)
  return [raw as T]
}

/**
 * Fetch a single domain entity matching the given query.
 * Returns the first matching record, or null if none found.
 *
 * Spring Boot endpoint: GET /domain/list/{entity}?query={query}
 *
 * @param entity - Spring Boot entity class name
 * @param query  - QueryDSL query string (use buildQuery)
 */
export async function domainGet<T>(
  entity: string,
  query: string,
): Promise<T | null> {
  const results = await domainList<T>(entity, query)
  return results[0] ?? null
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new domain entity.
 *
 * Spring Boot endpoint: POST /domain/create/{entity}
 *
 * @param entity - Spring Boot entity class name
 * @param data   - Entity fields to create. ID should be omitted (auto-generated).
 * @returns The created entity (with server-assigned ID)
 * @throws AppError on failure
 */
export async function domainCreate<T>(
  entity: string,
  data: unknown,
): Promise<T> {
  const res = await fetch(`/api/proxy/domain/create/${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body: ApiResponse<T> = await res.json()

  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? `Failed to create ${entity}`)
  }

  return body.data
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a domain entity identified by its primary key.
 *
 * Spring Boot endpoint: PUT /domain/update/{entity}?query={pkField}=={pkValue}
 *
 * @param entity   - Spring Boot entity class name
 * @param pkField  - Primary key field name (e.g. 'examSessionId')
 * @param pkValue  - Primary key value
 * @param data     - Updated fields (full or partial object)
 * @returns The updated entity
 * @throws AppError on failure
 */
export async function domainUpdate<T>(
  entity: string,
  pkField: string,
  pkValue: string | number,
  data: unknown,
): Promise<T> {
  const res = await fetch(
    `/api/proxy/domain/update/${entity}?query=${pkField}==${pkValue}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body: ApiResponse<T> = await res.json()

  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? `Failed to update ${entity}`)
  }

  return body.data
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Soft-delete a domain entity by setting `isActive: false`.
 *
 * Preferred over hard delete for most Spring Boot entities. Data is preserved
 * in the database; the record is hidden from active queries.
 *
 * @param entity   - Spring Boot entity class name
 * @param pkField  - Primary key field name
 * @param pkValue  - Primary key value
 * @throws AppError on failure
 */
export async function domainSoftDelete(
  entity: string,
  pkField: string,
  pkValue: string | number,
): Promise<void> {
  await domainUpdate(entity, pkField, pkValue, { isActive: false })
}

/**
 * Hard-delete a domain entity.
 *
 * ⚠️ Use only when the entity truly supports hard delete.
 * Prefer {@link domainSoftDelete} for most cases.
 *
 * Spring Boot endpoint: DELETE /domain/delete/{entity}?query={pkField}=={pkValue}
 *
 * @param entity   - Spring Boot entity class name
 * @param pkField  - Primary key field name
 * @param pkValue  - Primary key value
 * @throws AppError on failure
 */
export async function domainDelete(
  entity: string,
  pkField: string,
  pkValue: string | number,
): Promise<void> {
  const res = await fetch(
    `/api/proxy/domain/delete/${entity}?query=${pkField}==${pkValue}`,
    { method: 'DELETE' },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
}

// ─── Stored Procedures ────────────────────────────────────────────────────────

/**
 * Call a Spring Boot stored procedure via the getAllRecords endpoint.
 *
 * Used for complex cross-table queries that can't be expressed as simple domain
 * CRUD operations (e.g. college-wise filter data, aggregated reports).
 *
 * Spring Boot endpoint: GET /getAllRecords/{procName}?{params}
 *
 * @param procName - Stored procedure / view name (e.g. 's_get_collegewisedetails_bycode')
 * @param params   - Query parameters passed to the stored procedure
 * @returns The raw `data` field from Spring Boot's response envelope
 * @throws AppError on failure
 */
export async function getAllRecords<T>(
  procName: string,
  params: Record<string, string | number>,
): Promise<T> {
  const searchParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  )

  const res = await fetch(`/api/proxy/getAllRecords/${procName}?${searchParams}`)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }

  const body: ApiResponse<T> = await res.json()

  if (!body.success) {
    throw new AppError('API_ERROR', body.message ?? `Failed to call ${procName}`)
  }

  return body.data
}
