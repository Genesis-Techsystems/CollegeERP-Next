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
import { Textarea } from '@/components/ui/textarea'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { QK } from '@/lib/query-keys'
import {
  createFinSubCategory,
  listCollegesActive,
  listFinCategories,
  updateFinSubCategory,
} from '@/services'
import type { FinSubCategory } from '@/types/finance'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  finCategoryId: z.coerce.number().min(1, 'Category is required'),
  subCategoryName: z.string().min(1, 'Sub category name is required'),
  subCategoryDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: FinSubCategory | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    finCategoryId: edit?.finCategoryId ?? 0,
    subCategoryName: edit?.subCategoryName ?? '',
    subCategoryDescription: edit?.subCategoryDescription ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinSubCategory | null
  onSaved: () => void
}

export default function FinanceSubCategoryModal({ open, onClose, editData, onSaved }: Props) {
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

  const { data: allCategories = [] } = useQuery({
    queryKey: QK.finCategories.list(),
    queryFn: listFinCategories,
    enabled: open,
  })

  const categoryOptions = useMemo<SelectOption[]>(
    () => allCategories
      .filter((c) => !collegeId || c.collegeId === collegeId)
      .map((c) => ({
        value: String(c.finCategoryId),
        label: `${c.categoryCode} — ${c.categoryName}`,
      })),
    [allCategories, collegeId],
  )

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinSubCategory> = {
      collegeId: values.collegeId,
      finCategoryId: values.finCategoryId,
      subCategoryName: values.subCategoryName.trim(),
      subCategoryDescription: values.subCategoryDescription?.trim(),
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateFinSubCategory(editData.finSubCategoryId, payload)
    } else {
      await createFinSubCategory(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Finance Sub Category' : 'Add Finance Sub Category'}
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
                  setValue('finCategoryId', 0)
                }}
                options={collegeOptions}
                placeholder="Select college"
                isLoading={collegesLoading}
                searchable
              />
            )}
          />
          <Controller
            name="finCategoryId"
            control={control}
            render={({ field }) => (
              <Select
                label="Finance Category *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={categoryOptions}
                placeholder="Select category"
                disabled={!collegeId}
                searchable
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Sub Category Name *</Label>
            <Input className="h-8 text-xs" {...register('subCategoryName')} />
            {errors.subCategoryName && <p className="text-xs text-red-500">{errors.subCategoryName.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Description</Label>
            <Textarea className="text-xs min-h-[72px]" {...register('subCategoryDescription')} />
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
