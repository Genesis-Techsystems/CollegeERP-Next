'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { DatePicker } from '@/common/components/date-picker'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { GM_CODES } from '@/config/constants/ui'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  getGeneralDetails,
  listCounselorActivityTypesByCollege,
  type MentorshipRow,
} from '@/services'

const schema = z.object({
  counselorActivityTypeId: z.number().min(1, 'Activity type is required'),
  nextScheduledActivityDate: z.date({ required_error: 'Schedule date is required' }),
  activityStatusId: z.number().min(1, 'Activity status is required'),
})

type FormValues = z.infer<typeof schema>

export type ScheduleMeetingModalProps = {
  open: boolean
  onClose: () => void
  /** null = schedule new; row = edit scheduled meeting */
  row: MentorshipRow | null
  collegeId: number
  counselorId: number
  studentId: number
  onSaved: (payload: MentorshipRow) => void | Promise<void>
}

function parseDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const d = new Date(String(value ?? ''))
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export function ScheduleMeetingModal({
  open,
  onClose,
  row,
  collegeId,
  counselorId,
  studentId,
  onSaved,
}: Readonly<ScheduleMeetingModalProps>) {
  const isEditing = row != null && Number(row.counselorActivityId ?? 0) > 0
  const [activityTypes, setActivityTypes] = useState<MentorshipRow[]>([])
  const [statuses, setStatuses] = useState<MentorshipRow[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      counselorActivityTypeId: undefined,
      nextScheduledActivityDate: new Date(),
      activityStatusId: undefined,
    },
  })

  useEffect(() => {
    if (!open || !collegeId) return
    setLoadingOptions(true)
    void (async () => {
      try {
        const [types, statusRows] = await Promise.all([
          listCounselorActivityTypesByCollege(collegeId),
          getGeneralDetails(GM_CODES.COUNSELING_STATUS),
        ])
        setActivityTypes(types)
        setStatuses(statusRows as MentorshipRow[])
      } catch (e) {
        toastError(getErrorMessage(e))
        setActivityTypes([])
        setStatuses([])
      } finally {
        setLoadingOptions(false)
      }
    })()
  }, [open, collegeId])

  useEffect(() => {
    if (!open) return
    reset(
      isEditing && row
        ? {
            counselorActivityTypeId: Number(row.counselorActivityTypeId ?? 0) || undefined,
            nextScheduledActivityDate: parseDate(row.nextScheduledActivityDate),
            activityStatusId: Number(row.activityStatusId ?? 0) || undefined,
          }
        : {
            counselorActivityTypeId: undefined,
            nextScheduledActivityDate: new Date(),
            activityStatusId: undefined,
          },
    )
  }, [open, isEditing, row, reset])

  const activityTypeOptions = useMemo(
    () =>
      activityTypes.map((t) => ({
        value: String(t.counselorActivityTypeId),
        label: String(t.activityTypeCode ?? t.activityTypeName ?? t.counselorActivityTypeId),
        // Angular disables STDABSCALL
        disabled: String(t.activityTypeCode ?? '') === 'STDABSCALL',
      })),
    [activityTypes],
  )

  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        value: String(s.generalDetailId),
        label: String(s.generalDetailDisplayName ?? s.generalDetailCode ?? s.generalDetailId),
        // Angular disables COMPLETED when scheduling
        disabled: String(s.generalDetailCode ?? '') === 'COMPLETED',
      })),
    [statuses],
  )

  async function onSubmit(values: FormValues) {
    const payload: MentorshipRow = {
      counselorActivityTypeId: values.counselorActivityTypeId,
      nextScheduledActivityDate: format(values.nextScheduledActivityDate, 'yyyy-MM-dd'),
      activityStatusId: values.activityStatusId,
      isActive: true,
      collegeId,
      counselorId,
      studentId,
    }
    if (isEditing && row) {
      payload.counselorActivityId = row.counselorActivityId
    }
    try {
      await onSaved(payload)
      onClose()
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Scheduled Meeting' : 'Schedule Meeting'}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      isSubmitting={isSubmitting || loadingOptions}
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          name="nextScheduledActivityDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Schedule Date *"
              value={field.value}
              onChange={(d) => field.onChange(d ?? new Date())}
              clearable={false}
              error={errors.nextScheduledActivityDate?.message}
            />
          )}
        />
        <Controller
          name="counselorActivityTypeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Counselor Activity Type *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={activityTypeOptions}
              searchable
              isLoading={loadingOptions}
              error={errors.counselorActivityTypeId?.message}
            />
          )}
        />
        <Controller
          name="activityStatusId"
          control={control}
          render={({ field }) => (
            <Select
              label="Activity Status *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={statusOptions}
              searchable
              isLoading={loadingOptions}
              error={errors.activityStatusId?.message}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
