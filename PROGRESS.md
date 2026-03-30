# College ERP — Next.js Migration Progress

> Migration from Angular 11 + Spring Boot 2.0 → Next.js 16 + same Spring Boot (frozen).
> Backend is read-only. All changes are frontend only.

---

## Phase 8: UI Polish, SearchInput Improvements & Angular Parity Fixes (2026-03-30)

### Breadcrumbs

Added breadcrumb navigation to every protected page.

- **`PageHeader`** — imports `useBreadcrumb` + `Breadcrumb` and renders the trail automatically above the title. All pages using `PageHeader` (Organizations, Campus, and all future pages) get breadcrumbs for free.
- **`dashboard/page.tsx`** — Dashboard uses a custom welcome header instead of `PageHeader`, so breadcrumbs were added directly via `useBreadcrumb`.
- The `useBreadcrumb` hook auto-generates the trail from the URL path (strips route groups, converts kebab-case to Title Case). No per-page configuration needed.

---

### Topbar: Search → Collapsible Icon Button

Replaced the always-visible search input on the left side of the Topbar with a search icon button in the right icon group (alongside bell, apps, help).

- Default state: search icon button only.
- On click: expands to a focused input (`w-56`) with the same live-search dropdown behaviour as before.
- Collapse triggers: clicking outside, pressing `Escape`, or navigating to a result.
- Added `isSearchExpanded` state; `openSearch()` sets it and focuses the input via `setTimeout`.

---

### SearchInput Component — 3 improvements

**File:** `src/common/components/search/SearchInput.tsx`

#### 1. Fixed controlled-mode display lag
`displayValue` was bound to the debounced parent `value` prop, making every keystroke lag by the debounce delay before appearing. Fixed by always using `localValue` for display — the input is instant, debounce only throttles the `onChange` callback to the parent.

#### 2. `collapsible` prop
When `collapsible={true}`, renders as a plain icon button. Click expands to the full input with auto-focus. Blur on empty value or `Escape` collapses back to the icon.

```tsx
<SearchInput collapsible value={q} onChange={setQ} placeholder="Search..." />
```

#### 3. `serverSearch` prop — zero debounce by default
Default debounce changed from 300 ms to **0 ms** (instant). Pass `serverSearch` to opt into 300 ms debounce for API-backed searches.

```tsx
// Client-side filter — instant (default)
<SearchInput value={q} onChange={setQ} />

// Server/API search — 300 ms debounce
<SearchInput serverSearch value={q} onChange={setQ} />
```

---

### Angular Parity Audit: Campus & Organizations

Cross-checked both pages against `college_erp_angular_foundation_work` and `college_erp_angular_old`.

#### Campus — ✅ Full parity confirmed
Columns, form fields, validations, cascading dropdowns, and API calls all match across all three codebases.

#### Organizations — 3 gaps fixed

| Gap | Angular source | Fix applied |
|---|---|---|
| Mobile number validation | `Validators.pattern('[6-9]{1}[0-9]{9}')` | Added Zod `.refine()` with `/^[6-9][0-9]{9}$/` |
| Email validation | `Validators.email` | Added Zod `.refine()` with standard email regex |
| License date range | `calDays()` — resets To date if before From date | Added `useEffect` watching `licenseFdate`; auto-sets `licenseTdate = licenseFdate` when violated |

**Banner logo** — The old repo had a banner logo upload field in the Add modal HTML, but it was never wired to any API endpoint, not present in the Organization model, and absent from the Edit modal. Field was **not added** to Next.js.

---

## Phase 7: Angular Foundation Structure Migration (2026-03-29)

Migrated Angular's `src/app/common/` structure into the Next.js project as `src/common/`, providing shared constants, utility functions, and reusable chart/form/table components that mirror the original Angular foundation layer.

### New `src/common/` Directory

Mirrors Angular's `src/app/common/` structure. Contains project-wide constants, utility functions, and reusable presentational components.

#### Constant Files (`src/common/`)

| File | Purpose |
|---|---|
| `constants.ts` | Core application-wide constants (API base paths, pagination defaults, app name) |
| `general-constants.ts` | Domain constants: roles, status codes, academic year formats, exam-related enums |
| `alias-labels.ts` | Human-readable label mappings for entity field names (mirrors Angular alias map) |
| `generic-functions.ts` | Shared utility functions: date formatting, string helpers, data transformations |
| `print-config.ts` | Print layout configuration for PDF/print views |

#### New `src/common/components/`

| Component | Angular equivalent | Notes |
|---|---|---|
| `bar-chart/` | `BarChartComponent` | Recharts `BarChart` (replaces Highcharts) |
| `pie-chart/` | `PieChartComponent` | Recharts `PieChart` (replaces Highcharts) |
| `breadcrumb/` | `BreadcrumbComponent` | Path-based breadcrumb trail |
| `search/` | `SearchComponent` | Controlled search input with debounce |
| `select/` | `SelectComponent` | Labeled dropdown wrapping Shadcn Select |
| `date-picker/` | `DatePickerComponent` | Date input backed by Radix Popover + Calendar |
| `table/` | `TableComponent` | Generic data table (lightweight, non-AG Grid) |
| `theme-setting-modal/` | `ThemeSettingModalComponent` | Theme/appearance preferences modal |

#### New Pages

| Route | Notes |
|---|---|
| `admin/organizations` | Organization management page |
| `admin/campus` | Campus management page |
| `dashboards/evaluation-dashboard` | Evaluation statistics dashboard using chart components |
| `evaluation/*` | Evaluation module pages |
| `pdf-download` | PDF download/export page |
| `sample` | Component showcase / developer reference page |

### Tech Added

- **recharts** — used by `bar-chart` and `pie-chart` components as an OSS replacement for Highcharts (which requires a commercial licence). API differs from Highcharts; see `src/common/components/bar-chart/` and `pie-chart/` for the props interface.

---

## Phase 6 — QueryDSL Field Audit vs Angular Source (2026-03-29)

Cross-checked all service `buildQuery` calls against the Angular `CrudService` and component source code to find field names, relationship paths, and sort fields that diverged from the original. Four bugs fixed.

### Fixes

| Service | Issue | Angular source | Fix applied |
|---|---|---|---|
| `exam-grade.service.ts` | Wrong flat field names in query | `Course.courseId`, `Regulation.regulationId`, `disabled` | Changed `courseId`→`Course.courseId`, `regulationId`→`Regulation.regulationId`, `isForDisabled`→`disabled` |
| `exam-grade.service.ts` | Extra `universityId` filter Angular never sent | Not in Angular call | Removed from service signature + conditions |
| `exam-max-marks.service.ts` | Wrong boolean field name | Angular uses `disabled` (entity field); `isForDisabled` is the form field only | Changed `isForDisabled`→`disabled` in `buildQuery` |
| `invigilator-remuneration.service.ts` | Sort by PK instead of `createdDt` | `order(createdDt=desc)` | Changed `examInvgRemunerationId`→`createdDt` |
| `revaluation-fee.service.ts` | Sort by PK instead of `createdDt` | `order(createdDt=desc)` | Changed `examFeeStructureId`→`createdDt` |

### What was confirmed correct

| Service | Angular | Next.js | Status |
|---|---|---|---|
| `exam-master.service.ts` | `Universities.universityId`, `Course.courseId`, `AcademicYear.academicYearId` | Same relationship paths | ✓ |
| `exam-session.service.ts` | `order(createdDt=desc)`, `size=99999` | `order(createdDt=DESC)`, `size=99999` | ✓ |
| `exam-max-marks.service.ts` | `Course.courseId`, `Regulation.regulationId` | Same | ✓ |
| `exam-timetable.service.ts` | No `size` on custom `/examtimetabledetails` endpoint | No `size` (raw fetch, not `domainList`) | ✓ |
| `seating-plan.service.ts` | All records, no exam filter | Filter by `ExamMaster.examId` + `isActive==true` | Intentional improvement (Angular loaded all records) |
| `exam-fee-setup.service.ts` | Stored proc params (15 fields) | Same 15 fields | ✓ |
| `crud.service.ts` `domainList` | `size=99999` on domain/list calls | `size=99999` always | ✓ |

### Key Angular convention confirmed

The Spring Boot entity `ExamGrade` / `ExamMarkssetup` uses **`disabled`** as the boolean field name (Java entity), while Angular's form binds it to **`isForDisabled`**. QueryDSL filters must use the entity field name (`disabled`), not the form field name. This distinction applies to any entity with a `disabled` / `isForDisabled` field mismatch.

---

## Phase 5 — Refactoring & Code Quality (2026-03-29)

### New Shared Utilities

#### `src/lib/utils.ts` — `distinct<T>()`
Added the `distinct<T>(arr, keyFn)` deduplication helper. Was copy-pasted verbatim into 6 page files; now lives in one place and is imported everywhere.

#### `src/hooks/useCollegeFilters.ts` — cascading filter hook
New custom hook that encapsulates the University → Course → Regulation cascade used by all filter-bearing exam pages.

```typescript
const filters = useCollegeFilters({ withRegulations: true })
// filters.universities, filters.courses, filters.regulations
// filters.selectedUniversityId, filters.setUniversityId, ...
```

- Uses `getCollegeFilters(orgId, empId)` for University/Course data (shared `'college-filters'` TanStack Query cache key)
- Loads regulations lazily via `getRegulations(courseId)` (keyed `['regulations', courseId]`)
- Auto-selects first item in each list on load
- `staleTime: 5 min` on both queries

#### `src/components/forms/CollegeFilterPanel.tsx` — filter panel component
Renders the standard University → Course → Regulation filter grid from `useCollegeFilters` state. Regulation and "For Disabled Students" sections are opt-in (only rendered when the caller passes the corresponding props). Accepts a `children` slot for page-specific extra filters.

### Pages Refactored

| Page | Change | Line delta |
|---|---|---|
| `grade-setup/page.tsx` | Replaced ~140 lines of filter state + cascade logic + panel JSX with `useCollegeFilters` + `CollegeFilterPanel` | 387 → 202 (−48%) |
| `exam-max-marks-setup/page.tsx` | Same; also migrated regulation source from stored-proc bundle to `getRegulations(courseId)` | 394 → 226 (−43%) |
| `exam-timetable/page.tsx` | Removed local `distinct` copy, imported from `lib/utils` | −10 lines |
| `exam-fee-setup/page.tsx` | Same; also unified `'college-filters-fee'` cache key → `'college-filters'` | −10 lines |
| `exam-master/page.tsx` | Removed local `distinct` copy | −10 lines |
| `seating-plan-setup/page.tsx` | Removed local `distinct` copy | −10 lines |
| `invigilator-remuneration/page.tsx` | Replaced raw `<button className="...">` with `<Button size="sm" variant>`; added `PlusIcon` to header button | |

### Bug Fixes

- **`saveMarksSetup` (`&&` → `||`)** in `exam-max-marks.service.ts` — was using logical AND so a response with `success: false` but `statusCode: 200` would silently pass as successful. Fixed to `||`.

### Service Layer Cleanup

- **`exam-fee-setup.service.ts` `getExamFilters()`** — replaced raw `fetch` + manual `URLSearchParams` + manual error handling with `getAllRecords('s_get_exam_filters_bycode', ...)` from `crud.service`. Removed local `SpringProcResponse<T>` interface that duplicated the standard response shape.
- **`exam-timetable.service.ts`** — removed dead `getSubjectsForCourseYear()` (superseded by `getSubjectsForYear()` which accepts an optional `regulationId`).

### Query Cache Unification

`exam-fee-setup/page.tsx` used `'college-filters-fee'` as the TanStack Query key for `getCollegeFilters`. Changed to `'college-filters'` (matching the hook and all other pages) so the cache is shared — the same API call is not made twice when navigating between pages.

### Grade Modal Query Invalidation Fix

`GradeSetupModal.tsx` was calling `queryClient.invalidateQueries({ queryKey: ['exam-grades'] })` inside the mutation's `onSuccess`, then also calling the page's `onSuccess()` callback which already invalidates with the full parameterized key. Removed the redundant invalidation from the modal and the unused `useQueryClient` import.

### Dead Code Removal

| Location | Removed |
|---|---|
| `src/types/api.ts` | `PaginatedResponse<T>`, `SpringListResponse<T>`, `ApiError` — defined but never imported anywhere |
| `src/config/constants/api.ts` `EXAM_API` | 11 `LIST_*` / `CREATE_*` / `UPDATE_*` constants for domain paths that `domainList`/`domainCreate` build internally; never referenced |
| `src/config/constants/api.ts` `EXAM_MASTERS_API` | `EXAM_SESSION_ENTITY`, `EXAM_GRADE_ENTITY` (services hardcode the strings directly), `GET_EXAM_FILTERS_BY_CODE` (service now calls `getAllRecords` with the proc name directly) |

### Service Type Safety

Removed `| Record<string, unknown>` union type from all create/update service functions. The union defeated TypeScript inference at every call site — callers would have to check which branch they're on even though only one type is ever passed.

| Service | Functions fixed |
|---|---|
| `invigilator-remuneration.service.ts` | `createInvigilatorRemuneration`, `updateInvigilatorRemuneration` |
| `revaluation-fee.service.ts` | `createRevaluationFee`, `updateRevaluationFee` |

Fixed type narrowing in `exam-max-marks.service.ts` `getMarksSetupFilters()`:
- Before: `arr[0] as unknown as Record<string, unknown>` (double cast, unsafe)
- After: `arr[0] as { flag?: string; clg_filters_regulation?: string }` (targeted shape, no unsafe double cast)

### BFF Proxy Audit (2026-03-29)

Full audit of `src/app/api/proxy/[...path]/route.ts`, `src/app/api/auth/`, `src/lib/session.ts`, and `src/lib/errors.ts`.

**Verdict: Production-ready. No critical issues.**

What was confirmed correct:
- JWT never exposed to browser (Iron Session HTTP-only cookie)
- Session validated on every proxy request; returns 401 if missing
- Spring Boot 401 destroys session (lifecycle sync)
- Multipart `Content-Type` boundary preserved for file uploads
- Error messages extracted correctly from Spring Boot envelope
- Rate limiting on login (10 req/min per IP)

Known limitations (non-blocking):
- Proxy always parses response as JSON — binary file download endpoints would fail (no such endpoints currently)
- No HTTP `Cache-Control` headers on reference data (TanStack Query `staleTime` handles client-side deduplication adequately)
- Session age check exists on `/api/auth/me` but not on the proxy route (Iron Session TTL is sufficient)

Created `src/docs/architecture/data-fetching.md` — documents when to use `domainList` vs `getAllRecords` vs raw `fetch`, TanStack Query conventions (query key structure, staleTime guidelines, cache invalidation), and the full security model.

---

---

## Phase 4 — Angular Parity Audit & Data-Loading Fixes (2026-03-29)

### Root Cause Fixed — All Grid Data Was Empty
- **`crud.service.ts` `domainList()`** — Spring Boot `domain/list` wraps results in `ApiResponse<PageResponse>` where `data.resultList` is the actual array. The function was reading `body.data` (the PageResponse object) instead of `body.data.resultList`. Also added `size=99999` to URL so all records are returned (Spring Boot defaults to 100). This single fix restores data display across every page that uses `domainList`.
- **`exam-master.service.ts` `fetchExamsByUniversity` / `fetchExamsByCollege` / `getExamMasterById`** — a previous session accidentally changed these from `json.data?.resultList` (correct) to `json.data` (wrong). Refactored all three to delegate to the now-correct `domainList` instead of raw fetch.

### Exam Timetable — Correct List Endpoint
- **`exam-timetable.service.ts` `getExamTimetables()`** — was calling `domain/list/ExamTimetable` (generic CRUD). Spring Boot has a dedicated denormalised endpoint `GET /examtimetabledetails?examId=X&courseYearId=Y&courseId=Z` (controller: `ExamTimetableController`) that returns `ExamTimetableDetailDTO` with all joined fields (groupCode, regulationCode, subjectCode, examSessionName, etc.). Fixed to call the correct endpoint.

### Exam Sessions — Missing Fields and Columns
- **`ExamSessionModal.tsx`** — added `universityId` (required) and `examsessioninCatId` (optional) fields; modal now fetches `s_get_collegewisedetails_bycode` with `in_flag: 'clg_filters,gm_codes'` and `in_gm_codes: 'EXMSESN'` to populate University and Session-In dropdowns; both fields included in create/update payload
- **`exam-session/page.tsx`** — added `universityCode` and `examsessioninCatCode` ("Session In") columns to match Angular `displayedColumns`
- **`exam-session.service.ts`** — fixed sort order: `examSessionName ASC` → `createdDt DESC` to match Angular

### Grade Setup — Filter Panel and Payload
- **`grade-setup/page.tsx`** — added cascading University → Course → Regulation filter panel (same pattern as exam-max-marks-setup); grades query only fires when courseId + regulationId are both selected; passes filter values to `getExamGrades()`
- **`GradeSetupModal.tsx`** — added `context` prop `{ universityId, courseId, regulationId, isForDisabled }`; these FK fields are merged into create/update payload (Angular injects them at save time)
- **`exam-grade.ts` types** — added optional FK fields to `ExamGradeFormValues`
- Column order fixed: Grade Code now before Grade Name (matches Angular)

### Exam Max Marks — Missing Columns and Fields
- **`exam-max-marks-setup/page.tsx`** — removed `isForDisabled` column (filter param, not a display column); added `finalIntPercentage` and `finalExtPercentage` columns after `externalPassPercentage`
- **`ExamMaxMarksModal.tsx`** — added `finalIntPercentage` and `finalExtPercentage` fields to Zod schema, form UI, and save payload; context FK fields (`courseId`, `regulationId`, `universityId`, `isForDisabled`) already present

### Angular Parity Audit — Pages Needing Deeper Redesign
Full audit performed comparing each Angular component against its Next.js counterpart. The following pages have correctly-functioning basic CRUD but are missing complex Angular features that require dedicated per-page work:

| Page | Missing |
|---|---|
| **Exam Timetable** | Calendar grid view (primary Angular UI), multi-step batch-add flow (session→regulation→subjects→courseGroups), conflict-check dialog |
| **Exam Fee Setup** | Course-group/year applicability matrix, additional fees sub-table, late fee fines sub-table; `POST /examfeestructure` batch endpoint needed |
| **Revaluation Fee Setup** | Subject1–Subject7 per-subject fee fields, course-group/year matrix, additional fee and fine sub-tables; no filter panel (shows all records) |
| **Seating Plan** | College + Exam Timetable filter levels, seating grid visualization, student auto-assignment, all print features |

---

## Phase 3 — Examination Module Bug Fixes (2026-03-29)

### Fixed
- `crud.service.ts` `domainList()` — Spring Boot returns a bare object (not array) when exactly one record matches. Added normalisation: `null → []`, `object → [object]`, `array → array`. This was the root cause of all "`.map` is not a function" runtime errors across the entire app.
- `exam-master.service.ts` `fetchExamsByUniversity` / `fetchExamsByCollege` / `getExamMasterById` — same single-object guard applied to functions that bypass `domainList` with raw `fetch`
- `exam-max-marks.service.ts` `fetchMarksSetup` — wrong QueryDSL field name `disabled` → `isForDisabled`
- `exam-max-marks.service.ts` `getMarksSetupFilters` — replaced raw `fetch` block with `getAllRecords` helper (removes duplicate error handling and stale `SpringListResponse` type)
- `ExamFeeSetupModal.tsx` payload — was sending `examMaster: { examId }` (nested) instead of flat `examId` that Spring Boot entity expects
- `seating-plan.service.ts` `buildSeatingPayload` — was sending PascalCase nested FKs (`ExamMaster: { examId }`, `ExamTimetable: { examTimetableId }`, `Room: { roomId }`); fixed to flat fields as Angular source confirms
- `SeatingPlanModal.tsx` — added `timetableSlots = []` default prop guard
- `InvigilatorRemunerationModal.tsx` — added `colleges = []` default prop guard
- `RevaluationFeeModal.tsx` — added `exams = []` default prop guard
- `invigilator-remuneration/page.tsx` — replaced fragile `onCellClicked` + `target.textContent` detection with proper `onClick` handlers inside cell renderer
- `revaluation-fee-setup/page.tsx` — same action button fix
- `ExamMasterModal.tsx` — added Zod `.refine()` validation: at least one of Regular/Supply/Internal exam type must be selected
- `exam-fee-setup/page.tsx` — college dropdown in college-specific mode (mode=2) was empty because `univ_exam_filters` stored proc doesn't include `fk_college_id`; now fetches college data via separate `getCollegeFilters` call using `s_get_collegewisedetails_bycode`
- Navigation sidebar — doubled URL paths fixed via `normalizeHref()` deduplication in `navigation.ts`
- Navigation sidebar — active state highlight now works for parent collapsible items via `hasActiveDescendant()` recursive check in `NavItem.tsx`
- Navigation sidebar — active link now gets `aria-current="page"`; `Sidebar.tsx` uses `scrollIntoView({ block: 'nearest' })` on route change so the active item is always visible without manual scrolling
- `not-found.tsx` — replaced full-page redirect with slide-up toast notification that auto-navigates back after 3s
- `src/app/(protected)/not-found.tsx` — 404 inside protected routes now renders **within** the `(protected)` layout so the sidebar stays intact; root `src/app/not-found.tsx` simplified to a silent redirect to `/dashboard` (no sidebar available at root level anyway)

---

## Phase 2 — Foundation & Component System (2026-03-29)

### Added
- `src/config/constants/` — api.ts, app.ts, ui.ts, proc.ts, index.ts — all endpoint paths and app constants
- `src/services/exam-master.service.ts` — service layer for exam master pages
- `src/lib/errors.ts` — AppError class, parseApiError, isAppError, getErrorMessage
- `src/types/common.ts` — SelectOption, DateRange, FilterState, PaginationState
- `src/components/feedback/` — ConfirmDialog, ErrorBoundary, EmptyState
- `src/components/data-display/` — StatusBadge, StatCard
- `src/components/forms/SearchInput` and `FilterBar`
- `src/components/shared/RoleGuard` and `PageContainer`
- `src/docs/` — architecture/, flows/, components/ documentation
- DataTable enhanced: pagination, CSV export, search input
- Dashboard: StatCard refactor, DEBUG panel removed

### Changed
- All exam master pages: inline fetches replaced with service calls
- SessionUser type: added organizationId field
- Dashboard: removed [DEBUG] amber panel
- API proxy: improved error response shaping

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Complete Login → Exam Master Flow](#complete-login--exam-master-flow)
3. [All Files Created / Modified](#all-files-created--modified)
4. [What Is Done](#what-is-done)
5. [What Is NOT Done](#what-is-not-done)
6. [Known Deferred Bugs (Spring Boot)](#known-deferred-bugs-spring-boot)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| UI components | Shadcn/UI pattern (Radix primitives + `cn()`) |
| Auth / session | iron-session v8 — HttpOnly encrypted cookie (JWT never reaches browser) |
| Server → Spring Boot | Next.js API route proxy (`/api/proxy/[...path]`) |
| Data fetching | TanStack Query v5 |
| Global state | Zustand v5 |
| Forms | react-hook-form v7 + zod v4 |
| Tables | AG Grid Community v35 |
| Date pickers | react-day-picker v9 + date-fns |
| Icons | lucide-react |
| Node requirement | **Node ≥ 20.9.0** (Next.js 16 hard requirement — current machine is Node 16, run `nvm use 20` before `npm run dev`) |

---

## Complete Login → Exam Master Flow

### 1. User hits any protected URL (e.g. `/dashboard`)

```
Browser → GET /dashboard
  → Next.js middleware (src/middleware.ts)
    → reads cookie "college_erp_session"
    → cookie absent? → redirect to /login
    → cookie present? → pass through
```

The middleware only checks for cookie **existence**, not validity (iron-session decryption happens inside route handlers).

---

### 2. Login page (`/login`)

```
User fills LoginForm → submit
  → POST /api/auth/login   (Next.js BFF route)
    → Rate limit check (10 req/min per IP, in-memory Map)
    → Zod validates body { usernameOrEmail, password }
    → springLogin()
        → POST {SPRING_API_URL}/api/auth/login
           body: { usernameOrEmail, password, isMobile: false }
           returns: { data: "<JWT_STRING>" }
    → springGetUserDetails(jwt)
        → GET {SPRING_API_URL}/api/authorization?isMobile=false
           header: Authorization: Bearer <JWT>
           returns: UserDTO (userId, userName, firstName, lastName, userRole,
                             userTypeCode, roleName, collegeId, collegeCode,
                             collegeName, academicYearId, academicYear,
                             employeeId, studentId, modules[], pages[], ...)
    → Build SessionUser (safe subset — NO jwt, NO email, NO mobile)
        derived flags computed server-side:
          isAdmin       = userRole === 'ADMIN' || 'SUPERADMIN'
          isPrincipal   = roleName includes 'PRINCIPAL'
          isManagement  = userTypeCode includes 'MGNT' || roleName includes 'MANAGEMENT'
        modules/pages excluded from cookie (cookie size limit ~4 KB)
    → Save to Iron Session cookie:
        { jwt, user: SessionUser (no modules/pages), issuedAt }
        HttpOnly, SameSite=Strict, Secure in production
        TTL: 360 minutes (21600 s)
    → Return to browser: { user: SessionUser + modules + pages }
        (jwt is NEVER in this response)
  ← Browser stores nothing — session is cookie-only
  → LoginForm calls router.push(user.defaultDashboardPath) → /dashboard
```

---

### 3. Protected layout server component (`src/app/(protected)/layout.tsx`)

Every page under `(protected)/` goes through this layout on every server render:

```
Server render
  → getSession() → reads + decrypts iron-session cookie
  → no session.user || no session.jwt? → redirect('/login')
  → springGetUserDetails(session.jwt)
      → GET {SPRING_API_URL}/api/authorization?isMobile=false
         (fetches fresh modules[] and pages[] — not stored in cookie)
  → Build initialUser = { ...session.user, modules, pages }
  → Render: <SessionProvider initialUser={initialUser}><AppShell>{page}</AppShell></SessionProvider>
```

`initialUser` is passed as a prop to the client-side `SessionProvider` to avoid a loading flash.

---

### 4. Client session hydration (`SessionContext` + `useSession`)

```
SessionProvider (client) receives initialUser from server
  → useSession() → TanStack Query
      queryKey: ['session']
      queryFn: GET /api/auth/me
        → Server reads cookie → validates issuedAt (max 360 min)
        → springGetUserDetails(jwt) → fresh modules/pages
        → returns { user: SessionUser + modules + pages }
      staleTime: 5 minutes (won't refetch for 5 min)
  → user = session.user ?? initialUser
     (initialUser prevents flash; TanStack Query takes over after)
  → SessionContext.Provider value: { user, isLoading, refetch }
```

Any component calls `useSessionContext()` to get the current user.

---

### 5. AppShell layout (`src/components/layout/AppShell.tsx`)

```
AppShell (client)
  ├── Sidebar (slate-900 dark panel, left)
  │     ├── Brand: user.collegeName
  │     ├── Nav: built from user.modules[] + user.pages[]
  │     │     via buildNavTree() → useNavigation() hook
  │     │     dynamic per role — admin sees all modules, student sees fewer
  │     ├── Help Center (static placeholder)
  │     └── Logout → POST /api/auth/logout → destroys cookie → /login
  └── Main area
        ├── Topbar (sticky, h-14)
        │     ├── Hamburger (mobile)
        │     ├── Search bar (static placeholder)
        │     ├── Bell notification (static placeholder)
        │     ├── Apps grid (static placeholder)
        │     ├── Help icon (static placeholder)
        │     └── User dropdown: name, role, Sign out
        └── <main> → page content rendered here
```

---

### 6. Dashboard page (`/dashboard`)

```
DashboardPage (client)
  → useSessionContext() → user
  → Shows: "Welcome back, {user.firstName}"
           role badge, collegeName, academicYear
  → Role-based stat cards (hardcoded zeros — not yet wired to real APIs):
       ADMIN/PRINCIPAL: Total Students, Active Staff, Pending Fees, Today's Attendance
       STAFF:           My Classes Today, Pending Assignments, Upcoming Exams, Student Count
       STUDENT:         Attendance %, Upcoming Exams, Fee Due, Course Progress
       PARENT:          Child Attendance, Fee Due, Upcoming Exams, Recent Grades
  → [DEBUG] SessionUser panel (amber collapsible) — shows all session fields
```

---

### 7. Navigating to Exam Master (`/admin-examination-management/admin-exam-masters/exam-master`)

No route guard beyond the middleware (cookie check). The page itself is a client component that calls APIs through the proxy.

---

### 8. Exam Master List page

```
ExamMasterPage (client)
  │
  ├── On mount: fetchFilterDetails()
  │     → GET /api/proxy/getAllRecords/s_get_collegewisedetails_bycode
  │           ?in_flag=clg_filters&in_org_id={user.organizationId??0}
  │            &in_loginuser_empid={user.employeeId??0}&...
  │     → Proxy: reads iron-session cookie → gets JWT → forwards to Spring Boot
  │     → Response: { data: { result: [[filtersdata], [academicData]] } }
  │           filtersdata: rows with flag='clg_filters'
  │                         each row: fk_university_id, university_name,
  │                                   fk_college_id, college_name,
  │                                   fk_course_id, course_name
  │           academicData: rows with clg_filters_ay='clg_filters_ay'
  │                          each row: fk_university_id, fk_academic_year_id,
  │                                    academic_year, is_curr_ay
  │     → Extract distinct universities → auto-select first
  │     → Cascade: university → courses → academic years (auto-select current AY)
  │     → If mode=1 (University): fetch exams immediately
  │     → If mode=2 (College): show college dropdown, fetch on college select
  │
  ├── Filter panel
  │     RadioGroup: [● Is For University]  [○ Is For College]
  │     Dropdowns:  University | Course | Academic Year | College (mode=2 only)
  │
  ├── AG Grid table (shown after first fetch)
  │     Columns: SI.No | Exam Name | Short Name | Exam Type | Month/Year |
  │              From Date | To Date | Fee Notification | Notification |
  │              Exam Labels | Status | Actions
  │     Cell renderers (JSX): Download links, Status badge, Edit button, Create Label link
  │     onCellClicked:
  │       "Exam Labels" → sessionStorage.setItem('examMasterDetails', JSON)
  │                     → router.push(...exam-master-details?examId=X)
  │       "Actions"     → open ExamMasterModal in edit mode
  │
  └── Add Exam button → open ExamMasterModal in add mode
```

---

### 9. Exam Master Modal (add / edit)

```
ExamMasterModal (Dialog)
  │
  ├── react-hook-form + zod validation
  ├── Fields:
  │     Exam Name (required) | Exam Short Name (required)
  │     Month/Year picker (MonthYearPicker) → auto-sets fromDate + toDate
  │     From Date (DatePicker) | To Date (DatePicker, validated ≥ fromDate)
  │     Exam Type: [□ Regular] [□ Supple] [□ Internal]
  │     [□ Is Published]  [□ Is Result Process Started]
  │     Notification Published On | Notification File (FileInput)
  │     Fee Notification Published On | Fee Notification File (FileInput)
  │     [□ Is Active]  Reason (shown only when inactive)
  │
  ├── Add mode → POST /api/proxy/domain/create/ExamMaster
  ├── Edit mode → PUT /api/proxy/domain/update/ExamMaster?query=examId=={id}
  └── Files selected → POST /api/proxy/examnotificationupload (multipart)
        FormData key "examId " (trailing space — matches Angular backend)
        file keys: notificationFilePath, feeNotificationFilePath
```

---

### 10. Exam Master Details page (`…/exam-master-details?examId=X`)

```
ExamMasterDetailsPage (client, wrapped in Suspense for useSearchParams)
  │
  ├── Read examId from URL search params
  ├── Read exam object from sessionStorage (written by list page on navigation)
  │     fallback: GET /api/proxy/domain/list/ExamMaster?query=examId==X
  │
  ├── Parallel data fetch (when exam ready):
  │     GET /api/proxy/domain/list/GeneralDetail
  │           ?query=GeneralMaster.generalMasterCode==EXMFEETYP.and.isActive==true
  │           → filter result: keep 'Regular' if exam.isRegularExam,
  │                            'Supple' if exam.isSupplyExam,
  │                            'Internal' if exam.isInternalExam
  │     GET /api/proxy/domain/list/Regulation
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true
  │     GET /api/proxy/domain/list/CourseGroup
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true
  │     GET /api/proxy/domain/list/CourseYear
  │           ?query=Course.courseId=={exam.courseId}.and.isActive==true.order(sortOrder=ASC)
  │     GET /api/proxy/domain/list/ExamMasterDetails
  │           ?query=examMaster.examId=={examId}.and.isActive==true
  │
  ├── Tabs: one tab per enabled exam type (Regular / Supple / Internal)
  │     Each tab:
  │       Form: Regulation | Course Group | Course Year | Exam Label | □ Is Bridge Course
  │       Table: all labels for this exam type (examTypeCatId match)
  │       Row actions: Edit (loads form) | Delete (soft: isActive=false)
  │
  └── Save All → POST /api/proxy/addExamMasterDetails  (full array)
        on 200: toast success → navigate back to exam-master list
```

---

### 11. API Proxy (`/api/proxy/[...path]`)

Every client-side `fetch('/api/proxy/...')` goes through this:

```
Proxy route handler
  → Read iron-session cookie → get JWT (server-side only)
  → No jwt? → 401 Unauthorized
  → Build target URL: {SPRING_API_URL}/{path}{queryString}
  → Detect Content-Type:
       multipart/form-data → forward Content-Type as-is (with boundary)
                             body: request.arrayBuffer()
       everything else     → set Content-Type: application/json
                             body: request.text()
  → fetch(targetUrl, { method, headers: { Authorization: Bearer JWT, ... }, body })
  → Spring Boot returns 401? → destroy session → return 401
  → Otherwise → return Spring Boot response body as-is
  JWT is NEVER included in any response body
```

---

## All Files Created / Modified

### Modified (pre-existing files changed)

| File | What changed |
|---|---|
| `src/app/api/proxy/[...path]/route.ts` | Fixed multipart support: detects `Content-Type: multipart/form-data`, forwards it as-is with boundary; uses `arrayBuffer()` for body instead of `text()` |
| `src/app/(protected)/dashboard/page.tsx` | Added `[DEBUG] SessionUser` collapsible amber panel; removed "New Session" button import; added `useState`, `ChevronDown`, `ChevronRight` imports |
| `src/components/layout/Sidebar.tsx` | Removed "New Session" CTA button and its `Plus` lucide import |

### Created (new files)

#### Types
| File | Purpose |
|---|---|
| `src/types/exam-master.ts` | `ExamMaster`, `ExamMasterFormValues`, `ExamMasterDetails`, `CollegeWiseFilterRow`, `GeneralDetail`, `Regulation`, `CourseGroup`, `CourseYear` |

#### Shadcn UI components
| File | Purpose |
|---|---|
| `src/components/ui/dialog.tsx` | Radix Dialog wrapper — used by ExamMasterModal |
| `src/components/ui/popover.tsx` | Radix Popover wrapper — used by DatePicker, MonthYearPicker |
| `src/components/ui/select.tsx` | Radix Select wrapper — used by filter dropdowns |
| `src/components/ui/checkbox.tsx` | Radix Checkbox wrapper — used by modal form |
| `src/components/ui/tabs.tsx` | Radix Tabs wrapper — used by exam-master-details |
| `src/components/ui/calendar.tsx` | react-day-picker Calendar — used by DatePicker |
| `src/components/ui/radio-group.tsx` | Radix RadioGroup wrapper — used by mode toggle |

#### Reusable components
| File | Purpose |
|---|---|
| `src/components/data-table/DataTable.tsx` | Generic AG Grid wrapper: `rowData`, `columnDefs`, `loading`, `quickFilterText`, `onCellClicked` |
| `src/components/layout/PageHeader.tsx` | `title` + `subtitle` + `action` slot page header |
| `src/components/forms/DatePicker.tsx` | Popover + Calendar date picker (dd/MM/yyyy display) |
| `src/components/forms/MonthYearPicker.tsx` | Custom month/year grid picker (MM/yyyy display) |

#### Exam Master feature
| File | Purpose |
|---|---|
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/page.tsx` | List page — filters, AG Grid table, cell renderers |
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/ExamMasterModal.tsx` | Add/Edit dialog — full form with file upload |
| `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/exam-master-details/page.tsx` | Details/labels page — tabs, add/edit/delete labels, save all |

---

## What Is Done

### Infrastructure
- [x] `src/services/crud.service.ts` — generic domain CRUD: `buildQuery`, `domainList`, `domainGet`, `domainCreate`, `domainUpdate`, `domainSoftDelete`, `domainDelete`, `getAllRecords`
- [x] `exam-master.service.ts` refactored to use crud.service.ts internally (all inline `fetch()` calls replaced)
- [x] Iron Session BFF auth — JWT stored server-side only, never exposed to browser
- [x] `/api/proxy/[...path]` — catch-all proxy to Spring Boot with JWT injection
- [x] Proxy multipart fix — file uploads forwarded correctly
- [x] Middleware route guard — redirects unauthenticated requests to `/login`
- [x] Session expiry check — server-side 360-minute check on `/api/auth/me`
- [x] Rate limiting on login — 10 req/min per IP (in-memory)
- [x] Session cookie — HttpOnly, SameSite=Strict, Secure in prod
- [x] `SessionUser` type — safe client-facing shape (no jwt, no email, no mobile)
- [x] Derived privilege flags computed server-side (`isAdmin`, `isPrincipal`, `isManagement`)

### Auth pages
- [x] Login page — form with validation, error handling, redirect on success
- [x] Logout — `POST /api/auth/logout` destroys session, redirects to `/login`

### App shell
- [x] Sidebar — dark theme, dynamic nav from `user.modules[]` + `user.pages[]`
- [x] Topbar — user avatar, name, role, Sign out dropdown
- [x] Mobile hamburger + sidebar overlay
- [x] Sticky topbar + scrollable main area
- [x] Page transition animation (`animate-fade-up`)

### Dashboard
- [x] Welcome header with name, role badge, college name, academic year
- [x] Role-based stat cards (4 cards per role, values hardcoded to 0 — not wired to API yet)
- [x] `[DEBUG]` session data panel (temporary, to be removed)

### Exam Master — List page
- [x] University / College mode toggle (radio group)
- [x] Cascading filter dropdowns: University → Course → Academic Year → College
- [x] Auto-selection: first university, first course, current academic year
- [x] AG Grid table with 11 columns and JSX cell renderers
- [x] Download links for notification files
- [x] Status badge (Active / Inactive)
- [x] Edit button opens modal
- [x] Create Label navigates to details page (writes exam to `sessionStorage`)

### Exam Master — Add/Edit Modal
- [x] react-hook-form + zod validation
- [x] MonthYearPicker — custom month/year grid
- [x] DatePicker — Popover + Calendar
- [x] Auto-sync fromDate/toDate when month/year is selected
- [x] toDate ≥ fromDate guard (resets and shows warning)
- [x] Exam Type checkboxes (Regular / Supple / Internal)
- [x] Is Published, Is Result Process Started checkboxes
- [x] Notification + Fee Notification file upload (styled `FileInput` component)
- [x] Existing file path displayed in edit mode
- [x] Is Active + conditional Reason field
- [x] POST create → PUT update → POST file upload chain
- [x] Trailing-space key `"examId "` on FormData (matches Angular/Spring Boot expectation)

### Exam Master — Details page
- [x] Reads `examId` from URL params, exam data from `sessionStorage`
- [x] API fallback if `sessionStorage` is empty
- [x] Loads exam types, regulations, course groups, course years in parallel
- [x] Tabs per enabled exam type (only shows tabs for types the exam has)
- [x] Add / Edit / Delete (soft delete — sets `isActive: false`) exam labels
- [x] In-memory state management — Save All posts entire array at once
- [x] Toast notification on success/error
- [x] Navigate back to list on successful save
- [x] Redirect to list if `examId` is invalid

### Reusable components built
- [x] `DataTable` — AG Grid wrapper
- [x] `PageHeader` — title / subtitle / action
- [x] `DatePicker` — Popover + Calendar
- [x] `MonthYearPicker` — custom month/year grid
- [x] `FileInput` — styled file picker with filename display and clear button

### Navigation UX
- [x] Sidebar active link gets `aria-current="page"` — used for scroll targeting and accessibility
- [x] Sidebar auto-scrolls active nav item into view on every route change (`scrollIntoView({ block: 'nearest', behavior: 'smooth' })`)
- [x] 404 inside `(protected)` routes renders toast with sidebar intact — `src/app/(protected)/not-found.tsx`
- [x] Root 404 (`src/app/not-found.tsx`) silently redirects to `/dashboard`

### Admin Exam Masters — Sub-pages
- [x] `/exam-session` — ExamSession entity, time slot management (start/end time, HH:mm:ss stored, 12-hr display)
- [x] `/grade-setup` — ExamGrade entity, grade/GPA thresholds with score and points range
- [x] `/exam-max-marks-setup` — ExamMarkssetup entity (lowercase 's'), marks config with University → Course → Regulation → isForDisabled filter cascade
- [x] `/exam-fee-setup` — ExamFeeStructure entity, exam fee configuration with University/College mode and exam filter cascade
- [x] `/seating-plan-setup` — ExamRoomAllotment entity, room allocation per timetable slot
- [x] `/exam-timetable` — ExamTimetable entity, subject scheduling per date/session
- [x] `/invigilator-remuneration` — ExamInvigilationRemuneration entity, invigilator pay rates by designation
- [x] `/revaluation-fee-setup` — ExamFeeStructure entity (revaluation context), re-check fee collection windows

---

## What Is NOT Done

### Dashboard stat cards
- [ ] Stat card values are all hardcoded to `0` / `'₹0'` / `'0%'`
- [ ] Not wired to any real API endpoints

### Navigation
- [ ] Sidebar nav items are built from `modules[]`/`pages[]` returned by Spring Boot but the actual URLs may not match Next.js routes yet — routing works only for pages that have been built
- [x] Active nav item highlighted and scrolled into view automatically
- [x] Doubled URL paths fixed (`normalizeHref()` in `navigation.ts`)
- [x] 404 toast shows with sidebar intact; auto-navigates back after 3s
- [ ] Help Center button (static placeholder, no page behind it)
- [ ] Notification bell (static placeholder — no API, no page)
- [ ] Apps grid icon (static placeholder)
- [ ] Search bar (static placeholder, no functionality)
- [ ] User "Profile" menu item in topbar dropdown is disabled/placeholder

### Session security
- [ ] The `[DEBUG] SessionUser` panel on the dashboard should be removed before production
- [ ] `organizationId` is used as `(user as any)?.organizationId ?? 0` in exam master / exam max marks pages. If it is available from Spring Boot's UserDTO, add it to `SessionUser` in `src/types/user.ts` and the session-building logic in `/api/auth/login/route.ts`.

### Exam Master — Missing features
- [ ] Quick search / filter text box above the AG Grid (DataTable accepts `quickFilterText` prop but no UI input is wired to it on the exam master page)
- [ ] Pagination controls (AG Grid community has built-in pagination — not yet enabled in `DataTable`)
- [ ] Print / export to CSV / Excel (AG Grid community supports this but not configured)
- [ ] "Is For College" mode does not auto-select the first college and fetch exams automatically — user must manually select a college first

### Exam Master Details — Missing features
- [ ] No confirmation dialog before deleting a label row (just deletes immediately)
- [ ] `batchId` field exists in the Angular form but is commented out — not included here either (matches Angular's current state)

### Other examination pages (not started)
All other routes under `admin-examination-management/admin-exam-masters/` that remain:
_(All 8 admin-exam-master sub-pages have been built — see below)_

All other module areas from the Angular app are not started:
- [ ] Student management
- [ ] Staff management
- [ ] Fee management
- [ ] Attendance
- [ ] Timetable
- [ ] Admissions
- [ ] Reports
- [ ] (and all other modules)

---

## Known Deferred Bugs (Spring Boot)

These are backend issues documented in `migration-plan/04-spring-boot-backlog.md`. **Do not fix during migration** — Spring Boot is frozen.

| Issue | Risk |
|---|---|
| `NoOpPasswordEncoder` — plaintext passwords in DB | Critical — passwords readable if DB is compromised |
| JWT secret `"genesis"` — hardcoded weak secret | High — tokens can be forged |
| CORS wildcard `*` | Medium — any origin can call the API |
| Credentials in `application.yml` plain text | Medium |
| JWT expiry 360 min — no refresh mechanism | Low-medium |

---

## Environment Variables Required

```env
# .env.local
SPRING_API_URL=http://localhost:8080        # Spring Boot base URL (server-only)
SESSION_SECRET=<32+ char random string>     # iron-session encryption key
SESSION_COOKIE_NAME=college_erp_session     # optional, this is the default
NODE_ENV=development                        # 'production' enables Secure cookie flag
```

---

## Phase 8 — Component Audit (`COMPONENT_AUDIT.md`) (2026-03-30)

A 19-section comparison report was produced by comparing every component in `src/common/components/` (Angular port) against the Angular source in `college_erp_angular_old/`. The report identified:

- **Missing features**: server-side pagination, async/searchable Select, MultiSelect, DatePicker clear button + bounds, live Topbar search, sidebar position wiring
- **Unnecessary additions**: features in the Next.js port that Angular never had
- **Library capability gaps**: AG Grid, recharts, react-day-picker features available but unused

Full report: `COMPONENT_AUDIT.md`

---

## Phase 9 — `src/kit/` Canonical Component Library (2026-03-30)

Created `src/kit/` as the canonical component directory. All pages must import from `@/kit/` — not from `src/common/components/` or direct shadcn primitives. `src/common/` is retained as the Angular-parity foundation layer but is **not** the primary import path for pages.

### Rule: use `@/kit/`, not `@/common/`

`src/common/` is frozen. `src/kit/` is the evolving, production-quality layer. Whenever a component is needed on a page, import it from `@/kit/`.

### Components Built or Fixed

#### `src/kit/table/DataTable.tsx` — AG Grid Community v35

Over `src/common/components/table/`:
- `serverSide` + `totalCount` / `currentPage` / `onPageChange` for server-side pagination
- Custom pagination bar with 10 / 20 / 50 / 100 page-size selector
- `getRowId` for stable row identity
- `onRowClick` convenience prop
- `showSearch` prop enables AG Grid quick-filter input
- Named export (not default — avoids import ambiguity)

#### `src/kit/date-picker/DatePicker.tsx` — react-day-picker v9

- `Date | null` consistency throughout
- `startMonth` / `endMonth` navigation bounds
- `autoFocus` (replaces deprecated `initialFocus`)
- Clear button
- `label` / `required` / `error` props with `useId()` for `htmlFor`

#### `src/kit/date-picker/MonthYearPicker.tsx` — 3×4 month grid

- Bounded year navigation
- Per-month disabled state via `isMonthDisabled()`
- `role="grid"` + `aria-selected` / `aria-disabled` accessibility
- Keyboard ArrowKey navigation
- Clear button

#### `src/kit/search/SearchInput.tsx`

Consolidated two conflicting search inputs (`common/search/` with `onSearch` prop, `forms/SearchInput` with `onChange` prop) into one component using `onChange`.

#### `src/kit/select/Select.tsx` — Radix Popover (not Radix Select)

Using Radix Popover instead of Radix Select enables loading async options after mount (Radix Select cannot). Added:
- `searchable` boolean prop (explicit, not magic >6 threshold)
- `onSearch` server-side callback
- `isLoading` spinner
- `required` / `error` / `label` with `htmlFor` / `id` via `useId()`

#### `src/kit/select/MultiSelect.tsx` — Radix Popover + Checkbox

Mirrors Angular `mat-select multiple` + `ngx-mat-select-search`:
- `showSelectAll` with indeterminate tri-state
- `maxDisplay` pill trigger (shows "N selected" after threshold)
- `onSearch` async callback
- Never closes on selection

#### `src/kit/charts/BarChart.tsx` — recharts

- `stacked` prop → `stackId="stack"` on all bars
- `onClick` handler
- K / M / B number abbreviation on Y axis
- Configurable `legendPosition`
- `domain={[0,'auto']}` on Y axis
- Horizontal layout when `type='column'`

#### `src/kit/charts/PieChart.tsx` — recharts

- Active shape expands on hover (+8px outerRadius)
- `onClick`
- `paddingAngle`
- `showLabels` toggle
- Custom `renderTooltip` prop

#### `src/kit/charts/DrilldownChart.tsx`

Stub with full `// TODO` implementation notes: 3-level District → College → Fee Category drilldown with manual drill state using recharts `onClick`.

#### `src/kit/breadcrumb/Breadcrumb.tsx` + `useBreadcrumb.ts`

- `maxItems` collapse with ellipsis
- `useBreadcrumb` hook auto-builds items from `usePathname()`

#### `src/kit/layout/Topbar.tsx` — live page search (Angular parity)

- Fetches `GET /api/proxy/useraccess?userId=X&status=true` on mount
- Flattens `modules → subModules → pages` tree to `{ displayName, url }[]` using same `slugify` logic as Angular
- Client-side prefix filter, max 8 results
- Keyboard ArrowUp / Down / Enter / Escape navigation
- `role="listbox"` / `"option"` + `aria-activedescendant` accessibility
- `onPointerDown preventDefault` prevents focus loss on item click

#### `src/kit/layout/ThemeSettingModal.tsx`

- `aria-checked` wired to actual boolean value (was broken)
- `<DialogDescription className="sr-only">` added for accessibility
- Sidebar position toggle now calls both `updateSettings` AND `setSidebarPosition` from Zustand store

#### `src/store/navigation-store.ts`

Added `sidebarPosition: 'left' | 'right'` state + `setSidebarPosition` action, persisted in localStorage.

#### `src/components/layout/Sidebar.tsx`

Reads `sidebarPosition` from store. Renders `order-last` CSS class when `'right'`. Switches to `PanelRightClose` / `PanelRightOpen` icons when right-positioned.

#### New discovered components (extracted from page repetition)

| Component | Location | How discovered |
|---|---|---|
| `FormModal` | `kit/feedback/FormModal.tsx` | Same Dialog + form + Cancel/Submit/Loader footer in every modal |
| `FormField` | `kit/forms/FormField.tsx` | `label + children + error` repeated 5–12× per modal |

#### Copied + cleaned from `src/components/`

`StatusBadge`, `StatCard`, `ConfirmDialog`, `EmptyState`, `ErrorBoundary`, `CollegeFilterPanel`, `PageHeader` (converted to named export), `PageContainer`

#### `src/kit/index.ts`

Barrel export: `export * from './table'`, `'./date-picker'`, `'./search'`, `'./select'`, `'./charts'`, `'./breadcrumb'`, `'./layout'`, `'./data-display'`, `'./feedback'`, `'./forms'`

---

## Phase 10 — Page Migration to `@/kit/` (2026-03-30)

All 22+ page files and 2 modal files under `src/app/(protected)/` were updated to import from `@/kit/` instead of old component paths.

### Bug fixed: default vs named export on DataTable

Six pages were generated with `import DataTable from '@/kit/table'` (default import). `DataTable` is a named export. Build failed with "Export default doesn't exist in target module". Fixed with targeted replacement across all 6 affected files:

- `admin/organizations/page.tsx`
- `admin/campus/page.tsx`
- `evaluation-process/create-questionpaper-template/page.tsx`
- `evaluation-process/evaluation-templates/page.tsx`
- `evaluation-process/exam-question-paper-marks/page.tsx`
- `evaluation/evaluator-assigned-answer-sheet/page.tsx`

**Root cause / lesson:** All exports in `src/kit/` are named exports. Never use default imports from kit paths.

---

## Phase 11 — Architecture Analysis (2026-03-30)

Three parallel audit agents scanned the entire codebase. Full findings in `ARCHITECTURE_PLAN.md`.

### Summary of gaps found

| Priority | Issue |
|---|---|
| High | `reason: 'active'` hard-coded in 8+ modal `getDefaults()` functions |
| High | Entity names (`'ExamSession'`, `'ExamGrade'`, etc.) as bare strings in all service files |
| High | Query keys as inline string arrays — no factory, invalidation is fragile |
| High | 3 pages use raw `useState + useCallback + useEffect` instead of React Query |
| High | No toast/notification system — errors only visible inside modal forms |
| Medium | `InvigilatorRemunerationFormValues` typed `number | ''` but form produces `string` |
| Medium | `SeatingPlanFormValues` typed `number | null` but Zod schema disallows null |
| Medium | `ApiResponse<T>.data` typed `T` but runtime guards against null |
| Medium | No `PageResponse<T>` interface — duck-typed in `domainList` |
| Medium | `staleTime: 5 * 60 * 1000` magic number repeated 4+ times — `APP_CONFIG.SESSION_STALE_TIME` exists but unused |
| Medium | `src/config/constants.ts` (root) duplicates `src/config/constants/app.ts` |
| Low | `queryKey: unknown[]` prop on two modals — workaround for missing key factory |
| Low | `GeneralDetailRow` locally declared in `ExamSessionModal` instead of using shared `GeneralDetail` type |

### Planned infrastructure (not yet implemented — see `ARCHITECTURE_PLAN.md`)

- `src/config/constants/entities.ts` — ENTITIES map (entity name + pk per domain type)
- `src/config/constants/defaults.ts` — `DEFAULT_ACTIVE_REASON`, `DEFAULT_IS_ACTIVE`, `DEFAULT_PAGE_SIZE`
- `src/lib/query-keys.ts` — typed `QK` React Query key registry
- `src/lib/schemas.ts` — `baseEntitySchema` Zod fragment
- `src/lib/toast.ts` — `toastError` / `toastSuccess`
- `src/types/domain.ts` — `DomainEntity` base interface
- `src/hooks/useEntityForm.ts` — form setup boilerplate hook
- `src/hooks/useCrudList.ts` — React Query list + invalidate hook
- `src/hooks/useCrudMutation.ts` — React Query mutation + auto-invalidate hook
- `src/kit/forms/ActiveStatusField.tsx` — `isActive` checkbox + conditional reason field

---

## Phase 12 — API Constants Cleanup (2026-03-30)

### Problem

`AUTH_API` in `src/config/constants/api.ts` stores Spring Boot paths (`'api/auth/login'`) for **server-side** use in `src/integrations/spring-api.ts`. These are not the same as the Next.js internal routes that the browser calls (`'/api/auth/login'`). No constant existed for the client-side Next.js routes. Eight hardcoded `fetch()` strings were found across 6 files — one even had a `//TODO replace with Constants` comment.

### New constants added to `src/config/constants/api.ts`

```ts
/** Next.js internal API routes — called from client components, NOT Spring Boot paths */
export const NEXT_API = {
  AUTH: {
    LOGIN:  '/api/auth/login',   // POST — sets iron-session cookie
    LOGOUT: '/api/auth/logout',  // POST — clears iron-session cookie
    ME:     '/api/auth/me',      // GET  — returns current SessionUser
  },
  /** Build a /api/proxy/{path} URL for any Spring Boot endpoint */
  PROXY: (path: string) => `/api/proxy/${path}`,
}

export const ORG_API = {
  LOGO_UPLOAD: 'organizationlogoupload',  // POST multipart
}

// Added to EXAM_API:
EXAM_TIMETABLE_DETAILS: 'examtimetabledetails',  // GET — denormalised DTO endpoint
```

### Files updated

| File | Hardcoded string removed | Constant used |
|---|---|---|
| `app/(public)/login/LoginCard.tsx` | `'/api/auth/login'` | `NEXT_API.AUTH.LOGIN` |
| `hooks/useSession.ts` | `'/api/auth/me'` | `NEXT_API.AUTH.ME` |
| `components/layout/Sidebar.tsx` | `'/api/auth/logout'` | `NEXT_API.AUTH.LOGOUT` |
| `components/layout/Topbar.tsx` | `'/api/auth/logout'` | `NEXT_API.AUTH.LOGOUT` |
| `kit/layout/Topbar.tsx` | `'/api/auth/logout'` + `` `/api/proxy/useraccess?...` `` | `NEXT_API.AUTH.LOGOUT` + `NEXT_API.PROXY(AUTH_API.USER_ACCESS)` |
| `services/organization.service.ts` | `'/api/proxy/organizationlogoupload'` | `NEXT_API.PROXY(ORG_API.LOGO_UPLOAD)` |
| `services/exam-timetable.service.ts` | `` `/api/proxy/examtimetabledetails?...` `` | `NEXT_API.PROXY(EXAM_API.EXAM_TIMETABLE_DETAILS)` |

### Convention going forward

- **Spring Boot paths** (no leading `/`) → `AUTH_API`, `EXAM_API`, etc. → used with `NEXT_API.PROXY(...)` on the client, or directly in `src/integrations/spring-api.ts` on the server.
- **Next.js internal routes** (leading `/`) → `NEXT_API.AUTH.*` → used directly in `fetch()` calls from client components.
- **Never** write a raw `fetch('/api/...')` string in application code. Always go through a constant.
