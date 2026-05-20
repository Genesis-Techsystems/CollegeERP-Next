# Authentication Flow

> Iron Session BFF pattern. JWT lives only in the encrypted server-side cookie.
> The browser never sees the JWT.

---

## Step-by-Step Flow

### Step 1 — Login form submission

**File:** `src/app/(public)/login/page.tsx` (LoginCard component within)

User fills in `usernameOrEmail` + `password` and submits. The form posts to `/api/auth/login` via `fetch`. On success, it calls `router.push(user.defaultDashboardPath)` — which is always `/dashboard` currently (derived server-side).

---

### Step 2 — BFF login route

**File:** `src/app/api/auth/login/route.ts`

1. **Rate limit check** — in-memory Map keyed by IP (`x-forwarded-for` or `'unknown'`). Max 10 requests per 60-second window per IP. Returns HTTP 429 if exceeded.

2. **Zod validation** — validates `{ usernameOrEmail: string, password: string }`. Returns HTTP 401 on failure (no information leak).

3. **`springLogin(usernameOrEmail, password)`** — calls `${SPRING_API_URL}/api/auth/login` with `{ usernameOrEmail, password, isMobile: false }`. Returns the raw JWT string from `body.data`.

4. **`springGetUserDetails(jwt)`** — calls `${SPRING_API_URL}/api/authorization?isMobile=false` with `Authorization: Bearer <jwt>`. Returns the full `UserDTO`.

5. **Build `SessionUser`** — extracts a safe subset from `UserDTO`, computes privilege flags server-side:
   - `isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN'`
   - `isPrincipal = roleName.toUpperCase().includes('PRINCIPAL')`
   - `isManagement = userTypeCode.toUpperCase().includes('MGNT') || roleName.toUpperCase().includes('MANAGEMENT')`
   - `defaultDashboardPath = '/dashboard'` (hardcoded for now)

6. **Iron Session save** — `session.jwt = jwt; session.user = sessionUser; session.issuedAt = Date.now(); await session.save()`. This encrypts and sets the HttpOnly cookie.

7. **Response to browser** — `NextResponse.json({ user: sessionUser })`. The JWT is **not** in this response. `modules[]` and `pages[]` are also **not** in this response (size concern; they are fetched fresh server-side in the protected layout).

---

### Step 3 — Iron Session cookie creation

**File:** `src/lib/session.ts`

```typescript
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,   // 32+ char random string
  cookieName: process.env.SESSION_COOKIE_NAME || 'college_erp_session',
  ttl: 21600,                             // 360 minutes
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}
```

The `getSession()` helper wraps `getIronSession<IronSessionData>(await cookies(), sessionOptions)` — note the `await cookies()` which is required in Next.js 15+.

---

### Step 4 — Middleware (every request to protected routes)

**File:** `src/middleware.ts`

Runs at the edge before any route handler. Only checks for cookie **existence** — not validity. Iron Session decryption happens inside route handlers.

```typescript
// Matcher config:
matcher: ['/(protected)/:path*', '/dashboard/:path*']
```

If the cookie named `college_erp_session` (or `SESSION_COOKIE_NAME`) is absent, the middleware redirects to `/login`. No role-based checking at edge — that's deliberate (too complex for Phase 1).

---

### Step 5 — Protected layout session check

**File:** `src/app/(protected)/layout.tsx`

Every page under `(protected)/` goes through this layout on every server render:

1. `getSession()` → decrypts Iron Session cookie
2. No `session.user` or no `session.jwt`? → `redirect('/login')`
3. `springGetUserDetails(session.jwt)` → fetches fresh `modules[]` and `pages[]` from Spring Boot (these are NOT stored in the cookie due to the ~4 KB cookie size limit)
4. Builds `initialUser = { ...session.user, modules, pages }`
5. Renders `<SessionProvider initialUser={initialUser}><AppShell initialNavItems={navItems}>{page}</AppShell></SessionProvider>`

The `initialUser` prop prevents a client-side loading flash.

---

### Step 6 — Client hydration

**File:** `src/context/SessionContext.tsx` + `src/hooks/useSession.ts`

`SessionProvider` receives `initialUser` from the server and wraps children in a `QueryClientProvider`. Inside `SessionProviderInner`:

- `useSession()` — TanStack Query with `queryKey: ['session']`, `queryFn: GET /api/auth/me`, `staleTime: 5 minutes`
- `user = session.user ?? initialUser ?? null` — initialUser prevents the loading flash; TanStack Query takes over after
- `isLoading = session.isLoading && !initialUser` — never shows a spinner when initialUser is present

The context value is `{ user: SessionUser | null, isLoading: boolean, refetch: () => void }`.

All components call `useSessionContext()` to read the current user.

---

### Step 7 — Session refresh

**File:** `src/app/api/auth/me/route.ts`

Called by `useSession()` (TanStack Query) on the client. Every 5 minutes (staleTime).

1. Reads Iron Session cookie
2. Checks `session.user`, `session.issuedAt`, `session.jwt` all present
3. Checks `Date.now() - session.issuedAt > SESSION_MAX_AGE_MS` (21600000 ms = 360 min) → if expired, destroys session, returns HTTP 401
4. Returns `{ user: session.user }` — modules/pages NOT included (nav is built from the protected layout server render)

Note: The `/me` route returns only `session.user` (no fresh `springGetUserDetails` call). Fresh modules/pages only happen on full page navigation (server render of protected layout).

---

### Step 8 — Logout

**File:** `src/app/api/auth/logout/route.ts`

`POST /api/auth/logout` → `session.destroy()` → returns `{ success: true }`.

Called from the Sidebar logout button and the Topbar user dropdown. After the response, the client calls `router.push('/login')`.

---

## ASCII Flow Diagram

```
User fills login form
        |
        v
POST /api/auth/login
        |
        +-- Rate limit check (10/min/IP)
        |
        +-- Zod validate { usernameOrEmail, password }
        |
        +-- springLogin() ─────────────────────────> POST SPRING_API_URL/api/auth/login
        |                  <──────────────────────── { data: "<JWT>" }
        |
        +-- springGetUserDetails(jwt) ─────────────> GET SPRING_API_URL/api/authorization
        |                              <──────────── UserDTO { modules[], pages[], ... }
        |
        +-- Build SessionUser (safe subset, derive flags)
        |
        +-- Iron Session save: { jwt, user, issuedAt }
        |   └── Set-Cookie: college_erp_session (HttpOnly, SameSite=strict)
        |
        v
Browser ← { user: SessionUser }   (NO jwt, NO modules, NO pages)
        |
        router.push('/dashboard')
        |
        v
GET /dashboard
        |
        +-- middleware: cookie present? YES → pass through
        |
        +-- layout.tsx (server):
        |   +-- getSession() → decrypts cookie
        |   +-- springGetUserDetails(jwt) → fresh modules + pages
        |   +-- renders SessionProvider(initialUser) + AppShell
        |
        +-- SessionProvider (client):
            +-- useSession() → TanStack Query → GET /api/auth/me
            +-- user = data.user ?? initialUser  (no flash)
            +-- context: { user, isLoading, refetch }
```

---

## What IS in the Session Cookie

The cookie stores `IronSessionData` (see `src/types/user.ts`):

```typescript
interface IronSessionData {
  jwt?: string        // Spring Boot JWT — used only server-side for proxy calls
  user?: SessionUser  // Safe user subset — see fields below
  issuedAt?: number   // Unix timestamp (ms) for TTL check
}
```

`SessionUser` fields stored in the cookie:

| Field | Type | Description |
|---|---|---|
| `userId` | `number` | Spring Boot user ID |
| `userName` | `string` | Login username |
| `firstName` | `string` | Display name |
| `lastName` | `string?` | Optional last name |
| `userRole` | `string` | e.g. `'ADMIN'`, `'STAFF'`, `'STUDENT'`, `'SUPERADMIN'` |
| `userTypeCode` | `string` | e.g. `'STAFF'`, `'STUDENT'`, `'PARENT'` |
| `roleName` | `string` | Human-readable role name |
| `collegeId` | `number` | Multi-tenancy identifier |
| `collegeCode` | `string` | Short college code |
| `collegeName` | `string` | Full college name (shown in sidebar) |
| `academicYearId` | `number` | Current academic year FK |
| `academicYear` | `string` | e.g. `'2025-26'` |
| `employeeId` | `number?` | Set for staff users |
| `studentId` | `number?` | Set for student users |
| `isAdmin` | `boolean` | Derived: `userRole === 'ADMIN' \|\| 'SUPERADMIN'` |
| `isPrincipal` | `boolean` | Derived: `roleName` includes `'PRINCIPAL'` |
| `isManagement` | `boolean` | Derived: `userTypeCode` includes `'MGNT'` or `roleName` includes `'MANAGEMENT'` |
| `defaultDashboardPath` | `string` | Always `'/dashboard'` currently |

---

## What is NOT in the Cookie

| Not stored | Reason |
|---|---|
| `modules[]` | Cookie size limit ~4 KB — arrays of modules would exceed it |
| `pages[]` | Same as above |
| `email` | PII — not needed client-side |
| `mobileNumber` | PII — not needed client-side |
| `organizationId` | Currently missing from `SessionUser` (known gap — see PROGRESS.md) |
| `userRoles[]` | Full role array not needed client-side |

**modules[] and pages[] flow:** Fetched fresh on every server render of `(protected)/layout.tsx` via `springGetUserDetails(session.jwt)`. They are passed as `initialNavItems` to `AppShell` → stored in Zustand `navigation-store`. They are also merged into `initialUser` passed to `SessionProvider`.

The `/api/auth/me` route does **not** re-fetch modules/pages — it returns only `session.user`. Fresh modules/pages are only available after a full page navigation (SSR).

---

## Security Properties

| Property | Value |
|---|---|
| `HttpOnly` | `true` — JS cannot read the cookie |
| `SameSite` | `'strict'` — CSRF protection without a token |
| `Secure` | `true` in production (`NODE_ENV === 'production'`), `false` in development |
| TTL | 21600 seconds (360 min) — enforced both by cookie `max-age` and server-side `issuedAt` check |
| Encryption | iron-session AES-GCM, key = `SESSION_SECRET` env var (must be 32+ chars) |
| Privilege flags | Computed server-side — never accepted from client |
| JWT exposure | Never in any HTTP response body; never in any client-accessible storage |
