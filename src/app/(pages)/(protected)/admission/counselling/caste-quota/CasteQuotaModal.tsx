'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCasteQuota, listOrganizations, updateCasteQuota } from '@/services'
import type { CasteQuotaRow } from '@/types/admission'
import { toastError, toastSuccess } from '@/lib/toast'

const optionalNumber = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  },
  z.number().optional(),
)

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  casteQuota: z.string().min(1, 'Caste quota is required'),
  casteQuotaDescription: z.string().optional(),
  sortOrder: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface CasteQuotaModalProps {
  open: boolean
  onClose: () => void
  row: CasteQuotaRow | null
  onSaved: () => void
}

export function CasteQuotaModal({ open, onClose, row, onSaved }: Readonly<CasteQuotaModalProps>) {
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      organizationId: undefined,
      casteQuota: '',
      casteQuotaDescription: '',
      sortOrder: undefined,
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void listOrganizations().then((orgs) => {
      setOrganizations(
        orgs.map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode ?? o.orgName ?? String(o.organizationId),
        })),
      )
    })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            casteQuota: row.casteQuota ?? row.caste ?? '',
            casteQuotaDescription: row.casteQuotaDescription ?? '',
            sortOrder: row.sortOrder,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            casteQuota: '',
            casteQuotaDescription: '',
            sortOrder: undefined,
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      casteQuotaId: row?.casteQuotaId,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing) {
        await updateCasteQuota(payload)
        toastSuccess('Caste quota updated')
      } else {
        await createCasteQuota(payload)
        toastSuccess('Caste quota created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} caste quota`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Caste Quota' : 'Add Caste Quota'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit, () => {
          toastError(new Error('Please fill in all required fields'))
        })()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={organizations}
              placeholder="Select organization"
              searchable
              error={errors.organizationId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label className="text-[12px]">Caste Quota *</Label>
          <Input className="h-9 text-[12px]" {...register('casteQuota')} />
          {errors.casteQuota && (
            <p className="text-xs text-red-500">{errors.casteQuota.message}</p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[12px]">Description</Label>
          <Input className="h-9 text-[12px]" {...register('casteQuotaDescription')} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Sort Order</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('sortOrder')} />
          {errors.sortOrder && (
            <p className="text-xs text-red-500">{errors.sortOrder.message}</p>
          )}
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
