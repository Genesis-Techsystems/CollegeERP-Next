'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import {
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import { toApiDate } from '../_lib/format-transport-time'
import {
  listRouteStopsByRoute,
  listRoutesByTransportDetail,
  updateTransportAllocation,
} from '@/services'
import type { TransportAllocation } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().optional(),
  transportDetailId: z.coerce.number().min(1, 'Transport is required'),
  routeId: z.coerce.number().min(1, 'Route is required'),
  pickupRouteStopId: z.coerce.number().min(1, 'Pickup stop is required'),
  dropRouteStopId: z.coerce.number().min(1, 'Drop stop is required'),
  fromDate: z.date({ message: 'From date is required' }),
  toDate: z.date().optional().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface EditTransportAllocationModalProps {
  open: boolean
  onClose: () => void
  row: TransportAllocation | null
  onSaved: () => void
}

export function EditTransportAllocationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<EditTransportAllocationModalProps>) {
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
  const routeId = watch('routeId')
  const [routes, setRoutes] = useState<SelectOption[]>([])
  const [stops, setStops] = useState<SelectOption[]>([])

  useEffect(() => {
    if (!open || !row) return
    reset({
      organizationId: row.organizationId,
      transportDetailId: row.transportDetailId,
      routeId: row.routeId,
      pickupRouteStopId: row.pickupRouteStopId,
      dropRouteStopId: row.dropRouteStopId,
      fromDate: row.fromDate ? new Date(row.fromDate) : new Date(),
      toDate: row.toDate ? new Date(row.toDate) : null,
      isActive: row.isActive ?? true,
      reason: row.reason ?? 'active',
    })
  }, [open, row, reset])

  useEffect(() => {
    if (!transportDetailId) {
      setRoutes([])
      return
    }
    void listRoutesByTransportDetail(transportDetailId)
      .then((r) =>
        setRoutes(
          r.map((x) => ({
            value: String(x.routeId),
            label: `${x.serviceNumber ?? ''} ${x.routeCode ?? ''}`.trim() || String(x.routeId),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load routes'))
  }, [transportDetailId])

  useEffect(() => {
    if (!routeId) {
      setStops([])
      return
    }
    void listRouteStopsByRoute(routeId)
      .then((s) =>
        setStops(
          s.map((x) => ({
            value: String(x.routeStopId),
            label: x.stopName ?? String(x.routeStopId),
          })),
        ),
      )
      .catch((err) => toastError(err, 'Failed to load route stops'))
  }, [routeId])

  async function onSubmit(data: FormValues) {
    if (!row?.transportAllocationId) return
    const payload = {
      ...data,
      fromDate: toApiDate(data.fromDate),
      toDate: toApiDate(data.toDate ?? undefined),
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      await updateTransportAllocation(row.transportAllocationId, payload)
      toastSuccess('Transport allocation updated')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to update allocation')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Transport Allocation"
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
            transportError={errors.transportDetailId?.message}
            onOrganizationChange={() => {
              setValue('transportDetailId', undefined as unknown as number)
              setValue('routeId', undefined as unknown as number)
            }}
          />
        </div>
        <Controller
          name="routeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Route *"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : undefined)
                setValue('pickupRouteStopId', undefined as unknown as number)
                setValue('dropRouteStopId', undefined as unknown as number)
              }}
              options={routes}
              placeholder="Select route"
              searchable
              disabled={!transportDetailId}
              error={errors.routeId?.message}
            />
          )}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="pickupRouteStopId"
            control={control}
            render={({ field }) => (
              <Select
                label="Pickup Stop *"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={stops}
                placeholder="Select"
                searchable
                disabled={!routeId}
                error={errors.pickupRouteStopId?.message}
              />
            )}
          />
          <Controller
            name="dropRouteStopId"
            control={control}
            render={({ field }) => (
              <Select
                label="Drop Stop *"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={stops}
                placeholder="Select"
                searchable
                disabled={!routeId}
                error={errors.dropRouteStopId?.message}
              />
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="From Date *"
                value={field.value ?? null}
                onChange={field.onChange}
                error={errors.fromDate?.message}
              />
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
