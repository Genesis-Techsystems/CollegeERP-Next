'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createRoom,
  listActiveBlocksForRooms,
  listActiveFloorsByBlock,
  listActiveRoomTypes,
  updateRoom,
} from '@/services'
import type { Block } from '@/types/block'
import type { Room } from '@/types/room'
import type { RoomType } from '@/types/room-type'

type Floor = {
  floorId: number
  floorName?: string
  floorNo?: number
}

const schema = z.object({
  blockId: z.number().min(1, 'Block is required'),
  floorId: z.number().min(1, 'Floor is required'),
  roomTypeId: z.number().min(1, 'Room type is required'),
  roomName: z.string().min(1, 'Room name is required'),
  roomCode: z.string().min(1, 'Room code is required'),
  occupancy: z.coerce.number().min(0, 'Occupancy cannot be negative'),
  examrows: z.preprocess(
    (value) => (value === '' || value == null || Number.isNaN(value) ? undefined : value),
    z.number().min(0, 'Total rows cannot be negative').optional(),
  ),
  examcolumns: z.preprocess(
    (value) => (value === '' || value == null || Number.isNaN(value) ? undefined : value),
    z.number().min(0, 'Total columns cannot be negative').optional(),
  ),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RoomModalProps {
  open: boolean
  onClose: () => void
  room: Room | null
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export default function RoomModal({ open, onClose, room, onSaved }: Readonly<RoomModalProps>) {
  const isEditing = room != null
  const [blocks, setBlocks] = useState<Block[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      blockId: undefined,
      floorId: undefined,
      roomTypeId: undefined,
      roomName: '',
      roomCode: '',
      occupancy: 0,
      examrows: 0,
      examcolumns: 0,
      isActive: true,
      reason: '',
    },
  })

  const selectedBlockId = watch('blockId')

  const blockOptions = useMemo(
    () => asOptions(blocks, (r) => r.blockId, (r) => r.blockName ?? r.blockCode ?? ''),
    [blocks],
  )
  const floorOptions = useMemo(
    () => asOptions(floors, (r) => r.floorId, (r) => `${r.floorName ?? ''} ${r.floorNo ? `(${String(r.floorNo)})` : ''}`.trim()),
    [floors],
  )
  const roomTypeOptions = useMemo(
    () => asOptions(roomTypes, (r) => r.roomTypeId, (r) => r.roomType),
    [roomTypes],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveBlocksForRooms(), listActiveRoomTypes()])
      .then(([blockRows, roomTypeRows]) => {
        setBlocks(blockRows)
        setRoomTypes(roomTypeRows)
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (!selectedBlockId) {
      setFloors([])
      setValue('floorId', undefined)
      return
    }
    listActiveFloorsByBlock(selectedBlockId).then(setFloors).catch(console.error)
  }, [selectedBlockId, setValue])

  useEffect(() => {
    if (room) {
      const raw = room as unknown as Record<string, unknown>
      reset({
        blockId: num(room.blockId ?? raw.block_id ?? raw.fk_block_id) || undefined,
        floorId: num(room.floorId ?? raw.floor_id ?? raw.fk_floor_id) || undefined,
        roomTypeId: num(room.roomTypeId ?? raw.room_type_id ?? raw.fk_room_type_id) || undefined,
        roomName: String(room.roomName ?? raw.room_name ?? ''),
        roomCode: String(room.roomCode ?? raw.room_code ?? ''),
        occupancy: num(room.occupancy ?? raw.occupancy ?? 0),
        examrows: num(room.examrows ?? raw.examrows ?? raw.exam_rows ?? 0),
        examcolumns: num(room.examcolumns ?? raw.examcolumns ?? raw.exam_columns ?? 0),
        isActive: Boolean(room.isActive ?? raw.is_active ?? true),
        reason: String(room.reason ?? raw.reason ?? ''),
      })
    } else {
      reset()
    }
    setSubmitError(null)
  }, [room, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) {
        await updateRoom(room.roomId, data)
      } else {
        await createRoom(data)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save room')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Room' : 'Add Room'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Controller
              name="blockId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Block"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('floorId', undefined)
                  }}
                  options={blockOptions}
                  placeholder="Select block"
                  searchable
                  error={errors.blockId?.message}
                />
              )}
            />
            <Controller
              name="floorId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Floor"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={floorOptions}
                  placeholder="Select floor"
                  searchable
                  disabled={!selectedBlockId}
                  error={errors.floorId?.message}
                />
              )}
            />
            <Controller
              name="roomTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Room Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={roomTypeOptions}
                  placeholder="Select room type"
                  searchable
                  error={errors.roomTypeId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="roomName">Room Name *</Label>
              <Input id="roomName" {...register('roomName')} />
              {errors.roomName && <p className="text-xs text-red-500">{errors.roomName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="roomCode">Room Code *</Label>
              <Input id="roomCode" {...register('roomCode')} />
              {errors.roomCode && <p className="text-xs text-red-500">{errors.roomCode.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="occupancy">Occupancy *</Label>
              <Input id="occupancy" type="number" min={0} {...register('occupancy', { valueAsNumber: true })} />
              {errors.occupancy && <p className="text-xs text-red-500">{errors.occupancy.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="examrows">Total Rows</Label>
              <Input id="examrows" type="number" min={0} {...register('examrows', { valueAsNumber: true })} />
              {errors.examrows && <p className="text-xs text-red-500">{errors.examrows.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="examcolumns">Total Columns</Label>
              <Input id="examcolumns" type="number" min={0} {...register('examcolumns', { valueAsNumber: true })} />
              {errors.examcolumns && <p className="text-xs text-red-500">{errors.examcolumns.message}</p>}
            </div>
          </div>

          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue('reason', value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
