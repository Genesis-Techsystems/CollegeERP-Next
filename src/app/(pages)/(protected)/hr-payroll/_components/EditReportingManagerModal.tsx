'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import {
  assignEmployeeReportingManager,
  listActiveDesignationsForHr,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  empDesignationId: z.number().min(1, 'Designation is required'),
  fromDate: z.date({ required_error: 'From date is required' }),
  toDate: z.date({ required_error: 'To date is required' }),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type ReportRow = Record<string, unknown>

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value
  const d = new Date(String(value ?? ''))
  return Number.isNaN(d.getTime()) ? new Date() : d
}

interface EditReportingManagerModalProps {
  open: boolean
  onClose: () => void
  row: ReportRow | null
  onSaved: () => void
}

export function EditReportingManagerModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<EditReportingManagerModalProps>) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empDesignationId: undefined,
      fromDate: new Date(),
      toDate: new Date(),
      isActive: true,
      reason: '',
    },
  })

  const fromDate = watch('fromDate')
  const isActive = watch('isActive')

  const [designationOptions, setDesignationOptions] = useState<SelectOption[]>([])

  useEffect(() => {
    if (!open) return
    void listActiveDesignationsForHr().then((rows) => {
      setDesignationOptions(
        rows.map((d) => ({
          value: String(d.designationId),
          label: String(d.designationName ?? d.designationId),
        })),
      )
    })
    if (!row) return
    reset({
      empDesignationId: Number(row.empDesignationId ?? 0) || undefined,
      fromDate: parseDate(row.fromDate),
      toDate: parseDate(row.toDate),
      isActive: row.isActive !== false,
      reason: String(row.reason ?? ''),
    })
  }, [open, row, reset])

  useEffect(() => {
    if (fromDate && watch('toDate') && fromDate > watch('toDate')) {
      setValue('toDate', fromDate)
    }
  }, [fromDate, setValue, watch])

  async function onSubmit(data: FormValues) {
    if (!row) return
    const payload = {
      ...row,
      empDesignationId: data.empDesignationId,
      fromDate: format(data.fromDate, 'yyyy-MM-dd'),
      toDate: format(data.toDate, 'yyyy-MM-dd'),
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      await assignEmployeeReportingManager(payload)
      toastSuccess('Reporting manager updated')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to update reporting manager')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Reporting Manager"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      showHeaderDivider
      size="lg"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="empDesignationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Employee Designation"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={designationOptions}
              placeholder="Select designation"
              searchable
              error={errors.empDesignationId?.message}
            />
          )}
        />
        <Controller
          name="fromDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From Date"
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.fromDate?.message}
            />
          )}
        />
        <Controller
          name="toDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To Date"
              required
              value={field.value}
              onChange={field.onChange}
              minDate={fromDate ?? undefined}
              error={errors.toDate?.message}
            />
          )}
        />
        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', String(v))}
                reasonError={!isActive ? errors.reason?.message : undefined}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
