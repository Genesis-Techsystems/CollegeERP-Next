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
import { createCourse, listActiveCourseTypesByUniversity, listActiveUniversities, updateCourse } from '@/services'
import type { Course } from '@/types/course'
import type { CourseType } from '@/types/course-type'
import type { University } from '@/types/university'

const schema = z.object({
  universityId: z.number().min(1),
  courseTypeId: z.number().min(1),
  courseName: z.string().min(1),
  courseCode: z.string().min(1),
  courseShortName: z.string().optional(),
  duration: z.number().optional(),
  inTake: z.number().optional(),
  prefix: z.string().optional(),
  startingNo: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CourseModal({ open, onClose, row, onSaved }: Readonly<{ open: boolean; onClose: () => void; row: Course | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [universities, setUniversities] = useState<University[]>([])
  const [types, setTypes] = useState<CourseType[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { universityId: undefined, courseTypeId: undefined, courseName: '', courseCode: '', courseShortName: '', duration: undefined, inTake: undefined, prefix: '', startingNo: undefined, isActive: true, reason: '' },
  })
  const selectedUniversityId = watch('universityId')
  useEffect(() => { if (open) listActiveUniversities().then(setUniversities).catch(console.error) }, [open])
  useEffect(() => { if (selectedUniversityId) listActiveCourseTypesByUniversity(selectedUniversityId).then(setTypes).catch(console.error); else setTypes([]) }, [selectedUniversityId])
  useEffect(() => {
    if (row) reset({ universityId: row.universityId, courseTypeId: row.courseTypeId, courseName: row.courseName, courseCode: row.courseCode, courseShortName: row.courseShortName ?? '', duration: row.duration, inTake: row.inTake, prefix: row.prefix ?? '', startingNo: row.startingNo, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])
  async function onSubmit(v: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateCourse(row!.courseId, v)
      else await createCourse(v)
      onSaved(); onClose()
    } catch (e: unknown) { setSubmitError(e instanceof Error ? e.message : 'Failed to save course') }
  }
  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Subject' : 'Add Subject'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Controller name="universityId" control={control} render={({ field }) => <Select className="[&>label]:text-xs" label="University" required value={field.value ? String(field.value) : null} onChange={(v) => { field.onChange(v ? Number(v) : undefined); setValue('courseTypeId', undefined as unknown as number) }} options={universities.map((u) => ({ value: String(u.universityId), label: u.universityCode ?? u.universityName }))} placeholder="Select university" searchable />} />
            <Controller name="courseTypeId" control={control} render={({ field }) => <Select className="[&>label]:text-xs" label="Subject Type" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={types.map((t) => ({ value: String(t.courseTypeId), label: `${t.courseTypeCode} - ${t.courseTypeName}` }))} placeholder="Select subject type" searchable />} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><Label htmlFor="cn">Subject Name *</Label><Input id="cn" {...register('courseName')} /></div>
            <div><Label htmlFor="cc">Subject Code *</Label><Input id="cc" {...register('courseCode')} /></div>
            <div><Label htmlFor="csn">Short Name</Label><Input id="csn" {...register('courseShortName')} /></div>
            <div><Label htmlFor="dur">Duration</Label><Input id="dur" type="number" {...register('duration', { valueAsNumber: true })} /></div>
            <div><Label htmlFor="it">Intake</Label><Input id="it" type="number" {...register('inTake', { valueAsNumber: true })} /></div>
            <div><Label htmlFor="pr">Prefix</Label><Input id="pr" {...register('prefix')} /></div>
          </div>
          {isEditing && (
            <Controller name="isActive" control={control} render={({ field }) => <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(v) => setValue('reason', v)} reasonError={errors.reason?.message} />} />
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
