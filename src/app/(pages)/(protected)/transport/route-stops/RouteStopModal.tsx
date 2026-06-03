'use client'

import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { createRouteStop, listGeneralDetailsByCode, updateRouteStop } from '@/services'
import type { RouteStop } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  stopName: z.string().min(1, 'Stop name is required'),
  distanceFromSchoolKm: z.coerce.number().min(0, 'Distance is required'),
  pickTime: z.string().min(1, 'Pick time is required'),
  dropTime: z.string().min(1, 'Drop time is required'),
  amount: z.coerce.number().optional(),
  feeFrequencyId: z.coerce.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RouteStopModalProps {
  open: boolean
  onClose: () => void
  row: RouteStop | null
  routeId: number
  onSaved: () => void
}

export function RouteStopModal({
  open,
  onClose,
  row,
  routeId,
  onSaved,
}: Readonly<RouteStopModalProps>) {
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

  const { data: feeFrequencies = [] } = useQuery({
    queryKey: ['Transport', 'feeFrequency'],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.FEE_FREQUENCY),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            stopName: row.stopName ?? '',
            distanceFromSchoolKm: row.distanceFromSchoolKm ?? 0,
            pickTime: row.pickTime?.slice(0, 5) ?? '',
            dropTime: row.dropTime?.slice(0, 5) ?? '',
            amount: row.amount,
            feeFrequencyId: row.feeFrequencyId,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active', pickTime: '', dropTime: '' },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      routeId,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.routeStopId) {
        await updateRouteStop(row.routeStopId, payload)
        toastSuccess('Route stop updated')
      } else {
        await createRouteStop(payload)
        toastSuccess('Route stop created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} route stop`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Route Stop' : 'Add Route Stop'}
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
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Stop Name *</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('stopName')} />
            {errors.stopName ? (
              <p className="text-xs text-destructive">{errors.stopName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Distance (km) *</Label>
            <Input type="number" step="0.01" className={TRANSPORT_INPUT_CLASS} {...register('distanceFromSchoolKm')} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Pick Time *</Label>
            <Input type="time" className={TRANSPORT_INPUT_CLASS} {...register('pickTime')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Drop Time *</Label>
            <Input type="time" className={TRANSPORT_INPUT_CLASS} {...register('dropTime')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Amount</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('amount')} />
          </div>
        </div>
        <Controller
          name="feeFrequencyId"
          control={control}
          render={({ field }) => (
            <Select
              label="Fee Frequency"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={feeFrequencies.map((f) => {
                const r = f as { generalDetailId?: number; generalDetailDisplayName?: string }
                return {
                  value: String(r.generalDetailId),
                  label: r.generalDetailDisplayName ?? String(r.generalDetailId),
                }
              })}
              placeholder="Select"
              searchable
              clearable
            />
          )}
        />
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
