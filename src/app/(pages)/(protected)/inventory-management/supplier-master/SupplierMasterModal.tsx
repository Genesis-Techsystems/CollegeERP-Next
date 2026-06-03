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
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { createInvSupplier, listOrganizations, updateInvSupplier } from '@/services'
import type { InvSupplier } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  contact1Name: z.string().optional(),
  contact1Phone: z.string().optional(),
  contact1Email: z.string().email('Invalid email').optional().or(z.literal('')),
  cstno: z.string().optional(),
  gstno: z.string().optional(),
  startdate: z.string().nullable().optional(),
  enddate: z.string().nullable().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvSupplier | null): FormValues {
  const defaultOrgId = getInventoryOrganizationId()
  return {
    organizationId: edit?.organizationId ?? (defaultOrgId > 0 ? defaultOrgId : 0),
    supplierName: edit?.supplierName ?? '',
    contact1Name: edit?.contact1Name ?? '',
    contact1Phone: edit?.contact1Phone ?? '',
    contact1Email: edit?.contact1Email ?? '',
    cstno: edit?.cstno ?? '',
    gstno: edit?.gstno ?? '',
    startdate: edit?.startdate ?? null,
    enddate: edit?.enddate ?? null,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvSupplier | null
  onSaved: () => void
}

export default function SupplierMasterModal({ open, onClose, editData, onSaved }: Props) {
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

  const organizationId = watch('organizationId')

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['Organizations', 'list'],
    queryFn: listOrganizations,
    enabled: open,
  })

  const organizationOptions: SelectOption[] = useMemo(
    () => organizations
      .filter((o) => o.isActive !== false)
      .map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [organizations],
  )

  useEffect(() => {
    if (!open) return
    reset(getDefaults(editData))
  }, [open, editData, reset])

  useEffect(() => {
    if (!open || editData) return
    if (organizationId > 0) return
    const defaultOrgId = getInventoryOrganizationId()
    if (defaultOrgId > 0) setValue('organizationId', defaultOrgId)
  }, [open, editData, organizationId, setValue])

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvSupplier> = {
      supplierName: values.supplierName.trim(),
      organizationId: values.organizationId,
      contact1Name: values.contact1Name?.trim() || undefined,
      contact1Phone: values.contact1Phone?.trim() || undefined,
      contact1Email: values.contact1Email?.trim() || undefined,
      cstno: values.cstno?.trim() || undefined,
      gstno: values.gstno?.trim() || undefined,
      startdate: values.startdate ?? undefined,
      enddate: values.enddate ?? undefined,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvSupplier(editData.supplierId, payload)
    } else {
      await createInvSupplier(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Supplier Master' : 'Add Supplier Master'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={organizationOptions}
                placeholder="Select organization"
                isLoading={orgsLoading}
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />

          <div className="space-y-0.5">
            <Label className="text-xs">Supplier Name *</Label>
            <Input className="h-8 text-xs" {...register('supplierName')} />
            {errors.supplierName && <p className="text-xs text-red-500">{errors.supplierName.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Contact Name</Label>
              <Input className="h-8 text-xs" {...register('contact1Name')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Contact Phone</Label>
              <Input className="h-8 text-xs" {...register('contact1Phone')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Contact Email</Label>
              <Input type="email" className="h-8 text-xs" {...register('contact1Email')} />
              {errors.contact1Email && <p className="text-xs text-red-500">{errors.contact1Email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-0.5">
              <Label className="text-xs">CST No</Label>
              <Input className="h-8 text-xs" {...register('cstno')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">GST No</Label>
              <Input className="h-8 text-xs" {...register('gstno')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="startdate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Start Date"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.toISOString() : null)}
                />
              )}
            />
            <Controller
              name="enddate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="End Date"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.toISOString() : null)}
                />
              )}
            />
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
