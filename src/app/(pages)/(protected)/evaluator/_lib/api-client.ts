// fetch-based port of the ExamDigit CrudService, adapted to CollegeERP-Next's
// BFF proxy. Unlike the standalone app, we do NOT attach a Bearer token here —
// the `/api/proxy/*` route reads the JWT from the encrypted iron-session cookie
// and injects `Authorization` server-side. The browser never holds a token.
//
// - Query strings are built by concatenating `paramName + paramValue` pairs
//   exactly like the Angular CrudService (paramName carries its own `=`/`&`).
// - On HTTP 401 (session expired) → redirect to /login (matches the interceptor).

import { MAIN_BASE } from './config'

export type ApiEnvelope<T = unknown> = {
  success: boolean
  statusCode: number
  message?: string
  data: T
}

export type ApiRequestParam = { paramName: string; paramValue: unknown }

// Stored-proc override: matched against a template item by `procKey === item.id`.
export type ProcOverride = { procKey: string; procValue: unknown }
export type ProcTemplateItem = { paramName: string; paramValue: unknown; id: string }

// Upload endpoints omit Content-Type (multipart) so the browser sets the boundary.
const UPLOAD_URLS = ['addfinalevaluationpapers', 'saveFinalExamStdEvaluationpdf']

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Build a query string from CrudService-style request params. */
function buildParams(request: ApiRequestParam[]): string {
  let params = ''
  for (let i = 0; i < request.length; i++) {
    params = params + request[i].paramName + String(request[i].paramValue)
  }
  return params
}

/** Interceptor parity: on 401 the BFF has cleared the session → back to login. */
function handleUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

async function request(
  fullUrl: string,
  init: RequestInit,
  opts: { isUpload?: boolean } = {},
): Promise<Response> {
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) ?? {}) }
  if (!opts.isUpload) headers['Content-Type'] = 'application/json'
  const res = await fetch(fullUrl, { ...init, headers })
  if (res.status === 401) {
    handleUnauthorized()
    throw new ApiError(401, 'Unauthorized')
  }
  return res
}

function isUploadUrl(url: string): boolean {
  return UPLOAD_URLS.some((u) => url.includes(u))
}

/** GET against MAIN_BASE. URL = MAIN_BASE + type + url + '?' + params. */
export async function apiGet<T = unknown>(
  url: string,
  type: string,
  requestParams: ApiRequestParam[],
): Promise<ApiEnvelope<T>> {
  const params = buildParams(requestParams)
  const res = await request(MAIN_BASE + type + url + '?' + params, { method: 'GET' })
  return (await res.json()) as ApiEnvelope<T>
}

/**
 * Stored-proc GET (port of CrudService.dataFromProc). Iterates `template`,
 * overriding an item's value when an override's `procKey === item.id`, then
 * concatenates `paramName + paramValue`. Non-mutating: template is never modified.
 */
export async function apiProc<T = unknown>(
  url: string,
  template: ProcTemplateItem[],
  overrides: ProcOverride[],
): Promise<ApiEnvelope<T>> {
  let params = ''
  for (let i = 0; i < template.length; i++) {
    const item = template[i]
    const match = overrides.filter((x) => x.procKey === item.id)
    const paramValue = match.length > 0 ? match[0].procValue : item.paramValue
    params = params + item.paramName + String(paramValue)
  }
  const res = await request(MAIN_BASE + url + '?' + params, { method: 'GET' })
  return (await res.json()) as ApiEnvelope<T>
}

/** GET returning raw text (responseType: 'text' parity — getBase64String). */
export async function apiGetText(
  url: string,
  type: string,
  requestParams: ApiRequestParam[],
): Promise<string> {
  const params = buildParams(requestParams)
  const res = await request(MAIN_BASE + type + url + '?' + params, { method: 'GET' })
  return await res.text()
}

/** POST against MAIN_BASE. URL = MAIN_BASE + type + url. */
export async function apiPost<T = unknown>(
  url: string,
  type: string,
  body: unknown,
): Promise<ApiEnvelope<T>> {
  const res = await request(
    MAIN_BASE + type + url,
    { method: 'POST', body: JSON.stringify(body) },
    { isUpload: isUploadUrl(url) },
  )
  return (await res.json()) as ApiEnvelope<T>
}

/** PUT against MAIN_BASE. URL = MAIN_BASE + type + url + '?' + param. */
export async function apiPut<T = unknown>(
  url: string,
  type: string,
  param: string,
  body: unknown,
): Promise<ApiEnvelope<T>> {
  const res = await request(MAIN_BASE + type + url + '?' + param, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return (await res.json()) as ApiEnvelope<T>
}

/** PUT with a JSON body and NO query string. URL = MAIN_BASE + url. */
export async function apiPutBody<T = unknown>(url: string, body: unknown): Promise<ApiEnvelope<T>> {
  const res = await request(MAIN_BASE + url, { method: 'PUT', body: JSON.stringify(body) })
  return (await res.json()) as ApiEnvelope<T>
}

/** POST multipart FormData (upload path). Content-Type omitted for the boundary. */
export async function apiPostForm<T = unknown>(
  url: string,
  formData: FormData,
): Promise<ApiEnvelope<T>> {
  const res = await request(MAIN_BASE + url, { method: 'POST', body: formData }, { isUpload: true })
  return (await res.json()) as ApiEnvelope<T>
}
