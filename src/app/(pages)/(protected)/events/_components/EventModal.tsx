'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, PlusIcon, Trash2Icon } from 'lucide-react'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { MultiSelect, Select, type SelectOption } from '@/common/components/select'
import { Table } from '@/common/components/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  EVENTS_FIELD_LABEL_CLASS,
  EVENTS_INPUT_CLASS,
  EVENTS_MODAL_TITLE_CLASS,
  EVENTS_TEXTAREA_CLASS,
} from '../_lib/modal-styles'
import { GM_CODES } from '@/config/constants/ui'
import {
  listCourseGroups,
  listCourseYears,
  listCoursesByUniversity,
  listDepartmentsByCollege,
  listEventTypesByCollege,
  listGeneralDetailsByMaster,
  listGroupSectionsByFilters,
  type CollegeEventRow,
} from '@/services'
import type { EventAudienceRow } from '@/types/events'
import type { GeneralDetail } from '@/types/exam-master'
import { toastError, toastInfo } from '@/lib/toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  eventTypeId: z.number().min(1, 'Event type is required'),
  eventStatusId: z.number().min(1, 'Event status is required'),
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

type AudienceTableRow = EventAudienceRow & {
  audienceTypeCode?: string
  categoryValue?: string | number
  courseName?: string
  collegeId?: number
}

type EventModalProps = {
  open: boolean
  onClose: () => void
  row: CollegeEventRow | null
  collegeId: number
  academicYearId: number
  universityId?: number
  /** Prefill start/end/publish dates when creating from a calendar day. */
  defaultStartDate?: Date
  onSubmit: (payload: CollegeEventRow) => Promise<void>
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function generalDetailLabel(row: GeneralDetail): string {
  const ext = row as GeneralDetail & { generalDetailDisplayName?: string }
  return String(
    ext.generalDetailDisplayName ?? row.generalDetailName ?? row.generalDetailCode ?? row.generalDetailId ?? '',
  )
}

function generalDetailOptions(rows: GeneralDetail[]): SelectOption[] {
  return rows
    .filter((r) => r.generalDetailId)
    .map((r) => ({
      value: String(r.generalDetailId),
      label: generalDetailLabel(r),
    }))
    .filter((o) => o.label.trim().length > 0)
}

export function EventModal({
  open,
  onClose,
  row,
  collegeId,
  academicYearId,
  universityId,
  defaultStartDate,
  onSubmit,
}: Readonly<EventModalProps>) {
  const isEditing = row?.eventId != null
  const [eventTypes, setEventTypes] = useState<SelectOption[]>([])
  const [eventStatuses, setEventStatuses] = useState<SelectOption[]>([])
  const [audienceTypes, setAudienceTypes] = useState<GeneralDetail[]>([])
  const [audienceTypeOptions, setAudienceTypeOptions] = useState<SelectOption[]>([])
  const [courses, setCourses] = useState<SelectOption[]>([])
  const [courseGroups, setCourseGroups] = useState<SelectOption[]>([])
  const [courseYears, setCourseYears] = useState<SelectOption[]>([])
  const [sections, setSections] = useState<SelectOption[]>([])
  const [departments, setDepartments] = useState<SelectOption[]>([])
  const [eventAudiences, setEventAudiences] = useState<AudienceTableRow[]>([])
  const [deletedAudiences, setDeletedAudiences] = useState<AudienceTableRow[]>([])
  const [audienceOpen, setAudienceOpen] = useState(true)

  const [audienceTypeId, setAudienceTypeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [sectionIds, setSectionIds] = useState<string[]>([])
  const [departmentId, setDepartmentId] = useState<number | null>(null)

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
      eventName: '',
      startDate: new Date(),
      endDate: new Date(),
      publishDate: new Date(),
      isPublished: false,
      organizerDetails: '',
      description: '',
      isHoliday: true,
      isActive: true,
      reason: 'active',
    },
  })

  const startDate = watch('startDate')
  const isActive = watch('isActive')

  const selectedAudienceCode = useMemo(() => {
    if (!audienceTypeId) return ''
    return audienceTypes.find((a) => Number(a.generalDetailId) === audienceTypeId)?.generalDetailCode ?? ''
  }, [audienceTypeId, audienceTypes])

  const showStudentFields = selectedAudienceCode === 'STD' || selectedAudienceCode === 'Parents'
  const showDepartmentField = selectedAudienceCode === 'TCHNGSTF'

  const clearAudienceForm = useCallback(() => {
    setAudienceTypeId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setSectionIds([])
    setDepartmentId(null)
    setCourseGroups([])
    setCourseYears([])
    setSections([])
  }, [])

  useEffect(() => {
    if (!open) return

    void Promise.all([
      listEventTypesByCollege(collegeId).catch(() => []),
      listGeneralDetailsByMaster(GM_CODES.EVENT_STATUS).catch(() => []),
      listGeneralDetailsByMaster(GM_CODES.AUDIENCE).catch(() => []),
      universityId ? listCoursesByUniversity(universityId).catch(() => []) : Promise.resolve([]),
      listDepartmentsByCollege(collegeId).catch(() => []),
    ]).then(([types, statuses, audiences, courseRows, deptRows]) => {
      setEventTypes(
        types
          .filter((t) => t.eventTypeId)
          .map((t) => ({
            value: String(t.eventTypeId),
            label: String(t.eventTypeName ?? t.eventTypeId),
          })),
      )
      setEventStatuses(generalDetailOptions(statuses))
      setAudienceTypes(audiences)
      setAudienceTypeOptions(generalDetailOptions(audiences))
      setCourses(
        courseRows.map((c) => ({
          value: String((c as { courseId?: number }).courseId),
          label: String((c as { courseCode?: string }).courseCode ?? (c as { courseName?: string }).courseName ?? ''),
        })).filter((o) => o.value && o.value !== 'undefined'),
      )
      setDepartments(
        deptRows.map((d) => ({
          value: String(d.departmentId),
          label: String(d.deptName ?? d.departmentId),
        })),
      )
    })

    const activeAudiences = (row?.eventAudiences ?? []).filter((a) => a.isActive !== false) as AudienceTableRow[]
    setEventAudiences(activeAudiences)
    setDeletedAudiences([])
    clearAudienceForm()

    const seedDate = defaultStartDate ?? new Date()
    reset({
      eventTypeId: row?.eventTypeId ? Number(row.eventTypeId) : undefined,
      eventStatusId: row?.eventStatusId ? Number(row.eventStatusId) : undefined,
      eventName: String(row?.eventName ?? ''),
      startDate: row?.startDate ? new Date(String(row.startDate)) : seedDate,
      endDate: row?.endDate ? new Date(String(row.endDate)) : seedDate,
      publishDate: row?.publishDate ? new Date(String(row.publishDate)) : seedDate,
      isPublished: row?.isPublished === true,
      organizerDetails: String(row?.organizerDetails ?? ''),
      description: String(row?.description ?? ''),
      isHoliday: row?.isHoliday ?? true,
      isActive: row?.isActive !== false,
      reason: String(row?.reason ?? 'active'),
    })
  }, [open, row, collegeId, universityId, defaultStartDate, reset, clearAudienceForm])

  useEffect(() => {
    if (!courseId) {
      setCourseGroups([])
      setCourseYears([])
      setSections([])
      return
    }
    void listCourseGroups(courseId)
      .then((rows) =>
        setCourseGroups(
          rows.map((g) => ({
            value: String(g.courseGroupId),
            label: String(g.groupCode ?? g.courseGroupName ?? g.courseGroupId),
          })),
        ),
      )
      .catch(() => setCourseGroups([]))
  }, [courseId])

  useEffect(() => {
    if (!courseId) {
      setCourseYears([])
      setSections([])
      return
    }
    void listCourseYears(courseId)
      .then((rows) =>
        setCourseYears(
          rows.map((y) => ({
            value: String(y.courseYearId),
            label: String(y.courseYearName ?? y.yearName ?? y.courseYearId),
          })),
        ),
      )
      .catch(() => setCourseYears([]))
  }, [courseId, courseGroupId])

  useEffect(() => {
    if (!courseGroupId || !courseYearId) {
      setSections([])
      return
    }
    void listGroupSectionsByFilters({
      collegeId,
      academicYearId,
      courseGroupId,
      courseYearId,
    })
      .then((rows) =>
        setSections(
          rows.map((s) => ({
            value: String(s.groupSectionId),
            label: String(s.groupSectionName ?? s.section ?? s.groupSectionId),
          })),
        ),
      )
      .catch(() => setSections([]))
  }, [collegeId, academicYearId, courseGroupId, courseYearId])

  function calDays(nextStart: Date, nextEnd: Date) {
    if (nextStart.getTime() > nextEnd.getTime()) {
      toastInfo('From date should be less than To date.')
      setValue('endDate', nextStart)
    }
  }

  function audienceExists(next: AudienceTableRow): boolean {
    return eventAudiences.some((existing) => {
      if (Number(existing.audienceTypeId) !== Number(next.audienceTypeId)) return false
      if (existing.audienceTypeCode === 'ALL') return true
      return String(existing.categoryValue ?? '') === String(next.categoryValue ?? '')
    })
  }

  function addAudience() {
    if (!audienceTypeId) {
      toastError('Event audience type is required.')
      return
    }

    const audienceMeta = audienceTypes.find((a) => Number(a.generalDetailId) === audienceTypeId)
    const code = audienceMeta?.generalDetailCode ?? ''
    let categoryName = ''
    let categoryValue: string | number = ''
    let nextCourseId: number | null = null
    let courseName: string | null = null

    if (code === 'ALL') {
      categoryName = 'all'
      categoryValue = 'all'
    } else if (code === 'TCHNGSTF') {
      if (!departmentId) {
        toastInfo('Select department.')
        return
      }
      const dept = departments.find((d) => Number(d.value) === departmentId)
      categoryName = dept ? `department-(${dept.label})` : 'department'
      categoryValue = departmentId
    } else if (code === 'STD' || code === 'Parents') {
      if (!courseId || sectionIds.length === 0) {
        toastInfo('Select at least one section.')
        return
      }
      nextCourseId = courseId
      const course = courses.find((c) => Number(c.value) === courseId)
      courseName = course?.label ?? null
      categoryValue = sectionIds.join(',')
      const sectionLabels = sectionIds
        .map((id) => sections.find((s) => s.value === id)?.label ?? id)
        .join(',')
      categoryName = `section-(${course?.label ?? ''})${sectionLabels}`
    } else {
      toastInfo('Select at least any audience.')
      return
    }

    const nextRow: AudienceTableRow = {
      audienceTypeId,
      audienceTypeCode: code,
      audienceTypeName: audienceMeta ? generalDetailLabel(audienceMeta) : '',
      collegeId,
      courseId: nextCourseId ?? undefined,
      courseName: courseName ?? undefined,
      categoryName,
      categoryValue,
      isActive: true,
    }

    if (audienceExists(nextRow)) {
      toastInfo('Already exists in event audience.')
      return
    }

    setEventAudiences((prev) => [...prev, nextRow])
    clearAudienceForm()
  }

  function deleteAudience(index: number) {
    const target = eventAudiences[index]
    if (!target) return
    if (target.eventAudienceId) {
      setDeletedAudiences((prev) => [...prev, { ...target, isActive: false }])
    }
    setEventAudiences((prev) => prev.filter((_, i) => i !== index))
  }

  async function onFormSubmit(values: FormValues) {
    if (eventAudiences.length === 0) {
      toastInfo('Add at least one event audience.')
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
      eventAudiences: [...eventAudiences, ...deletedAudiences],
    }
    await onSubmit(payload)
  }

  const audienceColumns = useMemo(
    () => [
      {
        id: 'siNo',
        label: 'SI.No',
        width: 10,
        render: (_row: AudienceTableRow, index: number) => index + 1,
      },
      {
        id: 'audienceTypeCode',
        label: 'Audience Type',
        width: 25,
        render: (r: AudienceTableRow) => r.audienceTypeCode ?? r.audienceTypeName ?? '—',
      },
      {
        id: 'categoryName',
        label: 'Category',
        width: 55,
        render: (r: AudienceTableRow) => r.categoryName ?? '—',
      },
      {
        id: 'actions',
        label: 'Actions',
        width: 10,
        render: (_row: AudienceTableRow, index: number) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => deleteAudience(index)}
            aria-label="Delete event audience"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [eventAudiences],
  )

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
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
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
        </div>
        <div className="sm:col-span-2">
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
        </div>

        <div className="sm:col-span-2">
          <div className="space-y-1">
            <Label htmlFor="eventName" className={EVENTS_FIELD_LABEL_CLASS}>
              Event *
            </Label>
            <Input id="eventName" className={EVENTS_INPUT_CLASS} {...register('eventName')} />
            {errors.eventName ? (
              <p className="text-xs text-destructive">{errors.eventName.message}</p>
            ) : null}
          </div>
        </div>
        <div className="sm:col-span-1">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start Date *"
                value={field.value}
                onChange={(d) => {
                  const next = d ?? new Date()
                  field.onChange(next)
                  calDays(next, watch('endDate'))
                }}
                clearable={false}
              />
            )}
          />
        </div>
        <div className="sm:col-span-1">
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End Date *"
                value={field.value}
                minDate={startDate}
                onChange={(d) => {
                  const next = d ?? startDate
                  field.onChange(next)
                  calDays(startDate, next)
                }}
                clearable={false}
              />
            )}
          />
        </div>

        <div className="sm:col-span-1">
          <div className="space-y-1">
            <Label htmlFor="organizerDetails" className={EVENTS_FIELD_LABEL_CLASS}>
              Organizer
            </Label>
            <Input id="organizerDetails" className={EVENTS_INPUT_CLASS} {...register('organizerDetails')} />
          </div>
        </div>
        <div className="sm:col-span-3">
          <div className="space-y-1">
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
        </div>

        <div className="flex items-center gap-2 sm:col-span-1">
          <Checkbox
            id="isHoliday"
            checked={watch('isHoliday')}
            onCheckedChange={(v) => setValue('isHoliday', v === true)}
          />
          <Label htmlFor="isHoliday" className={`${EVENTS_FIELD_LABEL_CLASS} cursor-pointer`}>
            Holiday
          </Label>
        </div>
        <div className="flex items-center gap-2 sm:col-span-1">
          <Checkbox
            id="isPublished"
            checked={watch('isPublished')}
            onCheckedChange={(v) => setValue('isPublished', v === true)}
          />
          <Label htmlFor="isPublished" className={`${EVENTS_FIELD_LABEL_CLASS} cursor-pointer`}>
            Publish
          </Label>
        </div>
        <div className="sm:col-span-1">
          <Controller
            name="publishDate"
            control={control}
            render={({ field }) => (
              <DatePicker label="Publish Date *" value={field.value} onChange={field.onChange} clearable={false} />
            )}
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-1">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isActive" className={`${EVENTS_FIELD_LABEL_CLASS} cursor-pointer`}>
                  Active
                </Label>
              </>
            )}
          />
        </div>

        {!isActive ? (
          <div className="space-y-1 sm:col-span-4">
            <Label htmlFor="reason" className={EVENTS_FIELD_LABEL_CLASS}>
              Reason
            </Label>
            <Input id="reason" className={EVENTS_INPUT_CLASS} {...register('reason')} />
          </div>
        ) : null}

        <div className="sm:col-span-4">
          <Collapsible open={audienceOpen} onOpenChange={setAudienceOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Event Audience
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', audienceOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3 rounded-md border border-border p-3">
              <Select
                label="Event Audience Type *"
                value={audienceTypeId ? String(audienceTypeId) : null}
                onChange={(v) => {
                  setAudienceTypeId(v ? Number(v) : null)
                  setCourseId(null)
                  setCourseGroupId(null)
                  setCourseYearId(null)
                  setSectionIds([])
                  setDepartmentId(null)
                }}
                options={audienceTypeOptions}
                searchable
              />

              {showStudentFields ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <Select
                    label="Course"
                    value={courseId ? String(courseId) : null}
                    onChange={(v) => {
                      setCourseId(v ? Number(v) : null)
                      setCourseGroupId(null)
                      setCourseYearId(null)
                      setSectionIds([])
                    }}
                    options={courses}
                    searchable
                  />
                  <Select
                    label="Course Group"
                    value={courseGroupId ? String(courseGroupId) : null}
                    onChange={(v) => {
                      setCourseGroupId(v ? Number(v) : null)
                      setCourseYearId(null)
                      setSectionIds([])
                    }}
                    options={courseGroups}
                    searchable
                    disabled={!courseId}
                  />
                  <Select
                    label="Course Year"
                    value={courseYearId ? String(courseYearId) : null}
                    onChange={(v) => {
                      setCourseYearId(v ? Number(v) : null)
                      setSectionIds([])
                    }}
                    options={courseYears}
                    searchable
                    disabled={!courseId}
                  />
                  <MultiSelect
                    label="Section"
                    value={sectionIds}
                    onChange={setSectionIds}
                    options={sections}
                    searchable
                    disabled={!courseGroupId || !courseYearId}
                  />
                </div>
              ) : null}

              {showDepartmentField ? (
                <Select
                  label="Department"
                  value={departmentId ? String(departmentId) : null}
                  onChange={(v) => setDepartmentId(v ? Number(v) : null)}
                  options={departments}
                  searchable
                />
              ) : null}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={clearAudienceForm}>
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={addAudience}>
                  Add
                </Button>
              </div>

              {eventAudiences.length > 0 ? (
                <Table rows={eventAudiences} columns={audienceColumns} />
              ) : null}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </FormModal>
  )
}
