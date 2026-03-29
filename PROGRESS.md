# College ERP — Next.js Migration Progress

> Migration from Angular 11 + Spring Boot 2.0 → Next.js 16 + same Spring Boot (frozen).
> Backend is read-only. All changes are frontend only.

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

---

## What Is NOT Done

### Dashboard stat cards
- [ ] Stat card values are all hardcoded to `0` / `'₹0'` / `'0%'`
- [ ] Not wired to any real API endpoints

### Navigation
- [ ] Sidebar nav items are built from `modules[]`/`pages[]` returned by Spring Boot but the actual URLs may not match Next.js routes yet — routing works only for pages that have been built
- [ ] Help Center button (static placeholder, no page behind it)
- [ ] Notification bell (static placeholder — no API, no page)
- [ ] Apps grid icon (static placeholder)
- [ ] Search bar (static placeholder, no functionality)
- [ ] User "Profile" menu item in topbar dropdown is disabled/placeholder

### Session security
- [ ] The `[DEBUG] SessionUser` panel on the dashboard should be removed before production
- [ ] `organizationId` is not on `SessionUser` type — used as `(user as any)?.organizationId ?? 0` in the exam master page. Needs proper type addition if required.

### Exam Master — Missing features
- [ ] Quick search / filter text box above the AG Grid (DataTable accepts `quickFilterText` prop but no UI input is wired to it on the exam master page)
- [ ] Pagination controls (AG Grid community has built-in pagination — not yet enabled in `DataTable`)
- [ ] Print / export to CSV / Excel (AG Grid community supports this but not configured)
- [ ] "Is For College" mode does not auto-select the first college and fetch exams automatically — user must manually select a college first

### Exam Master Details — Missing features
- [ ] No confirmation dialog before deleting a label row (just deletes immediately)
- [ ] `batchId` field exists in the Angular form but is commented out — not included here either (matches Angular's current state)

### Other examination pages (not started)
All other routes under `admin-examination-management/admin-exam-masters/` are not built:
- [ ] `/exam-max-marks-setup`
- [ ] `/grade-setup`
- [ ] `/exam-session`
- [ ] `/exam-fee-setup`
- [ ] `/seating-plan-setup`
- [ ] `/exam-timetable`
- [ ] `/invigilator-remuneration`
- [ ] `/revaluation-fee-setup`

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
