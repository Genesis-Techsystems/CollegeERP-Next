'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { TrainingSession } from '@/types/trainings'
import { searchEmployeesForCompanyMeeting } from '@/services/placements'
import { createTrainingSession, updateTrainingSession } from '@/services/trainings'

type FormValues = {
  inchargeEmployeeId: string | null
  sessionTakenBy: string
  sessionDate: Date | null
  fromTime: string
  toTime: string
  noOfAttendees: string
  sessionTopicsCovered: string
  isSessionCancelled: boolean
  sessionCancelReason: string
  isActive: boolean
  reason: string
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Angular stores `9:0:00` / `10:0:00` — map to HTML `time` `HH:mm`. */
function toHtmlTime(value?: string | null): string {
  if (!value) return ''
  const m = String(value).match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
  if (!m) return ''
  return `${String(Number(m[1])).padStart(2, '0')}:${String(Number(m[2])).padStart(2, '0')}`
}

/**
 * Angular `convert_to_24h` → `hours + ':' + minutes + ':' + '00'`
 * e.g. `9:0:00` (no zero-padding).
 */
function toAngularTime(htmlTime: string): string {
  if (!htmlTime) return ''
  const [h, m] = htmlTime.split(':')
  return `${Number(h)}:${Number(m)}:00`
}

function getDefaults(
  edit?: TrainingSession | null,
  startDate?: string | null,
): FormValues {
  if (edit) {
    return {
      inchargeEmployeeId:
        edit.inchargeEmployeeId != null ? String(edit.inchargeEmployeeId) : null,
      sessionTakenBy: edit.sessionTakenBy ?? '',
      sessionDate: parseDate(edit.sessionDate),
      fromTime: toHtmlTime(edit.fromTime) || '09:00',
      toTime: toHtmlTime(edit.toTime) || '10:00',
      noOfAttendees: edit.noOfAttendees != null ? String(edit.noOfAttendees) : '',
      sessionTopicsCovered: edit.sessionTopicsCovered ?? '',
      isSessionCancelled: edit.isSessionCancelled ?? false,
      sessionCancelReason: edit.sessionCancelReason ?? '',
      isActive: edit.isActive,
      reason: edit.reason ?? 'active',
    }
  }
  return {
    inchargeEmployeeId: null,
    sessionTakenBy: '',
    sessionDate: parseDate(startDate) ?? new Date(),
    fromTime: '09:00',
    toTime: '10:00',
    noOfAttendees: '',
    sessionTopicsCovered: '',
    isSessionCancelled: false,
    sessionCancelReason: '',
    isActive: true,
    reason: 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: TrainingSession | null
  traningDetId: number
  collegeId: number
  startDate?: string | null
  endDate?: string | null
  onSaved: () => void
}

export default function AddTrainingSessionModal({
  open,
  onClose,
  editData,
  traningDetId,
  collegeId,
  startDate,
  endDate,
  onSaved,
}: Props) {
  const [employees, setEmployees] = useState<
    Array<{ employeeId: number; firstName: string; empNumber?: string | null }>
  >([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: getDefaults(editData, startDate),
  })

  const isCancelled = watch('isSessionCancelled')
  const isActive = watch('isActive')
  const inchargeEmployeeId = watch('inchargeEmployeeId')

  useEffect(() => {
    reset(getDefaults(editData, startDate))
    setSubmitError(null)
    setEmployees([])
    if (open && editData?.inchargeEmpNumber && collegeId) {
      void searchIncharge(editData.inchargeEmpNumber)
    }
  }, [open, editData, reset, startDate, collegeId])

  async function searchIncharge(term: string) {
    if (!collegeId || term.trim().length < 5) {
      setEmployees([])
      return
    }
    setLoadingEmployees(true)
    try {
      const rows = await searchEmployeesForCompanyMeeting(collegeId, term)
      setEmployees(
        rows
          .map((r) => ({
            employeeId: Number(r.employeeId ?? 0),
            firstName: String(r.firstName ?? r.empName ?? r.employeeName ?? ''),
            empNumber: (r.empNumber as string | null | undefined) ?? null,
          }))
          .filter((e) => e.employeeId > 0),
      )
    } catch {
      setEmployees([])
    } finally {
      setLoadingEmployees(false)
    }
  }

  const employeeOptions = useMemo(() => {
    const opts = employees.map((e) => ({
      value: String(e.employeeId),
      label: e.empNumber ? `${e.firstName} (${e.empNumber})` : e.firstName,
    }))
    if (
      editData?.inchargeEmployeeId &&
      inchargeEmployeeId === String(editData.inchargeEmployeeId) &&
      !opts.some((o) => o.value === String(editData.inchargeEmployeeId))
    ) {
      opts.unshift({
        value: String(editData.inchargeEmployeeId),
        label: editData.inchargeEmpNumber
          ? `${editData.inchargeEmpName ?? 'Employee'} (${editData.inchargeEmpNumber})`
          : (editData.inchargeEmpName ?? 'Employee'),
      })
    }
    return opts
  }, [employees, editData, inchargeEmployeeId])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    if (!values.sessionDate || !values.inchargeEmployeeId || !values.sessionTakenBy) {
      setSubmitError('Please fill required fields')
      return
    }
    try {
      // Angular update body (exact keys): trainingSessionId, traningDetId, createdDt,
      // fromTime/toTime as `H:m:00`, sessionCancelReason null when not cancelled.
      const payload: Record<string, unknown> = {
        sessionDate: format(values.sessionDate, 'yyyy-MM-dd'),
        fromTime: toAngularTime(values.fromTime),
        toTime: toAngularTime(values.toTime),
        noOfAttendees: values.noOfAttendees ? Number(values.noOfAttendees) : null,
        inchargeEmployeeId: Number(values.inchargeEmployeeId),
        sessionTakenBy: values.sessionTakenBy,
        sessionTopicsCovered: values.sessionTopicsCovered || null,
        isSessionCancelled: !!values.isSessionCancelled,
        sessionCancelReason: values.isSessionCancelled
          ? values.sessionCancelReason || null
          : null,
        isActive: values.isActive,
        reason: values.isActive ? values.reason || 'active' : values.reason || null,
        traningDetId,
      }
      if (editData) {
        payload.trainingSessionId = editData.trainingSessionId
        payload.createdDt = editData.createdDt
        await updateTrainingSession(
          editData.trainingSessionId,
          payload as Partial<TrainingSession>,
        )
      } else {
        // Angular create also injects collegeId from parent
        payload.collegeId = collegeId
        await createTrainingSession(payload as Partial<TrainingSession>)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save session')
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Training Session' : 'Add Training Session'}
      size="lg"
      cancelLabel="Close"
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      formClassName="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="inchargeEmployeeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Incharge Name"
              value={field.value}
              onChange={field.onChange}
              options={employeeOptions}
              placeholder="Search by Employee name or Id…"
              searchable
              onSearch={(term) => void searchIncharge(term)}
              isLoading={loadingEmployees}
              disabled={!collegeId}
            />
          )}
        />
        <div>
          <label className="text-xs font-medium mb-1 block">Session TakenBy</label>
          <Input {...register('sessionTakenBy')} placeholder="Session TakenBy" />
        </div>

        <Controller
          name="sessionDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Session Date"
              value={field.value}
              onChange={field.onChange}
              minDate={parseDate(startDate) ?? undefined}
              maxDate={parseDate(endDate) ?? undefined}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          )}
        />
        <div>
          <label className="text-xs font-medium mb-1 block">No Of Attendees</label>
          <Input type="number" {...register('noOfAttendees')} placeholder="No Of Attendees" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">From Time</label>
          <Input type="time" {...register('fromTime')} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">To Time</label>
          <Input type="time" {...register('toTime')} />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Session Topics Covered</label>
          <Textarea
            {...register('sessionTopicsCovered')}
            rows={2}
            placeholder="Session Topics Covered"
          />
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="isSessionCancelled"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
                Is Session Cancelled
              </label>
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => {
                    const active = v === true
                    field.onChange(active)
                    if (active) setValue('reason', 'active')
                  }}
                />
                Active
              </label>
            )}
          />
        </div>

        {isCancelled && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block">Session Cancel Reason</label>
            <Textarea
              {...register('sessionCancelReason')}
              rows={2}
              placeholder="Session Cancel Reason"
            />
          </div>
        )}

        {!isActive && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block">Reason</label>
            <Input {...register('reason')} placeholder="Reason" />
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
      )}
    </FormModal>
  )
}
