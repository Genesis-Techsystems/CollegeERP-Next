'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Receipt } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  addMoreBooks,
  getLibraryBookById,
  getLibrarySettingValueByName,
  listBookRegistrationTypes,
  listLibraryCurrencyTypes,
} from '@/services'
import type { GeneralDetail } from '@/types/exam-master'
import { LIBRARY_FIELD_LABEL_CLASS, LIBRARY_INPUT_CLASS } from '../_lib/modal-styles'

type AddMoreBooksForm = {
  bookregTypeId: string | null
  valueLstAccNo: string
  noofcopies: string
  bookAmount: string
  currencyId: string | null
  amount: string
  purchaseSource: string
  purchaseReceiptNo: string
  dateOfPurchase: Date | undefined
}

function gdOptions(rows: GeneralDetail[]): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.generalDetailId ?? ''),
    label: String(r.generalDetailDisplayName ?? r.generalDetailCode ?? r.generalDetailId ?? ''),
  }))
}

export default function AddMoreBooksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = Number(searchParams.get('bookId') ?? 0)
  const collegeId = searchParams.get('collegeId') ?? ''
  const libraryId = searchParams.get('libraryId') ?? ''
  const bookcatId = searchParams.get('bookcatId') ?? ''
  const bookTitle = searchParams.get('bookTitle') ?? ''

  const [submitting, setSubmitting] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const { data: book, isLoading: loadingBook } = useQuery({
    queryKey: ['Library', 'book', bookId],
    queryFn: () => getLibraryBookById(bookId),
    enabled: bookId > 0,
  })

  const { data: regTypes = [] } = useQuery({
    queryKey: ['Library', 'bookRegTypes'],
    queryFn: listBookRegistrationTypes,
  })

  const { data: currencies = [] } = useQuery({
    queryKey: ['Library', 'currencyTypes'],
    queryFn: listLibraryCurrencyTypes,
  })

  const regTypeOptions = useMemo(() => gdOptions(regTypes), [regTypes])
  const currencyOptions = useMemo(() => gdOptions(currencies), [currencies])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddMoreBooksForm>({
    defaultValues: {
      bookregTypeId: null,
      valueLstAccNo: '',
      noofcopies: '',
      bookAmount: '',
      currencyId: null,
      amount: '',
      purchaseSource: '',
      purchaseReceiptNo: '',
      dateOfPurchase: new Date(),
    },
  })

  const bookregTypeId = watch('bookregTypeId')

  useEffect(() => {
    if (!bookregTypeId) return
    const picked = regTypes.find((r) => String(r.generalDetailId) === bookregTypeId)
    const code = picked?.generalDetailCode
    if (!code) return
    void getLibrarySettingValueByName(String(code)).then((val) => {
      if (val) setValue('valueLstAccNo', val)
    })
  }, [bookregTypeId, regTypes, setValue])

  const displayTitle = String(book?.title ?? book?.bookTitle ?? bookTitle ?? '—')
  const displayLibrary = String(book?.libraryCode ?? '—')
  const displayAvailable = String(book?.availableCopies ?? '—')

  function goBack() {
    const qs = new URLSearchParams()
    if (bookId) qs.set('bookId', String(bookId))
    if (collegeId) qs.set('collegeId', collegeId)
    if (libraryId) qs.set('libraryId', libraryId)
    if (bookcatId) qs.set('bookcatId', bookcatId)
    if (bookTitle) qs.set('bookTitle', bookTitle)
    const q = qs.toString()
    router.push(q ? `/library/books?${q}` : '/library/books')
  }

  async function onSubmit(values: AddMoreBooksForm) {
    if (!bookId || !book) {
      toastError('Book not loaded.')
      return
    }
    if (!values.bookregTypeId) {
      toastError('Book Registration Type is required.')
      return
    }

    setSubmitting(true)
    try {
      const bookDetail = {
        ...values,
        bookregTypeId: Number(values.bookregTypeId),
        noofcopies: values.noofcopies ? Number(values.noofcopies) : undefined,
        bookAmount: values.bookAmount ? Number(values.bookAmount) : undefined,
        bookTitle: book.title ?? book.bookTitle,
        libraryId: book.libraryId ?? (libraryId ? Number(libraryId) : undefined),
        isActive: true,
        availabilityStatus: 1,
      }

      const bookPurchaseDetails = {
        amount: values.amount ? Number(values.amount) : undefined,
        bookAmount: values.bookAmount ? Number(values.bookAmount) : undefined,
        currencyId: values.currencyId ? Number(values.currencyId) : undefined,
        dateOfPurchase: values.dateOfPurchase,
        isActive: true,
        noOfBooks: values.noofcopies ? Number(values.noofcopies) : undefined,
        purchaseReceiptNo: values.purchaseReceiptNo,
        purchaseSource: values.purchaseSource,
      }

      await addMoreBooks({
        ...book,
        bookId,
        bookDetail: [bookDetail],
        bookPurchaseDetails: [bookPurchaseDetails],
      })

      if (receiptFile) {
        // Receipt upload wired when backend multipart endpoint is confirmed
      }

      toastSuccess('Books added successfully')
      router.push('/library/books')
    } catch (e) {
      toastError(e, 'Could not add books')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
          Add New Books
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="app-card space-y-6 p-4">
        {loadingBook ? (
          <p className="text-sm text-muted-foreground">Loading book…</p>
        ) : (
          <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-3">
            <p className="text-[13px]">
              <span className="font-medium text-foreground">Book :</span>{' '}
              <span className="text-muted-foreground">{displayTitle}</span>
            </p>
            <p className="text-[13px]">
              <span className="font-medium text-foreground">Available Copies :</span>{' '}
              <span className="text-muted-foreground">{displayAvailable}</span>
            </p>
            <p className="text-[13px]">
              <span className="font-medium text-foreground">Library :</span>{' '}
              <span className="text-muted-foreground">{displayLibrary}</span>
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Book Registration Type"
            required
            value={bookregTypeId}
            onChange={(v) => setValue('bookregTypeId', v)}
            options={regTypeOptions}
            placeholder="Select type"
            searchable
            error={errors.bookregTypeId ? 'Required' : undefined}
          />
          <div className="space-y-1">
            <Label className={LIBRARY_FIELD_LABEL_CLASS}>Last Accession Number</Label>
            <Input className={LIBRARY_INPUT_CLASS} {...register('valueLstAccNo')} readOnly />
          </div>
          <div className="space-y-1">
            <Label className={LIBRARY_FIELD_LABEL_CLASS}>No of Copies</Label>
            <Input type="number" min={1} className={LIBRARY_INPUT_CLASS} {...register('noofcopies')} />
          </div>
          <div className="space-y-1">
            <Label className={LIBRARY_FIELD_LABEL_CLASS}>Each Book Cost</Label>
            <Input type="number" min={0} className={LIBRARY_INPUT_CLASS} {...register('bookAmount')} />
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold text-[hsl(var(--card-title))]">
            <Receipt className="h-4 w-4" aria-hidden />
            Book Purchase Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Currency Types"
              value={watch('currencyId')}
              onChange={(v) => setValue('currencyId', v)}
              options={currencyOptions}
              placeholder="Select currency"
              searchable
              clearable
            />
            <div className="space-y-1">
              <Label className={LIBRARY_FIELD_LABEL_CLASS}>Total Amount</Label>
              <Input type="number" min={0} className={LIBRARY_INPUT_CLASS} {...register('amount')} />
            </div>
            <div className="space-y-1">
              <Label className={LIBRARY_FIELD_LABEL_CLASS}>Purchase Source</Label>
              <Input className={LIBRARY_INPUT_CLASS} {...register('purchaseSource')} />
            </div>
            <div className="space-y-1">
              <Label className={LIBRARY_FIELD_LABEL_CLASS}>Receipt No</Label>
              <Input className={LIBRARY_INPUT_CLASS} {...register('purchaseReceiptNo')} />
            </div>
            <DatePicker
              label="Date Of Purchase"
              value={watch('dateOfPurchase') ?? null}
              onChange={(d) => setValue('dateOfPurchase', d ?? undefined)}
            />
            <div className="space-y-1">
              <Label className={LIBRARY_FIELD_LABEL_CLASS}>Receipt file</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                className={LIBRARY_INPUT_CLASS}
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={goBack}>
            Back
          </Button>
          <Button type="submit" size="sm" className="h-9 px-4" disabled={submitting || !book}>
            Submit
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
