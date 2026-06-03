'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  collegeId: z.string().min(1, 'College is required'),
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Detail({
  label,
  value,
  className = '',
}: {
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

function FormGroup({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function AddComplaintsInner() {
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
  const [employees, setEmployees] = useState<Array<Record<string, unknown>>>([])
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const collegeId = watch('collegeId')

  // Load static lookup data
  useEffect(() => {
    listColleges().then(setColleges).catch(console.error)
    listRooms().then(setRooms).catch(console.error)
    listWorkflowStages().then(setWorkflowStages).catch(console.error)
    listGeneralMasters()
      .then(async (masters) => {
        const pm = masters.find((m) =>
          m.generalMasterCode === 'ISSUEPRIORITY' || m.generalMasterCode === 'PRIORITY',
        )
        if (pm?.generalMasterId) {
          const details = await listGeneralDetailsByMasterId(pm.generalMasterId)
          setPriorities(details)
        }
      })
      .catch(console.error)
  }, [])

  // Load issue data
  useEffect(() => {
    if (!id) { setLoading(false); return }
    getCampusIssue(Number(id))
      .then((iss) => {
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
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, reset])

  // Cascade departments + employees when college changes
  useEffect(() => {
    const cid = collegeId ? Number(collegeId) : null
    if (!cid) return
    listDepartmentsByCollege(cid).then(setDepartments).catch(console.error)
    listActiveEmployeesByCollege(cid).then(setEmployees).catch(console.error)
  }, [collegeId])

  async function onSubmit(values: FormValues) {
    if (!issue) return
    setSubmitError(null)
    try {
      await updateCampusIssue(issue.managementIssueId, {
        collegeId: Number(values.collegeId),
        departmentId: values.departmentId ? Number(values.departmentId) : undefined,
        issueInroomId: values.issueInroomId ? Number(values.issueInroomId) : undefined,
        issuepriorityCatId: values.issuepriorityCatId
          ? Number(values.issuepriorityCatId)
          : undefined,
        workflowStageId: values.workflowStageId ? Number(values.workflowStageId) : undefined,
        inchargeEmpId: values.inchargeEmpId ? Number(values.inchargeEmpId) : undefined,
        expectedResolvedOn: values.expectedResolvedOn,
        statusComments: values.statusComments ?? '',
        wfStatusComments: values.wfStatusComments,
        closingComments: values.closingComments,
        isMgmtApprovalReq: values.isMgmtApprovalReq,
      })
      if (beforeFile || afterFile) {
        await uploadIssueImages(issue.managementIssueId, beforeFile, afterFile)
      }
      router.back()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save complaint')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <p className="p-6 text-muted-foreground text-sm">Loading complaint…</p>
      </PageContainer>
    )
  }

  if (!issue) {
    return (
      <PageContainer>
        <p className="p-6 text-muted-foreground text-sm">Complaint not found.</p>
      </PageContainer>
    )
  }

  const isClosed = issue.aprvrejstatusCatCode === 'CLOSED'

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="app-card-title">Complaint Details</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Raised-by info card */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 grid grid-cols-2 gap-3 text-sm">
            <Detail label="Raised By" value={issue.raisedEmpName} />
            <Detail label="Employee No" value={issue.raisedEmpNumber} />
            <Detail label="Issue Title" value={issue.issueTitle} />
            <Detail label="Issue Date" value={issue.issueLogDate} />
            {issue.issueDescription && (
              <Detail label="Description" value={issue.issueDescription} className="col-span-2" />
            )}
            {issue.location && (
              <Detail label="Location" value={issue.location} className="col-span-2" />
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="College *" error={errors.collegeId?.message}>
                <Controller
                  name="collegeId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                      <SelectContent>
                        {colleges.map((c) => (
                          <SelectItem key={c.collegeId} value={String(c.collegeId)}>
                            {c.collegeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="Department">
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={!collegeId || departments.length === 0}
                    >
                      <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                            {d.deptName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="Room">
                <Controller
                  name="issueInroomId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((r) => (
                          <SelectItem key={r.roomId} value={String(r.roomId)}>
                            {r.roomName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="Priority">
                <Controller
                  name="issuepriorityCatId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem
                            key={p.generalDetailId}
                            value={String(p.generalDetailId)}
                          >
                            {p.generalDetailDisplayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="Workflow Stage">
                <Controller
                  name="workflowStageId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>
                        {workflowStages.map((w) => (
                          <SelectItem key={w.workflowStageId} value={String(w.workflowStageId)}>
                            {w.wfName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="In-Charge Employee">
                <Controller
                  name="inchargeEmpId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={employees.length === 0}
                    >
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => {
                          const empId = String(e.employeeId ?? e.empId ?? '')
                          const empName = String(
                            e.empName ?? e.employeeName ?? e.name ?? empId,
                          )
                          return (
                            <SelectItem key={empId} value={empId}>
                              {empName}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormGroup>

              <FormGroup label="Expected Resolution Date">
                <Input type="date" {...register('expectedResolvedOn')} />
              </FormGroup>
            </div>

            <FormGroup label="Status Comments">
              <Textarea
                {...register('statusComments')}
                rows={2}
                placeholder="Add a status update note"
              />
            </FormGroup>

            <FormGroup label="Workflow Comments">
              <Textarea
                {...register('wfStatusComments')}
                rows={2}
                placeholder="Workflow status notes"
              />
            </FormGroup>

            {isClosed && (
              <FormGroup label="Closing Comments">
                <Textarea
                  {...register('closingComments')}
                  rows={2}
                  placeholder="Remarks on closing this complaint"
                />
              </FormGroup>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Before Picture">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </FormGroup>
              <FormGroup label="After Picture">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </FormGroup>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  )
}

// ─── Page export (wraps Suspense for useSearchParams) ─────────────────────────

export default function AddComplaintsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="p-6 text-muted-foreground text-sm">Loading…</p>
        </PageContainer>
      }
    >
      <AddComplaintsInner />
    </Suspense>
  )
}
