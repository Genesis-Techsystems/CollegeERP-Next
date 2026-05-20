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
import { createQualification, listActiveOrganizationsForQualifications, updateQualification } from '@/services'
import type { Organization } from '@/types/organization'
import type { Qualification } from '@/types/qualification'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  qualificationName: z.string().min(1, 'Qualification name is required'),
  qualificationCode: z.string().min(1, 'Qualification code is required'),
  sortOrder: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function QualificationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Qualification | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [organizations, setOrganizations] = useState<Organization[]>([])
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
      qualificationName: '',
      qualificationCode: '',
      sortOrder: 0,
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => {
    if (!open) return
    listActiveOrganizationsForQualifications().then(setOrganizations).catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        organizationId: row.organizationId,
        qualificationName: row.qualificationName,
        qualificationCode: row.qualificationCode,
        sortOrder: row.sortOrder ?? 0,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        organizationId: undefined,
        qualificationName: '',
        qualificationCode: '',
        sortOrder: 0,
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

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateQualification(row!.qualificationId, data)
      else await createQualification(data as Omit<Qualification, 'qualificationId'>)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save qualification')
    }
  }

  const dialogTitle = isEditing ? 'Edit Qualification' : 'Add Qualification'
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qualificationCode">Qualification Code *</Label>
              <Input id="qualificationCode" {...register('qualificationCode')} />
              {errors.qualificationCode && <p className="text-xs text-red-500">{errors.qualificationCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="qualificationName">Qualification Name *</Label>
              <Input id="qualificationName" {...register('qualificationName')} />
              {errors.qualificationName && <p className="text-xs text-red-500">{errors.qualificationName.message}</p>}
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
