# Architecture Improvement Plan

Compiled from three parallel codebase audits. All proposals are additive — no page logic is deleted until the new layer is proven. The goal is: **zero hard-coded strings, zero duplicated boilerplate, zero ad-hoc fetch patterns**.

---

## Overview of Changes

| # | Area | Files Changed | Risk |
|---|---|---|---|
| 1 | Entity + defaults constants | `config/constants/` (2 new files) | Zero |
| 2 | GM codes — use existing constant | `config/constants/ui.ts` already has it | Zero |
| 3 | Remove stale constants root file | `config/constants.ts` delete | Zero |
| 4 | Typed query key registry | `lib/query-keys.ts` (new) | Zero |
| 5 | Base domain type + fix type mismatches | `types/domain.ts` (new) + entity updates | Low |
| 6 | `PageResponse<T>` type | `types/api.ts` update | Low |
| 7 | Enhanced query builder | `services/crud.service.ts` (additive) | Low |
| 8 | Update services to use ENTITIES | `services/*.service.ts` | Low |
| 9 | `useEntityForm` hook | `hooks/useEntityForm.ts` (new) | Low |
| 10 | `useCrudList` + `useCrudMutation` hooks | `hooks/useCrud*.ts` (new) | Medium |
| 11 | `baseEntitySchema` Zod fragment | `lib/schemas.ts` (new) | Zero |
| 12 | Toast integration + QueryClient error handler | `lib/toast.ts` + QueryClient setup | Low |
| 13 | `ActiveStatusField` component | `kit/forms/ActiveStatusField.tsx` (new) | Zero |
| 14 | `useFormError` hook | `hooks/useFormError.ts` (new) | Zero |
| 15 | Standardize `staleTime` to `APP_CONFIG` | All `useQuery` callers | Low |
| 16 | Migrate 3 pages from useEffect to React Query | `organizations`, `campus`, `invigilator-remuneration` | Low |
| 17 | Use `QK` in all existing `useQuery` calls | All pages + modals | Low |
| 18 | Replace `ActiveStatusField` in all modals | All 8 modal files | Low |

---

## 1. Entity + Defaults Constants

### Problem
Entity class names and their primary key fields are string literals scattered across service files:
```ts
domainCreate<ExamSession>('ExamSession', data)            // string literal
domainUpdate<ExamSession>('ExamSession', 'examSessionId', id, data)  // 2 string literals
```
`reason: 'active'` appears in the `getDefaults()` function of every modal (8+ files).

### Proposal

**`src/config/constants/entities.ts`** — new file:
```ts
export const ENTITIES = {
  EXAM_SESSION:    { name: 'ExamSession',    pk: 'examSessionId'    },
  EXAM_GRADE:      { name: 'ExamGrade',      pk: 'examGradeId'      },
  EXAM_MAX_MARKS:  { name: 'ExamMaxMarks',   pk: 'examMaxMarksId'   },
  EXAM_FEE_SETUP:  { name: 'ExamFeeSetup',   pk: 'examFeeSetupId'   },
  EXAM_TIMETABLE:  { name: 'ExamTimetable',  pk: 'examTimetableId'  },
  EXAM_MASTER:     { name: 'ExamMaster',     pk: 'examId'           },
  SEATING_PLAN:    { name: 'SeatingPlan',    pk: 'seatingPlanId'    },
  INVIGILATOR:     { name: 'InvigilatorRemuneration', pk: 'invigilatorRemunerationId' },
  REVALUATION_FEE: { name: 'RevaluationFee', pk: 'revaluationFeeId' },
  ORGANIZATION:    { name: 'Organization',   pk: 'organizationId'   },
  CAMPUS:          { name: 'Campus',         pk: 'campusId'         },
  GENERAL_DETAIL:  { name: 'GeneralDetail',  pk: 'generalDetailId'  },
  REGULATION:      { name: 'Regulation',     pk: 'regulationId'     },
  COURSE_GROUP:    { name: 'CourseGroup',    pk: 'courseGroupId'    },
  COURSE_YEAR:     { name: 'CourseYear',     pk: 'courseYearId'     },
} as const

export type EntityKey = keyof typeof ENTITIES
```

**`src/config/constants/defaults.ts`** — new file:
```ts
export const DEFAULT_ACTIVE_REASON = 'active' as const
export const DEFAULT_IS_ACTIVE = true as const
export const DEFAULT_PAGE_SIZE = 20 as const  // currently hardcoded as paginationPageSize={20}
```

**Service updates:**
```ts
// Before
domainCreate<ExamSession>('ExamSession', data)
domainUpdate<ExamSession>('ExamSession', 'examSessionId', id, data)

// After
import { ENTITIES } from '@/config/constants/entities'
const E = ENTITIES.EXAM_SESSION
domainCreate<ExamSession>(E.name, data)
domainUpdate<ExamSession>(E.name, E.pk, id, data)
```

---

## 2. GM Codes — Use Existing Constant

### Finding
**`GM_CODES` already exists** in `src/config/constants/ui.ts` with 95 entries. No new file needed.

### Problem
Modals reference GM codes as raw string literals:
```ts
// ExamSessionModal.tsx — direct call, not using GM_CODES
in_gm_codes: 'EXMSESN',
```

### Fix
```ts
// Before
in_gm_codes: 'EXMSESN'

// After
import { GM_CODES } from '@/config/constants/ui'
in_gm_codes: GM_CODES.EXAM_SESSION_IN  // verify exact key name
```

---

## 3. Remove Stale Root Constants File

### Finding
`src/config/constants.ts` (at the root of `config/`) duplicates `APP_NAME`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS` that are already in `src/config/constants/app.ts`. Both files export the same values under different names — `SESSION_TTL` vs `SESSION_MAX_AGE_MS`, etc.

### Fix
Audit imports of `src/config/constants.ts` (root), migrate them to `src/config/constants/app.ts`, then delete the root file.

---

## 4. Typed Query Key Registry

### Problem
Inline key arrays everywhere:
```ts
queryKey: ['exam-sessions']
queryKey: ['college-filters', user?.organizationId, user?.employeeId]
queryKey: ['regulations', selectedCourseId]
```

Two modals (`ExamMaxMarksModal`, `ExamFeeSetupModal`) declare `queryKey: unknown[]` as a prop because parents need to pass a key to invalidate. This is a workaround for the missing factory. The same `['college-filters', orgId, empId]` key is copy-pasted in `useCollegeFilters.ts` AND in at least two pages that independently call the filter proc.

### Proposal

**`src/lib/query-keys.ts`** — new file following TanStack Query's recommended hierarchical pattern (so `invalidateQueries({ queryKey: QK.examSessions.all })` cascades to all list variants):

```ts
export const QK = {
  examSessions: {
    all:  ['ExamSession'] as const,
    list: (universityId?: number) =>
      universityId !== undefined
        ? ([...QK.examSessions.all, 'list', universityId] as const)
        : ([...QK.examSessions.all, 'list'] as const),
  },

  examGrades: {
    all:  ['ExamGrade'] as const,
    list: (filters: { courseId: number; regulationId: number; isForDisabled: boolean }) =>
      [...QK.examGrades.all, 'list', filters] as const,
  },

  seatingPlan: {
    all:  ['SeatingPlan'] as const,
    list: (examId: number) => [...QK.seatingPlan.all, 'list', examId] as const,
  },

  collegeFilters: {
    all:    ['collegeFilters'] as const,
    byUser: (orgId: number, empId: number) =>
      [...QK.collegeFilters.all, { orgId, empId }] as const,
    regulations: (courseId: number) =>
      [...QK.collegeFilters.all, 'regulations', courseId] as const,
  },

  organizations: {
    all:  ['Organization'] as const,
    list: () => [...QK.organizations.all, 'list'] as const,
  },

  campuses: {
    all:  ['Campus'] as const,
    list: () => [...QK.campuses.all, 'list'] as const,
  },

  // ... all other entities follow the same shape
} as const
```

**Usage:**
```ts
// Before
queryKey: ['exam-sessions']
queryClient.invalidateQueries({ queryKey: ['exam-sessions'] })

// After
queryKey: QK.examSessions.list()
queryClient.invalidateQueries({ queryKey: QK.examSessions.all })
// ↑ cascades to all list variants
```

The `queryKey: unknown[]` prop on two modals is replaced with the typed `QK` reference.

---

## 5. Base Domain Type + Fix Type Mismatches

### Problem — redundant fields
Every entity interface redeclares `isActive / reason / createdDt / updatedDt`.

### Problem — mismatched types (bugs)

1. **`InvigilatorRemunerationFormValues`** — typed as `{ collegeId: number | '' }` in `types/` but Zod schema produces `{ collegeId: string }` (because Shadcn Select uses strings). The type file is never used by the modal — it generates its own `FormValues` from Zod inference. The service function `createInvigilatorRemuneration(data: InvigilatorRemunerationFormValues)` would reject modal values if called directly.

2. **`SeatingPlanFormValues`** — typed as `{ examId: number | null }` but Zod schema uses `z.number()` (no null). Type file and schema disagree.

3. **`ApiResponse<T>.data` is `T` (not `T | null`)** but `crud.service.ts` immediately guards `if (raw == null)`. The service is correct; the type is too optimistic.

### Proposal

**`src/types/domain.ts`** — new file:
```ts
export interface DomainEntity {
  isActive: boolean
  reason?: string
  createdDt?: string
  updatedDt?: string
}

export interface DomainFormBase {
  isActive: boolean
  reason: string
}

export interface FkRef {
  id: number
  name: string
  code?: string
}
```

Entity interfaces extend `DomainEntity` (additive change, no breakage).

**Fix `InvigilatorRemunerationFormValues`** — change `number | ''` to `string` to match Zod.

**Fix `SeatingPlanFormValues`** — remove `| null` from numeric fields that the schema doesn't allow null.

**Fix `ApiResponse<T>`:**
```ts
export interface ApiResponse<T> {
  statusCode: number
  success: boolean
  message: string
  data: T | null   // was `T` — runtime evidence shows null is possible
  resultList?: T[]
}
```

---

## 6. PageResponse Type

### Problem
`crud.service.ts` handles the Spring Boot page-response shape with duck-typing:
```ts
if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'resultList' in raw) { ... }
```
No typed interface for this shape exists anywhere.

### Proposal — add to `src/types/api.ts`:
```ts
export interface PageResponse<T> {
  resultList: T[] | T | null
  totalCount: number
  totalPage: number
  currentPage: number
  pageSize: number
}
```

Replace the duck-typing in `domainList` with `body.data as PageResponse<T>`.

---

## 7. Enhanced Query Builder

### Problem
`buildQuery` only supports `==` equality with AND chaining and single `orderBy`. Real usage needs LIKE and multi-field ordering.

### Proposal — additive additions only to `crud.service.ts`:

```ts
/** Wrap a value to produce a LIKE condition: field=lk=value */
export function like(value: string): LikeValue { ... }

/** Multi-field order: buildQuery(conditions, [{ field, direction }, ...]) */
export function buildQuery(
  conditions: Record<string, string | number | boolean | LikeValue>,
  orderBy?: OrderBy | OrderBy[],
): string { ... }

/** Build an OR clause: (field==a.or.field==b) */
export function buildOrClause(
  conditions: Record<string, string | number | boolean>[],
): string { ... }
```

---

## 8. Update Services to Use ENTITIES

After `entities.ts` is created, update all 9 service files to replace string literals:

```ts
// exam-session.service.ts — before
domainCreate<ExamSession>('ExamSession', data)

// after
import { ENTITIES } from '@/config/constants/entities'
domainCreate<ExamSession>(ENTITIES.EXAM_SESSION.name, data)
```

No behavior change — purely string literal → constant.

---

## 9. `useEntityForm` Hook

### Problem
All 4+ modals share this identical boilerplate:
```ts
const [formError, setFormError] = useState<string | null>(null)
const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: getDefaults(editData) })
useEffect(() => {
  if (open) { form.reset(getDefaults(editData)); setFormError(null) }
}, [open, editData, form.reset])
const isEdit = editData !== null
```
SeatingPlanModal is missing `setFormError(null)` in its useEffect (inconsistency/bug).

### Proposal

**`src/hooks/useEntityForm.ts`** — new file:
```ts
export function useEntityForm<T, V extends FieldValues>(
  schema: ZodType<V>,
  getDefaults: (entity: T | null) => V,
  open: boolean,
  editData: T | null,
) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<V>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(editData),
  })

  useEffect(() => {
    if (open) {
      form.reset(getDefaults(editData))
      setFormError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editData])

  return {
    ...form,
    isEdit: editData !== null,
    formError,
    setFormError,
  }
}
```

Fixes the SeatingPlanModal inconsistency for free.

---

## 10. `useCrudList` + `useCrudMutation` Hooks

### Problem
Three pages (`organizations/page.tsx`, `campus/page.tsx`, `invigilator-remuneration/page.tsx`) use raw `useState + useCallback + useEffect` instead of React Query — the only pages that do this. The rest use React Query.

Every list page also independently wires `useQuery` + `useMutation` + `useQueryClient.invalidateQueries`.

### Proposal

**`src/hooks/useCrudList.ts`**:
```ts
export function useCrudList<T>({
  queryKey, queryFn, enabled = true, staleTime,
}: UseCrudListOptions<T>) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey, queryFn, enabled,
    staleTime: staleTime ?? APP_CONFIG.SESSION_STALE_TIME,
  })
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  )
  return { ...query, data: query.data ?? [], invalidate }
}
```

**`src/hooks/useCrudMutation.ts`**:
```ts
export function useCrudMutation<TPayload, TResult = TPayload>({
  mutationFn, invalidateKeys, onSuccess, onError,
}: UseCrudMutationOptions<TPayload, TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      )
      onSuccess?.(result)
    },
    onError,
  })
}
```

**Usage in pages:**
```ts
// Before (OrganizationsPage — useEffect pattern, non-standard)
const fetchOrganizations = useCallback(async () => { ... }, [])
useEffect(() => { fetchOrganizations() }, [fetchOrganizations])

// After (standard React Query via useCrudList)
const { data, isLoading, invalidate } = useCrudList({
  queryKey: QK.organizations.list(),
  queryFn: listOrganizations,
})
```

---

## 11. `baseEntitySchema` Zod Fragment

### Problem
Every modal schema includes `isActive: z.boolean(), reason: z.string()`. Repeated across 8+ files.

### Proposal — add to `src/lib/schemas.ts` (new file):
```ts
import { z } from 'zod'

/** Common isActive + reason fields. Merge into any entity schema with .merge(). */
export const baseEntitySchema = z.object({
  isActive: z.boolean(),
  reason: z.string(),
})
```

Usage:
```ts
const examSessionSchema = z.object({ ... }).merge(baseEntitySchema)
```

---

## 12. Toast Integration + QueryClient Error Handler

### Problem
- No toast/notification system — errors only show inside modal `formError` divs
- Page-level errors (`console.error(...)` in organizations page) are silently swallowed from the user
- `QueryClient` is created with `new QueryClient()` — no default `onError` handler
- `getErrorMessage()` exists in `lib/errors.ts` but only one modal imports it; others use `err.message || 'Something went wrong'` directly

### Proposal

**1. `src/lib/toast.ts`** — centralized error → notification mapper:
```ts
import { toast } from 'sonner'  // sonner is already in the project
import { getErrorMessage } from '@/lib/errors'

export function toastError(err: unknown, context?: string) {
  const msg = getErrorMessage(err)
  toast.error(context ? `${context}: ${msg}` : msg)
}

export function toastSuccess(message: string) {
  toast.success(message)
}
```

**2. QueryClient default error handler** — add to wherever `QueryClient` is instantiated:
```ts
new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (err) => toastError(err),
    },
  },
})
```

**3. Pages** — replace `console.error('Failed to load:', err)` with `toastError(err, 'Failed to load')`.

**4. Modals** — for `onError` callbacks that currently set `formError`, keep the inline error (user needs to see it next to the form). But replace the `|| 'Something went wrong'` fallback with `getErrorMessage(err)`.

---

## 13. `ActiveStatusField` Component

### Problem
The `isActive` checkbox + conditional reason input is copy-pasted into every CRUD modal:
```tsx
<Controller name="isActive" ...>
  <Checkbox id="isActive" ... /><Label>Is Active</Label>
</Controller>
{!isActive && (
  <div className="space-y-1.5">
    <Label>Reason</Label>
    <Input {...register('reason')} placeholder="Reason for deactivation" />
  </div>
)}
```

### Proposal — `src/kit/forms/ActiveStatusField.tsx`:
```tsx
interface Props {
  isActive: boolean
  reason: string
  onActiveChange: (v: boolean | 'indeterminate') => void
  onReasonChange: (v: string) => void
  reasonError?: string
}

export function ActiveStatusField({ isActive, reason, onActiveChange, onReasonChange, reasonError }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      <div className="flex items-center gap-2 pt-1">
        <Checkbox id="isActive" checked={isActive} onCheckedChange={onActiveChange} />
        <Label htmlFor="isActive" className="cursor-pointer">Is Active</Label>
      </div>
      {!isActive && (
        <FormField label="Reason" error={reasonError}>
          <Input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Reason for deactivation"
          />
        </FormField>
      )}
    </div>
  )
}
```

Used in modals via `<Controller>` (for react-hook-form integration).

---

## 14. `useFormError` Hook

### Problem
Every modal declares `const [formError, setFormError] = useState<string | null>(null)` plus the error div JSX. With `useEntityForm` (item 9) this is already partially solved — but the error rendering still needs standardization.

### Proposal — `src/hooks/useFormError.ts`:
```ts
export function useFormError() {
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown) => {
    setError(getErrorMessage(err))
  }, [])

  const clear = useCallback(() => setError(null), [])

  return { error, handleError, clear }
}
```

Note: This is partially superseded by `useEntityForm` which already includes `formError` + `setFormError`. The standalone hook is for cases where a form is not using `useEntityForm` (e.g. the InvigilatorModal's dropdown data fetch useEffect).

---

## 15. Standardize `staleTime` to `APP_CONFIG`

### Problem
`staleTime: 5 * 60 * 1000` (5 minutes) appears as a magic number in 4+ places. `APP_CONFIG.SESSION_STALE_TIME` already equals exactly this value but callers don't use it.

### Fix
Global search-replace: `staleTime: 5 * 60 * 1000` → `staleTime: APP_CONFIG.SESSION_STALE_TIME`.

---

## 16. Migrate 3 Pages from useEffect to React Query

Pages using the non-standard `useState + useCallback + useEffect` fetch pattern:
- `admin/organizations/page.tsx`
- `admin/campus/page.tsx`
- `admin-examination-management/admin-exam-masters/invigilator-remuneration/page.tsx`

All three are converted to `useCrudList` from item 10. The invigilator page's modal also has a raw `useEffect` fetching dropdown data — that's converted to `useQuery` too.

---

## 17. Use `QK` Registry in All Existing `useQuery` Calls

After `query-keys.ts` is created, replace all inline key arrays across all pages and the `useCollegeFilters` hook.

The two modals with `queryKey: unknown[]` props (`ExamMaxMarksModal`, `ExamFeeSetupModal`) have that prop removed entirely — they reference `QK` directly.

---

## 18. Replace Boilerplate in All Modals

After all the above infrastructure is in place, update all 8 CRUD modals to use:
- `useEntityForm` — replaces `useState + useForm + useEffect` boilerplate
- `ActiveStatusField` — replaces the isActive/reason JSX
- `getErrorMessage` — replaces `err.message || 'Something went wrong'`
- `DEFAULT_ACTIVE_REASON` — replaces `reason: 'active'` in `getDefaults`
- `GM_CODES.*` — replaces `'EXMSESN'` etc.

---

## Implementation Order

Steps 1–7 are pure additions (zero risk). Steps 8–14 are new hooks/components (no breakage). Steps 15–18 migrate existing code.

| Step | What | Touches existing code? |
|---|---|---|
| 1 | Create `entities.ts`, `defaults.ts` | No |
| 2 | Create `lib/query-keys.ts` (QK) | No |
| 3 | Create `types/domain.ts` | No |
| 4 | Add `PageResponse<T>` to `types/api.ts` | Minimal |
| 5 | Add `like()` + multi-order to `buildQuery` | Additive |
| 6 | Create `lib/schemas.ts` (`baseEntitySchema`) | No |
| 7 | Create `lib/toast.ts` | No |
| 8 | Add `hooks/useEntityForm.ts` | No |
| 9 | Add `hooks/useCrudList.ts` + `useCrudMutation.ts` | No |
| 10 | Add `kit/forms/ActiveStatusField.tsx` | No |
| 11 | Fix `ApiResponse<T>.data` nullable | Low |
| 12 | Fix `InvigilatorRemunerationFormValues` + `SeatingPlanFormValues` | Low |
| 13 | Update services to use ENTITIES | Service files |
| 14 | Standardize `staleTime` → `APP_CONFIG.SESSION_STALE_TIME` | All useQuery callers |
| 15 | Remove root `config/constants.ts` (audit imports first) | Config |
| 16 | Migrate organizations + campus + invigilator pages to React Query | 3 page files + 1 modal |
| 17 | Replace inline queryKeys with QK in all pages/modals | All pages |
| 18 | Replace modal boilerplate with useEntityForm + ActiveStatusField | All 8 modals |

---

## New Files Created

```
src/config/constants/entities.ts       — ENTITIES map (name + pk per entity)
src/config/constants/defaults.ts       — DEFAULT_ACTIVE_REASON, DEFAULT_IS_ACTIVE, DEFAULT_PAGE_SIZE
src/lib/query-keys.ts                  — QK typed query key registry
src/lib/schemas.ts                     — baseEntitySchema Zod fragment
src/lib/toast.ts                       — toastError / toastSuccess wrappers
src/types/domain.ts                    — DomainEntity, DomainFormBase, FkRef
src/hooks/useEntityForm.ts             — useEntityForm hook
src/hooks/useCrudList.ts               — useCrudList hook
src/hooks/useCrudMutation.ts           — useCrudMutation hook
src/kit/forms/ActiveStatusField.tsx    — isActive + reason compound component
```

## Modified Files

```
src/types/api.ts                       — PageResponse<T>, ApiResponse.data → T | null
src/types/invigilator-remuneration.ts  — fix number|'' → string in FormValues
src/types/seating-plan.ts              — remove null from numeric form fields
src/types/exam-session.ts              — extend DomainEntity
src/types/exam-grade.ts                — extend DomainEntity
src/types/exam-master.ts               — extend DomainEntity
src/services/crud.service.ts           — like(), multi-order buildQuery, PageResponse usage
src/services/exam-session.service.ts   — use ENTITIES
src/services/exam-grade.service.ts     — use ENTITIES
src/services/exam-max-marks.service.ts — use ENTITIES
src/services/exam-fee-setup.service.ts — use ENTITIES
src/services/exam-timetable.service.ts — use ENTITIES
src/services/exam-master.service.ts    — use ENTITIES, move CollegeFiltersResult to types
src/services/organization.service.ts   — use ENTITIES
src/services/campus.service.ts         — use ENTITIES
src/hooks/useCollegeFilters.ts         — use QK.collegeFilters.byUser(), APP_CONFIG.SESSION_STALE_TIME
src/app/(protected)/admin/organizations/page.tsx              — useCrudList
src/app/(protected)/admin/campus/page.tsx                     — useCrudList
src/app/(protected)/.../invigilator-remuneration/page.tsx     — useCrudList
src/app/(protected)/.../invigilator-remuneration/InvigilatorRemunerationModal.tsx — useQuery for dropdown
src/app/(protected)/.../exam-session/page.tsx                 — QK, useCrudList
src/app/(protected)/.../exam-session/ExamSessionModal.tsx     — useEntityForm, ActiveStatusField, GM_CODES, DEFAULT_ACTIVE_REASON
src/app/(protected)/.../grade-setup/GradeSetupModal.tsx       — same
src/app/(protected)/.../seating-plan-setup/SeatingPlanModal.tsx — same + bug fix (missing setFormError clear)
src/app/(protected)/.../exam-max-marks-setup/ExamMaxMarksModal.tsx — remove queryKey: unknown[] prop
src/app/(protected)/.../exam-fee-setup/ExamFeeSetupModal.tsx  — remove queryKey: unknown[] prop
src/config/constants/index.ts          — export entities, defaults
src/kit/forms/index.ts                 — export ActiveStatusField
```

## Deleted Files

```
src/config/constants.ts  — stale root file, values already in constants/app.ts
```

---

## What This Does NOT Change

- Spring Boot API contracts (zero backend changes)
- `src/common/` Angular-parity layer
- `src/kit/` component library (only one new component added)
- Any routing, auth, or middleware
- AG Grid column definitions
- Page layout or visual design
- Permission/role gating (auth audit identified `canAdd/canDelete` etc. from Spring Boot are available but not yet consumed anywhere — left for a separate pass)
