import { ENTITIES } from '@/config/constants/entities'
import type { Block } from '@/types/block'
import {
  angularLowerActiveReason,
  asNullableNumber,
  asString,
} from '../angular-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type BlockWriteInput = Partial<Omit<Block, 'blockId'>> & Record<string, unknown>

function buildAngularBlockPayload(
  data: BlockWriteInput,
  blockId?: number,
  existing?: Block,
): Record<string, unknown> {
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    buildingId: data.buildingId ?? existing?.buildingId,
    blockName: asString(data.blockName),
    blockCode: asString(data.blockCode),
    noOfFloors: asNullableNumber(data.noOfFloors),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  }

  if (blockId != null) {
    payload.blockId = blockId
  }

  return payload
}

export async function listBlocks(): Promise<Block[]> {
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createBlock(data: Omit<Block, 'blockId'>): Promise<Block> {
  const payload = buildAngularBlockPayload(data)
  return domainCreate<Block>(ENTITIES.BLOCK.name, payload)
}

export async function updateBlock(
  blockId: number,
  data: Partial<Omit<Block, 'blockId'>>,
  existing?: Block,
): Promise<Block> {
  const payload = buildAngularBlockPayload(data, blockId, existing)
  return domainUpdate<Block>(ENTITIES.BLOCK.name, ENTITIES.BLOCK.pk, blockId, payload)
}

export async function listBlocksByBuilding(buildingId: number): Promise<Block[]> {
  if (!buildingId) return []
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ 'Building.buildingId': buildingId, isActive: true }),
  )
}
