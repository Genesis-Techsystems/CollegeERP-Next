'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCommitteeMeeting } from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required'),
  meetingDate: z.date(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  zoomLink: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export type MeetingFilterContext = {
  univCommitteeId: number
  universityExamId: number
  academicYear: string
  subjectCode: string
}

type AddMeetingModalProps = {
  open: boolean
  onClose: () => void
  filterContext: MeetingFilterContext | null
  onSaved: () => void
}

function formatDatePayload(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function AddMeetingModal({
  open,
  onClose,
  filterContext,
  onSaved,
}: AddMeetingModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      meetingTitle: '',
      meetingDate: new Date(),
      startTime: '09:00',
      endTime: '12:00',
      zoomLink: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      meetingTitle: '',
      meetingDate: new Date(),
      startTime: '09:00',
      endTime: '12:00',
      zoomLink: '',
    })
    setSubmitError(null)
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    if (!filterContext) {
      setSubmitError('Select committee, exam, and subject before adding a meeting.')
      return
    }

    setSubmitError(null)
    try {
      const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
      const collegeId = Number(globalThis?.localStorage?.getItem('collegeId') ?? 0)

      await createCommitteeMeeting({
        univCommitteesId: filterContext.univCommitteeId,
        academicYear: filterContext.academicYear,
        universityExamId: filterContext.universityExamId,
        subjectCode: filterContext.subjectCode,
        meetingTitle: values.meetingTitle.trim(),
        scheduledDate: formatDatePayload(values.meetingDate),
        meetingFromTime: values.startTime,
        meetingToTime: values.endTime,
        zoomLink: values.zoomLink?.trim() || undefined,
        meetingDescription: '',
        meetingtypeCatdetId: 3,
        isActive: true,
        orgId: orgId || undefined,
        collegeId: collegeId || undefined,
        univCommitteeMeetingMembersDTOList: [],
      })
      toastSuccess('Meeting scheduled successfully.')
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to schedule meeting.'
      setSubmitError(msg)
      toastError(e, 'Failed to schedule meeting')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add Committee Meeting"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Meeting Title *</Label>
          <Input className="h-8 text-xs" {...register('meetingTitle')} />
          {errors.meetingTitle && (
            <p className="text-xs text-destructive">{errors.meetingTitle.message}</p>
          )}
        </div>

        <Controller
          name="meetingDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Meeting Date *"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? new Date())}
            />
          )}
        />

        <div className="space-y-0.5">
          <Label className="text-xs">Start Time *</Label>
          <Input className="h-8 text-xs" type="time" {...register('startTime')} />
          {errors.startTime && (
            <p className="text-xs text-destructive">{errors.startTime.message}</p>
          )}
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">End Time *</Label>
          <Input className="h-8 text-xs" type="time" {...register('endTime')} />
          {errors.endTime && (
            <p className="text-xs text-destructive">{errors.endTime.message}</p>
          )}
        </div>

        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Zoom Link</Label>
          <Input className="h-8 text-xs" placeholder="https://…" {...register('zoomLink')} />
        </div>
      </div>

      {submitError && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
      )}
    </FormModal>
  )
}
