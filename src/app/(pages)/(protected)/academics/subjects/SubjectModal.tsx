'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSubjectWithOptionalFile, listSubjectCategories, listSubjectTypes, updateSubjectWithOptionalFile } from '@/services'

type AnyRow = Record<string, any>

const schema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  subjectCode: z.string().min(1, 'Subject code is required'),
  subjectTypeId: z.number().optional(),
  subjectCategoryId: z.number().optional(),
  subCredits: z.number().optional(),
  subCreditHrs: z.number().optional(),
  shortName: z.string().min(1, 'Short name is required'),
  orderNo: z.number().optional(),
  isLanguage: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function parseOptionalNumber(raw: unknown): number | undefined {
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  return n
}

export default function SubjectModal({
  open,
  onClose,
  row,
  courseId,
  existingRows,
  onSaved,
}: Readonly<{
  open: boolean
  onClose: () => void
  row: AnyRow | null
  courseId: number
  existingRows: AnyRow[]
  onSaved: () => void
}>) {
  const isEditing = Boolean(row)
  const [subjectTypes, setSubjectTypes] = useState<AnyRow[]>([])
  const [subjectCategories, setSubjectCategories] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null)

  const {
    register,
    control,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectName: '',
      subjectCode: '',
      subjectTypeId: undefined,
      subjectCategoryId: undefined,
      subCredits: undefined,
      subCreditHrs: undefined,
      shortName: '',
      orderNo: undefined,
      isLanguage: false,
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    listSubjectTypes().then(setSubjectTypes).catch(() => setSubjectTypes([]))
    listSubjectCategories().then(setSubjectCategories).catch(() => setSubjectCategories([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    if (row) {
      reset({
        subjectName: String(row.subjectName ?? ''),
        subjectCode: String(row.subjectCode ?? ''),
        subjectTypeId: parseOptionalNumber(row.subjectTypeId),
        subjectCategoryId: parseOptionalNumber(row.subjectCategoryId),
        subCredits: parseOptionalNumber(row.subCredits),
        subCreditHrs: parseOptionalNumber(row.subCreditHrs),
        shortName: String(row.shortName ?? ''),
        orderNo: parseOptionalNumber(row.orderNo),
        isLanguage: Boolean(row.isLanguage),
        isActive: Boolean(row.isActive),
        reason: String(row.reason ?? ''),
      })
    } else {
      reset({
        subjectName: '',
        subjectCode: '',
        subjectTypeId: undefined,
        subjectCategoryId: undefined,
        subCredits: undefined,
        subCreditHrs: undefined,
        shortName: '',
        orderNo: undefined,
        isLanguage: false,
        isActive: true,
        reason: 'active',
      })
    }
    setSyllabusFile(null)
    setSubmitError(null)
  }, [row, open, reset])

  const subjectTypeOptions = useMemo(
    () =>
      subjectTypes.map((x) => ({
        value: String(pickNum(x, ['generalDetailId', 'pk_gd_id'])),
        label: String(x.generalDetailDisplayName ?? x.gd_display_name ?? x.generalDetailCode ?? 'Type'),
      })),
    [subjectTypes],
  )
  const subjectCategoryOptions = useMemo(
    () =>
      subjectCategories.map((x) => ({
        value: String(pickNum(x, ['generalDetailId', 'pk_gd_id'])),
        label: String(x.generalDetailDisplayName ?? x.gd_display_name ?? x.generalDetailCode ?? 'Category'),
      })),
    [subjectCategories],
  )

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    const duplicate = existingRows.some((x) => {
      const id = pickNum(x, ['subjectId'])
      if (isEditing && id === pickNum(row, ['subjectId'])) return false
      return String(x.subjectCode ?? '').trim().toLowerCase() === values.subjectCode.trim().toLowerCase()
    })
    if (duplicate) {
      setSubmitError('Already same subject code exists.')
      return
    }

    const payload: AnyRow = {
      courseId,
      subjectName: values.subjectName.trim(),
      subjectCode: values.subjectCode.trim(),
      subjectTypeId: parseOptionalNumber(values.subjectTypeId),
      subjectCategoryId: parseOptionalNumber(values.subjectCategoryId),
      subCredits: parseOptionalNumber(values.subCredits),
      subCreditHrs: parseOptionalNumber(values.subCreditHrs),
      shortName: values.shortName.trim(),
      orderNo: parseOptionalNumber(values.orderNo),
      isLanguage: values.isLanguage,
      isActive: values.isActive,
      reason: values.reason?.trim() || '',
    }

    try {
      if (isEditing) {
        await updateSubjectWithOptionalFile(pickNum(row, ['subjectId']), payload, syllabusFile)
      } else {
        await createSubjectWithOptionalFile(payload, syllabusFile)
      }
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save subject')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Subject' : 'Add Subject'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <Label htmlFor="subject-name" className="text-[12px] font-medium">Subject Name *</Label>
              <Input id="subject-name" {...register('subjectName')} />
              {errors.subjectName && <p className="text-xs text-red-500">{errors.subjectName.message}</p>}
            </div>
            <div>
              <Label htmlFor="subject-code" className="text-[12px] font-medium">Subject Code *</Label>
              <Input id="subject-code" {...register('subjectCode')} />
              {errors.subjectCode && <p className="text-xs text-red-500">{errors.subjectCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller
              name="subjectTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Subject Type"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={subjectTypeOptions}
                  placeholder="Select subject type"
                  searchable
                  className="[&_label]:text-[12px] [&_label]:font-medium"
                />
              )}
            />
            <Controller
              name="subjectCategoryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Subject Category"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={subjectCategoryOptions}
                  placeholder="Select subject category"
                  searchable
                  className="[&_label]:text-[12px] [&_label]:font-medium"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <Label htmlFor="sub-credits" className="text-[12px] font-medium">Credits</Label>
              <Input id="sub-credits" type="number" step="any" value={watch('subCredits') ?? ''} onChange={(e) => setValue('subCredits', parseOptionalNumber(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="sub-hrs" className="text-[12px] font-medium">Credit Hours</Label>
              <Input id="sub-hrs" type="number" step="any" value={watch('subCreditHrs') ?? ''} onChange={(e) => setValue('subCreditHrs', parseOptionalNumber(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="short-name" className="text-[12px] font-medium">Short Name *</Label>
              <Input id="short-name" {...register('shortName')} />
              {errors.shortName && <p className="text-xs text-red-500">{errors.shortName.message}</p>}
            </div>
            <div>
              <Label htmlFor="order-no" className="text-[12px] font-medium">Order No</Label>
              <Input id="order-no" type="number" value={watch('orderNo') ?? ''} onChange={(e) => setValue('orderNo', parseOptionalNumber(e.target.value))} />
            </div>
          </div>

          <div>
            <Label htmlFor="syllabus-file" className="text-[12px] font-medium">Syllabus File</Label>
            <Input id="syllabus-file" type="file" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" onChange={(e) => setSyllabusFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-[12px] font-medium">
              <input
                type="checkbox"
                checked={watch('isLanguage')}
                onChange={(e) => setValue('isLanguage', e.target.checked)}
              />
              <span>Is Language</span>
            </label>
          </div>

          {isEditing && (
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
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Close</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

