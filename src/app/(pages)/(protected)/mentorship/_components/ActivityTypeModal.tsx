'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  activityTypeDuplicate,
  createCounselorActivityType,
  listActiveCollegesForDepartments,
  updateCounselorActivityType,
  type CounselorActivityType,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  activityTypeCode: z.string().min(1, 'Activity type code is required'),
  activityTypeName: z.string().min(1, 'Activity type name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ActivityTypeModalProps {
  open: boolean
  onClose: () => void
  row: CounselorActivityType | null
  existingRows: CounselorActivityType[]
  onSaved: () => void
}

export function ActivityTypeModal({
  open,
  onClose,
  row,
  existingRows,
  onSaved,
}: Readonly<ActivityTypeModalProps>) {
  const isEditing = row != null
  const [colleges, setColleges] = useState<SelectOption[]>([])

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
    defaultValues: {
      collegeId: undefined,
      activityTypeCode: '',
      activityTypeName: '',
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void listActiveCollegesForDepartments().then((list) => {
      setColleges(
        list.map((c) => ({
          value: String(c.collegeId),
          label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
        })),
      )
    })
    reset(
      row
        ? {
            collegeId: Number(row.collegeId),
            activityTypeCode: String(row.activityTypeCode ?? ''),
            activityTypeName: String(row.activityTypeName ?? ''),
            isActive: row.isActive !== false,
            reason: String(row.reason ?? 'active'),
          }
        : {
            collegeId: undefined,
            activityTypeCode: '',
            activityTypeName: '',
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  async function onSubmit(values: FormValues) {
    if (
      activityTypeDuplicate(
        existingRows,
        values.activityTypeCode,
        values.collegeId,
        row?.counselorActivityTypeId,
      )
    ) {
      toastError('Already Activity Type code exists with same name in college.')
      return
    }
    const payload = {
      ...values,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.counselorActivityTypeId) {
        await updateCounselorActivityType(row.counselorActivityTypeId, payload)
      } else {
        await createCounselorActivityType(payload)
      }
      toastSuccess(isEditing ? 'Activity type updated' : 'Activity type created')
      onSaved()
      onClose()
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Activity Type' : 'Add Activity Type'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel={isEditing ? 'Update' : 'Save'}
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={colleges}
              searchable
              error={errors.collegeId?.message}
            />
          )}
        />
        <div className="space-y-1.5">
          <Label htmlFor="activityTypeCode">Activity Type Code *</Label>
          <Input id="activityTypeCode" {...register('activityTypeCode')} />
          {errors.activityTypeCode ? (
            <p className="text-xs text-destructive">{errors.activityTypeCode.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="activityTypeName">Activity Type Name *</Label>
          <Input id="activityTypeName" {...register('activityTypeName')} />
          {errors.activityTypeName ? (
            <p className="text-xs text-destructive">{errors.activityTypeName.message}</p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', String(v))}
                reasonError={errors.reason?.message}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
