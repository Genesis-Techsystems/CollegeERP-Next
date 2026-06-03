'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBuilding, listActiveCampuses, updateBuilding } from '@/services'
import type { Building } from '@/types/building'
import type { Campus } from '@/types/campus'

const schema = z.object({
  organizationId: z.number().optional(),
  campusId: z.number().min(1, 'Campus is required'),
  buildingName: z.string().min(1, 'Building name is required'),
  buildingCode: z.string().min(1, 'Building code is required'),
  landMark: z.string().optional(),
  noOfFloors: z.preprocess(
    (value) => (value === '' || value == null || Number.isNaN(value) ? undefined : value),
    z.number().min(0, 'No. of floors cannot be negative').optional(),
  ),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface BuildingModalProps {
  open: boolean
  onClose: () => void
  building: Building | null
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function BuildingModal({ open, onClose, building, onSaved }: Readonly<BuildingModalProps>) {
  const isEditing = building != null
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      organizationId: undefined,
      campusId: undefined,
      buildingName: '',
      buildingCode: '',
      landMark: '',
      noOfFloors: undefined,
      isActive: true,
      reason: '',
    },
  })

  const campusOptions = useMemo(() => asOptions(campuses, (r) => r.campusId, (r) => r.campusName), [campuses])

  useEffect(() => {
    if (!open) return
    listActiveCampuses().then(setCampuses).catch(console.error)
  }, [open])

  useEffect(() => {
    if (building) {
      reset({
        organizationId: building.organizationId,
        campusId: building.campusId,
        buildingName: building.buildingName,
        buildingCode: building.buildingCode,
        landMark: building.landMark ?? '',
        noOfFloors: building.noOfFloors ?? undefined,
        isActive: building.isActive,
        reason: building.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [building, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const selectedCampus = campuses.find((campus) => campus.campusId === data.campusId)
      if (!selectedCampus) {
        setSubmitError('Please select a valid campus')
        return
      }

      const payload: Omit<Building, 'buildingId'> = {
        ...data,
        organizationId: selectedCampus.organizationId,
      }

      if (isEditing) {
        await updateBuilding(building!.buildingId, payload)
      } else {
        await createBuilding(payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save building')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Building' : 'Add Building'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Campus"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={campusOptions}
                  placeholder="Select campus"
                  searchable
                  error={errors.campusId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="buildingName">Building Name *</Label>
              <Input id="buildingName" {...register('buildingName')} />
              {errors.buildingName && <p className="text-xs text-red-500">{errors.buildingName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="buildingCode">Building Code *</Label>
              <Input id="buildingCode" {...register('buildingCode')} />
              {errors.buildingCode && <p className="text-xs text-red-500">{errors.buildingCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="landMark">Land Mark</Label>
              <Input id="landMark" {...register('landMark')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="noOfFloors">No. of Floors</Label>
              <Input
                id="noOfFloors"
                type="number"
                min={0}
                {...register('noOfFloors', { valueAsNumber: true })}
              />
              {errors.noOfFloors && <p className="text-xs text-red-500">{errors.noOfFloors.message}</p>}
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

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
