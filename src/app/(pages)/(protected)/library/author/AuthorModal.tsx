'use client'

import { useEffect } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS, LIBRARY_MODAL_TITLE_CLASS } from '../_lib/modal-styles'
import { useLibraryOrgLibraryOptions } from '../_hooks/use-library-org-library'
import { createLibraryAuthor, updateLibraryAuthor } from '@/services'
import type { LibraryAuthor } from '@/types/library'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  libraryId: z.coerce.number().min(1, 'Library is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  shortName: z.string().optional(),
  pseudonym: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AuthorModalProps {
  open: boolean
  onClose: () => void
  row: LibraryAuthor | null
  onSaved: () => void
}

export function AuthorModal({ open, onClose, row, onSaved }: Readonly<AuthorModalProps>) {
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      organizationId: undefined,
      libraryId: undefined,
      firstName: '',
      lastName: '',
      shortName: '',
      pseudonym: '',
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
            firstName: row.firstName ?? '',
            lastName: row.lastName ?? '',
            shortName: row.shortName ?? '',
            pseudonym: row.pseudonym ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            firstName: '',
            lastName: '',
            shortName: '',
            pseudonym: '',
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
      if (isEditing && row?.authorId) {
        await updateLibraryAuthor(row.authorId, payload)
        toastSuccess('Author updated')
      } else {
        await createLibraryAuthor(payload)
        toastSuccess('Author created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} author`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Author' : 'Add Author'}
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
        <div className="space-y-1">
          <Label htmlFor="firstName" className={LIBRARY_FIELD_LABEL_CLASS}>First Name</Label>
          <Input id="firstName" className={LIBRARY_INPUT_CLASS} {...register('firstName')} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className={LIBRARY_FIELD_LABEL_CLASS}>Last Name</Label>
          <Input id="lastName" className={LIBRARY_INPUT_CLASS} {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="shortName" className={LIBRARY_FIELD_LABEL_CLASS}>Short Name</Label>
          <Input id="shortName" className={LIBRARY_INPUT_CLASS} {...register('shortName')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pseudonym" className={LIBRARY_FIELD_LABEL_CLASS}>Pseudonym</Label>
          <Input id="pseudonym" className={LIBRARY_INPUT_CLASS} {...register('pseudonym')} />
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
