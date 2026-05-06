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
import { createCourseType, listActiveUniversities, updateCourseType } from '@/services'
import type { CourseType } from '@/types/course-type'
import type { University } from '@/types/university'

const schema = z.object({
  universityId: z.number().min(1, 'University is required'),
  courseTypeName: z.string().min(1, 'Course type name is required'),
  courseTypeCode: z.string().min(1, 'Course type code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CourseTypeModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: CourseType | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [universities, setUniversities] = useState<University[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { universityId: undefined, courseTypeName: '', courseTypeCode: '', isActive: true, reason: '' },
  })

  useEffect(() => { if (open) listActiveUniversities().then(setUniversities).catch(console.error) }, [open])
  useEffect(() => {
    if (row) reset({ universityId: row.universityId, courseTypeName: row.courseTypeName, courseTypeCode: row.courseTypeCode, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateCourseType(row!.courseTypeId, data)
      else await createCourseType(data)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save course type')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Course Type' : 'Add Course Type'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller name="universityId" control={control} render={({ field }) => (
            <Select label="University" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={universities.map((u) => ({ value: String(u.universityId), label: u.universityCode ?? u.universityName }))} placeholder="Select university" searchable error={errors.universityId?.message} />
          )} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="ctn">Course Type Name *</Label><Input id="ctn" {...register('courseTypeName')} />{errors.courseTypeName && <p className="text-xs text-red-500">{errors.courseTypeName.message}</p>}</div>
            <div><Label htmlFor="ctc">Course Type Code *</Label><Input id="ctc" {...register('courseTypeCode')} />{errors.courseTypeCode && <p className="text-xs text-red-500">{errors.courseTypeCode.message}</p>}</div>
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
