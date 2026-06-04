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
import {
  createFinBankAccount,
  listAccountEntitiesByCollege,
  listBanks,
  listCollegesActive,
  updateFinBankAccount,
} from '@/services'
import type { FinBankAccount } from '@/types/finance'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  accountEntityId: z.coerce.number().min(1, 'Account entity is required'),
  bankId: z.coerce.number().min(1, 'Bank is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().min(1, 'IFSC is required'),
  branchCode: z.string().optional(),
  accountDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: FinBankAccount | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    accountEntityId: edit?.accountEntityId ?? 0,
    bankId: edit?.bankId ?? 0,
    accountNumber: edit?.bankAccountNo ?? edit?.accountNumber ?? '',
    ifscCode: edit?.ifscCode ?? '',
    branchCode: edit?.branchCode ?? '',
    accountDescription: edit?.accountDescription ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinBankAccount | null
  onSaved: () => void
}

export default function BankAccountModal({ open, onClose, editData, onSaved }: Props) {
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

  const collegeId = watch('collegeId')

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ['College', 'active'],
    queryFn: listCollegesActive,
    enabled: open,
  })

  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: QK.finAccountEntities.byCollege(collegeId),
    queryFn: () => listAccountEntitiesByCollege(collegeId),
    enabled: open && collegeId > 0,
  })

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['Bank', 'list'],
    queryFn: listBanks,
    enabled: open,
  })

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
  )

  const entityOptions = useMemo<SelectOption[]>(
    () => entities.map((e) => ({
      value: String(e.accountEntityId),
      label: `${e.entityCode} — ${e.entityName}`,
    })),
    [entities],
  )

  const bankOptions = useMemo<SelectOption[]>(
    () => banks.map((b) => ({
      value: String(b.bankId),
      label: String(b.bankName ?? b.bankCode ?? b.bankId),
    })),
    [banks],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinBankAccount> = {
      collegeId: values.collegeId,
      accountEntityId: values.accountEntityId,
      bankId: values.bankId,
      bankAccountNo: values.accountNumber.trim(),
      accountNumber: values.accountNumber.trim(),
      ifscCode: values.ifscCode.trim(),
      branchCode: values.branchCode?.trim(),
      accountDescription: values.accountDescription?.trim(),
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateFinBankAccount(editData.bankAccountId, payload)
    } else {
      await createFinBankAccount(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => {
                  field.onChange(Number(v))
                  setValue('accountEntityId', 0)
                }}
                options={collegeOptions}
                placeholder="Select college"
                isLoading={collegesLoading}
                searchable
              />
            )}
          />
          <Controller
            name="accountEntityId"
            control={control}
            render={({ field }) => (
              <Select
                label="Account Entity *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={entityOptions}
                placeholder="Select entity"
                isLoading={entitiesLoading}
                disabled={!collegeId}
                searchable
              />
            )}
          />
          <Controller
            name="bankId"
            control={control}
            render={({ field }) => (
              <Select
                label="Bank *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={bankOptions}
                placeholder="Select bank"
                isLoading={banksLoading}
                searchable
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Account Number *</Label>
            <Input className="h-8 text-xs" {...register('accountNumber')} />
            {errors.accountNumber && <p className="text-xs text-red-500">{errors.accountNumber.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">IFSC Code *</Label>
            <Input className="h-8 text-xs" {...register('ifscCode')} />
            {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Branch Code</Label>
            <Input className="h-8 text-xs" {...register('branchCode')} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Description</Label>
            <Input className="h-8 text-xs" {...register('accountDescription')} />
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
