'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBank, listActiveCampusesForBanks, listActiveCollegesForBanks, updateBank } from '@/services'
import type { Bank } from '@/types/bank'
import type { Campus } from '@/types/campus'
import type { College } from '@/types/college'

const schema = z.object({
  campusId: z.number().min(1, 'Campus is required'),
  collegeId: z.number().min(1, 'College is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  branchCode: z.string().optional(),
  accountNo: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().min(1, 'IFSC code is required'),
  micrCode: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function BankModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Bank | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      campusId: undefined,
      collegeId: undefined,
      bankCode: '',
      bankName: '',
      branchCode: '',
      accountNo: '',
      ifscCode: '',
      micrCode: '',
      address: '',
      isActive: true,
      reason: '',
    },
  })

  const selectedCampusId = watch('campusId')

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveCampusesForBanks(), listActiveCollegesForBanks()])
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
        bankCode: row.bankCode,
        bankName: row.bankName,
        branchCode: row.branchCode,
        accountNo: row.accountNo,
        ifscCode: row.ifscCode,
        micrCode: row.micrCode ?? '',
        address: row.address ?? '',
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else reset()
    setSubmitError(null)
  }, [row, open, reset])

  const collegeOptions = useMemo(
    () => colleges
      .filter((c) => !selectedCampusId || c.campusId === selectedCampusId)
      .map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName })),
    [colleges, selectedCampusId],
  )
  const campusOptions = useMemo(
    () => campuses.map((c) => ({ value: String(c.campusId), label: c.campusCode ?? c.campusName })),
    [campuses],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateBank(row!.bankId, data)
      else await createBank(data)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save bank')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Bank' : 'Add Bank'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Campus"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => {
                    field.onChange(value ? Number(value) : undefined)
                    setValue('collegeId', undefined as unknown as number)
                  }}
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
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  disabled={!selectedCampusId}
                  error={errors.collegeId?.message}
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="bankName">Bank Name *</Label><Input id="bankName" {...register('bankName')} />{errors.bankName && <p className="text-xs text-red-500">{errors.bankName.message}</p>}</div>
            <div><Label htmlFor="bankCode">Bank Code *</Label><Input id="bankCode" {...register('bankCode')} />{errors.bankCode && <p className="text-xs text-red-500">{errors.bankCode.message}</p>}</div>
            <div><Label htmlFor="branchCode">Branch Code</Label><Input id="branchCode" {...register('branchCode')} />{errors.branchCode && <p className="text-xs text-red-500">{errors.branchCode.message}</p>}</div>
            <div><Label htmlFor="ifscCode">IFSC Code *</Label><Input id="ifscCode" {...register('ifscCode')} />{errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}</div>
            <div className="col-span-2"><Label htmlFor="accountNo">Account No *</Label><Input id="accountNo" {...register('accountNo')} />{errors.accountNo && <p className="text-xs text-red-500">{errors.accountNo.message}</p>}</div>
            <div><Label htmlFor="micrCode">MICR Code</Label><Input id="micrCode" {...register('micrCode')} /></div>
          </div>
          <div><Label htmlFor="address">Address</Label><Input id="address" {...register('address')} />{errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}</div>
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
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
