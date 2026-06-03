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
import { Checkbox } from '@/components/ui/checkbox'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { QK } from '@/lib/query-keys'
import {
  createFinAccountType,
  listAccountEntitiesByCollege,
  listCollegesActive,
  listFinAccountTypesByCollege,
  listFinMajorAccountTypes,
  updateFinAccountType,
} from '@/services'
import type { FinAccountType } from '@/types/finance'

const schema = z.object({
  collegeId: z.coerce.number().min(1, 'College is required'),
  accountEntityId: z.coerce.number().min(1, 'Account entity is required'),
  accounttypeCode: z.string().min(1, 'Code is required'),
  accounttypeName: z.string().min(1, 'Name is required'),
  parentAccountTypeId: z.coerce.number().optional(),
  majorAccountTypeId: z.coerce.number().min(1, 'Major account type is required'),
  isGroupAccount: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: FinAccountType | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    accountEntityId: edit?.accountEntityId ?? 0,
    accounttypeCode: edit?.accounttypeCode ?? '',
    accounttypeName: edit?.accounttypeName ?? '',
    parentAccountTypeId: edit?.parentAccountTypeId ?? undefined,
    majorAccountTypeId: edit?.majorAccountTypeId ?? 0,
    isGroupAccount: edit?.isGroupAccount ?? true,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: FinAccountType | null
  onSaved: () => void
}

export default function AccountTypesModal({ open, onClose, editData, onSaved }: Props) {
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

  const { data: parentTypes = [], isLoading: parentsLoading } = useQuery({
    queryKey: QK.finAccountTypes.byCollege(collegeId),
    queryFn: () => listFinAccountTypesByCollege(collegeId),
    enabled: open && collegeId > 0,
  })

  const { data: majorTypes = [], isLoading: majorLoading } = useQuery({
    queryKey: QK.finMajorAccountTypes.list(),
    queryFn: listFinMajorAccountTypes,
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

  const parentOptions = useMemo<SelectOption[]>(
    () => parentTypes
      .filter((t) => t.accountTypeId !== editData?.accountTypeId)
      .map((t) => ({
        value: String(t.accountTypeId),
        label: `${t.accounttypeCode} — ${t.accounttypeName}`,
      })),
    [parentTypes, editData?.accountTypeId],
  )

  const majorOptions = useMemo<SelectOption[]>(
    () => majorTypes.map((m) => ({
      value: String(m.generalDetailId),
      label: String(m.generalDetailName ?? m.generalDetailCode ?? m.generalDetailId),
    })),
    [majorTypes],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinAccountType> = {
      collegeId: values.collegeId,
      accountEntityId: values.accountEntityId,
      accounttypeCode: values.accounttypeCode.trim(),
      accounttypeName: values.accounttypeName.trim(),
      parentAccountTypeId: values.parentAccountTypeId || null,
      majorAccountTypeId: values.majorAccountTypeId,
      isGroupAccount: values.isGroupAccount,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateFinAccountType(editData.accountTypeId, payload)
    } else {
      await createFinAccountType(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Account Types' : 'Add Account Types'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="py-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
                    setValue('parentAccountTypeId', undefined)
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
            <div className="space-y-0.5">
              <Label className="text-xs">Account Type Code *</Label>
              <Input className="h-8 text-xs" {...register('accounttypeCode')} />
              {errors.accounttypeCode && <p className="text-xs text-red-500">{errors.accounttypeCode.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Account Type Name *</Label>
              <Input className="h-8 text-xs" {...register('accounttypeName')} />
              {errors.accounttypeName && <p className="text-xs text-red-500">{errors.accounttypeName.message}</p>}
            </div>
            <Controller
              name="parentAccountTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Parent Account Type"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={parentOptions}
                  placeholder="None"
                  isLoading={parentsLoading}
                  disabled={!collegeId}
                  clearable
                  searchable
                />
              )}
            />
            <Controller
              name="majorAccountTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Major Account Type *"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(Number(v))}
                  options={majorOptions}
                  placeholder="Select major type"
                  isLoading={majorLoading}
                  searchable
                />
              )}
            />
            <Controller
              name="isGroupAccount"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs pt-6">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  Group account
                </label>
              )}
            />
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
          </div>
          <DialogFooter className="mt-4">
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
