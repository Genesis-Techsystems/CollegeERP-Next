'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { resolveOrganizationId } from '@/lib/user-context'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getAdmissionUnivFilters,
  updateUnivStdApplication,
} from '@/services'
import type { UnivStdApplicationRow } from '@/types/admission'
import { UNIV_APP_STATUS } from '@/types/admission'
import {
  collegeOption,
  courseGroupOption,
  courseOption,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  universityOption,
  filterUniversities,
} from '../../_lib/admission-filters'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  courseId: z.number().min(1, 'Course is required'),
  courseGroupId: z.number().min(1, 'Course group is required'),
})

type FormValues = z.infer<typeof schema>

interface ApproveApplicationModalProps {
  open: boolean
  onClose: () => void
  row: UnivStdApplicationRow | null
  onSaved: () => void
}

export function ApproveApplicationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<ApproveApplicationModalProps>) {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || 1
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const { data: filterBundle } = useQuery({
    queryKey: QK.admission.univFilters(orgId, empId),
    queryFn: () => getAdmissionUnivFilters(orgId, empId),
    enabled: open && !sessionLoading && !empResolving && empId > 0,
  })

  const filtersData = filterBundle?.filtersData ?? []

  const {
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { collegeId: 0, courseId: 0, courseGroupId: 0 },
  })

  const collegeId = watch('collegeId')
  const courseId = watch('courseId')

  const universityOptions = useMemo(
    () => filterUniversities(filtersData).map(universityOption),
    [filtersData],
  )
  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  )
  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId || null).map(courseOption),
    [filtersData, collegeId],
  )
  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroups(filtersData, collegeId || null, courseId || null).map(courseGroupOption),
    [filtersData, collegeId, courseId],
  )

  useEffect(() => {
    if (!open) return
    reset({ collegeId: 0, courseId: 0, courseGroupId: 0 })
  }, [open, reset])

  const onSubmit = async (values: FormValues) => {
    if (!row?.univAppId) return
    try {
      const formData = new FormData()
      formData.append(
        'data',
        JSON.stringify({
          univAppId: row.univAppId,
          applicationStatusCatdetId: UNIV_APP_STATUS.APPROVED,
          collegeId: values.collegeId,
          courseId: values.courseId,
          courseGroupId: values.courseGroupId,
          appStatusUpdatedDate: new Date().toISOString(),
        }),
      )
      await updateUnivStdApplication(formData)
      toastSuccess('Application approved')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Approve Application"
      onSubmit={handleSubmit(onSubmit)}
      isSubmitting={isSubmitting}
    >
      {row && (
        <p className="mb-4 text-sm text-muted-foreground">
          {row.applicationNo} — {row.firstName}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {universityOptions.length > 0 && (
          <Select
            label="University"
            value={universityOptions[0]?.value ?? null}
            onChange={() => {}}
            options={universityOptions}
            disabled
          />
        )}
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College"
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0)
                setValue('courseId', 0)
                setValue('courseGroupId', 0)
              }}
              options={collegeOptions}
              searchable
            />
          )}
        />
        <Controller
          name="courseId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course"
              value={field.value ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0)
                setValue('courseGroupId', 0)
              }}
              options={courseOptions}
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
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={courseGroupOptions}
              searchable
            />
          )}
        />
      </div>
      {(errors.collegeId || errors.courseId || errors.courseGroupId) && (
        <p className="mt-2 text-xs text-destructive">Please select college, course, and group.</p>
      )}
    </FormModal>
  )
}
