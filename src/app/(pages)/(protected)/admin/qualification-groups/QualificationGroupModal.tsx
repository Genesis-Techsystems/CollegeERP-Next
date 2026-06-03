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
import {
  createQualificationGroup,
  listActiveQualificationsForGroups,
  updateQualificationGroup,
} from '@/services'
import type { Qualification } from '@/types/qualification'
import type { QualificationGroup } from '@/types/qualification-group'

const schema = z.object({
  qualificationId: z.number().min(1, 'Qualification is required'),
  qualificationGroupName: z.string().min(1, 'Qualification group name is required'),
  qualificationGroupCode: z.string().min(1, 'Qualification group code is required'),
  sortOrder: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function QualificationGroupModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: QualificationGroup | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [qualifications, setQualifications] = useState<Qualification[]>([])
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
      qualificationId: undefined,
      qualificationGroupName: '',
      qualificationGroupCode: '',
      sortOrder: 0,
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => {
    if (!open) return
    listActiveQualificationsForGroups().then(setQualifications).catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        qualificationId: row.qualificationId,
        qualificationGroupName: row.qualificationGroupName,
        qualificationGroupCode: row.qualificationGroupCode,
        sortOrder: row.sortOrder ?? 0,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        qualificationId: undefined,
        qualificationGroupName: '',
        qualificationGroupCode: '',
        sortOrder: 0,
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [row, open, reset])

  const qualificationOptions = useMemo(
    () => qualifications.map((q) => ({
      value: String(q.qualificationId),
      label: `${q.qualificationCode} - ${q.qualificationName}`,
    })),
    [qualifications],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateQualificationGroup(row!.qualificationGroupId, data)
      else await createQualificationGroup(data as Omit<QualificationGroup, 'qualificationGroupId'>)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save qualification group')
    }
  }

  const dialogTitle = isEditing ? 'Edit Qualification Group' : 'Add Qualification Group'
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
            name="qualificationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Qualification"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                options={qualificationOptions}
                placeholder="Select qualification"
                searchable
                error={errors.qualificationId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qualificationGroupCode">Qualification Group Code *</Label>
              <Input id="qualificationGroupCode" {...register('qualificationGroupCode')} />
              {errors.qualificationGroupCode && <p className="text-xs text-red-500">{errors.qualificationGroupCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="qualificationGroupName">Qualification Group Name *</Label>
              <Input id="qualificationGroupName" {...register('qualificationGroupName')} />
              {errors.qualificationGroupName && <p className="text-xs text-red-500">{errors.qualificationGroupName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
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
