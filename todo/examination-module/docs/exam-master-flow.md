# Exam Master Flow

> Feature location: `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/`
>
> Three pages, all client components:
> 1. `page.tsx` — list page with filters and AG Grid
> 2. `ExamMasterModal.tsx` — add/edit dialog
> 3. `exam-master-details/page.tsx` — labels management page

---

## Spring Boot Endpoints Used

| Method | Path | What it returns |
|---|---|---|
| GET | `/getAllRecords/s_get_collegewisedetails_bycode` | Two arrays: filtersdata (universities/colleges/courses) and academicData (academic years by university) |
| GET | `/domain/list/ExamMaster` | Paginated list of ExamMaster records |
| POST | `/domain/create/ExamMaster` | Creates new exam master, returns created record |
| PUT | `/domain/update/ExamMaster` | Updates exam master by `?query=examId=={id}`, returns updated record |
| POST | `/examnotificationupload` | Multipart file upload for notification PDFs |
| GET | `/domain/list/GeneralDetail` | Exam fee type categories (Regular/Supple/Internal) filtered by `generalMasterCode==EXMFEETYP` |
| GET | `/domain/list/Regulation` | Regulations for a course |
| GET | `/domain/list/CourseGroup` | Course groups for a course |
| GET | `/domain/list/CourseYear` | Course years for a course, ordered by `sortOrder=ASC` |
| GET | `/domain/list/ExamMasterDetails` | Existing labels for an exam |
| POST | `/addExamMasterDetails` | Bulk save of ExamMasterDetails array |

All of these are called through `/api/proxy/` — the client never calls Spring Boot directly.

---

## 1. Filter Cascade Logic

**File:** `src/app/(protected)/admin-examination-management/admin-exam-masters/exam-master/page.tsx`

### Initial data load

On mount, `fetchFilterDetails()` calls:
```
GET /api/proxy/getAllRecords/s_get_collegewisedetails_bycode
  ?in_flag=clg_filters
  &in_org_id={user.organizationId ?? 0}
  &in_college_id=0&in_course_id=0&...
  &in_loginuser_empid={user.employeeId ?? 0}
  &...
```

The response `json.data.result` is an array of arrays. The page identifies which sub-array to use by checking the first element:
- `arr[0].flag === 'clg_filters'` → `filtersdata` (university/college/course rows)
- `arr[0].clg_filters_ay === 'clg_filters_ay'` → `academicData` (academic year rows)

### Cascade chain

```
fetchFilterDetails()
  → extract distinct universities (distinct by fk_university_id)
  → auto-select first university
  → handleUniversityChange(firstUniId)
      → filter filtersdata by universityId
      → extract distinct courses
      → auto-select first course
      → handleCourseChange(firstCourseId)
          → filter academicData by universityId
          → extract distinct academic years
          → sort by is_curr_ay DESC → select current AY
          → sort display list by academic_year DESC (numeric)
          → handleAcademicYearChange(currentAyId)
              → mode=1 (University): fetchExamsByUniversity()
              → mode=2 (College): extract distinct colleges from filtersdata
                                  (wait for user to select a college)
```

**Key detail:** `distinct()` helper deduplicates by numeric key:
```typescript
function distinct<T>(arr: T[], keyFn: (item: T) => number): T[]
```

**Current academic year detection:** Rows have `is_curr_ay: number` (1 = current, 0 = not). The page sorts academicData by `is_curr_ay DESC` and picks `sorted[0]` as the current AY.

---

## 2. University Mode vs. College Mode

Toggle: `RadioGroup` with values `"1"` (University) and `"2"` (College). State: `mode: 1 | 2`.

**Mode 1 — Is For University:**
- After academic year is selected, immediately fetches exams with:
  ```
  GET /domain/list/ExamMaster?size=99999&query=
    Universities.universityId=={uniId}
    .and.Course.courseId=={courseId}
    .and.AcademicYear.academicYearId=={ayId}
    .order(createdDt=DESC)
  ```
- No college dropdown shown

**Mode 2 — Is For College:**
- After academic year is selected, the college dropdown is populated (distinct colleges for the selected university/course from `filtersdata`)
- **User must manually select a college** — does not auto-select the first college
- On college select, fetches exams with:
  ```
  GET /domain/list/ExamMaster?size=99999&query=
    College.collegeId=={colId}
    .and.Course.courseId=={courseId}
    .and.AcademicYear.academicYearId=={ayId}
    .order(createdDt=DESC)
  ```

**Mode switch behavior:** `handleModeChange(newMode)` resets all downstream state (courses, academic years, colleges, exams) and calls `handleUniversityChange` with the new mode. The `newMode` is passed explicitly to avoid stale closure on the `mode` state variable (note the `setTimeout(() => ..., 0)` pattern to allow state to settle).

---

## 3. Add/Edit Modal Form Chain

**File:** `ExamMasterModal.tsx`

### Form fields

| Field | Type | Validation |
|---|---|---|
| `examName` | text | Required |
| `examShortName` | text | Required |
| `examMonthYr` | `Date \| null` | Optional (MonthYearPicker) |
| `fromDate` | `Date \| null` | Optional (DatePicker) |
| `toDate` | `Date \| null` | Must be >= fromDate |
| `isRegularExam` | boolean | Checkbox — **at least one of Regular/Supply/Internal must be checked** |
| `isSupplyExam` | boolean | Checkbox — part of exam type group |
| `isInternalExam` | boolean | Checkbox — part of exam type group |
| `isPublished` | boolean | Checkbox |
| `isResultprocessStarted` | boolean | Checkbox |
| `notificationPublishedOn` | `Date \| null` | Optional (DatePicker) |
| `notificationFile` | `File \| null` | Controlled outside react-hook-form |
| `feeNotificationPublishedOn` | `Date \| null` | Optional (DatePicker) |
| `feeNotificationFile` | `File \| null` | Controlled outside react-hook-form |
| `isActive` | boolean | Checkbox |
| `reason` | string | Shown only when `isActive = false` |

**MonthYearPicker → date sync:** When `examMonthYr` changes, a `useEffect` watches it and auto-sets both `fromDate` and `toDate` to the first of that month:
```typescript
useEffect(() => {
  if (examMonthYr) {
    const d = new Date(examMonthYr.getFullYear(), examMonthYr.getMonth(), 1)
    setValue('fromDate', d)
    setValue('toDate', d)
  }
}, [examMonthYr, setValue])
```

**toDate guard:** A second `useEffect` watches `fromDate` and `toDate`. If `toDate < fromDate`, it resets `toDate = fromDate` and shows an in-form toast warning.

### Create flow (Add mode)

1. `POST /api/proxy/domain/create/ExamMaster` with JSON payload (from `buildPayload()`)
2. Response: `json.data` → `savedExam: ExamMaster`
3. If files selected: `POST /api/proxy/examnotificationupload` (multipart — see file upload quirk below)
4. `onSaved()` → refresh list; `onClose()` → close modal

### Edit flow

1. `PUT /api/proxy/domain/update/ExamMaster?query=examId=={exam.examId}` with JSON payload
2. Response: `json.data` → `savedExam: ExamMaster`
3. If files selected: same file upload as above
4. `onSaved()` → refresh list; `onClose()` → close modal

### Context passed from parent page

```typescript
context: {
  universityId: selectedUniversityId | null
  collegeId: selectedCollegeId | null
  courseId: selectedCourseId | null
  academicYearId: selectedAcademicYearId | null
}
```

These are included in the create/update payload so Spring Boot can associate the exam with the correct university/college/course/academic year.

---

## 4. File Upload — The Trailing Space Quirk

**This is a known quirk — do not change it.**

```typescript
// In ExamMasterModal.tsx, line ~219
formData.append('examId ', String(savedExam.examId)) // trailing space in key name
```

The FormData key is `"examId "` (with a trailing space character). The Angular frontend sends this exact key name, and Spring Boot's multipart parser looks for exactly this key. Changing it to `"examId"` (no space) will silently break the file-to-exam association.

This is documented in PROGRESS.md under "Exam Master — Add/Edit Modal".

---

## 5. Details Page Data Loading

**File:** `exam-master-details/page.tsx`

### Navigation handoff

The list page writes the exam object to `sessionStorage` before navigating:
```typescript
// In page.tsx onCellClicked handler
sessionStorage.setItem('examMasterDetails', JSON.stringify(event.data))
router.push(`...exam-master-details?examId=${event.data?.examId}`)
```

The details page reads it back:
```typescript
const stored = sessionStorage.getItem('examMasterDetails')
if (stored) {
  setExam(JSON.parse(stored))
} else {
  // API fallback if sessionStorage is empty (direct URL access, browser refresh)
  // Uses getExamMasterById() from exam-master.service — handles single-object response normalisation
  const exam = await getExamMasterById(examId)
  if (exam) setExam(exam)
}
```

**Why sessionStorage?** Avoids a redundant API call when navigating from the list (the exam data is already in memory). The fallback handles direct URL access and page refreshes.

### Parallel reference data fetch

Once the `exam` object is available, `Promise.all()` fires 5 requests simultaneously:

```typescript
Promise.all([
  // 1. Exam fee types — all types, then filtered by exam flags
  fetch(`/api/proxy/domain/list/GeneralDetail?size=99999&query=GeneralMaster.generalMasterCode==EXMFEETYP.and.isActive==true`),

  // 2. Regulations for this course
  fetch(`/api/proxy/domain/list/Regulation?size=99999&query=Course.courseId==${courseId}.and.isActive==true`),

  // 3. Course groups for this course
  fetch(`/api/proxy/domain/list/CourseGroup?size=99999&query=Course.courseId==${courseId}.and.isActive==true`),

  // 4. Course years for this course, ordered
  fetch(`/api/proxy/domain/list/CourseYear?size=100&query=Course.courseId==${courseId}.and.isActive==true.order(sortOrder=ASC)`),

  // 5. Existing exam labels for this exam
  fetch(`/api/proxy/domain/list/ExamMasterDetails?size=99999&query=examMaster.examId==${examId}.and.isActive==true`),
])
```

After all resolve:
- Exam fee types are **filtered** by the exam's type flags: if `exam.isRegularExam`, keep `generalDetailCode === 'Regular'`, etc.
- The filtered types become the tabs (one tab per enabled exam type)
- First tab is auto-selected

---

## 6. Save-All Labels Pattern

All add/edit/delete operations on exam labels are **in-memory only** — no API calls until "Save All".

**In-memory state:** `examMasterDetails: ExamMasterDetails[]`

- **Add:** appends new `ExamMasterDetails` object to array, with `isActive: true`
- **Edit:** replaces the object at `editingIndex` in place
- **Delete (soft):** sets `isActive: false` on the object — does NOT splice it out. Spring Boot handles soft deletes.

The table shows only `filteredDetails` — entries where `examTypeCatId === selectedTabId && isActive === true`. Soft-deleted entries are still in `examMasterDetails` and will be sent to the API with `isActive: false`.

**Save All:**
```typescript
POST /api/proxy/addExamMasterDetails
Content-Type: application/json
Body: JSON.stringify(examMasterDetails)  // full array including soft-deleted entries
```

On HTTP 200 with `body.success === true`: show success toast, then `router.push(...)` back to list after 1500ms.

---

## 7. AG Grid Cell Renderers and Click Handling

The list page defines `onCellClicked` to dispatch based on column:

```typescript
const onCellClicked = useCallback((event: CellClickedEvent<ExamMaster>) => {
  if (event.colDef.headerName === 'Exam Labels') {
    // Write to sessionStorage then navigate
    sessionStorage.setItem('examMasterDetails', JSON.stringify(event.data))
    router.push(`...exam-master-details?examId=${event.data?.examId}`)
  }
  if (event.colDef.headerName === 'Actions') {
    // Open edit modal
    setEditingExam(event.data ?? null)
    setModalOpen(true)
  }
}, [router])
```

Note: Download links in the Fee Notification and Notification columns call `e.stopPropagation()` to prevent the cell click handler from firing when the anchor is clicked.

---

## Known Quirks and Gaps

| Issue | Location | Notes |
|---|---|---|
| `(user as any)?.organizationId ?? 0` | `page.tsx` | `organizationId` is missing from `SessionUser` type. Needs proper type addition if required. |
| No auto-select first college in mode=2 | `handleAcademicYearChange()` | User must manually select a college. Angular did the same. |
| No confirmation dialog before label delete | `exam-master-details/page.tsx` | Labels are soft-deleted in-memory; `ConfirmDialog` component exists but not wired here. |
| `batchId` field missing | `exam-master-details/page.tsx` | Present in Angular form but commented out; not included here either. Matches Angular's current state. |
| No quick search input on list page | `page.tsx` | `DataTable` accepts `quickFilterText` prop but no UI input is wired to it. |
| No pagination on list page | `page.tsx` | `size=99999` is used as a workaround. AG Grid pagination props exist but not wired. |
| Trailing space in FormData key | `ExamMasterModal.tsx` | `"examId "` — intentional, matches Angular/Spring Boot expectation. **Do not remove the space.** |
| Spring Boot single-object response | `crud.service.ts` `domainList()` | When exactly one record matches, Spring Boot returns a bare object `{}` not `[{}]`. `domainList` normalises this to always return `T[]`. Do not add extra array checks in service functions — `domainList` already handles it. |
| Exam type validation | `ExamMasterModal.tsx` Zod schema | A `.refine()` enforces that at least one of `isRegularExam`, `isSupplyExam`, `isInternalExam` must be `true`. Error message displayed under the Regular checkbox. |
