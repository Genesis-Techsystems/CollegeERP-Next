'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { QK } from '@/lib/query-keys'
import {
  createFinTransaction,
  getFinanceEntityFilters,
  listIncomeExpenseTypes,
  updateFinTransaction,
  uploadFinTransactionVoucher,
} from '@/services'
import type { FinTransaction } from '@/types/finance'
import {
  distinctFinanceColleges,
  filterFinanceAccountTypes,
  filterFinanceEntities,
  filterFinanceYears,
} from '../_lib/finance-filters'
import { useFinanceSessionIds } from '../_lib/use-finance-session-ids'

const MAX_FILE_BYTES = 24 * 1024 * 1024

const schema = z.object({
  vouchertypeCatdetId: z.coerce.number().min(1, 'Transaction type is required'),
  collegeId: z.coerce.number().min(1, 'College is required'),
  accountEntityId: z.coerce.number().min(1, 'Entity is required'),
  financialYearId: z.coerce.number().min(1, 'Financial year is required'),
  accountTypeId: z.coerce.number().min(1, 'Account type is required'),
  transactionNumber: z.string().optional(),
  title: z.string().min(1, 'Transaction title is required'),
  amount: z.coerce.number().optional(),
  transactionDate: z.date({ message: 'Date is required' }),
  description: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function parseTxnDate(raw?: string): Date {
  if (!raw) return new Date()
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function getDefaults(edit?: FinTransaction | null, defaultTypeId?: number): FormValues {
  return {
    vouchertypeCatdetId: edit?.vouchertypeCatdetId ?? defaultTypeId ?? 0,
    collegeId: edit?.collegeId ?? 0,
    accountEntityId: edit?.accountEntityId ?? 0,
    financialYearId: edit?.financialYearId ?? 0,
    accountTypeId: edit?.accountTypeId ?? 0,
    transactionNumber: edit?.transactionNumber ?? '',
    title: edit?.title ?? '',
    amount: edit?.amount != null ? Number(edit.amount) : undefined,
    transactionDate: parseTxnDate(edit?.transactionDate),
    description: edit?.description ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinTransaction | null
  onSaved: () => void
}

export default function TransactionModal({ open, onClose, editData, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const { organizationId, employeeId, contextReady } = useFinanceSessionIds()

  const { data: incomeExpenseTypes = [] } = useQuery({
    queryKey: QK.finIncomeExpenseTypes.list(),
    queryFn: listIncomeExpenseTypes,
    enabled: open,
  })

  const { data: finRows = [], isLoading: filtersLoading } = useQuery({
    queryKey: QK.finEntityFilters(organizationId, employeeId),
    queryFn: () => getFinanceEntityFilters(organizationId, employeeId),
    enabled: open && contextReady,
  })

  const defaultTypeId = incomeExpenseTypes[0]?.generalDetailId

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
    defaultValues: getDefaults(null, defaultTypeId),
  })

  const collegeId = watch('collegeId')
  const accountEntityId = watch('accountEntityId')
  const financialYearId = watch('financialYearId')
  const vouchertypeCatdetId = watch('vouchertypeCatdetId')

  const colleges = useMemo(() => distinctFinanceColleges(finRows), [finRows])
  const entities = useMemo(
    () => filterFinanceEntities(finRows, collegeId),
    [finRows, collegeId],
  )
  const years = useMemo(
    () => filterFinanceYears(finRows, collegeId, accountEntityId),
    [finRows, collegeId, accountEntityId],
  )
  const accountTypes = useMemo(
    () => filterFinanceAccountTypes(finRows, collegeId, accountEntityId, financialYearId),
    [finRows, collegeId, accountEntityId, financialYearId],
  )

  const collegeOptions = useMemo<SelectOption[]>(
    () => colleges.map((c) => ({
      value: String(c.fk_college_id),
      label: String(c.college_code ?? c.fk_college_id),
    })),
    [colleges],
  )

  const entityOptions = useMemo<SelectOption[]>(
    () => entities.map((e) => ({
      value: String(e.pk_acc_entity_id),
      label: String(e.entity_code ?? e.pk_acc_entity_id),
    })),
    [entities],
  )

  const yearOptions = useMemo<SelectOption[]>(
    () => years.map((y) => ({
      value: String(y.pk_financial_year_id),
      label: String(y.financial_year ?? y.pk_financial_year_id),
    })),
    [years],
  )

  const accountTypeOptions = useMemo<SelectOption[]>(
    () => accountTypes.map((t) => ({
      value: String(t.pk_account_type_id),
      label: String(t.accounttype_name ?? t.pk_account_type_id),
    })),
    [accountTypes],
  )

  useEffect(() => {
    if (!open) return
    reset(getDefaults(editData, defaultTypeId))
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [open, editData, defaultTypeId, reset])

  useEffect(() => {
    if (!open || editData || colleges.length === 0) return
    const first = colleges[0]
    if (first.fk_college_id) {
      setValue('collegeId', Number(first.fk_college_id))
    }
  }, [open, editData, colleges, setValue])

  useEffect(() => {
    if (!open || editData || entities.length === 0 || !collegeId) return
    setValue('accountEntityId', Number(entities[0].pk_acc_entity_id))
  }, [open, editData, entities, collegeId, setValue])

  useEffect(() => {
    if (!open || editData || years.length === 0 || !accountEntityId) return
    setValue('financialYearId', Number(years[0].pk_financial_year_id))
  }, [open, editData, years, accountEntityId, setValue])

  useEffect(() => {
    if (!open || editData || accountTypes.length === 0 || !financialYearId) return
    setValue('accountTypeId', Number(accountTypes[0].pk_account_type_id))
  }, [open, editData, accountTypes, financialYearId, setValue])

  useEffect(() => {
    if (!open || editData || !defaultTypeId || vouchertypeCatdetId) return
    setValue('vouchertypeCatdetId', defaultTypeId)
  }, [open, editData, defaultTypeId, vouchertypeCatdetId, setValue])

  async function onSubmit(values: FormValues) {
    setFileError(null)
    const file = fileRef.current?.files?.[0]
    if (file && file.size > MAX_FILE_BYTES) {
      setFileError('File size must not exceed 24 MB')
      return
    }

    const payload: Partial<FinTransaction> = {
      collegeId: values.collegeId,
      accountEntityId: values.accountEntityId,
      financialYearId: values.financialYearId,
      accountTypeId: values.accountTypeId,
      vouchertypeCatdetId: values.vouchertypeCatdetId,
      transactionNumber: values.transactionNumber?.trim() || undefined,
      title: values.title.trim(),
      amount: values.amount,
      transactionDate: format(values.transactionDate, 'yyyy-MM-dd'),
      description: values.description?.trim(),
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }

    let saved: FinTransaction
    if (editData) {
      saved = await updateFinTransaction(editData.finTransactionId, payload)
    } else {
      saved = await createFinTransaction(payload)
    }

    const txnId = saved.finTransactionId ?? editData?.finTransactionId
    if (file && txnId) {
      await uploadFinTransactionVoucher(txnId, file)
    }

    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="flex sm:max-w-4xl max-h-none flex-col gap-3 overflow-hidden">
        <DialogHeader className="min-h-12 shrink-0">
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>
        <form
          id="fin-transaction-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-visible"
        >
          <Controller
            name="vouchertypeCatdetId"
            control={control}
            render={({ field }) => (
              <RadioGroup
                className="mb-2 flex flex-wrap gap-x-6 gap-y-1"
                value={field.value ? String(field.value) : ''}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                {incomeExpenseTypes.map((t) => (
                  <label key={t.generalDetailId} className="flex items-center gap-2 text-xs cursor-pointer">
                    <RadioGroupItem value={String(t.generalDetailId)} />
                    {t.generalDetailDisplayName ?? t.generalDetailName ?? t.generalDetailCode}
                  </label>
                ))}
              </RadioGroup>
            )}
          />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="College *"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => {
                    field.onChange(Number(v))
                    setValue('accountEntityId', 0)
                    setValue('financialYearId', 0)
                    setValue('accountTypeId', 0)
                  }}
                  options={collegeOptions}
                  placeholder="Select college"
                  isLoading={filtersLoading}
                  searchable
                />
              )}
            />
            <Controller
              name="accountEntityId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="Entity Type *"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => {
                    field.onChange(Number(v))
                    setValue('financialYearId', 0)
                    setValue('accountTypeId', 0)
                  }}
                  options={entityOptions}
                  placeholder="Select entity"
                  disabled={!collegeId}
                  searchable
                />
              )}
            />
            <Controller
              name="financialYearId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="Financial Year *"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => {
                    field.onChange(Number(v))
                    setValue('accountTypeId', 0)
                  }}
                  options={yearOptions}
                  placeholder="Select year"
                  disabled={!accountEntityId}
                  searchable
                />
              )}
            />
            <div className="col-span-2">
              <Controller
                name="accountTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="gap-0.5 [&_label]:text-xs"
                    label="Account Type *"
                    value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(Number(v))}
                    options={accountTypeOptions}
                    placeholder="Select account type"
                    disabled={!financialYearId}
                    searchable
                  />
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Voucher Number</Label>
              <Input className="h-8 text-xs" {...register('transactionNumber')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Transaction Title *</Label>
              <Input className="h-8 text-xs" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Amount</Label>
              <Input type="number" step="any" className="h-8 text-xs" {...register('amount')} />
            </div>
            <Controller
              name="transactionDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date *"
                  value={field.value}
                  onChange={field.onChange}
                  maxDate={new Date()}
                  clearable={false}
                  className="[&_button]:h-8 [&_button]:text-xs"
                />
              )}
            />
            <div className="space-y-0.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                className="min-h-0 h-14 resize-none text-xs py-1.5"
                {...register('description')}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Voucher document</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.doc"
                className="h-8 py-1 text-xs file:mr-2 file:text-xs"
              />
              <p className="text-[10px] leading-tight text-muted-foreground">Max file size 24 MB</p>
              {fileError && <p className="text-xs text-red-500">{fileError}</p>}
              {editData?.voucherUrl ? (
                <a
                  href={editData.voucherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  View existing voucher
                </a>
              ) : null}
            </div>
          </div>
        </form>
        <DialogFooter className="mt-0 shrink-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button type="submit" form="fin-transaction-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
