# Foundation Agent Report

Generated: 2026-03-29

## Task F1: Folder Structure Enforcement

**Created directories and barrel files:**
- `src/config/constants/index.ts` - barrel re-exporting all constant modules
- `src/services/index.ts` - barrel re-exporting exam-master service
- `src/components/feedback/index.ts` - barrel (empty, populated by linter)
- `src/components/data-display/index.ts` - barrel (empty, populated by linter)
- `src/components/shared/index.ts` - barrel (empty, populated by linter)

**Pre-existing directories (no action needed):**
- `src/components/forms/` - already existed
- `src/lib/` - already existed
- `src/types/` - already existed

## Task F2: Constants System

**Created `src/config/constants/api.ts`:**
- Extracted ALL endpoints from Angular `constants.ts` (~900 lines) organized into 25+ domain groups
- Domain groups: AUTH_API, EXAM_API, EXAM_ONLINE_API, EXAM_EVAL_API, EXAM_REVAL_API, QUESTION_PAPER_API, STUDENT_API, EMPLOYEE_API, FEE_API, PAYMENT_GATEWAY_API, UNIV_WALLET_API, SETUP_API, DATA_SECURITY_API, LEAVE_API, SUBJECT_API, ASSIGNMENT_API, DASHBOARD_API, ATTENDANCE_API, GRIEVANCE_API, UNIVERSITY_API, UNIV_EXAM_CENTER_API, UNIV_COMMITTEE_API, TRANSPORT_API, HOSTEL_API, CERTIFICATE_API, SYLLABUS_API, COUNSELOR_API, APPRAISAL_API, SPECIAL_ACTIVITY_API, ALUMNI_API, BUDGET_API, TODO_API, CLASS_NOTES_API, MISC_REPORT_API, WORKFLOW_API
- Each endpoint has JSDoc explaining HTTP method and purpose

**Created `src/config/constants/app.ts`:**
- Migrated from `src/config/constants.ts`
- APP_CONFIG object with session, rate limit, query stale time
- USER_ROLES with all roles from Angular (ADMIN, SUPERADMIN, STAFF, STUDENT, PARENT, PRINCIPAL, etc.)
- UserRoleType derived type
- DATE_FORMATS from Angular dateFormate/dateAndTimeFormate

**Created `src/config/constants/ui.ts`:**
- STATUS_LABELS, STATUS_VARIANTS, EMPTY_STATE_MESSAGES, VALIDATION_MESSAGES
- ALIAS_LABELS migrated from Angular alias-labels.ts
- GM_CODES: comprehensive general master codes (~100+ entries) migrated from Angular constants
- GeneralMasterCode type

**Created `src/config/constants/proc.ts`:**
- Migrated from Angular proc-constants.ts
- ProcParam interface, PROC_COLLEGE_FILTERS, PROC_EXAM_FILTERS, PROC_EXAM_QP_DETAILS, PROC_POP_EXAM_QP_DETAILS, PROC_EXAM_EVALUATION
- `buildProcQuery()` helper to construct query strings with overrides

**Created `src/config/constants/index.ts`:**
- Barrel re-exporting all constant modules

## Task F3: Error Handling

**Created `src/lib/errors.ts`:**
- `AppError` class with code, message, and cause
- `isAppError()` type guard
- `parseApiError()` for Spring Boot response envelope parsing (handles 401, 404, 400, generic)
- `getErrorMessage()` safe user-facing message extractor

## Task F4: Type System

**Modified `src/types/user.ts`:**
- Added `organizationId?: number` to `SessionUser` interface

**Modified `src/types/api.ts`:**
- Added `SpringListResponse<T>` interface for stored procedure endpoints

**Created `src/types/common.ts`:**
- SelectOption, DateRange, FilterState, PaginationState interfaces

**Modified `src/types/exam-master.ts`:**
- Added comprehensive JSDoc to every field on ExamMaster, ExamMasterDetails, CollegeWiseFilterRow, GeneralDetail, Regulation, CourseGroup, CourseYear

## Task F5: Service Layer

**Created `src/services/exam-master.service.ts`:**
- `getCollegeFilters()` - replaces inline fetch in page.tsx
- `fetchExamsByUniversity()` - list exams by university mode
- `fetchExamsByCollege()` - list exams by college mode
- `getExamMasterById()` - fetch single exam
- `createExamMaster()` - POST to create
- `updateExamMaster()` - PUT to update
- `uploadExamFiles()` - multipart upload for notification files
- `getGeneralDetails()` - fetch general details by master code
- `getRegulations()` - fetch regulations by course
- `getCourseGroups()` - fetch course groups by course
- `getCourseYears()` - fetch course years by course
- `getExamMasterDetails()` - fetch exam detail rows
- `saveExamMasterDetails()` - POST to save all detail rows

All functions use EXAM_API constants, throw AppError on failure.

## Task F6: Refactoring

**F6a: Dashboard debug panel removed:**
- Removed `SessionDebugPanel` component and all related code from `src/app/(protected)/dashboard/page.tsx`
- Removed unused imports (useState, ChevronDown, ChevronRight)

**F6b: Exam master pages refactored to use service layer:**
- `page.tsx`: replaced 3 inline fetch calls with service calls (getCollegeFilters, fetchExamsByUniversityService, fetchExamsByCollegeService)
- `ExamMasterModal.tsx`: replaced 3 inline fetch calls with service calls (createExamMaster, updateExamMaster, uploadExamFiles)
- `exam-master-details/page.tsx`: replaced 6 inline fetch calls with service calls (getExamMasterById, getGeneralDetails, getRegulations, getCourseGroups, getCourseYears, fetchExamMasterDetails, saveExamMasterDetails)

**F6c: Type fix applied:**
- `(user as any)?.organizationId` replaced with `user?.organizationId` in page.tsx
- `organizationId` added to SessionUser type
- `organizationId` now mapped in login route from UserDTO to SessionUser

**F6d: API proxy error shaping:**
- Updated missing-JWT response to `{ error: 'UNAUTHORIZED', message: 'Session expired' }` with status 401

**F6e: BFF auth routes updated:**
- `src/app/api/auth/login/route.ts`: Added comprehensive JSDoc, replaced `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS` with `APP_CONFIG.LOGIN_RATE_LIMIT`/`APP_CONFIG.RATE_LIMIT_WINDOW_MS`
- `src/integrations/spring-api.ts`: replaced hardcoded URL paths with `AUTH_API.LOGIN` and `AUTH_API.AUTHORIZATION`
- `src/app/api/auth/me/route.ts`: replaced `SESSION_MAX_AGE_MS` with `APP_CONFIG.SESSION_MAX_AGE_MS`

## Decisions Made

1. **Old `src/config/constants.ts` kept** - still exports APP_NAME, SESSION_COOKIE_NAME, etc. No other files import from it now (all migrated to `@/config/constants/app`), but it can be removed later.
2. **Angular constants coverage** - extracted ALL endpoints from the Angular constants file (800+ lines) into organized domain groups. Not every endpoint has been used in Next.js yet; they are ready for future migration.
3. **GM_CODES** - moved general master codes into `ui.ts` rather than `api.ts` since they are used as query parameter values, not standalone endpoints.
4. **Service layer is client-only** - services use `/api/proxy/` prefix and can be imported in 'use client' components. Server-side code should continue using `integrations/spring-api.ts`.

## Files Other Agents Should Be Aware Of

| File | Purpose |
|------|---------|
| `src/config/constants/api.ts` | ALL Spring Boot endpoint paths — import from here |
| `src/config/constants/app.ts` | App config, user roles, date formats |
| `src/config/constants/ui.ts` | GM_CODES, alias labels, status labels, validation messages |
| `src/config/constants/proc.ts` | Stored procedure param definitions + buildProcQuery() |
| `src/lib/errors.ts` | AppError class, parseApiError(), getErrorMessage() |
| `src/services/exam-master.service.ts` | Client-side exam master API calls |
| `src/types/common.ts` | SelectOption, DateRange, FilterState, PaginationState |
| `src/types/api.ts` | Now includes SpringListResponse<T> |
| `src/types/user.ts` | SessionUser now has organizationId |
