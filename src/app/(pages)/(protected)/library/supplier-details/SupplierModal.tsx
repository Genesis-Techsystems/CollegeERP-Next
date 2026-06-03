'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS, LIBRARY_MODAL_TITLE_CLASS } from '../_lib/modal-styles'
import { createLibrarySupplier, listOrganizations, updateLibrarySupplier } from '@/services'
import type { LibrarySupplier } from '@/types/library'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  suppliername: z.string().min(1, 'Supplier name is required'),
  suppliercode: z.string().min(1, 'Supplier code is required'),
  contactPersonName: z.string().optional(),
  address: z.string().optional(),
  phoneNo: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SupplierModalProps {
  open: boolean
  onClose: () => void
  row: LibrarySupplier | null
  onSaved: () => void
}

export function SupplierModal({ open, onClose, row, onSaved }: Readonly<SupplierModalProps>) {
  const isEditing = row != null
  const [organizations, setOrganizations] = useState<SelectOption[]>([])

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
      organizationId: undefined,
      suppliername: '',
      suppliercode: '',
      contactPersonName: '',
      address: '',
      phoneNo: '',
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void listOrganizations().then((rows) => {
      setOrganizations(
        rows.map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode ?? o.orgName ?? String(o.organizationId),
        })),
      )
    })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            suppliername: row.suppliername ?? '',
            suppliercode: row.suppliercode ?? '',
            contactPersonName: row.contactPersonName ?? '',
            address: row.address ?? '',
            phoneNo: row.phoneNo ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            suppliername: '',
            suppliercode: '',
            contactPersonName: '',
            address: '',
            phoneNo: '',
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.supplierId) {
        await updateLibrarySupplier(row.supplierId, payload)
        toastSuccess('Supplier updated')
      } else {
        await createLibrarySupplier(payload)
        toastSuccess('Supplier created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} supplier`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Supplier' : 'Add Supplier'}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel={isEditing ? 'Update' : 'Save'}
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Organization</Label>
          <Select
            value={watch('organizationId') ? String(watch('organizationId')) : ''}
            onChange={(v) => setValue('organizationId', Number(v))}
            options={organizations}
            placeholder="Select organization"
            searchable
          />
          {errors.organizationId && (
            <p className="text-xs text-destructive">{errors.organizationId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suppliername">Supplier Name</Label>
          <Input id="suppliername" {...register('suppliername')} />
          {errors.suppliername && (
            <p className="text-xs text-destructive">{errors.suppliername.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suppliercode">Supplier Code</Label>
          <Input id="suppliercode" {...register('suppliercode')} />
          {errors.suppliercode && (
            <p className="text-xs text-destructive">{errors.suppliercode.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPersonName">Contact Person</Label>
          <Input id="contactPersonName" {...register('contactPersonName')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNo">Phone</Label>
          <Input id="phoneNo" {...register('phoneNo')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register('address')} />
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
                reasonError={errors.reason?.message}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
