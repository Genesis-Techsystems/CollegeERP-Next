# Project Structure — College ERP Next.js

Complete reference for every folder and file in `src/`. Use this as the first stop when looking for where something lives or where to add something new.

---

## Top-level map

```
src/
├── app/                  Next.js App Router — pages, layouts, API routes
├── common/               Angular foundation mirror — constants, utilities, reusable components
├── components/           App-specific components — shell, layout, Shadcn primitives
├── config/               Constants and configuration
├── context/              React Contexts
├── debug/                Dev-only debug panel
├── docs/                 Internal architecture docs (ONBOARDING, flows, component guides)
├── hooks/                Custom React hooks
├── integrations/         Direct Spring Boot client (server-only)
├── lib/                  Framework utilities — session, errors, query keys, schemas
├── services/             API service layer (all fetch calls go through here)
├── store/                Zustand stores
├── types/                TypeScript interfaces
└── middleware.ts         Layer 1 auth guard — runs on every request

todo/                     Deferred WIP modules — excluded from TypeScript, excluded from build
├── examination-module/   9 services, 9 types, 18 pages, 1 hook — see RESTORE.md
├── evaluation-module/    3 pages (superseded by admin-examination-management/) — see RESTORE.md
├── dashboards-module/    1 page — see RESTORE.md
├── pdf-download-module/  1 page — see RESTORE.md
└── sample-module/        1 component showcase page — see RESTORE.md
```

### `todo/` — Deferred Modules

The `todo/` directory holds fully implemented but deferred Angular-parity modules that are excluded from the Next.js build (`tsconfig.json` exclude) until the rest of the app is stable enough to restore them. Each sub-module has a `RESTORE.md` that maps every file to its intended destination.

| Module | Contents | How to restore |
|---|---|---|
| `examination-module/` | 9 services (`exam-session`, `exam-grade`, `exam-max-marks`, `exam-fee-setup`, `exam-timetable`, `exam-master`, `seating-plan`, `invigilator-remuneration`, `revaluation-fee`), matching types, 18 admin pages, 3 evaluation pages, `useCollegeFilters` | See `todo/examination-module/RESTORE.md`; uncomment exports in `src/services/index.ts` |
| `evaluation-module/` | 3 pages (`evaluation-process`, `evaluator-assigned-answer-sheet`, `paper`) — superseded by the `admin-examination-management/evaluation-process/` implementation | See `todo/evaluation-module/RESTORE.md` |
| `dashboards-module/` | `evaluation-dashboard/page.tsx` (older version; current version lives in `src/app/(pages)/(protected)/dashboards/`) | See `todo/dashboards-module/RESTORE.md` |
| `pdf-download-module/` | PDF export/download page — self-contained, no backend calls | See `todo/pdf-download-module/RESTORE.md` |
| `sample-module/` | Component showcase page for developer reference | See `todo/sample-module/RESTORE.md` |

---

## `src/middleware.ts`

**Layer 1 auth guard.** Runs at the edge on every matched request before any page or layout renders. Does a fast cookie-presence check only — no session decryption. Redirects to `/login` if the session cookie is missing.

→ See `docs/decisions/no-guards-folder.md` for the full 3-layer auth explanation.

---

## `src/app/`

Next.js App Router. File position = URL. Route groups in parentheses `(protected)` / `(public)` are filesystem-only — they never appear in URLs.

```
app/
├── layout.tsx                        Root HTML wrapper — Geist fonts, global CSS
├── page.tsx                          Root redirect — dashboard if logged in, /login if not
├── not-found.tsx                     Catch-all 404
│
├── (pages)/
│   ├── (public)/
│   │   └── login/
│   │       ├── page.tsx              Login page shell (server) — redirects authenticated users
│   │       └── LoginCard.tsx         Login form (client) — RHF + Zod, floating labels, show/hide password
│   │
│   └── (protected)/
│       ├── layout.tsx                Layer 2 auth guard — decrypts iron-session, validates jwt + user,
│       │                             fetches nav tree server-side, wraps in SessionProvider + AppShell
│       ├── not-found.tsx             Protected 404 — toast + auto-redirect
│       │
│       ├── dashboard/
│       │   └── page.tsx              Dashboard — role-based stat cards (ADMIN/STAFF/STUDENT/PARENT),
│       │                             welcome header, loading skeleton
│       │
│       ├── dashboards/
│       │   └── evaluation-dashboard/
│       │       └── page.tsx          Evaluation overview — grid of subject cards, check-paper CTA
│       │
│       ├── admin/
│       │   ├── organizations/
│       │   │   ├── page.tsx          Organizations list — AG Grid table, client search, add/edit modal
│       │   │   └── OrganizationModal.tsx  Create/edit form — 23 fields, geo cascade, logo upload,
│       │   │                              phone/email/date validation, ActiveStatusField
│       │   └── campus/
│       │       ├── page.tsx          Campus list — AG Grid table, client search, add/edit modal
│       │       └── CampusModal.tsx   Create/edit form — geo cascade, org dropdown, ActiveStatusField
│       │
│       └── assessments/
│           └── question-bank/
│               ├── page.tsx              Question bank list — DataTable, role-aware fetch, Excel import
│               ├── QuestionBankModal.tsx Create/edit bank — name, description, cascading course/lesson/topic
│               ├── QuestionsListDrawer.tsx  View all questions — accordion, MathContent rendering
│               └── add-question/
│                   └── page.tsx          Add/edit question — type selector (MC/TF/FB/SUB),
│                                         RichTextEditor for question + MC options, math/chemistry support
│       │
│       └── admin-examination-management/
│           └── evaluation-process/
│               └── evaluator-subjects/
│                   ├── page.tsx              Evaluator Subjects — subject cards with progress bars,
│                   │                         deadline urgency, sorted by pending→in-progress→completed
│                   ├── answer-sheets/
│                   │   └── page.tsx          Answer Sheets — Table component, filter tabs, stats strip,
│                   │                         EvalStatusBadge, search by serial no, progress bar footer
│                   └── marking/
│                       ├── page.tsx          Thin shell — dynamic import with ssr:false (PDF.js guard)
│                       └── marking-content.tsx  Full PDF marking tool — stamp placement, drag-to-move,
│                                               question panel, timer, finalize/reject/UFM flows
│
└── api/
    ├── auth/
    │   ├── login/route.ts            POST — rate-limited BFF login. Calls Spring Boot, creates iron-session.
    │   │                             Returns slim SessionUser to client (no JWT, no raw modules).
    │   ├── logout/route.ts           POST — destroys iron-session cookie
    │   └── me/route.ts               GET — returns current SessionUser, checks TTL
    └── proxy/
        └── [...path]/route.ts        Catch-all proxy — forwards all client requests to Spring Boot
                                      with JWT injected in Authorization header. Destroys session on 401.
```

---

## `src/types/`

TypeScript interfaces only — no logic, no imports from services or components.

| File | What it defines |
|---|---|
| `api.ts` | `ApiResponse<T>`, `PageResponse<T>` — Spring Boot response envelopes |
| `campus.ts` | `Campus` entity |
| `common.ts` | `SelectOption`, `DateRange`, `FilterState`, `PaginationState` — shared across pages |
| `domain.ts` | `DomainEntity` (isActive + reason), `DomainFormBase`, `FkRef` — base types for all entities |
| `exam-master.ts` | `CollegeWiseFilterRow` (University+Course filter row), `Regulation` — used by `useCollegeFilters` and the examination module |
| `navigation.ts` | `Module`, `SubModule`, `Page`, `NavItem` — mirrors Angular navigation model |
| `organization.ts` | `Organization` + geo hierarchy: `Country`, `State`, `District`, `City` |
| `question-bank.ts` | `Assessment`, `CourseQuestion`, `CourseQuestionOption`, `AssessmentQuestion`, `OnlineCourse`, `CourseLesson`, `CourseLessonTopic`, `QuestionType`, `QuestionBankFormValues` |
| `user.ts` | `UserDTO`, `SessionUser`, `UserRoleEntry`, `IronSessionData` — user + session shapes |

---

## `src/config/constants/`

All hard-coded values live here. **Never write raw strings in fetch calls or comparisons** — use a constant.

| File | What it holds |
|---|---|
| `api.ts` | Spring Boot endpoint paths — `AUTH_API`, `EXAM_API`, `EXAM_ONLINE_API`, `EXAM_EVAL_API` (evaluation endpoints), `ORG_API`, `NEXT_API`, `MINIO_URL` |
| `app.ts` | `APP_CONFIG` (name, session TTL, rate limits), `USER_ROLES`, `DATE_FORMATS` |
| `defaults.ts` | `DEFAULT_IS_ACTIVE`, `DEFAULT_PAGE_SIZE`, `DEFAULT_ACTIVE_REASON` |
| `entities.ts` | `ENTITIES` — maps every Spring Boot class name to its primary key (25+ entities) |
| `proc.ts` | Stored procedure parameter definitions + `buildProcQuery()` helper |
| `ui.ts` | `STATUS_LABELS`, `STATUS_VARIANTS`, `EMPTY_STATE_MESSAGES`, `VALIDATION_MESSAGES`, `ALIAS_LABELS`, `GM_CODES` (95 general master codes) |
| `index.ts` | Barrel — re-exports everything above |

---

## `src/common/`

Direct mirror of Angular's `src/app/common/`. Foundation-layer code shared across all modules.

### `src/common/` (root files)

| File | What it does |
|---|---|
| `alias-labels.ts` | Institution-specific terminology map (e.g. "organization" vs "college") |
| `general-constants.ts` | Status colours and misc constants ported from Angular |
| `generic-functions.ts` | Session storage helpers (`setSecuredValue`, `getSecuredValue`, etc.) + `isEmptyObject` + `formatDate` (DD/MM/YYYY) + `htmlToPlaintext` (strips tags, decodes entities) |
| `global.service.ts` | Singleton for employee/org state (`EmpSecurity`, `EmployeeDetails`, `dashboardUrl`). Provides functional API + `GlobalService` class + `globalService` singleton for Angular-style compatibility. Not reactive — use Zustand/context in React components. |
| `print-config.ts` | Print layout configuration for PDF/print views |

### `src/common/components/`

Reusable domain-aware UI components. These know about ERP data shapes but nothing about the app shell. **Import from here when building pages.**

```
common/components/
├── breadcrumb/
│   ├── Breadcrumb.tsx        Navigation trail — collapses long paths to first + … + last-2
│   ├── useBreadcrumb.ts      Hook — auto-derives breadcrumbs from current pathname
│   └── index.ts
│
├── charts/                   All chart components live here
│   ├── BarChart.tsx          Recharts bar chart — vertical/horizontal/stacked, click handler
│   ├── PieChart.tsx          Recharts pie/donut — hover expand, custom tooltip
│   ├── DrilldownChart.tsx    Stub — not yet implemented
│   └── index.ts
│
├── data-display/
│   ├── StatCard.tsx          Dashboard stat card — title, value, icon, colour variant
│   ├── StatusBadge.tsx       Active/inactive/pending badge using CSS token colours
│   ├── EvalStatusBadge.tsx   Evaluation status badge — dot + label for the 7 eval status codes
│   │                         (New, Assigned, In Progress, Evaluated, Finalized, Rejected, UFM)
│   └── index.ts
│
├── rich-text-editor/
│   ├── RichTextEditor.tsx    Tiptap editor with math/chemistry — controlled (value/onChange), toolbar,
│   │                         bold/italic/color/align/lists/links/images/tables, KaTeX inline+block
│   ├── RichTextToolbar.tsx   Formatting toolbar for RichTextEditor — font, size, color pickers,
│   │                         alignment, lists, link, image upload, table, math/chem modal triggers
│   ├── MathContent.tsx       Display-only renderer for HTML containing Tiptap math nodes — uses
│   │                         useMemo+KaTeX to preprocess synchronously (no useEffect flicker)
│   ├── MathInsertModal.tsx   Visual equation editor — MathLive web component, symbol palettes
│   │                         (Powers, Greek, Relations, Chemistry), live KaTeX preview, inline/block modes
│   └── index.ts              Exports: RichTextEditor, RichTextEditorProps, MathContent
│
├── date-picker/
│   ├── DatePicker.tsx        Radix Popover + react-day-picker — min/max constraints
│   ├── MonthYearPicker.tsx   Month/year variant
│   └── index.ts
│
├── feedback/
│   ├── ConfirmDialog.tsx     Confirmation modal for destructive actions
│   ├── EmptyState.tsx        Empty state placeholder with icon + message
│   ├── ErrorBoundary.tsx     React error boundary
│   ├── FormModal.tsx         Generic form modal wrapper
│   └── index.ts
│
├── forms/
│   ├── ActiveStatusField.tsx Compound field — isActive checkbox + conditional reason input.
│   │                         Used in every CRUD modal. Eliminates repetition.
│   ├── CollegeFilterPanel.tsx Filter panel for college-scoped queries
│   ├── FormField.tsx         Generic labelled form field wrapper with error display
│   └── index.ts
│
├── search/
│   ├── SearchInput.tsx       Debounced search input — instant by default (0ms), pass `serverSearch`
│   │                         for 300ms. Pass `collapsible` for icon-button mode.
│   └── index.ts
│
├── select/
│   ├── Select.tsx            Custom select — Radix Popover, searchable, clearable, loading state
│   ├── MultiSelect.tsx       Multi-select with checkbox list
│   └── index.ts
│
├── table/
│   ├── DataTable.tsx         AG Grid Community v35 wrapper — pagination, loading, row click
│   ├── Table.tsx             Lightweight simple table for small static datasets
│   └── index.ts
│
├── theme-setting-modal/
│   ├── ThemeSettingModal.tsx Appearance settings — colour scheme, sidebar, font size
│   └── index.ts
│
└── index.ts                  Main barrel — re-exports all of the above
```

---

## `src/components/`

App-specific components. These know about the app shell, session, and navigation.

### `src/components/ui/`

Shadcn/Radix primitive components. **Generated/installed — do not modify by hand.** Use these as building blocks inside layout and common components.

`avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `loader`, `popover`, `radio-group`, `select`, `separator`, `skeleton`, `tabs`

### `src/components/layout/`

The app shell. Only import these from page layouts — not from reusable components.

| File | What it does |
|---|---|
| `AppShell.tsx` | Root layout — Sidebar + Topbar + content area. Manages sidebar collapse state. |
| `Sidebar.tsx` | Navigation sidebar — renders NavItem tree, expandable search (filters nav by label), auto-scroll to active item on route change (160ms delay for Collapsible animation), debug visibility filter (hides items from `hiddenIds` set in debug mode), collapse animations |
| `Topbar.tsx` | Header bar — backend-driven global search (fetches all accessible pages from `AUTH_API.USER_ACCESS`, keyboard navigation ArrowUp/Down/Enter/Escape, ARIA combobox), role-based avatar colors, notifications/apps/help buttons, user dropdown with logout |
| `NavItem.tsx` | Individual sidebar item — 500+ Material Design → Lucide icon map, recursive rendering with depth-based indentation, active state detection (including active descendant check for parent modules), icon-only mode when sidebar collapsed, `aria-current="page"` on active links |
| `PageContainer.tsx` | Content wrapper — applies standard page padding via CSS tokens |
| `PageHeader.tsx` | Page header — breadcrumb + title + subtitle + optional action slot (buttons etc.) |
| `index.ts` | Barrel export |

### `src/components/shared/`

| File | What it does |
|---|---|
| `RoleGuard.tsx` | **Layer 3 auth guard (UI only).** Renders children only if user has a required role. Not a security boundary — use for UX gating only. |
| `index.ts` | Barrel export |

---

## `src/lib/`

Framework utilities. Not business logic — pure helpers used across services, hooks, and components.

| File | What it does |
|---|---|
| `errors.ts` | `AppError` class, `parseApiError()`, `getErrorMessage()` — consistent error handling |
| `navigation.ts` | `buildNavTree()` — converts UserDTO modules/pages into `NavItem[]` for the sidebar |
| `query-keys.ts` | `QK` — TanStack Query key factory for all entities. Covers: `session`, `examSessions`, `examGrades`, `examMaxMarks`, `examFeeSetup`, `examTimetable`, `examMaster`, `seatingPlan`, `invigilatorRemuneration`, `revaluationFee`, `organizations`, `campuses`, `questionBanks`, `collegeFilters` |
| `schemas.ts` | `baseEntitySchema` — reusable Zod schema fragment for `isActive` + `reason` fields |
| `session.ts` | `sessionOptions`, `getSession()` — iron-session config and server-side helper |
| `toast.ts` | `toastError()`, `toastSuccess()` — Sonner toast wrappers |
| `utils.ts` | `cn()` (Tailwind merge), `rowIndexGetter()` (AG Grid), `distinct()` (dedup array) |

---

## `src/services/`

**All API calls go through here. Pages and components never call `fetch()` directly.**

| File | What it does |
|---|---|
| `crud.ts` | Generic HTTP client — `domainList`, `domainCreate`, `domainUpdate`, `domainSoftDelete`, `getAllRecords`, `fetchDetails`, `postDetails`, `putDetails`, `uploadFile`. Parses Spring Boot `{ statusCode, success, data }` envelopes. |
| `query.ts` | `buildQuery()` — builds filter + sort strings for Spring Boot domain queries |
| `evaluation.ts` | All evaluation API calls — answer papers, marking, finalize, reject, UFM, stamps. See PROGRESS.md Phase 9 for full function list. |
| `admin/organization.ts` | Organization CRUD + geo hierarchy — `listOrganizations`, `createOrganization`, `updateOrganization`, `uploadOrganizationLogo`, `listCountries`, `listStatesByCountry`, `listDistrictsByState`, `listCitiesByDistrict`, `listActiveOrganizations` |
| `admin/campus.ts` | Campus CRUD — `listCampuses`, `createCampus`, `updateCampus` |
| `admin/question-bank.ts` | Question bank + question CRUD — `listQuestionBanks`, `createQuestionBank`, `updateQuestionBank`, `listQuestionsByBank`, `addOrUpdateQuestion`, `importQuestionsFromExcel`, `searchCourses`, `listQuestionTypes` |
| `index.ts` | Barrel export |

---

## `src/hooks/`

Custom React hooks. All client-side.

| File | What it does |
|---|---|
| `useCrudList.ts` | TanStack Query wrapper for list fetching — returns `data` (defaults `[]`), `isLoading`, `invalidate()` |
| `useCrudMutation.ts` | `useMutation` wrapper — auto-invalidates cache on success |
| `useEntityForm.ts` | Form boilerplate eliminator — wires `zodResolver`, resets on open, tracks `isEdit` + `formError` |
| `useFormError.ts` | Lightweight error state — `error`, `handleError()`, `clear()` for non-field errors |
| `useCollegeFilters.ts` | Cascading University → Course → Regulation filter state. Currently stubbed (returns empty arrays) — data wired up once `todo/examination-module/` is restored. Options: `{ withRegulations?, autoSelectFirst? }` |
| `useSession.ts` | TanStack Query wrapper for `/api/auth/me` — returns current session user |
| `index.ts` | Barrel export |

---

## `src/context/`

| File | What it does |
|---|---|
| `SessionContext.tsx` | `SessionProvider` — wraps `QueryClientProvider`, initialises from server-provided user to avoid hydration flash. `useSessionContext()` hook returns `user`, `isLoading`, `refetch`. |

---

## `src/docs/`

Internal architecture documentation. Not shipped — for developer reference only.

| File | What it covers |
|---|---|
| `ONBOARDING.md` | Dev setup, Node version, `.env` config, five core mental models, adding new pages, troubleshooting |
| `architecture/README.md` | Full tech stack, folder structure, data flow diagram, security model, multi-tenancy |
| `architecture/data-fetching.md` | Three fetch contexts (client→BFF, Server Component, Server Action), TanStack Query conventions, cache invalidation patterns, anti-patterns |
| `architecture/navigation.md` | Navigation state machine (Zustand), server-to-client data flow, NavItem rendering, active state, sidebar collapse, auto-collapse, mobile behavior |
| `architecture/service-layer.md` | Why services exist, file naming, patterns, `domainList` vs `getAllRecords` vs custom, error handling, anti-patterns |
| `components/README.md` | Complete props interfaces, usage examples, import statements for every shared component |
| `flows/auth-flow.md` | Step-by-step login → JWT → iron-session → SessionUser flow, session cookie contents, security properties |
| `flows/api-proxy-flow.md` | Proxy architecture, file upload handling, 401 session destruction, `examId ` trailing-space quirk |

---

## `src/store/`

Zustand stores for client-side UI state. Persisted to `localStorage`.

| File | What it does |
|---|---|
| `navigation-store.ts` | Sidebar state — `navItems`, `collapsedItems` (Set), `isSidebarOpen`, `isSidebarCollapsed`, `isSidebarHovered`, `autoCollapse`, `sidebarPosition`. Persists: `autoCollapse`, `isSidebarCollapsed`, `sidebarPosition` (excludes hover state and navItems). Smart seeding: all modules start collapsed on first `setNavItems()` call; subsequent calls don't re-seed. |

---

## `src/integrations/`

Direct Spring Boot API calls. **Server-only** — never import from client components.

| File | What it does |
|---|---|
| `spring-api.ts` | `springLogin()` — authenticates against Spring Boot, returns JWT + UserDTO. `springGetUserDetails()` — fetches user modules/pages by userId. Called from API routes and server layouts only. |

---

## `src/debug/`

Dev-only tooling. Gated by `IS_DEBUG_MODE`. Does not ship to production.

| File | What it does |
|---|---|
| `constants.ts` | `IS_DEBUG_MODE` flag, `DEBUG_STORAGE_KEY` |
| `debug-store.ts` | Zustand store — debug panel open state, active tab, nav visibility toggles |
| `DebugPanel.tsx` | Debug drawer UI with tabbed navigation |
| `DebugTrigger.tsx` | Button to open/close the debug panel |
| `panels/NavVisibilityPanel.tsx` | Debug tab for toggling sidebar nav item visibility |
| `index.ts` | Barrel export |

---

## Key rules

**Where to put a new reusable form/table/display component?**
→ `src/common/components/<category>/`

**Where to put a new page?**
→ `src/app/(pages)/(protected)/<module>/page.tsx`

**Where to put a new API call?**
→ `src/services/admin/<entity>.ts` (never inline in a component)

**Where to put a new type?**
→ `src/types/<entity>.ts`

**Where to put a new constant/endpoint path?**
→ `src/config/constants/api.ts` (endpoint) or `src/config/constants/ui.ts` (display values)

**Where to put a new custom hook?**
→ `src/hooks/use<Name>.ts`

**Where to put a shared date/string/HTML utility?**
→ `src/common/generic-functions.ts` — not inline in the page file

**Where to find internal architecture guides?**
→ `src/docs/` — ONBOARDING, auth-flow, api-proxy-flow, data-fetching, navigation, service-layer, component catalog

**Where to find module-specific guides?**
→ `docs/` — `marking-page-flow.md`, `question-bank-module.md`, `decisions/`

---

## `docs/` — Module Documentation

| File | What it covers |
|---|---|
| `PROJECT_STRUCTURE.md` | This file — full src/ directory reference |
| `marking-page-flow.md` | Complete PDF marking tool flow — stamp placement, drag-to-move, finalize/reject/UFM, service call table |
| `question-bank-module.md` | Question bank + rich text editor — data model, page flow, per-type question editors, math/chemistry, service table, query keys |
| `decisions/no-guards-folder.md` | Why there is no `guards/` folder — 3-layer auth architecture explanation |
