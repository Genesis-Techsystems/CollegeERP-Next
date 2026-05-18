'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createUnivFeeStructure, updateUnivFeeStructure } from '@/services'
import type { UnivFeeStructureRow } from '@/types/fee-structure'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  feeStructureName: z.string().min(1, 'Fee structure name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface UniversityFeeStructureModalProps {
  open: boolean
  onClose: () => void
  row: UnivFeeStructureRow | null
  context: {
    universitiesId: number
    courseId: number
    courseGroupId: number
    academicYearId: number
  }
  onSaved: () => void
}

export function UniversityFeeStructureModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: Readonly<UniversityFeeStructureModalProps>) {
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
    defaultValues: { feeStructureName: '', isActive: true, reason: 'active' },
  })

  useEffect(() => {
    if (row) {
      reset({
        feeStructureName: row.feeStructureName ?? '',
        isActive: row.isActive,
        reason: row.reason ?? 'active',
      })
    } else {
      reset({ feeStructureName: '', isActive: true, reason: 'active' })
    }
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      ...context,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }

    try {
      if (isEditing) {
        await updateUnivFeeStructure(row!.univFeeStructureId, payload)
        toastSuccess('University fee structure updated')
      } else {
        await createUnivFeeStructure(payload)
        toastSuccess('University fee structure created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} university fee structure`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit University Fee Structure' : 'Add University Fee Structure'}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
    >
      <div className="space-y-3">
        <FormField label="Fee Structure Name *" error={errors.feeStructureName?.message}>
          <Input className="h-9 text-[12px]" {...register('feeStructureName')} />
        </FormField>
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
    </FormModal>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[12px]">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
