'use client'

import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createInvigilatorRemuneration,
  updateInvigilatorRemuneration,
} from '@/services/invigilator-remuneration'
import { domainList } from '@/services/crud'
import { INVIG_REMUNERATION_API } from '@/config/constants/api'
import { useEntityForm } from '@/hooks/useEntityForm'
import { ActiveStatusField } from '@/kit/forms/ActiveStatusField'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_ACTIVE_REASON } from '@/config/constants/defaults'
import type { InvigilatorRemuneration } from '@/types/invigilator-remuneration'
import type { GeneralDetail } from '@/types/exam-master'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    /** String from <Select> — validated as non-empty / non-zero */
    collegeId: z.string().refine((v) => Number(v) > 0, { message: 'College is required' }),
    invgdesignationCatId: z.string().refine((v) => Number(v) > 0, { message: 'Designation is required' }),
    amount: z.string().refine((v) => Number(v) > 0, { message: 'Amount must be positive' }),
    fromDate: z.string().min(1, 'From date is required'),
    toDate: z.string().min(1, 'To date is required'),
    isActive: z.boolean(),
    reason: z.string(),
  })
  .refine((d) => !d.fromDate || !d.toDate || d.toDate >= d.fromDate, {
    message: 'To date must be on or after From date',
    path: ['toDate'],
  })

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface InvigilatorRemunerationModalProps {
  open: boolean
  onClose: () => void
  editData: InvigilatorRemuneration | null
  /** Pre-filled college options from the parent page's filter data */
  colleges: { collegeId: number; collegeName: string }[]
  onSuccess: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(val: string | undefined | null): string {
  if (!val) return ''
  // Spring Boot returns "YYYY-MM-DDTHH:mm:ss" — trim to "YYYY-MM-DD"
  return val.slice(0, 10)
}

function getDefaults(record: InvigilatorRemuneration | null): FormValues {
  if (record) {
    return {
      collegeId: String(record.collegeId),
      invgdesignationCatId: String(record.invgdesignationCatId ?? 0),
      amount: String(record.amount),
      fromDate: toDateInput(record.fromDate),
      toDate: toDateInput(record.toDate),
      isActive: record.isActive,
      reason: record.reason ?? DEFAULT_ACTIVE_REASON,
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  return {
    collegeId: '0',
    invgdesignationCatId: '0',
    amount: '0',
    fromDate: today,
    toDate: today,
    isActive: true,
    reason: DEFAULT_ACTIVE_REASON,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvigilatorRemunerationModal({
  open,
  onClose,
  editData,
  colleges = [],
  onSuccess,
}: InvigilatorRemunerationModalProps) {
  // Load invigilator designation types
  const { data: designations = [] } = useQuery({
    queryKey: ['GeneralDetail', INVIG_REMUNERATION_API.INVIG_DESG_GM_CODE],
    queryFn: () =>
      domainList<GeneralDetail>(
        'GeneralDetail',
        `GeneralMaster.generalMasterCode==${INVIG_REMUNERATION_API.INVIG_DESG_GM_CODE}.and.isActive==true`,
      ),
  })

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
  } = useEntityForm<InvigilatorRemuneration, FormValues>(schema, getDefaults, open, editData)

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        collegeId: Number(values.collegeId),
        invgdesignationCatId: Number(values.invgdesignationCatId),
        amount: Number(values.amount),
        fromDate: values.fromDate,
        toDate: values.toDate,
        isActive: values.isActive,
        reason: values.reason,
      }
      if (isEdit) {
        return updateInvigilatorRemuneration(editData!.examInvgRemunerationId, payload)
      }
      return createInvigilatorRemuneration(payload)
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Invigilator Remuneration' : 'Add Invigilator Remuneration'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the remuneration rate for this designation.'
              : 'Configure pay rate for an invigilator designation.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md px-3 py-2 text-sm bg-destructive/10 text-destructive border border-destructive/30">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* College */}
          <div className="space-y-1.5">
            <Label htmlFor="collegeId">
              College <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="collegeId">
                    <SelectValue placeholder="Select College" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c.collegeId} value={String(c.collegeId)}>
                        {c.collegeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.collegeId && (
              <p className="text-xs text-destructive">{errors.collegeId.message}</p>
            )}
          </div>

          {/* Invigilator Designation */}
          <div className="space-y-1.5">
            <Label htmlFor="invgdesignationCatId">
              Designation <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="invgdesignationCatId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invgdesignationCatId">
                    <SelectValue placeholder="Select Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.generalDetailId} value={String(d.generalDetailId)}>
                        {d.generalDetailDisplayName ?? d.generalDetailName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.invgdesignationCatId && (
              <p className="text-xs text-destructive">{errors.invgdesignationCatId.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Amount per session (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              {...register('amount')}
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 500"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* From Date | To Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fromDate">
                From Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fromDate"
                {...register('fromDate')}
                type="date"
              />
              {errors.fromDate && (
                <p className="text-xs text-destructive">{errors.fromDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toDate">
                To Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="toDate"
                {...register('toDate')}
                type="date"
              />
              {errors.toDate && (
                <p className="text-xs text-destructive">{errors.toDate.message}</p>
              )}
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
