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
import { Select } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { createInvUom, listInvUoms, updateInvUom } from '@/services'
import { QK } from '@/lib/query-keys'
import type { InvUom } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  uomCode: z.string().min(1, 'UOM code is required'),
  uomName: z.string().min(1, 'UOM name is required'),
  conversionqty: z.coerce.number().optional(),
  parentUomId: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvUom | null): FormValues {
  return {
    uomCode: edit?.uomCode ?? '',
    uomName: edit?.uomName ?? '',
    conversionqty: edit?.conversionqty ?? undefined,
    parentUomId: edit?.parentUomId ? String(edit.parentUomId) : '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvUom | null
  onSaved: () => void
}

export default function UomMasterModal({ open, onClose, editData, onSaved }: Props) {
  const organizationId = getInventoryOrganizationId()

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

  const { data: uoms = [], isLoading: uomsLoading } = useQuery({
    queryKey: QK.invUoms.list(),
    queryFn: listInvUoms,
    enabled: open,
  })

  const parentUomOptions = useMemo(
    () => uoms
      .filter((u) => u.isActive && u.uomId !== editData?.uomId)
      .map((u) => ({
        value: String(u.uomId),
        label: u.uomName ? `${u.uomCode ?? ''} — ${u.uomName}`.trim() : String(u.uomCode ?? u.uomId),
      })),
    [uoms, editData?.uomId],
  )

  useEffect(() => {
    reset(getDefaults(editData))
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvUom> = {
      uomCode: values.uomCode.trim(),
      uomName: values.uomName.trim(),
      conversionqty: values.conversionqty,
      parentUomId: values.parentUomId ? Number(values.parentUomId) : undefined,
      organizationId,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvUom(editData.uomId, payload)
    } else {
      await createInvUom(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit UOM' : 'Add UOM'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="space-y-0.5">
            <Label className="text-xs">UOM Code *</Label>
            <Input className="h-8 text-xs" {...register('uomCode')} />
            {errors.uomCode && <p className="text-xs text-red-500">{errors.uomCode.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">UOM Name *</Label>
            <Input className="h-8 text-xs" {...register('uomName')} />
            {errors.uomName && <p className="text-xs text-red-500">{errors.uomName.message}</p>}
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs">Conversion Qty</Label>
            <Input
              type="number"
              step="any"
              className="h-8 text-xs"
              {...register('conversionqty', { valueAsNumber: true })}
            />
          </div>
          <Controller
            name="parentUomId"
            control={control}
            render={({ field }) => (
              <Select
                label="Parent UOM"
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={parentUomOptions}
                placeholder="Select parent UOM"
                clearable
                searchable
                isLoading={uomsLoading}
              />
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
