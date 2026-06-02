# Trainings Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four Trainings module placeholder pages with full AG Grid pages mirroring the Angular source — Placement Trainings list, Training Details filtered list, Add/Edit Training Detail form, and Training Sessions list with modal.

**Architecture:** Dedicated `page.tsx` per route overrides the `[...slug]` catch-all. Each page uses `useCrudList` + TanStack Query, AG Grid via `DataTable`, forms via React Hook Form + Zod, and Shadcn UI primitives. Service layer uses `domainList`/`domainCreate`/`domainUpdate` + `buildQuery`.

**Tech Stack:** Next.js 14 App Router, TypeScript, AG Grid Community v35, TanStack Query, React Hook Form, Zod, Shadcn UI, `@/common/components/table` (DataTable), `@/hooks/useCrudList`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/types/trainings.ts` | PlacementTraining, TrainingDetail, TrainingSession interfaces |
| Modify | `src/config/constants/entities.ts` | Add PLACEMENT_TRAINING, TRAINING_DETAIL, TRAINING_SESSION |
| Modify | `src/lib/query-keys.ts` | Add trainings, trainingDetails, trainingSessions QK groups |
| Create | `src/services/trainings.ts` | All CRUD functions for 3 entities |
| Modify | `src/services/index.ts` | Barrel-export trainings service |
| Create | `src/app/(pages)/(protected)/trainings/training/page.tsx` | Trainings list page |
| Create | `src/app/(pages)/(protected)/trainings/training/AddTrainingModal.tsx` | Create/edit training modal |
| Create | `src/app/(pages)/(protected)/trainings/training-details/page.tsx` | Training details list with cascading filter |
| Create | `src/app/(pages)/(protected)/trainings/training-detail/page.tsx` | Add/edit training detail form page |
| Create | `src/app/(pages)/(protected)/trainings/training-sessions/page.tsx` | Training sessions list with cascading filter |
| Create | `src/app/(pages)/(protected)/trainings/training-sessions/AddTrainingSessionModal.tsx` | Create/edit session modal |

---

### Task 1: Data Layer

**Files:**
- Create: `src/types/trainings.ts`
- Modify: `src/config/constants/entities.ts`
- Modify: `src/lib/query-keys.ts`
- Create: `src/services/trainings.ts`
- Modify: `src/services/index.ts`

- [ ] **Step 1: Create `src/types/trainings.ts`**

```ts
export interface PlacementTraining {
  traningId: number
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
  traningDetId: number
  trainingDetailTitle: string
  trainingDetailDesc?: string | null
  trainerName: string
  trainerDetails?: string | null
  location?: string | null
  noOfStudents?: number | null
  roomId?: number | null
  roomCode?: string | null
  roomName?: string | null
  startTime?: string | null
  endTime?: string | null
  fkDayIds?: string | null
  isRecurring?: boolean | null
  isActive: boolean
  reason?: string | null
  paTraningId: number
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
  traningDetId: number
  collegeId: number
  collegeCode?: string | null
  collegeName?: string | null
  trainerName?: string | null
  createdDt?: string
  updatedDt?: string
}
```

- [ ] **Step 2: Add entities to `src/config/constants/entities.ts`**

Append before `} as const` at end of file:

```ts
  // ─── Trainings ───────────────────────────────────────────────────────────────
  PLACEMENT_TRAINING: { name: 'Training',         pk: 'traningId'         },
  TRAINING_DETAIL:    { name: 'TrainingDetail',    pk: 'traningDetId'      },
  TRAINING_SESSION:   { name: 'TrainingSession',   pk: 'trainingSessionId' },
```

- [ ] **Step 3: Add query keys to `src/lib/query-keys.ts`**

Append before final `} as const`:

```ts
  // ── Trainings ─────────────────────────────────────────────────────────────
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

- [ ] **Step 4: Create `src/services/trainings.ts`**

```ts
import type { PlacementTraining, TrainingDetail, TrainingSession } from '@/types/trainings'
import { buildQuery, domainList, domainCreate, domainUpdate } from './crud'
import { ENTITIES } from '@/config/constants/entities'

const ET = ENTITIES.PLACEMENT_TRAINING
const ED = ENTITIES.TRAINING_DETAIL
const ES = ENTITIES.TRAINING_SESSION

// ─── Placement Training ───────────────────────────────────────────────────────

export async function listTrainings(): Promise<PlacementTraining[]> {
  return domainList<PlacementTraining>(ET.name)
}

export async function createTraining(data: Partial<PlacementTraining>): Promise<PlacementTraining> {
  return domainCreate<PlacementTraining>(ET.name, data)
}

export async function updateTraining(
  id: number,
  data: Partial<PlacementTraining>,
): Promise<PlacementTraining> {
  return domainUpdate<PlacementTraining>(ET.name, ET.pk, id, data)
}

// ─── Training Detail ──────────────────────────────────────────────────────────

export async function listTrainingDetails(filters: {
  collegeId: number
  yearName: string
  traningId: number
}): Promise<TrainingDetail[]> {
  return domainList<TrainingDetail>(
    ED.name,
    buildQuery({
      'Training.traningId': filters.traningId,
      'College.collegeId': filters.collegeId,
      yearName: filters.yearName,
      isActive: true,
    }),
  )
}

export async function getTrainingDetail(id: number): Promise<TrainingDetail | null> {
  const rows = await domainList<TrainingDetail>(ED.name, buildQuery({ traningDetId: id }))
  return rows[0] ?? null
}

export async function createTrainingDetail(
  data: Partial<TrainingDetail>,
): Promise<TrainingDetail> {
  return domainCreate<TrainingDetail>(ED.name, data)
}

export async function updateTrainingDetail(
  id: number,
  data: Partial<TrainingDetail>,
): Promise<TrainingDetail> {
  return domainUpdate<TrainingDetail>(ED.name, ED.pk, id, data)
}

// ─── Training Session ─────────────────────────────────────────────────────────

export async function listTrainingSessions(traningDetId: number): Promise<TrainingSession[]> {
  return domainList<TrainingSession>(
    ES.name,
    buildQuery(
      { 'TrainingDetail.traningDetId': traningDetId, isActive: true },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

export async function createTrainingSession(
  data: Partial<TrainingSession>,
): Promise<TrainingSession> {
  return domainCreate<TrainingSession>(ES.name, data)
}

export async function updateTrainingSession(
  id: number,
  data: Partial<TrainingSession>,
): Promise<TrainingSession> {
  return domainUpdate<TrainingSession>(ES.name, ES.pk, id, data)
}
```

- [ ] **Step 5: Add barrel export to `src/services/index.ts`**

Append at end of file:
```ts
export * from './trainings'
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:/Users/shrav/MyProjects/Skolo/CollegeERP-Next
npx tsc --noEmit 2>&1 | grep -v "external-src"
```

Expected: no errors from the new files.

- [ ] **Step 7: Commit**

```bash
git add src/types/trainings.ts src/config/constants/entities.ts src/lib/query-keys.ts src/services/trainings.ts src/services/index.ts
git commit -m "feat: add Trainings data layer (types, entities, QK, service)"
```

---

### Task 2: Placement Trainings Page

**Files:**
- Create: `src/app/(pages)/(protected)/trainings/training/page.tsx`
- Create: `src/app/(pages)/(protected)/trainings/training/AddTrainingModal.tsx`

- [ ] **Step 1: Create `AddTrainingModal.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { PlacementTraining } from '@/types/trainings'
import type { College } from '@/types/college'
import type { GeneralMasterDetail } from '@/types/general-master'
import { listColleges } from '@/services/admin/college'
import { listGeneralDetailsByMasterId, listGeneralMasters } from '@/services/admin/general-master'
import { listActiveEmployeesByCollege } from '@/services/admin/staff-subject-mapping'
import { createTraining, updateTraining } from '@/services/trainings'

const schema = z.object({
  collegeId:            z.string().min(1, 'College is required'),
  trainingTypeCatId:    z.string().min(1, 'Training type is required'),
  yearName:             z.string().min(1, 'Year is required'),
  trainingTitle:        z.string().min(1, 'Title is required'),
  trainerName:          z.string().min(1, 'Trainer name is required'),
  startDate:            z.string().min(1, 'Start date is required'),
  endDate:              z.string().min(1, 'End date is required'),
  employeeId:           z.string().optional(),
  trainingDescription:  z.string().optional(),
  trainerDetails:       z.string().optional(),
  discussionPoints:     z.string().optional(),
  isTrackAudience:      z.boolean().optional(),
  isActive:             z.boolean(),
})

type FormValues = z.infer<typeof schema>

function getDefaults(): FormValues {
  return {
    collegeId: '', trainingTypeCatId: '', yearName: '',
    trainingTitle: '', trainerName: '', startDate: '', endDate: '',
    employeeId: '', trainingDescription: '', trainerDetails: '',
    discussionPoints: '', isTrackAudience: false, isActive: true,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: PlacementTraining | null
  onSaved: () => void
}

export default function AddTrainingModal({ open, onClose, editData, onSaved }: Props) {
  const [colleges, setColleges]         = useState<College[]>([])
  const [trainingTypes, setTrainingTypes] = useState<GeneralMasterDetail[]>([])
  const [employees, setEmployees]       = useState<Record<string, unknown>[]>([])
  const [submitError, setSubmitError]   = useState<string | null>(null)

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: getDefaults() })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!open) return
    listColleges().then(setColleges).catch(console.error)
    listGeneralMasters()
      .then(async (masters) => {
        const m = masters.find((x) => x.generalMasterCode === 'PLCMNTTRNGTYP')
        if (m?.generalMasterId) {
          const d = await listGeneralDetailsByMasterId(m.generalMasterId)
          setTrainingTypes(d)
        }
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (collegeId) {
      listActiveEmployeesByCollege(Number(collegeId)).then(setEmployees).catch(console.error)
    } else {
      setEmployees([])
    }
  }, [collegeId])

  useEffect(() => {
    if (open && editData) {
      reset({
        collegeId:           String(editData.collegeId),
        trainingTypeCatId:   editData.trainingTypeCatId ? String(editData.trainingTypeCatId) : '',
        yearName:            editData.yearName ?? '',
        trainingTitle:       editData.trainingTitle,
        trainerName:         editData.trainerName,
        startDate:           editData.startDate ?? '',
        endDate:             editData.endDate ?? '',
        employeeId:          editData.employeeId ? String(editData.employeeId) : '',
        trainingDescription: editData.trainingDescription ?? '',
        trainerDetails:      editData.trainerDetails ?? '',
        discussionPoints:    editData.discussionPoints ?? '',
        isTrackAudience:     editData.isTrackAudience ?? false,
        isActive:            editData.isActive ?? true,
      })
    } else if (open) {
      reset(getDefaults())
    }
    setSubmitError(null)
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<PlacementTraining> = {
        collegeId:           Number(values.collegeId),
        trainingTypeCatId:   values.trainingTypeCatId ? Number(values.trainingTypeCatId) : undefined,
        yearName:            values.yearName,
        trainingTitle:       values.trainingTitle,
        trainerName:         values.trainerName,
        startDate:           values.startDate,
        endDate:             values.endDate,
        employeeId:          values.employeeId ? Number(values.employeeId) : undefined,
        trainingDescription: values.trainingDescription,
        trainerDetails:      values.trainerDetails,
        discussionPoints:    values.discussionPoints,
        isTrackAudience:     values.isTrackAudience,
        isActive:            values.isActive,
        reason:              values.isActive ? 'active' : 'inactive',
      }
      if (editData) {
        await updateTraining(editData.traningId, payload)
      } else {
        await createTraining(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Training' : 'Add Training'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">College *</Label>
              <Controller name="collegeId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c.collegeId} value={String(c.collegeId)}>{c.collegeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.collegeId && <p className="text-xs text-red-500">{errors.collegeId.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Training Type *</Label>
              <Controller name="trainingTypeCatId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {trainingTypes.map((t) => (
                      <SelectItem key={t.generalDetailId} value={String(t.generalDetailId)}>
                        {t.generalDetailDisplayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.trainingTypeCatId && <p className="text-xs text-red-500">{errors.trainingTypeCatId.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Year *</Label>
              <Input {...register('yearName')} placeholder="e.g. 2024-25" />
              {errors.yearName && <p className="text-xs text-red-500">{errors.yearName.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Incharge Employee</Label>
              <Controller name="employeeId" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={employees.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => {
                      const id = String(e.employeeId ?? e.empId ?? '')
                      const name = String(e.empName ?? e.employeeName ?? id)
                      return <SelectItem key={id} value={id}>{name}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Training Title *</Label>
              <Input {...register('trainingTitle')} placeholder="Training title" />
              {errors.trainingTitle && <p className="text-xs text-red-500">{errors.trainingTitle.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Name *</Label>
              <Input {...register('trainerName')} placeholder="Trainer name" />
              {errors.trainerName && <p className="text-xs text-red-500">{errors.trainerName.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Details</Label>
              <Input {...register('trainerDetails')} placeholder="Trainer details" />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Start Date *</Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">End Date *</Label>
              <Input type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
            </div>

            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea {...register('trainingDescription')} rows={2} placeholder="Training description" />
            </div>

            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Discussion Points</Label>
              <Textarea {...register('discussionPoints')} rows={2} placeholder="Discussion points" />
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <Controller name="isTrackAudience" control={control} render={({ field }) => (
                <Checkbox id="isTrackAudience" checked={field.value ?? false} onCheckedChange={field.onChange} />
              )} />
              <Label htmlFor="isTrackAudience" className="text-xs cursor-pointer">Track Audience</Label>

              <Controller name="isActive" control={control} render={({ field }) => (
                <Checkbox id="isActive" checked={field.value} onCheckedChange={field.onChange} className="ml-4" />
              )} />
              <Label htmlFor="isActive" className="text-xs cursor-pointer">Active</Label>
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `src/app/(pages)/(protected)/trainings/training/page.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings } from '@/services/trainings'
import type { PlacementTraining } from '@/types/trainings'
import { rowIndexGetter } from '@/lib/utils'
import AddTrainingModal from './AddTrainingModal'

function statusRenderer(p: ICellRendererParams<PlacementTraining>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function makeActionsRenderer(
  onEdit: (row: PlacementTraining) => void,
  onView: (row: PlacementTraining) => void,
) {
  return (p: ICellRendererParams<PlacementTraining>) => {
    const row = p.data
    if (!row) return null
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(row)}>
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(row)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export default function TrainingsPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData]   = useState<PlacementTraining | null>(null)

  const { data: trainings, isLoading, invalidate } = useCrudList<PlacementTraining>({
    queryKey: QK.trainings.list(),
    queryFn: listTrainings,
  })

  const columnDefs = useMemo<ColDef<PlacementTraining>[]>(() => [
    { headerName: 'No.',           valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'trainingTitle',      headerName: 'Training Title',  minWidth: 180, flex: 2 },
    { field: 'trainingTypeCatDisplayName', headerName: 'Training Type', minWidth: 130, flex: 1 },
    { field: 'trainerName',        headerName: 'Trainer Name',   minWidth: 140, flex: 1 },
    { field: 'empName',            headerName: 'Incharge',       minWidth: 130, flex: 1 },
    { field: 'yearName',           headerName: 'Year',           minWidth: 90,  flex: 0.8 },
    { field: 'collegeCode',        headerName: 'College',        minWidth: 90,  flex: 0.8 },
    { field: 'startDate',          headerName: 'Start Date',     minWidth: 110, flex: 1 },
    { field: 'endDate',            headerName: 'End Date',       minWidth: 110, flex: 1 },
    { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8, cellRenderer: statusRenderer },
    {
      headerName: 'Actions', minWidth: 100, flex: 0, width: 110,
      cellRenderer: makeActionsRenderer(
        (row) => { setEditData(row); setModalOpen(true) },
        (row) => router.push(
          `/trainings/training-details?paTraningId=${row.traningId}&trainingTitle=${encodeURIComponent(row.trainingTitle)}&yearName=${encodeURIComponent(row.yearName)}&collegeId=${row.collegeId}&collegeCode=${encodeURIComponent(row.collegeCode)}`
        ),
      ),
    },
  ], [router])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Trainings</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={trainings}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search trainings…',
                pdfDocumentTitle: 'Trainings',
              }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Training
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <AddTrainingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
```

- [ ] **Step 3: Check dev server logs for errors**

```bash
tail -10 "C:/Users/shrav/MyProjects/Skolo/CollegeERP-Next/.next/dev/logs/next-development.log"
```

Expected: "✓ Compiled" with no module-not-found errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/(protected)/trainings/training/"
git commit -m "feat: add Placement Trainings list page with create/edit modal"
```

---

### Task 3: Training Details Page

**Files:**
- Create: `src/app/(pages)/(protected)/trainings/training-details/page.tsx`

- [ ] **Step 1: Create `src/app/(pages)/(protected)/trainings/training-details/page.tsx`**

```tsx
'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings, listTrainingDetails } from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingDetail } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'

function statusRenderer(p: ICellRendererParams<TrainingDetail>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function TrainingDetailsInner() {
  const router    = useRouter()
  const params    = useSearchParams()

  const [colleges,  setColleges]  = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])

  const [collegeId,  setCollegeId]  = useState(params.get('collegeId') ?? '')
  const [yearName,   setYearName]   = useState(params.get('yearName')  ?? '')
  const [traningId,  setTraningId]  = useState(params.get('paTraningId') ?? '')

  const filtersReady = !!collegeId && !!yearName && !!traningId

  // Load colleges on mount
  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  // Load trainings when college changes
  useEffect(() => {
    if (!collegeId) { setTrainings([]); return }
    listTrainings().then((all) =>
      setTrainings(all.filter((t) => String(t.collegeId) === collegeId))
    ).catch(console.error)
  }, [collegeId])

  const { data: details, isLoading, invalidate } = useCrudList<TrainingDetail>({
    queryKey: QK.trainingDetails.byTraining(Number(traningId)),
    queryFn: () => listTrainingDetails({
      collegeId: Number(collegeId),
      yearName,
      traningId: Number(traningId),
    }),
    enabled: filtersReady,
  })

  const selectedTraining = trainings.find((t) => String(t.traningId) === traningId)

  const columnDefs = useMemo<ColDef<TrainingDetail>[]>(() => [
    { headerName: 'No.',                valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'trainerName',             headerName: 'Trainer Name',  minWidth: 140, flex: 1 },
    { field: 'trainingDetailTitle',     headerName: 'Detail Title',  minWidth: 180, flex: 2 },
    { field: 'startTime',               headerName: 'Start Time',    minWidth: 100, flex: 0.8 },
    { field: 'endTime',                 headerName: 'End Time',      minWidth: 100, flex: 0.8 },
    { field: 'roomCode',                headerName: 'Room',          minWidth: 90,  flex: 0.7 },
    { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8, cellRenderer: statusRenderer },
    {
      headerName: 'Actions', minWidth: 80, flex: 0, width: 80,
      cellRenderer: (p: ICellRendererParams<TrainingDetail>) => {
        const row = p.data
        if (!row) return null
        return (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() =>
            router.push(
              `/trainings/training-detail?a=Edit+Training+Detail&traningDetId=${row.traningDetId}&paTraningId=${traningId}&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}&collegeId=${collegeId}&yearName=${encodeURIComponent(yearName)}`
            )
          }>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ], [router, traningId, collegeId, yearName, selectedTraining])

  return (
    <PageContainer className="space-y-4">
      {/* Filter bar */}
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Training Details</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-0.5">
              <Label className="text-xs">College</Label>
              <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setTraningId('') }}>
                <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.collegeId} value={String(c.collegeId)}>{c.collegeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Year</Label>
              <Input
                value={yearName}
                onChange={(e) => setYearName(e.target.value)}
                placeholder="e.g. 2024-25"
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Training</Label>
              <Select
                value={traningId}
                onValueChange={setTraningId}
                disabled={!collegeId || trainings.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
                <SelectContent>
                  {trainings.map((t) => (
                    <SelectItem key={t.traningId} value={String(t.traningId)}>{t.trainingTitle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtersReady && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <DataTable
                rowData={details}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search details…',
                  pdfDocumentTitle: 'Training Details',
                }}
                toolbarTrailing={
                  <Button size="sm" onClick={() =>
                    router.push(
                      `/trainings/training-detail?a=New+Training+Detail&paTraningId=${traningId}&trainingTitle=${encodeURIComponent(selectedTraining?.trainingTitle ?? '')}&collegeId=${collegeId}&yearName=${encodeURIComponent(yearName)}`
                    )
                  }>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Training Detail
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

export default function TrainingDetailsPage() {
  return (
    <Suspense fallback={<PageContainer><p className="p-6 text-muted-foreground text-sm">Loading…</p></PageContainer>}>
      <TrainingDetailsInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(pages)/(protected)/trainings/training-details/"
git commit -m "feat: add Training Details page with cascading college/year/training filter"
```

---

### Task 4: Add / Edit Training Detail Form Page

**Files:**
- Create: `src/app/(pages)/(protected)/trainings/training-detail/page.tsx`

- [ ] **Step 1: Create `src/app/(pages)/(protected)/trainings/training-detail/page.tsx`**

```tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft } from 'lucide-react'
import { listRooms } from '@/services/admin/room'
import { getTrainingDetail, createTrainingDetail, updateTrainingDetail } from '@/services/trainings'
import type { Room } from '@/types/room'

const DAYS = [
  { id: '1', label: 'Mon' }, { id: '2', label: 'Tue' }, { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' }, { id: '5', label: 'Fri' }, { id: '6', label: 'Sat' },
  { id: '7', label: 'Sun' },
]

const schema = z.object({
  trainingDetailTitle: z.string().min(1, 'Title is required'),
  trainerName:         z.string().min(1, 'Trainer name is required'),
  reason:              z.string().min(1, 'Reason is required'),
  trainerDetails:      z.string().optional(),
  location:            z.string().optional(),
  noOfStudents:        z.string().optional(),
  roomId:              z.string().optional(),
  startTime:           z.string().optional(),
  endTime:             z.string().optional(),
  isRecurring:         z.boolean().optional(),
  fkDayIds:            z.string().optional(),
  trainingDetailDesc:  z.string().optional(),
  isActive:            z.boolean(),
})

type FormValues = z.infer<typeof schema>

function TrainingDetailInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const action      = searchParams.get('a') ?? 'New Training Detail'
  const traningDetId = searchParams.get('traningDetId')
  const paTraningId  = searchParams.get('paTraningId') ?? ''
  const trainingTitle = searchParams.get('trainingTitle') ?? ''
  const collegeId   = searchParams.get('collegeId') ?? ''
  const yearName    = searchParams.get('yearName') ?? ''
  const isEdit      = action === 'Edit Training Detail'

  const [rooms, setRooms]             = useState<Room[]>([])
  const [loading, setLoading]         = useState(isEdit)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trainingDetailTitle: '', trainerName: '', reason: 'active',
      trainerDetails: '', location: '', noOfStudents: '',
      roomId: '', startTime: '', endTime: '',
      isRecurring: false, fkDayIds: '',
      trainingDetailDesc: '', isActive: true,
    },
  })

  const isRecurring = watch('isRecurring')

  useEffect(() => {
    listRooms().then(setRooms).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !traningDetId) { setLoading(false); return }
    getTrainingDetail(Number(traningDetId))
      .then((detail) => {
        if (detail) {
          reset({
            trainingDetailTitle: detail.trainingDetailTitle,
            trainerName:         detail.trainerName,
            reason:              detail.reason ?? 'active',
            trainerDetails:      detail.trainerDetails ?? '',
            location:            detail.location ?? '',
            noOfStudents:        detail.noOfStudents ? String(detail.noOfStudents) : '',
            roomId:              detail.roomId ? String(detail.roomId) : '',
            startTime:           detail.startTime ?? '',
            endTime:             detail.endTime ?? '',
            isRecurring:         detail.isRecurring ?? false,
            fkDayIds:            detail.fkDayIds ?? '',
            trainingDetailDesc:  detail.trainingDetailDesc ?? '',
            isActive:            detail.isActive,
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isEdit, traningDetId, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload = {
        trainingDetailTitle: values.trainingDetailTitle,
        trainerName:         values.trainerName,
        reason:              values.reason,
        trainerDetails:      values.trainerDetails,
        location:            values.location,
        noOfStudents:        values.noOfStudents ? Number(values.noOfStudents) : undefined,
        roomId:              values.roomId ? Number(values.roomId) : undefined,
        startTime:           values.startTime,
        endTime:             values.endTime,
        isRecurring:         values.isRecurring,
        fkDayIds:            values.isRecurring ? values.fkDayIds : undefined,
        trainingDetailDesc:  values.trainingDetailDesc,
        isActive:            values.isActive,
        paTraningId:         Number(paTraningId),
        collegeId:           Number(collegeId),
        yearName,
      }
      if (isEdit && traningDetId) {
        await updateTrainingDetail(Number(traningDetId), payload)
      } else {
        await createTrainingDetail(payload)
      }
      router.back()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (loading) {
    return <PageContainer><p className="p-6 text-muted-foreground text-sm">Loading…</p></PageContainer>
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="app-card-title">{action}</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Context header */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground block">Training</span><p className="font-medium">{trainingTitle || '—'}</p></div>
            <div><span className="text-xs text-muted-foreground block">College</span><p className="font-medium">{collegeId || '—'}</p></div>
            <div><span className="text-xs text-muted-foreground block">Year</span><p className="font-medium">{yearName || '—'}</p></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Detail Title *</Label>
              <Input {...register('trainingDetailTitle')} placeholder="Training detail title" />
              {errors.trainingDetailTitle && <p className="text-xs text-red-500">{errors.trainingDetailTitle.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Trainer Name *</Label>
                <Input {...register('trainerName')} placeholder="Trainer name" />
                {errors.trainerName && <p className="text-xs text-red-500">{errors.trainerName.message}</p>}
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">Trainer Details</Label>
                <Input {...register('trainerDetails')} placeholder="Trainer details" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" {...register('startTime')} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">End Time</Label>
                <Input type="time" {...register('endTime')} />
              </div>

              <div className="space-y-0.5">
                <Label className="text-xs">Location</Label>
                <Input {...register('location')} placeholder="Location" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs">No. of Students</Label>
                <Input type="number" {...register('noOfStudents')} placeholder="0" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-xs">Room</Label>
                <Controller name="roomId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.roomId} value={String(r.roomId)}>{r.roomName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>

              <div className="space-y-0.5">
                <Label className="text-xs">Reason *</Label>
                <Input {...register('reason')} placeholder="active" />
                {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Controller name="isRecurring" control={control} render={({ field }) => (
                  <Checkbox id="isRecurring" checked={field.value ?? false} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="isRecurring" className="text-xs cursor-pointer">Recurring</Label>
              </div>
              <div className="flex items-center gap-2">
                <Controller name="isActive" control={control} render={({ field }) => (
                  <Checkbox id="isActiveDetail" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="isActiveDetail" className="text-xs cursor-pointer">Active</Label>
              </div>
            </div>

            {isRecurring && (
              <div className="space-y-1">
                <Label className="text-xs">Days</Label>
                <div className="flex flex-wrap gap-2">
                  <Controller name="fkDayIds" control={control} render={({ field }) => {
                    const selected = (field.value ?? '').split(',').filter(Boolean)
                    return (
                      <>
                        {DAYS.map((d) => (
                          <label key={d.id} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Checkbox
                              checked={selected.includes(d.id)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...selected, d.id]
                                  : selected.filter((x) => x !== d.id)
                                field.onChange(next.join(','))
                              }}
                            />
                            {d.label}
                          </label>
                        ))}
                      </>
                    )
                  }} />
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              <Label className="text-xs">Description</Label>
              <Textarea {...register('trainingDetailDesc')} rows={2} placeholder="Description" />
            </div>

            {submitError && (
              <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  )
}

export default function TrainingDetailPage() {
  return (
    <Suspense fallback={<PageContainer><p className="p-6 text-muted-foreground text-sm">Loading…</p></PageContainer>}>
      <TrainingDetailInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(pages)/(protected)/trainings/training-detail/"
git commit -m "feat: add Add/Edit Training Detail form page"
```

---

### Task 5: Training Sessions Page

**Files:**
- Create: `src/app/(pages)/(protected)/trainings/training-sessions/page.tsx`
- Create: `src/app/(pages)/(protected)/trainings/training-sessions/AddTrainingSessionModal.tsx`

- [ ] **Step 1: Create `AddTrainingSessionModal.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { TrainingSession } from '@/types/trainings'
import { listActiveEmployeesByCollege } from '@/services/admin/staff-subject-mapping'
import { createTrainingSession, updateTrainingSession } from '@/services/trainings'

const schema = z.object({
  sessionDate:          z.string().min(1, 'Session date is required'),
  inchargeEmployeeId:   z.string().min(1, 'Incharge employee is required'),
  sessionTakenBy:       z.string().min(1, 'Session taken by is required'),
  fromTime:             z.string().optional(),
  toTime:               z.string().optional(),
  noOfAttendees:        z.string().optional(),
  sessionTopicsCovered: z.string().optional(),
  isSessionCancelled:   z.boolean().optional(),
  sessionCancelReason:  z.string().optional(),
  isActive:             z.boolean(),
})

type FormValues = z.infer<typeof schema>

function getDefaults(): FormValues {
  return {
    sessionDate: '', inchargeEmployeeId: '', sessionTakenBy: '',
    fromTime: '', toTime: '', noOfAttendees: '',
    sessionTopicsCovered: '', isSessionCancelled: false,
    sessionCancelReason: '', isActive: true,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: TrainingSession | null
  collegeId: number
  traningDetId: number
  onSaved: () => void
}

export default function AddTrainingSessionModal({
  open, onClose, editData, collegeId, traningDetId, onSaved,
}: Props) {
  const [employees, setEmployees]   = useState<Record<string, unknown>[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: getDefaults() })

  const isCancelled = watch('isSessionCancelled')

  useEffect(() => {
    if (open && collegeId) {
      listActiveEmployeesByCollege(collegeId).then(setEmployees).catch(console.error)
    }
  }, [open, collegeId])

  useEffect(() => {
    if (open && editData) {
      reset({
        sessionDate:          editData.sessionDate ?? '',
        inchargeEmployeeId:   editData.inchargeEmployeeId ? String(editData.inchargeEmployeeId) : '',
        sessionTakenBy:       editData.sessionTakenBy ?? '',
        fromTime:             editData.fromTime ?? '',
        toTime:               editData.toTime ?? '',
        noOfAttendees:        editData.noOfAttendees ? String(editData.noOfAttendees) : '',
        sessionTopicsCovered: editData.sessionTopicsCovered ?? '',
        isSessionCancelled:   editData.isSessionCancelled ?? false,
        sessionCancelReason:  editData.sessionCancelReason ?? '',
        isActive:             editData.isActive,
      })
    } else if (open) {
      reset(getDefaults())
    }
    setSubmitError(null)
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<TrainingSession> = {
        sessionDate:          values.sessionDate,
        inchargeEmployeeId:   Number(values.inchargeEmployeeId),
        sessionTakenBy:       values.sessionTakenBy,
        fromTime:             values.fromTime,
        toTime:               values.toTime,
        noOfAttendees:        values.noOfAttendees ? Number(values.noOfAttendees) : undefined,
        sessionTopicsCovered: values.sessionTopicsCovered,
        isSessionCancelled:   values.isSessionCancelled,
        sessionCancelReason:  values.isSessionCancelled ? values.sessionCancelReason : undefined,
        isActive:             values.isActive,
        reason:               values.isActive ? 'active' : 'inactive',
        traningDetId,
        collegeId,
      }
      if (editData) {
        await updateTrainingSession(editData.trainingSessionId, payload)
      } else {
        await createTrainingSession(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Session' : 'Add Session'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Session Date *</Label>
              <Input type="date" {...register('sessionDate')} />
              {errors.sessionDate && <p className="text-xs text-red-500">{errors.sessionDate.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">No. of Attendees</Label>
              <Input type="number" {...register('noOfAttendees')} placeholder="0" />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">From Time</Label>
              <Input type="time" {...register('fromTime')} />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">To Time</Label>
              <Input type="time" {...register('toTime')} />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Incharge Employee *</Label>
              <Controller name="inchargeEmployeeId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={employees.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => {
                      const id = String(e.employeeId ?? e.empId ?? '')
                      const name = String(e.empName ?? e.employeeName ?? id)
                      return <SelectItem key={id} value={id}>{name}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              )} />
              {errors.inchargeEmployeeId && <p className="text-xs text-red-500">{errors.inchargeEmployeeId.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Session Taken By *</Label>
              <Input {...register('sessionTakenBy')} placeholder="Trainer / presenter name" />
              {errors.sessionTakenBy && <p className="text-xs text-red-500">{errors.sessionTakenBy.message}</p>}
            </div>

            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Topics Covered</Label>
              <Textarea {...register('sessionTopicsCovered')} rows={2} placeholder="Topics covered in this session" />
            </div>

            <div className="flex items-center gap-4 col-span-2">
              <div className="flex items-center gap-2">
                <Controller name="isSessionCancelled" control={control} render={({ field }) => (
                  <Checkbox id="isCancelled" checked={field.value ?? false} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="isCancelled" className="text-xs cursor-pointer">Session Cancelled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Controller name="isActive" control={control} render={({ field }) => (
                  <Checkbox id="isActiveSession" checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor="isActiveSession" className="text-xs cursor-pointer">Active</Label>
              </div>
            </div>

            {isCancelled && (
              <div className="space-y-0.5 col-span-2">
                <Label className="text-xs">Cancel Reason</Label>
                <Input {...register('sessionCancelReason')} placeholder="Reason for cancellation" />
              </div>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `src/app/(pages)/(protected)/trainings/training-sessions/page.tsx`**

```tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listTrainings, listTrainingDetails, listTrainingSessions } from '@/services/trainings'
import { listColleges } from '@/services/admin/college'
import type { PlacementTraining, TrainingDetail, TrainingSession } from '@/types/trainings'
import type { College } from '@/types/college'
import { rowIndexGetter } from '@/lib/utils'
import AddTrainingSessionModal from './AddTrainingSessionModal'

function statusRenderer(p: ICellRendererParams<TrainingSession>) {
  const active = p.data?.isActive
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function TrainingSessionsPage() {
  const [colleges,  setColleges]  = useState<College[]>([])
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [details,   setDetails]   = useState<TrainingDetail[]>([])

  const [collegeId,   setCollegeId]   = useState('')
  const [yearName,    setYearName]    = useState('')
  const [traningId,   setTraningId]   = useState('')
  const [traningDetId, setTraningDetId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editData,  setEditData]  = useState<TrainingSession | null>(null)

  const filtersReady = !!collegeId && !!yearName && !!traningId && !!traningDetId

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
  }, [])

  useEffect(() => {
    if (!collegeId) { setTrainings([]); setTraningId(''); return }
    listTrainings().then((all) =>
      setTrainings(all.filter((t) => String(t.collegeId) === collegeId))
    ).catch(console.error)
  }, [collegeId])

  useEffect(() => {
    if (!traningId || !collegeId || !yearName) { setDetails([]); setTraningDetId(''); return }
    listTrainingDetails({ collegeId: Number(collegeId), yearName, traningId: Number(traningId) })
      .then(setDetails)
      .catch(console.error)
  }, [traningId, collegeId, yearName])

  const { data: sessions, isLoading, invalidate } = useCrudList<TrainingSession>({
    queryKey: QK.trainingSessions.byDetail(Number(traningDetId)),
    queryFn: () => listTrainingSessions(Number(traningDetId)),
    enabled: filtersReady,
  })

  const columnDefs = useMemo<ColDef<TrainingSession>[]>(() => [
    { headerName: 'No.',           valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'trainerName',        headerName: 'Trainer Name', minWidth: 140, flex: 1 },
    { field: 'sessionDate',        headerName: 'Session Date', minWidth: 120, flex: 1 },
    { field: 'fromTime',           headerName: 'From Time',   minWidth: 100, flex: 0.8 },
    { field: 'noOfAttendees',      headerName: 'Attendees',   minWidth: 90,  flex: 0.7 },
    { field: 'inchargeEmpName',    headerName: 'Incharge',    minWidth: 130, flex: 1 },
    { field: 'collegeCode',        headerName: 'College',     minWidth: 90,  flex: 0.8 },
    { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7, cellRenderer: statusRenderer },
    {
      headerName: 'Actions', minWidth: 80, flex: 0, width: 80,
      cellRenderer: (p: ICellRendererParams<TrainingSession>) => {
        const row = p.data
        if (!row) return null
        return (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
            onClick={() => { setEditData(row); setModalOpen(true) }}>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ], [])

  return (
    <PageContainer className="space-y-4">
      {/* Filter bar */}
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Training Sessions</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">College</Label>
              <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setTraningId(''); setTraningDetId('') }}>
                <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.collegeId} value={String(c.collegeId)}>{c.collegeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Year</Label>
              <Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="e.g. 2024-25" />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Training</Label>
              <Select value={traningId} onValueChange={(v) => { setTraningId(v); setTraningDetId('') }}
                disabled={!collegeId || trainings.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
                <SelectContent>
                  {trainings.map((t) => (
                    <SelectItem key={t.traningId} value={String(t.traningId)}>{t.trainingTitle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Training Detail</Label>
              <Select value={traningDetId} onValueChange={setTraningDetId}
                disabled={!traningId || details.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select detail" /></SelectTrigger>
                <SelectContent>
                  {details.map((d) => (
                    <SelectItem key={d.traningDetId} value={String(d.traningDetId)}>{d.trainingDetailTitle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtersReady && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <DataTable
                rowData={sessions}
                columnDefs={columnDefs}
                loading={isLoading}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search sessions…',
                  pdfDocumentTitle: 'Training Sessions',
                }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Session
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <AddTrainingSessionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        collegeId={Number(collegeId)}
        traningDetId={Number(traningDetId)}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
```

- [ ] **Step 3: Check dev server for errors**

```bash
tail -10 "C:/Users/shrav/MyProjects/Skolo/CollegeERP-Next/.next/dev/logs/next-development.log"
```

Expected: "✓ Compiled" with no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(pages)/(protected)/trainings/training-sessions/"
git commit -m "feat: add Training Sessions page with cascading 4-level filter and modal"
```
