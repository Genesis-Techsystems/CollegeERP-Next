'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { QK } from '@/lib/query-keys'
import {
  createFinCategory,
  listCollegesActive,
  listFinAccountTypesByCollege,
  updateFinCategory,
} from '@/services'
import type { FinCategory } from '@/types/finance'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  accountTypeId: z.coerce.number().min(1, 'Account type is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  categoryCode: z.string().min(1, 'Category code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: FinCategory | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    accountTypeId: edit?.accountTypeId ?? 0,
    categoryName: edit?.categoryName ?? '',
    categoryCode: edit?.categoryCode ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinCategory | null
  onSaved: () => void
}

export default function FinanceCategoryModal({ open, onClose, editData, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const collegeId = watch('collegeId')

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ['College', 'active'],
    queryFn: listCollegesActive,
    enabled: open,
  })

  const { data: accountTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: QK.finAccountTypes.byCollege(collegeId),
    queryFn: () => listFinAccountTypesByCollege(collegeId),
    enabled: open && collegeId > 0,
  })

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
  )

  const accountTypeOptions = useMemo<SelectOption[]>(
    () => accountTypes.map((t) => ({
      value: String(t.accountTypeId),
      label: `${t.accounttypeCode} — ${t.accounttypeName}`,
    })),
    [accountTypes],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinCategory> = {
      collegeId: values.collegeId,
      accountTypeId: values.accountTypeId,
      categoryName: values.categoryName.trim(),
      categoryCode: values.categoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateFinCategory(editData.finCategoryId, payload)
    } else {
      await createFinCategory(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Category' : 'Add Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => {
                  field.onChange(Number(v))
                  setValue('accountTypeId', 0)
                }}
                options={collegeOptions}
                placeholder="Select college"
                isLoading={collegesLoading}
                searchable
              />
            )}
          />
          <Controller
            name="accountTypeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Account Type *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={accountTypeOptions}
                placeholder="Select account type"
                isLoading={typesLoading}
                disabled={!collegeId}
                searchable
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Category Code *</Label>
            <Input className="h-8 text-xs" {...register('categoryCode')} />
            {errors.categoryCode && <p className="text-xs text-red-500">{errors.categoryCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Category Name *</Label>
            <Input className="h-8 text-xs" {...register('categoryName')} />
            {errors.categoryName && <p className="text-xs text-red-500">{errors.categoryName.message}</p>}
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
                reasonError={errors.reason?.message}
              />
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
