'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField, FormField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createRoomType, listActiveOrganizations, updateRoomType } from '@/services'
import type { Organization } from '@/types/organization'
import type { RoomType } from '@/types/room-type'
import { requiredNumber } from '@/lib/zod-fields'

const INPUT_CLASS =
  'min-h-9 placeholder:text-muted-foreground placeholder:opacity-100'

const schema = z.object({
  organizationId: requiredNumber('Organization is required'),
  roomType: z.string().min(1, 'Room type is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RoomTypeModalProps {
  open: boolean
  onClose: () => void
  roomType: RoomType | null
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function RoomTypeModal({ open, onClose, roomType, onSaved }: Readonly<RoomTypeModalProps>) {
  const isEditing = roomType != null
  const [organizations, setOrganizations] = useState<Organization[]>([])
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
      organizationId: undefined,
      roomType: '',
      isActive: true,
      reason: '',
    },
  })

  const organizationOptions = useMemo(
    () => asOptions(organizations, (r) => r.organizationId, (r) => r.orgCode ?? r.orgName),
    [organizations],
  )

  useEffect(() => {
    if (!open) return
    listActiveOrganizations().then(setOrganizations).catch(console.error)
  }, [open])

  useEffect(() => {
    if (roomType) {
      reset({
        organizationId: roomType.organizationId,
        roomType: roomType.roomType,
        isActive: roomType.isActive,
        reason: roomType.isActive ? '' : (roomType.reason ?? ''),
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [roomType, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) {
        await updateRoomType(roomType.roomTypeId, data, roomType)
      } else {
        await createRoomType(data)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save room type')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Room Type' : 'Add Room Type'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={organizationOptions}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />

          <FormField label="Room Type" required htmlFor="roomType" error={errors.roomType?.message}>
            <Input
              id="roomType"
              className={INPUT_CLASS}
              placeholder="Enter room type"
              {...register('roomType')}
            />
          </FormField>

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

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-end">
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
