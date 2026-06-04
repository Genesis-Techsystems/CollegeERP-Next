'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { QK } from '@/lib/query-keys'
import { createFinChequeBook, listFinBankAccounts, updateFinChequeBook } from '@/services'
import type { FinChequeBook } from '@/types/finance'

const schema = z.object({
  finBankAccountId: z.coerce.number().min(1, 'Bank account is required'),
  chequebookSerialNo: z.string().min(1, 'Serial number is required'),
  noOfChequeleafs: z.coerce.number().min(1, 'Number of leaves is required'),
  startNumber: z.coerce.number().min(1, 'Start number is required'),
  endNumber: z.coerce.number().min(1, 'End number is required'),
  noOfChequeLeafsIssued: z.coerce.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: FinChequeBook | null): FormValues {
  return {
    finBankAccountId: edit?.finBankAccountId ?? edit?.bankAccountId ?? 0,
    chequebookSerialNo: edit?.chequebookSerialNo ?? '',
    noOfChequeleafs: edit?.noOfChequeleafs ?? 0,
    startNumber: edit?.startNumber ?? 0,
    endNumber: edit?.endNumber ?? 0,
    noOfChequeLeafsIssued: edit?.noOfChequeLeafsIssued ?? 0,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinChequeBook | null
  onSaved: () => void
}

export default function ChequeBookModal({ open, onClose, editData, onSaved }: Props) {
  const { data: bankAccounts = [], isLoading: banksLoading } = useQuery({
    queryKey: QK.finBankAccounts.list(),
    queryFn: listFinBankAccounts,
    enabled: open,
  })

  const bankAccountOptions = useMemo<SelectOption[]>(
    () => bankAccounts.map((b) => ({
      value: String(b.bankAccountId),
      label: `${b.bankName ?? ''} — ${b.bankAccountNo ?? b.accountNumber ?? b.bankAccountId}`.trim(),
    })),
    [bankAccounts],
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinChequeBook> = {
      finBankAccountId: values.finBankAccountId,
      bankAccountId: values.finBankAccountId,
      chequebookSerialNo: values.chequebookSerialNo.trim(),
      noOfChequeleafs: values.noOfChequeleafs,
      startNumber: values.startNumber,
      endNumber: values.endNumber,
      noOfChequeLeafsIssued: values.noOfChequeLeafsIssued ?? 0,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateFinChequeBook(editData.chequeBookId, payload)
    } else {
      await createFinChequeBook(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Cheque Book' : 'Add Cheque Book'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="finBankAccountId"
            control={control}
            render={({ field }) => (
              <Select
                label="Bank Account *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={bankAccountOptions}
                placeholder="Select bank account"
                isLoading={banksLoading}
                searchable
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Cheque Book Serial No *</Label>
            <Input className="h-8 text-xs" {...register('chequebookSerialNo')} />
            {errors.chequebookSerialNo && <p className="text-xs text-red-500">{errors.chequebookSerialNo.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-xs">No. of Leaves *</Label>
              <Input type="number" className="h-8 text-xs" {...register('noOfChequeleafs')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Leaves Issued</Label>
              <Input type="number" className="h-8 text-xs" {...register('noOfChequeLeafsIssued')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Start Number *</Label>
              <Input type="number" className="h-8 text-xs" {...register('startNumber')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">End Number *</Label>
              <Input type="number" className="h-8 text-xs" {...register('endNumber')} />
            </div>
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
              />
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
