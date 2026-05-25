import { ENTITIES } from '@/config/constants/entities'
import type { Block } from '@/types/block'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listBlocks(): Promise<Block[]> {
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createBlock(data: Omit<Block, 'blockId'>): Promise<Block> {
  return domainCreate<Block>(ENTITIES.BLOCK.name, data)
}

export async function updateBlock(
  blockId: number,
  data: Partial<Omit<Block, 'blockId'>>,
): Promise<Block> {
  return domainUpdate<Block>(ENTITIES.BLOCK.name, ENTITIES.BLOCK.pk, blockId, data)
}

export async function listBlocksByBuilding(buildingId: number): Promise<Block[]> {
  if (!buildingId) return []
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ 'Building.buildingId': buildingId, isActive: true }),
  )
}
