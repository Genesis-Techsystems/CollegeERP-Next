import { ENTITIES } from '@/config/constants/entities'
import type { Building } from '@/types/building'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listBuildings(): Promise<Building[]> {
  return domainList<Building>(
    ENTITIES.BUILDING.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveBuildings(): Promise<Building[]> {
  return domainList<Building>(ENTITIES.BUILDING.name, buildQuery({ isActive: true }))
}

export async function createBuilding(data: Omit<Building, 'buildingId'>): Promise<Building> {
  return domainCreate<Building>(ENTITIES.BUILDING.name, data)
}

export async function updateBuilding(
  buildingId: number,
  data: Partial<Omit<Building, 'buildingId'>>,
): Promise<Building> {
  return domainUpdate<Building>(ENTITIES.BUILDING.name, ENTITIES.BUILDING.pk, buildingId, data)
}
