'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { createUnivPaymentWallet, listCollegesActive, updateUnivPaymentWallet } from '@/services'
import type { UnivPaymentWallet } from '@/types/univ-wallet'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  studentCode: z.string().optional(),
  studentName: z.string().optional(),
  walletBalance: z.coerce.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: UnivPaymentWallet | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    studentCode: edit?.studentCode ?? '',
    studentName: edit?.studentName ?? '',
    walletBalance: edit?.walletBalance != null ? Number(edit.walletBalance) : undefined,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: UnivPaymentWallet | null
  onSaved: () => void
}

export function PaymentWalletModal({ open, onClose, editData, onSaved }: Props) {
  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ['College', 'active'],
    queryFn: listCollegesActive,
    enabled: open,
  })

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
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
    resolver: zodResolver(schema),
    defaultValues: getDefaults(null),
  })

  useEffect(() => {
    if (open) reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      collegeId: values.collegeId,
      studentCode: values.studentCode?.trim() || undefined,
      studentName: values.studentName?.trim() || undefined,
      walletBalance: values.walletBalance ?? 0,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData?.univPaymentWalletId) {
      await updateUnivPaymentWallet(editData.univPaymentWalletId, payload)
    } else {
      await createUnivPaymentWallet(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit payment wallet' : 'Add payment wallet'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College *"
                value={field.value ? String(field.value) : ''}
                onChange={(v) => field.onChange(Number(v))}
                options={collegeOptions}
                placeholder="Select college"
                isLoading={collegesLoading}
                searchable
              />
            )}
          />
          {errors.collegeId ? <p className="text-xs text-red-500">{errors.collegeId.message}</p> : null}
          <div className="space-y-0.5">
            <Label className="text-xs">Student code</Label>
            <Input className="h-8 text-xs" {...register('studentCode')} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Student name</Label>
            <Input className="h-8 text-xs" {...register('studentName')} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Wallet balance</Label>
            <Input className="h-8 text-xs" type="number" step="0.01" {...register('walletBalance')} />
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
