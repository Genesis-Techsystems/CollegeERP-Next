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
import { createGroupSection, updateGroupSection } from '@/services'
import type { GroupSection } from '@/types/group-section'

export type GroupSectionFilterDefaults = {
  universityId?: number | null
  collegeId?: number | null
  academicYearId?: number | null
  courseId?: number | null
  courseGroupId?: number | null
  courseYearId?: number | null
}

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  academicYearId: z.number().min(1, 'Academic year is required'),
  courseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
  courseYearId: z.number().min(1, 'Course year is required'),
  groupSectionName: z.string().min(1, 'Section name is required'),
  groupSectionCode: z.string().min(1, 'Section code is required'),
  sortOrder: z.coerce.number().min(0, 'Sort order must be 0 or greater').optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function dedupeById<T extends Record<string, unknown>>(
  rows: T[],
  idKey: string,
  sort?: (a: T, b: T) => number,
): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const row of rows) {
    const id = num(row[idKey])
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return sort ? out.sort(sort) : out
}

export default function GroupSectionModal({
  open,
  onClose,
  row,
  onSaved,
  filterDefaults,
  filtersData = [],
  academicData = [],
}: Readonly<{
  open: boolean
  onClose: () => void
  row: GroupSection | null
  onSaved: () => void
  filterDefaults?: GroupSectionFilterDefaults
  filtersData?: Record<string, unknown>[]
  academicData?: Record<string, unknown>[]
}>) {
  const isEditing = Boolean(row)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [universityId, setUniversityId] = useState<number | null>(null)

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      academicYearId: undefined,
      courseId: undefined,
      courseGroupId: undefined,
      courseYearId: undefined,
      groupSectionName: '',
      groupSectionCode: '',
      sortOrder: 0,
      isActive: true,
      reason: '',
    },
  })

  const selectedCollegeId = watch('collegeId')
  const selectedCourseId = watch('courseId')
  const selectedCourseGroupId = watch('courseGroupId')

  const colleges = useMemo(() => {
    if (!universityId) return []
    return dedupeById(
      filtersData.filter((r) => num(r.fk_university_id) === universityId),
      'fk_college_id',
      (a, b) => num(a.clg_sort_order) - num(b.clg_sort_order),
    )
  }, [filtersData, universityId])

  const academicYears = useMemo(() => {
    if (!universityId) return []
    return dedupeById(
      academicData.filter((r) => num(r.fk_university_id) === universityId),
      'fk_academic_year_id',
      (a, b) => String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')),
    )
  }, [academicData, universityId])

  const courses = useMemo(() => {
    if (!universityId || !selectedCollegeId) return []
    return dedupeById(
      filtersData.filter(
        (r) => num(r.fk_university_id) === universityId && num(r.fk_college_id) === selectedCollegeId,
      ),
      'fk_course_id',
    )
  }, [filtersData, universityId, selectedCollegeId])

  const courseGroups = useMemo(() => {
    if (!universityId || !selectedCollegeId || !selectedCourseId) return []
    return dedupeById(
      filtersData.filter(
        (r) =>
          num(r.fk_university_id) === universityId &&
          num(r.fk_college_id) === selectedCollegeId &&
          num(r.fk_course_id) === selectedCourseId,
      ),
      'fk_course_group_id',
    )
  }, [filtersData, universityId, selectedCollegeId, selectedCourseId])

  const courseYears = useMemo(() => {
    if (!universityId || !selectedCollegeId || !selectedCourseId || !selectedCourseGroupId) return []
    return dedupeById(
      filtersData.filter(
        (r) =>
          num(r.fk_university_id) === universityId &&
          num(r.fk_college_id) === selectedCollegeId &&
          num(r.fk_course_id) === selectedCourseId &&
          num(r.fk_course_group_id) === selectedCourseGroupId,
      ),
      'fk_course_year_id',
      (a, b) => num(a.year_order) - num(b.year_order),
    )
  }, [filtersData, universityId, selectedCollegeId, selectedCourseId, selectedCourseGroupId])

  useEffect(() => {
    if (!open) return

    const uniFromDefaults = filterDefaults?.universityId ?? null
    const uniFromCollege = filterDefaults?.collegeId
      ? num(
          filtersData.find((r) => num(r.fk_college_id) === filterDefaults.collegeId)?.fk_university_id,
        )
      : 0
    const uniFromRow = row?.collegeId
      ? num(filtersData.find((r) => num(r.fk_college_id) === row.collegeId)?.fk_university_id)
      : 0

    setUniversityId(uniFromDefaults || uniFromCollege || uniFromRow || num(filtersData[0]?.fk_university_id) || null)
    setSubmitError(null)

    if (row) {
      const courseIdFromGroup = num(
        filtersData.find((r) => num(r.fk_course_group_id) === row.courseGroupId)?.fk_course_id,
      )
      reset({
        collegeId: row.collegeId,
        academicYearId: filterDefaults?.academicYearId ?? undefined,
        courseId: courseIdFromGroup || filterDefaults?.courseId || undefined,
        courseGroupId: row.courseGroupId,
        courseYearId: row.courseYearId,
        groupSectionName: row.groupSectionName,
        groupSectionCode: row.groupSectionCode,
        sortOrder: row.sortOrder ?? 0,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
      return
    }

    reset({
      collegeId: filterDefaults?.collegeId ?? undefined,
      academicYearId: filterDefaults?.academicYearId ?? undefined,
      courseId: filterDefaults?.courseId ?? undefined,
      courseGroupId: filterDefaults?.courseGroupId ?? undefined,
      courseYearId: filterDefaults?.courseYearId ?? undefined,
      groupSectionName: '',
      groupSectionCode: '',
      sortOrder: 0,
      isActive: true,
      reason: '',
    })
  }, [row, open, reset, filterDefaults, filtersData])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    const payload = {
      collegeId: data.collegeId,
      academicYearId: data.academicYearId,
      courseId: data.courseId,
      courseGroupId: data.courseGroupId,
      courseYearId: data.courseYearId,
      // Angular/backend uses `section` (single field) for GroupSection create/update
      section: data.groupSectionName,
      groupSectionName: data.groupSectionName,
      groupSectionCode: data.groupSectionCode,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive,
      reason: data.reason,
    }
    try {
      if (isEditing) await updateGroupSection(row!.groupSectionId, payload, row!)
      else await createGroupSection(payload)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save section')
    }
  }

  function resetBelowCollege() {
    setValue('academicYearId', undefined as unknown as number)
    setValue('courseId', undefined as unknown as number)
    setValue('courseGroupId', undefined as unknown as number)
    setValue('courseYearId', undefined as unknown as number)
  }

  function resetBelowAcademicYear() {
    setValue('courseId', undefined as unknown as number)
    setValue('courseGroupId', undefined as unknown as number)
    setValue('courseYearId', undefined as unknown as number)
  }

  function resetBelowCourse() {
    setValue('courseGroupId', undefined as unknown as number)
    setValue('courseYearId', undefined as unknown as number)
  }

  function resetBelowCourseGroup() {
    setValue('courseYearId', undefined as unknown as number)
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Section' : 'Add Section'}
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
                const collegeRow = filtersData.find((r) => num(r.fk_college_id) === Number(v))
                if (collegeRow) setUniversityId(num(collegeRow.fk_university_id))
                resetBelowCollege()
              }}
              options={colleges.map((c) => ({
                value: String(num(c.fk_college_id)),
                label: String(c.college_name ?? c.collegeName ?? c.college_code ?? c.collegeCode ?? ''),
              }))}
              placeholder="Select college"
              searchable
              error={errors.collegeId?.message}
            />
          )} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller name="academicYearId" control={control} render={({ field }) => (
              <Select
                label="Academic Year"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => { field.onChange(v ? Number(v) : undefined); resetBelowAcademicYear() }}
                options={academicYears.map((a) => ({
                  value: String(num(a.fk_academic_year_id)),
                  label: String(a.academic_year ?? ''),
                }))}
                placeholder="Select academic year"
                searchable
                error={errors.academicYearId?.message}
              />
            )} />
            <Controller name="courseId" control={control} render={({ field }) => (
              <Select
                label="Course"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => { field.onChange(v ? Number(v) : undefined); resetBelowCourse() }}
                options={courses.map((c) => ({
                  value: String(num(c.fk_course_id)),
                  label: String(c.course_code ?? ''),
                }))}
                placeholder="Select course"
                searchable
                error={errors.courseId?.message}
              />
            )} />
            <Controller name="courseGroupId" control={control} render={({ field }) => (
              <Select
                label="Course Group"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => { field.onChange(v ? Number(v) : undefined); resetBelowCourseGroup() }}
                options={courseGroups.map((g) => ({
                  value: String(num(g.fk_course_group_id)),
                  label: String(g.group_code ?? g.groupCode ?? ''),
                }))}
                placeholder="Select course group"
                searchable
                error={errors.courseGroupId?.message}
              />
            )} />
            <Controller name="courseYearId" control={control} render={({ field }) => (
              <Select
                label="Course Year"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={courseYears.map((y) => ({
                  value: String(num(y.fk_course_year_id)),
                  label: String(y.course_year_name ?? y.course_year_code ?? ''),
                }))}
                placeholder="Select course year"
                searchable
                error={errors.courseYearId?.message}
              />
            )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="gsn">Section Name *</Label>
              <Input id="gsn" {...register('groupSectionName')} />
              {errors.groupSectionName && <p className="text-xs text-red-500">{errors.groupSectionName.message}</p>}
            </div>
            <div>
              <Label htmlFor="gsc">Section Code *</Label>
              <Input id="gsc" {...register('groupSectionCode')} />
              {errors.groupSectionCode && <p className="text-xs text-red-500">{errors.groupSectionCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input id="sortOrder" type="number" min={0} {...register('sortOrder', { valueAsNumber: true })} />
              {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
