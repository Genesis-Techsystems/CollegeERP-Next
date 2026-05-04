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
import { createCaste, listActiveOrganizationsForCastes, updateCaste } from '@/services'
import type { Caste } from '@/types/caste'
import type { Organization } from '@/types/organization'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  caste: z.string().min(1, 'Caste is required'),
  sortOrder: z.number().min(0, 'Sort order is required'),
  isEligibleForReservation: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CasteModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Caste | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      caste: '',
      sortOrder: 0,
      isEligibleForReservation: false,
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => { if (open) listActiveOrganizationsForCastes().then(setOrganizations).catch(console.error) }, [open])
  useEffect(() => {
    if (row) {
      reset({
        organizationId: row.organizationId,
        caste: row.caste,
        sortOrder: row.sortOrder ?? 0,
        isEligibleForReservation: row.isEligibleForReservation,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else reset()
    setSubmitError(null)
  }, [row, open, reset])

  const orgOptions = useMemo(
    () => organizations.map((org) => ({ value: String(org.organizationId), label: org.orgCode ?? org.orgName })),
    [organizations],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateCaste(row!.casteId, data)
      else await createCaste(data)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save caste')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Caste' : 'Add Caste'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                options={orgOptions}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="caste">Caste *</Label><Input id="caste" {...register('caste')} />{errors.caste && <p className="text-xs text-red-500">{errors.caste.message}</p>}</div>
            <div><Label htmlFor="sortOrder">Sort Order *</Label><Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />{errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}</div>
          </div>
          <Controller
            name="isEligibleForReservation"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} id="isEligibleForReservation" />
                <Label htmlFor="isEligibleForReservation">Eligible For Reservation</Label>
              </div>
            )}
          />
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
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
