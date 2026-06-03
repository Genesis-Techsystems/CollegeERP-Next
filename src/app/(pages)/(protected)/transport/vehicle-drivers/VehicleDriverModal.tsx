'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import {
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import {
  createVehicleDriver,
  listDriversByTransportDetail,
  listHelpersByTransportDetail,
  listVehiclesByTransportDetail,
  updateVehicleDriver,
} from '@/services'
import type { VehicleDriver } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  transportDetailId: z.coerce.number().min(1, 'Transport is required'),
  vehicleDetailId: z.coerce.number().optional(),
  driverId: z.coerce.number().optional(),
  helperId: z.coerce.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface VehicleDriverModalProps {
  open: boolean
  onClose: () => void
  row: VehicleDriver | null
  onSaved: () => void
}

export function VehicleDriverModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<VehicleDriverModalProps>) {
  const isEditing = row != null
  const {
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

  const organizationId = watch('organizationId')
  const transportDetailId = watch('transportDetailId')
  const [vehicles, setVehicles] = useState<SelectOption[]>([])
  const [drivers, setDrivers] = useState<SelectOption[]>([])
  const [helpers, setHelpers] = useState<SelectOption[]>([])
  const [loadingRefs, setLoadingRefs] = useState(false)

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            vehicleDetailId: row.vehicleDetailId,
            driverId: row.driverId,
            helperId: row.helperId,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active' },
    )
  }, [open, row, reset])

  useEffect(() => {
    if (!transportDetailId) {
      setVehicles([])
      setDrivers([])
      setHelpers([])
      return
    }
    setLoadingRefs(true)
    void Promise.all([
      listVehiclesByTransportDetail(transportDetailId),
      listDriversByTransportDetail(transportDetailId),
      listHelpersByTransportDetail(transportDetailId),
    ])
      .then(([v, d, h]) => {
        setVehicles(
          v.map((x) => ({
            value: String(x.vehicleDetailId),
            label: x.vehicleName ?? x.vehicleNumber ?? String(x.vehicleDetailId),
          })),
        )
        setDrivers(
          d.map((x) => ({
            value: String(x.driverId),
            label: x.driverName ?? String(x.driverId),
          })),
        )
        setHelpers(
          h.map((x) => ({
            value: String(x.helperId),
            label: x.helperName ?? String(x.helperId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load vehicle/driver data'))
      .finally(() => setLoadingRefs(false))
  }, [transportDetailId])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.vehicleDriverId) {
        await updateVehicleDriver(row.vehicleDriverId, payload)
        toastSuccess('Vehicle driver assignment updated')
      } else {
        await createVehicleDriver(payload)
        toastSuccess('Vehicle driver assignment created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save vehicle driver assignment')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Vehicle Driver' : 'Assign Vehicle Driver'}
      titleClassName={TRANSPORT_MODAL_TITLE_CLASS}
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
          <TransportOrgFields
            control={control}
            organizationId={organizationId}
            orgError={errors.organizationId?.message}
            transportError={errors.transportDetailId?.message}
            onOrganizationChange={() => {
              setValue('transportDetailId', undefined as unknown as number)
              setValue('vehicleDetailId', undefined)
              setValue('driverId', undefined)
              setValue('helperId', undefined)
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Controller
            name="vehicleDetailId"
            control={control}
            render={({ field }) => (
              <Select
                label="Vehicle"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={vehicles}
                placeholder="Select vehicle"
                searchable
                isLoading={loadingRefs}
                disabled={!transportDetailId}
                clearable
              />
            )}
          />
          <Controller
            name="driverId"
            control={control}
            render={({ field }) => (
              <Select
                label="Driver"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={drivers}
                placeholder="Select driver"
                searchable
                isLoading={loadingRefs}
                disabled={!transportDetailId}
                clearable
              />
            )}
          />
          <Controller
            name="helperId"
            control={control}
            render={({ field }) => (
              <Select
                label="Helper"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={helpers}
                placeholder="Select helper"
                searchable
                isLoading={loadingRefs}
                disabled={!transportDetailId}
                clearable
              />
            )}
          />
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
