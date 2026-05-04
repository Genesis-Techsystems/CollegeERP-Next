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
import { createBank, listActiveCollegesForBanks, updateBank } from '@/services'
import type { Bank } from '@/types/bank'
import type { College } from '@/types/college'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  bankCode: z.string().min(1, 'Bank code is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  branchCode: z.string().min(1, 'Branch code is required'),
  accountNo: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().min(1, 'IFSC code is required'),
  address: z.string().min(1, 'Address is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function BankModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Bank | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      bankCode: '',
      bankName: '',
      branchCode: '',
      accountNo: '',
      ifscCode: '',
      address: '',
      isActive: true,
      reason: '',
    },
  })

  useEffect(() => { if (open) listActiveCollegesForBanks().then(setColleges).catch(console.error) }, [open])
  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        bankCode: row.bankCode,
        bankName: row.bankName,
        branchCode: row.branchCode,
        accountNo: row.accountNo,
        ifscCode: row.ifscCode,
        address: row.address,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else reset()
    setSubmitError(null)
  }, [row, open, reset])

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName })),
    [colleges],
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

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Bank' : 'Add Bank'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
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
                error={errors.collegeId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="bankName">Bank Name *</Label><Input id="bankName" {...register('bankName')} />{errors.bankName && <p className="text-xs text-red-500">{errors.bankName.message}</p>}</div>
            <div><Label htmlFor="bankCode">Bank Code *</Label><Input id="bankCode" {...register('bankCode')} />{errors.bankCode && <p className="text-xs text-red-500">{errors.bankCode.message}</p>}</div>
            <div><Label htmlFor="branchCode">Branch Code *</Label><Input id="branchCode" {...register('branchCode')} />{errors.branchCode && <p className="text-xs text-red-500">{errors.branchCode.message}</p>}</div>
            <div><Label htmlFor="ifscCode">IFSC Code *</Label><Input id="ifscCode" {...register('ifscCode')} />{errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}</div>
            <div className="col-span-2"><Label htmlFor="accountNo">Account No *</Label><Input id="accountNo" {...register('accountNo')} />{errors.accountNo && <p className="text-xs text-red-500">{errors.accountNo.message}</p>}</div>
          </div>
          <div><Label htmlFor="address">Address *</Label><Input id="address" {...register('address')} />{errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}</div>
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
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
