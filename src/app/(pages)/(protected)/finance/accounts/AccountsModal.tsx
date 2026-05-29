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
import { createAccountEntity, listCollegesActive, updateAccountEntity } from '@/services'
import type { AccountEntity } from '@/types/finance'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  entityName: z.string().min(1, 'Entity name is required'),
  entityCode: z.string().min(1, 'Entity code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: AccountEntity | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    entityName: edit?.entityName ?? '',
    entityCode: edit?.entityCode ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: AccountEntity | null
  onSaved: () => void
}

export default function AccountsModal({ open, onClose, editData, onSaved }: Props) {
  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ['College', 'active'],
    queryFn: listCollegesActive,
    enabled: open,
  })

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
  )

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
    const payload: Partial<AccountEntity> = {
      collegeId: values.collegeId,
      entityName: values.entityName.trim(),
      entityCode: values.entityCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateAccountEntity(editData.accountEntityId, payload)
    } else {
      await createAccountEntity(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Entity' : 'Add Entity'}
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
                onChange={(v) => field.onChange(Number(v))}
                options={collegeOptions}
                placeholder="Select college"
                isLoading={collegesLoading}
                searchable
              />
            )}
          />
          {errors.collegeId && <p className="text-xs text-red-500">{errors.collegeId.message}</p>}
          <div className="space-y-0.5">
            <Label className="text-xs">Entity Code *</Label>
            <Input className="h-8 text-xs" {...register('entityCode')} />
            {errors.entityCode && <p className="text-xs text-red-500">{errors.entityCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Entity Name *</Label>
            <Input className="h-8 text-xs" {...register('entityName')} />
            {errors.entityName && <p className="text-xs text-red-500">{errors.entityName.message}</p>}
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
