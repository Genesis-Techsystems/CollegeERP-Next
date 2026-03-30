'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRevaluationFee, updateRevaluationFee } from '@/services/revaluation-fee.service'
import type { RevaluationFee } from '@/types/revaluation-fee'
import type { ExamMaster } from '@/types/exam-master'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    examFeeStructureName: z.string().min(1, 'Name is required'),
    /** String from <Select> — validated as non-zero */
    examId: z.string().refine((v) => Number(v) > 0, { message: 'Exam is required' }),
    collectionStartDate: z.string().min(1, 'Start date is required'),
    collectionEndDate: z.string().min(1, 'End date is required'),
    regFee: z.string(),
    supplyFee: z.string(),
    isActive: z.boolean(),
    reason: z.string(),
  })
  .refine((d) => !d.collectionStartDate || !d.collectionEndDate || d.collectionEndDate >= d.collectionStartDate, {
    message: 'End date must be on or after start date',
    path: ['collectionEndDate'],
  })

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface RevaluationFeeModalProps {
  open: boolean
  onClose: () => void
  editData: RevaluationFee | null
  /** Available exams for the dropdown */
  exams: ExamMaster[]
  onSuccess: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(val: string | undefined | null): string {
  if (!val) return ''
  return val.slice(0, 10)
}

function getDefaults(record: RevaluationFee | null): FormValues {
  if (record) {
    return {
      examFeeStructureName: record.examFeeStructureName,
      examId: String(record.examId ?? 0),
      collectionStartDate: toDateInput(record.collectionStartDate),
      collectionEndDate: toDateInput(record.collectionEndDate),
      regFee: String(record.regFee ?? 0),
      supplyFee: String(record.supplyFee ?? 0),
      isActive: record.isActive,
      reason: record.reason ?? 'active',
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  return {
    examFeeStructureName: '',
    examId: '0',
    collectionStartDate: today,
    collectionEndDate: today,
    regFee: '0',
    supplyFee: '0',
    isActive: true,
    reason: 'active',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevaluationFeeModal({
  open,
  onClose,
  editData,
  exams = [],
  onSuccess,
}: RevaluationFeeModalProps) {
  const isEdit = editData !== null
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(editData),
  })

  // Reset when modal opens or editData changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(editData))
      setFormError(null)
    }
  }, [open, editData, reset])

  const isActive = watch('isActive')

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        examFeeStructureName: values.examFeeStructureName,
        examId: Number(values.examId),
        collectionStartDate: values.collectionStartDate,
        collectionEndDate: values.collectionEndDate,
        regFee: Number(values.regFee),
        supplyFee: Number(values.supplyFee),
        isActive: values.isActive,
        reason: values.reason,
      }
      if (isEdit) {
        return updateRevaluationFee(editData!.examFeeStructureId!, payload)
      }
      return createRevaluationFee(payload)
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Something went wrong')
    },
  })

  function onSubmit(values: FormValues) {
    setFormError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Revaluation Fee Setup' : 'Add Revaluation Fee Setup'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the revaluation fee configuration.'
              : 'Configure revaluation fee for an exam.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/30">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Fee Structure Name */}
          <div className="space-y-1.5">
            <Label htmlFor="examFeeStructureName">
              Fee Structure Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="examFeeStructureName"
              {...register('examFeeStructureName')}
              placeholder="e.g. Nov 2024 Revaluation Fee"
            />
            {errors.examFeeStructureName && (
              <p className="text-xs text-destructive">{errors.examFeeStructureName.message}</p>
            )}
          </div>

          {/* Exam */}
          <div className="space-y-1.5">
            <Label htmlFor="examId">
              Exam <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="examId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="examId">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.examId} value={String(e.examId)}>
                        {e.examName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.examId && (
              <p className="text-xs text-destructive">{errors.examId.message}</p>
            )}
          </div>

          {/* Collection Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="collectionStartDate">
                Collection Start <span className="text-destructive">*</span>
              </Label>
              <Input
                id="collectionStartDate"
                {...register('collectionStartDate')}
                type="date"
              />
              {errors.collectionStartDate && (
                <p className="text-xs text-destructive">{errors.collectionStartDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="collectionEndDate">
                Collection End <span className="text-destructive">*</span>
              </Label>
              <Input
                id="collectionEndDate"
                {...register('collectionEndDate')}
                type="date"
              />
              {errors.collectionEndDate && (
                <p className="text-xs text-destructive">{errors.collectionEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="regFee">Regular Re-check Fee (₹)</Label>
              <Input
                id="regFee"
                {...register('regFee')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.regFee && (
                <p className="text-xs text-destructive">{errors.regFee.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplyFee">Supply Re-check Fee (₹)</Label>
              <Input
                id="supplyFee"
                {...register('supplyFee')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              {errors.supplyFee && (
                <p className="text-xs text-destructive">{errors.supplyFee.message}</p>
              )}
            </div>
          </div>

          {/* Is Active + optional Reason */}
          <div className="space-y-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Is Active</Label>
                </div>
              )}
            />
            {!isActive && (
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason for Deactivation</Label>
                <Input
                  id="reason"
                  {...register('reason')}
                  placeholder="Reason for deactivation"
                />
              </div>
            )}
          </div>

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
