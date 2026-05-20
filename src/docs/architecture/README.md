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
│   ├── (public)/                         # No auth required
│   │   └── login/page.tsx
│   ├── (pages)/(protected)/              # Requires valid Iron Session cookie
│   │   ├── layout.tsx                    # Server: validates session, fetches nav, renders AppShell
│   │   ├── dashboard/page.tsx
│   │   ├── admin/
│   │   │   ├── organizations/            # List + add/edit modal
│   │   │   └── campus/                   # List + add/edit modal
│   │   ├── admin-examination-management/
│   │   │   └── admin-exam-masters/       # 8 sub-pages (exam-master, exam-session, exam-timetable,
│   │   │       ...                       # exam-fee-setup, exam-max-marks-setup, grade-setup,
│   │   │                                 # seating-plan-setup, invigilator-remuneration, revaluation-fee-setup)
│   │   ├── evaluation/                   # evaluation-process, evaluator-assigned-answer-sheet, paper
│   │   ├── dashboards/evaluation-dashboard/
│   │   ├── pdf-download/
│   │   └── sample/
│   └── api/                              # BFF — server-side only
│       ├── auth/login|me|logout/route.ts
│       └── proxy/[...path]/route.ts      # JWT injection → Spring Boot
│
├── components/                           # Structural / shell components
│   ├── ui/                               # Shadcn-generated Radix primitives (copy-paste, not npm)
│   │                                     #   button, input, dialog, select, checkbox, tabs, popover,
│   │                                     #   calendar, radio-group, card, badge, avatar, collapsible,
│   │                                     #   dropdown-menu, separator, skeleton, loader
│   ├── layout/                           # App shell — mirrors Angular src/app/components/
│   │   ├── AppShell.tsx                  # Root layout: sidebar + topbar + main content
│   │   ├── Sidebar.tsx                   # Collapsible nav (collapse, auto-collapse, debug trigger)
│   │   ├── Topbar.tsx                    # Live page search (API-backed), user dropdown, logout
│   │   ├── NavItem.tsx                   # Recursive nav renderer; 200+ Material→Lucide icon map
│   │   ├── PageHeader.tsx                # Page title + subtitle + action slot
│   │   ├── PageContainer.tsx             # Standard outer padding using CSS spacing tokens
│   │   └── index.ts
│   └── shared/
│       └── RoleGuard.tsx
│
├── common/                               # Angular-parity layer — mirrors src/app/common/
│   ├── constants.ts                      # Core app-wide constants
│   ├── general-constants.ts              # Domain enums: roles, status codes, exam enums
│   ├── alias-labels.ts                   # Human-readable label map for entity field names
│   ├── generic-functions.ts              # Shared utilities: date formatting, string helpers
│   ├── print-config.ts                   # Print layout configuration
│   └── components/                       # Reusable UI widgets — mirrors Angular src/app/common/components/
│       ├── table/                         # DataTable (AG Grid v35 wrapper) + Table (simple HTML)
│       ├── date-picker/                   # DatePicker, MonthYearPicker
│       ├── search/                        # SearchInput (debounced)
│       ├── select/                        # Select, MultiSelect
│       ├── bar-chart/                     # BarChart (recharts)
│       ├── pie-chart/                     # PieChart (recharts)
│       ├── charts/                        # BarChart + PieChart + DrilldownChart re-exports
│       ├── breadcrumb/                    # Breadcrumb, useBreadcrumb
│       ├── theme-setting-modal/           # ThemeSettingModal, useTheme
│       ├── data-display/                  # StatusBadge, StatCard
│       ├── feedback/                      # ConfirmDialog, EmptyState, ErrorBoundary, FormModal
│       ├── forms/                         # CollegeFilterPanel, FormField
│       └── index.ts                       # Main barrel: export * from all subdirectories
│
├── debug/                                # Debug system (gated by NEXT_PUBLIC_DEBUG_MODE=true)
│   ├── constants.ts                      # IS_DEBUG_MODE, DEBUG_STORAGE_KEY
│   ├── debug-store.ts                    # Zustand store persisted to localStorage
│   ├── DebugPanel.tsx                    # Fixed right drawer with tab framework
│   ├── DebugTrigger.tsx                  # Profile avatar trigger in sidebar footer
│   ├── index.ts                          # Exports: DebugPanel, DebugTrigger, useDebugStore, IS_DEBUG_MODE
│   └── panels/
│       ├── NavVisibilityPanel.tsx        # Toggle nav items with search + highlight
│       └── index.ts
│
├── context/
│   └── SessionContext.tsx                # React context + SessionProvider
│
├── hooks/
│   ├── useSession.ts                     # TanStack Query wrapper for /api/auth/me
│   └── useCollegeFilters.ts              # University → Course → Regulation cascading state
│
├── integrations/
│   └── spring-api.ts                     # SERVER ONLY: springLogin(), springGetUserDetails()
│
├── lib/
│   ├── session.ts                        # Iron Session config + getSession()
│   ├── navigation.ts                     # buildNavTree() — Module[] + Page[] → NavItem[]
│   ├── errors.ts                         # AppError, parseApiError, isAppError, getErrorMessage
│   └── utils.ts                          # cn(), distinct(), shared formatters
│
├── services/
│   ├── index.ts
│   ├── crud.service.ts                   # domainList, domainCreate, domainUpdate, buildQuery, getAllRecords
│   ├── organization.service.ts
│   ├── campus.service.ts
│   ├── exam-master.service.ts
│   ├── exam-session.service.ts
│   ├── exam-grade.service.ts
│   ├── exam-max-marks.service.ts
│   ├── exam-fee-setup.service.ts
│   ├── exam-timetable.service.ts
│   ├── seating-plan.service.ts
│   ├── invigilator-remuneration.service.ts
│   └── revaluation-fee.service.ts
│
├── store/
│   └── navigation-store.ts               # Zustand: navItems, collapsedItems, sidebar state
│
├── types/
│   ├── user.ts                           # UserDTO (server-only), SessionUser, IronSessionData
│   ├── api.ts                            # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   ├── navigation.ts                     # Module, SubModule, Page, NavItem
│   ├── common.ts                         # SelectOption, DateRange, FilterState, PaginationState
│   ├── organization.ts
│   └── exam-master.ts                    # ExamMaster, ExamMasterDetails, CollegeWiseFilterRow, ...
│
├── config/
│   └── constants/
│       ├── api.ts                        # NEXT_API.*, AUTH_API.*, EXAM_API.*, ORG_API.*, MINIO_URL
│       ├── app.ts                        # APP_CONFIG, USER_ROLES, DATE_FORMATS
│       ├── ui.ts                         # GM_CODES (95 entries)
│       ├── proc.ts                       # Stored procedure names
│       └── index.ts                      # Re-exports all above
│
├── assets/
│   └── images/                           # Static image assets (no-img-logo.png, etc.)
│
└── middleware.ts                         # Edge: cookie existence check → /login
```

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
