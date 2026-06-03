'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createWorkflowMemberAuthorization,
  listActiveCollegesForWorkflowAuthorization,
  updateWorkflowMemberAuthorization,
} from '@/services'
import type { College } from '@/types/college'
import type { WorkflowMemberAuthorization } from '@/types/workflow-member-authorization'

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}, z.number().optional())

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  wfForCode: z.string().min(1, 'Workflow for code is required'),
  wfStage: z.number().min(1, 'Workflow stage is required'),
  assignmentType: z.enum(['role', 'employee']),
  roleId: optionalNumber,
  employeeDetailId: optionalNumber,
  storeId: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.assignmentType === 'role' && !(values.roleId && values.roleId > 0)) {
    ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'Role id is required' })
  }
  if (values.assignmentType === 'employee' && !(values.employeeDetailId && values.employeeDetailId > 0)) {
    ctx.addIssue({ code: 'custom', path: ['employeeDetailId'], message: 'Employee id is required' })
  }
})
type FormValues = z.infer<typeof schema>

export default function WorkflowMemberAuthorizationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: WorkflowMemberAuthorization | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    control,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId: undefined,
      wfForCode: '',
      wfStage: undefined,
      assignmentType: 'role',
      roleId: undefined,
      employeeDetailId: undefined,
      storeId: undefined,
      isActive: true,
      reason: '',
    },
  })

  const assignmentType = watch('assignmentType')

  useEffect(() => {
    if (!open) return
    listActiveCollegesForWorkflowAuthorization().then(setColleges).catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        wfForCode: row.wfForCode ?? '',
        wfStage: row.wfStage ? Number(row.wfStage) : undefined,
        assignmentType: row.roleId ? 'role' : 'employee',
        roleId: row.roleId ? Number(row.roleId) : undefined,
        employeeDetailId: row.employeeDetailId ? Number(row.employeeDetailId) : undefined,
        storeId: row.storeId ? Number(row.storeId) : undefined,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        collegeId: undefined,
        wfForCode: '',
        wfStage: undefined,
        assignmentType: 'role',
        roleId: undefined,
        employeeDetailId: undefined,
        storeId: undefined,
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [row, open, reset])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName })),
    [colleges],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    const payload = {
      collegeId: data.collegeId,
      wfForCode: data.wfForCode,
      wfStage: Number(data.wfStage),
      roleId: data.assignmentType === 'role' ? Number(data.roleId) : null,
      employeeDetailId: data.assignmentType === 'employee' ? Number(data.employeeDetailId) : null,
      storeId: data.storeId ? Number(data.storeId) : null,
      isActive: data.isActive,
      reason: data.reason ?? '',
    }
    try {
      if (isEditing) await updateWorkflowMemberAuthorization(row!.wfMemberAuthorizationId, payload)
      else await createWorkflowMemberAuthorization(payload as Omit<WorkflowMemberAuthorization, 'wfMemberAuthorizationId'>)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save workflow authorization')
    }
  }

  const dialogTitle = isEditing ? 'Edit Workflow Authorization' : 'Add Workflow Authorization'
  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
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
                error={errors.collegeId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="wfForCode">Workflow For Code *</Label>
              <Input id="wfForCode" {...register('wfForCode')} />
              {errors.wfForCode && <p className="text-xs text-red-500">{errors.wfForCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="wfStage">Workflow Stage *</Label>
              <Input id="wfStage" type="number" {...register('wfStage', { valueAsNumber: true })} />
              {errors.wfStage && <p className="text-xs text-red-500">{errors.wfStage.message}</p>}
            </div>
          </div>
          <Controller
            name="assignmentType"
            control={control}
            render={({ field }) => (
              <Select
                label="Assign By"
                required
                value={field.value}
                onChange={(value) => field.onChange(value ?? 'role')}
                options={[
                  { value: 'role', label: 'Role' },
                  { value: 'employee', label: 'Employee' },
                ]}
                error={errors.assignmentType?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="roleId">Role ID {assignmentType === 'role' ? '*' : ''}</Label>
              <Input
                id="roleId"
                type="number"
                disabled={assignmentType !== 'role'}
                {...register('roleId')}
              />
              {errors.roleId && <p className="text-xs text-red-500">{errors.roleId.message}</p>}
            </div>
            <div>
              <Label htmlFor="employeeDetailId">Employee ID {assignmentType === 'employee' ? '*' : ''}</Label>
              <Input
                id="employeeDetailId"
                type="number"
                disabled={assignmentType !== 'employee'}
                {...register('employeeDetailId')}
              />
              {errors.employeeDetailId && <p className="text-xs text-red-500">{errors.employeeDetailId.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="storeId">Store ID</Label>
            <Input id="storeId" type="number" {...register('storeId')} />
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
