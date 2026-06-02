# Trainings Module — Phase 1 (Management) Design Spec

## Goal

Replace the four placeholder screens in the Trainings module with fully functional pages mirroring the Angular source, covering training master data, detail records, and session scheduling.

## Scope (Phase 1 — Management)

| Route | Page |
|---|---|
| `/trainings/training` | Placement Trainings list |
| `/trainings/training-details` | Training Details (filtered list) |
| `/trainings/training-detail` | Add / Edit Training Detail (form page) |
| `/trainings/training-sessions` | Training Sessions (filtered list + modal) |

Out of scope for this phase: student registration, registered list, attendance marking, view attendance, training classes list (Phase 2 & 3).

---

## Architecture

Follows the same ERP Module Mirror pattern established by the Campus Maintenance module:
- Dedicated `page.tsx` per route overrides the `[...slug]` catch-all
- AG Grid via `DataTable` wrapper (`@/common/components/table`)
- TanStack Query via `useCrudList` hook
- Spring Boot CRUD API via `domainList` / `domainCreate` / `domainUpdate` + `buildQuery`
- React Hook Form + Zod for all forms
- Shadcn UI primitives (Dialog, Select, Input, Textarea, Label, Button)

---

## Data Layer

### Types — `src/types/trainings.ts`

```ts
export interface PlacementTraining {
  traningId: number           // note: backend typo preserved
  trainingTitle: string
  trainingDescription?: string | null
  trainingTypeCatId?: number | null
  trainingTypeCatCode?: string | null
  trainingTypeCatDisplayName?: string | null
  trainerName: string
  trainerDetails?: string | null
  discussionPoints?: string | null
  startDate: string
  endDate: string
  yearName: string
  employeeId?: number | null
  empName?: string | null
  empNumber?: string | null
  collegeId: number
  collegeCode: string
  collegeName?: string | null
  isTrackAudience?: boolean | null
  isActive: boolean
  reason?: string | null
  createdDt?: string
  updatedDt?: string
}

export interface TrainingDetail {
  traningDetId: number        // note: backend typo preserved
  trainingDetailTitle: string
  trainingDetailDesc?: string | null
  trainerName: string
  trainerDetails?: string | null
  location?: string | null
  noOfStudents?: number | null
  roomId?: number | null
  roomCode?: string | null
  roomName?: string | null
  startTime?: string | null   // stored as 24h string, e.g. "09:30"
  endTime?: string | null
  fkDayIds?: string | null    // comma-separated day IDs when recurring
  isRecurring?: boolean | null
  isActive: boolean
  reason?: string | null
  paTraningId: number         // FK to PlacementTraining.traningId
  collegeId: number
  collegeCode?: string | null
  yearName?: string | null
  createdDt?: string
  updatedDt?: string
}

export interface TrainingSession {
  trainingSessionId: number
  sessionDate: string
  fromTime?: string | null
  toTime?: string | null
  noOfAttendees?: number | null
  inchargeEmployeeId?: number | null
  inchargeEmpName?: string | null
  inchargeEmpNumber?: string | null
  sessionTakenBy?: string | null
  sessionTopicsCovered?: string | null
  isSessionCancelled?: boolean | null
  sessionCancelReason?: string | null
  isActive: boolean
  reason?: string | null
  traningDetId: number        // FK to TrainingDetail.traningDetId
  collegeId: number
  collegeCode?: string | null
  collegeName?: string | null
  trainerName?: string | null
  createdDt?: string
  updatedDt?: string
}
```

### Entities — `src/config/constants/entities.ts`

Add at end of ENTITIES:
```ts
// ─── Trainings ───────────────────────────────────────────────────────────────
PLACEMENT_TRAINING: { name: 'Training',         pk: 'traningId'         },
TRAINING_DETAIL:    { name: 'TrainingDetail',    pk: 'traningDetId'      },
TRAINING_SESSION:   { name: 'TrainingSession',   pk: 'trainingSessionId' },
```

### Query Keys — `src/lib/query-keys.ts`

```ts
trainings: {
  all: ['Training'] as const,
  list: () => ['Training', 'list'] as const,
},
trainingDetails: {
  all: ['TrainingDetail'] as const,
  byTraining: (traningId: number) => ['TrainingDetail', 'byTraining', traningId] as const,
},
trainingSessions: {
  all: ['TrainingSession'] as const,
  byDetail: (traningDetId: number) => ['TrainingSession', 'byDetail', traningDetId] as const,
},
```

### Service — `src/services/trainings.ts`

```ts
// PlacementTraining
listTrainings(): Promise<PlacementTraining[]>              // domainList, isActive filter optional
createTraining(data): Promise<PlacementTraining>
updateTraining(id, data): Promise<PlacementTraining>

// TrainingDetail
listTrainingDetails(filters: { collegeId, yearName, traningId }): Promise<TrainingDetail[]>
  // buildQuery({ 'Training.traningId': traningId, 'College.collegeId': collegeId, yearName, isActive: true })
createTrainingDetail(data): Promise<TrainingDetail>
updateTrainingDetail(id, data): Promise<TrainingDetail>
getTrainingDetail(id): Promise<TrainingDetail | null>

// TrainingSession
listTrainingSessions(traningDetId: number): Promise<TrainingSession[]>
  // buildQuery({ 'TrainingDetail.traningDetId': traningDetId, isActive: true })
createTrainingSession(data): Promise<TrainingSession>
updateTrainingSession(id, data): Promise<TrainingSession>
```

Training type dropdown uses GM code `PLCMNTTRNGTYP` via `listGeneralDetailsByMasterId`.

---

## Page Designs

### Page 1 — Placement Trainings (`/trainings/training/page.tsx`)

**Layout:** `PageContainer` → `app-card` → `DataTable`

**Toolbar:** search input (left) + "+ Add Training" button (right)

**Columns:**
| Field | Header | Notes |
|---|---|---|
| rowIndexGetter | No. | width 60 |
| trainingTitle | Training Title | flex 2 |
| trainingTypeCatDisplayName | Training Type | flex 1 |
| trainerName | Trainer Name | flex 1 |
| empName | Incharge | flex 1 |
| yearName | Year | flex 0.8 |
| collegeCode | College | flex 0.8 |
| startDate | Start Date | flex 1 |
| endDate | End Date | flex 1 |
| isActive | Status | badge: Active/Inactive, flex 0.8 |
| actions | Actions | width 100, Edit icon + eye icon |

**Actions:**
- Pencil icon → opens `AddTrainingModal` in edit mode
- Eye icon → `router.push('/trainings/training-details?paTraningId=X&trainingTitle=Y&yearName=Z&collegeId=A&collegeCode=B')`

**Add Training Modal fields (2-column grid):**
- College* (Select)
- Training Type* (Select — GM code `PLCMNTTRNGTYP`)
- Year* (text input or select from AcademicYear)
- Incharge Employee (text search input → `listActiveEmployeesByCollege`)
- Training Title*
- Trainer Name*
- Start Date*
- End Date*
- Training Description (Textarea)
- Trainer Details (Textarea)
- Discussion Points (Textarea)
- Is Track Audience (Checkbox)
- Is Active (Checkbox, default true)

---

### Page 2 — Training Details (`/trainings/training-details/page.tsx`)

**Layout:** `PageContainer` → filter bar card → results card (conditionally shown)

**Filter bar (3 cascading selects in a row):**
1. College (loads on mount)
2. Year (text input — `yearName` string, not a dropdown since it's free text in Angular)
3. Training (loads after college + year are set, filters trainings by college)

Once all 3 filters are set, show the AG Grid.

**Columns:**
| Field | Header |
|---|---|
| rowIndexGetter | No. |
| trainerName | Trainer Name |
| trainingDetailTitle | Detail Title |
| startTime | Start Time |
| endTime | End Time |
| roomCode | Room |
| isActive | Status |
| actions | Actions |

**Actions:**
- Pencil icon → `router.push('/trainings/training-detail?a=Edit+Training+Detail&traningDetId=X&paTraningId=Y&trainingTitle=Z&collegeId=A&yearName=B')`
- "+ Add Training Detail" button → `router.push('/trainings/training-detail?a=New+Training+Detail&paTraningId=Y&trainingTitle=Z&collegeId=A&yearName=B')`

**Data source:** `listTrainingDetails({ collegeId, yearName, traningId })`

Query key: `QK.trainings.detailsByTraining(traningId)` — but only enabled when all 3 filters are set.

When navigated from Placement Trainings (via eye icon), pre-populate the filter from URL params.

---

### Page 3 — Add / Edit Training Detail (`/trainings/training-detail/page.tsx`)

Dedicated form page, wrapped in `Suspense` for `useSearchParams()`.

**Context header (read-only, from URL params):**
- Training Title, College, Year

**Form fields (2-column grid where sensible):**
- Detail Title* (Input, full width)
- Trainer Name* (Input)
- Trainer Details (Input)
- Start Time (time input, col 1)
- End Time (time input, col 2)
- Location (Input)
- No. of Students (number Input)
- Room (Select — `listRooms()`)
- Is Recurring (Checkbox)
- Days (multi-select, shown only when `isRecurring` is true)
- Description (Textarea, full width)
- Is Active (Checkbox, default true)
- Reason* (Input — required field on backend)

**Submit behaviour:**
- New: `createTrainingDetail(...)` then `router.back()`
- Edit: fetches existing via `getTrainingDetail(traningDetId)` on mount (reset form), then `updateTrainingDetail(...)` on save
- Back button: `router.back()`

---

### Page 4 — Training Sessions (`/trainings/training-sessions/page.tsx`)

**Layout:** `PageContainer` → filter card → results card

**Filter bar (4 cascading selects):**
1. College
2. Year (text input)
3. Training (loads after college selected, filters by college)
4. Training Detail (loads after training selected)

Show grid only when all 4 filters are set.

**Columns:**
| Field | Header |
|---|---|
| rowIndexGetter | No. |
| trainerName | Trainer Name |
| sessionDate | Session Date |
| fromTime | From Time |
| noOfAttendees | Attendees |
| inchargeEmpName | Incharge |
| collegeCode | College |
| isActive | Status |
| actions | Actions |

**Actions:** Pencil icon → opens `AddTrainingSessionModal` in edit mode

**Toolbar trailing:** "+ Add Session" button

**Add Session Modal fields (2-column grid):**
- Session Date* (date input)
- From Time / To Time (time inputs)
- No. of Attendees (number)
- Incharge Employee* (Select from `listActiveEmployeesByCollege(collegeId)`)
- Session Taken By* (text input)
- Topics Covered (Textarea)
- Is Session Cancelled (Checkbox)
- Cancel Reason (Input, shown when cancelled)
- Is Active (Checkbox, default true)

---

## Navigation Flow

```
/trainings/training  →(eye icon)→  /trainings/training-details?paTraningId=X&...
/trainings/training-details  →(add/edit)→  /trainings/training-detail?a=New|Edit&...
/trainings/training-detail  →(save/back)→  router.back()
/trainings/training-sessions  (standalone, filter selects own data)
```

---

## Files to Create / Modify

| Action | File |
|---|---|
| Create | `src/types/trainings.ts` |
| Modify | `src/config/constants/entities.ts` |
| Modify | `src/lib/query-keys.ts` |
| Create | `src/services/trainings.ts` |
| Modify | `src/services/index.ts` |
| Create | `src/app/(pages)/(protected)/trainings/training/page.tsx` |
| Create | `src/app/(pages)/(protected)/trainings/training/AddTrainingModal.tsx` |
| Create | `src/app/(pages)/(protected)/trainings/training-details/page.tsx` |
| Create | `src/app/(pages)/(protected)/trainings/training-detail/page.tsx` |
| Create | `src/app/(pages)/(protected)/trainings/training-sessions/page.tsx` |
| Create | `src/app/(pages)/(protected)/trainings/training-sessions/AddTrainingSessionModal.tsx` |
