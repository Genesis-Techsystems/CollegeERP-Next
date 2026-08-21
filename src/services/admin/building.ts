import { ENTITIES } from "@/config/constants/entities";
import type { Building } from "@/types/building";
import {
  angularLowerActiveReason,
  asNullableNumber,
  asNullableString,
  asString,
} from "../angular-payload";
import {
  buildQuery,
  domainCreateResult,
  domainList,
  domainUpdateResult,
} from "../crud";

type BuildingWriteInput = Partial<Omit<Building, "buildingId">> &
  Record<string, unknown>;

function buildAngularBuildingPayload(
  data: BuildingWriteInput,
  buildingId?: number,
  existing?: Building,
): Record<string, unknown> {
  const isActive = data.isActive !== false;

  const payload: Record<string, unknown> = {
    campusId: data.campusId ?? existing?.campusId,
    buildingName: asString(data.buildingName),
    buildingCode: asString(data.buildingCode),
    landmark: asNullableString(data.landMark ?? data.landmark),
    noOfFloors: asNullableNumber(data.noOfFloors),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  };

  if (buildingId != null) {
    payload.buildingId = buildingId;
  }

  return payload;
}

function normalizeBuilding(row: Building): Building {
  const landmark = row.landMark ?? row.landmark ?? undefined;
  return {
    ...row,
    landMark: landmark ?? undefined,
    landmark: landmark ?? null,
  };
}

export async function listBuildings(): Promise<Building[]> {
  const rows = await domainList<Building>(
    ENTITIES.BUILDING.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
  return rows.map(normalizeBuilding);
}

export async function listActiveBuildings(): Promise<Building[]> {
  const rows = await domainList<Building>(
    ENTITIES.BUILDING.name,
    buildQuery({ isActive: true }),
  );
  return rows.map(normalizeBuilding);
}

export async function createBuilding(
  data: Omit<Building, "buildingId">,
): Promise<{ data: Building; message: string }> {
  const payload = buildAngularBuildingPayload(data);
  const result = await domainCreateResult<Building>(
    ENTITIES.BUILDING.name,
    payload,
  );
  return {
    data: normalizeBuilding(result.data ?? ({} as Building)),
    message: result.message,
  };
}

export async function updateBuilding(
  buildingId: number,
  data: Partial<Omit<Building, "buildingId">>,
  existing?: Building,
): Promise<{ data: Building; message: string }> {
  const payload = buildAngularBuildingPayload(data, buildingId, existing);
  const result = await domainUpdateResult<Building>(
    ENTITIES.BUILDING.name,
    ENTITIES.BUILDING.pk,
    buildingId,
    payload,
  );
  return {
    data: normalizeBuilding(result.data ?? ({} as Building)),
    message: result.message,
  };
}
