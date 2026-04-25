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
import { createFinancialYear, listActiveOrganizations, listActiveUniversities, updateFinancialYear } from '@/services'
import type { FinancialYear } from '@/types/financial-year'
import type { Organization } from '@/types/organization'
import type { University } from '@/types/university'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  universityId: z.number().min(1, 'University is required'),
  financialYear: z.string().min(1, 'Financial year is required'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
}).refine((v) => new Date(v.fromDate).getTime() <= new Date(v.toDate).getTime(), {
  path: ['toDate'],
  message: 'To date must be after From date',
})

type FormValues = z.infer<typeof schema>

interface FinancialYearModalProps {
  open: boolean
  onClose: () => void
  financialYear: FinancialYear | null
  existingRows: FinancialYear[]
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

function asDateInputValue(value: string | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function FinancialYearModal({
  open,
  onClose,
  financialYear,
  existingRows,
  onSaved,
}: Readonly<FinancialYearModalProps>) {
  const isEditing = financialYear != null
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [universities, setUniversities] = useState<University[]>([])
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
      organizationId: undefined,
      universityId: undefined,
      financialYear: '',
      fromDate: asDateInputValue(new Date().toISOString()),
      toDate: asDateInputValue(new Date().toISOString()),
      isDefault: false,
      isActive: true,
      reason: '',
    },
  })

  const organizationOptions = useMemo(
    () => asOptions(organizations, (r) => r.organizationId, (r) => r.orgCode ?? r.orgName),
    [organizations],
  )
  const universityOptions = useMemo(
    () => asOptions(universities, (r) => r.universityId, (r) => r.universityCode ?? r.universityName),
    [universities],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveOrganizations(), listActiveUniversities()])
      .then(([orgRows, univRows]) => {
        setOrganizations(orgRows)
        setUniversities(univRows)
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (financialYear) {
      reset({
        organizationId: financialYear.organizationId,
        universityId: financialYear.universityId,
        financialYear: financialYear.financialYear,
        fromDate: asDateInputValue(financialYear.fromDate),
        toDate: asDateInputValue(financialYear.toDate),
        isDefault: financialYear.isDefault ?? false,
        isActive: financialYear.isActive,
        reason: financialYear.reason ?? '',
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [financialYear, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const duplicate = existingRows.some((row) =>
        row.financialYear.toLowerCase() === data.financialYear.toLowerCase()
        && row.organizationId === data.organizationId
        && row.universityId === data.universityId
        && row.financialYearId !== (financialYear?.financialYearId ?? -1),
      )
      if (duplicate) {
        setSubmitError('Financial year already exists for the selected organization and university')
        return
      }

      if (isEditing) {
        await updateFinancialYear(financialYear.financialYearId, data)
      } else {
        await createFinancialYear(data)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save financial year')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto pt-3">
        <DialogHeader className="space-y-0 pr-8 pt-0">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Financial Year' : 'Add Financial Year'}
          </DialogTitle>
          <div className="-mx-6 mt-2 border-b border-slate-200" />
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={organizationOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="universityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="University"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={universityOptions}
                  placeholder="Select university"
                  searchable
                  error={errors.universityId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="space-y-0.5 md:col-span-2">
              <Label htmlFor="financialYear">Financial Year *</Label>
              <Input id="financialYear" {...register('financialYear')} />
              {errors.financialYear && <p className="text-xs text-red-500">{errors.financialYear.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="fromDate">From Date *</Label>
              <Input id="fromDate" type="date" {...register('fromDate')} />
              {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="toDate">To Date *</Label>
              <Input id="toDate" type="date" min={watch('fromDate') || undefined} {...register('toDate')} />
              {errors.toDate && <p className="text-xs text-red-500">{errors.toDate.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="isDefault"
              type="checkbox"
              checked={watch('isDefault') ?? false}
              onChange={(e) => setValue('isDefault', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="isDefault">Is Default</Label>
          </div>

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

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
