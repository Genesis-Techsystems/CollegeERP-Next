'use client'

import { useEffect, useState } from 'react'
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
  createCourseGroup,
  listActiveCoursesByUniversity,
  listActiveUniversities,
  updateCourseGroup,
} from '@/services'
import type { Course } from '@/types/course'
import type { CourseGroup } from '@/types/course-group'
import type { University } from '@/types/university'

const schema = z.object({
  universityId: z.number().min(1, 'University is required'),
  courseId: z.number().min(1, 'Course is required'),
  groupName: z.string().min(1, 'Subject group name is required'),
  groupCode: z.string().min(1, 'Subject group code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CourseGroupModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: CourseGroup | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [universities, setUniversities] = useState<University[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { universityId: undefined, courseId: undefined, groupName: '', groupCode: '', isActive: true, reason: '' },
  })
  const selectedUniversityId = watch('universityId')

  useEffect(() => { if (open) listActiveUniversities().then(setUniversities).catch(console.error) }, [open])
  useEffect(() => { if (selectedUniversityId) listActiveCoursesByUniversity(selectedUniversityId).then(setCourses).catch(console.error) }, [selectedUniversityId])
  useEffect(() => {
    if (row) reset({ universityId: row.universityId, courseId: row.courseId, groupName: row.groupName, groupCode: row.groupCode, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateCourseGroup(row!.courseGroupId, data)
      else await createCourseGroup(data)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save subject group')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Subject Group' : 'Add Subject Group'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Controller name="universityId" control={control} render={({ field }) => (
            <Select label="University" required value={field.value ? String(field.value) : null} onChange={(v) => { field.onChange(v ? Number(v) : undefined); setValue('courseId', undefined) }}
              options={universities.map((u) => ({ value: String(u.universityId), label: u.universityCode ?? u.universityName }))} placeholder="Select university" searchable error={errors.universityId?.message} />
          )} />
          <Controller name="courseId" control={control} render={({ field }) => (
            <Select label="Course" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={courses.map((c) => ({ value: String(c.courseId), label: `${c.courseCode} - ${c.courseName}` }))} placeholder="Select course" searchable error={errors.courseId?.message} />
          )} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="cgn">Subject Group Name *</Label><Input id="cgn" {...register('groupName')} />{errors.groupName && <p className="text-xs text-red-500">{errors.groupName.message}</p>}</div>
            <div><Label htmlFor="cgc">Subject Group Code *</Label><Input id="cgc" {...register('groupCode')} />{errors.groupCode && <p className="text-xs text-red-500">{errors.groupCode.message}</p>}</div>
          </div>
          <Controller name="isActive" control={control} render={({ field }) => (
            <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(v) => setValue('reason', v)} reasonError={errors.reason?.message} />
          )} />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
