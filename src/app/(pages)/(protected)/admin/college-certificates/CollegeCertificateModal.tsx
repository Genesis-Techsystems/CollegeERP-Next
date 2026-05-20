'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCollegeCertificate,
  listActiveCampusesForCollegeCertificates,
  listActiveCollegesForCollegeCertificates,
  updateCollegeCertificate,
} from '@/services'
import type { Campus } from '@/types/campus'
import type { College } from '@/types/college'
import type { CollegeCertificate } from '@/types/college-certificate'

const schema = z.object({
  campusId: z.number().min(1, 'Campus is required'),
  collegeId: z.number().min(1, 'College is required'),
  certificateName: z.string().min(1, 'Certificate name is required'),
  certifcateCode: z.string().min(1, 'Certificate code is required'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  duplicateCertificateAmount: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? 0 : v),
    z.coerce.number().min(0, 'Duplicate amount cannot be negative'),
  ),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  isApprovalReq: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
}).refine((v) => new Date(v.fromDate).getTime() <= new Date(v.toDate).getTime(), {
  path: ['toDate'],
  message: 'To date must be after From date',
})

type FormValues = z.infer<typeof schema>

interface CollegeCertificateModalProps {
  open: boolean
  onClose: () => void
  row: CollegeCertificate | null
  onSaved: () => void
}

function asDateInputValue(value: string | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function toDdMmYyyy(dateValue: string): string {
  if (!dateValue) return ''
  const parts = dateValue.split('-')
  if (parts.length !== 3) return dateValue
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function CollegeCertificateModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<CollegeCertificateModalProps>) {
  const isEditing = Boolean(row)
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [colleges, setColleges] = useState<College[]>([])
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
    resolver: zodResolver(schema),
    defaultValues: {
      campusId: undefined,
      collegeId: undefined,
      certificateName: '',
      certifcateCode: '',
      amount: 0,
      duplicateCertificateAmount: 0,
      fromDate: asDateInputValue(new Date().toISOString()),
      toDate: asDateInputValue(new Date().toISOString()),
      isApprovalReq: false,
      isActive: true,
      reason: '',
    },
  })

  const campusOptions = useMemo(
    () => asOptions(campuses, (r) => r.campusId, (r) => r.campusCode ?? r.campusName),
    [campuses],
  )
  const collegeOptions = useMemo(
    () => asOptions(colleges, (r) => r.collegeId, (r) => r.collegeCode ?? r.collegeName),
    [colleges],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveCampusesForCollegeCertificates(), listActiveCollegesForCollegeCertificates()])
      .then(([campusRows, collegeRows]) => {
        setCampuses(campusRows)
        setColleges(collegeRows)
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (row) {
      reset({
        campusId: row.campusId,
        collegeId: row.collegeId,
        certificateName: row.certificateName,
        certifcateCode: row.certifcateCode,
        amount: row.amount ?? 0,
        duplicateCertificateAmount: row.duplicateCertificateAmount ?? 0,
        fromDate: asDateInputValue(row.fromDate),
        toDate: asDateInputValue(row.toDate),
        isApprovalReq: row.isApprovalReq ?? false,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const selectedCampus = campuses.find((c) => c.campusId === data.campusId)
      const selectedCollege = colleges.find((c) => c.collegeId === data.collegeId)
      const organizationId = selectedCollege?.organizationId ?? selectedCampus?.organizationId

      const payload = {
        ...data,
        organizationId,
        fromDt: data.fromDate,
        toDt: data.toDate,
        fromDateStr: toDdMmYyyy(data.fromDate),
        toDateStr: toDdMmYyyy(data.toDate),
      }

      if (isEditing) {
        await updateCollegeCertificate(row!.collegeCertificateId, payload)
      } else {
        await createCollegeCertificate(payload)
      }
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save certificate')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Certificate' : 'Add Certificate'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Campus"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={campusOptions}
                  placeholder="Select campus"
                  searchable
                  error={errors.campusId?.message}
                />
              )}
            />
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  error={errors.collegeId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <Label htmlFor="certificateName">Certificate Name *</Label>
              <Input id="certificateName" {...register('certificateName')} />
              {errors.certificateName && <p className="text-xs text-red-500">{errors.certificateName.message}</p>}
            </div>
            <div>
              <Label htmlFor="certifcateCode">Certificate Code *</Label>
              <Input id="certifcateCode" {...register('certifcateCode')} />
              {errors.certifcateCode && <p className="text-xs text-red-500">{errors.certifcateCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" type="number" min={0} {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="duplicateCertificateAmount">Duplicate Amount</Label>
              <Input
                id="duplicateCertificateAmount"
                type="number"
                min={0}
                {...register('duplicateCertificateAmount', { valueAsNumber: true })}
              />
              {errors.duplicateCertificateAmount && <p className="text-xs text-red-500">{errors.duplicateCertificateAmount.message}</p>}
            </div>
            <div>
              <Label htmlFor="fromDate">From Date *</Label>
              <Input id="fromDate" type="date" {...register('fromDate')} />
              {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="toDate">To Date *</Label>
              <Input id="toDate" type="date" min={watch('fromDate') || undefined} {...register('toDate')} />
              {errors.toDate && <p className="text-xs text-red-500">{errors.toDate.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="isApprovalReq"
              type="checkbox"
              checked={watch('isApprovalReq') ?? false}
              onChange={(e) => setValue('isApprovalReq', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="isApprovalReq">Approval Required</Label>
          </div>

          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue('reason', value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}

          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>Close</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
