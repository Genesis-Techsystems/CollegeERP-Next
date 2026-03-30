'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { createFeeStructure, updateFeeStructure } from '@/services/exam-fee-setup'
import { getErrorMessage } from '@/lib/errors'
import { ActiveStatusField } from '@/kit/forms/ActiveStatusField'
import { DEFAULT_ACTIVE_REASON } from '@/config/constants/defaults'
import { QK } from '@/lib/query-keys'
import type { ExamFeeStructure } from '@/types/exam-fee-setup'
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

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  examFeeStructureName: z.string().min(1, 'Name is required'),
  regFee: z.number().min(0, 'Must be >= 0'),
  subject1Fee: z.number().min(0),
  subject2Fee: z.number().min(0),
  subject3Fee: z.number().min(0),
  subject4Fee: z.number().min(0),
  subject5Fee: z.number().min(0),
  subject6Fee: z.number().min(0),
  subject7Fee: z.number().min(0),
  supplyFee: z.number().min(0),
  collectionStartDate: z.string().optional(),
  collectionEndDate: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExamFeeSetupModalProps {
  open: boolean
  onClose: () => void
  /** Existing row for edit; null for add */
  row: ExamFeeStructure | null
  /** Context from the page filter */
  context: {
    examId: number | null
    collegeId?: number | null
    universityId?: number | null
  }
  onSaved: () => void
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function ExamFeeSetupModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: ExamFeeSetupModalProps) {
  const queryClient = useQueryClient()
  const isEdit = row !== null

  const defaultFeeValues: FormValues = {
    examFeeStructureName: '',
    regFee: 0,
    subject1Fee: 0,
    subject2Fee: 0,
    subject3Fee: 0,
    subject4Fee: 0,
    subject5Fee: 0,
    subject6Fee: 0,
    subject7Fee: 0,
    supplyFee: 0,
    collectionStartDate: '',
    collectionEndDate: '',
    isActive: true,
    reason: DEFAULT_ACTIVE_REASON,
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultFeeValues,
  })

  useEffect(() => {
    if (open) {
      if (row) {
        reset({
          examFeeStructureName: row.examFeeStructureName ?? '',
          regFee: row.regFee ?? 0,
          subject1Fee: row.subject1Fee ?? 0,
          subject2Fee: row.subject2Fee ?? 0,
          subject3Fee: row.subject3Fee ?? 0,
          subject4Fee: row.subject4Fee ?? 0,
          subject5Fee: row.subject5Fee ?? 0,
          subject6Fee: row.subject6Fee ?? 0,
          subject7Fee: row.subject7Fee ?? 0,
          supplyFee: row.supplyFee ?? 0,
          collectionStartDate: row.collectionStartDate
            ? row.collectionStartDate.slice(0, 10)
            : '',
          collectionEndDate: row.collectionEndDate
            ? row.collectionEndDate.slice(0, 10)
            : '',
          isActive: row.isActive ?? true,
          reason: row.reason ?? DEFAULT_ACTIVE_REASON,
        })
      } else {
        reset(defaultFeeValues)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        examFeeStructureName: values.examFeeStructureName,
        regFee: values.regFee,
        subject1Fee: values.subject1Fee,
        subject2Fee: values.subject2Fee,
        subject3Fee: values.subject3Fee,
        subject4Fee: values.subject4Fee,
        subject5Fee: values.subject5Fee,
        subject6Fee: values.subject6Fee,
        subject7Fee: values.subject7Fee,
        supplyFee: values.supplyFee,
        collectionStartDate: values.collectionStartDate || null,
        collectionEndDate: values.collectionEndDate || null,
        isActive: values.isActive,
        reason: values.reason,
        // Inject context FK values as flat fields (Spring Boot entity format)
        ...(context.examId != null ? { examId: context.examId } : {}),
        ...(context.collegeId != null ? { collegeId: context.collegeId } : {}),
      }

      if (isEdit && row?.examFeeStructureId != null) {
        await updateFeeStructure(row.examFeeStructureId, payload)
      } else {
        await createFeeStructure(payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.examFeeSetup.all })
      onSaved()
      onClose()
    },
  })

  function onSubmit(values: FormValues) {
    mutation.mutate(values)
  }

  // Subject fee fields (1-7)
  const subjectFeeFields = [1, 2, 3, 4, 5, 6, 7] as const

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
          <DialogDescription>
            Configure registration fees, per-subject fees, and collection dates for this exam.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="examFeeStructureName">Fee Structure Name *</Label>
            <Input id="examFeeStructureName" {...register('examFeeStructureName')} />
            {errors.examFeeStructureName && (
              <p className="text-xs text-destructive">{errors.examFeeStructureName.message}</p>
            )}
          </div>

          {/* Reg fee + Supply fee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="regFee">Registration Fee (₹)</Label>
              <Input id="regFee" type="number" min={0} step="0.01" {...register('regFee', { valueAsNumber: true })} />
              {errors.regFee && (
                <p className="text-xs text-destructive">{errors.regFee.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="supplyFee">Supplementary Fee (₹)</Label>
              <Input id="supplyFee" type="number" min={0} step="0.01" {...register('supplyFee', { valueAsNumber: true })} />
              {errors.supplyFee && (
                <p className="text-xs text-destructive">{errors.supplyFee.message}</p>
              )}
            </div>
          </div>

          {/* Per-subject fees */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Per-Subject Fees (₹)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subjectFeeFields.map((n) => {
                const fieldName = `subject${n}Fee` as keyof FormValues
                return (
                  <div key={n} className="space-y-1">
                    <Label htmlFor={fieldName}>Subject {n}</Label>
                    <Input
                      id={fieldName}
                      type="number"
                      min={0}
                      step="0.01"
                      {...register(fieldName, { valueAsNumber: true })}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Collection dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="collectionStartDate">Collection Start Date</Label>
              <Input
                id="collectionStartDate"
                type="date"
                {...register('collectionStartDate')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="collectionEndDate">Collection End Date</Label>
              <Input
                id="collectionEndDate"
                type="date"
                {...register('collectionEndDate')}
              />
            </div>
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
