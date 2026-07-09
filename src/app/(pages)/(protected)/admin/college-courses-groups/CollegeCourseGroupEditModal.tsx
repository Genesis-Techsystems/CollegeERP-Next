'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listCollegeWiseCourses, listCourseGroupsByCourse, listCourseYearsByCourse, updateCollegeCourseGroupMappings } from '@/services'
import type { CollegeCourseGroupRow } from '@/services/admin/college-courses-groups'

const schema = z.object({
  univCollegeWiseCourseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
  courseYearId: z.number().min(1, 'Course year is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function CollegeCourseGroupEditModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean
  onClose: () => void
  row: CollegeCourseGroupRow | null
  onSaved: () => void
}>) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Record<string, unknown>[]>([])
  const [groups, setGroups] = useState<Record<string, unknown>[]>([])
  const [years, setYears] = useState<Record<string, unknown>[]>([])
  const { control, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      univCollegeWiseCourseId: undefined,
      courseGroupId: undefined,
      courseYearId: undefined,
      isActive: true,
      reason: '',
    },
  })

  const selectedCourseRef = watch('univCollegeWiseCourseId')

  useEffect(() => {
    if (!open || !row) return
    setSubmitError(null)
    setGroups([])
    setYears([])
    const collegeId = num(row.collegeId)
    const courseId = num(row.courseId)
    const univCourseId = num(row.univCollegeWiseCourseId ?? row.univCollegeWiseCoursesId)
    listCollegeWiseCourses(collegeId).then((loaded) => {
      setCourses(loaded as Record<string, unknown>[])
      // Prefer matching by univCollegeWiseCourseId; fallback to courseId match.
      const match =
        (loaded as Record<string, unknown>[]).find((c) => num((c as any).univCollegeWiseCourseId) === univCourseId)
        ?? (loaded as Record<string, unknown>[]).find((c) => num((c as any).courseId ?? (c as any).fk_course_id) === courseId)
      const pickedUnivCourseId = match ? num((match as any).univCollegeWiseCourseId) : univCourseId
      reset({
        univCollegeWiseCourseId: pickedUnivCourseId || undefined,
        courseGroupId: num(row.courseGroupId) || undefined,
        courseYearId: num(row.courseYearId) || undefined,
        isActive: row.isActive ?? true,
        reason: row.reason ?? '',
      })
    }).catch(() => {
      // Even if courses fail to load, keep status editable.
      reset({
        univCollegeWiseCourseId: univCourseId || undefined,
        courseGroupId: num(row.courseGroupId) || undefined,
        courseYearId: num(row.courseYearId) || undefined,
        isActive: row.isActive ?? true,
        reason: row.reason ?? '',
      })
    })
  }, [open, row, reset])

  useEffect(() => {
    if (!open) return
    const selected = courses.find((c) => num((c as any).univCollegeWiseCourseId) === num(selectedCourseRef))
    const courseId = selected ? num((selected as any).courseId ?? (selected as any).fk_course_id) : 0
    if (!courseId) {
      setGroups([])
      setYears([])
      return
    }
    Promise.all([listCourseGroupsByCourse(courseId), listCourseYearsByCourse(courseId)])
      .then(([g, y]) => {
        setGroups((Array.isArray(g) ? g : []) as Record<string, unknown>[])
        setYears((Array.isArray(y) ? y : []) as Record<string, unknown>[])
      })
      .catch(() => {
        setGroups([])
        setYears([])
      })
  }, [open, courses, selectedCourseRef])

  const courseOptions: SelectOption[] = courses.map((c) => {
    const id = num((c as any).univCollegeWiseCourseId ?? (c as any).univCollegeWiseCoursesId)
    const label = String((c as any).courseCode ?? (c as any).course_code ?? (c as any).courseName ?? (c as any).course_name ?? '')
    return { value: String(id), label: label || String(id) }
  }).filter((o) => Number(o.value) > 0)

  const groupOptions: SelectOption[] = groups.map((g) => {
    const id = num((g as any).courseGroupId ?? (g as any).coursegroupId ?? (g as any).fk_course_group_id)
    const label = String((g as any).groupCode ?? (g as any).group_code ?? (g as any).courseGroupCode ?? '')
    return { value: String(id), label: label || String(id) }
  }).filter((o) => Number(o.value) > 0)

  const yearOptions: SelectOption[] = years.map((y) => {
    const id = num((y as any).courseYearId ?? (y as any).courseyearId ?? (y as any).fk_course_year_id)
    const label = String((y as any).courseYearCode ?? (y as any).course_year_code ?? (y as any).courseYearName ?? (y as any).course_year_name ?? '')
    return { value: String(id), label: label || String(id) }
  }).filter((o) => Number(o.value) > 0)

  async function onSubmit(data: FormValues) {
    if (!row) return
    setSubmitError(null)
    try {
      // Backend expects Angular-shaped wrapper payload:
      // [{ univCollegeWiseCourseId, universitiesId, collegeId, courseId, ...,
      //    univCollegeWiseGroupsDTOList: [{ univCollegeWiseGroupId, univCollegeWiseCoursesId, courseGroupId, courseYearId, isActive }] }]
      const collegeId = num(row.collegeId)
      const selectedCourse = courses.find((c) => num((c as any).univCollegeWiseCourseId) === num(data.univCollegeWiseCourseId))
      const courseId = selectedCourse ? num((selectedCourse as any).courseId ?? (selectedCourse as any).fk_course_id) : num(row.courseId)
      const univCollegeWiseCourseId = num(data.univCollegeWiseCourseId)

      const courseRows = await listCollegeWiseCourses(collegeId)
      const courseRow =
        courseRows.find((c) => num((c as any).univCollegeWiseCourseId) === univCollegeWiseCourseId)
        ?? courseRows.find((c) => num((c as any).courseId ?? (c as any).fk_course_id) === courseId)

      if (!courseRow) {
        throw new Error('Course details not found for update payload')
      }

      const courseStartDate = (courseRow as any)?.courseStartDate ?? (courseRow as any)?.course_start_date
      const courseEndDate = (courseRow as any)?.courseEndDate ?? (courseRow as any)?.course_end_date

      const payload = {
        // Match Angular payload shape closely
        univCollegeWiseCourseId: num((courseRow as any)?.univCollegeWiseCourseId) || univCollegeWiseCourseId,
        universitiesId: num((courseRow as any)?.universitiesId) || num(row.universitiesId),
        collegeId: num((courseRow as any)?.collegeId) || collegeId,
        courseId: num((courseRow as any)?.courseId) || courseId,
        ...(courseStartDate ? { courseStartDate } : {}),
        ...(courseEndDate ? { courseEndDate } : {}),
        isActive: true,
        univCollegeWiseGroupsDTOList: [
          {
            univCollegeWiseGroupId: num(row.univCollegeWiseGroupId),
            univCollegeWiseCoursesId: num(row.univCollegeWiseCoursesId ?? univCollegeWiseCourseId),
            courseGroupId: num(data.courseGroupId),
            courseYearId: num(data.courseYearId),
            isActive: data.isActive,
          },
        ],
      }

      await updateCollegeCourseGroupMappings([payload])
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update mapping')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            Edit Course Group Mapping
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Controller
              name="univCollegeWiseCourseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('courseGroupId', undefined as unknown as number)
                    setValue('courseYearId', undefined as unknown as number)
                  }}
                  options={courseOptions}
                  placeholder="Select course"
                  searchable
                />
              )}
            />
            <Controller
              name="courseGroupId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Group"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={groupOptions}
                  placeholder="Select course group"
                  searchable
                  disabled={!selectedCourseRef}
                />
              )}
            />
            <Controller
              name="courseYearId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Year"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={yearOptions}
                  placeholder="Select course year"
                  searchable
                  disabled={!selectedCourseRef}
                />
              )}
            />
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', v)}
              />
            )}
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
