'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createConfigAutoNumber,
  listActiveCollegesByOrganizationForConfigAutoNumber,
  listActiveCoursesByUniversityForConfigAutoNumber,
  listActiveOrganizationsForConfigAutoNumber,
} from '@/services'
import type { College } from '@/types/college'
import type { ConfigAutoNumber } from '@/types/config-auto-number'
import type { Course } from '@/types/course'
import type { Organization } from '@/types/organization'

const optionalNumber = z.preprocess((v) => {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}, z.number().optional())

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  collegeId: z.number().min(1, 'College is required'),
  courseId: optionalNumber,
  configAttributeName: z.string().min(1, 'Attribute name is required'),
  configAtttributeCode: z.string().min(1, 'Attribute code is required'),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  currentNumber: optionalNumber,
  formula: z.string().optional(),
  isAutoIncRequired: z.boolean().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function NewAttributeModal({ open, onClose, onSaved }: Readonly<Props>) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [colleges, setColleges] = useState<College[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const { register, control, watch, setValue, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { isAutoIncRequired: false, isActive: true, reason: '' },
  })

  const organizationId = watch('organizationId')

  useEffect(() => {
    if (!open) return
    listActiveOrganizationsForConfigAutoNumber().then(setOrganizations).catch(console.error)
    reset({ isAutoIncRequired: false, isActive: true, reason: '' })
  }, [open, reset])

  useEffect(() => {
    if (!organizationId) {
      setColleges([])
      return
    }
    setValue('collegeId', undefined as unknown as number)
    setValue('courseId', undefined)
    listActiveCollegesByOrganizationForConfigAutoNumber(organizationId).then(setColleges).catch(console.error)
  }, [organizationId, setValue])

  useEffect(() => {
    const collegeId = watch('collegeId')
    if (!collegeId) {
      setCourses([])
      return
    }
    const selectedCollege = colleges.find((item) => item.collegeId === collegeId)
    if (!selectedCollege?.universityId) {
      setCourses([])
      return
    }
    listActiveCoursesByUniversityForConfigAutoNumber(selectedCollege.universityId).then(setCourses).catch(console.error)
  }, [watch, colleges])

  const orgOptions = useMemo(
    () => organizations.map((item) => ({ value: String(item.organizationId), label: item.orgCode ?? item.orgName })),
    [organizations],
  )
  const collegeOptions = useMemo(
    () => colleges.map((item) => ({ value: String(item.collegeId), label: item.collegeCode ?? item.collegeName })),
    [colleges],
  )
  const courseOptions = useMemo(
    () => courses.map((item) => ({ value: String(item.courseId), label: item.courseName })),
    [courses],
  )

  async function onSubmit(values: FormValues) {
    await createConfigAutoNumber(values as ConfigAutoNumber)
    onSaved()
    onClose()
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[hsl(var(--primary))]">Add Attribute</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Controller name="organizationId" control={control} render={({ field }) => (
              <Select label="Organization" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={orgOptions} searchable error={errors.organizationId?.message} />
            )} />
            <Controller name="collegeId" control={control} render={({ field }) => (
              <Select label="College" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={collegeOptions} searchable disabled={!organizationId} error={errors.collegeId?.message} />
            )} />
            <Controller name="courseId" control={control} render={({ field }) => (
              <Select label="Course" value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)} options={courseOptions} searchable disabled={!watch('collegeId')} />
            )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-2"><Label htmlFor="configAttributeName">Attribute Name *</Label><Input id="configAttributeName" {...register('configAttributeName')} />{errors.configAttributeName && <p className="text-xs text-red-500">{errors.configAttributeName.message}</p>}</div>
            <div><Label htmlFor="configAtttributeCode">Attribute Code *</Label><Input id="configAtttributeCode" {...register('configAtttributeCode')} />{errors.configAtttributeCode && <p className="text-xs text-red-500">{errors.configAtttributeCode.message}</p>}</div>
            <div><Label htmlFor="prefix">Prefix</Label><Input id="prefix" {...register('prefix')} /></div>
            <div><Label htmlFor="suffix">Suffix</Label><Input id="suffix" {...register('suffix')} /></div>
            <div><Label htmlFor="currentNumber">Current Number</Label><Input id="currentNumber" type="number" {...register('currentNumber')} /></div>
            <div className="md:col-span-2"><Label htmlFor="formula">Formula</Label><Input id="formula" {...register('formula')} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="isAutoIncRequired" checked={watch('isAutoIncRequired') ?? false} onCheckedChange={(checked) => setValue('isAutoIncRequired', Boolean(checked))} />
              <Label htmlFor="isAutoIncRequired">Auto Increment</Label>
            </div>
          </div>
          <Controller name="isActive" control={control} render={({ field }) => (
            <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(value) => setValue('reason', value)} reasonError={errors.reason?.message} />
          )} />
          <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Close</Button><Button type="submit" disabled={isSubmitting}>{submitLabel}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

