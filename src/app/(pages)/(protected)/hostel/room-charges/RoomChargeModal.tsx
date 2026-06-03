'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import {
  createHostelRoomCharge,
  listHostelRoomTypeOptions,
  listHostelsByOrganization,
  listOrganizations,
  listPaymentFrequencyOptions,
  toHostelApiDate,
  updateHostelRoomCharge,
} from '@/services'
import type { HostelRoomCharge } from '@/types/hostel'
import { toastError, toastSuccess } from '@/lib/toast'
import { useQuery } from '@tanstack/react-query'
import {
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from '../_lib/modal-styles'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  hostelId: z.coerce.number().min(1, 'Hostel is required'),
  roomTypeCatdetId: z.coerce.number().min(1, 'Room type is required'),
  paymentFrequencyCatdetId: z.coerce.number().min(1, 'Payment frequency is required'),
  fromDate: z.date().nullable(),
  toDate: z.date().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RoomChargeModalProps {
  open: boolean
  onClose: () => void
  row: HostelRoomCharge | null
  onSaved: () => void
}

export function RoomChargeModal({ open, onClose, row, onSaved }: Readonly<RoomChargeModalProps>) {
  const isEditing = row != null
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, reason: 'active', fromDate: new Date(), toDate: new Date() },
  })

  const organizationId = watch('organizationId')

  const { data: orgs = [] } = useQuery({
    queryKey: ['Hostel', 'organizations'],
    queryFn: listOrganizations,
    enabled: open,
  })
  const { data: roomTypes = [] } = useQuery({
    queryKey: ['Hostel', 'roomTypes'],
    queryFn: listHostelRoomTypeOptions,
    enabled: open,
  })
  const { data: freqOptions = [] } = useQuery({
    queryKey: ['Hostel', 'paymentFreq'],
    queryFn: listPaymentFrequencyOptions,
    enabled: open,
  })

  const [hostelOptions, setHostelOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!organizationId) {
      setHostelOptions([])
      return
    }
    void listHostelsByOrganization(organizationId).then((rows) => {
      setHostelOptions(
        rows.map((h) => ({
          value: String(h.hostelId),
          label: `${h.hostelCode ?? ''} — ${h.hostelName ?? ''}`.trim(),
        })),
      )
    })
  }, [organizationId])

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId ?? 0,
            hostelId: row.hostelId,
            roomTypeCatdetId: row.roomTypeCatdetId ?? 0,
            paymentFrequencyCatdetId: row.paymentFrequencyCatdetId ?? 0,
            fromDate: row.fromDate ? new Date(row.fromDate) : new Date(),
            toDate: row.toDate ? new Date(row.toDate) : new Date(),
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active', fromDate: new Date(), toDate: new Date() },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        ...data,
        fromDate: toHostelApiDate(data.fromDate),
        toDate: toHostelApiDate(data.toDate),
        reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
      }
      if (isEditing && row) {
        await updateHostelRoomCharge(row.hstlRoomChargesId, payload)
        toastSuccess('Room charge updated')
      } else {
        await createHostelRoomCharge(payload)
        toastSuccess('Room charge created')
      }
      onSaved()
      onClose()
    } catch (e) {
      toastError(e, isEditing ? 'Update failed' : 'Create failed')
    }
  }

  const orgOptions = orgs
    .filter((o) => o.isActive !== false)
    .map((o) => ({
      value: String(o.organizationId),
      label: o.orgCode ?? o.orgName ?? String(o.organizationId),
    }))
  const rtOptions = roomTypes.map((r) => ({
    value: String(r.generalDetailId),
    label: r.generalDetailName ?? r.generalDetailCode ?? '',
  }))
  const pfOptions = freqOptions.map((r) => ({
    value: String(r.generalDetailId),
    label: r.generalDetailName ?? r.generalDetailCode ?? '',
  }))

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Room Charges' : 'Add Room Charges'}
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
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : 0)
                  setValue('hostelId', 0)
                }}
                options={orgOptions}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <Controller
            name="hostelId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Hostel"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={hostelOptions}
                disabled={!organizationId}
                error={errors.hostelId?.message}
              />
            )}
          />
          <Controller
            name="roomTypeCatdetId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Room type"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={rtOptions}
                error={errors.roomTypeCatdetId?.message}
              />
            )}
          />
          <Controller
            name="paymentFrequencyCatdetId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Payment frequency"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={pfOptions}
                error={errors.paymentFrequencyCatdetId?.message}
              />
            )}
          />
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="From date" value={field.value} onChange={field.onChange} />
            )}
          />
          <Controller
            name="toDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="To date" value={field.value} onChange={field.onChange} />
            )}
          />
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
                  reasonError={errors.reason?.message}
                />
              )}
            />
          </div>
        </div>
      </div>
    </FormModal>
  )
}
