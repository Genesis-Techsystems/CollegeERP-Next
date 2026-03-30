# Architecture Overview — College ERP Next.js

> See also: [Service Layer](service-layer.md) | [Data Fetching](data-fetching.md)

> Migration from Angular 11 + Spring Boot 2.0 to Next.js 16 (App Router).
> Spring Boot is **frozen** — all changes are frontend-only.

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Industry standard, edge-ready, RSC support |
| Language | TypeScript 5 | Type safety across the BFF boundary |
| Styling | Tailwind CSS v4 (CSS-first, no config file) | Replaces Fuse Theme (ThemeForest); copy-paste patterns via Shadcn |
| UI primitives | Shadcn/UI (Radix + `cn()`) | Replaces Fuse Theme; no runtime dependency, MIT |
| Auth / session | iron-session v8 | Lightweight, no DB, edge-compatible; replaces `localStorage['token']` (insecure) |
| API proxy | Next.js catch-all route (`/api/proxy/[...path]`) | JWT never leaves server; Spring Boot URL never exposed |
| Data fetching | TanStack Query v5 | Replaces Angular RxJS CrudService; caching, stale-while-revalidate |
| Global state | Zustand v5 | Nav tree + sidebar state; replaces Angular BehaviorSubject + localStorage |
| Forms | react-hook-form v7 + zod v4 | Replaces Angular Reactive Forms |
| Tables | AG Grid Community v35 | Replaces Syncfusion DataGrid (commercial); same API surface |
| Date pickers | react-day-picker v9 + date-fns | Replaces Syncfusion date components |
| Icons | lucide-react | MIT; consistent with Shadcn ecosystem |
| Node requirement | **Node >= 20.9.0** | Next.js 16 hard requirement |

**Deferred / planned replacements:**
- Charts: Recharts (replacing Highcharts) — not yet wired
- Calendar/timetable: FullCalendar (replacing Syncfusion Scheduler) — not yet built
- Rich text + math: Tiptap + KaTeX (replacing TinyMCE + Wiris) — not yet built
- Zoom SDK: kept as-is (no viable OSS replacement)

---

## Folder Structure

```
src/
├── app/
│   ├── (public)/                         # No auth required — static pages
│   │   └── login/page.tsx                # Login form (SSG, no server data fetch)
│   ├── (protected)/                      # Requires valid Iron Session cookie
│   │   ├── layout.tsx                    # Server: validates session, fetches nav, renders AppShell
│   │   ├── not-found.tsx                 # 404 inside protected routes — toast + router.back(), sidebar intact
│   │   ├── dashboard/page.tsx            # Role-based landing page (client component)
│   │   └── admin-examination-management/ # First feature module
│   │       └── admin-exam-masters/
│   │           └── exam-master/
│   │               ├── page.tsx                # List page — filters + AG Grid
│   │               ├── ExamMasterModal.tsx     # Add/Edit dialog
│   │               └── exam-master-details/
│   │                   └── page.tsx            # Labels management page
│   └── api/                              # BFF — all server-side, never bundled to browser
│       ├── auth/
│       │   ├── login/route.ts            # POST: credential validation → set Iron Session cookie
│       │   ├── me/route.ts               # GET: return safe SessionUser (no JWT)
│       │   └── logout/route.ts           # POST: destroy session
│       └── proxy/
│           └── [...path]/route.ts        # Catch-all: injects JWT, forwards to Spring Boot
│
├── components/
│   ├── ui/                               # Shadcn-generated Radix primitives (copy-paste pattern)
│   │                                     #   button, input, dialog, select, checkbox, tabs,
│   │                                     #   popover, calendar, radio-group, card, badge,
│   │                                     #   avatar, collapsible, dropdown-menu, separator,
│   │                                     #   skeleton, loader
│   ├── layout/                           # App shell components
│   │   ├── AppShell.tsx                  # Root layout: sidebar + topbar + main
│   │   ├── Sidebar.tsx                   # Dynamic nav built from user.modules[]
│   │   ├── Topbar.tsx                    # User info, logout, academic year
│   │   ├── NavItem.tsx                   # Recursive nav item renderer
│   │   └── PageHeader.tsx                # Page-level title/subtitle/action slot
│   ├── forms/                            # Reusable form controls
│   │   ├── DatePicker.tsx                # Popover + Calendar (dd/MM/yyyy)
│   │   └── MonthYearPicker.tsx           # Custom month/year grid (MM/yyyy)
│   ├── data-table/                       # AG Grid wrapper
│   │   └── DataTable.tsx                 # Generic typed AG Grid component
│   ├── feedback/                         # User feedback components
│   │   └── ConfirmDialog.tsx             # Destructive action confirmation dialog
│   ├── data-display/                     # (planned — barrel file exists, components TBD)
│   └── shared/                           # (planned — barrel file exists, components TBD)
│
├── context/
│   └── SessionContext.tsx                # React context + SessionProvider (wraps TanStack Query)
│
├── hooks/
│   └── useSession.ts                     # TanStack Query wrapper for /api/auth/me
│
├── integrations/
│   └── spring-api.ts                     # SERVER ONLY — springLogin(), springGetUserDetails()
│
├── lib/
│   ├── session.ts                        # Iron Session config (sessionOptions) + getSession()
│   ├── navigation.ts                     # buildNavTree() — Module[] + Page[] → NavItem[]
│   └── utils.ts                          # cn(), shared formatters
│
├── services/                             # Client-callable typed async functions (queryFn bodies)
│   ├── index.ts                          # Re-exports all service modules
│   ├── crud.service.ts                   # Generic: domainList, domainCreate, domainUpdate, buildQuery, getAllRecords
│   ├── exam-master.service.ts            # Exam master domain
│   ├── exam-session.service.ts           # Exam sessions
│   ├── exam-grade.service.ts             # Exam grades
│   ├── exam-max-marks.service.ts         # Exam marks setup
│   ├── exam-fee-setup.service.ts         # Exam fee structures
│   ├── exam-timetable.service.ts         # Exam timetable
│   ├── seating-plan.service.ts           # Room allotments
│   ├── invigilator-remuneration.service.ts # Invigilator pay rates
│   └── revaluation-fee.service.ts        # Revaluation fees
│
├── store/
│   └── navigation-store.ts               # Zustand: navItems[], collapsedItems, isSidebarOpen
│
├── types/
│   ├── user.ts                           # UserDTO (server-only), SessionUser, IronSessionData
│   ├── api.ts                            # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   ├── navigation.ts                     # Module, SubModule, Page, NavItem
│   └── exam-master.ts                    # ExamMaster, ExamMasterDetails, CollegeWiseFilterRow, ...
│
├── config/
│   └── constants.ts                      # APP_NAME, SESSION_MAX_AGE_MS, rate limit constants
│                                         # Note: SPRING_API_URL intentionally NOT here (server-only)
│
├── assets/
│   └── images/                           # Static image assets
│
└── middleware.ts                         # Edge: cookie existence check → redirect to /login
```

**All planned additions are now implemented:**
- `src/config/constants/` — api.ts, app.ts, ui.ts, proc.ts, index.ts ✓
- `src/lib/errors.ts` — AppError, parseApiError, isAppError, getErrorMessage ✓
- `src/types/common.ts` — SelectOption, DateRange, FilterState, PaginationState ✓
- All examination module service files ✓ (see services/ listing above)
- `src/components/data-display/` — StatusBadge, StatCard ✓
- `src/components/forms/SearchInput`, `FilterBar` ✓
- `src/components/shared/RoleGuard`, `PageContainer` ✓

---

## Data Flow Diagram

```
Browser (client components)
    |
    | fetch('/api/proxy/domain/list/ExamMaster?...')
    |
    v
Next.js BFF (/api/proxy/[...path]/route.ts)
    |
    | getIronSession() — reads + decrypts HttpOnly cookie
    | extracts: session.jwt  (never returned to browser)
    |
    | builds: targetUrl = SPRING_API_URL + "/" + path + queryString
    | adds:   Authorization: Bearer <jwt>
    |
    v
Spring Boot (frozen — http://localhost:8080 in dev)
    |
    | validates JWT, runs query, returns ApiResponse<T>
    |
    v
Next.js BFF
    |
    | returns response body as-is (status code preserved)
    | JWT is NEVER included in any response
    |
    v
Browser
    |
    TanStack Query caches the result
```

**Auth flow (login only):**
```
Browser → POST /api/auth/login { usernameOrEmail, password }
    ↓
BFF → POST SPRING_API_URL/api/auth/login   → JWT string
BFF → GET  SPRING_API_URL/api/authorization → UserDTO (modules, pages, roles)
BFF → builds SessionUser (safe subset, no JWT)
BFF → Iron Session: { jwt, user: SessionUser, issuedAt } → encrypted HttpOnly cookie
    ↓
Browser ← { user: SessionUser }   (JWT never in response body)
```

---

## Security Model

The Angular app stored 33+ items in `localStorage` including the raw JWT, email, phone, and privilege flags (`isAdmin`, `isPRINCIPAL`). Any XSS could read all of it; privilege flags could be tampered by the user.

**This app uses Iron Session BFF:**

| Property | Value |
|---|---|
| Cookie flags | `HttpOnly=true`, `SameSite=strict`, `Secure=true` (production only) |
| Cookie TTL | 21600 seconds (360 minutes) |
| Encryption | iron-session AES-GCM with 32-byte `SESSION_SECRET` |
| JWT location | Inside the encrypted cookie — readable only server-side |
| Spring Boot URL | `SPRING_API_URL` env var — never bundled to the browser |
| Privilege flags | Derived server-side in `/api/auth/login/route.ts` from `userRole`, `roleName`, `userTypeCode`; never accepted from client input |
| localStorage | Nothing sensitive stored there |

**What the browser can read:** `SessionUser` shape (userId, name, role, collegeId, flags) via `/api/auth/me` response. Never the JWT, never the raw UserDTO.

**CSRF protection:** `SameSite=strict` prevents cross-origin cookie submission. No additional CSRF token needed.

**Rate limiting:** Login endpoint has in-memory rate limiter: 10 requests/minute per IP (`src/app/api/auth/login/route.ts`). Note: in-memory only — does not survive server restarts or scale across multiple instances.

---

## Multi-Tenancy

Tenancy is identity-based, not URL-based. There is no subdomain routing or per-tenant config file.

The `collegeId` comes from the user's DB record (`User → College` foreign key). Spring Boot returns it in the UserDTO on `/api/authorization`. It flows through the system as:

1. `UserDTO.collegeId` → stored in `SessionUser.collegeId` (in Iron Session)
2. `session.user.collegeId` → available in all server-side route handlers
3. `useSessionContext().user.collegeId` → available in all client components
4. Passed to proxy calls as part of query parameters (e.g. filter APIs accept `in_college_id`)

`organizationId` also exists on `UserDTO` but is **not currently on `SessionUser`**. The exam master page works around this with `(user as any)?.organizationId ?? 0`. If you need it, add it to `SessionUser` in `src/types/user.ts` and the session-building logic in `src/app/api/auth/login/route.ts`.

---

## Key Constraints

### Spring Boot is frozen
Do not modify any backend code. Document discovered issues in `migration-plan/04-spring-boot-backlog.md`. Known issues: plaintext passwords (`NoOpPasswordEncoder`), hardcoded JWT secret `"genesis"`, CORS wildcard `*`, no JWT refresh mechanism.

### Next.js 16 breaking changes
This is Next.js 16 — not what most training data or tutorials describe for Next.js 13/14. Check `node_modules/next/dist/docs/` before writing any Next.js-specific code. Key differences from earlier versions:
- `cookies()` is async — must `await cookies()`
- Route handler context params are a `Promise` — must `await context.params`
- App Router conventions may differ from earlier docs

### Tailwind v4 CSS-first
There is **no `tailwind.config.js`**. Do not create one. All theme customization is in `src/app/globals.css` using CSS custom properties (`@theme` block). Custom colors use `var(--color-name)` in className strings. New utility classes follow Tailwind v4 CSS-first syntax.

### Node >= 20.9.0
Hard requirement from Next.js 16. The development machine may be on Node 16 — use `nvm use 20` before running `npm run dev`.

### AG Grid is client-only
`DataTable` uses AG Grid Community which is not SSR-compatible. Any page using `DataTable` must be a client component (`'use client'`). Do not use it in Server Components.
