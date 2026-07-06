import { ENTITIES } from '@/config/constants/entities'
import type { Block } from '@/types/block'
import type { Floor } from '@/types/floor'
import {
  angularLowerActiveReason,
  asNullableNumber,
  asString,
} from '../angular-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type FloorWriteInput = Partial<Omit<Floor, 'floorId'>> & Record<string, unknown>

function buildAngularFloorPayload(
  data: FloorWriteInput,
  floorId?: number,
  existing?: Floor,
): Record<string, unknown> {
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    blockId: data.blockId ?? existing?.blockId,
    floorName: asString(data.floorName),
    floorNo: data.floorNo ?? existing?.floorNo,
    noOfRooms: asNullableNumber(data.noOfRooms),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  }

  if (floorId != null) {
    payload.floorId = floorId
  }

  return payload
}

export async function listFloors(): Promise<Floor[]> {
  return domainList<Floor>(
    ENTITIES.FLOOR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createFloor(data: Omit<Floor, 'floorId'>): Promise<Floor> {
  const payload = buildAngularFloorPayload(data)
  return domainCreate<Floor>(ENTITIES.FLOOR.name, payload)
}

export async function updateFloor(
  floorId: number,
  data: Partial<Omit<Floor, 'floorId'>>,
  existing?: Floor,
): Promise<Floor> {
  const payload = buildAngularFloorPayload(data, floorId, existing)
  return domainUpdate<Floor>(ENTITIES.FLOOR.name, ENTITIES.FLOOR.pk, floorId, payload)
}

export async function listActiveBlocksForFloors(): Promise<Block[]> {
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listFloorsByBlock(blockId: number): Promise<Floor[]> {
  if (!blockId) return []
  return domainList<Floor>(
    ENTITIES.FLOOR.name,
    buildQuery({ 'Block.blockId': blockId, isActive: true }),
  )
}
