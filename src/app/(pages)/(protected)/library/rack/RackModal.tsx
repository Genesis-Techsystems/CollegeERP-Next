'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS, LIBRARY_MODAL_TITLE_CLASS } from '../_lib/modal-styles'
import { useLibraryOrgLibraryOptions } from '../_hooks/use-library-org-library'
import { createLibraryRack, updateLibraryRack } from '@/services'
import type { LibraryRack } from '@/types/library'
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
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  libraryId: z.coerce.number().min(1, 'Library is required'),
  shelveName: z.string().min(1, 'Shelve name is required'),
  shelveCode: z.string().min(1, 'Shelve code is required'),
  noOfRows: optionalNumber,
  noOfColumns: optionalNumber,
  blockCapacity: optionalNumber,
  totalCapacity: optionalNumber,
  location: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RackModalProps {
  open: boolean
  onClose: () => void
  row: LibraryRack | null
  onSaved: () => void
}

export function RackModal({ open, onClose, row, onSaved }: Readonly<RackModalProps>) {
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
      organizationId: undefined,
      libraryId: undefined,
      shelveName: '',
      shelveCode: '',
      isActive: true,
      reason: 'active',
    },
  })

  const organizationId = watch('organizationId')
  const { organizations, libraries, loadingLibraries } = useLibraryOrgLibraryOptions(organizationId)

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            organizationId: row.organizationId,
            libraryId: row.libraryId,
            shelveName: row.shelveName ?? '',
            shelveCode: row.shelveCode ?? '',
            noOfRows: row.noOfRows,
            noOfColumns: row.noOfColumns,
            blockCapacity: row.blockCapacity,
            totalCapacity: row.totalCapacity,
            location: row.location ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            shelveName: '',
            shelveCode: '',
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
      if (isEditing && row?.shelveId) {
        await updateLibraryRack(row.shelveId, payload)
        toastSuccess('Rack updated')
      } else {
        await createLibraryRack(payload)
        toastSuccess('Rack created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} rack`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Rack' : 'Add Rack'}
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
        <div className="space-y-1.5">
          <Label>Organization</Label>
          <Select
            value={organizationId ? String(organizationId) : ''}
            onChange={(v) => {
              setValue('organizationId', Number(v))
              setValue('libraryId', undefined as unknown as number)
            }}
            options={organizations}
            placeholder="Select organization"
            searchable
          />
          {errors.organizationId && (
            <p className="text-xs text-destructive">{errors.organizationId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Library</Label>
          <Select
            value={watch('libraryId') ? String(watch('libraryId')) : ''}
            onChange={(v) => setValue('libraryId', Number(v))}
            options={libraries}
            placeholder="Select library"
            searchable
            isLoading={loadingLibraries}
            disabled={!organizationId}
          />
          {errors.libraryId && (
            <p className="text-xs text-destructive">{errors.libraryId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shelveName">Shelve Name</Label>
          <Input id="shelveName" {...register('shelveName')} />
          {errors.shelveName && <p className="text-xs text-destructive">{errors.shelveName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shelveCode">Shelve Code</Label>
          <Input id="shelveCode" {...register('shelveCode')} />
          {errors.shelveCode && <p className="text-xs text-destructive">{errors.shelveCode.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="noOfRows">No. of Rows</Label>
          <Input id="noOfRows" type="number" {...register('noOfRows')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="noOfColumns">No. of Columns</Label>
          <Input id="noOfColumns" type="number" {...register('noOfColumns')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blockCapacity">Block Capacity</Label>
          <Input id="blockCapacity" type="number" {...register('blockCapacity')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="totalCapacity">Total Capacity</Label>
          <Input id="totalCapacity" type="number" {...register('totalCapacity')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register('location')} />
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
