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
  createGroupSection,
  listActiveCollegesForSections,
  listActiveCourseGroupsByCollege,
  listActiveCourseYearsByCourse,
  updateGroupSection,
} from '@/services'
import type { College } from '@/types/college'
import type { CourseGroup } from '@/types/course-group'
import type { CourseYear } from '@/types/course-year'
import type { GroupSection } from '@/types/group-section'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  courseGroupId: z.number().min(1, 'Subject group is required'),
  courseYearId: z.number().min(1, 'Semester is required'),
  groupSectionName: z.string().min(1, 'Section name is required'),
  groupSectionCode: z.string().min(1, 'Section code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export default function GroupSectionModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: GroupSection | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [groups, setGroups] = useState<CourseGroup[]>([])
  const [years, setYears] = useState<CourseYear[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { collegeId: undefined, courseGroupId: undefined, courseYearId: undefined, groupSectionName: '', groupSectionCode: '', isActive: true, reason: '' },
  })
  const selectedCollegeId = watch('collegeId')
  const selectedGroupId = watch('courseGroupId')

  useEffect(() => { if (open) listActiveCollegesForSections().then(setColleges).catch(console.error) }, [open])
  useEffect(() => { if (selectedCollegeId) listActiveCourseGroupsByCollege(selectedCollegeId).then(setGroups).catch(console.error) }, [selectedCollegeId])
  useEffect(() => {
    const selected = groups.find((g) => g.courseGroupId === selectedGroupId)
    const courseId = num((selected as unknown as Record<string, unknown>)?.courseId)
    if (courseId) listActiveCourseYearsByCourse(courseId).then(setYears).catch(console.error)
    else setYears([])
  }, [selectedGroupId, groups])
  useEffect(() => {
    if (row) reset({ collegeId: row.collegeId, courseGroupId: row.courseGroupId, courseYearId: row.courseYearId, groupSectionName: row.groupSectionName, groupSectionCode: row.groupSectionCode, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  const groupOptions = useMemo(() => groups.map((g) => ({ value: String(g.courseGroupId), label: `${g.groupCode} - ${g.groupName}` })), [groups])
  const yearOptions = useMemo(() => years.map((y) => ({ value: String(y.courseYearId), label: y.courseYearCode })), [years])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateGroupSection(row!.groupSectionId, data)
      else await createGroupSection(data)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save section')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Section' : 'Add Section'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller name="collegeId" control={control} render={({ field }) => (
            <Select label="College" required value={field.value ? String(field.value) : null} onChange={(v) => { field.onChange(v ? Number(v) : undefined); setValue('courseGroupId', undefined); setValue('courseYearId', undefined) }}
              options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName }))} placeholder="Select college" searchable error={errors.collegeId?.message} />
          )} />
          <div className="grid grid-cols-2 gap-2">
            <Controller name="courseGroupId" control={control} render={({ field }) => (
              <Select label="Subject Group" required value={field.value ? String(field.value) : null} onChange={(v) => { field.onChange(v ? Number(v) : undefined); setValue('courseYearId', undefined) }}
                options={groupOptions} placeholder="Select group" searchable error={errors.courseGroupId?.message} />
            )} />
            <Controller name="courseYearId" control={control} render={({ field }) => (
              <Select label="Semester" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={yearOptions} placeholder="Select semester" searchable error={errors.courseYearId?.message} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="gsn">Section Name *</Label><Input id="gsn" {...register('groupSectionName')} />{errors.groupSectionName && <p className="text-xs text-red-500">{errors.groupSectionName.message}</p>}</div>
            <div><Label htmlFor="gsc">Section Code *</Label><Input id="gsc" {...register('groupSectionCode')} />{errors.groupSectionCode && <p className="text-xs text-red-500">{errors.groupSectionCode.message}</p>}</div>
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
