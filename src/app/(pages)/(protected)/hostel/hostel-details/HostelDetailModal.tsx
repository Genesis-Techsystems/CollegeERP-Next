'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import {
  createHostelDetail,
  listHostelForOptions,
  listHostelTypes,
  listOrganizations,
  updateHostelDetail,
} from '@/services'
import type { HostelDetail } from '@/types/hostel'
import { toastError, toastSuccess } from '@/lib/toast'
import { useQuery } from '@tanstack/react-query'
import {
  HOSTEL_FIELD_LABEL_CLASS,
  HOSTEL_INPUT_CLASS,
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from '../_lib/modal-styles'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  hostelTypeId: z.coerce.number().min(1, 'Hostel type is required'),
  hstlForCatdetId: z.coerce.number().min(1, 'Hostel for is required'),
  hostelCode: z.string().min(1, 'Code is required'),
  hostelName: z.string().min(1, 'Name is required'),
  noOfFloors: z.coerce.number().min(1),
  phoneNumber: z.string().min(10, 'Phone is required'),
  hostelAddress: z.string().min(1, 'Address is required'),
  otherInfo: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface HostelDetailModalProps {
  open: boolean
  onClose: () => void
  row: HostelDetail | null
  onSaved: () => void
}

export function HostelDetailModal({ open, onClose, row, onSaved }: Readonly<HostelDetailModalProps>) {
  const isEditing = row != null
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { isActive: true, reason: 'active' } })

  const organizationId = watch('organizationId')

  const { data: orgs = [] } = useQuery({
    queryKey: ['Hostel', 'organizations'],
    queryFn: listOrganizations,
    enabled: open,
  })
  const { data: hostelTypes = [] } = useQuery({
    queryKey: QK.hostel.types(),
    queryFn: listHostelTypes,
    enabled: open,
  })
  const { data: hostelForOptions = [] } = useQuery({
    queryKey: ['Hostel', 'hostelFor'],
    queryFn: listHostelForOptions,
    enabled: open,
  })

  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!organizationId) {
      setTypeOptions([])
      return
    }
    setTypeOptions(
      hostelTypes
        .filter((t) => t.organizationId === organizationId)
        .map((t) => ({
          value: String(t.hostelTypeId),
          label: t.hostelTypeName ?? t.hostelTypeCode ?? String(t.hostelTypeId),
        })),
    )
  }, [organizationId, hostelTypes])

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            hostelTypeId: row.hostelTypeId,
            hstlForCatdetId: row.hstlForCatdetId ?? 0,
            hostelCode: row.hostelCode ?? '',
            hostelName: row.hostelName ?? '',
            noOfFloors: row.noOfFloors ?? 1,
            phoneNumber: row.phoneNumber ?? '',
            hostelAddress: row.hostelAddress ?? '',
            otherInfo: row.otherInfo ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active', noOfFloors: 1 },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row) {
        await updateHostelDetail(row.hostelId, payload)
        toastSuccess('Hostel updated')
      } else {
        await createHostelDetail(payload)
        toastSuccess('Hostel created')
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
  const forOptions = hostelForOptions.map((g) => ({
    value: String(g.generalDetailId),
    label: g.generalDetailName ?? g.generalDetailCode ?? String(g.generalDetailId),
  }))

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Hostel' : 'Add Hostel'}
      titleClassName={HOSTEL_MODAL_TITLE_CLASS}
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
          <div className="md:col-span-2">
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
                    setValue('hostelTypeId', 0)
                  }}
                  options={orgOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
          </div>
          <Controller
            name="hostelTypeId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Hostel type"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={typeOptions}
                disabled={!organizationId}
                error={errors.hostelTypeId?.message}
              />
            )}
          />
          <Controller
            name="hstlForCatdetId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Hostel for"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={forOptions}
                error={errors.hstlForCatdetId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Hostel code</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('hostelCode')} />
            {errors.hostelCode ? (
              <p className="text-xs text-destructive">{errors.hostelCode.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Hostel name</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('hostelName')} />
            {errors.hostelName ? (
              <p className="text-xs text-destructive">{errors.hostelName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>No. of floors</Label>
            <Input type="number" className={HOSTEL_INPUT_CLASS} {...register('noOfFloors')} />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Phone</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('phoneNumber')} />
            {errors.phoneNumber ? (
              <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
            ) : null}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Address</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('hostelAddress')} />
            {errors.hostelAddress ? (
              <p className="text-xs text-destructive">{errors.hostelAddress.message}</p>
            ) : null}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Other info</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('otherInfo')} />
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
