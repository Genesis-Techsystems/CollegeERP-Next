'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCourseYear,
  listActiveCoursesByUniversityForYear,
  listActiveUniversities,
  updateCourseYear,
} from '@/services'
import type { Course } from '@/types/course'
import type { CourseYear } from '@/types/course-year'
import type { University } from '@/types/university'

const schema = z.object({
  universityId: z.number().min(1, 'University is required'),
  courseId: z.number().min(1, 'Course is required'),
  yearNo: z.coerce.number().min(1, 'Year no is required'),
  courseYearCode: z.string().min(1, 'Semester code is required'),
  courseYearName: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CourseYearModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: CourseYear | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [universities, setUniversities] = useState<University[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { universityId: undefined, courseId: undefined, yearNo: 1, courseYearCode: '', courseYearName: '', isActive: true, reason: '' },
  })
  const selectedUniversityId = watch('universityId')

  useEffect(() => { if (open) listActiveUniversities().then(setUniversities).catch(console.error) }, [open])
  useEffect(() => { if (selectedUniversityId) listActiveCoursesByUniversityForYear(selectedUniversityId).then(setCourses).catch(console.error) }, [selectedUniversityId])
  useEffect(() => {
    if (row) reset({ universityId: row.universityId, courseId: row.courseId, yearNo: row.yearNo ?? 1, courseYearCode: row.courseYearCode, courseYearName: row.courseYearName ?? '', isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateCourseYear(row!.courseYearId, data)
      else await createCourseYear(data)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save semester')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Semester' : 'Add Semester'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller name="universityId" control={control} render={({ field }) => (
            <Select label="University" required value={field.value ? String(field.value) : null} onChange={(v) => { field.onChange(v ? Number(v) : undefined); setValue('courseId', undefined as unknown as number) }}
              options={universities.map((u) => ({ value: String(u.universityId), label: u.universityCode ?? u.universityName }))} placeholder="Select university" searchable error={errors.universityId?.message} />
          )} />
          <Controller name="courseId" control={control} render={({ field }) => (
            <Select label="Course" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={courses.map((c) => ({ value: String(c.courseId), label: `${c.courseCode} - ${c.courseName}` }))} placeholder="Select course" searchable error={errors.courseId?.message} />
          )} />
          <div className="grid grid-cols-3 gap-2">
            <div><Label htmlFor="yno">Year No *</Label><Input id="yno" type="number" min={1} {...register('yearNo')} />{errors.yearNo && <p className="text-xs text-red-500">{errors.yearNo.message}</p>}</div>
            <div><Label htmlFor="cyc">Semester Code *</Label><Input id="cyc" {...register('courseYearCode')} />{errors.courseYearCode && <p className="text-xs text-red-500">{errors.courseYearCode.message}</p>}</div>
            <div><Label htmlFor="cyn">Semester Name</Label><Input id="cyn" {...register('courseYearName')} /></div>
          </div>
          {isEditing && (
            <Controller name="isActive" control={control} render={({ field }) => (
              <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(v) => setValue('reason', v)} reasonError={errors.reason?.message} />
            )} />
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
