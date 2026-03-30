# API Proxy Flow

> File: `src/app/api/proxy/[...path]/route.ts`
>
> All client-side Spring Boot calls MUST go through this proxy.
> The proxy injects the JWT from the Iron Session — the browser never sees the JWT.

---

## The One Rule

```
// WRONG — exposes Spring Boot directly, no auth header
fetch('http://localhost:8080/domain/list/ExamMaster?...')

// CORRECT — proxy handles auth, Spring Boot URL stays server-only
fetch('/api/proxy/domain/list/ExamMaster?...')
```

---

## Step-by-Step Proxy Flow

### 1. Session validation

```typescript
const session = await getIronSession<IronSessionData>(await cookies(), sessionOptions)
if (!session.jwt || !session.user) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
}
```

No JWT in session = no request forwarded. Period. The 401 tells the client to re-authenticate.

### 2. Build target URL

```typescript
const { path } = await context.params   // path is string[] from [...path]
const queryString = request.nextUrl.search
const targetUrl = `${process.env.SPRING_API_URL}/${path.join('/')}${queryString}`
```

Example: `fetch('/api/proxy/domain/list/ExamMaster?size=99999&query=...')` becomes:
```
http://localhost:8080/domain/list/ExamMaster?size=99999&query=...
```

### 3. Content-Type detection

The proxy must distinguish multipart (file uploads) from JSON:

```typescript
const incomingContentType = request.headers.get('content-type') ?? ''
const isMultipart = incomingContentType.includes('multipart/form-data')
```

**Multipart:** Forward `Content-Type` as-is (must preserve the `boundary=` parameter). Body read with `request.arrayBuffer()`.

**Everything else:** Force `Content-Type: application/json`. Body read with `request.text()`.

### 4. Forward request

```typescript
upstreamRes = await fetch(targetUrl, {
  method,
  headers: {
    Authorization: `Bearer ${session.jwt}`,
    ...(isMultipart
      ? { 'Content-Type': incomingContentType }  // preserve boundary
      : { 'Content-Type': 'application/json' }),
  },
  body: hasBody
    ? (isMultipart ? await request.arrayBuffer() : await request.text())
    : undefined,
})
```

Supported methods: GET, POST, PUT, DELETE. All four are exported from the route handler.

### 5. 401 from Spring Boot

```typescript
if (upstreamRes.status === 401) {
  session.destroy()
  return NextResponse.json({ message: 'Session expired' }, { status: 401 })
}
```

If Spring Boot rejects the JWT (expired or invalid), the proxy destroys the Iron Session and returns 401 to the client. Client components should redirect to `/login` on receiving 401.

### 6. Return response

```typescript
const data = await upstreamRes.json().catch(() => null)
return NextResponse.json(data, { status: upstreamRes.status })
```

The Spring Boot response body is returned as-is with the original status code. JWT is never included.

---

## What the Proxy Does NOT Do

- **No data transformation** — response body is passed through unchanged
- **No caching** — every request hits Spring Boot (caching is TanStack Query's job on the client)
- **No retry logic** — one attempt; network errors return HTTP 502 `{ message: 'Service unavailable' }`
- **No request logging** — add logging middleware if needed
- **No response body validation** — the proxy trusts Spring Boot's response shape
- **No PATCH support** — only GET, POST, PUT, DELETE are exported (add `export const PATCH = proxyRequest` if needed)

---

## File Uploads

File uploads use `multipart/form-data`. The proxy handles this by:

1. Detecting `Content-Type: multipart/form-data; boundary=...` from the incoming request
2. Forwarding the `Content-Type` header **including the boundary** to Spring Boot
3. Reading the body with `request.arrayBuffer()` instead of `request.text()` to preserve binary data

**Why this matters:** If you stripped the `Content-Type` and set `application/json`, Spring Boot would not be able to parse the multipart body. If you read the body as text, binary file data would be corrupted.

Example from `ExamMasterModal.tsx`:

```typescript
const formData = new FormData()
formData.append('examId ', String(savedExam.examId)) // trailing space — see quirk below
formData.append('notificationFilePath', notificationFile)

await fetch('/api/proxy/examnotificationupload', {
  method: 'POST',
  body: formData,
  // Do NOT set Content-Type manually — browser sets it with boundary
})
```

---

## Known Quirk: Trailing Space in `"examId "`

```typescript
formData.append('examId ', String(savedExam.examId)) // note the trailing space
```

The FormData key is `"examId "` (with a trailing space character). This is **intentional** — it matches what the Angular frontend sends, and Spring Boot's multipart parser expects exactly this key name.

Do not remove the trailing space. If the key is changed to `"examId"` (no space), the file upload endpoint will not correctly associate the files with the exam record.

This is documented in `PROGRESS.md` under "Known Deferred Bugs" as a Spring Boot-side quirk that cannot be fixed without modifying the frozen backend.

---

## 401 Handling

Two scenarios trigger a 401 from the proxy:

**Scenario A — No Iron Session:**
```
Client request → proxy
proxy: no session.jwt → return 401 immediately (Spring Boot never called)
```

**Scenario B — Spring Boot rejects JWT:**
```
Client request → proxy
proxy: session exists → forwards to Spring Boot
Spring Boot: JWT expired or invalid → 401
proxy: session.destroy() → return 401 to client
```

In both cases, the client receives `{ message: 'Session expired' | 'Unauthorized' }` with status 401. Client components should handle this by redirecting to `/login`.

---

## Environment Variables Required

| Variable | Required | Description |
|---|---|---|
| `SPRING_API_URL` | Yes | Spring Boot base URL, e.g. `http://localhost:8080`. Server-only — never exposed to browser. Do NOT use `NEXT_PUBLIC_` prefix. |
| `SESSION_SECRET` | Yes | iron-session encryption key. Must be 32+ characters. Generate with: `openssl rand -base64 32` |
| `SESSION_COOKIE_NAME` | No | Cookie name. Defaults to `college_erp_session` |
| `NODE_ENV` | No | `'production'` enables the `Secure` cookie flag |

These all go in `.env.local` (never committed to git).

---

## Client-Side Example: Tracing a Request

Starting from `ExamMasterPage`:

```typescript
// 1. Client component calls:
const url = `/api/proxy/domain/list/ExamMaster?size=99999&query=Universities.universityId==${uniId}...`
const res = await fetch(url)
const json = await res.json()
// json.data.resultList → ExamMaster[]
```

**What happens inside the proxy:**

```
GET /api/proxy/domain/list/ExamMaster?size=99999&query=...
        |
        v
proxy: getIronSession() → session.jwt = "eyJhbGciOiJIUzI1NiJ9..."
        |
        v
proxy builds: targetUrl = "http://localhost:8080/domain/list/ExamMaster?size=99999&query=..."
proxy sends:
  GET http://localhost:8080/domain/list/ExamMaster?size=99999&query=...
  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
  Content-Type: application/json
        |
        v
Spring Boot validates JWT → runs query → returns:
  {
    "statusCode": 200,
    "success": true,
    "message": "Success",
    "data": {
      "resultList": [...],
      "totalCount": 42
    }
  }
        |
        v
proxy: NextResponse.json(data, { status: 200 })
        |
        v
Client: json.data.resultList → array of ExamMaster objects
```

---

## Spring Boot Response Envelope

Every Spring Boot endpoint returns this shape (defined in `src/types/api.ts`):

```typescript
interface ApiResponse<T> {
  statusCode: number    // HTTP status code (200, 400, etc.)
  success: boolean
  message: string
  data: T               // varies by endpoint
  resultList?: T[]      // paginated endpoints
}
```

The proxy does **not** unwrap this — it returns the full envelope to the client. Your code must check `json.statusCode === 200` or `json.success` as appropriate.
