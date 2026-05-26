'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Label } from '@/components/ui/label'
import { LIBRARY_MODAL_TITLE_CLASS } from '../_lib/modal-styles'
import { useLibraryOrgLibraryOptions } from '../_hooks/use-library-org-library'
import {
  createLibraryBookCategory,
  listLibraryCategories,
  updateLibraryBookCategory,
} from '@/services'
import type { LibraryBookCategory } from '@/types/library'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  libraryId: z.coerce.number().min(1, 'Library is required'),
  libCategoryId: z.coerce.number().min(1, 'Category is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface BookDepartmentModalProps {
  open: boolean
  onClose: () => void
  row: LibraryBookCategory | null
  onSaved: () => void
}

export function BookDepartmentModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<BookDepartmentModalProps>) {
  const isEditing = row != null
  const [categories, setCategories] = useState<SelectOption[]>([])

  const {
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
      libCategoryId: undefined,
      isActive: true,
      reason: 'active',
    },
  })

  const organizationId = watch('organizationId')
  const { organizations, libraries, loadingLibraries } = useLibraryOrgLibraryOptions(organizationId)

  useEffect(() => {
    if (!open) return
    void listLibraryCategories().then((rows) => {
      setCategories(
        rows.map((c) => ({
          value: String(c.libCategoryId),
          label: `${c.bookCategoryCode ?? ''} — ${c.bookCategoryName ?? c.libCategoryId}`,
        })),
      )
    })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            libraryId: row.libraryId,
            libCategoryId: row.libCategoryId,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            libCategoryId: undefined,
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
      if (isEditing && row?.bookcatId) {
        await updateLibraryBookCategory(row.bookcatId, payload)
        toastSuccess('Book department updated')
      } else {
        await createLibraryBookCategory(payload)
        toastSuccess('Book department created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} book department`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Book Department' : 'Add Book Department'}
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Library Category</Label>
          <Select
            value={watch('libCategoryId') ? String(watch('libCategoryId')) : ''}
            onChange={(v) => setValue('libCategoryId', Number(v))}
            options={categories}
            placeholder="Select category"
            searchable
          />
          {errors.libCategoryId && (
            <p className="text-xs text-destructive">{errors.libCategoryId.message}</p>
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
