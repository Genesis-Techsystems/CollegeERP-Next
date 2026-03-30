'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { domainList, buildQuery } from '@/services/crud.service'
import { createSeatingPlanRow, updateSeatingPlanRow, getRooms } from '@/services/seating-plan.service'
import type { ExamTimetable } from '@/types/exam-timetable'
import type { ExamRoomAllotment, SeatingPlanFormValues } from '@/types/seating-plan'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  examId: z.number({ message: 'Required' }),
  examTimetableId: z.number({ message: 'Required' }),
  roomId: z.number({ message: 'Required' }),
  totalRows: z.number().min(1, 'Must be at least 1'),
  totalColumns: z.number().min(1, 'Must be at least 1'),
  priority: z.number().min(0),
  isActive: z.boolean(),
  reason: z.string(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface SeatingPlanModalProps {
  open: boolean
  onClose: () => void
  /** The row being edited, or null for a new row */
  row: ExamRoomAllotment | null
  /** The currently selected exam ID (pre-fills the exam field) */
  examId: number
  /** Timetable slots for the selected exam (pre-loaded by parent) */
  timetableSlots: ExamTimetable[]
  onSaved: () => void
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function SeatingPlanModal({
  open,
  onClose,
  row,
  examId,
  timetableSlots = [],
  onSaved,
}: SeatingPlanModalProps) {
  const queryClient = useQueryClient()
  const isEdit = row !== null

  // ── Rooms ──────────────────────────────────────────────────────────────
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-lookup'],
    queryFn: getRooms,
    staleTime: 5 * 60 * 1000,
  })

  // ── Form ───────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      examId,
      examTimetableId: undefined,
      roomId: undefined,
      totalRows: 5,
      totalColumns: 6,
      priority: 0,
      isActive: true,
      reason: '',
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (row) {
      reset({
        examId: row.examId,
        examTimetableId: row.examTimetableId,
        roomId: row.roomId,
        totalRows: row.totalRows,
        totalColumns: row.totalColumns,
        priority: row.priority ?? 0,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        examId,
        examTimetableId: undefined,
        roomId: undefined,
        totalRows: 5,
        totalColumns: 6,
        priority: 0,
        isActive: true,
        reason: '',
      })
    }
  }, [row, examId, reset])

  // ── Mutation ───────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: SeatingPlanFormValues = {
        examId: values.examId,
        examTimetableId: values.examTimetableId,
        roomId: values.roomId,
        totalRows: values.totalRows,
        totalColumns: values.totalColumns,
        priority: values.priority,
        isActive: values.isActive,
        reason: values.reason,
      }
      return isEdit && row
        ? updateSeatingPlanRow(row.examRoomAllotmentId, payload)
        : createSeatingPlanRow(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seating-plan'] })
      onSaved()
      onClose()
    },
  })

  // ── Submit ─────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  // ── Helpers ────────────────────────────────────────────────────────────
  function slotLabel(slot: ExamTimetable): string {
    const date = slot.examDate ? new Date(slot.examDate).toLocaleDateString('en-GB') : ''
    return `${date} — ${slot.examSessionName ?? slot.examSessionId} — ${slot.subjectCode ?? slot.subjectId}`
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Room Allotment' : 'Add Room Allotment'}</DialogTitle>
          <DialogDescription>
            Assign a room/hall to an exam timetable slot and configure seating capacity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {/* Timetable Slot */}
          <div className="space-y-1">
            <Label htmlFor="examTimetableId">Timetable Slot <span className="text-destructive">*</span></Label>
            <Controller
              name="examTimetableId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="examTimetableId">
                    <SelectValue placeholder="Select timetable slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timetableSlots.map((slot) => (
                      <SelectItem key={slot.examTimetableId} value={slot.examTimetableId.toString()}>
                        {slotLabel(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.examTimetableId && (
              <p className="text-xs text-destructive">{errors.examTimetableId.message}</p>
            )}
          </div>

          {/* Room */}
          <div className="space-y-1">
            <Label htmlFor="roomId">Room / Hall <span className="text-destructive">*</span></Label>
            <Controller
              name="roomId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="roomId">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.roomId} value={room.roomId.toString()}>
                        {room.roomCode} {room.roomName ? `— ${room.roomName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roomId && (
              <p className="text-xs text-destructive">{errors.roomId.message}</p>
            )}
          </div>

          {/* Rows + Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="totalRows">Total Rows <span className="text-destructive">*</span></Label>
              <Input
                id="totalRows"
                type="number"
                min={1}
                {...register('totalRows', { valueAsNumber: true })}
              />
              {errors.totalRows && (
                <p className="text-xs text-destructive">{errors.totalRows.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="totalColumns">Total Columns <span className="text-destructive">*</span></Label>
              <Input
                id="totalColumns"
                type="number"
                min={1}
                {...register('totalColumns', { valueAsNumber: true })}
              />
              {errors.totalColumns && (
                <p className="text-xs text-destructive">{errors.totalColumns.message}</p>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min={0}
              {...register('priority', { valueAsNumber: true })}
            />
          </div>

          {/* Is Active */}
          <div className="space-y-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              )}
            />

            {/* Reason (shown when inactive) */}
            <Controller
              name="isActive"
              control={control}
              render={({ field: activeField }) =>
                !activeField.value ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="reason">Reason for Deactivation</Label>
                    <Input id="reason" {...register('reason')} />
                  </div>
                ) : <></>
              }
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as Error)?.message ?? 'Save failed. Please try again.'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
