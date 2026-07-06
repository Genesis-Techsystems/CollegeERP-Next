'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  addCollegeCourseGroupMappings,
  listCollegeWiseCourses,
  listCourseGroupsByCourse,
  listCourseYearsByCourse,
} from '@/services'
import type { CollegeCourseGroupRow } from '@/services/admin/college-courses-groups'

type AnyRow = Record<string, unknown>

const schema = z.object({
  univCollegeWiseCourseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((r) => ({ value: String(getValue(r)), label: getLabel(r) }))
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
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

function yearLabel(row: AnyRow): string {
  return (
    pickText(row, ['courseYearCode', 'course_year_code', 'yearCode'])
    || pickText((row.courseYear ?? {}) as AnyRow, ['courseYearCode', 'course_year_code', 'yearCode'])
    || pickText(row, ['courseYearName', 'course_year_name', 'yearName'])
  )
}

function yearOrder(row: AnyRow): number {
  return num(row.yearOrder ?? row.year_order ?? row.sortOrder ?? row.sort_order)
}

export default function CollegeCourseGroupModal({
  open,
  onClose,
  collegeId,
  collegeCode,
  universityCode,
  existingRows = [],
  onSaved,
}: Readonly<{
  open: boolean
  onClose: () => void
  collegeId: number
  collegeCode?: string
  universityCode?: string
  existingRows?: CollegeCourseGroupRow[]
  onSaved: () => void
}>) {
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [groups, setGroups] = useState<AnyRow[]>([])
  const [years, setYears] = useState<AnyRow[]>([])
  const [selectedYearIds, setSelectedYearIds] = useState<Set<number>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { univCollegeWiseCourseId: undefined, courseGroupId: undefined, isActive: true },
  })
  const selectedCourseRef = watch('univCollegeWiseCourseId')
  const selectedGroupRef = watch('courseGroupId')
  const isActive = watch('isActive')

  const titleSuffix = [universityCode, collegeCode].filter(Boolean).join(' / ')

  useEffect(() => {
    if (!open || !collegeId) return
    listCollegeWiseCourses(collegeId).then(setCourses).catch(console.error)
    setSelectedYearIds(new Set())
    setSubmitError(null)
    reset({ univCollegeWiseCourseId: undefined, courseGroupId: undefined, isActive: true })
  }, [open, collegeId, reset])

  useEffect(() => {
    const selected = courses.find((c) =>
      pickNum(c, ['univCollegeWiseCourseId', 'univCollegeWiseCoursesId']) === num(selectedCourseRef),
    )
    const courseId = selected ? pickNum(selected, ['courseId', 'fk_course_id']) : 0
    setSelectedYearIds(new Set())
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

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => yearOrder(a) - yearOrder(b) || yearLabel(a).localeCompare(yearLabel(b))),
    [years],
  )

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

  const allYearIds = useMemo(
    () => sortedYears.map((y) => pickNum(y, ['courseYearId', 'courseyearId', 'fk_course_year_id'])).filter(Boolean),
    [sortedYears],
  )
  const allSelected = allYearIds.length > 0 && allYearIds.every((id) => selectedYearIds.has(id))
  const someSelected = allYearIds.some((id) => selectedYearIds.has(id)) && !allSelected

  function toggleYear(yearId: number, checked: boolean) {
    setSelectedYearIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(yearId)
      else next.delete(yearId)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedYearIds(checked ? new Set(allYearIds) : new Set())
  }

  async function onSave(values: FormValues) {
    if (!selectedYearIds.size) {
      setSubmitError('Select at least one course year')
      return
    }

    const selectedCourse = courses.find(
      (c) => pickNum(c, ['univCollegeWiseCourseId', 'univCollegeWiseCoursesId']) === values.univCollegeWiseCourseId,
    )
    const selectedGroup = groups.find(
      (g) => pickNum(g, ['courseGroupId', 'coursegroupId', 'fk_course_group_id']) === values.courseGroupId,
    )

    const payloadRows = sortedYears
      .map((yearRow) => {
        const courseYearId = pickNum(yearRow, ['courseYearId', 'courseyearId', 'fk_course_year_id'])
        if (!selectedYearIds.has(courseYearId)) return null

        const alreadyExists = existingRows.some(
          (r) =>
            num(r.univCollegeWiseCoursesId ?? r.univCollegeWiseCourseId) === values.univCollegeWiseCourseId
            && num(r.courseGroupId) === values.courseGroupId
            && num(r.courseYearId) === courseYearId,
        )
        if (alreadyExists) return null

        const univCollegeWiseCourseId = values.univCollegeWiseCourseId
        const courseGroupId = values.courseGroupId
        return {
          univCollegeWiseCourseId,
          univCollegeWiseCoursesId: univCollegeWiseCourseId,
          courseGroupId,
          courseYearId,
          isActive: values.isActive,
          univCollegeWiseCourses: { univCollegeWiseCourseId },
          courseGroup: { courseGroupId },
          courseYear: { courseYearId },
          courseCode:
            (selectedCourse && (pickText(selectedCourse, ['courseCode', 'course_code'])
              || pickText((selectedCourse.course ?? {}) as AnyRow, ['courseCode', 'course_code'])))
            ?? '',
          courseGroupCode:
            (selectedGroup && (pickText(selectedGroup, ['groupCode', 'courseGroupCode', 'group_code', 'course_group_code'])
              || pickText((selectedGroup.courseGroup ?? {}) as AnyRow, ['groupCode', 'courseGroupCode'])))
            ?? '',
          courseYearCode: yearLabel(yearRow),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (!payloadRows.length) {
      setSubmitError('Selected course year(s) already exist for this course group')
      return
    }

    setSaving(true)
    setSubmitError(null)
    try {
      await addCollegeCourseGroupMappings(payloadRows)
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save mappings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            Add Course Group Detail
            {titleSuffix ? ` - ${titleSuffix}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <Controller
              name="univCollegeWiseCourseId"
              control={control}
              render={({ field }) => (
                <Select
                  className="[&>label]:text-xs"
                  label="Courses"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
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
                  className="[&>label]:text-xs"
                  label="Course Group"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={groupOptions}
                  placeholder="Select group"
                  searchable
                  disabled={!selectedCourseRef}
                />
              )}
            />
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="college-course-group-active"
                checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v === true)}
              />
              <Label htmlFor="college-course-group-active" className="cursor-pointer text-sm">
                Active
              </Label>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-[hsl(var(--primary))] px-3 py-2 w-[100px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={(v) => toggleAll(v === true)}
                          disabled={!sortedYears.length}
                        />
                        All
                      </label>
                    </th>
                    <th className="text-left font-semibold text-[hsl(var(--primary))] px-3 py-2">
                      Course Year
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedYears.map((yearRow) => {
                    const yearId = pickNum(yearRow, ['courseYearId', 'courseyearId', 'fk_course_year_id'])
                    return (
                      <tr key={yearId} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={selectedYearIds.has(yearId)}
                            onCheckedChange={(v) => toggleYear(yearId, v === true)}
                          />
                        </td>
                        <td className="px-3 py-2">{yearLabel(yearRow) || '-'}</td>
                      </tr>
                    )
                  })}
                  {!sortedYears.length && (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                        {selectedCourseRef ? 'No course years found' : 'Select a course to view semesters'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </div>

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleSubmit(onSave)} disabled={saving || !selectedYearIds.size}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
