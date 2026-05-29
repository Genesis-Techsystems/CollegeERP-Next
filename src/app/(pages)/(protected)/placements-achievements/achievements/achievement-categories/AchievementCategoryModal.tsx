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
import { listOrganizations } from '@/services/admin/organization'
import { createAchievementCategory, updateAchievementCategory } from '@/services/placements'
import type { AchievementCategory } from '@/types/placements'
import type { Organization } from '@/types/organization'

const schema = z.object({
  organizationId: z.string().min(1, 'Organization is required'),
  achievementCategory: z.string().min(1, 'Category name is required'),
  achievementCategoryCode: z.string().min(1, 'Category code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: AchievementCategory | null): FormValues {
  return {
    organizationId: String(edit?.organizationId ?? ''),
    achievementCategory: edit?.achievementCategory ?? '',
    achievementCategoryCode: edit?.achievementCategoryCode ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: AchievementCategory | null
  onSaved: () => void
}

export default function AchievementCategoryModal({ open, onClose, editData, onSaved }: Props) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
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
    listOrganizations().then(setOrganizations).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload = {
        organizationId: Number(values.organizationId),
        achievementCategory: values.achievementCategory,
        achievementCategoryCode: values.achievementCategoryCode,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateAchievementCategory(editData.categoryId, payload)
      } else {
        await createAchievementCategory(payload)
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
            {editData ? 'Edit Achievement Category' : 'Add Achievement Category'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="space-y-0.5">
            <Label className="text-xs">Organization *</Label>
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.organizationId} value={String(o.organizationId)}>{o.orgName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.organizationId && <p className="text-xs text-red-500">{errors.organizationId.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Category Name *</Label>
            <Input className="h-8 text-xs" {...register('achievementCategory')} placeholder="Achievement category" />
            {errors.achievementCategory && <p className="text-xs text-red-500">{errors.achievementCategory.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Category Code *</Label>
            <Input className="h-8 text-xs" {...register('achievementCategoryCode')} placeholder="e.g. SPORTS" />
            {errors.achievementCategoryCode && <p className="text-xs text-red-500">{errors.achievementCategoryCode.message}</p>}
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox id="catIsActive" checked={field.value} onCheckedChange={field.onChange} />
                <label htmlFor="catIsActive" className="text-xs">Active</label>
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
