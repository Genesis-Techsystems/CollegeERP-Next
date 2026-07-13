'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { requiredNumber } from '@/lib/zod-fields'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createUnivEcQuestionPaperConfig,
  listAllActiveUnivExamCenters,
  pickUnivEcQuestionPaperConfigId,
  updateUnivEcQuestionPaperConfig,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

const schema = z
  .object({
    univExamCentersId: z.preprocess(
      (val) => {
        const n = Number(val)
        return Number.isFinite(n) && n > 0 ? n : undefined
      },
      requiredNumber('Exam center is required'),
    ),
    systemIpAddress: z.string().min(1, 'System IP address is required'),
    macAddress: z.string().min(1, 'Mac address is required'),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isActive && !data.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required when inactive',
        path: ['reason'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

const FIELD_INPUT =
  'h-9 min-w-0 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-[13px] font-medium text-foreground shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 placeholder:font-normal focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/12 disabled:bg-muted/40'
const FIELD_LABEL = 'text-[12px] font-semibold leading-tight tracking-wide text-[hsl(218_32%_22%)]'
const FORM_ROW = 'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2'

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? 'min-w-0 space-y-1.5'}>
      <Label htmlFor={htmlFor} className={FIELD_LABEL}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

function rowToFormValues(row: Row | null): FormValues {
  if (!row) {
    return {
      univExamCentersId: undefined as unknown as number,
      systemIpAddress: '',
      macAddress: '',
      isActive: true,
      reason: '',
    }
  }
  const centerId = num(row.univExamCentersaId ?? row.univExamCentersId ?? row.univExamcenterId)
  return {
    univExamCentersId: centerId > 0 ? centerId : (undefined as unknown as number),
    systemIpAddress: txt(row.systemIpAddress),
    macAddress: txt(row.macAddress),
    isActive: row.isActive === true,
    reason: txt(row.reason),
  }
}

export interface QuestionPaperConfigModalProps {
  open: boolean
  onClose: () => void
  config: Row | null
  onSaved: () => void
}

export default function QuestionPaperConfigModal({
  open,
  onClose,
  config,
  onSaved,
}: QuestionPaperConfigModalProps) {
  const isEditing = config != null
  const [centers, setCenters] = useState<Row[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: rowToFormValues(null),
  })

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [centers],
  )

  useEffect(() => {
    if (!open) return
    let mounted = true
    void (async () => {
      try {
        const centerRows = await listAllActiveUnivExamCenters()
        if (!mounted) return
        setCenters(Array.isArray(centerRows) ? centerRows : [])
      } catch {
        if (mounted) setCenters([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    reset(rowToFormValues(config))
    setSubmitError(null)
  }, [config, open, reset])

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    const payload: Record<string, unknown> = {
      univExamCentersId: data.univExamCentersId,
      systemIpAddress: data.systemIpAddress.trim(),
      macAddress: data.macAddress.trim(),
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() ?? ''),
    }

    try {
      const id = pickUnivEcQuestionPaperConfigId(config ?? {})
      if (id > 0) {
        await updateUnivEcQuestionPaperConfig(id, { ...payload, univEcQuestionPaperConfigId: id })
        toastSuccess('Question paper config updated.')
      } else {
        await createUnivEcQuestionPaperConfig(payload)
        toastSuccess('Question paper config created.')
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Save failed')
      toastError(e, 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent closeOnOutsideClick={false} className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Question Paper Config' : 'Add Question Paper Config'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className={FORM_ROW}>
            <Field
              label="Exam Center"
              required
              error={errors.univExamCentersId?.message}
              className="min-w-0 space-y-1.5 sm:col-span-2"
            >
              <Controller
                name="univExamCentersId"
                control={control}
                render={({ field }) => (
                  <Select
                    options={centerOptions}
                    value={field.value > 0 ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    placeholder="Select exam center"
                    className="h-9 text-[13px]"
                  />
                )}
              />
            </Field>
            <Field
              label="System IP Address"
              required
              error={errors.systemIpAddress?.message}
              htmlFor="systemIpAddress"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="systemIpAddress"
                className={FIELD_INPUT}
                {...register('systemIpAddress')}
                placeholder="e.g. 192.168.1.1"
              />
            </Field>
            <Field
              label="Mac Address"
              required
              error={errors.macAddress?.message}
              htmlFor="macAddress"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="macAddress"
                className={FIELD_INPUT}
                {...register('macAddress')}
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
              />
            </Field>
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
                reasonRequired={!field.value}
              />
            )}
          />

          {submitError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{submitError}</p>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border/60 pt-3 sm:justify-end">
            <Button type="button" variant="outline" className="h-9 min-w-[5.5rem]" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="h-9 min-w-[5.5rem]" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
