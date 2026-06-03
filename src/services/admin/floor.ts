import { ENTITIES } from '@/config/constants/entities'
import type { Block } from '@/types/block'
import type { Floor } from '@/types/floor'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listFloors(): Promise<Floor[]> {
  return domainList<Floor>(
    ENTITIES.FLOOR.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createFloor(data: Omit<Floor, 'floorId'>): Promise<Floor> {
  return domainCreate<Floor>(ENTITIES.FLOOR.name, data)
}

export async function updateFloor(
  floorId: number,
  data: Partial<Omit<Floor, 'floorId'>>,
): Promise<Floor> {
  return domainUpdate<Floor>(ENTITIES.FLOOR.name, ENTITIES.FLOOR.pk, floorId, {
    floorId,
    ...data,
  })
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
