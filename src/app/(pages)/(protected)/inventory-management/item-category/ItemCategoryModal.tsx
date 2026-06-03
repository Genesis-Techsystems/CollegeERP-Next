'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { createInvItemCategory, updateInvItemCategory } from '@/services'
import type { InvItemCategory } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  categoryCode: z.string().min(1, 'Category code is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvItemCategory | null): FormValues {
  return {
    categoryCode: edit?.categoryCode ?? '',
    categoryName: edit?.categoryName ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvItemCategory | null
  onSaved: () => void
}

export default function ItemCategoryModal({ open, onClose, editData, onSaved }: Props) {
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

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvItemCategory> = {
      categoryCode: values.categoryCode.trim(),
      categoryName: values.categoryName.trim(),
      organizationId,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvItemCategory(editData.itemCategoryId, payload)
    } else {
      await createInvItemCategory(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Item Category' : 'Add Item Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
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
