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
import {
  createInvItemSubCategory,
  listInvItemCategories,
  updateInvItemSubCategory,
} from '@/services'
import { QK } from '@/lib/query-keys'
import type { InvItemSubCategory } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  itemCategoryId: z.coerce.number().min(1, 'Category is required'),
  subcategoryCode: z.string().min(1, 'Subcategory code is required'),
  subcategoryName: z.string().min(1, 'Subcategory name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvItemSubCategory | null): FormValues {
  return {
    itemCategoryId: edit?.itemCategoryId ?? 0,
    subcategoryCode: edit?.subcategoryCode ?? '',
    subcategoryName: edit?.subcategoryName ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvItemSubCategory | null
  onSaved: () => void
}

export default function ItemSubCategoryModal({ open, onClose, editData, onSaved }: Props) {
  const organizationId = getInventoryOrganizationId()

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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QK.invItemCategories.list(),
    queryFn: listInvItemCategories,
    enabled: open,
  })

  const categoryOptions: SelectOption[] = useMemo(
    () => categories.map((c) => ({
      value: String(c.itemCategoryId),
      label: c.categoryName ?? c.categoryCode ?? String(c.itemCategoryId),
    })),
    [categories],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvItemSubCategory> = {
      itemCategoryId: values.itemCategoryId,
      subcategoryCode: values.subcategoryCode.trim(),
      subcategoryName: values.subcategoryName.trim(),
      organizationId,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvItemSubCategory(editData.itemSubcategoryId, payload)
    } else {
      await createInvItemSubCategory(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Sub Category' : 'Add Sub Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="itemCategoryId"
            control={control}
            render={({ field }) => (
              <Select
                label="Category *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={categoryOptions}
                placeholder="Select category"
                isLoading={categoriesLoading}
                searchable
                error={errors.itemCategoryId?.message}
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Subcategory Code *</Label>
            <Input className="h-8 text-xs" {...register('subcategoryCode')} />
            {errors.subcategoryCode && <p className="text-xs text-red-500">{errors.subcategoryCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Subcategory Name *</Label>
            <Input className="h-8 text-xs" {...register('subcategoryName')} />
            {errors.subcategoryName && <p className="text-xs text-red-500">{errors.subcategoryName.message}</p>}
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
