import { ROOM_DETAILS_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type { Block } from "@/types/block";
import type { Building } from "@/types/building";
import type { RoomDetail } from "@/types/room-detail";
import {
  buildQuery,
  domainList,
  domainListRawQuery,
  getAllRecords,
  postDetails,
  putDetails,
} from "../crud";

type Floor = {
  floorId: number;
  floorName?: string;
  floorNo?: number;
};

type AnyRow = Record<string, unknown>;

function flattenProcRows(
  payload: Record<string, unknown> | undefined,
): AnyRow[] {
  if (!payload) return [];
  const groups = [
    payload.result,
    (payload.result as Record<string, unknown> | undefined)?.result,
    (payload.result as Record<string, unknown> | undefined)?.rows,
    (payload.result as Record<string, unknown> | undefined)?.data,
    payload.rows,
    payload.data,
  ];
  const out: AnyRow[] = [];
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (Array.isArray(item)) {
        for (const row of item)
          if (row && typeof row === "object") out.push(row as AnyRow);
      } else if (item && typeof item === "object") {
        out.push(item as AnyRow);
      }
    }
    if (out.length > 0) break;
  }
  return out;
}

function isNoRecordsProcError(error: unknown): boolean {
  const msg = String((error as Error)?.message ?? "").toLowerCase();
  return msg.includes("no record");
}

export async function listRoomDetails(): Promise<RoomDetail[]> {
  // Angular listAllDetails(Room) → query=order(createdDt=desc)&size=99999 (lowercase desc)
  return domainListRawQuery<RoomDetail>(
    ENTITIES.ROOM.name,
    "order(createdDt=desc)",
    true,
  );
}

export async function getRoomDeviceDetails(filters: {
  campusId: number;
  buildingId: number;
  blockId: number;
  floorId: number;
  roomId: number;
}): Promise<RoomDetail[]> {
  try {
    const payload = await getAllRecords<Record<string, unknown>>(
      ROOM_DETAILS_API.GET_ROOM_DEVICE_DETAILS,
      {
        in_campus_id: filters.campusId,
        in_building_id: filters.buildingId,
        in_block_id: filters.blockId,
        in_floor_id: filters.floorId,
        in_room_id: filters.roomId,
      },
    );
    return flattenProcRows(payload) as unknown as RoomDetail[];
  } catch (error) {
    // Stored proc returns success:false when no rows match — valid empty state.
    if (isNoRecordsProcError(error)) return [];
    throw error;
  }
}

export type RoomDevicePayload = {
  roomId: number;
  ettlDeviceId: number;
  isActive: boolean;
};

export async function addRoomDetailsList(
  payload: RoomDevicePayload[],
): Promise<void> {
  await postDetails(ROOM_DETAILS_API.ADD_ROOM_DETAILS_LIST, payload);
}

export async function updateRoomDetails(payload: {
  roomDetailId: number;
  roomId: number;
  ettlDeviceId: number;
  isActive: boolean;
}): Promise<void> {
  await putDetails(ROOM_DETAILS_API.UPDATE_ROOM_DETAILS, payload);
}

export async function listActiveBuildingsForRooms(): Promise<Building[]> {
  return domainList<Building>(
    ENTITIES.BUILDING.name,
    buildQuery({ isActive: true }),
  );
}

export async function listActiveBlocksByBuilding(
  buildingId: number,
): Promise<Block[]> {
  if (!buildingId) return [];
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ "Building.buildingId": buildingId, isActive: true }),
  );
}

export async function listActiveFloorsByBlock(
  blockId: number,
): Promise<Floor[]> {
  if (!blockId) return [];
  return domainList<Floor>(
    ENTITIES.FLOOR.name,
    buildQuery({ "Block.blockId": blockId, isActive: true }),
  );
}

export type EttlDevice = {
  ettlDeviceId: number;
  deviceFName?: string;
  devicesName?: string;
  serialNumber?: string;
  environment?: string;
  isActive?: boolean;
};

export async function listActiveEttlDevices(): Promise<EttlDevice[]> {
  try {
    return await domainList<EttlDevice>(
      ROOM_DETAILS_API.ETTL_DEVICES,
      buildQuery({ isActive: true }),
    );
  } catch {
    // Some deployments don't support isActive filter on EttlDevices.
    return domainList<EttlDevice>(ROOM_DETAILS_API.ETTL_DEVICES);
  }
}
