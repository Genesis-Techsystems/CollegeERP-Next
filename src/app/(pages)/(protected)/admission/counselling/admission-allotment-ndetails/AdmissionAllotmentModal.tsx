'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { resolveOrganizationId } from '@/lib/user-context'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createAdmissionAllotment,
  getAdmissionUnivFilters,
  updateAdmissionAllotment,
} from '@/services'
import type { AdmissionAllotmentRow } from '@/types/admission'
import {
  batchOption,
  courseGroupOption,
  courseOption,
  filterBatchesByUniversityAndCourse,
  filterCourseGroupsByUniversity,
  filterCoursesByUniversity,
} from '../../_lib/admission-filters'

const optionalNumber = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isNaN(n) ? undefined : n
  },
  z.number().optional(),
)

const schema = z.object({
  courseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
  batchId: z.number().min(1, 'Batch is required'),
  totalIntake: optionalNumber,
  totalFilled: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export interface AdmissionAllotmentModalContext {
  collegeId: number
  universityId: number
  universityCode?: string
  collegeCode?: string
}

interface AdmissionAllotmentModalProps {
  open: boolean
  onClose: () => void
  row: AdmissionAllotmentRow | null
  context: AdmissionAllotmentModalContext
  onSaved: () => void
}

export function AdmissionAllotmentModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: Readonly<AdmissionAllotmentModalProps>) {
  const isEditing = row != null
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const { data: filterBundle } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: open && !sessionLoading && !empResolving && empId > 0,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const batchesData = filterBundle?.batchesData ?? []
  const universityId = context.universityId

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      courseId: undefined,
      courseGroupId: undefined,
      batchId: undefined,
      totalIntake: undefined,
      totalFilled: undefined,
      isActive: true,
      reason: 'active',
    },
  })

  const courseId = watch('courseId')

  const courseOptions = useMemo(
    () => filterCoursesByUniversity(filtersData, universityId).map(courseOption),
    [filtersData, universityId],
  )
  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroupsByUniversity(filtersData, universityId, courseId || null).map(
        courseGroupOption,
      ),
    [filtersData, universityId, courseId],
  )
  const batchOptions = useMemo(
    () =>
      filterBatchesByUniversityAndCourse(batchesData, universityId, courseId || null).map(
        batchOption,
      ),
    [batchesData, universityId, courseId],
  )

  useEffect(() => {
    if (!open) return
    reset(
      row
        ? {
            courseId: row.courseId,
            courseGroupId: row.courseGroupId,
            batchId: row.batchId,
            totalIntake: row.totalIntake,
            totalFilled: row.totalFilled,
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            courseId: undefined,
            courseGroupId: undefined,
            batchId: undefined,
            totalIntake: undefined,
            totalFilled: undefined,
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  const titleSuffix =
    context.universityCode && context.collegeCode
      ? ` - ${context.universityCode} / ${context.collegeCode}`
      : ''

  async function onSubmit(data: FormValues) {
    const payload = {
      collegeId: context.collegeId,
      courseId: data.courseId,
      courseGroupId: data.courseGroupId,
      batchId: data.batchId,
      totalIntake: data.totalIntake,
      totalFilled: data.totalFilled,
      isActive: data.isActive,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
      univAdmissionAllotmentId: row?.univAdmissionAllotmentId,
    }
    try {
      if (isEditing && row?.univAdmissionAllotmentId) {
        await updateAdmissionAllotment(row.univAdmissionAllotmentId, payload)
        toastSuccess('Admission allotment updated')
      } else {
        await createAdmissionAllotment(payload)
        toastSuccess('Admission allotment created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} admission allotment`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`${isEditing ? 'Edit' : 'Add'} Admission Allotment${titleSuffix}`}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit, () => {
          toastError(new Error('Please fill in all required fields'))
        })()
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Update' : 'Save'}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="courseId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : undefined)
                setValue('courseGroupId', undefined as unknown as number)
                setValue('batchId', undefined as unknown as number)
              }}
              options={courseOptions}
              placeholder="Select course"
              searchable
              error={errors.courseId?.message}
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
              options={courseGroupOptions}
              placeholder="Select course group"
              searchable
              error={errors.courseGroupId?.message}
            />
          )}
        />
        <Controller
          name="batchId"
          control={control}
          render={({ field }) => (
            <Select
              label="Batch"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={batchOptions}
              placeholder="Select batch"
              searchable
              error={errors.batchId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label className="text-[12px]">Total Intake</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('totalIntake')} />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px]">Total Filled</Label>
          <Input type="number" className="h-9 text-[12px]" {...register('totalFilled')} />
        </div>
        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', String(v))}
                reasonError={errors.reason?.message}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  )
}
