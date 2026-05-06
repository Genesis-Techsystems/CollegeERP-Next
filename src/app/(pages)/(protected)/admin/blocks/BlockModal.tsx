'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createBlock,
  listActiveBuildings,
  updateBlock,
} from '@/services'
import type { Block } from '@/types/block'
import type { Building } from '@/types/building'

const schema = z.object({
  campusId: z.number().optional(),
  buildingId: z.number().min(1, 'Building is required'),
  blockName: z.string().min(1, 'Block name is required'),
  blockCode: z.string().min(1, 'Block code is required'),
  noOfFloors: z.preprocess(
    (value) => (value === '' || value == null || Number.isNaN(value) ? undefined : value),
    z.number().min(0, 'No. of floors cannot be negative').optional(),
  ),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface BlockModalProps {
  open: boolean
  onClose: () => void
  block: Block | null
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function BlockModal({ open, onClose, block, onSaved }: Readonly<BlockModalProps>) {
  const isEditing = block != null
  const [buildings, setBuildings] = useState<Building[]>([])
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
    resolver: zodResolver(schema),
    defaultValues: {
      campusId: undefined,
      buildingId: undefined,
      blockName: '',
      blockCode: '',
      noOfFloors: undefined,
      isActive: true,
      reason: '',
    },
  })

  const buildingOptions = useMemo(
    () => asOptions(buildings, (r) => r.buildingId, (r) => `${r.buildingCode ?? ''} - ${r.buildingName}`.trim()),
    [buildings],
  )

  useEffect(() => {
    if (!open) return
    listActiveBuildings().then(setBuildings).catch(console.error)
  }, [open])

  useEffect(() => {
    if (block) {
      reset({
        campusId: block.campusId,
        buildingId: block.buildingId,
        blockName: block.blockName,
        blockCode: block.blockCode,
        noOfFloors: block.noOfFloors ?? undefined,
        isActive: block.isActive,
        reason: block.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [block, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const selectedBuilding = buildings.find((building) => building.buildingId === data.buildingId)
      if (!selectedBuilding) {
        setSubmitError('Please select a valid building')
        return
      }

      const payload: Omit<Block, 'blockId'> = {
        ...data,
        campusId: selectedBuilding.campusId,
      }

      if (isEditing) {
        await updateBlock(block!.blockId, payload)
      } else {
        await createBlock(payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save block')
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
            {isEditing ? 'Edit Block' : 'Add Block'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="buildingId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Building"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={buildingOptions}
                  placeholder="Select building"
                  searchable
                  error={errors.buildingId?.message}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label htmlFor="blockName">Block Name *</Label>
              <Input id="blockName" {...register('blockName')} />
              {errors.blockName && <p className="text-xs text-red-500">{errors.blockName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="blockCode">Block Code *</Label>
              <Input id="blockCode" {...register('blockCode')} />
              {errors.blockCode && <p className="text-xs text-red-500">{errors.blockCode.message}</p>}
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
