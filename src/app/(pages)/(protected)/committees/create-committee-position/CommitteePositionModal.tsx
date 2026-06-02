'use client'

import { useEffect, useState } from 'react'
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
import { createCommitteePosition, updateCommitteePosition } from '@/services'
import type { UnivCommitteePosition } from '@/types/committees'

const schema = z.object({
  committeePossitoinName: z.string().min(1, 'Committee position is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: UnivCommitteePosition | null): FormValues {
  return {
    committeePossitoinName: edit?.committeePossitoinName ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: UnivCommitteePosition | null
  organizationId: number
  onSaved: () => void
}

export default function CommitteePositionModal({ open, onClose, editData, organizationId, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)

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
    setSubmitError(null)
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<UnivCommitteePosition> = {
        committeePossitoinName: values.committeePossitoinName.trim(),
        organizationId,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
      }
      if (editData) {
        await updateCommitteePosition(editData.univCommitteePositionId, payload)
      } else {
        await createCommitteePosition(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save committee position.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Committee Position' : 'Add Committee Position'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="space-y-0.5">
            <Label className="text-xs">Committee Position *</Label>
            <Input className="h-8 text-xs" {...register('committeePossitoinName')} />
            {errors.committeePossitoinName && (
              <p className="text-xs text-red-500">{errors.committeePossitoinName.message}</p>
            )}
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
