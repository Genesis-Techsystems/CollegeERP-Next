'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import {
  addCollegeCourseGroupMappings,
  listCollegeWiseCourses,
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
} from '@/services'

type AnyRow = Record<string, unknown>

const schema = z.object({
  univCollegeWiseCourseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
  courseYearId: z.number().min(1, 'Course year is required'),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const COLS: ColDef<AnyRow>[] = [
  { headerName: 'Course Code', field: 'courseCode', minWidth: 130, flex: 1 },
  { headerName: 'Course Group', field: 'courseGroupCode', minWidth: 130, flex: 1 },
  { headerName: 'Course Year', field: 'courseYearCode', minWidth: 130, flex: 1 },
]

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((r) => ({ value: String(getValue(r)), label: getLabel(r) }))
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = row[key]
    const parsed = num(value)
    if (parsed > 0) return parsed
  }
  return 0
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export default function CollegeCourseGroupModal({
  open,
  onClose,
  collegeId,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; collegeId: number; onSaved: () => void }>) {
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [groups, setGroups] = useState<AnyRow[]>([])
  const [years, setYears] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { univCollegeWiseCourseId: undefined, courseGroupId: undefined, courseYearId: undefined, isActive: true },
  })
  const selectedCourseRef = watch('univCollegeWiseCourseId')

  useEffect(() => {
    if (!open || !collegeId) return
    listCollegeWiseCourses(collegeId).then(setCourses).catch(console.error)
    setRows([])
    setSubmitError(null)
    reset()
  }, [open, collegeId, reset])

  useEffect(() => {
    const selected = courses.find((c) =>
      pickNum(c, ['univCollegeWiseCourseId', 'univCollegeWiseCoursesId']) === num(selectedCourseRef),
    )
    const courseId = selected ? pickNum(selected, ['courseId', 'fk_course_id']) : 0
    if (!courseId) {
      setGroups([])
      setYears([])
      return
    }
    Promise.all([listCourseGroupsByCourse(courseId), listCourseYearsByCourse(courseId)])
      .then(([g, y]) => {
        setGroups(g)
        setYears(y)
      })
      .catch(console.error)
  }, [selectedCourseRef, courses])

  const courseOptions = useMemo(
    () =>
      asOptions(
        courses,
        (r) => pickNum(r, ['univCollegeWiseCourseId', 'univCollegeWiseCoursesId']),
        (r) =>
          pickText(r, ['courseCode', 'course_code'])
          || pickText((r.course ?? {}) as AnyRow, ['courseCode', 'course_code', 'courseName', 'course_name']),
      ),
    [courses],
  )
  const groupOptions = useMemo(
    () =>
      asOptions(
        groups,
        (r) => pickNum(r, ['courseGroupId', 'coursegroupId', 'fk_course_group_id']),
        (r) =>
          pickText(r, ['groupCode', 'courseGroupCode', 'group_code', 'course_group_code'])
          || pickText((r.courseGroup ?? {}) as AnyRow, ['groupCode', 'courseGroupCode']),
      ),
    [groups],
  )
  const yearOptions = useMemo(
    () =>
      asOptions(
        years,
        (r) => pickNum(r, ['courseYearId', 'courseyearId', 'fk_course_year_id']),
        (r) =>
          pickText(r, ['courseYearCode', 'course_year_code', 'yearCode'])
          || pickText((r.courseYear ?? {}) as AnyRow, ['courseYearCode', 'course_year_code', 'yearCode']),
      ),
    [years],
  )

  function addRow(values: FormValues) {
    const selectedCourse = courses.find(
      (c) => pickNum(c, ['univCollegeWiseCourseId', 'univCollegeWiseCoursesId']) === values.univCollegeWiseCourseId,
    )
    const selectedGroup = groups.find(
      (g) => pickNum(g, ['courseGroupId', 'coursegroupId', 'fk_course_group_id']) === values.courseGroupId,
    )
    const selectedYear = years.find(
      (y) => pickNum(y, ['courseYearId', 'courseyearId', 'fk_course_year_id']) === values.courseYearId,
    )
    const exists = rows.some((r) => num(r.courseYearId) === values.courseYearId && num(r.univCollegeWiseCoursesId) === values.univCollegeWiseCourseId)
    if (exists) {
      setSubmitError('Already exists for selected course year')
      return
    }
    setRows((prev) => [
      ...prev,
      {
        univCollegeWiseCourseId: values.univCollegeWiseCourseId,
        univCollegeWiseCoursesId: values.univCollegeWiseCourseId,
        courseGroupId: values.courseGroupId,
        courseYearId: values.courseYearId,
        isActive: values.isActive,
        courseCode:
          (selectedCourse && (pickText(selectedCourse, ['courseCode', 'course_code'])
            || pickText((selectedCourse.course ?? {}) as AnyRow, ['courseCode', 'course_code'])))
          ?? '',
        courseGroupCode:
          (selectedGroup && (pickText(selectedGroup, ['groupCode', 'courseGroupCode', 'group_code', 'course_group_code'])
            || pickText((selectedGroup.courseGroup ?? {}) as AnyRow, ['groupCode', 'courseGroupCode'])))
          ?? '',
        courseYearCode:
          (selectedYear && (pickText(selectedYear, ['courseYearCode', 'course_year_code', 'yearCode'])
            || pickText((selectedYear.courseYear ?? {}) as AnyRow, ['courseYearCode', 'course_year_code', 'yearCode'])))
          ?? '',
      },
    ])
    setSubmitError(null)
  }

  async function saveRows() {
    if (!rows.length) return
    try {
      const payload = rows.map((row) => {
        const univCollegeWiseCourseId = num(row.univCollegeWiseCourseId ?? row.univCollegeWiseCoursesId)
        const courseGroupId = num(row.courseGroupId)
        const courseYearId = num(row.courseYearId)
        const isActive = Boolean(row.isActive ?? true)
        return {
          // Keep flat fields for endpoints that bind primitive IDs directly.
          univCollegeWiseCourseId,
          univCollegeWiseCoursesId: univCollegeWiseCourseId,
          courseGroupId,
          courseYearId,
          isActive,
          // Add relation objects for Spring entity binders that expect nested references.
          univCollegeWiseCourses: { univCollegeWiseCourseId },
          courseGroup: { courseGroupId },
          courseYear: { courseYearId },
        }
      })
      await addCollegeCourseGroupMappings(payload)
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save mappings')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>Add Course Group Detail</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(addRow)} className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Controller name="univCollegeWiseCourseId" control={control} render={({ field }) => (
              <Select label="Course" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={courseOptions} placeholder="Select course" searchable />
            )} />
            <Controller name="courseGroupId" control={control} render={({ field }) => (
              <Select label="Course Group" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={groupOptions} placeholder="Select group" searchable />
            )} />
            <Controller name="courseYearId" control={control} render={({ field }) => (
              <Select label="Course Year" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={yearOptions} placeholder="Select year" searchable />
            )} />
            <div className="flex items-end">
              <Button type="submit" size="sm">Add</Button>
            </div>
          </div>
        </form>
        <DataTable rowData={rows} columnDefs={COLS} loading={false} pagination={false} />
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={saveRows} disabled={!rows.length}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
