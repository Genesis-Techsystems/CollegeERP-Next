/**
 * Generic HTTP client for server domain entities.
 *
 * Domain endpoints:
 *   GET    /domain/list/{Entity}?size=99999&query={query}
 *   POST   /domain/create/{Entity}
 *   PUT    /domain/update/{Entity}?query={pk}=={value}
 *   GET    /getAllRecords/{procName}?{params}
 *
 * Usage — class instance:
 *   import { crud } from '@/services/crud'
 *   const items = await crud.list<Item>('ItemEntity', buildQuery({ isActive: true }))
 *
 * Usage — standalone functions (backward-compatible):
 *   import { domainList, buildQuery } from '@/services/crud'
 */

import { AppError, parseApiError } from '@/lib/errors'
import type { ApiResponse } from '@/types/api'
import { DOMAIN } from '@/config/constants/api'

export { buildQuery } from './query'
export type { OrderBy } from './query'

// ─── Internal types ───────────────────────────────────────────────────────────

interface PageResponse<T> {
  resultList: T[] | T | null
  totalCount: number
}

/** Normalizes Spring list payloads: `data`, top-level `resultList`, `resultList` page, or `Page.content`. */
function domainListRows<T>(body: ApiResponse<unknown> & { resultList?: unknown }): T[] {
  const raw = body.data
  if (raw == null) {
    if (Array.isArray(body.resultList)) return body.resultList as T[]
    return []
  }
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'resultList' in raw) {
    const page = raw as PageResponse<T>
    const list = page.resultList
    if (list == null) return []
    if (Array.isArray(list)) return list
    return [list as unknown as T]
  }
  if (raw && typeof raw === 'object' && 'content' in raw) {
    const content = (raw as { content?: unknown }).content
    if (Array.isArray(content)) return content as T[]
  }
  return [raw as T]
}

/** Strip accidental `getAllRecords/` prefix — `getAllRecords()` adds it via DOMAIN.PROC. */
function normalizeProcName(procName: string): string {
  return procName.startsWith('getAllRecords/') ? procName.slice('getAllRecords/'.length) : procName
}

/** Stable key for deduping stored-proc GETs (param order–independent). */
function procGetCacheKey(procName: string, params: Record<string, string | number>): string {
  const keys = Object.keys(params).sort()
  const parts = keys.map((k) => `${k}=${String(params[k])}`)
  return `${procName}::${parts.join('&')}`
}

type ProcGetCacheEntry = {
  promise?: Promise<unknown>
  /** JSON snapshot so cached reads do not share mutable objects across callers */
  dataJson?: string
  freshUntil?: number
}

// ─── CrudService class ────────────────────────────────────────────────────────

class CrudService {
  private readonly base = '/api/proxy'

  /**
   * In-flight dedupe for identical `domain/list` URLs (parallel page loads + Strict Mode).
   * Cleared when the request settles; does not cache completed responses.
   */
  private readonly listInflight = new Map<string, Promise<unknown[]>>()

  /**
   * Dedupes identical `getAllRecords` URLs: shares one in-flight request, and briefly
   * reuses the last success (exam filter cascades + React Strict Mode duplicate effects).
   */
  private readonly procGetDedupe = new Map<string, ProcGetCacheEntry>()
  private static readonly PROC_GET_FRESH_MS = 900
  private toQueryString(params?: Record<string, string | number>): string {
    if (!params || Object.keys(params).length === 0) return ''
    const searchParams = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    )
    return `?${searchParams}`
  }

  // ── List ──────────────────────────────────────────────────────────────────

  /**
   * Fetch all records for an entity, optionally filtered.
   *
   * @param listPath - e.g. {@link DOMAIN.LIST} or {@link DOMAIN.CMS_LIST}
   * @param entity - entity class name (e.g. 'ExamSession')
   * @param query  - optional filter/sort string, built with {@link buildQuery}
   */
  private async listAtPath<T>(listPath: string, entity: string, query?: string): Promise<T[]> {
    const url = query
      ? `${this.base}/${listPath}/${entity}?size=99999&query=${encodeURIComponent(query)}`
      : `${this.base}/${listPath}/${entity}?size=99999`

    let inflight = this.listInflight.get(url) as Promise<T[]> | undefined
    if (!inflight) {
      inflight = (async (): Promise<T[]> => {
        const res = await fetch(url, { cache: 'no-store', credentials: 'include' })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw parseApiError(res, body)
        }

        const body = (await res.json()) as ApiResponse<unknown> & { resultList?: unknown }

        if (!body.success) {
          const queryPart = query ? ` (query: ${query})` : ''
          throw new AppError(
            'API_ERROR',
            body.message
              ? `Failed to list ${entity}${queryPart}: ${body.message}`
              : `Failed to list ${entity}${queryPart}`,
          )
        }

        return domainListRows<T>(body)
      })().finally(() => {
        this.listInflight.delete(url)
      })
      this.listInflight.set(url, inflight)
    }

    return inflight
  }

  /**
   * Fetch all records for an entity, optionally filtered.
   *
   * @param entity - entity class name (e.g. 'ExamSession')
   * @param query  - optional filter/sort string, built with {@link buildQuery}
   */
  async list<T = Record<string, unknown>>(entity: string, query?: string): Promise<T[]> {
    return this.listAtPath<T>(DOMAIN.LIST, entity, query)
  }

  /**
   * CMS-prefixed domain list (`/cms/domain/list/{Entity}`) — matches Spring paths like staff User listing.
   */
  async listCms<T>(entity: string, query?: string): Promise<T[]> {
    return this.listAtPath<T>(DOMAIN.CMS_LIST, entity, query)
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * Create a new entity record.
   *
   * @param entity - entity class name
   * @param data   - fields to create (omit the primary key — server assigns it)
   */
  async create<T>(entity: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.base}/${DOMAIN.CREATE}/${entity}`, {
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

    return body.data as T
  }

  /** POST `cms/domain/create/{Entity}` — mirrors {@link create} for CMS-prefixed Spring apps. */
  async createCms<T>(entity: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.base}/${DOMAIN.CMS_CREATE}/${entity}`, {
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
      throw new AppError('API_ERROR', body.message ?? `Failed to create ${entity} (cms)`)
    }

    return body.data as T
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * Update an entity record by primary key.
   *
   * @param entity   - entity class name
   * @param pkField  - primary key field name (e.g. 'examSessionId')
   * @param pkValue  - primary key value
   * @param data     - fields to update
   */
  async update<T>(
    entity: string,
    pkField: string,
    pkValue: string | number,
    data: unknown,
  ): Promise<T> {
    const res = await fetch(
      `${this.base}/${DOMAIN.UPDATE}/${entity}?query=${pkField}==${pkValue}`,
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

    return body.data as T
  }

  /** PUT `cms/domain/update/{Entity}?query={pkField}=={pkValue}` — same contract as {@link update}. */
  async updateCms<T>(
    entity: string,
    pkField: string,
    pkValue: string | number,
    data: unknown,
  ): Promise<T> {
    const res = await fetch(
      `${this.base}/${DOMAIN.CMS_UPDATE}/${entity}?query=${pkField}==${pkValue}`,
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
      throw new AppError('API_ERROR', body.message ?? `Failed to update ${entity} (cms)`)
    }

    return body.data as T
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────

  /**
   * Deactivate an entity record (sets `isActive: false`).
   * Data is preserved on the server; the record is hidden from active queries.
   */
  async softDelete(entity: string, pkField: string, pkValue: string | number): Promise<void> {
    await this.update(entity, pkField, pkValue, { isActive: false })
  }

  // ── Stored Procedure ──────────────────────────────────────────────────────

  /**
   * Call a server-side stored procedure.
   *
   * Used for complex cross-table queries that can't be expressed as simple list calls.
   *
   * @param procName - procedure name (e.g. 's_get_collegewisedetails_bycode')
   * @param params   - query parameters passed to the procedure
   * @returns the raw `data` field from the response
   */
  async getAllRecords<T>(procName: string, params: Record<string, string | number>): Promise<T> {
    procName = normalizeProcName(procName)
    const key = procGetCacheKey(procName, params)
    const now = Date.now()
    const bucket = this.procGetDedupe.get(key) ?? {}

    if (bucket.dataJson != null && bucket.freshUntil != null && now < bucket.freshUntil) {
      try {
        return JSON.parse(bucket.dataJson) as T
      } catch {
        this.procGetDedupe.delete(key)
      }
    }

    if (bucket.promise) {
      return bucket.promise as Promise<T>
    }

    const searchParams = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    )

    const promise = (async (): Promise<T> => {
      const res = await fetch(`${this.base}/${DOMAIN.PROC}/${procName}?${searchParams}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw parseApiError(res, body)
      }

      const body: ApiResponse<T> = await res.json()

      if (!body.success) {
        throw new AppError('API_ERROR', body.message ?? `Failed to call ${procName}`)
      }

      const data = body.data as T
      let snapshot: string
      try {
        snapshot = JSON.stringify(data)
      } catch {
        snapshot = ''
      }
      if (snapshot) {
        this.procGetDedupe.set(key, {
          dataJson: snapshot,
          freshUntil: Date.now() + CrudService.PROC_GET_FRESH_MS,
        })
      }
      return data
    })()

    this.procGetDedupe.set(key, { ...bucket, promise })

    try {
      return await promise
    } finally {
      const latest = this.procGetDedupe.get(key)
      if (latest?.promise === promise) {
        latest.promise = undefined
        if (!latest.dataJson) this.procGetDedupe.delete(key)
      }
    }
  }

  // ── Proxy Helpers ─────────────────────────────────────────────────────────

  /**
   * GET request to a non-domain API endpoint.
   *
   * @param path   - API path constant (e.g. EXAM_API.EXAM_TIMETABLE_DETAILS)
   * @param params - optional query parameters
   */
  async fetchDetails<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const query = this.toQueryString(params)
    let attemptedPath = path
    let res = await fetch(`${this.base}/${attemptedPath}${query}`)
    if (res.status === 404 && /[A-Z]/.test(path)) {
      attemptedPath = path.toLowerCase()
      res = await fetch(`${this.base}/${attemptedPath}${query}`)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw parseApiError(res, body)
    }

    const body: ApiResponse<T> = await res.json()
    if (!body.success) {
      throw new AppError('API_ERROR', body.message ?? `GET ${path} failed`)
    }

    return body.data as T
  }

  /**
   * GET request with path-segment id — Angular `crudService.list(url, id)`.
   *
   * @example GET /api/proxy/timingsets/340
   */
  async fetchDetailsById<T>(path: string, id: string | number): Promise<T> {
    let attemptedPath = path
    let res = await fetch(`${this.base}/${attemptedPath}/${id}`)
    if (res.status === 404 && /[A-Z]/.test(path)) {
      attemptedPath = path.toLowerCase()
      res = await fetch(`${this.base}/${attemptedPath}/${id}`)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw parseApiError(res, body)
    }

    const body: ApiResponse<T> = await res.json()
    if (!body.success) {
      throw new AppError('API_ERROR', body.message ?? `GET ${path}/${id} failed`)
    }

    return body.data as T
  }

  /**
   * POST JSON to a non-domain API endpoint.
   *
   * @param path - API path constant
   * @param data - request payload
   */
  async postDetails<T = void>(path: string, data: unknown): Promise<T> {
    const res = await fetch(`${this.base}/${path}`, {
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
      throw new AppError('API_ERROR', body.message ?? `POST ${path} failed`)
    }

    return body.data as T
  }

  /**
   * PUT JSON to a non-domain API endpoint.
   * Use this for custom PUT paths that are NOT the standard domain/update/{Entity} pattern.
   *
   * @param path   - API path constant (e.g. EXAM_EVAL_API.UPDATE_EVAL_ASSIGNMENTS)
   * @param data   - request payload
   * @param params - optional query-string params appended as ?key=value&...
   */
  async putDetails<T = void>(
    path: string,
    data: unknown,
    params?: Record<string, string | number>,
  ): Promise<T> {
    let url = `${this.base}/${path}`
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      )
      url += `?${qs}`
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw parseApiError(res, body)
    }

    // Many PUT endpoints return 200 with no body or an empty success wrapper
    const text = await res.text()
    if (!text) return undefined as T
    const body = JSON.parse(text) as ApiResponse<T>
    if (body?.success === false) {
      throw new AppError('API_ERROR', body.message ?? `PUT ${path} failed`)
    }

    return (body?.data ?? undefined) as T
  }

  /**
   * Upload a file to an API endpoint (multipart/form-data).
   * Do NOT set Content-Type — fetch sets it automatically with the correct boundary.
   *
   * @param path     - API path constant (e.g. EXAM_API.UPLOAD_EXAM_NOTIFICATION)
   * @param formData - FormData with files and metadata
   */
  async uploadFile(path: string, formData: FormData): Promise<void> {
    const res = await fetch(`${this.base}/${path}`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw parseApiError(res, body)
    }

    const body = await res.json().catch(() => null)
    if (body?.success === false) {
      throw new AppError('API_ERROR', body.message ?? `Upload to ${path} failed`)
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const crud = new CrudService()

// ─── Backward-compatible standalone exports ───────────────────────────────────

export const domainList = <T = Record<string, unknown>>(entity: string, query?: string): Promise<T[]> =>
  crud.list<T>(entity, query)

export const cmsDomainList = <T>(entity: string, query?: string): Promise<T[]> =>
  crud.listCms<T>(entity, query)

export const domainCreate = <T>(entity: string, data: unknown): Promise<T> =>
  crud.create<T>(entity, data)

export const cmsDomainCreate = <T>(entity: string, data: unknown): Promise<T> =>
  crud.createCms<T>(entity, data)

export const domainUpdate = <T>(
  entity: string,
  pkField: string,
  pkValue: string | number,
  data: unknown,
): Promise<T> => crud.update<T>(entity, pkField, pkValue, data)

export const cmsDomainUpdate = <T>(
  entity: string,
  pkField: string,
  pkValue: string | number,
  data: unknown,
): Promise<T> => crud.updateCms<T>(entity, pkField, pkValue, data)

export const domainSoftDelete = (
  entity: string,
  pkField: string,
  pkValue: string | number,
): Promise<void> => crud.softDelete(entity, pkField, pkValue)

export const getAllRecords = <T>(
  procName: string,
  params: Record<string, string | number>,
): Promise<T> => crud.getAllRecords<T>(procName, params)

export const fetchDetails = <T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> => crud.fetchDetails<T>(path, params)

export const fetchDetailsById = <T>(path: string, id: string | number): Promise<T> =>
  crud.fetchDetailsById<T>(path, id)

export const postDetails = <T = void>(path: string, data: unknown): Promise<T> =>
  crud.postDetails<T>(path, data)

export const putDetails = <T = void>(
  path: string,
  data: unknown,
  params?: Record<string, string | number>,
): Promise<T> => crud.putDetails<T>(path, data, params)

export const uploadFile = (path: string, formData: FormData): Promise<void> =>
  crud.uploadFile(path, formData)
