'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDepartment, listActiveCollegesForDepartments, updateDepartment } from '@/services'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  deptName: z.string().min(1, 'Department name is required'),
  deptCode: z.string().min(1, 'Department code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function DepartmentModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Department | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
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
      collegeId: undefined,
      deptName: '',
      deptCode: '',
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => {
    if (!open) return
    listActiveCollegesForDepartments().then(setColleges).catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        deptName: row.deptName,
        deptCode: row.deptCode,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        collegeId: undefined,
        deptName: '',
        deptCode: '',
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [open, row, reset])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName })),
    [colleges],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateDepartment(row!.departmentId, data)
      else await createDepartment(data)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save department')
    }
  }

  const dialogTitle = isEditing ? 'Edit Department' : 'Add Department'
  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="deptName">Department Name *</Label>
              <Input id="deptName" {...register('deptName')} />
              {errors.deptName && <p className="text-xs text-red-500">{errors.deptName.message}</p>}
            </div>
            <div>
              <Label htmlFor="deptCode">Department Code *</Label>
              <Input id="deptCode" {...register('deptCode')} />
              {errors.deptCode && <p className="text-xs text-red-500">{errors.deptCode.message}</p>}
            </div>
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
