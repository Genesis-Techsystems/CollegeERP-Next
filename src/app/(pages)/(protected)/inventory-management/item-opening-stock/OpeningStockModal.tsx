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
import {
  createInvOpeningStock,
  listInvItems,
  listInvStores,
  updateInvOpeningStock,
} from '@/services'
import type { InvOpeningStock } from '@/types/inventory'

const schema = z.object({
  storeId: z.coerce.number().min(1, 'Store is required'),
  itemId: z.coerce.number().min(1, 'Item is required'),
  qty: z.coerce.number().min(0.01, 'Quantity is required'),
  itemPrice: z.coerce.number().min(0, 'Item price is required'),
  academicYear: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvOpeningStock | null): FormValues {
  return {
    storeId: edit?.storeId ?? 0,
    itemId: edit?.itemId ?? 0,
    qty: edit?.qty ?? 0,
    itemPrice: edit?.itemPrice ?? 0,
    academicYear: edit?.academicYear ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvOpeningStock | null
  onSaved: () => void
}

export default function OpeningStockModal({ open, onClose, editData, onSaved }: Props) {
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

  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['InvStores', 'dropdown'],
    queryFn: listInvStores,
    enabled: open,
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['InvItems', 'dropdown'],
    queryFn: listInvItems,
    enabled: open,
  })

  const storeOptions: SelectOption[] = useMemo(
    () => stores.map((s) => ({
      value: String(s.storeId),
      label: s.storeName ?? s.storeCode ?? String(s.storeId),
    })),
    [stores],
  )

  const itemOptions: SelectOption[] = useMemo(
    () => items.map((i) => ({
      value: String(i.itemId),
      label: i.itemName ?? i.itemCode ?? String(i.itemId),
    })),
    [items],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const totalPrice = values.qty * values.itemPrice
    const payload: Partial<InvOpeningStock> = {
      storeId: values.storeId,
      itemId: values.itemId,
      qty: values.qty,
      itemPrice: values.itemPrice,
      totalPrice,
      academicYear: values.academicYear?.trim() || undefined,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvOpeningStock(editData.itemopeningStockId, payload)
    } else {
      await createInvOpeningStock(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Opening Stock' : 'Add Opening Stock'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="storeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Store *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={storeOptions}
                placeholder="Select store"
                isLoading={storesLoading}
                searchable
                error={errors.storeId?.message}
              />
            )}
          />
          <Controller
            name="itemId"
            control={control}
            render={({ field }) => (
              <Select
                label="Item *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={itemOptions}
                placeholder="Select item"
                isLoading={itemsLoading}
                searchable
                error={errors.itemId?.message}
              />
            )}
          />
          <div className="space-y-0.5">
            <Label className="text-xs">Quantity *</Label>
            <Input type="number" step="any" className="h-8 text-xs" {...register('qty')} />
            {errors.qty && <p className="text-xs text-red-500">{errors.qty.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Item Price *</Label>
            <Input type="number" step="any" className="h-8 text-xs" {...register('itemPrice')} />
            {errors.itemPrice && <p className="text-xs text-red-500">{errors.itemPrice.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Academic Year</Label>
            <Input className="h-8 text-xs" {...register('academicYear')} />
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
