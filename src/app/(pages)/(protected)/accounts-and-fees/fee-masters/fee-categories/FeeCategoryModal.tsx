'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFeeCategory, listActiveCollegesForGeneralSettings, updateFeeCategory } from '@/services'
import type { FeeCategory } from '@/types/fee-category'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  feeCategoryCode: z.string().min(1, 'Category code is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  isMaster: z.boolean().optional(),
  isHostel: z.boolean().optional(),
  isTransport: z.boolean().optional(),
  includeInLedger: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface FeeCategoryModalProps {
  open: boolean
  onClose: () => void
  category: FeeCategory | null
  onSaved: () => void
}

function asCollegeOptions(rows: { collegeId: number; collegeCode?: string }[]): SelectOption[] {
  return rows.map((row) => ({
    value: String(row.collegeId),
    label: row.collegeCode ?? String(row.collegeId),
  }))
}

function FlagCheckbox({
  label,
  name,
  control,
}: {
  label: string
  name: 'isMaster' | 'isHostel' | 'isTransport' | 'includeInLedger'
  control: ReturnType<typeof useForm<FormValues>>['control']
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
          <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
          <span className="text-[12px] text-slate-700">{label}</span>
        </label>
      )}
    />
  )
}

export function FeeCategoryModal({ open, onClose, category, onSaved }: Readonly<FeeCategoryModalProps>) {
  const isEditing = category != null
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
      feeCategoryCode: '',
      categoryName: '',
      description: '',
      isMaster: false,
      isHostel: false,
      isTransport: false,
      includeInLedger: false,
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
    if (category) {
      reset({
        collegeId: category.collegeId,
        feeCategoryCode: category.feeCategoryCode ?? '',
        categoryName: category.categoryName ?? '',
        description: category.description ?? '',
        isMaster: !!category.isMaster,
        isHostel: !!category.isHostel,
        isTransport: !!category.isTransport,
        includeInLedger: !!category.includeInLedger,
        isActive: category.isActive,
        reason: category.reason ?? 'active',
      })
    } else {
      reset({
        collegeId: undefined,
        feeCategoryCode: '',
        categoryName: '',
        description: '',
        isMaster: false,
        isHostel: false,
        isTransport: false,
        includeInLedger: false,
        isActive: true,
        reason: 'active',
      })
    }
  }, [category, open, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }

    try {
      if (isEditing) {
        await updateFeeCategory(category!.feeCategoryId, payload)
        toastSuccess('Fee category updated successfully')
      } else {
        await createFeeCategory(payload)
        toastSuccess('Fee category created successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} fee category`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Fee Category' : 'Add Fee Category'}
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
        <FormFieldRow label="Category Code *" error={errors.feeCategoryCode?.message}>
          <Input className="h-9 text-[12px]" {...register('feeCategoryCode')} />
        </FormFieldRow>
        <FormFieldRow label="Category Name *" error={errors.categoryName?.message}>
          <Input className="h-9 text-[12px]" {...register('categoryName')} />
        </FormFieldRow>
        <FormFieldRow label="Description" className="sm:col-span-2">
          <Input className="h-9 text-[12px]" {...register('description')} />
        </FormFieldRow>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:grid-cols-4">
          <FlagCheckbox label="Master" name="isMaster" control={control} />
          <FlagCheckbox label="Hostel" name="isHostel" control={control} />
          <FlagCheckbox label="Transport" name="isTransport" control={control} />
          <FlagCheckbox label="Ledger" name="includeInLedger" control={control} />
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
