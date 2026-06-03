'use client'

import { useEffect, useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS, LIBRARY_MODAL_TITLE_CLASS } from '../../_lib/modal-styles'
import {
  getLibraryBookById,
  listActiveLibraryDetails,
  listBookBindTypes,
  listBookCategoriesByLibrary,
  listLanguageCategories,
  updateLibraryBook,
} from '@/services'
import type { LibraryRow } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  libraryId: z.coerce.number().min(1, 'Library is required'),
  title: z.string().min(1, 'Book title is required'),
  bookcatId: z.coerce.number().min(1, 'Department is required'),
  languageId: z.coerce.number().min(1, 'Language is required'),
  noOfPages: z.string().optional(),
  libraryRefPrefix: z.string().optional(),
  tags: z.string().optional(),
  customTags: z.string().optional(),
  isbn: z.string().optional(),
  year: z.string().optional(),
  edition: z.string().optional(),
  vol: z.string().optional(),
  bindingTypeId: z.string().optional(),
  subjectHeadings: z.string().optional(),
  callNumber: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function toSelectOptions<T extends { generalDetailId?: number; generalDetailDisplayName?: string; generalDetailCode?: string }>(
  rows: T[],
): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.generalDetailId ?? ''),
    label: String(r.generalDetailDisplayName ?? r.generalDetailCode ?? r.generalDetailId ?? ''),
  }))
}

interface EditBookModalProps {
  open: boolean
  onClose: () => void
  row: LibraryRow | null
  onSaved: () => void
}

export function EditBookModal({ open, onClose, row, onSaved }: Readonly<EditBookModalProps>) {
  const bookId = Number(row?.bookId ?? 0)

  const { data: book, isLoading: loadingBook } = useQuery({
    queryKey: ['Library', 'book', bookId, 'edit'],
    queryFn: () => getLibraryBookById(bookId),
    enabled: open && bookId > 0,
  })

  const { data: libraries = [] } = useQuery({
    queryKey: ['Library', 'libraryDetails', 'active'],
    queryFn: listActiveLibraryDetails,
    enabled: open,
  })

  const { data: languages = [] } = useQuery({
    queryKey: ['Library', 'languages'],
    queryFn: listLanguageCategories,
    enabled: open,
  })

  const { data: bindTypes = [] } = useQuery({
    queryKey: ['Library', 'bookBindTypes'],
    queryFn: listBookBindTypes,
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      libraryId: undefined,
      title: '',
      bookcatId: undefined,
      languageId: undefined,
      noOfPages: '',
      libraryRefPrefix: '',
      tags: '',
      customTags: '',
      isbn: '',
      year: '',
      edition: '',
      vol: '',
      bindingTypeId: '',
      subjectHeadings: '',
      callNumber: '',
    },
  })

  const libraryId = watch('libraryId')

  const { data: departments = [], isLoading: loadingDepartments } = useQuery({
    queryKey: ['Library', 'bookCategoriesByLibrary', libraryId],
    queryFn: () => listBookCategoriesByLibrary(Number(libraryId)),
    enabled: open && Number(libraryId) > 0,
  })

  const libraryOptions = useMemo<SelectOption[]>(
    () =>
      libraries.map((lib) => ({
        value: String(lib.libraryId ?? ''),
        label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId ?? ''),
      })),
    [libraries],
  )

  const departmentOptions = useMemo<SelectOption[]>(
    () =>
      departments.map((cat) => ({
        value: String(cat.bookcatId ?? ''),
        label: cat.bookCategoryCode ?? cat.bookCategoryName ?? String(cat.bookcatId ?? ''),
      })),
    [departments],
  )

  const languageOptions = useMemo(() => toSelectOptions(languages), [languages])
  const bindTypeOptions = useMemo(() => toSelectOptions(bindTypes), [bindTypes])

  useEffect(() => {
    if (!open || !bookId) return
    const source = book ?? row
    if (!source) return
    reset({
      libraryId: Number(source.libraryId ?? row?.libraryId ?? 0) || undefined,
      title: String(source.title ?? source.bookTitle ?? ''),
      bookcatId: Number(source.bookcatId ?? 0) || undefined,
      languageId: Number(source.languageId ?? 0) || undefined,
      noOfPages: source.noOfPages != null ? String(source.noOfPages) : '',
      libraryRefPrefix: String(source.libraryRefPrefix ?? ''),
      tags: String(source.tags ?? ''),
      customTags: String(source.customTags ?? ''),
      isbn: String(source.isbn ?? ''),
      year: source.year != null ? String(source.year) : '',
      edition: String(source.edition ?? ''),
      vol: String(source.vol ?? ''),
      bindingTypeId:
        source.bindingTypeId != null ? String(source.bindingTypeId) : '',
      subjectHeadings: String(source.subjectHeadings ?? ''),
      callNumber: String(source.callNumber ?? ''),
    })
  }, [open, bookId, book, row, reset])

  async function onSubmit(data: FormValues) {
    if (!bookId) return
    const bindingTypeId = data.bindingTypeId ? Number(data.bindingTypeId) : undefined
    const payload = {
      libraryId: data.libraryId,
      title: data.title.trim(),
      bookcatId: data.bookcatId,
      languageId: data.languageId,
      noOfPages: data.noOfPages?.trim() || undefined,
      libraryRefPrefix: data.libraryRefPrefix?.trim() || undefined,
      tags: data.tags?.trim() || undefined,
      customTags: data.customTags?.trim() || undefined,
      isbn: data.isbn?.trim() || undefined,
      year: data.year?.trim() || undefined,
      edition: data.edition?.trim() || undefined,
      vol: data.vol?.trim() || undefined,
      bindingTypeId: bindingTypeId && bindingTypeId > 0 ? bindingTypeId : undefined,
      subjectHeadings: data.subjectHeadings?.trim() || undefined,
      callNumber: data.callNumber?.trim() || undefined,
      authorId: (book ?? row)?.authorIds ?? (book ?? row)?.authorId,
      isActive: (book ?? row)?.isActive !== false,
    }
    try {
      await updateLibraryBook(bookId, payload)
      toastSuccess('Book updated')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, 'Failed to update book')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Book"
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      size="xl"
      cancelLabel="Close"
      submitLabel="Save"
      isSubmitting={isSubmitting || loadingBook}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Library <span className="text-destructive">*</span>
          </Label>
          <Select
            value={libraryId ? String(libraryId) : ''}
            onChange={(v) => {
              setValue('libraryId', Number(v))
              setValue('bookcatId', undefined as unknown as number)
            }}
            options={libraryOptions}
            placeholder="Select library"
            searchable
            disabled={loadingBook}
          />
          {errors.libraryId && (
            <p className="text-xs text-destructive">{errors.libraryId.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Book Title <span className="text-destructive">*</span>
          </Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('title')} disabled={loadingBook} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Department Name <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch('bookcatId') ? String(watch('bookcatId')) : ''}
            onChange={(v) => setValue('bookcatId', Number(v))}
            options={departmentOptions}
            placeholder="Select department"
            searchable
            isLoading={loadingDepartments}
            disabled={!libraryId || loadingBook}
          />
          {errors.bookcatId && (
            <p className="text-xs text-destructive">{errors.bookcatId.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Language <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch('languageId') ? String(watch('languageId')) : ''}
            onChange={(v) => setValue('languageId', Number(v))}
            options={languageOptions}
            placeholder="Select language"
            searchable
            disabled={loadingBook}
          />
          {errors.languageId && (
            <p className="text-xs text-destructive">{errors.languageId.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>No of pages</Label>
          <Input className={LIBRARY_INPUT_CLASS} type="number" {...register('noOfPages')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Library Referance Prefix</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('libraryRefPrefix')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Tags</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('tags')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Custom Tags</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('customTags')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>ISBN</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('isbn')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Year</Label>
          <Input className={LIBRARY_INPUT_CLASS} type="number" {...register('year')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Edition</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('edition')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Volume</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('vol')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Bind Type</Label>
          <Select
            value={watch('bindingTypeId') ?? ''}
            onChange={(v) => setValue('bindingTypeId', v ?? '')}
            options={bindTypeOptions}
            placeholder="Select bind type"
            searchable
            clearable
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Subject Headings</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('subjectHeadings')} />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Call Number</Label>
          <Input className={LIBRARY_INPUT_CLASS} {...register('callNumber')} />
        </div>
      </div>
    </FormModal>
  )
}
