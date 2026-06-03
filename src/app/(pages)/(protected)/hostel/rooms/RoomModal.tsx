'use client'

import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createHostelRoom, listHostelRoomTypeOptions, updateHostelRoom } from '@/services'
import type { HostelRoom } from '@/types/hostel'
import { toastError, toastSuccess } from '@/lib/toast'
import { useQuery } from '@tanstack/react-query'
import {
  HOSTEL_FIELD_LABEL_CLASS,
  HOSTEL_INPUT_CLASS,
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from '../_lib/modal-styles'

const schema = z.object({
  floorName: z.string().min(1, 'Floor name is required'),
  floorNo: z.coerce.number().min(0),
  roomNumber: z.string().min(1, 'Room number is required'),
  noOfBeds: z.coerce.number().min(1),
  roomTypeId: z.coerce.number().min(1, 'Room type is required'),
  amount: z.coerce.number().min(0),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RoomModalProps {
  open: boolean
  onClose: () => void
  row: HostelRoom | null
  hostelId: number
  onSaved: () => void
}

export function RoomModal({ open, onClose, row, hostelId, onSaved }: Readonly<RoomModalProps>) {
  const isEditing = row != null
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { isActive: true, reason: 'active' },
  })

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['Hostel', 'roomTypes'],
    queryFn: listHostelRoomTypeOptions,
    enabled: open,
  })

  const roomTypeOptions = roomTypes.map((r) => ({
    value: String(r.generalDetailId),
    label: r.generalDetailName ?? r.generalDetailCode ?? String(r.generalDetailId),
  }))

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            floorName: row.floorName ?? '',
            floorNo: Number(row.floorNo ?? 0),
            roomNumber: row.roomNumber ?? '',
            noOfBeds: row.noOfBeds ?? 1,
            roomTypeId: row.roomTypeId ?? 0,
            amount: row.amount ?? 0,
            isActive: row.isActive ?? true,
            reason: 'active',
          }
        : { isActive: true, reason: 'active', noOfBeds: 1, floorNo: 0, amount: 0 },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        hostelId,
        reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
      }
      if (isEditing && row) {
        await updateHostelRoom(row.hstlRoomId, payload)
        toastSuccess('Room updated')
      } else {
        await createHostelRoom(payload)
        toastSuccess('Room created')
      }
      onSaved()
      onClose()
    } catch (e) {
      toastError(e, isEditing ? 'Update failed' : 'Create failed')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Room' : 'Add Room'}
      titleClassName={HOSTEL_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Floor name</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('floorName')} />
            {errors.floorName ? (
              <p className="text-xs text-destructive">{errors.floorName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Floor no</Label>
            <Input type="number" className={HOSTEL_INPUT_CLASS} {...register('floorNo')} />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Room number</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('roomNumber')} />
            {errors.roomNumber ? (
              <p className="text-xs text-destructive">{errors.roomNumber.message}</p>
            ) : null}
          </div>
          <Controller
            name="roomTypeId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Room type"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={roomTypeOptions}
                error={errors.roomTypeId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>No. of beds</Label>
            <Input type="number" className={HOSTEL_INPUT_CLASS} {...register('noOfBeds')} />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Amount</Label>
            <Input type="number" className={HOSTEL_INPUT_CLASS} {...register('amount')} />
          </div>
          <div className="md:col-span-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(v) => setValue('reason', v)}
                />
              )}
            />
          </div>
        </div>
      </div>
    </FormModal>
  )
}
