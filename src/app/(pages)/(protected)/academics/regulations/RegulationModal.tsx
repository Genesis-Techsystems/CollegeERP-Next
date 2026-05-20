'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DatePicker } from '@/common/components/date-picker'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRegulation, listActiveCoursesByUniversity, listActiveUniversities, listInternalExamMarkTypes, updateRegulation } from '@/services'

type AnyRow = Record<string, any>

const schema = z.object({
  universityId: z.number().min(1, 'University is required'),
  courseId: z.number().min(1, 'Course is required'),
  examIntMarkTypeId: z.number().min(1, 'Internal marks type is required'),
  regulationName: z.string().min(1, 'Regulation name is required'),
  regulationCode: z.string().min(1, 'Regulation code is required'),
  regulationDesc: z.string().optional(),
  sortOrder: z.union([z.number(), z.nan()]).optional(),
  effectiveFrom: z.date().nullable().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
const UNIFORM_LABEL_CLASS = '[&_label]:text-[12px] [&_label]:font-medium'

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const d = new Date(typeof value === 'string' || typeof value === 'number' ? value : '')
  return Number.isNaN(d.getTime()) ? null : d
}

function parseOptionalNumber(raw: unknown): number | undefined {
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  return n
}

export default function RegulationModal({
  open,
  onClose,
  row,
  existingRows,
  onSaved,
}: Readonly<{
  open: boolean
  onClose: () => void
  row: AnyRow | null
  existingRows: AnyRow[]
  onSaved: () => void
}>) {
  const isEditing = Boolean(row)
  const [universities, setUniversities] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [markTypes, setMarkTypes] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

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
      universityId: undefined,
      courseId: undefined,
      examIntMarkTypeId: undefined,
      regulationName: '',
      regulationCode: '',
      regulationDesc: '',
      sortOrder: undefined,
      effectiveFrom: new Date(),
      isActive: true,
      reason: 'active',
    },
  })

  const selectedUniversityId = watch('universityId')
  const currentRowId = pickNum(row, ['regulationId'])

  useEffect(() => {
    if (!open) return
    listActiveUniversities().then(setUniversities).catch(() => setUniversities([]))
    listInternalExamMarkTypes().then(setMarkTypes).catch(() => setMarkTypes([]))
  }, [open])

  useEffect(() => {
    if (!selectedUniversityId) {
      setCourses([])
      return
    }
    listActiveCoursesByUniversity(selectedUniversityId).then(setCourses).catch(() => setCourses([]))
  }, [selectedUniversityId])

  useEffect(() => {
    if (!open) return
    if (row) {
      reset({
        universityId: pickNum(row, ['universityId', 'fk_university_id']),
        courseId: pickNum(row, ['courseId', 'fk_course_id']),
        examIntMarkTypeId: pickNum(row, ['examIntMarkTypeId', 'fk_exam_int_mark_type_id']),
        regulationName: String(row.regulationName ?? ''),
        regulationCode: String(row.regulationCode ?? ''),
        regulationDesc: String(row.regulationDesc ?? ''),
        sortOrder: parseOptionalNumber(row.sortOrder),
        effectiveFrom: toDate(row.effectiveFrom),
        isActive: Boolean(row.isActive),
        reason: String(row.reason ?? ''),
      })
    } else {
      reset({
        universityId: undefined,
        courseId: undefined,
        examIntMarkTypeId: undefined,
        regulationName: '',
        regulationCode: '',
        regulationDesc: '',
        sortOrder: undefined,
        effectiveFrom: new Date(),
        isActive: true,
        reason: 'active',
      })
    }
    setSubmitError(null)
  }, [row, open, reset])

  const universityOptions = useMemo(
    () =>
      universities.map((u) => ({
        value: String(pickNum(u, ['universityId'])),
        label: String(u.universityCode ?? u.universityName ?? 'University'),
      })),
    [universities],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(pickNum(c, ['courseId'])),
        label: String(c.courseName ?? c.courseCode ?? 'Course'),
      })),
    [courses],
  )

  const markTypeOptions = useMemo(
    () =>
      markTypes.map((m) => ({
        value: String(pickNum(m, ['generalDetailId', 'pk_gd_id'])),
        label: String(m.generalDetailDisplayName ?? m.generalDetailCode ?? m.gd_display_name ?? 'Type'),
      })),
    [markTypes],
  )

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    const duplicate = existingRows.some((x) => {
      const id = pickNum(x, ['regulationId'])
      if (isEditing && id === currentRowId) return false
      const sameName = String(x.regulationName ?? '').trim().toLowerCase() === values.regulationName.trim().toLowerCase()
      const sameCode = String(x.regulationCode ?? '').trim().toLowerCase() === values.regulationCode.trim().toLowerCase()
      const sameCourse = pickNum(x, ['courseId', 'fk_course_id']) === values.courseId
      return sameName && sameCode && sameCourse
    })
    if (duplicate) {
      setSubmitError('Already regulation exists with same name in course')
      return
    }

    const payload: Record<string, unknown> = {
      universityId: values.universityId,
      courseId: values.courseId,
      examIntMarkTypeId: values.examIntMarkTypeId,
      regulationName: values.regulationName.trim(),
      regulationCode: values.regulationCode.trim(),
      regulationDesc: values.regulationDesc?.trim() || '',
      effectiveFrom: values.effectiveFrom ? values.effectiveFrom.toISOString() : null,
      sortOrder: parseOptionalNumber(values.sortOrder),
      isActive: values.isActive,
      reason: values.reason?.trim() || '',
    }

    try {
      if (isEditing) await updateRegulation(currentRowId, payload)
      else await createRegulation(payload)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save regulation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Regulation' : 'Add Regulation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Controller
              name="universityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="University"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('courseId', 0)
                  }}
                  options={universityOptions}
                  placeholder="Select university"
                  searchable
                  error={errors.universityId?.message}
                  className={`md:col-span-2 ${UNIFORM_LABEL_CLASS}`}
                />
              )}
            />
            <Controller
              name="courseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={courseOptions}
                  placeholder="Select course"
                  searchable
                  error={errors.courseId?.message}
                  className={`md:col-span-3 ${UNIFORM_LABEL_CLASS}`}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="reg-name" className="text-[12px] font-medium">Regulation Name *</Label>
              <Input id="reg-name" {...register('regulationName')} />
              {errors.regulationName && <p className="text-xs text-red-500">{errors.regulationName.message}</p>}
            </div>
            <div>
              <Label htmlFor="reg-code" className="text-[12px] font-medium">Regulation Code *</Label>
              <Input id="reg-code" {...register('regulationCode')} />
              {errors.regulationCode && <p className="text-xs text-red-500">{errors.regulationCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="reg-desc" className="text-[12px] font-medium">Description</Label>
              <Input id="reg-desc" {...register('regulationDesc')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Controller
              name="effectiveFrom"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Effective From"
                  value={field.value ?? null}
                  onChange={(d) => field.onChange(d)}
                  placeholder="Select date"
                  className={UNIFORM_LABEL_CLASS}
                />
              )}
            />

            <Controller
              name="examIntMarkTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Internal Marks Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={markTypeOptions}
                  placeholder="Select type"
                  searchable
                  error={errors.examIntMarkTypeId?.message}
                  className={UNIFORM_LABEL_CLASS}
                />
              )}
            />

            <div>
              <Label htmlFor="reg-sort" className="text-[12px] font-medium">Sort Order</Label>
              <Input
                id="reg-sort"
                type="number"
                onChange={(e) => setValue('sortOrder', parseOptionalNumber(e.target.value))}
                value={watch('sortOrder') ?? ''}
              />
            </div>
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

