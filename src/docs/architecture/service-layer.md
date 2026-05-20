# Service Layer

> Status: Pattern established and fully implemented.
> All examination module services exist and follow the patterns described here.
> Last updated: Phase 5 refactor (2026-03-29) — `getExamFilters` migrated to `getAllRecords`; dead constants removed; `saveMarksSetup` `&&` bug fixed.

---

## Why Services Exist

Without a service layer, every page component fetches directly:

```typescript
// Problem: fetch URL scattered across 3 pages, no type safety on the call itself
const res = await fetch(`/api/proxy/domain/list/ExamMaster?size=99999&query=...${dynamicPart}`)
const json = await res.json()
// ❌ WRONG — resultList does not exist on domain/list responses.
// Also crashes when Spring Boot returns a single object (not array) for 1-record results.
const exams = json.data?.resultList ?? []
```

This creates:
- Duplicated URL strings that break silently when changed
- No single place to add request options (timeouts, headers)
- No consistent error handling
- Untestable — you can't mock a raw `fetch` inside a component

The service layer solves this:

```typescript
// One function, one place, typed input and output
const exams = await getExamMasterList({ universityId, courseId, academicYearId })
```

---

## File Naming

```
src/services/{domain}.service.ts
```

Examples:
- `src/services/exam-master.service.ts` — exam master domain
- `src/services/student.service.ts` — student management domain
- `src/services/fee.service.ts` — fee management domain

All service files are re-exported from `src/services/index.ts`.

---

## Pattern Rules

1. **Typed async functions** — explicit return type, explicit parameter types
2. **Throw errors, not return them** — throw `AppError` (from `src/lib/errors.ts`) on failure
3. **No React imports** — services are plain TypeScript modules, no hooks, no context
4. **No direct `fetch` to Spring Boot** — all calls go through `/api/proxy/`
5. **TSDoc on every function** — include Spring Boot endpoint reference
6. **API path constants** — import from `src/config/constants/api.ts` (planned) not hardcoded strings

---

## Minimal Complete Example

**Always use the `domainList` helper** — never call `fetch` directly for standard CRUD endpoints. It handles:
- Single-object vs array normalisation (Spring Boot returns a bare object when exactly one record matches — `domainList` wraps it in `[obj]` so callers always get `T[]`)
- `!res.ok` and `!body.success` error throwing
- Consistent `AppError` types

```typescript
// src/services/exam-master.service.ts

import type { ExamMaster } from '@/types/exam-master'
import { domainList, buildQuery } from '@/services/crud'

/**
 * Fetches exam master list filtered by university, course, and academic year.
 *
 * Spring Boot endpoint: GET /domain/list/ExamMaster
 * Response envelope: { statusCode, success, data: ExamMaster[] }
 *   NOTE: Spring Boot may return a single object when there is exactly 1 result.
 *   domainList() normalises this to T[] automatically — do not add extra guards.
 *
 * @throws AppError on network failure or non-200 response
 */
export async function fetchExamsByUniversity(
  universityId: number,
  courseId: number,
  academicYearId: number,
): Promise<ExamMaster[]> {
  const query = buildQuery(
    {
      'Universities.universityId': universityId,
      'Course.courseId': courseId,
      'AcademicYear.academicYearId': academicYearId,
    },
    { field: 'createdDt', direction: 'DESC' },
  )
  return domainList<ExamMaster>('ExamMaster', query)
}
```

### For stored procedure endpoints — use `getAllRecords`

`getAllRecords` from `crud.service.ts` wraps `GET /api/proxy/getAllRecords/{procName}?{params}` with the same error handling as `domainList`. Use it instead of raw `fetch` for any stored-procedure call:

```typescript
import { getAllRecords } from '@/services/crud'

export async function getExamFilters(empId: number): Promise<ExamFiltersResult> {
  const data = await getAllRecords<{ result: ExamFilterRow[][] }>(
    's_get_exam_filters_bycode',
    { in_flag: 'univ_exam_filters', in_loginuser_empid: empId, /* ... */ },
  )
  // data is body.data — the inner payload, not the full envelope
  const result = data?.result ?? []
  // ...parse result sets by flag...
}
```

### For custom endpoints — raw `fetch` is acceptable

Dedicated Spring Boot endpoints (not `domain/list` or `getAllRecords`) that return non-standard shapes (e.g. `GET /examtimetabledetails`) may use raw `fetch`. Always include `!res.ok` + `!body.success` error checks matching the pattern in `getExamTimetables`.

### ❌ Anti-patterns — never do these

```typescript
// ❌ resultList does not exist on domain/list responses
return json.data?.resultList ?? []

// ❌ Assumes array — crashes when Spring Boot returns single object for 1-record result
return json.data ?? []

// ❌ Raw fetch bypasses domainList normalisation and error handling
const res = await fetch(`/api/proxy/domain/list/ExamMaster?query=...`)
const json = await res.json()
return json.data

// ❌ Raw fetch + URLSearchParams for a getAllRecords endpoint — use getAllRecords() instead
const params = new URLSearchParams({ in_flag: 'foo', ... })
const res = await fetch(`/api/proxy/getAllRecords/s_get_something?${params}`)
```

### ❌ Error-checking bug — use `||` not `&&`

When checking a Spring Boot response that returns both `success` and `statusCode`, always use `||` so that either field failing causes a throw:

```typescript
// ✅ Correct — throws if either condition fails
if (!body.success || body.statusCode !== 200) {
  throw new AppError('API_ERROR', body.message ?? 'Failed')
}

// ❌ Bug — silently passes if statusCode===200 even when success===false
if (!body.success && body.statusCode !== 200) {
  throw new AppError('API_ERROR', body.message ?? 'Failed')
}
```

---

## How to Add a New Service

1. **Identify the domain** — e.g. student management → `student`

2. **Create the file:**
   ```
   src/services/student.service.ts
   ```

3. **Import constants** from `src/config/constants/api.ts`:
   ```typescript
   import { STUDENT_API } from '@/config/constants/api'
   ```
   Only add constants for **non-CRUD endpoints** (e.g. custom POST endpoints, file uploads). Standard `domain/list` / `domain/create` paths are built by `domainList` / `domainCreate` internally — do not add `LIST_*` or `CREATE_*` constants.

4. **Write typed async functions** following the template above.

5. **Export from index:**
   ```typescript
   // src/services/index.ts
   export * from './student.service'
   ```

6. **Document in** `src/docs/flows/{module}-flow.md`.

---

## Relationship to TanStack Query

Services are the `queryFn` bodies. The service function handles the fetch and error handling; TanStack Query handles caching, stale-while-revalidate, and loading states.

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { getExamMasterList } from '@/services/exam-master'

function ExamMasterPage() {
  const { user } = useSessionContext()
  const { universityId, courseId, academicYearId } = useFilterState()

  const { data: exams = [], isLoading, error } = useQuery({
    queryKey: ['exam-master', 'list', { universityId, courseId, academicYearId }],
    queryFn: () => getExamMasterList({ universityId, courseId, academicYearId }),
    enabled: !!universityId && !!courseId && !!academicYearId,
  })

  // ...
}
```

**Query key convention:** `[domain, operation, params]`
- `['exam-master', 'list', { universityId, courseId, academicYearId }]`
- `['exam-master', 'detail', { examId }]`
- `['student', 'list', { collegeId, courseId }]`

This ensures correct cache invalidation when parameters change.

**Mutations follow the same pattern:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExamMaster } from '@/services/exam-master'

function useCreateExamMaster() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExamMaster,
    onSuccess: () => {
      // Invalidate all exam-master list queries
      queryClient.invalidateQueries({ queryKey: ['exam-master', 'list'] })
    },
  })
}
```

---

## Error Handling

Service functions throw `AppError` (from `src/lib/errors.ts`). TanStack Query surfaces these as the `error` property.

**In components:**

```typescript
const { data, error, isLoading } = useQuery({ ... })

if (error) {
  // error is the thrown Error instance
  return <div className="text-red-600">{error.message}</div>
}
```

**For mutations:**

```typescript
const mutation = useMutation({
  mutationFn: createExamMaster,
  onError: (error: Error) => {
    setToast({ message: error.message, type: 'error' })
  },
})
```

**AppError (`src/lib/errors.ts`):**

```typescript
import { AppError, isAppError } from '@/lib/errors'

try {
  await createExamMaster(payload)
} catch (err) {
  if (isAppError(err)) {
    // err.statusCode, err.code, err.message available
  } else {
    // generic error
  }
}
```

---

## Current State

All examination module services are implemented:

| Service file | Domain |
|---|---|
| `crud.service.ts` | Generic CRUD helpers (`domainList`, `domainCreate`, `domainUpdate`, `domainSoftDelete`, `getAllRecords`, `buildQuery`) |
| `exam-master.service.ts` | Exam master, college filters, details, file upload |
| `exam-session.service.ts` | Exam sessions |
| `exam-grade.service.ts` | Exam grades |
| `exam-max-marks.service.ts` | Exam marks setup, marks filter cascade |
| `exam-fee-setup.service.ts` | Exam fee structures |
| `exam-timetable.service.ts` | Exam timetable entries |
| `seating-plan.service.ts` | Exam room allotments |
| `invigilator-remuneration.service.ts` | Invigilator pay rates |
| `revaluation-fee.service.ts` | Revaluation fee structures |

### Spring Boot FK payload conventions

Spring Boot JPA entities use **camelCase** field names (standard Java). When sending create/update payloads:

| Purpose | Format | Example |
|---|---|---|
| **Flat FK field** (most entities) | `fieldName: value` | `examId: 5` |
| **Nested FK object** (some relationships) | `entityName: { pkField: value }` | `examMaster: { examId: 5 }` |

Check the Angular source for the specific entity to confirm which format it uses. Both patterns exist — do not assume.

**QueryDSL filter paths** (for `GET /domain/list/`) always use dot-notation regardless of payload format:
```typescript
buildQuery({ 'examMaster.examId': 5 })  // filter query: "examMaster.examId==5"
```

**Entity field names vs form field names** — Java entity field names may differ from Angular form field names. Always use the entity field name in QueryDSL. Known mismatch:

| Entity | QueryDSL filter field | Angular form field | Notes |
|---|---|---|---|
| `ExamGrade` | `disabled` | `isForDisabled` | Spring Boot entity uses `disabled`; Angular form binds it as `isForDisabled` |
| `ExamMarkssetup` | `disabled` | `isForDisabled` | Same pattern |

Confirmed Angular source: `marks-setup.component.ts:433` passes `'disabled'` as the field name to `listDetailsByFourIds`; `exam-grades.component.ts:333` passes `'disabled'` to `listDetailsByThreeIds`.
