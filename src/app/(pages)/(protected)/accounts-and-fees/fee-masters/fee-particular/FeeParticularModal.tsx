'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createFeeParticular,
  listActiveCollegesForGeneralSettings,
  updateFeeParticular,
} from '@/services'
import type { FeeParticular } from '@/types/fee-particular'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  particularsCode: z.string().min(1, 'Particular code is required'),
  particularsName: z.string().min(1, 'Particular name is required'),
  description: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface FeeParticularModalProps {
  open: boolean
  onClose: () => void
  particular: FeeParticular | null
  onSaved: () => void
}

function asCollegeOptions(rows: { collegeId: number; collegeCode?: string }[]): SelectOption[] {
  return rows.map((row) => ({
    value: String(row.collegeId),
    label: row.collegeCode ?? String(row.collegeId),
  }))
}

export function FeeParticularModal({ open, onClose, particular, onSaved }: Readonly<FeeParticularModalProps>) {
  const isEditing = particular != null
  const [colleges, setColleges] = useState<{ collegeId: number; collegeCode?: string }[]>([])

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
      particularsCode: '',
      particularsName: '',
      description: '',
      isActive: true,
      reason: 'active',
    },
  })

  const collegeOptions = useMemo(() => asCollegeOptions(colleges), [colleges])

  useEffect(() => {
    if (!open) return
    listActiveCollegesForGeneralSettings()
      .then(setColleges)
      .catch(() => setColleges([]))
  }, [open])

  useEffect(() => {
    if (particular) {
      reset({
        collegeId: particular.collegeId,
        particularsCode: particular.particularsCode ?? '',
        particularsName: particular.particularsName ?? '',
        description: particular.description ?? '',
        isActive: particular.isActive,
        reason: particular.reason ?? 'active',
      })
    } else {
      reset({
        collegeId: undefined,
        particularsCode: '',
        particularsName: '',
        description: '',
        isActive: true,
        reason: 'active',
      })
    }
  }, [particular, open, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }

    try {
      if (isEditing) {
        await updateFeeParticular(particular!.feeParticularsId, payload)
        toastSuccess('Fee particular updated successfully')
      } else {
        await createFeeParticular(payload)
        toastSuccess('Fee particular created successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} fee particular`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Fee Particular' : 'Add Fee Particular'}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={collegeOptions}
              placeholder="Select college"
              searchable
              error={errors.collegeId?.message}
            />
          )}
        />
        <FormFieldRow label="Particular Code *" error={errors.particularsCode?.message}>
          <Input className="h-9 text-[12px]" {...register('particularsCode')} />
        </FormFieldRow>
        <FormFieldRow label="Particular Name *" error={errors.particularsName?.message}>
          <Input className="h-9 text-[12px]" {...register('particularsName')} />
        </FormFieldRow>
        <FormFieldRow label="Description" className="sm:col-span-2">
          <Input className="h-9 text-[12px]" {...register('description')} />
        </FormFieldRow>
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

function FormFieldRow({
  label,
  error,
  className = '',
  children,
}: {
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={['space-y-1', className].filter(Boolean).join(' ')}>
      <Label className="text-[12px]">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
