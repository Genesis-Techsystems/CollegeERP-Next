'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { saveMarksSetup } from '@/services/exam-max-marks'
import { getErrorMessage } from '@/lib/errors'
import { ActiveStatusField } from '@/kit/forms/ActiveStatusField'
import { DEFAULT_ACTIVE_REASON } from '@/config/constants/defaults'
import { QK } from '@/lib/query-keys'
import type { ExamMarksSetup } from '@/types/exam-max-marks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  marksSetupName: z.string().min(1, 'Name is required'),
  internalMarks: z.number().min(0, 'Must be >= 0'),
  externalMarks: z.number().min(0, 'Must be >= 0'),
  passPercentage: z.number().min(0).max(100, 'Must be 0-100'),
  externalPassPercentage: z.number().min(0).max(100, 'Must be 0-100'),
  finalIntPercentage: z.number().min(0).max(100, 'Must be 0-100').optional(),
  finalExtPercentage: z.number().min(0).max(100, 'Must be 0-100').optional(),
  isForDisabled: z.boolean(),
  isActive: z.boolean(),
  reason: z.string(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExamMaxMarksModalProps {
  open: boolean
  onClose: () => void
  /** Existing row for edit mode; null for create mode */
  row: ExamMarksSetup | null
  /** Context from the page filter (pre-filled on save) */
  context: {
    universityId: number | null
    courseId: number | null
    regulationId: number | null
    isForDisabled: boolean
  }
  /** Called after a successful save so the parent can refresh the list */
  onSaved: () => void
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function ExamMaxMarksModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: ExamMaxMarksModalProps) {
  const queryClient = useQueryClient()
  const isEdit = row !== null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      marksSetupName: '',
      internalMarks: 0,
      externalMarks: 0,
      passPercentage: 0,
      externalPassPercentage: 0,
      finalIntPercentage: undefined,
      finalExtPercentage: undefined,
      isForDisabled: false,
      isActive: true,
      reason: DEFAULT_ACTIVE_REASON,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (row) {
        reset({
          marksSetupName: row.marksSetupName ?? '',
          internalMarks: row.internalMarks ?? 0,
          externalMarks: row.externalMarks ?? 0,
          passPercentage: row.passPercentage ?? 0,
          externalPassPercentage: row.externalPassPercentage ?? 0,
          finalIntPercentage: row.finalIntPercentage ?? undefined,
          finalExtPercentage: row.finalExtPercentage ?? undefined,
          isForDisabled: row.isForDisabled ?? false,
          isActive: row.isActive ?? true,
          reason: row.reason ?? DEFAULT_ACTIVE_REASON,
        })
      } else {
        reset({
          marksSetupName: '',
          internalMarks: 0,
          externalMarks: 0,
          passPercentage: 0,
          externalPassPercentage: 0,
          finalIntPercentage: undefined,
          finalExtPercentage: undefined,
          isForDisabled: context.isForDisabled,
          isActive: true,
          reason: DEFAULT_ACTIVE_REASON,
        })
      }
    }
  }, [open, row, context.isForDisabled, reset])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Build the payload array (backend accepts array)
      const payload: ExamMarksSetup = {
        ...(row?.markssetupId != null ? { markssetupId: row.markssetupId } : {}),
        marksSetupName: values.marksSetupName,
        internalMarks: values.internalMarks,
        externalMarks: values.externalMarks,
        passPercentage: values.passPercentage,
        externalPassPercentage: values.externalPassPercentage,
        finalIntPercentage: values.finalIntPercentage,
        finalExtPercentage: values.finalExtPercentage,
        isForDisabled: values.isForDisabled,
        isActive: values.isActive,
        reason: values.reason,
        // Inject context FK values
        ...(context.regulationId != null ? { regulationId: context.regulationId } : {}),
        ...(context.universityId != null ? { universityId: context.universityId } : {}),
        ...(context.courseId != null ? { courseId: context.courseId } : {}),
      }
      await saveMarksSetup([payload])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.examMaxMarks.all })
      onSaved()
      onClose()
    },
  })

  function onSubmit(values: FormValues) {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Marks Setup' : 'Add Marks Setup'}</DialogTitle>
          <DialogDescription>
            Configure internal and external marks for this subject category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="marksSetupName">Setup Name *</Label>
            <Input id="marksSetupName" {...register('marksSetupName')} />
            {errors.marksSetupName && (
              <p className="text-xs text-destructive">{errors.marksSetupName.message}</p>
            )}
          </div>

          {/* Internal / External marks side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="internalMarks">Internal Marks</Label>
              <Input
                id="internalMarks"
                type="number"
                min={0}
                {...register('internalMarks', { valueAsNumber: true })}
              />
              {errors.internalMarks && (
                <p className="text-xs text-destructive">{errors.internalMarks.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalMarks">External Marks</Label>
              <Input
                id="externalMarks"
                type="number"
                min={0}
                {...register('externalMarks', { valueAsNumber: true })}
              />
              {errors.externalMarks && (
                <p className="text-xs text-destructive">{errors.externalMarks.message}</p>
              )}
            </div>
          </div>

          {/* Pass percentages */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="passPercentage">Internal Pass %</Label>
              <Input
                id="passPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register('passPercentage', { valueAsNumber: true })}
              />
              {errors.passPercentage && (
                <p className="text-xs text-destructive">{errors.passPercentage.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalPassPercentage">External Pass %</Label>
              <Input
                id="externalPassPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register('externalPassPercentage', { valueAsNumber: true })}
              />
              {errors.externalPassPercentage && (
                <p className="text-xs text-destructive">{errors.externalPassPercentage.message}</p>
              )}
            </div>
          </div>

          {/* Final percentages */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="finalIntPercentage">Final Int %</Label>
              <Input
                id="finalIntPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register('finalIntPercentage', { valueAsNumber: true })}
              />
              {errors.finalIntPercentage && (
                <p className="text-xs text-destructive">{errors.finalIntPercentage.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="finalExtPercentage">Final Ext %</Label>
              <Input
                id="finalExtPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register('finalExtPercentage', { valueAsNumber: true })}
              />
              {errors.finalExtPercentage && (
                <p className="text-xs text-destructive">{errors.finalExtPercentage.message}</p>
              )}
            </div>
          </div>

          {/* Is For Disabled */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isForDisabled"
              checked={watch('isForDisabled')}
              onCheckedChange={(v) => setValue('isForDisabled', Boolean(v))}
            />
            <Label htmlFor="isForDisabled" className="cursor-pointer">
              Is For Disabled Students
            </Label>
          </div>

          {/* Is Active + optional Reason */}
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason')}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {/* Error */}
          {mutation.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(mutation.error)}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
