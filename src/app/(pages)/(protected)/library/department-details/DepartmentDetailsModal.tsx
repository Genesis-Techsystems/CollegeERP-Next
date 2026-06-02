'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS, LIBRARY_MODAL_TITLE_CLASS } from '../_lib/modal-styles'
import { createLibraryCategory, updateLibraryCategory } from '@/services'
import type { LibraryCategory } from '@/types/library'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  bookCategoryName: z.string().min(1, 'Name is required'),
  bookCategoryCode: z.string().min(1, 'Code is required'),
  deptNo: z.string().optional(),
  inBarcode: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DepartmentDetailsModalProps {
  open: boolean
  onClose: () => void
  row: LibraryCategory | null
  onSaved: () => void
}

export function DepartmentDetailsModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<DepartmentDetailsModalProps>) {
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
      bookCategoryName: '',
      bookCategoryCode: '',
      deptNo: '',
      inBarcode: '',
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            bookCategoryName: row.bookCategoryName ?? '',
            bookCategoryCode: row.bookCategoryCode ?? '',
            deptNo: row.deptNo ?? '',
            inBarcode: row.inBarcode ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            bookCategoryName: '',
            bookCategoryCode: '',
            deptNo: '',
            inBarcode: '',
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
      if (isEditing && row?.libCategoryId) {
        await updateLibraryCategory(row.libCategoryId, payload)
        toastSuccess('Department details updated')
      } else {
        await createLibraryCategory(payload)
        toastSuccess('Department details created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} department details`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Department Details' : 'Add Department Details'}
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
          <Label htmlFor="bookCategoryCode">Category Code</Label>
          <Input id="bookCategoryCode" {...register('bookCategoryCode')} />
          {errors.bookCategoryCode && (
            <p className="text-xs text-destructive">{errors.bookCategoryCode.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bookCategoryName">Category Name</Label>
          <Input id="bookCategoryName" {...register('bookCategoryName')} />
          {errors.bookCategoryName && (
            <p className="text-xs text-destructive">{errors.bookCategoryName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deptNo">Dept No</Label>
          <Input id="deptNo" {...register('deptNo')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inBarcode">In Barcode</Label>
          <Input id="inBarcode" {...register('inBarcode')} />
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
