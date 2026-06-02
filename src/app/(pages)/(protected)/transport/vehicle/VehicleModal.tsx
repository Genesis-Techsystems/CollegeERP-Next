'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import { toApiDate } from '../_lib/format-transport-time'
import { createVehicle, listGeneralDetailsByCode, updateVehicle } from '@/services'
import { GM_CODES } from '@/config/constants/ui'
import type { VehicleDetail } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'
import { useQuery } from '@tanstack/react-query'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  transportDetailId: z.coerce.number().optional(),
  vehicleName: z.string().min(1, 'Vehicle name is required'),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleModel: z.string().optional(),
  vehicleMaker: z.string().optional(),
  generalDetailId: z.coerce.number().optional(),
  noOfSeats: z.coerce.number().optional(),
  maximumAllowed: z.coerce.number().optional(),
  availableSeats: z.coerce.number().optional(),
  registrationDate: z.date().optional().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface VehicleModalProps {
  open: boolean
  onClose: () => void
  row: VehicleDetail | null
  onSaved: () => void
}

export function VehicleModal({ open, onClose, row, onSaved }: Readonly<VehicleModalProps>) {
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
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, reason: 'active' },
  })

  const organizationId = watch('organizationId')

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['Transport', 'vehicleTypes'],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.VEHICLE_TYPE),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            vehicleName: row.vehicleName ?? '',
            vehicleNumber: row.vehicleNumber ?? '',
            vehicleModel: row.vehicleModel ?? '',
            vehicleMaker: row.vehicleMaker ?? '',
            generalDetailId: row.generalDetailId,
            noOfSeats: row.noOfSeats,
            maximumAllowed: row.maximumAllowed,
            availableSeats: row.availableSeats,
            registrationDate: row.registrationDate ? new Date(row.registrationDate) : null,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active' },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      registrationDate: toApiDate(data.registrationDate ?? undefined),
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.vehicleDetailId) {
        await updateVehicle(row.vehicleDetailId, payload)
        toastSuccess('Vehicle updated')
      } else {
        await createVehicle(payload)
        toastSuccess('Vehicle created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} vehicle`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
      titleClassName={TRANSPORT_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TransportOrgFields
            control={control}
            organizationId={organizationId}
            orgError={errors.organizationId?.message}
            transportError={errors.transportDetailId?.message}
            transportRequired={false}
            onOrganizationChange={() => setValue('transportDetailId', undefined)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Vehicle Name *</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('vehicleName')} />
            {errors.vehicleName ? (
              <p className="text-xs text-destructive">{errors.vehicleName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Vehicle Number *</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('vehicleNumber')} />
            {errors.vehicleNumber ? (
              <p className="text-xs text-destructive">{errors.vehicleNumber.message}</p>
            ) : null}
          </div>
          <Controller
            name="generalDetailId"
            control={control}
            render={({ field }) => (
              <Select
                label="Vehicle Type"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={vehicleTypes.map((t) => ({
                  value: String((t as { generalDetailId?: number }).generalDetailId),
                  label: String(
                    (t as { generalDetailDisplayName?: string }).generalDetailDisplayName ??
                      (t as { generalDetailId?: number }).generalDetailId,
                  ),
                }))}
                placeholder="Select type"
                searchable
                clearable
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Model</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('vehicleModel')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Maker</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('vehicleMaker')} />
          </div>
          <Controller
            name="registrationDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Registration Date"
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>No. of Seats</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('noOfSeats')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Maximum Allowed</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('maximumAllowed')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Available Seats</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('availableSeats')} />
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
              onReasonChange={(v) => setValue('reason', v)}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
