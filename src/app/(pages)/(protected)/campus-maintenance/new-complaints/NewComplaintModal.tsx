'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  issueLogDate: z.string().min(1, 'Date is required'),
  collegeId: z.string().min(1, 'College is required'),
  departmentId: z.string().optional(),
  issueInroomId: z.string().optional(),
  serviceCatId: z.string().optional(),
  issueTitle: z.string().min(1, 'Title is required'),
  issueDescription: z.string().optional(),
  location: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getDefaults(): FormValues {
  return {
    issueLogDate: getToday(),
    collegeId: '',
    departmentId: '',
    issueInroomId: '',
    serviceCatId: '',
    issueTitle: '',
    issueDescription: '',
    location: '',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: CampusIssue | null
  viewMode: boolean
  raisedEmpId: number
  onSaved: () => void
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="col-span-2 text-sm">{value ?? '—'}</span>
    </div>
  )
}

export default function NewComplaintModal({
  open,
  onClose,
  editData,
  viewMode,
  raisedEmpId,
  onSaved,
}: Props) {
  const [colleges, setColleges] = useState<College[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [serviceTypes, setServiceTypes] = useState<GeneralMasterDetail[]>([])
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!open) return
    listColleges().then(setColleges).catch(console.error)
    listRooms().then(setRooms).catch(console.error)
    listGeneralMasters()
      .then(async (masters) => {
        const master = masters.find((m) => m.generalMasterCode === 'CMPLT')
        if (master?.generalMasterId) {
          const details = await listGeneralDetailsByMasterId(master.generalMasterId)
          setServiceTypes(details)
        }
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (collegeId) {
      listDepartmentsByCollege(Number(collegeId)).then(setDepartments).catch(console.error)
    } else {
      setDepartments([])
    }
  }, [collegeId])

  useEffect(() => {
    reset(getDefaults())
    setBeforeFile(null)
    setAfterFile(null)
    setSubmitError(null)
  }, [open, reset])

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
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit complaint')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {viewMode ? 'Complaint Details' : 'New Complaint'}
          </DialogTitle>
        </DialogHeader>

        {viewMode && editData ? (
          <>
            <div className="space-y-2.5 py-2">
              <Row label="College" value={editData.collegeName} />
              {editData.deptName && <Row label="Department" value={editData.deptName} />}
              {editData.issueInroomName && <Row label="Room" value={editData.issueInroomName} />}
              <Row label="Title" value={editData.issueTitle} />
              <Row label="Description" value={editData.issueDescription} />
              {editData.wfStatusComments && (
                <Row label="Workflow Comments" value={editData.wfStatusComments} />
              )}
              {editData.closedEmpName && <Row label="Closed By" value={editData.closedEmpName} />}
              {editData.closingComments && (
                <Row label="Closing Comments" value={editData.closingComments} />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Complaint Date *</Label>
              <Input type="date" {...register('issueLogDate')} />
              {errors.issueLogDate && (
                <p className="text-xs text-red-500">{errors.issueLogDate.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>College *</Label>
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
              {errors.collegeId && (
                <p className="text-xs text-red-500">{errors.collegeId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Department</Label>
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
              </div>
              <div className="space-y-1">
                <Label>Room</Label>
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
              </div>
            </div>

            <div className="space-y-1">
              <Label>Service Type</Label>
              <Controller
                name="serviceCatId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((s) => (
                        <SelectItem
                          key={s.generalDetailId}
                          value={String(s.generalDetailId)}
                        >
                          {s.generalDetailDisplayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1">
              <Label>Issue Title *</Label>
              <Input {...register('issueTitle')} placeholder="Brief title of the issue" />
              {errors.issueTitle && (
                <p className="text-xs text-red-500">{errors.issueTitle.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                {...register('issueDescription')}
                placeholder="Describe the issue in detail"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label>Location</Label>
              <Input {...register('location')} placeholder="Exact location of the issue" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Before Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">After Picture</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit Complaint'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
