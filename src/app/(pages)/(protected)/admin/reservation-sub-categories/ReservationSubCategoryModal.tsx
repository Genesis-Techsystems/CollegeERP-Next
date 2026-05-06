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
import { createSubCaste, listActiveCastesForSubCastes, updateSubCaste } from '@/services'
import type { Caste } from '@/types/caste'
import type { SubCaste } from '@/types/sub-caste'

const schema = z.object({
  casteId: z.number().min(1, 'Reservation category is required'),
  subCaste: z.string().min(1, 'Sub reservation category is required'),
  isEligibleForReservation: z.boolean(),
  sortOrder: z.number().min(0, 'Sort order is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function ReservationSubCategoryModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: SubCaste | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [castes, setCastes] = useState<Caste[]>([])
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
      casteId: undefined,
      subCaste: '',
      isEligibleForReservation: false,
      sortOrder: 0,
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => {
    if (!open) return
    listActiveCastesForSubCastes().then(setCastes).catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        casteId: row.casteId,
        subCaste: row.subCaste,
        isEligibleForReservation: row.isEligibleForReservation,
        sortOrder: row.sortOrder ?? 0,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        casteId: undefined,
        subCaste: '',
        isEligibleForReservation: false,
        sortOrder: 0,
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [open, row, reset])

  const casteOptions = useMemo(
    () => castes.map((caste) => ({ value: String(caste.casteId), label: caste.caste })),
    [castes],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateSubCaste(row!.subCasteId, data)
      else await createSubCaste(data)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save reservation sub category')
    }
  }

  const dialogTitle = isEditing ? 'Edit Sub Reservation Category' : 'Add Sub Reservation Category'
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
            name="casteId"
            control={control}
            render={({ field }) => (
              <Select
                label="Reservation Category"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                options={casteOptions}
                placeholder="Select reservation category"
                searchable
                error={errors.casteId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="subCaste">Sub Reservation Category *</Label>
              <Input id="subCaste" {...register('subCaste')} />
              {errors.subCaste && <p className="text-xs text-red-500">{errors.subCaste.message}</p>}
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order *</Label>
              <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
              {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}
            </div>
          </div>
          <Controller
            name="isEligibleForReservation"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  id="isEligibleForReservation"
                />
                <Label htmlFor="isEligibleForReservation">Eligible For Reservation</Label>
              </div>
            )}
          />
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
