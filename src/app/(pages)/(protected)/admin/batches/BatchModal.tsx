'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createBatch,
  getBatchById,
  listActiveCollegesForBatches,
  listCollegeWiseCourses,
  listRegulationsByCourse,
  updateBatch,
} from '@/services'
import type { Batch } from '@/types/batch'
import type { College } from '@/types/college'

const DATE_INPUT_CLASS = 'org-modal-date-input pr-10'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  courseId: z.number().min(1, 'Course is required'),
  regulationId: z.number().min(1, 'Regulation is required'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  batchName: z.string().min(1, 'Batch name is required'),
  batchCode: z.string().min(1, 'Batch code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
}).refine((v) => new Date(v.fromDate).getTime() <= new Date(v.toDate).getTime(), {
  path: ['toDate'],
  message: 'To date must be after From date',
})
type FormValues = z.infer<typeof schema>

type AnyRow = Record<string, unknown>

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as AnyRow)[p]
    }
    const parsed = num(cur)
    if (parsed > 0) return parsed
  }
  return 0
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const parts = key.split('.')
    let cur: unknown = row
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') {
        cur = undefined
        break
      }
      cur = (cur as AnyRow)[p]
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim()
    if (typeof cur === 'number' && Number.isFinite(cur)) return String(cur)
  }
  return ''
}

function asDateInputValue(value: string | undefined): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const dmy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  const dmdot = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmdot) return `${dmdot[3]}-${dmdot[2]}-${dmdot[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function valuesFromRow(row: Batch): FormValues {
  const collegeId = num(row.collegeId)
  const courseId = num(row.courseId)
  const regulationId = num(row.regulationId)
  return {
    collegeId: collegeId > 0 ? collegeId : (undefined as unknown as number),
    courseId: courseId > 0 ? courseId : (undefined as unknown as number),
    regulationId: regulationId > 0 ? regulationId : (undefined as unknown as number),
    fromDate: asDateInputValue(row.fromDate ?? row.batchFrom),
    toDate: asDateInputValue(row.toDate ?? row.batchTo),
    batchName: row.batchName ?? '',
    batchCode: row.batchCode ?? '',
    isActive: row.isActive !== false,
    reason: row.reason ?? '',
  }
}

function emptyValues(): FormValues {
  return {
    collegeId: undefined as unknown as number,
    courseId: undefined as unknown as number,
    regulationId: undefined as unknown as number,
    fromDate: asDateInputValue(new Date().toISOString()),
    toDate: asDateInputValue(new Date().toISOString()),
    batchName: '',
    batchCode: '',
    isActive: true,
    reason: '',
  }
}

export default function BatchModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Batch | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hydrating, setHydrating] = useState(false)
  const [editSource, setEditSource] = useState<Batch | null>(null)
  const userDrivenCascade = useRef(false)

  const { register, handleSubmit, reset, control, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })
  const selectedCollegeId = watch('collegeId')
  const selectedCourseId = watch('courseId')
  const selectedRegulationId = watch('regulationId')
  const source = editSource ?? row

  const collegeOptions = useMemo(() => {
    const opts = colleges.map((c) => ({
      value: String(c.collegeId),
      label: c.collegeName ?? c.collegeCode,
    }))
    if (selectedCollegeId && !opts.some((o) => o.value === String(selectedCollegeId))) {
      opts.unshift({
        value: String(selectedCollegeId),
        label: source?.collegeCode ?? String(selectedCollegeId),
      })
    }
    return opts
  }, [colleges, selectedCollegeId, source?.collegeCode])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts = courses
      .map((c) => {
        const value = String(pickNum(c, [
          'courseId', 'fk_course_id', 'course_id', 'course.courseId', 'Course.courseId',
        ]))
        const code = pickText(c, ['courseCode', 'course_code', 'course.courseCode', 'Course.courseCode'])
        const name = pickText(c, ['courseName', 'course_name', 'course.courseName', 'Course.courseName'])
        const label = code && name ? `${code} - ${name}` : (code || name)
        return { value, label }
      })
      .filter((o) => {
        if (!o.value || o.value === '0' || !o.label) return false
        if (seen.has(o.value)) return false
        seen.add(o.value)
        return true
      })

    if (selectedCourseId && !opts.some((o) => o.value === String(selectedCourseId))) {
      const code = source?.courseCode ?? ''
      const name = source?.courseName ?? ''
      const label = code && name ? `${code} - ${name}` : (code || name || String(selectedCourseId))
      opts.unshift({ value: String(selectedCourseId), label })
    }
    return opts
  }, [courses, selectedCourseId, source?.courseCode, source?.courseName])

  const regulationOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts = regulations
      .map((r) => {
        const value = String(pickNum(r, [
          'regulationId', 'fk_regulation_id', 'regulation_id', 'regulation.regulationId', 'Regulation.regulationId',
        ]))
        const label = pickText(r, [
          'regulationCode', 'regulation_code', 'regulationName', 'regulation_name',
          'regulation.regulationCode', 'Regulation.regulationCode',
        ])
        return { value, label }
      })
      .filter((o) => {
        if (!o.value || o.value === '0' || !o.label) return false
        if (seen.has(o.value)) return false
        seen.add(o.value)
        return true
      })

    if (selectedRegulationId && !opts.some((o) => o.value === String(selectedRegulationId))) {
      const label = source?.regulationCode || source?.regulationName || String(selectedRegulationId)
      opts.unshift({ value: String(selectedRegulationId), label })
    }
    return opts
  }, [regulations, selectedRegulationId, source?.regulationCode, source?.regulationName])

  // Open: hydrate from list row immediately, then refresh from detail API.
  useEffect(() => {
    if (!open) {
      userDrivenCascade.current = false
      setEditSource(null)
      setHydrating(false)
      return
    }

    userDrivenCascade.current = false
    setSubmitError(null)
    listActiveCollegesForBatches().then(setColleges).catch(console.error)

    if (!row) {
      setEditSource(null)
      reset(emptyValues())
      userDrivenCascade.current = true
      return
    }

    // Fill immediately from grid row so fields are not blank while detail loads.
    setEditSource(row)
    reset(valuesFromRow(row))

    let cancelled = false
    setHydrating(true)
    void (async () => {
      try {
        const detail = await getBatchById(row.batchId)
        if (cancelled) return
        const merged: Batch = {
          ...row,
          ...(detail ?? {}),
          batchId: row.batchId,
          collegeId: num(detail?.collegeId) || num(row.collegeId) || undefined,
          courseId: num(detail?.courseId) || num(row.courseId) || undefined,
          regulationId: num(detail?.regulationId) || num(row.regulationId) || undefined,
          batchCode: (detail?.batchCode || row.batchCode || '').trim(),
          batchName: (detail?.batchName || row.batchName || '').trim(),
          fromDate: detail?.fromDate || detail?.batchFrom || row.fromDate || row.batchFrom,
          toDate: detail?.toDate || detail?.batchTo || row.toDate || row.batchTo,
          collegeCode: detail?.collegeCode || row.collegeCode,
          courseCode: detail?.courseCode || row.courseCode,
          courseName: detail?.courseName || row.courseName,
          regulationCode: detail?.regulationCode || row.regulationCode,
          regulationName: detail?.regulationName || row.regulationName,
          isActive: detail?.isActive ?? row.isActive,
          reason: detail?.reason ?? row.reason,
        }
        setEditSource(merged)
        reset(valuesFromRow(merged))
      } finally {
        if (!cancelled) {
          setHydrating(false)
          userDrivenCascade.current = true
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, row, reset])

  // If college still missing after hydration, infer from college-wise courses by courseId.
  useEffect(() => {
    if (!open || !isEditing) return
    const collegeId = num(getValues('collegeId'))
    const courseId = num(selectedCourseId)
    if (collegeId > 0 || courseId <= 0 || colleges.length === 0) return

    let cancelled = false
    void (async () => {
      for (const college of colleges) {
        if (cancelled) return
        try {
          const rows = await listCollegeWiseCourses(college.collegeId)
          const found = (Array.isArray(rows) ? rows : []).some(
            (c) => pickNum(c as AnyRow, ['courseId', 'fk_course_id', 'course_id']) === courseId,
          )
          if (found) {
            setValue('collegeId', college.collegeId, { shouldDirty: false })
            setEditSource((prev) => prev ? { ...prev, collegeId: college.collegeId, collegeCode: college.collegeCode } : prev)
            return
          }
        } catch {
          // try next college
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, isEditing, selectedCourseId, colleges, getValues, setValue])

  useEffect(() => {
    if (!open) return
    if (!selectedCollegeId) {
      setCourses([])
      return
    }
    listCollegeWiseCourses(selectedCollegeId)
      .then((rows) => setCourses(Array.isArray(rows) ? rows : []))
      .catch(() => setCourses([]))
  }, [open, selectedCollegeId])

  useEffect(() => {
    if (!open) return
    if (!selectedCourseId) {
      setRegulations([])
      return
    }
    listRegulationsByCourse(selectedCourseId)
      .then((rows) => setRegulations(Array.isArray(rows) ? rows : []))
      .catch(() => setRegulations([]))
  }, [open, selectedCourseId])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const payload = {
        collegeId: data.collegeId,
        courseId: data.courseId,
        regulationId: data.regulationId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        batchFrom: data.fromDate,
        batchTo: data.toDate,
        batchName: data.batchName,
        batchCode: data.batchCode,
        isActive: data.isActive,
        reason: data.reason,
      }
      if (isEditing) await updateBatch(row!.batchId, payload, source ?? row!)
      else await createBatch(payload as Parameters<typeof createBatch>[0])
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save batch')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Batch' : 'Add Batch'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller name="collegeId" control={control} render={({ field }) => (
            <Select
              label="College"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : undefined)
                if (userDrivenCascade.current) {
                  setValue('courseId', undefined as unknown as number)
                  setValue('regulationId', undefined as unknown as number)
                }
              }}
              options={collegeOptions}
              placeholder={hydrating ? 'Loading…' : 'Select college'}
              searchable
              isLoading={hydrating && !field.value}
              error={errors.collegeId?.message}
            />
          )} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller name="courseId" control={control} render={({ field }) => (
              <Select
                label="Course"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : undefined)
                  if (userDrivenCascade.current) {
                    setValue('regulationId', undefined as unknown as number)
                  }
                }}
                options={courseOptions}
                placeholder="Select course"
                searchable
                disabled={!selectedCollegeId}
                error={errors.courseId?.message}
              />
            )} />
            <Controller name="regulationId" control={control} render={({ field }) => (
              <Select
                label="Regulation"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={regulationOptions}
                placeholder="Select regulation"
                searchable
                disabled={!selectedCourseId}
                error={errors.regulationId?.message}
              />
            )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="fromDate">From Date *</Label>
              <Input id="fromDate" type="date" className={DATE_INPUT_CLASS} {...register('fromDate')} />
              {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="toDate">To Date *</Label>
              <Input
                id="toDate"
                type="date"
                className={DATE_INPUT_CLASS}
                min={watch('fromDate') || undefined}
                {...register('toDate')}
              />
              {errors.toDate && <p className="text-xs text-red-500">{errors.toDate.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="bn">Batch Name *</Label>
              <Input id="bn" {...register('batchName')} />
              {errors.batchName && <p className="text-xs text-red-500">{errors.batchName.message}</p>}
            </div>
            <div>
              <Label htmlFor="bc">Batch Code *</Label>
              <Input id="bc" {...register('batchCode')} />
              {errors.batchCode && <p className="text-xs text-red-500">{errors.batchCode.message}</p>}
            </div>
          </div>
          {isEditing && (
            <Controller name="isActive" control={control} render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', v)}
                reasonError={errors.reason?.message}
              />
            )} />
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || hydrating}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
