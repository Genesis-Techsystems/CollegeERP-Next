# Data Fetching Architecture

> Status: Proxy audit completed 2026-03-29. Architecture is production-ready — no critical issues.
> All exam pages use `'use client'` + TanStack Query. The BFF proxy is the single fetch boundary.

---

## Overview: Three Fetch Contexts

```
Client Component (browser)
    ↓  fetch /api/proxy/domain/list/ExamMaster
Next.js BFF Proxy (/api/proxy/[...path]/route.ts)
    ↓  fetch Spring Boot + JWT (from Iron Session)
Spring Boot REST API
```

There are three ways data can be fetched in this project:

| Context | When to use | Example |
|---|---|---|
| **Client → BFF proxy** | Any interactive page (CRUD, forms) | `domainList`, `getAllRecords`, raw `fetch` in services |
| **React Server Component → Spring Boot** | Server-only initial renders (rare; only nav tree today) | `springGetUserDetails()` in `(protected)/layout.tsx` |
| **Server Action → Spring Boot** | Not currently used; future option for simple mutations | — |

---

## The BFF Proxy

**File:** `src/app/api/proxy/[...path]/route.ts`

The catch-all proxy forwards all requests to Spring Boot with the Iron Session JWT:

```
GET  /api/proxy/domain/list/ExamMaster?query=…  →  {SPRING_BOOT}/domain/list/ExamMaster?query=…
POST /api/proxy/domain/create/ExamMaster        →  {SPRING_BOOT}/domain/create/ExamMaster
PUT  /api/proxy/domain/update/ExamMaster/5      →  {SPRING_BOOT}/domain/update/ExamMaster/5
POST /api/proxy/getAllRecords/{procName}?…       →  {SPRING_BOOT}/getAllRecords/{procName}?…
```

**What the proxy handles:**
- Validates `session.jwt` and `session.user` before every request — returns 401 if missing
- Injects `Authorization: Bearer {jwt}` (JWT never exposed to browser)
- Forwards GET query strings, POST/PUT/PATCH bodies, multipart `Content-Type` with boundary
- Destroys session on Spring Boot 401 (syncs session lifecycle)
- Returns Spring Boot's exact HTTP status code to the client

**Known limitation (low priority):** The proxy always parses responses as JSON (`upstreamRes.json()`). If a Spring Boot endpoint ever returns binary (PDF, image), the proxy will fail. If file download endpoints are added, check `Content-Type` before parsing.

---

## Which Fetch Helper to Use

### Standard domain CRUD → `domainList` / `domainCreate` / `domainUpdate` / `domainSoftDelete`

Use for any `domain/list`, `domain/create`, `domain/update`, `domain/softdelete` endpoint.

```typescript
import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud.service'

// List (GET /api/proxy/domain/list/ExamMaster?query=…&sort=…)
return domainList<ExamMaster>('ExamMaster', buildQuery({ 'Course.courseId': courseId }))

// Create (POST /api/proxy/domain/create/ExamMaster)
return domainCreate<ExamMaster>('ExamMaster', payload)

// Update (PUT /api/proxy/domain/update/ExamMaster/5)
return domainUpdate<ExamMaster>('ExamMaster', 'examId', 5, payload)

// Soft delete (DELETE /api/proxy/domain/softdelete/ExamMaster/5)
return domainSoftDelete('ExamMaster', 'examId', 5)
```

**Do not** call `fetch('/api/proxy/domain/list/…')` directly — `domainList` normalises the single-object-vs-array edge case where Spring Boot returns a bare object when exactly one record matches.

### Stored procedures → `getAllRecords`

Use for `GET /api/proxy/getAllRecords/{procName}` endpoints.

```typescript
import { getAllRecords } from '@/services/crud.service'

const data = await getAllRecords<{ result: SomeRow[][] }>(
  's_get_exam_filters_bycode',
  { in_flag: 'univ_exam_filters', in_loginuser_empid: empId },
)
// data is body.data — the payload, not the full envelope
const rows = data?.result?.[0] ?? []
```

### Custom Spring Boot endpoints → raw `fetch`

For dedicated endpoints that don't fit `domain/list` or `getAllRecords` (e.g. `POST /examtimetabledetails`, `POST /exammarkssetup`):

```typescript
const res = await fetch(`/api/proxy/${SOME_ENDPOINT}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
if (!res.ok) {
  const body = await res.json().catch(() => null)
  throw parseApiError(res, body)
}
const body = await res.json()
if (!body.success || body.statusCode !== 200) {
  throw new AppError('API_ERROR', body.message ?? 'Operation failed')
}
```

Always use `||` (not `&&`) in the error check — see service-layer.md for the `&&` bug explanation.

---

## TanStack Query Conventions

All client-side data fetching uses TanStack Query v5. Services are the `queryFn` bodies.

### Query key structure

```
[domain, operation, params-object]
```

Examples:
- `['exam-master', 'list', { universityId, courseId }]`
- `['college-filters', orgId, empId]`
- `['regulations', courseId]`

Using a params object (not positional args) means adding a new filter param does not silently break cache invalidation.

### staleTime for reference data

Reference data that rarely changes should use `staleTime` to avoid redundant fetches:

```typescript
useQuery({
  queryKey: ['college-filters', orgId, empId],
  queryFn: () => getCollegeFilters(orgId, empId),
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

Reasonable `staleTime` values:
- `5 min` — college filters, regulations (change at semester boundaries)
- `30 min` — general detail lookups, course year lists
- `0` (default) — exam records, marks, timetable (user edits these)

### Cache invalidation after mutations

Use the prefix key (without params) to invalidate all variants:

```typescript
useMutation({
  mutationFn: createExamMaster,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['exam-master', 'list'] })
  },
})
```

The parameterized variant `['exam-master', 'list', { universityId, courseId }]` is matched by prefix.

---

## Security Model

The proxy audit confirmed the following are correct and must not change:

1. **JWT never sent to the browser.** Iron Session stores the JWT in an encrypted HTTP-only cookie. The client receives only a `SessionUser` object (no token).
2. **Every proxy request validates the session** before forwarding. There is no bypass.
3. **Spring Boot 401 destroys the session** — stale tokens cannot be reused.
4. **Login is rate-limited** (10 requests/minute per IP).
5. **Multipart uploads work correctly.** The proxy preserves the `Content-Type` boundary parameter.

---

## When to Use React Server Components

The `(protected)/layout.tsx` server layout already fetches the nav tree directly from Spring Boot (skipping the proxy round-trip). This is the only RSC fetch today.

**Could other pages use RSC?** Yes — for read-only pages, server-fetching the initial data would eliminate one client round-trip (~50–200 ms). But:
- All exam pages are `'use client'` because they use AG Grid, TanStack Query, and forms.
- Making them hybrid (RSC wrapper + client child) adds complexity for marginal gain.
- The current pattern is sound and does not need to change.

**If you add a new read-only page** (dashboard stats, reports) — consider fetching initial data in a Server Component and passing it as props to a client child. This is opt-in; do not retrofit existing pages.

---

## What Not to Do

```typescript
// ❌ Direct Spring Boot fetch from client — leaks nothing but the proxy exists for a reason
fetch(`${process.env.SPRING_BOOT_URL}/domain/list/…`)

// ❌ resultList does not exist — domainList normalises the Spring Boot envelope for you
const exams = json.data?.resultList ?? []

// ❌ Raw fetch bypasses normalisation and error handling for standard endpoints
const res = await fetch('/api/proxy/domain/list/ExamMaster?…')

// ❌ && instead of || — silently passes when success:false but statusCode:200
if (!body.success && body.statusCode !== 200) { throw … }
```
