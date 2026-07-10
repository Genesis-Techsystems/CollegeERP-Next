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
import {
  createStudentBatch,
  listActiveCollegesForStudentBatches,
  listCoursesForStudentBatches,
  listSubjectTypesForStudentBatches,
  updateStudentBatch,
} from '@/services'
import type { College } from '@/types/college'
import type { StudentBatch } from '@/types/student-batch'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  courseId: z.number().min(1, 'Course is required'),
  subtypeId: z.number().min(1, 'Subject type is required'),
  batchName: z.string().min(1, 'Batch name is required'),
  capacity: z.number().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
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

function valuesFromRow(row: StudentBatch, fallbackCollegeId?: number | null): FormValues {
  const collegeId = num(row.collegeId) || num(fallbackCollegeId)
  const courseId = num(row.courseId)
  const subtypeId = num(row.subtypeId) || num(row.subtype)
  return {
    collegeId: collegeId > 0 ? collegeId : (undefined as unknown as number),
    courseId: courseId > 0 ? courseId : (undefined as unknown as number),
    subtypeId: subtypeId > 0 ? subtypeId : (undefined as unknown as number),
    batchName: row.batchName ?? '',
    capacity: row.capacity ?? null,
    sortOrder: row.sortOrder ?? null,
    isActive: row.isActive !== false,
    reason: row.reason ?? '',
  }
}

export default function StudentBatchModal({
  open,
  onClose,
  row,
  onSaved,
  defaultCollegeId,
  defaultUniversityId,
}: Readonly<{
  open: boolean
  onClose: () => void
  row: StudentBatch | null
  onSaved: () => void
  defaultCollegeId?: number | null
  defaultUniversityId?: number | null
}>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [subjectTypes, setSubjectTypes] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [userDrivenCascade, setUserDrivenCascade] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      courseId: undefined,
      subtypeId: undefined,
      batchName: '',
      capacity: null,
      sortOrder: null,
      isActive: true,
      reason: 'active',
    },
  })

  const selectedCollegeId = watch('collegeId')
  const selectedCourseId = watch('courseId')
  const selectedSubtypeId = watch('subtypeId')

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === selectedCollegeId) ?? null,
    [colleges, selectedCollegeId],
  )

  const universityId = useMemo(() => {
    if (row?.universityId && row.universityId > 0) return row.universityId
    if (selectedCollege?.universityId) return selectedCollege.universityId
    if (defaultUniversityId && defaultUniversityId > 0) return defaultUniversityId
    return 0
  }, [row?.universityId, selectedCollege?.universityId, defaultUniversityId])

  const collegeOptions = useMemo(() => {
    const opts = colleges.map((c) => ({
      value: String(c.collegeId),
      label: c.collegeCode ?? c.collegeName,
    }))
    if (selectedCollegeId && !opts.some((o) => o.value === String(selectedCollegeId))) {
      opts.unshift({
        value: String(selectedCollegeId),
        label: row?.collegeCode ?? row?.collegeName ?? String(selectedCollegeId),
      })
    }
    return opts
  }, [colleges, selectedCollegeId, row?.collegeCode, row?.collegeName])

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
      const code = row?.courseCode ?? ''
      const name = row?.courseName ?? ''
      const label = code && name ? `${code} - ${name}` : (code || name || String(selectedCourseId))
      opts.unshift({ value: String(selectedCourseId), label })
    }
    return opts
  }, [courses, selectedCourseId, row?.courseCode, row?.courseName])

  const subjectTypeOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts = subjectTypes
      .map((t) => {
        const value = String(pickNum(t, [
          'generalDetailId', 'general_detail_id', 'pk_general_detail_id',
        ]))
        const label = pickText(t, [
          'generalDetailDisplayName',
          'generalDetailName',
          'displayName',
          'name',
        ])
        return { value, label }
      })
      .filter((o) => {
        if (!o.value || o.value === '0' || !o.label) return false
        if (seen.has(o.value)) return false
        seen.add(o.value)
        return true
      })

    if (selectedSubtypeId && !opts.some((o) => o.value === String(selectedSubtypeId))) {
      opts.unshift({
        value: String(selectedSubtypeId),
        label: row?.subjecttypeName ?? String(selectedSubtypeId),
      })
    }
    return opts
  }, [subjectTypes, selectedSubtypeId, row?.subjecttypeName])

  useEffect(() => {
    if (!open) {
      setUserDrivenCascade(false)
      return
    }
    setUserDrivenCascade(false)
    setSubmitError(null)
    listActiveCollegesForStudentBatches().then(setColleges).catch(console.error)
    listSubjectTypesForStudentBatches().then((rows) => setSubjectTypes(Array.isArray(rows) ? rows : [])).catch(() => setSubjectTypes([]))

    if (row) {
      reset(valuesFromRow(row, defaultCollegeId))
    } else {
      reset({
        collegeId: defaultCollegeId && defaultCollegeId > 0
          ? defaultCollegeId
          : (undefined as unknown as number),
        courseId: undefined as unknown as number,
        subtypeId: undefined as unknown as number,
        batchName: '',
        capacity: null,
        sortOrder: null,
        isActive: true,
        reason: 'active',
      })
    }
    const t = window.setTimeout(() => setUserDrivenCascade(true), 0)
    return () => window.clearTimeout(t)
  }, [open, row, reset, defaultCollegeId])

  useEffect(() => {
    if (!open) return
    if (!universityId) {
      setCourses([])
      return
    }
    listCoursesForStudentBatches(universityId)
      .then((rows) => setCourses(Array.isArray(rows) ? rows : []))
      .catch(() => setCourses([]))
  }, [open, universityId])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const payload = {
        collegeId: data.collegeId,
        courseId: data.courseId,
        subtypeId: data.subtypeId,
        batchName: data.batchName.trim(),
        capacity: data.capacity ?? null,
        sortOrder: data.sortOrder ?? null,
        isActive: data.isActive,
        reason: data.reason ?? (data.isActive ? 'active' : ''),
        universityId: universityId || undefined,
      }
      if (isEditing) {
        await updateStudentBatch(num(row?.studentbatchId), payload)
      } else {
        await createStudentBatch(payload)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save student batch')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Student Batch' : 'Add Student Batch'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : undefined)
                  if (userDrivenCascade) {
                    setValue('courseId', undefined as unknown as number)
                  }
                }}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                error={errors.collegeId?.message}
              />
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  disabled={!selectedCollegeId}
                  error={errors.courseId?.message}
                />
              )}
            />
            <Controller
              name="subtypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Subject Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={subjectTypeOptions}
                  placeholder="Select subject type"
                  searchable
                  error={errors.subtypeId?.message}
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="batchName">Batch Name *</Label>
            <Input id="batchName" {...register('batchName')} />
            {errors.batchName && <p className="text-xs text-red-500">{errors.batchName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', {
                  setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                })}
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register('sortOrder', {
                  setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                })}
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
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
