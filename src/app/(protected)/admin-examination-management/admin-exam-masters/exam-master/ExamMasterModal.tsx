'use client'

import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Paperclip, X } from 'lucide-react'
import type { ExamMaster } from '@/types/exam-master'
import { createExamMaster, updateExamMaster, uploadExamFiles } from '@/services/exam-master.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/forms/DatePicker'
import MonthYearPicker from '@/components/forms/MonthYearPicker'

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z
  .object({
    examName: z.string().min(1, 'Required'),
    examShortName: z.string().min(1, 'Required'),
    examMonthYr: z.date().nullable(),
    fromDate: z.date().nullable(),
    toDate: z.date().nullable(),
    isRegularExam: z.boolean(),
    isSupplyExam: z.boolean(),
    isInternalExam: z.boolean(),
    isPublished: z.boolean(),
    isResultprocessStarted: z.boolean(),
    isActive: z.boolean(),
    reason: z.string(),
    notificationPublishedOn: z.date().nullable(),
    feeNotificationPublishedOn: z.date().nullable(),
  })
  .refine((d) => d.isRegularExam || d.isSupplyExam || d.isInternalExam, {
    message: 'Select at least one exam type (Regular, Supply, or Internal)',
    path: ['isRegularExam'],
  })

type FormValues = z.infer<typeof schema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface ExamMasterModalProps {
  open: boolean
  onClose: () => void
  exam: ExamMaster | null
  context: {
    universityId: number | null
    collegeId: number | null
    courseId: number | null
    academicYearId: number | null
  }
  onSaved: () => void
}

// ─── FileInput ───────────────────────────────────────────────────────────────

function FileInput({
  file,
  onChange,
  existingPath,
}: {
  file: File | null
  onChange: (f: File | null) => void
  existingPath?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const displayName = file
    ? file.name
    : existingPath
    ? (existingPath.split('cms/')[1] ?? existingPath).split('/').pop()
    : null

  return (
    <div className="mt-1">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
          {displayName ? 'Replace' : 'Choose file'}
        </Button>
        {displayName && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-slate-500 truncate max-w-[140px]">{displayName}</span>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 text-slate-400 hover:text-slate-600"
                onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = '' }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        {!displayName && (
          <span className="text-xs text-slate-400">No file chosen</span>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(val: string | undefined | null): Date | null {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function toISOOrNull(val: Date | null): string | null {
  return val ? val.toISOString() : null
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExamMasterModal({
  open,
  onClose,
  exam,
  context,
  onSaved,
}: ExamMasterModalProps) {
  const isEdit = exam !== null

  const [notificationFile, setNotificationFile] = useState<File | null>(null)
  const [feeNotificationFile, setFeeNotificationFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(exam),
  })

  // Reset form when exam/open changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(exam))
      setNotificationFile(null)
      setFeeNotificationFile(null)
      setToast(null)
    }
  }, [open, exam, reset])

  // Watch examMonthYr → sync fromDate/toDate
  const examMonthYr = watch('examMonthYr')
  useEffect(() => {
    if (examMonthYr) {
      const d = new Date(examMonthYr.getFullYear(), examMonthYr.getMonth(), 1)
      setValue('fromDate', d)
      setValue('toDate', d)
    }
  }, [examMonthYr, setValue])

  // Watch toDate < fromDate validation
  const fromDate = watch('fromDate')
  const toDate = watch('toDate')
  useEffect(() => {
    if (fromDate && toDate && toDate < fromDate) {
      setValue('toDate', fromDate)
      setToast({ message: 'To Date cannot be before From Date. Reset to From Date.', type: 'error' })
    }
  }, [fromDate, toDate, setValue])

  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setToast(null)
    try {
      const payload = buildPayload(values, exam, context)

      let savedExam: ExamMaster
      if (isEdit) {
        savedExam = await updateExamMaster(exam!.examId, payload)
      } else {
        savedExam = await createExamMaster(payload)
      }

      // Upload files if any
      await uploadExamFiles(savedExam.examId, notificationFile, feeNotificationFile)

      onSaved()
      onClose()
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Something went wrong',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the exam master record.' : 'Create a new exam master record.'}
          </DialogDescription>
        </DialogHeader>

        {toast && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Exam Name — full width */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Exam Name</label>
            <input
              {...register('examName')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.examName && <p className="text-xs text-red-500">{errors.examName.message}</p>}
          </div>

          {/* Exam Short Name | Month/Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Exam Short Name</label>
              <input
                {...register('examShortName')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {errors.examShortName && <p className="text-xs text-red-500">{errors.examShortName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Exam Month/Year</label>
              <Controller
                control={control}
                name="examMonthYr"
                render={({ field }) => (
                  <MonthYearPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* From Date | To Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">From Date</label>
              <Controller
                control={control}
                name="fromDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">To Date</label>
              <Controller
                control={control}
                name="toDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* Exam Type checkboxes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Exam Type</label>
            <div className="flex gap-6">
              <Controller
                control={control}
                name="isRegularExam"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Regular
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isSupplyExam"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Supple
                  </label>
                )}
              />
              <Controller
                control={control}
                name="isInternalExam"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Internal
                  </label>
                )}
              />
            </div>
            {errors.isRegularExam && (
              <p className="text-xs text-red-500 mt-1">{errors.isRegularExam.message}</p>
            )}
          </div>

          {/* Is Published | Is Result Process Started */}
          <div className="flex gap-6">
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Is Published
                </label>
              )}
            />
            <Controller
              control={control}
              name="isResultprocessStarted"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Is Result Process Started
                </label>
              )}
            />
          </div>

          {/* Notification Published On | Notification File */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notification Published On</label>
              <Controller
                control={control}
                name="notificationPublishedOn"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notification File</label>
              <FileInput
                file={notificationFile}
                onChange={setNotificationFile}
                existingPath={isEdit ? exam?.notificationFilePath : undefined}
              />
            </div>
          </div>

          {/* Fee Notification Published On | Fee Notification File */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Fee Notification Published On</label>
              <Controller
                control={control}
                name="feeNotificationPublishedOn"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Fee Notification File</label>
              <FileInput
                file={feeNotificationFile}
                onChange={setFeeNotificationFile}
                existingPath={isEdit ? exam?.feeNotificationFilePath : undefined}
              />
            </div>
          </div>

          {/* Is Active | Reason */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-sm pt-6">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Is Active
                </label>
              )}
            />
            {!isActive && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Reason</label>
                <input
                  {...register('reason')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaults(exam: ExamMaster | null): FormValues {
  if (exam) {
    return {
      examName: exam.examName,
      examShortName: exam.examShortName,
      examMonthYr: parseDate(exam.examMonthYr),
      fromDate: parseDate(exam.fromDate),
      toDate: parseDate(exam.toDate),
      isRegularExam: exam.isRegularExam,
      isSupplyExam: exam.isSupplyExam,
      isInternalExam: exam.isInternalExam,
      isPublished: exam.isPublished,
      isResultprocessStarted: exam.isResultprocessStarted,
      isActive: exam.isActive,
      reason: exam.reason ?? '',
      notificationPublishedOn: parseDate(exam.notificationPublishedOn),
      feeNotificationPublishedOn: parseDate(exam.feeNotificationPublishedOn),
    }
  }
  return {
    examName: '',
    examShortName: '',
    examMonthYr: null,
    fromDate: new Date(),
    toDate: new Date(),
    isRegularExam: false,
    isSupplyExam: false,
    isInternalExam: false,
    isPublished: false,
    isResultprocessStarted: false,
    isActive: true,
    reason: 'active',
    notificationPublishedOn: new Date(),
    feeNotificationPublishedOn: new Date(),
  }
}

function buildPayload(
  values: FormValues,
  exam: ExamMaster | null,
  ctx: ExamMasterModalProps['context']
) {
  return {
    ...(exam ? { examId: exam.examId } : {}),
    examName: values.examName,
    examShortName: values.examShortName,
    examMonthYr: toISOOrNull(values.examMonthYr),
    fromDate: toISOOrNull(values.fromDate),
    toDate: toISOOrNull(values.toDate),
    isRegularExam: values.isRegularExam,
    isSupplyExam: values.isSupplyExam,
    isInternalExam: values.isInternalExam,
    isPublished: values.isPublished,
    isResultprocessStarted: values.isResultprocessStarted,
    isActive: values.isActive,
    reason: values.reason,
    notificationPublishedOn: toISOOrNull(values.notificationPublishedOn),
    feeNotificationPublishedOn: toISOOrNull(values.feeNotificationPublishedOn),
    universityId: ctx.universityId ?? undefined,
    collegeId: ctx.collegeId ?? undefined,
    courseId: ctx.courseId ?? undefined,
    academicYearId: ctx.academicYearId ?? undefined,
  }
}
