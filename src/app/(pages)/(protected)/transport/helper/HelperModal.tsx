'use client'

import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import { TransportOrgFields } from '../_components/TransportOrgFields'
import { createHelper, updateHelper } from '@/services'
import type { Helper } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  transportDetailId: z.coerce.number().optional(),
  helperName: z.string().min(1, 'Helper name is required'),
  mobileNumber: z.string().min(1, 'Mobile number is required'),
  emailId: z.string().email().optional().or(z.literal('')),
  presentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface HelperModalProps {
  open: boolean
  onClose: () => void
  row: Helper | null
  onSaved: () => void
}

export function HelperModal({ open, onClose, row, onSaved }: Readonly<HelperModalProps>) {
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

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            helperName: row.helperName ?? '',
            mobileNumber: row.mobileNumber ?? '',
            emailId: row.emailId ?? '',
            presentAddress: row.presentAddress ?? '',
            permanentAddress: row.permanentAddress ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : { isActive: true, reason: 'active' },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      emailId: data.emailId || undefined,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.helperId) {
        await updateHelper(row.helperId, payload)
        toastSuccess('Helper updated')
      } else {
        await createHelper(payload)
        toastSuccess('Helper created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} helper`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Helper' : 'Add Helper'}
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
            onOrganizationChange={() => setValue('transportDetailId', undefined)}
            transportRequired={false}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Helper Name *</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('helperName')} />
            {errors.helperName ? (
              <p className="text-xs text-destructive">{errors.helperName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Mobile *</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register('mobileNumber')} />
            {errors.mobileNumber ? (
              <p className="text-xs text-destructive">{errors.mobileNumber.message}</p>
            ) : null}
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
