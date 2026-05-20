'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSchPreceeding, updateSchPreceeding } from '@/services'
import type { SchPreceeding } from '@/types/scholarship'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  preceedingNo: z.string().min(1, 'Proceeding number is required'),
  preceedingTitle: z.string().min(1, 'Title is required'),
  preceedingAmount: z.number().min(0),
  preceedingDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface PreceedingDetailsModalProps {
  open: boolean
  onClose: () => void
  row: SchPreceeding | null
  collegeId: number | null
  academicYearId: number | null
  financialYearId: number | null
  onSaved: () => void
}

export function PreceedingDetailsModal({
  open,
  onClose,
  row,
  collegeId,
  academicYearId,
  financialYearId,
  onSaved,
}: Readonly<PreceedingDetailsModalProps>) {
  const isEditing = row != null

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      preceedingNo: '',
      preceedingTitle: '',
      preceedingAmount: 0,
      preceedingDate: undefined,
    },
  })

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            preceedingNo: row.preceedingNo ?? '',
            preceedingTitle: row.preceedingTitle ?? '',
            preceedingAmount: row.preceedingAmount ?? 0,
            preceedingDate: row.preceedingDate,
          }
        : {
            preceedingNo: '',
            preceedingTitle: '',
            preceedingAmount: 0,
            preceedingDate: undefined,
          },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    if (!collegeId || !academicYearId || !financialYearId) {
      toastError('Select college, academic year, and financial year first')
      return
    }
    const payload = {
      ...data,
      collegeId,
      academicYearId,
      financialYearId,
      isActive: true,
    }
    try {
      if (isEditing && row) {
        await updateSchPreceeding(row.schPreceedingId, payload)
        toastSuccess('Proceeding updated')
      } else {
        await createSchPreceeding(payload)
        toastSuccess('Proceeding created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save proceeding')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Proceeding' : 'Add Proceeding'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-[12px]">Proceeding No *</Label>
          <Input className="h-9 text-[12px]" {...register('preceedingNo')} />
          {errors.preceedingNo && <p className="text-xs text-red-500">{errors.preceedingNo.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Title *</Label>
          <Input className="h-9 text-[12px]" {...register('preceedingTitle')} />
          {errors.preceedingTitle && <p className="text-xs text-red-500">{errors.preceedingTitle.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Amount *</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('preceedingAmount')} />
        </div>
        <Controller
          name="preceedingDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Proceeding Date"
              value={field.value ? new Date(field.value) : null}
              onChange={(d) => field.onChange(d?.toISOString().slice(0, 10))}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
