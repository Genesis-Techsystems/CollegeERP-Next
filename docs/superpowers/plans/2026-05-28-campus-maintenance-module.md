# Campus Maintenance Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 5 campus-maintenance placeholder pages with fully functional Next.js implementations mirroring the Angular Campus Maintenance module (complaint management system).

**Architecture:** Dedicated page files per route inside `src/app/(pages)/(protected)/campus-maintenance/`. Data layer: typed service in `src/services/campus-maintenance.ts` using existing `domainList/domainCreate/domainUpdate` via the `ClgManagementIssue` Spring entity. All pages follow the existing AG Grid + React Query (`useCrudList`) + `useSession`/`useLoginEmployeeId` patterns already in this codebase.

**Tech Stack:** Next.js 14 App Router, TypeScript, AG Grid Community v35 (`DataTable`), TanStack Query (`useCrudList`, `useQuery`), React Hook Form + Zod, Shadcn UI (`Dialog`, `Button`, `Input`, `Textarea`, `Label`), `Select` from `@/common/components/select`, `StatusBadge` from `@/common/components/data-display`, `PageContainer` from `@/components/layout`.

---

## File Map

**Create:**
- `src/types/campus-maintenance.ts` — CampusIssue interface
- `src/services/campus-maintenance.ts` — service functions
- `src/app/(pages)/(protected)/campus-maintenance/campus-maintendance-dashboard/page.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/complaints-list/page.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/complaints-list/ComplaintOverviewModal.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/new-complaints/page.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/new-complaints/NewComplaintModal.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/add-complaints/page.tsx`
- `src/app/(pages)/(protected)/campus-maintenance/complaint-status/page.tsx`

**Modify:**
- `src/config/constants/entities.ts` — add MANAGEMENT_ISSUE entity
- `src/lib/query-keys.ts` — add campusIssues query keys
- `src/services/index.ts` — re-export campus-maintenance service

---

## Task 1: Data layer — types, entity, service, query keys

**Files:**
- Create: `src/types/campus-maintenance.ts`
- Modify: `src/config/constants/entities.ts`
- Modify: `src/lib/query-keys.ts`
- Create: `src/services/campus-maintenance.ts`
- Modify: `src/services/index.ts`

- [ ] **Step 1: Create CampusIssue type**

`src/types/campus-maintenance.ts`:
```ts
export interface CampusIssue {
  managementIssueId: number
  issueTitle: string
  issueDescription: string
  issueLogDate: string
  expectedResolvedOn: string
  actualResolvedOn?: string | null
  location?: string | null
  statusComments: string
  wfStatusComments?: string | null
  closingComments?: string | null

  raisedEmpId: number
  raisedEmpName: string
  raisedEmpNumber: string

  inchargeEmpId?: number | null
  inchargeEmpName?: string | null
  inchargeEmpNumber?: string | null

  closedEmpId?: number | null
  closedEmpName?: string | null

  collegeId: number
  collegeCode: string
  collegeName: string

  departmentId?: number | null
  deptCode?: string | null
  deptName?: string | null

  issueInroomId?: number | null
  issueInroomCode?: string | null
  issueInroomName?: string | null

  issuepriorityCatId?: number | null
  issuepriorityCatCode?: string | null
  issuepriorityCatDisplayName?: string | null

  aprvrejstatusCatId?: number | null
  aprvrejstatusCatCode: string   // INPROGRESS | DONE | REJECTED | CLOSED
  aprvrejstatusCatDisplayName?: string | null

  workflowStageId?: number | null
  wfName?: string | null

  itemDetId?: number | null
  itemBarCode?: string | null
  itemSerialNo?: string | null

  isClosed?: boolean | null
  isMgmtApprovalReq?: boolean | null
  isActive: boolean
  reason?: string

  statusRefPath?: string | null   // before-image path
  rating?: string | null
  feedback?: string | null
  createdDt?: string
  updatedDt?: string
}

export type CampusIssueFormValues = {
  collegeId: number | string
  departmentId?: number | string
  issueInroomId?: number | string
  serviceCatId?: number | string
  issueTitle: string
  issueDescription: string
  location: string
  issuepriorityCatId?: number | string
  workflowStageId?: number | string
  inchargeEmpId?: number | string
  expectedResolvedOn: string
  statusComments: string
  wfStatusComments?: string
  closingComments?: string
  isMgmtApprovalReq: boolean
  issueLogDate: string
  isActive: boolean
}
```

- [ ] **Step 2: Add MANAGEMENT_ISSUE to entities.ts**

In `src/config/constants/entities.ts`, inside the `ENTITIES` object (after the last entry before the closing `}`), add:
```ts
  // ─── Campus Maintenance ──────────────────────────────────────────────────────
  MANAGEMENT_ISSUE:        { name: 'ClgManagementIssue',       pk: 'managementIssueId'          },
```

- [ ] **Step 3: Add campusIssues to query-keys.ts**

In `src/lib/query-keys.ts`, add before the final closing `} as const`:
```ts
  // ── Campus Maintenance Issues ─────────────────────────────────────────────
  campusIssues: {
    all: ['ClgManagementIssue'] as const,
    list: () => ['ClgManagementIssue', 'list'] as const,
    byEmployee: (empId: number) => ['ClgManagementIssue', 'byEmployee', empId] as const,
    detail: (id: number) => ['ClgManagementIssue', 'detail', id] as const,
  },
```

- [ ] **Step 4: Create campus-maintenance service**

`src/services/campus-maintenance.ts`:
```ts
import type { CampusIssue, CampusIssueFormValues } from '@/types/campus-maintenance'
import { buildQuery, domainList, domainCreate, domainUpdate, uploadFile } from './crud'
import { ENTITIES } from '@/config/constants/entities'

const E = ENTITIES.MANAGEMENT_ISSUE

export async function listCampusIssues(): Promise<CampusIssue[]> {
  return domainList<CampusIssue>(E.name, buildQuery({ isActive: true }, { field: 'issueLogDate', direction: 'DESC' }))
}

export async function listCampusIssuesByEmployee(empId: number): Promise<CampusIssue[]> {
  if (!empId) return []
  return domainList<CampusIssue>(E.name, buildQuery({ 'raisedEmpId.employeeId': empId, isActive: true }, { field: 'issueLogDate', direction: 'DESC' }))
}

export async function getCampusIssue(id: number): Promise<CampusIssue | null> {
  const rows = await domainList<CampusIssue>(E.name, buildQuery({ managementIssueId: id }))
  return rows[0] ?? null
}

export async function createCampusIssue(data: Partial<CampusIssue>): Promise<CampusIssue> {
  return domainCreate<CampusIssue>(E.name, data)
}

export async function updateCampusIssue(id: number, data: Partial<CampusIssue>): Promise<CampusIssue> {
  return domainUpdate<CampusIssue>(E.name, E.pk, id, data)
}

export async function uploadIssueImages(
  managementIssueId: number,
  beforeFile?: File | null,
  afterFile?: File | null,
): Promise<void> {
  if (!beforeFile && !afterFile) return
  const formData = new FormData()
  formData.append('managementIssueId', String(managementIssueId))
  if (beforeFile) formData.append('beforeissue', beforeFile)
  if (afterFile) formData.append('afterissue', afterFile)
  await uploadFile('uploadissueimage', formData)
}
```

- [ ] **Step 5: Export from services/index.ts**

Add to `src/services/index.ts`:
```ts
export * from './campus-maintenance'
```

---

## Task 2: Dashboard page

**Files:**
- Create: `src/app/(pages)/(protected)/campus-maintenance/campus-maintendance-dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

```tsx
'use client'

import { PageContainer } from '@/components/layout'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssues } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { ClipboardList, CheckCircle, Clock, XCircle } from 'lucide-react'

function StatCard({ label, count, icon: Icon, color }: { label: string; count: number; icon: React.ElementType; color: string }) {
  return (
    <div className={`app-card p-5 flex items-center gap-4`}>
      <div className={`rounded-full p-3 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function CampusMaintenanceDashboard() {
  const { data: issues, isLoading } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  })

  const total = issues.length
  const open = issues.filter(i => i.aprvrejstatusCatCode === 'INPROGRESS').length
  const resolved = issues.filter(i => i.aprvrejstatusCatCode === 'DONE').length
  const closed = issues.filter(i => i.aprvrejstatusCatCode === 'CLOSED').length

  return (
    <PageContainer className="space-y-6">
      <div className="app-card p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-1">Campus Maintenance</h2>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Log and track campus facility complaints. Assign in-charge staff, set priority levels, and monitor resolution progress.
        </p>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Complaints" count={total} icon={ClipboardList} color="bg-slate-500" />
          <StatCard label="In Progress" count={open} icon={Clock} color="bg-amber-500" />
          <StatCard label="Resolved" count={resolved} icon={CheckCircle} color="bg-green-500" />
          <StatCard label="Closed" count={closed} icon={XCircle} color="bg-gray-500" />
        </div>
      )}
    </PageContainer>
  )
}
```

---

## Task 3: Complaints List page + ComplaintOverviewModal

**Files:**
- Create: `src/app/(pages)/(protected)/campus-maintenance/complaints-list/page.tsx`
- Create: `src/app/(pages)/(protected)/campus-maintenance/complaints-list/ComplaintOverviewModal.tsx`

- [ ] **Step 1: Create ComplaintOverviewModal**

`ComplaintOverviewModal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CampusIssue } from '@/types/campus-maintenance'
import { updateCampusIssue } from '@/services/campus-maintenance'

interface Props {
  open: boolean
  onClose: () => void
  issue: CampusIssue | null
  onSaved: () => void
}

export default function ComplaintOverviewModal({ open, onClose, issue, onSaved }: Props) {
  const [statusComments, setStatusComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // sync comments when issue changes
  useState(() => { if (issue) setStatusComments(issue.statusComments ?? '') })

  async function handleSave() {
    if (!issue) return
    setSaving(true); setError(null)
    try {
      await updateCampusIssue(issue.managementIssueId, { statusComments })
      onSaved(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!issue) return null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Complaint Overview</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <Row label="Raised By" value={issue.raisedEmpName} />
          <Row label="College" value={issue.collegeName} />
          {issue.deptName && <Row label="Department" value={issue.deptName} />}
          {issue.issueInroomName && <Row label="Room" value={issue.issueInroomName} />}
          <Row label="Title" value={issue.issueTitle} />
          {issue.issuepriorityCatDisplayName && <Row label="Priority" value={issue.issuepriorityCatDisplayName} />}
          <Row label="Description" value={issue.issueDescription} />
          {issue.wfStatusComments && <Row label="Workflow Comments" value={issue.wfStatusComments} />}
          {issue.closedEmpName && <Row label="Closed By" value={issue.closedEmpName} />}
          {issue.closingComments && <Row label="Closing Comments" value={issue.closingComments} />}
          <div className="space-y-1">
            <Label>Status Comments</Label>
            <Textarea value={statusComments} onChange={e => setStatusComments(e.target.value)} rows={3} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="font-medium text-muted-foreground col-span-1">{label}</span>
      <span className="col-span-2">{value ?? '—'}</span>
    </div>
  )
}
```

- [ ] **Step 2: Create Complaints List page**

`complaints-list/page.tsx`:
```tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssues } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { rowIndexGetter } from '@/lib/utils'
import ComplaintOverviewModal from './ComplaintOverviewModal'
import { Badge } from '@/components/ui/badge'

function statusVariant(code: string) {
  switch (code) {
    case 'INPROGRESS': return 'bg-blue-100 text-blue-700'
    case 'DONE':       return 'bg-green-100 text-green-700'
    case 'REJECTED':   return 'bg-red-100 text-red-700'
    case 'CLOSED':     return 'bg-gray-100 text-gray-600'
    default:           return 'bg-slate-100 text-slate-600'
  }
}

const COL_DEFS = {
  siNo:        { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CampusIssue>,
  issueTitle:  { field: 'issueTitle', headerName: 'Complaint Title', minWidth: 200, flex: 2 } as ColDef<CampusIssue>,
  priority:    { field: 'issuepriorityCatDisplayName', headerName: 'Priority', minWidth: 100, flex: 0.8 } as ColDef<CampusIssue>,
  date:        { field: 'issueLogDate', headerName: 'Complaint Date', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  raisedBy:    { field: 'raisedEmpName', headerName: 'Raised By', minWidth: 150, flex: 1.2 } as ColDef<CampusIssue>,
  expectedOn:  { field: 'expectedResolvedOn', headerName: 'Expected Resolve', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  status:      { field: 'aprvrejstatusCatCode', headerName: 'Status', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  actions:     { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<CampusIssue>,
}

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const code = p.data?.aprvrejstatusCatCode ?? ''
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusVariant(code)}`}>{code}</span>
}

function makeActionsRenderer(
  onEdit: (issue: CampusIssue) => void,
  onView: (issue: CampusIssue) => void,
) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data
    if (!issue) return null
    const isClosed = issue.aprvrejstatusCatCode === 'CLOSED'
    return isClosed ? (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(issue)}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(issue)}>
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function ComplaintsListPage() {
  const router = useRouter()
  const [overviewIssue, setOverviewIssue] = useState<CampusIssue | null>(null)

  const { data: issues, isLoading, invalidate } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  })

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.issueTitle,
    COL_DEFS.priority,
    COL_DEFS.date,
    COL_DEFS.raisedBy,
    COL_DEFS.expectedOn,
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    {
      ...COL_DEFS.actions,
      cellRenderer: makeActionsRenderer(
        (issue) => router.push(`/campus-maintenance/add-complaints?id=${issue.managementIssueId}`),
        setOverviewIssue,
      ),
    },
  ], [router])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Complaints List</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={issues}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search complaints…', pdfDocumentTitle: 'Complaints List' }}
            />
          </div>
        </div>
      </div>

      <ComplaintOverviewModal
        open={overviewIssue !== null}
        onClose={() => setOverviewIssue(null)}
        issue={overviewIssue}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
```

---

## Task 4: New Complaints page + NewComplaintModal

**Files:**
- Create: `src/app/(pages)/(protected)/campus-maintenance/new-complaints/page.tsx`
- Create: `src/app/(pages)/(protected)/campus-maintenance/new-complaints/NewComplaintModal.tsx`

- [ ] **Step 1: Create NewComplaintModal**

`NewComplaintModal.tsx` — dual-mode dialog (create/view):
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { CampusIssue } from '@/types/campus-maintenance'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'
import type { Room } from '@/types/room'
import type { GeneralMasterDetail } from '@/types/general-master'
import { listColleges } from '@/services/admin/college'
import { listDepartmentsByCollege } from '@/services/admin/department'
import { listRooms } from '@/services/admin/room'
import { listGeneralDetailsByMasterId, listGeneralMasters } from '@/services/admin/general-master'
import { createCampusIssue, uploadIssueImages } from '@/services/campus-maintenance'

const schema = z.object({
  issueLogDate: z.string().min(1, 'Date required'),
  collegeId: z.string().min(1, 'College required'),
  departmentId: z.string().optional(),
  issueInroomId: z.string().optional(),
  serviceCatId: z.string().optional(),
  issueTitle: z.string().min(1, 'Title required'),
  issueDescription: z.string().optional(),
  location: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  editData: CampusIssue | null
  viewMode: boolean
  raisedEmpId: number
  onSaved: () => void
}

export default function NewComplaintModal({ open, onClose, editData, viewMode, raisedEmpId, onSaved }: Props) {
  const [colleges, setColleges] = useState<College[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [serviceTypes, setServiceTypes] = useState<GeneralMasterDetail[]>([])
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { issueLogDate: today, collegeId: '', departmentId: '', issueInroomId: '', serviceCatId: '', issueTitle: '', issueDescription: '', location: '' },
  })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!open) return
    listColleges().then(setColleges).catch(console.error)
    listRooms().then(setRooms).catch(console.error)
    listGeneralMasters().then(async (masters) => {
      const master = masters.find(m => m.generalMasterCode === 'CMPLT')
      if (master) {
        const details = await listGeneralDetailsByMasterId(master.generalMasterId)
        setServiceTypes(details)
      }
    }).catch(console.error)
  }, [open])

  useEffect(() => {
    if (collegeId) {
      listDepartmentsByCollege(Number(collegeId)).then(setDepartments).catch(console.error)
    }
  }, [collegeId])

  useEffect(() => {
    if (open && !editData) {
      reset({ issueLogDate: today, collegeId: '', departmentId: '', issueInroomId: '', serviceCatId: '', issueTitle: '', issueDescription: '', location: '' })
    }
    setSubmitError(null)
  }, [open, editData, reset, today])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const issue = await createCampusIssue({
        issueLogDate: values.issueLogDate,
        collegeId: Number(values.collegeId),
        departmentId: values.departmentId ? Number(values.departmentId) : undefined,
        issueInroomId: values.issueInroomId ? Number(values.issueInroomId) : undefined,
        issueTitle: values.issueTitle,
        issueDescription: values.issueDescription ?? '',
        location: values.location ?? '',
        raisedEmpId,
        aprvrejstatusCatCode: 'INPROGRESS',
        isActive: true,
        statusComments: '',
      })
      if ((beforeFile || afterFile) && issue.managementIssueId) {
        await uploadIssueImages(issue.managementIssueId, beforeFile, afterFile)
      }
      onSaved(); onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save complaint')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {viewMode ? 'Complaint Details' : 'New Complaint'}
          </DialogTitle>
        </DialogHeader>

        {viewMode && editData ? (
          <div className="space-y-3 py-2 text-sm">
            <Row label="College" value={editData.collegeName} />
            {editData.deptName && <Row label="Department" value={editData.deptName} />}
            {editData.issueInroomName && <Row label="Room" value={editData.issueInroomName} />}
            <Row label="Title" value={editData.issueTitle} />
            <Row label="Description" value={editData.issueDescription} />
            {editData.wfStatusComments && <Row label="Workflow Comments" value={editData.wfStatusComments} />}
            {editData.closedEmpName && <Row label="Closed By" value={editData.closedEmpName} />}
            {editData.closingComments && <Row label="Closing Comments" value={editData.closingComments} />}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Complaint Date *</Label>
              <Input type="date" {...register('issueLogDate')} />
              {errors.issueLogDate && <p className="text-xs text-red-500">{errors.issueLogDate.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>College *</Label>
              <Controller name="collegeId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                  <SelectContent>
                    {colleges.map(c => <SelectItem key={c.collegeId} value={String(c.collegeId)}>{c.collegeName}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.collegeId && <p className="text-xs text-red-500">{errors.collegeId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Department</Label>
                <Controller name="departmentId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!collegeId}>
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.departmentId} value={String(d.departmentId)}>{d.deptName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1">
                <Label>Room</Label>
                <Controller name="issueInroomId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map(r => <SelectItem key={r.roomId} value={String(r.roomId)}>{r.roomName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Service Type</Label>
              <Controller name="serviceCatId" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(s => <SelectItem key={s.generalDetailId} value={String(s.generalDetailId)}>{s.generalDetailDisplayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Issue Title *</Label>
              <Input {...register('issueTitle')} placeholder="Brief title of the issue" />
              {errors.issueTitle && <p className="text-xs text-red-500">{errors.issueTitle.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea {...register('issueDescription')} placeholder="Describe the issue in detail" rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input {...register('location')} placeholder="Exact location" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Before Picture</Label>
                <Input type="file" accept="image/*" onChange={e => setBeforeFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">After Picture</Label>
                <Input type="file" accept="image/*" onChange={e => setAfterFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </div>
            </div>
            {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Submit'}</Button>
            </DialogFooter>
          </form>
        )}

        {viewMode && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="col-span-2">{value ?? '—'}</span>
    </div>
  )
}
```

- [ ] **Step 2: Create New Complaints page**

`new-complaints/page.tsx`:
```tsx
'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssuesByEmployee } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { rowIndexGetter } from '@/lib/utils'
import NewComplaintModal from './NewComplaintModal'
import { useSession } from '@/hooks/useSession'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'

const COL_DEFS = {
  siNo:       { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CampusIssue>,
  issueTitle: { field: 'issueTitle', headerName: 'Complaint Title', minWidth: 200, flex: 2 } as ColDef<CampusIssue>,
  college:    { field: 'collegeName', headerName: 'College', minWidth: 140, flex: 1.2 } as ColDef<CampusIssue>,
  raisedBy:   { field: 'raisedEmpName', headerName: 'Raised By', minWidth: 140, flex: 1 } as ColDef<CampusIssue>,
  status:     { field: 'aprvrejstatusCatCode', headerName: 'Status', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  date:       { field: 'issueLogDate', headerName: 'Complaint Date', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  expectedOn: { field: 'expectedResolvedOn', headerName: 'Expected Resolve', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  actions:    { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<CampusIssue>,
}

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const code = p.data?.aprvrejstatusCatCode ?? ''
  const cls = code === 'INPROGRESS' ? 'bg-blue-100 text-blue-700' : code === 'DONE' ? 'bg-green-100 text-green-700' : code === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{code}</span>
}

function makeActionsRenderer(
  onEdit: (issue: CampusIssue) => void,
  onView: (issue: CampusIssue) => void,
) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data
    if (!issue) return null
    const isClosed = issue.aprvrejstatusCatCode === 'CLOSED'
    return isClosed ? (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(issue)}><Eye className="h-3.5 w-3.5" /></Button>
    ) : (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(issue)}><PencilIcon className="h-3.5 w-3.5" /></Button>
    )
  }
}

export default function NewComplaintsPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<CampusIssue | null>(null)
  const [viewMode, setViewMode] = useState(false)

  const { data: issues, isLoading, invalidate } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.byEmployee(employeeId),
    queryFn: () => listCampusIssuesByEmployee(employeeId),
    enabled: employeeId > 0,
  })

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.issueTitle,
    COL_DEFS.college,
    COL_DEFS.raisedBy,
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    COL_DEFS.date,
    COL_DEFS.expectedOn,
    {
      ...COL_DEFS.actions,
      cellRenderer: makeActionsRenderer(
        (issue) => { setEditData(issue); setViewMode(false); setModalOpen(true) },
        (issue) => { setEditData(issue); setViewMode(true); setModalOpen(true) },
      ),
    },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">My Complaints</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={issues}
              columnDefs={columnDefs}
              loading={isLoading || sessionLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search complaints…', pdfDocumentTitle: 'My Complaints' }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setViewMode(false); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" /> New Complaint
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <NewComplaintModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        viewMode={viewMode}
        raisedEmpId={employeeId}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
```

---

## Task 5: Add Complaints page (full edit form)

**Files:**
- Create: `src/app/(pages)/(protected)/campus-maintenance/add-complaints/page.tsx`

- [ ] **Step 1: Create Add Complaints page**

`add-complaints/page.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getCampusIssue, updateCampusIssue, uploadIssueImages } from '@/services/campus-maintenance'
import { listColleges } from '@/services/admin/college'
import { listDepartmentsByCollege } from '@/services/admin/department'
import { listRooms } from '@/services/admin/room'
import { listGeneralDetailsByMasterId, listGeneralMasters } from '@/services/admin/general-master'
import { listWorkflowStages } from '@/services/admin/workflow-stage'
import { listActiveEmployeesByCollege } from '@/services/admin/staff-subject-mapping'
import type { CampusIssue } from '@/types/campus-maintenance'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'
import type { Room } from '@/types/room'
import type { GeneralMasterDetail } from '@/types/general-master'
import type { WorkflowStage } from '@/types/workflow-stage'
import { ArrowLeft } from 'lucide-react'

const schema = z.object({
  collegeId: z.string().min(1, 'Required'),
  departmentId: z.string().optional(),
  issueInroomId: z.string().optional(),
  issuepriorityCatId: z.string().optional(),
  workflowStageId: z.string().optional(),
  inchargeEmpId: z.string().optional(),
  expectedResolvedOn: z.string().optional(),
  statusComments: z.string().optional(),
  wfStatusComments: z.string().optional(),
  closingComments: z.string().optional(),
  isMgmtApprovalReq: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export default function AddComplaintsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')

  const [issue, setIssue] = useState<CampusIssue | null>(null)
  const [loading, setLoading] = useState(true)
  const [colleges, setColleges] = useState<College[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [priorities, setPriorities] = useState<GeneralMasterDetail[]>([])
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([])
  const [employees, setEmployees] = useState<Array<Record<string, any>>>([])
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!id) return
    getCampusIssue(Number(id)).then(iss => {
      setIssue(iss)
      if (iss) {
        reset({
          collegeId: String(iss.collegeId),
          departmentId: iss.departmentId ? String(iss.departmentId) : '',
          issueInroomId: iss.issueInroomId ? String(iss.issueInroomId) : '',
          issuepriorityCatId: iss.issuepriorityCatId ? String(iss.issuepriorityCatId) : '',
          workflowStageId: iss.workflowStageId ? String(iss.workflowStageId) : '',
          inchargeEmpId: iss.inchargeEmpId ? String(iss.inchargeEmpId) : '',
          expectedResolvedOn: iss.expectedResolvedOn ?? '',
          statusComments: iss.statusComments ?? '',
          wfStatusComments: iss.wfStatusComments ?? '',
          closingComments: iss.closingComments ?? '',
          isMgmtApprovalReq: iss.isMgmtApprovalReq ?? false,
        })
        if (iss.collegeId) {
          listDepartmentsByCollege(iss.collegeId).then(setDepartments).catch(console.error)
          listActiveEmployeesByCollege(iss.collegeId).then(setEmployees).catch(console.error)
        }
      }
    }).catch(console.error).finally(() => setLoading(false))

    listColleges().then(setColleges).catch(console.error)
    listRooms().then(setRooms).catch(console.error)
    listWorkflowStages().then(setWorkflowStages).catch(console.error)
    listGeneralMasters().then(async masters => {
      const pm = masters.find(m => m.generalMasterCode === 'ISSUEPRIORITY')
      if (pm) setPriorities(await listGeneralDetailsByMasterId(pm.generalMasterId))
    }).catch(console.error)
  }, [id, reset])

  useEffect(() => {
    if (collegeId) {
      listDepartmentsByCollege(Number(collegeId)).then(setDepartments).catch(console.error)
      listActiveEmployeesByCollege(Number(collegeId)).then(setEmployees).catch(console.error)
    }
  }, [collegeId])

  async function onSubmit(values: FormValues) {
    if (!issue) return
    setSubmitError(null)
    try {
      const updated = await updateCampusIssue(issue.managementIssueId, {
        collegeId: Number(values.collegeId),
        departmentId: values.departmentId ? Number(values.departmentId) : undefined,
        issueInroomId: values.issueInroomId ? Number(values.issueInroomId) : undefined,
        issuepriorityCatId: values.issuepriorityCatId ? Number(values.issuepriorityCatId) : undefined,
        workflowStageId: values.workflowStageId ? Number(values.workflowStageId) : undefined,
        inchargeEmpId: values.inchargeEmpId ? Number(values.inchargeEmpId) : undefined,
        expectedResolvedOn: values.expectedResolvedOn,
        statusComments: values.statusComments ?? '',
        wfStatusComments: values.wfStatusComments,
        closingComments: values.closingComments,
        isMgmtApprovalReq: values.isMgmtApprovalReq,
      })
      if ((beforeFile || afterFile)) {
        await uploadIssueImages(issue.managementIssueId, beforeFile, afterFile)
      }
      router.back()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (loading) return <PageContainer><p className="p-6 text-muted-foreground">Loading…</p></PageContainer>
  if (!issue) return <PageContainer><p className="p-6 text-muted-foreground">Complaint not found.</p></PageContainer>

  const isClosed = issue.aprvrejstatusCatCode === 'CLOSED'

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="app-card-title">Complaint Details</h2>
        </div>
        <div className="p-5">
          {/* Raised by card */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-5 text-sm grid grid-cols-2 gap-2">
            <Detail label="Raised By" value={issue.raisedEmpName} />
            <Detail label="Employee No" value={issue.raisedEmpNumber} />
            <Detail label="Issue Title" value={issue.issueTitle} />
            <Detail label="Issue Date" value={issue.issueLogDate} />
            {issue.issueDescription && <Detail label="Description" value={issue.issueDescription} className="col-span-2" />}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="College *" error={errors.collegeId?.message}>
                <Controller name="collegeId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                    <SelectContent>{colleges.map(c => <SelectItem key={c.collegeId} value={String(c.collegeId)}>{c.collegeName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="Department">
                <Controller name="departmentId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!collegeId}>
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>{departments.map(d => <SelectItem key={d.departmentId} value={String(d.departmentId)}>{d.deptName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="Room">
                <Controller name="issueInroomId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>{rooms.map(r => <SelectItem key={r.roomId} value={String(r.roomId)}>{r.roomName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="Priority">
                <Controller name="issuepriorityCatId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>{priorities.map(p => <SelectItem key={p.generalDetailId} value={String(p.generalDetailId)}>{p.generalDetailDisplayName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="Workflow Stage">
                <Controller name="workflowStageId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                    <SelectContent>{workflowStages.map(w => <SelectItem key={w.workflowStageId} value={String(w.workflowStageId)}>{w.wfName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="In-Charge Employee">
                <Controller name="inchargeEmpId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map((e: any) => <SelectItem key={e.employeeId ?? e.empId} value={String(e.employeeId ?? e.empId)}>{e.empName ?? e.employeeName ?? String(e.employeeId)}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormGroup>
              <FormGroup label="Expected Resolution Date">
                <Input type="date" {...register('expectedResolvedOn')} />
              </FormGroup>
            </div>

            <FormGroup label="Status Comments">
              <Textarea {...register('statusComments')} rows={2} placeholder="Add status update" />
            </FormGroup>
            <FormGroup label="Workflow Comments">
              <Textarea {...register('wfStatusComments')} rows={2} placeholder="Workflow status notes" />
            </FormGroup>
            {isClosed && (
              <FormGroup label="Closing Comments">
                <Textarea {...register('closingComments')} rows={2} placeholder="Closing remarks" />
              </FormGroup>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Before Picture">
                <Input type="file" accept="image/*" onChange={e => setBeforeFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </FormGroup>
              <FormGroup label="After Picture">
                <Input type="file" accept="image/*" onChange={e => setAfterFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </FormGroup>
            </div>

            {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  )
}

function Detail({ label, value, className = '' }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  )
}

function FormGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

---

## Task 6: Complaint Status page

**Files:**
- Create: `src/app/(pages)/(protected)/campus-maintenance/complaint-status/page.tsx`

- [ ] **Step 1: Create Complaint Status page**

`complaint-status/page.tsx` — same structure as complaints-list but adds `collegeCode` column:
```tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssues } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { rowIndexGetter } from '@/lib/utils'
import ComplaintOverviewModal from '../complaints-list/ComplaintOverviewModal'

function statusVariant(code: string) {
  switch (code) {
    case 'INPROGRESS': return 'bg-blue-100 text-blue-700'
    case 'DONE':       return 'bg-green-100 text-green-700'
    case 'REJECTED':   return 'bg-red-100 text-red-700'
    case 'CLOSED':     return 'bg-gray-100 text-gray-600'
    default:           return 'bg-slate-100 text-slate-600'
  }
}

const COL_DEFS = {
  siNo:       { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CampusIssue>,
  issueTitle: { field: 'issueTitle', headerName: 'Complaint Title', minWidth: 180, flex: 1.8 } as ColDef<CampusIssue>,
  priority:   { field: 'issuepriorityCatDisplayName', headerName: 'Priority', minWidth: 100, flex: 0.8 } as ColDef<CampusIssue>,
  collegeCode:{ field: 'collegeCode', headerName: 'College Code', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  date:       { field: 'issueLogDate', headerName: 'Complaint Date', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  raisedBy:   { field: 'raisedEmpName', headerName: 'Raised By', minWidth: 140, flex: 1 } as ColDef<CampusIssue>,
  status:     { field: 'aprvrejstatusCatCode', headerName: 'Status', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  actions:    { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<CampusIssue>,
}

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const code = p.data?.aprvrejstatusCatCode ?? ''
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusVariant(code)}`}>{code}</span>
}

function makeActionsRenderer(onEdit: (i: CampusIssue) => void, onView: (i: CampusIssue) => void) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data; if (!issue) return null
    return issue.aprvrejstatusCatCode === 'CLOSED'
      ? <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(issue)}><Eye className="h-3.5 w-3.5" /></Button>
      : <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(issue)}><PencilIcon className="h-3.5 w-3.5" /></Button>
  }
}

export default function ComplaintStatusPage() {
  const router = useRouter()
  const [overviewIssue, setOverviewIssue] = useState<CampusIssue | null>(null)

  const { data: issues, isLoading, invalidate } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  })

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.issueTitle,
    COL_DEFS.priority,
    COL_DEFS.collegeCode,
    COL_DEFS.date,
    COL_DEFS.raisedBy,
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    {
      ...COL_DEFS.actions,
      cellRenderer: makeActionsRenderer(
        (i) => router.push(`/campus-maintenance/add-complaints?id=${i.managementIssueId}`),
        setOverviewIssue,
      ),
    },
  ], [router])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Complaint Status</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={issues}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search complaints…', pdfDocumentTitle: 'Complaint Status' }}
            />
          </div>
        </div>
      </div>
      <ComplaintOverviewModal
        open={overviewIssue !== null}
        onClose={() => setOverviewIssue(null)}
        issue={overviewIssue}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
```
