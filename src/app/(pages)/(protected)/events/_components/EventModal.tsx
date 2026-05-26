'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  EVENTS_FIELD_LABEL_CLASS,
  EVENTS_INPUT_CLASS,
  EVENTS_MODAL_TITLE_CLASS,
  EVENTS_TEXTAREA_CLASS,
} from '../_lib/modal-styles'
import { GM_CODES } from '@/config/constants/ui'
import { listEventTypesByCollege, listGeneralDetailsByMaster, type CollegeEventRow } from '@/services'
import { toastError } from '@/lib/toast'

const schema = z.object({
  eventTypeId: z.number().min(1, 'Event type is required'),
  eventStatusId: z.number().min(1, 'Event status is required'),
  audienceTypeId: z.number().min(1, 'Audience is required'),
  eventName: z.string().min(1, 'Event name is required'),
  startDate: z.date(),
  endDate: z.date(),
  publishDate: z.date(),
  isPublished: z.boolean(),
  organizerDetails: z.string().optional(),
  description: z.string().optional(),
  isHoliday: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type EventModalProps = {
  open: boolean
  onClose: () => void
  row: CollegeEventRow | null
  collegeId: number
  academicYearId: number
  universityId?: number
  onSubmit: (payload: CollegeEventRow) => Promise<void>
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function EventModal({
  open,
  onClose,
  row,
  collegeId,
  academicYearId,
  universityId,
  onSubmit,
}: Readonly<EventModalProps>) {
  const isEditing = row?.eventId != null
  const [eventTypes, setEventTypes] = useState<SelectOption[]>([])
  const [eventStatuses, setEventStatuses] = useState<SelectOption[]>([])
  const [audienceTypes, setAudienceTypes] = useState<SelectOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventTypeId: undefined,
      eventStatusId: undefined,
      audienceTypeId: undefined,
      eventName: '',
      startDate: new Date(),
      endDate: new Date(),
      publishDate: new Date(),
      isPublished: false,
      organizerDetails: '',
      description: '',
      isHoliday: false,
      isActive: true,
      reason: 'active',
    },
  })

  useEffect(() => {
    if (!open) return
    void Promise.all([
      listEventTypesByCollege(collegeId),
      listGeneralDetailsByMaster(GM_CODES.EVENT_STATUS),
      listGeneralDetailsByMaster(GM_CODES.AUDIENCE),
    ]).then(([types, statuses, audiences]) => {
      setEventTypes(
        types.map((t) => ({
          value: String(t.eventTypeId),
          label: String(t.eventTypeName ?? t.eventTypeId),
        })),
      )
      setEventStatuses(
        statuses.map((s) => ({
          value: String((s as { generalDetailId?: number }).generalDetailId),
          label: String((s as { generalDetailName?: string }).generalDetailName ?? ''),
        })),
      )
      setAudienceTypes(
        audiences.map((a) => ({
          value: String((a as { generalDetailId?: number }).generalDetailId),
          label: String((a as { generalDetailName?: string }).generalDetailName ?? ''),
        })),
      )
    })

    const activeAudience = row?.eventAudiences?.find((a) => a.isActive !== false)
    reset({
      eventTypeId: row?.eventTypeId ? Number(row.eventTypeId) : undefined,
      eventStatusId: row?.eventStatusId ? Number(row.eventStatusId) : undefined,
      audienceTypeId: activeAudience?.audienceTypeId
        ? Number(activeAudience.audienceTypeId)
        : undefined,
      eventName: String(row?.eventName ?? ''),
      startDate: row?.startDate ? new Date(String(row.startDate)) : new Date(),
      endDate: row?.endDate ? new Date(String(row.endDate)) : new Date(),
      publishDate: row?.publishDate ? new Date(String(row.publishDate)) : new Date(),
      isPublished: row?.isPublished === true,
      organizerDetails: String(row?.organizerDetails ?? ''),
      description: String(row?.description ?? ''),
      isHoliday: row?.isHoliday === true,
      isActive: row?.isActive !== false,
      reason: String(row?.reason ?? 'active'),
    })
  }, [open, row, collegeId, reset])

  async function onFormSubmit(values: FormValues) {
    const audiences = row?.eventAudiences?.length
      ? row.eventAudiences.map((a) =>
          a.isActive === false
            ? a
            : { ...a, audienceTypeId: values.audienceTypeId, isActive: true },
        )
      : [{ audienceTypeId: values.audienceTypeId, isActive: true }]

    if (!audiences.some((a) => a.isActive !== false)) {
      toastError('Add at least one event audience.')
      return
    }

    const payload: CollegeEventRow = {
      ...row,
      ...values,
      collegeId,
      academicYearId,
      universityId,
      startDate: toYmd(values.startDate),
      endDate: toYmd(values.endDate),
      publishDate: toYmd(values.publishDate),
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
      eventAudiences: audiences,
    }
    await onSubmit(payload)
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Add Event'}
      titleClassName={EVENTS_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onFormSubmit)()
      }}
      submitLabel={isEditing ? 'Update' : 'Save'}
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="eventTypeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Event Type *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={eventTypes}
              searchable
              error={errors.eventTypeId?.message}
            />
          )}
        />
        <Controller
          name="eventStatusId"
          control={control}
          render={({ field }) => (
            <Select
              label="Event Status *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={eventStatuses}
              searchable
              error={errors.eventStatusId?.message}
            />
          )}
        />
        <Controller
          name="audienceTypeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Audience *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={audienceTypes}
              searchable
              error={errors.audienceTypeId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label htmlFor="eventName" className={EVENTS_FIELD_LABEL_CLASS}>
            Event Name *
          </Label>
          <Input id="eventName" className={EVENTS_INPUT_CLASS} {...register('eventName')} />
          {errors.eventName ? (
            <p className="text-xs text-destructive">{errors.eventName.message}</p>
          ) : null}
        </div>
        <div>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="Start Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="End Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div>
          <Controller
            name="publishDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="Publish Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="isPublished"
            checked={watch('isPublished')}
            onCheckedChange={(v) => setValue('isPublished', v === true)}
          />
          <Label htmlFor="isPublished" className={`${EVENTS_FIELD_LABEL_CLASS} cursor-pointer`}>
            Published
          </Label>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="isHoliday"
            checked={watch('isHoliday')}
            onCheckedChange={(v) => setValue('isHoliday', v === true)}
          />
          <Label htmlFor="isHoliday" className={`${EVENTS_FIELD_LABEL_CLASS} cursor-pointer`}>
            Holiday
          </Label>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="organizerDetails" className={EVENTS_FIELD_LABEL_CLASS}>
            Organizer
          </Label>
          <Input id="organizerDetails" className={EVENTS_INPUT_CLASS} {...register('organizerDetails')} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="description" className={EVENTS_FIELD_LABEL_CLASS}>
            Description
          </Label>
          <textarea
            id="description"
            rows={3}
            className={EVENTS_TEXTAREA_CLASS}
            {...register('description')}
          />
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
