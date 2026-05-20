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
import {
  createScholarshipType,
  listOrganizations,
  listUniversities,
  updateScholarshipType,
} from '@/services'
import type { ScholarshipType } from '@/types/scholarship'
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
  universityId: z.number().min(1, 'University is required'),
  scholarshipTypeCode: z.string().min(1, 'Type code is required'),
  scholarshipTypeDesc: z.string().min(1, 'Description is required'),
  sortOrder: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ScholarshipTypeModalProps {
  open: boolean
  onClose: () => void
  row: ScholarshipType | null
  onSaved: () => void
}

export function ScholarshipTypeModal({ open, onClose, row, onSaved }: Readonly<ScholarshipTypeModalProps>) {
  const isEditing = row != null
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [universities, setUniversities] = useState<SelectOption[]>([])

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
      universityId: undefined,
      scholarshipTypeCode: '',
      scholarshipTypeDesc: '',
      sortOrder: undefined,
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void Promise.all([listOrganizations(), listUniversities()]).then(([orgs, unis]) => {
      setOrganizations(orgs.map((o) => ({ value: String(o.organizationId), label: o.orgCode ?? o.orgName })))
      setUniversities(unis.map((u) => ({ value: String(u.universityId), label: u.universityCode ?? u.universityName })))
    })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            universityId: row.universityId,
            scholarshipTypeCode: row.scholarshipTypeCode,
            scholarshipTypeDesc: row.scholarshipTypeDesc,
            sortOrder: row.sortOrder,
            isActive: row.isActive,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            universityId: undefined,
            scholarshipTypeCode: '',
            scholarshipTypeDesc: '',
            sortOrder: undefined,
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
      if (isEditing && row) {
        await updateScholarshipType(row.scholarshipTypeId, payload)
        toastSuccess('Scholarship type updated')
      } else {
        await createScholarshipType(payload)
        toastSuccess('Scholarship type created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} scholarship type`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Scholarship Type' : 'Add Scholarship Type'}
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
        <Controller
          name="universityId"
          control={control}
          render={({ field }) => (
            <Select
              label="University"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={universities}
              placeholder="Select university"
              searchable
              error={errors.universityId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label className="text-[12px]">Type Code *</Label>
          <Input className="h-9 text-[12px]" {...register('scholarshipTypeCode')} />
          {errors.scholarshipTypeCode && (
            <p className="text-xs text-red-500">{errors.scholarshipTypeCode.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Description *</Label>
          <Input className="h-9 text-[12px]" {...register('scholarshipTypeDesc')} />
          {errors.scholarshipTypeDesc && (
            <p className="text-xs text-red-500">{errors.scholarshipTypeDesc.message}</p>
          )}
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
