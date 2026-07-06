'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField, FormField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import { requiredNumber } from '@/lib/zod-fields'

const INPUT_CLASS =
  'min-h-9 placeholder:text-muted-foreground placeholder:opacity-100'

type Floor = {
  floorId: number
  floorName?: string
  floorNo?: number
}

const schema = z.object({
  blockId: requiredNumber('Block is required'),
  floorId: requiredNumber('Floor is required'),
  roomTypeId: requiredNumber('Room type is required'),
  roomName: z.string().min(1, 'Room name is required'),
  roomCode: z.string().min(1, 'Room code is required'),
  occupancy: z.preprocess(
    (value) => (value === '' || value == null || Number.isNaN(value) ? undefined : value),
    z.number({ error: 'Occupancy is required' }).min(0, 'Occupancy cannot be negative'),
  ),
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

function num(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const EMPTY_DEFAULTS: FormValues = {
  blockId: undefined as unknown as number,
  floorId: undefined as unknown as number,
  roomTypeId: undefined as unknown as number,
  roomName: '',
  roomCode: '',
  occupancy: undefined as unknown as number,
  examrows: undefined,
  examcolumns: undefined,
  isActive: true,
  reason: '',
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: EMPTY_DEFAULTS,
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
      setValue('floorId', undefined as unknown as number)
      return
    }
    listActiveFloorsByBlock(selectedBlockId).then(setFloors).catch(console.error)
  }, [selectedBlockId, setValue])

  useEffect(() => {
    if (room) {
      const raw = room as unknown as Record<string, unknown>
      reset({
        blockId: num(room.blockId ?? raw.block_id ?? raw.fk_block_id) ?? (undefined as unknown as number),
        floorId: num(room.floorId ?? raw.floor_id ?? raw.fk_floor_id) ?? (undefined as unknown as number),
        roomTypeId: num(room.roomTypeId ?? raw.room_type_id ?? raw.fk_room_type_id) ?? (undefined as unknown as number),
        roomName: String(room.roomName ?? raw.room_name ?? ''),
        roomCode: String(room.roomCode ?? raw.room_code ?? ''),
        occupancy: num(room.occupancy ?? raw.occupancy) ?? 0,
        examrows: num(room.examrows ?? raw.examrows ?? raw.exam_rows),
        examcolumns: num(room.examcolumns ?? raw.examcolumns ?? raw.exam_columns),
        isActive: Boolean(room.isActive ?? raw.is_active ?? true),
        reason: Boolean(room.isActive ?? raw.is_active ?? true)
          ? ''
          : String(room.reason ?? raw.reason ?? ''),
      })
    } else {
      reset(EMPTY_DEFAULTS)
    }
    setSubmitError(null)
  }, [room, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) {
        await updateRoom(room.roomId, data, room)
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Room' : 'Add Room'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    setValue('floorId', undefined as unknown as number)
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Room Name" required htmlFor="roomName" error={errors.roomName?.message}>
              <Input id="roomName" className={INPUT_CLASS} placeholder="Enter room name" {...register('roomName')} />
            </FormField>
            <FormField label="Room Code" required htmlFor="roomCode" error={errors.roomCode?.message}>
              <Input id="roomCode" className={INPUT_CLASS} placeholder="Enter room code" {...register('roomCode')} />
            </FormField>
            <FormField label="Occupancy" required htmlFor="occupancy" error={errors.occupancy?.message}>
              <Input
                id="occupancy"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="Enter occupancy"
                {...register('occupancy', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:max-w-[66%]">
            <FormField label="Total Rows" htmlFor="examrows" error={errors.examrows?.message}>
              <Input
                id="examrows"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="Enter total rows"
                {...register('examrows', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Total Columns" htmlFor="examcolumns" error={errors.examcolumns?.message}>
              <Input
                id="examcolumns"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="Enter total columns"
                {...register('examcolumns', { valueAsNumber: true })}
              />
            </FormField>
          </div>

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

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-end">
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
