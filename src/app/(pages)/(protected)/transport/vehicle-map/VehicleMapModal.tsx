'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import { toApiDate } from '../_lib/format-transport-time'
import {
  createVehicleRoute,
  listDriversByTransportDetail,
  listHelpersByTransportDetail,
  listRoutesByTransportDetail,
  listVehiclesByTransportDetail,
  updateVehicleRoute,
} from '@/services'
import type { VehicleRoute } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  transportDetailId: z.coerce.number().min(1, 'Transport is required'),
  routeId: z.coerce.number().optional(),
  vehicleDetailId: z.coerce.number().optional(),
  driverId: z.coerce.number().optional(),
  helperId: z.coerce.number().optional(),
  serviceNumber: z.string().optional(),
  fromDate: z.date().optional().nullable(),
  toDate: z.date().optional().nullable(),
  status: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface VehicleMapModalProps {
  open: boolean
  onClose: () => void
  row: VehicleRoute | null
  onSaved: () => void
}

export function VehicleMapModal({ open, onClose, row, onSaved }: Readonly<VehicleMapModalProps>) {
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
  const transportDetailId = watch('transportDetailId')
  const [vehicles, setVehicles] = useState<SelectOption[]>([])
  const [drivers, setDrivers] = useState<SelectOption[]>([])
  const [helpers, setHelpers] = useState<SelectOption[]>([])
  const [routes, setRoutes] = useState<SelectOption[]>([])
  const [loadingRefs, setLoadingRefs] = useState(false)

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            routeId: row.routeId,
            vehicleDetailId: row.vehicleDetailId,
            driverId: row.driverId,
            helperId: row.helperId,
            serviceNumber: row.serviceNumber ?? '',
            fromDate: row.fromDate ? new Date(row.fromDate) : null,
            toDate: row.toDate ? new Date(row.toDate) : null,
            status: row.status ?? '',
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
      setRoutes([])
      return
    }
    setLoadingRefs(true)
    void Promise.all([
      listVehiclesByTransportDetail(transportDetailId),
      listDriversByTransportDetail(transportDetailId),
      listHelpersByTransportDetail(transportDetailId),
      listRoutesByTransportDetail(transportDetailId),
    ])
      .then(([v, d, h, r]) => {
        setVehicles(
          v.map((x) => ({
            value: String(x.vehicleDetailId),
            label: x.vehicleName ?? String(x.vehicleDetailId),
          })),
        )
        setDrivers(d.map((x) => ({ value: String(x.driverId), label: x.driverName ?? String(x.driverId) })))
        setHelpers(h.map((x) => ({ value: String(x.helperId), label: x.helperName ?? String(x.helperId) })))
        setRoutes(
          r.map((x) => ({
            value: String(x.routeId),
            label: `${x.serviceNumber ?? ''} ${x.routeCode ?? ''}`.trim() || String(x.routeId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load references'))
      .finally(() => setLoadingRefs(false))
  }, [transportDetailId])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      fromDate: toApiDate(data.fromDate ?? undefined),
      toDate: toApiDate(data.toDate ?? undefined),
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.vechicleRouteId) {
        await updateVehicleRoute(row.vechicleRouteId, payload)
        toastSuccess('Vehicle route mapping updated')
      } else {
        await createVehicleRoute(payload)
        toastSuccess('Vehicle route mapping created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save vehicle route mapping')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Vehicle Route Mapping' : 'Add Vehicle Route Mapping'}
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
            onOrganizationChange={() => setValue('transportDetailId', undefined as unknown as number)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Service Number</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('serviceNumber')} />
          </div>
          <Controller
            name="routeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Route"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={routes}
                placeholder="Select route"
                searchable
                isLoading={loadingRefs}
                disabled={!transportDetailId}
                clearable
              />
            )}
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
                placeholder="Select"
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
                placeholder="Select"
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
                placeholder="Select"
                searchable
                isLoading={loadingRefs}
                disabled={!transportDetailId}
                clearable
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="From Date" value={field.value ?? null} onChange={field.onChange} />
            )}
          />
          <Controller
            name="toDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="To Date" value={field.value ?? null} onChange={field.onChange} />
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
