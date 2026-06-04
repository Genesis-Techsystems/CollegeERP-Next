'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createWorkflowStage,
  listActiveCollegesByOrganizationForWorkflowStages,
  listActiveOrganizationsForWorkflowStages,
  updateWorkflowStage,
} from '@/services'
import type { College } from '@/types/college'
import type { Organization } from '@/types/organization'
import type { WorkflowStage } from '@/types/workflow-stage'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  collegeId: z.number().min(1, 'College is required'),
  wfName: z.string().min(1, 'Workflow name is required'),
  wfCode: z.string().min(1, 'Workflow code is required'),
  wfStage: z.number().optional(),
  wfFor: z.string().optional(),
  wfForCode: z.string().min(1, 'Workflow for code is required'),
  wfStatus: z.string().optional(),
  availableFor: z.string().optional(),
  goBackPoint: z.boolean().optional(),
  isSelfAvailable: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function WorkflowStageModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: WorkflowStage | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      collegeId: undefined,
      wfName: '',
      wfCode: '',
      wfStage: 1,
      wfFor: '',
      wfForCode: '',
      wfStatus: '',
      availableFor: '',
      goBackPoint: false,
      isSelfAvailable: false,
      isActive: true,
      reason: '',
    },
  })

  const selectedOrganizationId = watch('organizationId')

  useEffect(() => {
    if (!open) return
    listActiveOrganizationsForWorkflowStages().then(setOrganizations).catch(console.error)
  }, [open])

  useEffect(() => {
    if (!selectedOrganizationId) {
      setColleges([])
      setValue('collegeId', undefined as unknown as number)
      return
    }
    listActiveCollegesByOrganizationForWorkflowStages(selectedOrganizationId)
      .then(setColleges)
      .catch(console.error)
  }, [selectedOrganizationId, setValue])

  useEffect(() => {
    if (row) {
      reset({
        organizationId: row.organizationId,
        collegeId: row.collegeId,
        wfName: row.wfName,
        wfCode: row.wfCode,
        wfStage: row.wfStage ?? 1,
        wfFor: row.wfFor ?? '',
        wfForCode: row.wfForCode,
        wfStatus: row.wfStatus ?? '',
        availableFor: row.availableFor ?? '',
        goBackPoint: row.goBackPoint ?? false,
        isSelfAvailable: row.isSelfAvailable ?? false,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        organizationId: undefined,
        collegeId: undefined,
        wfName: '',
        wfCode: '',
        wfStage: 1,
        wfFor: '',
        wfForCode: '',
        wfStatus: '',
        availableFor: '',
        goBackPoint: false,
        isSelfAvailable: false,
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [row, open, reset])

  const organizationOptions = useMemo(
    () => organizations.map((org) => ({ value: String(org.organizationId), label: org.orgCode ?? org.orgName })),
    [organizations],
  )
  const collegeOptions = useMemo(
    () => colleges.map((college) => ({ value: String(college.collegeId), label: college.collegeCode ?? college.collegeName })),
    [colleges],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateWorkflowStage(row!.workflowStageId, data)
      else await createWorkflowStage(data as Omit<WorkflowStage, 'workflowStageId'>)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save workflow stage')
    }
  }

  const dialogTitle = isEditing ? 'Edit Workflow Stage' : 'Add Workflow Stage'
  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  options={organizationOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  disabled={!selectedOrganizationId}
                  error={errors.collegeId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="wfName">Workflow Name *</Label>
              <Input id="wfName" {...register('wfName')} />
              {errors.wfName && <p className="text-xs text-red-500">{errors.wfName.message}</p>}
            </div>
            <div>
              <Label htmlFor="wfCode">Workflow Code *</Label>
              <Input id="wfCode" {...register('wfCode')} />
              {errors.wfCode && <p className="text-xs text-red-500">{errors.wfCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="wfStage">Workflow Stage</Label>
              <Input id="wfStage" type="number" {...register('wfStage', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="wfFor">Workflow For</Label>
              <Input id="wfFor" {...register('wfFor')} />
            </div>
            <div>
              <Label htmlFor="wfForCode">Workflow For Code *</Label>
              <Input id="wfForCode" {...register('wfForCode')} />
              {errors.wfForCode && <p className="text-xs text-red-500">{errors.wfForCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="wfStatus">Workflow Status</Label>
              <Input id="wfStatus" {...register('wfStatus')} />
            </div>
            <div>
              <Label htmlFor="availableFor">Available For</Label>
              <Input id="availableFor" {...register('availableFor')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Controller
              name="goBackPoint"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id="goBackPoint" checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                  <Label htmlFor="goBackPoint">Go Back Point</Label>
                </div>
              )}
            />
            <Controller
              name="isSelfAvailable"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id="isSelfAvailable" checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                  <Label htmlFor="isSelfAvailable">Self Available</Label>
                </div>
              )}
            />
          </div>

          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue('reason', value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
