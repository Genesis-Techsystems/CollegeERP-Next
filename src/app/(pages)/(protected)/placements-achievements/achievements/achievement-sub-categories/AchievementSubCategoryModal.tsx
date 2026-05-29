'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { listAchievementCategories, createAchievementSubCategory, updateAchievementSubCategory } from '@/services/placements'
import type { AchievementSubCategory, AchievementCategory } from '@/types/placements'

const schema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  achievementSubcategory: z.string().min(1, 'Sub-category name is required'),
  achievementSubcategoryCode: z.string().min(1, 'Sub-category code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: AchievementSubCategory | null): FormValues {
  return {
    categoryId: String(edit?.categoryId ?? ''),
    achievementSubcategory: edit?.achievementSubcategory ?? '',
    achievementSubcategoryCode: edit?.achievementSubcategoryCode ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: AchievementSubCategory | null
  onSaved: () => void
}

export default function AchievementSubCategoryModal({ open, onClose, editData, onSaved }: Props) {
  const [categories, setCategories] = useState<AchievementCategory[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    if (!open) return
    listAchievementCategories().then(setCategories).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const cat = categories.find((c) => String(c.categoryId) === values.categoryId)
      const payload = {
        categoryId: Number(values.categoryId),
        organizationId: cat?.organizationId ?? undefined,
        achievementSubcategory: values.achievementSubcategory,
        achievementSubcategoryCode: values.achievementSubcategoryCode,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateAchievementSubCategory(editData.subCategoryId, payload)
      } else {
        await createAchievementSubCategory(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Achievement Sub-Category' : 'Add Achievement Sub-Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="space-y-0.5">
            <Label className="text-xs">Category *</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>{c.achievementCategory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Sub-Category Name *</Label>
            <Input className="h-8 text-xs" {...register('achievementSubcategory')} placeholder="Sub-category name" />
            {errors.achievementSubcategory && <p className="text-xs text-red-500">{errors.achievementSubcategory.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Sub-Category Code *</Label>
            <Input className="h-8 text-xs" {...register('achievementSubcategoryCode')} placeholder="e.g. CRICKET" />
            {errors.achievementSubcategoryCode && <p className="text-xs text-red-500">{errors.achievementSubcategoryCode.message}</p>}
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox id="subCatIsActive" checked={field.value} onCheckedChange={field.onChange} />
                <label htmlFor="subCatIsActive" className="text-xs">Active</label>
              </div>
            )}
          />
          {!isActive && (
            <div className="space-y-0.5">
              <Label className="text-xs">Reason</Label>
              <Input className="h-8 text-xs" {...register('reason')} />
            </div>
          )}
          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
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
