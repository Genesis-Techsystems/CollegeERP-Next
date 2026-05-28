'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTrainingDetail, createTrainingDetail, updateTrainingDetail } from '@/services/trainings'
import { listRooms } from '@/services/admin/room'
import type { TrainingDetail } from '@/types/trainings'
import type { Room } from '@/types/room'

const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '7', label: 'Sun' },
]

const schema = z.object({
  trainingDetailTitle: z.string().min(1, 'Detail title is required'),
  trainerName: z.string().min(1, 'Trainer name is required'),
  trainerDetails: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  noOfStudents: z.string().optional(),
  roomId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  fkDayIds: z.string().optional(),
  trainingDetailDesc: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().min(1, 'Reason is required'),
})

type FormValues = z.infer<typeof schema>

function getDefaults(detail?: TrainingDetail | null): FormValues {
  if (detail) {
    return {
      trainingDetailTitle: detail.trainingDetailTitle,
      trainerName: detail.trainerName,
      trainerDetails: detail.trainerDetails ?? '',
      startTime: detail.startTime ?? '',
      endTime: detail.endTime ?? '',
      location: detail.location ?? '',
      noOfStudents: detail.noOfStudents != null ? String(detail.noOfStudents) : '',
      roomId: detail.roomId != null ? String(detail.roomId) : '',
      isRecurring: detail.isRecurring ?? false,
      fkDayIds: detail.fkDayIds ?? '',
      trainingDetailDesc: detail.trainingDetailDesc ?? '',
      isActive: detail.isActive,
      reason: detail.reason ?? '',
    }
  }
  return {
    trainingDetailTitle: '',
    trainerName: '',
    trainerDetails: '',
    startTime: '',
    endTime: '',
    location: '',
    noOfStudents: '',
    roomId: '',
    isRecurring: false,
    fkDayIds: '',
    trainingDetailDesc: '',
    isActive: true,
    reason: '',
  }
}

function TrainingDetailContent() {
  const router = useRouter()
  const params = useSearchParams()

  const action = params.get('a') ?? 'New Training Detail'
  const traningDetId = params.get('traningDetId')
  const paTraningId = params.get('paTraningId') ?? ''
  const trainingTitle = params.get('trainingTitle') ?? ''
  const collegeId = params.get('collegeId') ?? ''
  const yearName = params.get('yearName') ?? ''

  const isEdit = Boolean(traningDetId)

  const [rooms, setRooms] = useState<Room[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const isRecurring = watch('isRecurring')
  const fkDayIds = watch('fkDayIds')
  const selectedDays = fkDayIds ? fkDayIds.split(',').filter(Boolean) : []

  useEffect(() => {
    listRooms().then(setRooms).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !traningDetId) return
    setLoading(true)
    getTrainingDetail(Number(traningDetId))
      .then((detail) => {
        if (detail) reset(getDefaults(detail))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isEdit, traningDetId, reset])

  function toggleDay(dayId: string, current: string[], onChange: (v: string) => void) {
    const next = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId]
    onChange(next.join(','))
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<TrainingDetail> = {
        trainingDetailTitle: values.trainingDetailTitle,
        trainerName: values.trainerName,
        trainerDetails: values.trainerDetails,
        startTime: values.startTime,
        endTime: values.endTime,
        location: values.location,
        noOfStudents: values.noOfStudents ? Number(values.noOfStudents) : undefined,
        roomId: values.roomId ? Number(values.roomId) : undefined,
        isRecurring: values.isRecurring,
        fkDayIds: values.fkDayIds,
        trainingDetailDesc: values.trainingDetailDesc,
        isActive: values.isActive,
        reason: values.reason,
        paTraningId: Number(paTraningId),
        collegeId: Number(collegeId),
        yearName,
      }
      if (isEdit && traningDetId) {
        await updateTrainingDetail(Number(traningDetId), payload)
      } else {
        await createTrainingDetail(payload)
      }
      router.back()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="app-card p-6 text-sm text-muted-foreground">Loading…</div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card p-4 space-y-4">
        {/* Context header */}
        <div className="flex items-center gap-4 pb-2 border-b border-border">
          <h2 className="app-card-title">{action}</h2>
          {trainingTitle && (
            <span className="text-xs text-muted-foreground">
              {trainingTitle}
              {yearName && ` · ${yearName}`}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-xs">Detail Title *</Label>
            <Input {...register('trainingDetailTitle')} placeholder="Training detail title" />
            {errors.trainingDetailTitle && <p className="text-xs text-red-500">{errors.trainingDetailTitle.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Name *</Label>
              <Input {...register('trainerName')} placeholder="Trainer name" />
              {errors.trainerName && <p className="text-xs text-red-500">{errors.trainerName.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Details</Label>
              <Input {...register('trainerDetails')} placeholder="Trainer details" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Start Time</Label>
              <Input type="time" {...register('startTime')} />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">End Time</Label>
              <Input type="time" {...register('endTime')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Location</Label>
              <Input {...register('location')} placeholder="Location" />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">No. of Students</Label>
              <Input type="number" {...register('noOfStudents')} placeholder="0" />
            </div>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Room</Label>
            <Controller
              name="roomId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.roomId} value={String(r.roomId)}>
                        {r.roomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isRecurring"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  Is Recurring
                </label>
              )}
            />
          </div>

          {isRecurring && (
            <div className="space-y-1">
              <Label className="text-xs">Days</Label>
              <Controller
                name="fkDayIds"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <label key={d.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={selectedDays.includes(d.id)}
                          onCheckedChange={() =>
                            toggleDay(d.id, selectedDays, field.onChange)
                          }
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          <div className="space-y-0.5">
            <Label className="text-xs">Description</Label>
            <Textarea {...register('trainingDetailDesc')} rows={2} placeholder="Description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Reason *</Label>
              <Input {...register('reason')} placeholder="Reason" />
              {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="flex items-end pb-1">
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
          </div>

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}

export default function TrainingDetailPage() {
  return (
    <Suspense>
      <TrainingDetailContent />
    </Suspense>
  )
}
