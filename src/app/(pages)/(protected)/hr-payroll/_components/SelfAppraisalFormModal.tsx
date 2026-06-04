'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSelfAppraisalForm, updateSelfAppraisalForm } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'

const schema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })

type FormValues = z.infer<typeof schema>

type FormRow = Record<string, unknown>

interface SelfAppraisalFormModalProps {
  open: boolean
  onClose: () => void
  row: FormRow | null
  collegeId: number
  collegeCode: string
  onSaved: () => void
}

export function SelfAppraisalFormModal({
  open,
  onClose,
  row,
  collegeId,
  collegeCode,
  onSaved,
}: Readonly<SelfAppraisalFormModalProps>) {
  const isEditing = row != null && row.selfAppraisalFormId != null

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
      title: '',
      startDate: new Date(),
      endDate: new Date(),
      isActive: true,
      reason: 'active',
    },
  })

  const startDate = watch('startDate')

  useEffect(() => {
    if (!open) return
    reset(
      isEditing
        ? {
            title: String(row?.title ?? ''),
            startDate: row?.startDate ? new Date(String(row.startDate)) : new Date(),
            endDate: row?.endDate ? new Date(String(row.endDate)) : new Date(),
            isActive: row?.isActive !== false,
            reason: String(row?.reason ?? 'active'),
          }
        : {
            title: '',
            startDate: new Date(),
            endDate: new Date(),
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, isEditing, row, reset])

  function onStartDateChange(date: Date | undefined) {
    if (!date) return
    setValue('startDate', date)
    const end = watch('endDate')
    if (end && date > end) {
      toast.info('Start date should be less than end date.')
      setValue('endDate', date)
    }
  }

  async function onSubmit(data: FormValues) {
    const payload: FormRow = {
      title: data.title.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
      collegeId,
    }
    try {
      if (isEditing) {
        await updateSelfAppraisalForm(Number(row!.selfAppraisalFormId), payload)
        toastSuccess('Appraisal form updated')
      } else {
        await createSelfAppraisalForm(payload)
        toastSuccess('Appraisal form created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} appraisal form`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Appraisal Form' : 'Add Appraisal Form'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="flex flex-col gap-3 text-[12px]">
        {isEditing ? (
          <div className="rounded border border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-muted-foreground">College: </span>
            <span className="font-medium text-[hsl(var(--primary))]">{collegeCode}</span>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="title" className="text-[12px]">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input id="title" className="h-9 text-[12px]" {...register('title')} />
          {errors.title ? <p className="text-[11px] text-destructive">{errors.title.message}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[12px]">Start Date</Label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={(d) => onStartDateChange(d ?? undefined)}
                  className="h-9 text-[12px]"
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">End Date</Label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  minDate={startDate}
                  className="h-9 text-[12px]"
                />
              )}
            />
            {errors.endDate ? (
              <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
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
              onActiveChange={(v) => field.onChange(v === true)}
              onReasonChange={(v) => setValue('reason', v)}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
