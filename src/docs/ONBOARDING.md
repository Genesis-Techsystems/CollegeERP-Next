# Developer Onboarding — College ERP Next.js

> Migration from Angular 11 + Spring Boot 2.0 to Next.js 16 (App Router).
> Spring Boot is **frozen** — all changes are frontend-only.

---

## Prerequisites

- **Node >= 20.9.0** — hard requirement from Next.js 16. Check: `node --version`. Use `nvm use 20` if needed.
- **Spring Boot running at http://localhost:8080** (see backend repo) — login will fail without it.
- Git, npm (no yarn/pnpm preference set).

---

## Setup

```bash
git clone <repo>
cd college_erp_nextjs
npm install

# Create .env.local (not committed)
cp .env.local.example .env.local
# OR create manually:
cat > .env.local << 'EOF'
SPRING_API_URL=http://localhost:8080
SESSION_SECRET=$(openssl rand -base64 32)
SESSION_COOKIE_NAME=college_erp_session
NODE_ENV=development
EOF

nvm use 20
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`. Use your Spring Boot credentials.

---

## Five Mental Models You Must Internalize

### 1. JWT never touches the browser

The Iron Session cookie is encrypted server-side. The JWT is inside it but the browser cannot read it. Client components never see the JWT. If you need to call Spring Boot from a client component — use `/api/proxy`.

### 2. All client API calls go to `/api/proxy/*`

Never `fetch('http://localhost:8080/...')` from a client component. Always `fetch('/api/proxy/...')`. The proxy adds the auth header, keeps the Spring Boot URL secret, and handles 401 session expiry.

```typescript
// WRONG
const res = await fetch(`${process.env.SPRING_API_URL}/domain/list/Student`)

// CORRECT
const res = await fetch('/api/proxy/domain/list/Student')
```

### 3. Spring Boot is frozen

Do not modify any backend code. Document discovered issues in `migration-plan/04-spring-boot-backlog.md` instead. Known issues that can't be fixed: plaintext passwords, hardcoded JWT secret `"genesis"`, CORS wildcard, no JWT refresh.

### 4. Tailwind v4 is different

There is **no `tailwind.config.js`**. Do not create one. Theme customization is in `src/app/globals.css` using `@theme` CSS variables. Use `var(--color-name)` in className strings for custom tokens. Read Tailwind v4 docs before adding new utility classes — many v3 patterns have changed.

### 5. This is Next.js 16 — not what your training data says

Check `node_modules/next/dist/docs/` before writing any Next.js-specific code. Key breaking changes from earlier versions:
- `cookies()` is async: `await cookies()`
- Route handler context params are a Promise: `await context.params`
- App Router conventions may differ from Next.js 13/14 tutorials

---

## Adding a New Page

1. Create `src/app/(protected)/{module-path}/page.tsx`
2. Add `'use client'` at top (all feature pages are client components)
3. Create service: `src/services/{domain}.service.ts` — see `src/docs/architecture/service-layer.md`
4. Add types: `src/types/{domain}.ts`
5. Add API constants to: `src/config/constants/` (once split by Foundation agent)
6. Use `<PageHeader>` from `@/components/layout/PageHeader`
7. Write TanStack Query with service as queryFn — see service layer docs
8. Document the flow in `src/docs/flows/{module}-flow.md`

---

## Adding a Reusable Component

1. Choose the right category: `ui/` (Shadcn primitives), `forms/`, `layout/`, `data-table/`, `feedback/`, `data-display/`, `shared/`
2. TypeScript props interface with JSDoc on every prop
3. Add `'use client'` if it uses any hooks or browser APIs
4. Export from category's `index.ts` (if the barrel exports)
5. Document in `src/docs/components/README.md`

---

## Adding a New API Service Function

1. Open/create `src/services/{domain}.service.ts`
2. Write typed async function — see the template in `src/docs/architecture/service-layer.md`
3. Add TSDoc with the Spring Boot endpoint reference
4. Export from `src/services/index.ts`

---

## Understanding the Request Lifecycle

```
User action (click, form submit)
    |
    v
Client component calls fetch('/api/proxy/...')
    |
    v
Next.js proxy route (src/app/api/proxy/[...path]/route.ts)
    - reads JWT from encrypted Iron Session cookie (server-only)
    - adds Authorization: Bearer <jwt>
    - forwards to Spring Boot
    |
    v
Spring Boot (http://localhost:8080)
    - validates JWT
    - runs business logic / DB query
    - returns { statusCode, success, message, data }
    |
    v
Proxy returns response as-is to client
    |
    v
TanStack Query caches result, component re-renders
```

---

## Troubleshooting Common Issues

### Session cookie not being set

- Check `SESSION_SECRET` is set in `.env.local` (minimum 32 characters). iron-session will silently fail with a short key.
- Check that Spring Boot is running and accessible at `SPRING_API_URL`.
- Check browser allows cookies for localhost.

### Proxy returns 401

- Check Spring Boot session hasn't expired (6-hour TTL). Clear browser cookies and log in again.
- Check `SPRING_API_URL` in `.env.local` matches the running Spring Boot instance.
- Open DevTools > Application > Cookies — verify `college_erp_session` cookie exists.

### AG Grid SSR crash

AG Grid is client-side only. Make sure the page has `'use client'` and `DataTable` is not used in a Server Component. If using dynamic import:

```typescript
const DataTable = dynamic(
  () => import('@/components/data-table/DataTable'),
  { ssr: false }
)
```

### Tailwind v4 class not working

- Do not add `tailwind.config.js` — it will conflict with v4's CSS-first approach.
- Custom colors must be defined as CSS variables in `src/app/globals.css` under `@theme`.
- Use `var(--color-name)` in className strings for custom tokens.
- If a standard utility isn't working, check the v4 migration guide — some class names changed.

### "organizationId is undefined"

`user.organizationId` is not on the `SessionUser` type. Currently the exam master page works around this with `(user as any)?.organizationId ?? 0`. If you need `organizationId` for a new feature, add it to `SessionUser` in `src/types/user.ts` and the session-building logic in `src/app/api/auth/login/route.ts`.

### `await cookies()` TypeScript error

In Next.js 15+, `cookies()` returns a Promise. Always `await` it:
```typescript
const cookieStore = await cookies()
const session = await getIronSession<IronSessionData>(cookieStore, sessionOptions)
```

### Nav items not showing after login

The navigation tree is built from `modules[]` and `pages[]` which are fetched server-side in `(protected)/layout.tsx` and stored in Zustand via `AppShell`. They are NOT stored in the Iron Session cookie (size limit). If the nav is empty, check that Spring Boot's `/api/authorization` endpoint returns `modules` and `pages` arrays for the logged-in user.

### Module path doesn't match the URL

`buildNavTree()` in `src/lib/navigation.ts` mirrors Angular's URL derivation logic. Module URLs are taken from `module.url` if set (and not the literal string `"null"`), otherwise derived by splitting `moduleName` by spaces, skipping the word "and", and joining with hyphens. If a nav item links to a wrong URL, trace through `buildModuleUrl()` in `src/lib/navigation.ts`.

### `context.params` TypeScript error in route handlers

In Next.js 16, context params are a Promise:
```typescript
// Correct pattern (as used in proxy route)
type Context = { params: Promise<{ path: string[] }> }
async function handler(request: NextRequest, context: Context) {
  const { path } = await context.params
}
```

---

## Key Files Reference

| What you're looking for | File |
|---|---|
| Session config (TTL, cookie name) | `src/lib/session.ts` |
| SessionUser type fields | `src/types/user.ts` |
| Spring Boot API client (server-only) | `src/integrations/spring-api.ts` |
| Proxy implementation | `src/app/api/proxy/[...path]/route.ts` |
| Nav tree builder | `src/lib/navigation.ts` |
| Current user (client) | `useSessionContext()` from `@/context/SessionContext` |
| App constants | `src/config/constants.ts` |
| Architecture decisions | `migration-plan/03-decisions.md` |
| Spring Boot known issues | `migration-plan/04-spring-boot-backlog.md` |
| What's built / what's not | `PROGRESS.md` |

---

## What Is Built vs. What Is Not

See `PROGRESS.md` for the complete list. Summary:

**Built:**
- Iron Session BFF auth (login, logout, session check)
- API proxy with JWT injection and multipart file support
- Edge middleware (cookie existence check)
- App shell (sidebar, topbar, mobile hamburger)
- Dashboard (role-based, stat values hardcoded to 0)
- Exam Master — list, add/edit modal, details/labels page

**Not built yet:**
- Dashboard stat cards wired to real APIs
- All other modules (student, staff, fee, attendance, timetable, admissions, reports, etc.)
- AG Grid pagination, CSV export, quick search UI
- Confirmation dialog on exam label delete
- Any page under `admin-exam-masters` other than `exam-master/`
