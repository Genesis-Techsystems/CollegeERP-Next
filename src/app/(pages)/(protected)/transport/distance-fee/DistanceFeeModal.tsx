'use client'

import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import { toApiDate } from '../_lib/format-transport-time'
import { createDistanceFee, listGeneralDetailsByCode, updateDistanceFee } from '@/services'
import type { DistanceFee } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  transportDetailId: z.coerce.number().min(1, 'Transport is required'),
  fromKm: z.coerce.number().min(0, 'From km is required'),
  toKm: z.coerce.number().min(0, 'To km is required'),
  amount: z.coerce.number().min(0, 'Amount is required'),
  feeFrequencyId: z.coerce.number().optional(),
  fromDate: z.date().optional().nullable(),
  toDate: z.date().optional().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DistanceFeeModalProps {
  open: boolean
  onClose: () => void
  row: DistanceFee | null
  onSaved: () => void
}

export function DistanceFeeModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<DistanceFeeModalProps>) {
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

  const organizationId = watch('organizationId')

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
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            fromKm: row.fromKm ?? 0,
            toKm: row.toKm ?? 0,
            amount: row.amount ?? 0,
            feeFrequencyId: row.feeFrequencyId,
            fromDate: row.fromDate ? new Date(row.fromDate) : null,
            toDate: row.toDate ? new Date(row.toDate) : null,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active' },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      fromDate: toApiDate(data.fromDate ?? undefined),
      toDate: toApiDate(data.toDate ?? undefined),
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.distanceFeeId) {
        await updateDistanceFee(row.distanceFeeId, payload)
        toastSuccess('Distance fee updated')
      } else {
        await createDistanceFee(payload)
        toastSuccess('Distance fee created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save distance fee')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Distance Fee' : 'Add Distance Fee'}
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
            onOrganizationChange={() => setValue('transportDetailId', undefined as unknown as number)}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>From Km *</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('fromKm')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>To Km *</Label>
            <Input type="number" className={TRANSPORT_INPUT_CLASS} {...register('toKm')} />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Amount *</Label>
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
