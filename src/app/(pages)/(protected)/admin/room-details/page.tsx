'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DoorOpen, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { FilterCard } from '@/common/components/feedback'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  getRoomDeviceDetails,
  listActiveBlocksByBuilding,
  listActiveBuildingsForRooms,
  listActiveCampuses,
  listActiveFloorsByBlock,
  listRoomDetails,
} from '@/services'
import type { Block } from '@/types/block'
import type { Building } from '@/types/building'
import type { Campus } from '@/types/campus'
import type { RoomDetail } from '@/types/room-detail'
import RoomDetailModal from './RoomDetailModal'

type Floor = {
  floorId: number
  floorName?: string
  floorNo?: number
}

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pickCampusId(row: RoomDetail): number {
  const r = row as unknown as Record<string, unknown>
  const campus = (r.campus ?? r.Campus) as Record<string, unknown> | undefined
  return num(row.campusId ?? r.fk_campus_id ?? r.campusId ?? campus?.campusId ?? campus?.campus_id)
}

function pickBuildingId(row: RoomDetail): number {
  const r = row as unknown as Record<string, unknown>
  const building = (r.building ?? r.Building) as Record<string, unknown> | undefined
  return num(row.buildingId ?? r.fk_building_id ?? r.buildingId ?? building?.buildingId ?? building?.building_id)
}

function pickBlockId(row: RoomDetail): number {
  const r = row as unknown as Record<string, unknown>
  const block = (r.block ?? r.Block) as Record<string, unknown> | undefined
  return num(row.blockId ?? r.fk_block_id ?? r.blockId ?? block?.blockId ?? block?.block_id)
}

function pickFloorId(row: RoomDetail): number {
  const r = row as unknown as Record<string, unknown>
  const floor = (r.floor ?? r.Floor) as Record<string, unknown> | undefined
  return num(row.floorId ?? r.fk_floor_id ?? r.floorId ?? floor?.floorId ?? floor?.floor_id)
}

function pickRoomId(row: RoomDetail): number {
  const r = row as unknown as Record<string, unknown>
  return num(row.roomId ?? r.roomId ?? r.fk_room_id ?? r.pk_room_id)
}

function pickText(row: RoomDetail, keys: string[]): string {
  const r = row as unknown as Record<string, unknown>
  for (const key of keys) {
    const value = r[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function normalizeKey(key: string): string {
  return key.replaceAll(/[_\s-]/g, '').toLowerCase()
}

function deepFindText(value: unknown, targetNormalized: Set<string>, depth = 0): string {
  if (depth > 3 || value == null || typeof value !== 'object') return ''
  const row = value as Record<string, unknown>
  for (const [key, child] of Object.entries(row)) {
    if (targetNormalized.has(normalizeKey(key))) {
      if (typeof child === 'string' && child.trim()) return child
      if (typeof child === 'number' && Number.isFinite(child)) return String(child)
    }
    const nested = deepFindText(child, targetNormalized, depth + 1)
    if (nested) return nested
  }
  return ''
}

function deepFindTextByKeyTokens(
  value: unknown,
  includeTokens: string[],
  excludeTokens: string[] = [],
  depth = 0,
): string {
  if (depth > 3 || value == null || typeof value !== 'object') return ''
  const row = value as Record<string, unknown>
  for (const [key, child] of Object.entries(row)) {
    const normalizedKey = normalizeKey(key)
    const hasInclude = includeTokens.some((token) => normalizedKey.includes(token))
    const hasExclude = excludeTokens.some((token) => normalizedKey.includes(token))
    if (hasInclude && !hasExclude) {
      if (typeof child === 'string' && child.trim()) return child
      if (typeof child === 'number' && Number.isFinite(child)) return String(child)
    }
    const nested = deepFindTextByKeyTokens(child, includeTokens, excludeTokens, depth + 1)
    if (nested) return nested
  }
  return ''
}

function pickTextDeep(row: RoomDetail, keys: string[]): string {
  const direct = pickText(row, keys)
  if (direct) return direct
  return deepFindText(row as unknown as Record<string, unknown>, new Set(keys.map(normalizeKey)))
}

function isLikelyWrongDeviceValue(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return true
  return (
    v.includes('campus') ||
    v.includes('block') ||
    v.includes('floor') ||
    v.includes('room') ||
    v.includes('class room') ||
    v.includes('lab') ||
    v.includes('department')
  )
}

function deepFindIdLikeText(value: unknown, depth = 0): string {
  if (depth > 3 || value == null || typeof value !== 'object') return ''
  const row = value as Record<string, unknown>
  for (const child of Object.values(row)) {
    if (typeof child === 'string') {
      const text = child.trim()
      // Typical biometric/device id pattern: long alphanumeric token
      if (/^[A-Za-z0-9-]{10,}$/.test(text)) return text
    }
    const nested = deepFindIdLikeText(child, depth + 1)
    if (nested) return nested
  }
  return ''
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<RoomDetail>,
  campusName: {
    headerName: 'Campus Name',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => pickText((p.data ?? {}) as RoomDetail, ['campusName', 'campus_name']),
  } as ColDef<RoomDetail>,
  blockName: {
    headerName: 'Block Name',
    minWidth: 140,
    flex: 1,
    valueGetter: (p) => pickText((p.data ?? {}) as RoomDetail, ['blockName', 'block_name', 'blockCode', 'block_code']),
  } as ColDef<RoomDetail>,
  floorName: {
    headerName: 'Floor Name',
    minWidth: 130,
    flex: 0.9,
    valueGetter: (p) => pickText((p.data ?? {}) as RoomDetail, ['floorName', 'floor_name', 'floorNo', 'floor_no']),
  } as ColDef<RoomDetail>,
  roomNumber: {
    headerName: 'Room Number',
    minWidth: 140,
    flex: 1,
    valueGetter: (p) => pickText((p.data ?? {}) as RoomDetail, ['roomNumber', 'room_number', 'roomName', 'room_name', 'roomCode', 'room_code']),
  } as ColDef<RoomDetail>,
  deviceName: {
    headerName: 'Device Name',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => {
      const row = (p.data ?? {}) as RoomDetail
      const value = pickTextDeep(row, [
        'deviceFName',
        'devicefname',
        'device_f_name',
        'devicesName',
        'devicesname',
        'devices_name',
        'deviceName',
        'device_name',
        'devicename',
        'device',
        'deviceNm',
        'device_nm',
        'deviceCode',
        'device_code',
        'biometricDeviceName',
        'biometric_device_name',
        'deviceDisplayName',
        'device_display_name',
        'readerName',
        'reader_name',
        'machineName',
        'machine_name',
      ])
      if (value && !isLikelyWrongDeviceValue(value)) return value
      const tokenValue = deepFindTextByKeyTokens(
        row,
        ['device', 'reader', 'machine'],
        ['id', 'code', 'type', 'room', 'floor', 'block', 'campus'],
      )
      if (tokenValue && !isLikelyWrongDeviceValue(tokenValue)) return tokenValue
      return ''
    },
  } as ColDef<RoomDetail>,
  biometricId: {
    headerName: 'Biometric ID',
    minWidth: 150,
    flex: 1,
    valueGetter: (p) => {
      const row = (p.data ?? {}) as RoomDetail
      const value = pickTextDeep(row, [
        'serialNumber',
        'serialnumber',
        'serial_number',
        'biometricId',
        'biometric_id',
        'biometricID',
        'bioMetricId',
        'biometricCode',
        'biometric_code',
        'bioMetricCode',
        'biometricNo',
        'biometric_no',
        'bioMetricNo',
        'deviceBiometricId',
        'device_biometric_id',
        'deviceSerialNo',
        'device_serial_no',
        'serialNo',
        'serial_no',
        'sensorId',
        'sensor_id',
      ])
      if (value) return value
      const tokenValue = deepFindTextByKeyTokens(row, ['biometric', 'biometr', 'bio', 'serial'], ['name', 'type'])
      if (tokenValue) return tokenValue
      return deepFindIdLikeText(row)
    },
  } as ColDef<RoomDetail>,
  roomType: {
    headerName: 'Room Type',
    minWidth: 110,
    flex: 0.9,
    valueGetter: (p) => pickText((p.data ?? {}) as RoomDetail, ['environment', 'roomType', 'room_type', 'roomTypeName', 'room_type_name']),
  } as ColDef<RoomDetail>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<RoomDetail>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<RoomDetail>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<RoomDetail>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: RoomDetail | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<RoomDetail>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit room"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function RoomDetailsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomDetail | null>(null)
  const [showResults, setShowResults] = useState(false)

  const [campuses, setCampuses] = useState<Campus[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [floors, setFloors] = useState<Floor[]>([])

  const [campusId, setCampusId] = useState<string | null>(null)
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [blockId, setBlockId] = useState<string | null>(null)
  const [floorId, setFloorId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const [resultRows, setResultRows] = useState<RoomDetail[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  async function loadDetails() {
    setDetailsLoading(true)
    try {
      const rows = await getRoomDeviceDetails({
        campusId: num(campusId ?? 0),
        buildingId: num(buildingId ?? 0),
        blockId: num(blockId ?? 0),
        floorId: num(floorId ?? 0),
        roomId: num(roomId ?? 0),
      })
      setResultRows(rows)
    } catch {
      setResultRows([])
    } finally {
      setDetailsLoading(false)
    }
    setShowResults(true)
  }


  const { data: rooms, invalidate } = useCrudList({
    queryKey: QK.roomDetails.list(),
    queryFn: listRoomDetails,
  })

  useEffect(() => {
    Promise.all([listActiveCampuses(), listActiveBuildingsForRooms()])
      .then(([campusRows, buildingRows]) => {
        setCampuses(campusRows)
        setBuildings(buildingRows)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const id = Number(buildingId ?? 0)
    if (!id) {
      setBlocks([])
      return
    }
    listActiveBlocksByBuilding(id).then(setBlocks).catch(console.error)
  }, [buildingId])

  useEffect(() => {
    const id = Number(blockId ?? 0)
    if (!id) {
      setFloors([])
      return
    }
    listActiveFloorsByBlock(id).then(setFloors).catch(console.error)
  }, [blockId])

  const campusOptions = useMemo(
    () => campuses.map((campus) => ({ value: String(campus.campusId), label: campus.campusName })),
    [campuses],
  )
  const buildingOptions = useMemo(() => {
    const selectedCampusId = Number(campusId ?? 0)
    const filtered = selectedCampusId
      ? buildings.filter((building) => building.campusId === selectedCampusId)
      : buildings
    return filtered.map((building) => ({
      value: String(building.buildingId),
      label: `${building.buildingCode ?? ''} - ${building.buildingName}`.trim(),
    }))
  }, [buildings, campusId])
  const blockOptions = useMemo(
    () => blocks.map((block) => ({ value: String(block.blockId), label: `${block.blockCode ?? ''} - ${block.blockName ?? ''}`.trim() })),
    [blocks],
  )
  const floorOptions = useMemo(
    () => floors.map((floor) => {
      const floorNoText = floor.floorNo ? `(${String(floor.floorNo)})` : ''
      return {
        value: String(floor.floorId),
        label: `${floor.floorName ?? ''} ${floorNoText}`.trim(),
      }
    }),
    [floors],
  )
  const roomOptions = useMemo(() => {
    const selectedBuildingId = Number(buildingId ?? 0)
    const selectedBlockId = Number(blockId ?? 0)
    const selectedFloorId = Number(floorId ?? 0)
    const filtered = rooms.filter((room) => {
      if (selectedBuildingId && pickBuildingId(room) !== selectedBuildingId) return false
      if (selectedBlockId && pickBlockId(room) !== selectedBlockId) return false
      if (selectedFloorId && pickFloorId(room) !== selectedFloorId) return false
      return true
    })
    return filtered.map((room) => ({
      value: String(pickRoomId(room)),
      label: `${room.roomCode} - ${room.roomName}`,
    }))
  }, [rooms, buildingId, blockId, floorId])

  const filteredData = useMemo(() => {
    return resultRows
  }, [resultRows])

  const columnDefs = useMemo<ColDef<RoomDetail>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.campusName,
      COL_DEFS.blockName,
      COL_DEFS.floorName,
      COL_DEFS.roomNumber,
      COL_DEFS.deviceName,
      COL_DEFS.biometricId,
      COL_DEFS.roomType,
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingRoom, setModalOpen) },
    ],
    [setEditingRoom, setModalOpen],
  )

  return (
    <PageContainer className="space-y-4">
      <FilterCard title="Room Details">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-2">
            <Select
              label="Campus"
              value={campusId}
              onChange={(v) => {
                setCampusId(v)
                setBuildingId(null)
                setBlockId(null)
                setFloorId(null)
                setRoomId(null)
              }}
              options={campusOptions}
              placeholder="All"
              searchable
            />
          </div>
          <div className="col-span-12 md:col-span-2">
            <Select
              label="Building"
              value={buildingId}
              onChange={(v) => {
                setBuildingId(v)
                setBlockId(null)
                setFloorId(null)
                setRoomId(null)
              }}
              options={buildingOptions}
              placeholder="All"
              searchable
            />
          </div>
          <div className="col-span-12 md:col-span-2">
            <Select
              label="Block"
              value={blockId}
              onChange={(v) => {
                setBlockId(v)
                setFloorId(null)
                setRoomId(null)
              }}
              options={blockOptions}
              placeholder="All"
              searchable
              disabled={!buildingId}
            />
          </div>
          <div className="col-span-12 md:col-span-2">
            <Select
              label="Floor"
              value={floorId}
              onChange={(v) => {
                setFloorId(v)
                setRoomId(null)
              }}
              options={floorOptions}
              placeholder="All"
              searchable
              disabled={!blockId}
            />
          </div>
          <div className="col-span-12 md:col-span-2">
            <Select
              label="Room"
              value={roomId}
              onChange={setRoomId}
              options={roomOptions}
              placeholder="All"
              searchable
            />
          </div>
          <div className="col-span-12 md:col-span-2 flex items-end">
            <Button
              size="sm"
              onClick={loadDetails}
            >
              Get Details
            </Button>
          </div>
        </div>
      </FilterCard>

      {showResults && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <h2 className="app-card-title">Room Details List</h2>
          </div>
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {!detailsLoading && filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <DoorOpen className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">No room details found</p>
                </div>
              ) : (
                <DataTable
                  rowData={filteredData}
                  columnDefs={columnDefs}
                  loading={detailsLoading}
                  pagination
                  toolbar={{ search: true, searchPlaceholder: 'Search room details…', pdfDocumentTitle: 'Room Details List' }}
                  toolbarTrailing={
                    <Button size="sm" onClick={() => { setEditingRoom(null); setModalOpen(true) }}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add Room Details
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}

      <RoomDetailModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRoom(null) }}
        room={editingRoom}
        initialCampusId={num(campusId ?? 0) || null}
        initialBuildingId={num(buildingId ?? 0) || null}
        initialBlockId={num(blockId ?? 0) || null}
        initialFloorId={num(floorId ?? 0) || null}
        initialRoomId={num(roomId ?? 0) || null}
        roomDeviceRows={resultRows}
        onSaved={() => { invalidate(); void loadDetails() }}
      />
    </PageContainer>
  )
}
