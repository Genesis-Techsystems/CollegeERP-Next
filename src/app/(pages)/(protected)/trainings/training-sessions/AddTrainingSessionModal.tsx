'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { TrainingSession } from '@/types/trainings'
import { listActiveEmployeesByCollege } from '@/services/admin/staff-subject-mapping'
import { createTrainingSession, updateTrainingSession } from '@/services/trainings'

const schema = z.object({
  sessionDate: z.string().min(1, 'Session date is required'),
  fromTime: z.string().optional(),
  toTime: z.string().optional(),
  noOfAttendees: z.string().optional(),
  inchargeEmployeeId: z.string().min(1, 'Incharge is required'),
  sessionTakenBy: z.string().min(1, 'Session taken by is required'),
  sessionTopicsCovered: z.string().optional(),
  isSessionCancelled: z.boolean().optional(),
  sessionCancelReason: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function getDefaults(edit?: TrainingSession | null): FormValues {
  if (edit) {
    return {
      sessionDate: edit.sessionDate,
      fromTime: edit.fromTime ?? '',
      toTime: edit.toTime ?? '',
      noOfAttendees: edit.noOfAttendees != null ? String(edit.noOfAttendees) : '',
      inchargeEmployeeId: edit.inchargeEmployeeId != null ? String(edit.inchargeEmployeeId) : '',
      sessionTakenBy: edit.sessionTakenBy ?? '',
      sessionTopicsCovered: edit.sessionTopicsCovered ?? '',
      isSessionCancelled: edit.isSessionCancelled ?? false,
      sessionCancelReason: edit.sessionCancelReason ?? '',
      isActive: edit.isActive,
    }
  }
  return {
    sessionDate: '',
    fromTime: '',
    toTime: '',
    noOfAttendees: '',
    inchargeEmployeeId: '',
    sessionTakenBy: '',
    sessionTopicsCovered: '',
    isSessionCancelled: false,
    sessionCancelReason: '',
    isActive: true,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: TrainingSession | null
  traningDetId: number
  collegeId: number
  onSaved: () => void
}

export default function AddTrainingSessionModal({
  open,
  onClose,
  editData,
  traningDetId,
  collegeId,
  onSaved,
}: Props) {
  const [employees, setEmployees] = useState<Array<{ employeeId: number; empName: string }>>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(editData),
  })

  const isCancelled = watch('isSessionCancelled')

  useEffect(() => {
    if (!open) return
    if (collegeId) {
      listActiveEmployeesByCollege(collegeId)
        .then((rows) => setEmployees(rows as Array<{ employeeId: number; empName: string }>))
        .catch(console.error)
    }
  }, [open, collegeId])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<TrainingSession> = {
        sessionDate: values.sessionDate,
        fromTime: values.fromTime,
        toTime: values.toTime,
        noOfAttendees: values.noOfAttendees ? Number(values.noOfAttendees) : undefined,
        inchargeEmployeeId: Number(values.inchargeEmployeeId),
        sessionTakenBy: values.sessionTakenBy,
        sessionTopicsCovered: values.sessionTopicsCovered,
        isSessionCancelled: values.isSessionCancelled,
        sessionCancelReason: values.sessionCancelReason,
        isActive: values.isActive,
        traningDetId,
        collegeId,
      }
      if (editData) {
        await updateTrainingSession(editData.trainingSessionId, payload)
      } else {
        await createTrainingSession(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save session')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Session' : 'Add Session'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Session Date *</Label>
              <Input type="date" {...register('sessionDate')} />
              {errors.sessionDate && <p className="text-xs text-red-500">{errors.sessionDate.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">No. of Attendees</Label>
              <Input type="number" {...register('noOfAttendees')} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">From Time</Label>
              <Input type="time" {...register('fromTime')} />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">To Time</Label>
              <Input type="time" {...register('toTime')} />
            </div>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Incharge Employee *</Label>
            <Controller
              name="inchargeEmployeeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                        {e.empName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.inchargeEmployeeId && <p className="text-xs text-red-500">{errors.inchargeEmployeeId.message}</p>}
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Session Taken By *</Label>
            <Input {...register('sessionTakenBy')} placeholder="Name of person who took the session" />
            {errors.sessionTakenBy && <p className="text-xs text-red-500">{errors.sessionTakenBy.message}</p>}
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Topics Covered</Label>
            <Textarea {...register('sessionTopicsCovered')} rows={2} placeholder="Topics covered in this session" />
          </div>

          <div className="flex gap-6 pt-1">
            <Controller
              name="isSessionCancelled"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  Is Session Cancelled
                </label>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  Is Active
                </label>
              )}
            />
          </div>

          {isCancelled && (
            <div className="space-y-0.5">
              <Label className="text-xs">Cancel Reason</Label>
              <Input {...register('sessionCancelReason')} placeholder="Reason for cancellation" />
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
