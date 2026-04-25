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
import { createRoomType, listActiveOrganizations, updateRoomType } from '@/services'
import type { Organization } from '@/types/organization'
import type { RoomType } from '@/types/room-type'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
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
        reason: roomType.reason ?? '',
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
        await updateRoomType(roomType.roomTypeId, data)
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto pt-3">
        <DialogHeader className="space-y-0 pr-8 pt-0">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Room Type' : 'Add Room Type'}
          </DialogTitle>
          <div className="-mx-6 mt-2 border-b border-slate-200" />
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            <div className="space-y-0.5">
              <Label htmlFor="roomType">Room Type *</Label>
              <Input id="roomType" {...register('roomType')} />
              {errors.roomType && <p className="text-xs text-red-500">{errors.roomType.message}</p>}
            </div>
          </div>

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
