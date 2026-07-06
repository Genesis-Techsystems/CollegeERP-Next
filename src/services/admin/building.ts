import { ENTITIES } from '@/config/constants/entities'
import type { Building } from '@/types/building'
import {
  angularLowerActiveReason,
  asNullableNumber,
  asNullableString,
  asString,
} from '../angular-payload'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type BuildingWriteInput = Partial<Omit<Building, 'buildingId'>> & Record<string, unknown>

function buildAngularBuildingPayload(
  data: BuildingWriteInput,
  buildingId?: number,
  existing?: Building,
): Record<string, unknown> {
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    campusId: data.campusId ?? existing?.campusId,
    buildingName: asString(data.buildingName),
    buildingCode: asString(data.buildingCode),
    landmark: asNullableString(data.landMark ?? data.landmark),
    noOfFloors: asNullableNumber(data.noOfFloors),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  }

  if (buildingId != null) {
    payload.buildingId = buildingId
  }

  return payload
}

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
  const payload = buildAngularBuildingPayload(data)
  return domainCreate<Building>(ENTITIES.BUILDING.name, payload)
}

export async function updateBuilding(
  buildingId: number,
  data: Partial<Omit<Building, 'buildingId'>>,
  existing?: Building,
): Promise<Building> {
  const payload = buildAngularBuildingPayload(data, buildingId, existing)
  return domainUpdate<Building>(ENTITIES.BUILDING.name, ENTITIES.BUILDING.pk, buildingId, payload)
}
