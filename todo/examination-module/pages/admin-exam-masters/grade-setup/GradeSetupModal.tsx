'use client'

import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
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
import { createExamGrade, updateExamGrade } from '@/services/exam-grade'
import { useEntityForm } from '@/hooks/useEntityForm'
import { ActiveStatusField } from '@/kit/forms/ActiveStatusField'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_ACTIVE_REASON } from '@/config/constants/defaults'
import type { ExamGrade } from '@/types/exam-grade'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z
  .object({
    gradeName: z.string().min(1, 'Grade name is required'),
    gradeCode: z.string().min(1, 'Grade code is required'),
    minPoints: z.number({ message: 'Required' }).min(0, 'Min points must be ≥ 0'),
    maxPoints: z.number({ message: 'Required' }).min(0, 'Max points must be ≥ 0'),
    minScorePercent: z
      .number({ message: 'Required' })
      .min(0, 'Must be between 0–100')
      .max(100, 'Must be between 0–100'),
    maxScorePercent: z
      .number({ message: 'Required' })
      .min(0, 'Must be between 0–100')
      .max(100, 'Must be between 0–100'),
    creditPoints: z.number({ message: 'Required' }).min(0, 'Credit points must be ≥ 0'),
    description: z.string(),
    isActive: z.boolean(),
    reason: z.string(),
  })
  .refine((data) => data.maxScorePercent > data.minScorePercent, {
    message: 'Max score % must be greater than min score %',
    path: ['maxScorePercent'],
  })
  .refine((data) => data.maxPoints >= data.minPoints, {
    message: 'Max points must be ≥ min points',
    path: ['maxPoints'],
  })

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface GradeSetupContext {
  universityId: number | null
  courseId: number | null
  regulationId: number | null
  isForDisabled: boolean
}

interface GradeSetupModalProps {
  open: boolean
  onClose: () => void
  editData: ExamGrade | null
  context: GradeSetupContext
  onSuccess: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaults(grade: ExamGrade | null): FormValues {
  if (grade) {
    return {
      gradeName: grade.gradeName,
      gradeCode: grade.gradeCode,
      minPoints: grade.minPoints,
      maxPoints: grade.maxPoints,
      minScorePercent: grade.minScorePercent,
      maxScorePercent: grade.maxScorePercent,
      creditPoints: grade.creditPoints,
      description: grade.description ?? '',
      isActive: grade.isActive,
      reason: grade.reason ?? DEFAULT_ACTIVE_REASON,
    }
  }
  return {
    gradeName: '',
    gradeCode: '',
    minPoints: 0,
    maxPoints: 0,
    minScorePercent: 0,
    maxScorePercent: 100,
    creditPoints: 0,
    description: '',
    isActive: true,
    reason: DEFAULT_ACTIVE_REASON,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GradeSetupModal({
  open,
  onClose,
  editData,
  context,
  onSuccess,
}: GradeSetupModalProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    isEdit,
    formError,
    setFormError,
  } = useEntityForm<ExamGrade, FormValues>(schema, getDefaults, open, editData)

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        universityId: context.universityId ?? undefined,
        courseId: context.courseId ?? undefined,
        regulationId: context.regulationId ?? undefined,
        isForDisabled: context.isForDisabled,
      }
      if (isEdit) {
        return updateExamGrade(editData!.examGradesId, payload)
      }
      return createExamGrade(payload)
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (err: Error) => {
      setFormError(getErrorMessage(err))
    },
  })

  function onSubmit(values: FormValues) {
    setFormError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the grade threshold configuration.'
              : 'Define a new grade band with score range and credit points.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md px-3 py-2 text-sm bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)/0.3)]">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Grade Name | Grade Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Grade Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('gradeName')}
                placeholder="e.g. A+"
              />
              {errors.gradeName && (
                <p className="text-xs text-destructive">{errors.gradeName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                Grade Code <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('gradeCode')}
                placeholder="e.g. A_PLUS"
              />
              {errors.gradeCode && (
                <p className="text-xs text-destructive">{errors.gradeCode.message}</p>
              )}
            </div>
          </div>

          {/* Min Score % | Max Score % */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min Score %</Label>
              <Input
                {...register('minScorePercent', { valueAsNumber: true })}
                type="number"
                min={0}
                max={100}
                step={0.01}
              />
              {errors.minScorePercent && (
                <p className="text-xs text-destructive">{errors.minScorePercent.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Max Score %</Label>
              <Input
                {...register('maxScorePercent', { valueAsNumber: true })}
                type="number"
                min={0}
                max={100}
                step={0.01}
              />
              {errors.maxScorePercent && (
                <p className="text-xs text-destructive">{errors.maxScorePercent.message}</p>
              )}
            </div>
          </div>

          {/* Min Points | Max Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min Points (GPA)</Label>
              <Input
                {...register('minPoints', { valueAsNumber: true })}
                type="number"
                min={0}
                step={0.01}
              />
              {errors.minPoints && (
                <p className="text-xs text-destructive">{errors.minPoints.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Max Points (GPA)</Label>
              <Input
                {...register('maxPoints', { valueAsNumber: true })}
                type="number"
                min={0}
                step={0.01}
              />
              {errors.maxPoints && (
                <p className="text-xs text-destructive">{errors.maxPoints.message}</p>
              )}
            </div>
          </div>

          {/* Credit Points */}
          <div className="space-y-1.5">
            <Label>Credit Points</Label>
            <Input
              {...register('creditPoints', { valueAsNumber: true })}
              type="number"
              min={0}
              step={0.01}
            />
            {errors.creditPoints && (
              <p className="text-xs text-destructive">{errors.creditPoints.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              {...register('description')}
              placeholder="Optional description"
            />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
