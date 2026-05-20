'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { MultiSelect, Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  createSchAccountsPreceeding,
  listBanksByCollege,
  listNullPreceedings,
  listPreceedingsByAccountId,
} from '@/services'
import type { SchAccountsPreceeding } from '@/types/scholarship'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  bankId: z.number().min(1, 'Bank is required'),
  title: z.string().min(1, 'Cheque title is required'),
  chequeNo: z.string().min(1, 'Cheque number is required'),
  chequeDate: z.string().optional(),
  schPreceedingIds: z.array(z.string()).min(1, 'Select at least one proceeding'),
  comments: z.string().optional(),
  isHandOvertoAcc: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AccountsPreceedingModalProps {
  open: boolean
  onClose: () => void
  row: SchAccountsPreceeding | null
  collegeId: number | null
  collegeCode?: string
  onSaved: () => void
}

export function AccountsPreceedingModal({
  open,
  onClose,
  row,
  collegeId,
  collegeCode,
  onSaved,
}: Readonly<AccountsPreceedingModalProps>) {
  const isEditing = row != null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankId: undefined,
      title: '',
      chequeNo: '',
      chequeDate: undefined,
      schPreceedingIds: [],
      comments: '',
      isHandOvertoAcc: false,
      isActive: true,
      reason: 'active',
    },
  })

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ['scholarship', 'banks', collegeId],
    queryFn: () => listBanksByCollege(collegeId!),
    enabled: open && !!collegeId,
  })

  const { data: nullPreceedings = [], isLoading: nullPreceedingsLoading } = useQuery({
    queryKey: ['scholarship', 'nullPreceedings', collegeId],
    queryFn: () => listNullPreceedings(collegeId!),
    enabled: open && !!collegeId,
  })

  const { data: assignedPreceedings = [], isLoading: assignedLoading } = useQuery({
    queryKey: ['scholarship', 'assignedPreceedings', row?.schAccountsPreceedingId],
    queryFn: () => listPreceedingsByAccountId(row!.schAccountsPreceedingId),
    enabled: open && !!row?.schAccountsPreceedingId,
  })

  const preceedingsLoading = nullPreceedingsLoading || assignedLoading

  const bankOptions = banks.map((b) => ({
    value: String(b.bankId),
    label: b.bankName,
  }))

  const preceedingOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of [...nullPreceedings, ...assignedPreceedings]) {
      map.set(
        String(p.schPreceedingId),
        p.preceedingTitle ?? String(p.preceedingNo ?? p.schPreceedingId),
      )
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [nullPreceedings, assignedPreceedings])

  useEffect(() => {
    if (!open) return
    const selectedIds =
      row?.schPreceedingIds?.split(',').map((id) => id.trim()).filter(Boolean) ?? []
    reset(
      row
        ? {
            bankId: row.bankId,
            title: row.title ?? '',
            chequeNo: row.chequeNo ?? '',
            chequeDate: row.chequeDate,
            schPreceedingIds: selectedIds,
            comments: row.comments ?? '',
            isHandOvertoAcc: row.isHandOvertoAcc ?? false,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            bankId: undefined,
            title: '',
            chequeNo: '',
            chequeDate: undefined,
            schPreceedingIds: [],
            comments: '',
            isHandOvertoAcc: false,
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    if (!collegeId) {
      toastError('Select a college first')
      return
    }
    const schPreceedingList = data.schPreceedingIds.map(Number)
    const payload: Record<string, unknown> = {
      collegeId,
      bankId: data.bankId,
      title: data.title,
      chequeNo: data.chequeNo,
      chequeDate: data.chequeDate,
      schPreceedingIds: data.schPreceedingIds.join(','),
      schPreceedingList,
      comments: data.comments ?? '',
      isHandOvertoAcc: data.isHandOvertoAcc ?? false,
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    if (isEditing && row) {
      payload.schAccountsPreceedingId = row.schAccountsPreceedingId
    }
    try {
      await createSchAccountsPreceeding(payload)
      toastSuccess(isEditing ? 'Account proceeding updated' : 'Account proceeding created')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to save account proceeding')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Account Proceeding' : 'Add Account Proceeding'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      description={collegeCode ? `College: ${collegeCode}` : undefined}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Controller
            name="schPreceedingIds"
            control={control}
            render={({ field }) => (
              <MultiSelect
                label="Proceedings"
                required
                searchable
                value={field.value}
                onChange={field.onChange}
                options={preceedingOptions}
                placeholder="Select proceedings"
                isLoading={preceedingsLoading}
                disabled={!collegeId}
                error={errors.schPreceedingIds?.message}
              />
            )}
          />
        </div>
        <Controller
          name="bankId"
          control={control}
          render={({ field }) => (
            <Select
              label="Bank"
              required
              searchable
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={bankOptions}
              placeholder="Select bank"
              isLoading={banksLoading}
              disabled={!collegeId}
              error={errors.bankId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label className="text-[12px]">Cheque Title *</Label>
          <Input className="h-9 text-[12px]" {...register('title')} />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Cheque No *</Label>
          <Input className="h-9 text-[12px]" {...register('chequeNo')} />
          {errors.chequeNo && <p className="text-xs text-red-500">{errors.chequeNo.message}</p>}
        </div>
        <Controller
          name="chequeDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Cheque Date"
              value={field.value ? new Date(field.value) : null}
              onChange={(d) => field.onChange(d?.toISOString().slice(0, 10))}
            />
          )}
        />
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[12px]">Comments</Label>
          <Input className="h-9 text-[12px]" {...register('comments')} />
        </div>
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          <Controller
            name="isHandOvertoAcc"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[12px]">
                <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Hand Over To Account
              </label>
            )}
          />
        </div>
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
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
