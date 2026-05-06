'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  addRoomDetailsList,
  listActiveBlocksByBuilding,
  listActiveBuildingsForRooms,
  listActiveCampuses,
  listActiveEttlDevices,
  listActiveFloorsByBlock,
  listRoomDetails,
  updateRoomDetails,
} from '@/services'
import type { ColDef } from 'ag-grid-community'
import type { Block } from '@/types/block'
import type { Building } from '@/types/building'
import type { Campus } from '@/types/campus'
import type { RoomDetail } from '@/types/room-detail'
import type { EttlDevice } from '@/services/admin/room-detail'

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function pickBool(row: Record<string, unknown>, keys: string[], fallback = true): boolean {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'boolean') return value
    if (value === 'true' || value === '1' || value === 1) return true
    if (value === 'false' || value === '0' || value === 0) return false
  }
  return fallback
}

function pickId(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = num(row[key])
    if (n > 0) return n
  }
  return undefined
}

function pickRoomIdFromRow(row: RoomDetail): number {
  const raw = row as unknown as Record<string, unknown>
  const room = (raw.room ?? raw.Room) as Record<string, unknown> | undefined
  return num(
    row.roomId ??
      raw.roomId ??
      raw.room_id ??
      raw.fk_room_id ??
      raw.pk_room_id ??
      raw.pk_roomid ??
      room?.roomId ??
      room?.room_id,
  )
}

function pickRoomLabelFromRow(row: RoomDetail): string {
  const raw = row as unknown as Record<string, unknown>
  const room = (raw.room ?? raw.Room) as Record<string, unknown> | undefined
  const roomCode = pickText(raw, ['roomCode', 'room_code']) || pickText(room ?? {}, ['roomCode', 'room_code'])
  const roomName = pickText(
    raw,
    ['roomName', 'room_name', 'roomNumber', 'room_number', 'room_no', 'roomNo'],
  ) || pickText(room ?? {}, ['roomName', 'room_name', 'roomNumber', 'room_number'])
  const label = `${roomCode} ${roomName}`.trim()
  return label || `Room ${pickRoomIdFromRow(row)}`
}

const schema = z.object({
  roomId: z.number().min(1, 'Room is required'),
  ettlDeviceId: z.number().min(1, 'Device is required'),
  roomDetailId: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RoomDetailModalProps {
  open: boolean
  onClose: () => void
  room: RoomDetail | null
  initialCampusId?: number | null
  initialBuildingId?: number | null
  initialBlockId?: number | null
  initialFloorId?: number | null
  initialRoomId?: number | null
  roomDeviceRows?: RoomDetail[]
  onSaved: () => void
}

function asOptions<T>(rows: T[], getValue: (row: T) => number, getLabel: (row: T) => string): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

type Floor = {
  floorId: number
  floorName?: string
  floorNo?: number
}

const DEVICE_COL_DEFS: ColDef<RoomDetail>[] = [
  { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  {
    headerName: 'Room Name',
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => {
      const raw = (p.data ?? {}) as Record<string, unknown>
      return pickText(raw, ['room_name', 'roomName', 'roomNumber', 'room_number', 'roomCode'])
    },
  },
  {
    headerName: 'Room Device Name',
    minWidth: 220,
    flex: 1,
    valueGetter: (p) => {
      const raw = (p.data ?? {}) as Record<string, unknown>
      return pickText(raw, ['devicefname', 'deviceFName', 'devicesname', 'devicesName', 'deviceName'])
    },
  },
]

export default function RoomDetailModal({
  open,
  onClose,
  room,
  initialCampusId = null,
  initialBuildingId = null,
  initialBlockId = null,
  initialFloorId = null,
  initialRoomId = null,
  roomDeviceRows = [],
  onSaved,
}: Readonly<RoomDetailModalProps>) {
  const isEditing = room != null
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<RoomDetail[]>([])
  const [devices, setDevices] = useState<EttlDevice[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      campusId: undefined,
      buildingId: undefined,
      blockId: undefined,
      floorId: undefined,
      roomId: undefined,
      ettlDeviceId: undefined,
      roomDetailId: undefined,
      isActive: true,
      reason: '',
    },
  })
  const selectedCampusId = watch('campusId')
  const selectedBuildingId = watch('buildingId')
  const selectedBlockId = watch('blockId')
  const selectedFloorId = watch('floorId')
  const selectedRoomId = watch('roomId')

  const roomOptions = useMemo(
    () => {
      const campusId = selectedCampusId ?? 0
      const buildingId = selectedBuildingId ?? 0
      const blockId = selectedBlockId ?? 0
      const floorId = selectedFloorId ?? 0
      const sourceRows = roomDeviceRows.length > 0 ? roomDeviceRows : rooms
      const filtered = sourceRows.filter((row) => {
        const raw = row as unknown as Record<string, unknown>
        const rowCampusId = num(row.campusId ?? raw.fk_campus_id ?? raw.campus_id)
        const rowBuildingId = num(row.buildingId ?? raw.fk_building_id ?? raw.building_id)
        const rowBlockId = num(row.blockId ?? raw.fk_block_id ?? raw.block_id)
        const rowFloorId = num(row.floorId ?? raw.fk_floor_id ?? raw.floor_id)

        // Be permissive when backend rows omit hierarchy IDs.
        if (campusId && rowCampusId > 0 && rowCampusId !== campusId) return false
        if (buildingId && rowBuildingId > 0 && rowBuildingId !== buildingId) return false
        if (blockId && rowBlockId > 0 && rowBlockId !== blockId) return false
        if (floorId && rowFloorId > 0 && rowFloorId !== floorId) return false
        return pickRoomIdFromRow(row) > 0
      })

      const uniqueOptions = new Map<number, string>()
      for (const row of filtered) {
        const id = pickRoomIdFromRow(row)
        if (!id || uniqueOptions.has(id)) continue
        uniqueOptions.set(id, pickRoomLabelFromRow(row))
      }

      return Array.from(uniqueOptions.entries()).map(([value, label]) => ({
        value: String(value),
        label,
      }))
    },
    [rooms, roomDeviceRows, selectedCampusId, selectedBuildingId, selectedBlockId, selectedFloorId],
  )
  const deviceOptions = useMemo(
    () => asOptions(
      devices,
      (r) => r.ettlDeviceId,
      (r) => {
        const serialText = r.serialNumber ? ` (${String(r.serialNumber)})` : ''
        return `${r.deviceFName ?? r.devicesName ?? ''}${serialText}`.trim()
      },
    ),
    [devices],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveCampuses(), listActiveBuildingsForRooms(), listRoomDetails(), listActiveEttlDevices()])
      .then(([campusRows, buildingRows, roomRows, deviceRows]) => {
        setCampuses(campusRows)
        setBuildings(buildingRows)
        setRooms(roomRows)
        setDevices(deviceRows)
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (!selectedBuildingId) {
      setBlocks([])
      return
    }
    listActiveBlocksByBuilding(selectedBuildingId).then(setBlocks).catch(console.error)
  }, [selectedBuildingId])

  useEffect(() => {
    if (!selectedBlockId) {
      setFloors([])
      return
    }
    listActiveFloorsByBlock(selectedBlockId).then(setFloors).catch(console.error)
  }, [selectedBlockId])

  const campusOptions = useMemo(
    () => asOptions(campuses, (r) => r.campusId, (r) => r.campusName),
    [campuses],
  )
  const buildingOptions = useMemo(() => {
    const filtered = selectedCampusId
      ? buildings.filter((building) => building.campusId === selectedCampusId)
      : buildings
    return asOptions(filtered, (r) => r.buildingId, (r) => r.buildingCode ?? r.buildingName ?? '')
  }, [buildings, selectedCampusId])
  const blockOptions = useMemo(
    () => asOptions(blocks, (r) => r.blockId, (r) => r.blockName ?? r.blockCode ?? ''),
    [blocks],
  )
  const floorOptions = useMemo(
    () => asOptions(floors, (r) => r.floorId, (r) => r.floorName ?? String(r.floorNo ?? '')),
    [floors],
  )

  const selectedRoomDeviceRows = useMemo(() => {
    if (roomDeviceRows.length === 0) return []
    const roomId = num(selectedRoomId ?? 0)
    if (!roomId) return roomDeviceRows
    return roomDeviceRows.filter((row) => pickRoomIdFromRow(row) === roomId)
  }, [roomDeviceRows, selectedRoomId])

  useEffect(() => {
    if (room) {
      const raw = room as unknown as Record<string, unknown>
      reset({
        campusId: pickId(raw, ['campusId', 'campus_id', 'fk_campus_id']),
        buildingId: pickId(raw, ['buildingId', 'building_id', 'fk_building_id']),
        blockId: pickId(raw, ['blockId', 'block_id', 'fk_block_id']),
        floorId: pickId(raw, ['floorId', 'floor_id', 'fk_floor_id']),
        roomId: pickId(raw, ['roomId', 'room_id', 'pk_room_id']),
        ettlDeviceId: pickId(raw, ['ettlDeviceId', 'ettl_device_id', 'deviceid', 'deviceId']),
        roomDetailId: pickId(raw, ['roomDetailId', 'room_detail_id', 'pk_room_detail_id']),
        isActive: pickBool(raw, ['isActive', 'is_active']),
        reason: pickText(raw, ['reason']),
      })
    } else {
      reset({
        campusId: initialCampusId ?? undefined,
        buildingId: initialBuildingId ?? undefined,
        blockId: initialBlockId ?? undefined,
        floorId: initialFloorId ?? undefined,
        roomId: initialRoomId ?? undefined,
        ettlDeviceId: undefined,
        roomDetailId: undefined,
        isActive: true,
        reason: '',
      })
    }
    setSubmitError(null)
  }, [room, open, reset, initialCampusId, initialBuildingId, initialBlockId, initialFloorId, initialRoomId])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) {
        const roomDetailId = data.roomDetailId ?? pickId(
          room as unknown as Record<string, unknown>,
          ['roomDetailId', 'room_detail_id', 'pk_room_detail_id'],
        )
        if (!roomDetailId) {
          setSubmitError('Unable to identify room detail for update')
          return
        }
        await updateRoomDetails({
          roomDetailId,
          roomId: data.roomId,
          ettlDeviceId: data.ettlDeviceId,
          isActive: data.isActive,
        })
      } else {
        await addRoomDetailsList([
          {
            roomId: data.roomId,
            ettlDeviceId: data.ettlDeviceId,
            isActive: data.isActive,
          },
        ])
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Room Details' : 'Add Room Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-5 gap-2">
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Campus"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('buildingId', undefined)
                    setValue('blockId', undefined)
                    setValue('floorId', undefined)
                    setValue('roomId', undefined)
                  }}
                  options={campusOptions}
                  placeholder="Select campus"
                />
              )}
            />
            <Controller
              name="buildingId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Building"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('blockId', undefined)
                    setValue('floorId', undefined)
                    setValue('roomId', undefined)
                  }}
                  options={buildingOptions}
                  placeholder="Select building"
                  disabled={!selectedCampusId}
                />
              )}
            />
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
                    setValue('roomId', undefined)
                  }}
                  options={blockOptions}
                  placeholder="Select block"
                  disabled={!selectedBuildingId}
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
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('roomId', undefined)
                  }}
                  options={floorOptions}
                  placeholder="Select floor"
                  disabled={!selectedBlockId}
                />
              )}
            />
            <Controller
              name="roomId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Room"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={roomOptions}
                  placeholder="Select room"
                  searchable
                  disabled={!selectedFloorId}
                  error={errors.roomId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            <Controller
              name="ettlDeviceId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Device"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={deviceOptions}
                  placeholder="Select device"
                  searchable
                  disabled={!selectedRoomId}
                  error={errors.ettlDeviceId?.message}
                />
              )}
            />
          </div>

          <div className="rounded-md border border-slate-200 overflow-hidden">
            <DataTable
              rowData={selectedRoomDeviceRows}
              columnDefs={DEVICE_COL_DEFS}
              loading={false}
              toolbar={false}
            />
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
