'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createHostelType, listOrganizations, updateHostelType } from '@/services'
import type { HostelType } from '@/types/hostel'
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
  hostelTypeCode: z.string().min(1, 'Code is required'),
  hostelTypeName: z.string().min(1, 'Name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface HostelTypeModalProps {
  open: boolean
  onClose: () => void
  row: HostelType | null
  onSaved: () => void
}

export function HostelTypeModal({ open, onClose, row, onSaved }: Readonly<HostelTypeModalProps>) {
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

  const { data: orgs = [] } = useQuery({
    queryKey: ['Hostel', 'organizations'],
    queryFn: listOrganizations,
    enabled: open,
  })

  const orgOptions = orgs
    .filter((o) => o.isActive !== false)
    .map((o) => ({
      value: String(o.organizationId),
      label: o.orgCode ?? o.orgName ?? String(o.organizationId),
    }))

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            hostelTypeCode: row.hostelTypeCode ?? '',
            hostelTypeName: row.hostelTypeName ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active' },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row) {
        await updateHostelType(row.hostelTypeId, payload)
        toastSuccess('Hostel type updated')
      } else {
        await createHostelType(payload)
        toastSuccess('Hostel type created')
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
      title={isEditing ? 'Edit Hostel Type' : 'Add Hostel Type'}
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
                  onChange={(v) => field.onChange(v ? Number(v) : 0)}
                  options={orgOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Hostel type code</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('hostelTypeCode')} />
            {errors.hostelTypeCode ? (
              <p className="text-xs text-destructive">{errors.hostelTypeCode.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Hostel type name</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register('hostelTypeName')} />
            {errors.hostelTypeName ? (
              <p className="text-xs text-destructive">{errors.hostelTypeName.message}</p>
            ) : null}
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
