import { ENTITIES } from "@/config/constants/entities";
import type { Block } from "@/types/block";
import type { Room } from "@/types/room";
import type { RoomType } from "@/types/room-type";
import {
  angularLowerActiveReason,
  asNullableNumber,
  asString,
} from "../angular-payload";
import {
  buildQuery,
  domainCreateResult,
  domainList,
  domainUpdateResult,
} from "../crud";

type RoomWriteInput = Partial<Omit<Room, "roomId">> & Record<string, unknown>;

function buildAngularRoomPayload(
  data: RoomWriteInput,
  roomId?: number,
  existing?: Room,
): Record<string, unknown> {
  const isActive = data.isActive !== false;

  const payload: Record<string, unknown> = {
    blockId: data.blockId ?? existing?.blockId,
    floorId: data.floorId ?? existing?.floorId,
    roomTypeId: data.roomTypeId ?? existing?.roomTypeId,
    roomName: asString(data.roomName),
    roomCode: asString(data.roomCode),
    occupancy: data.occupancy ?? existing?.occupancy ?? 0,
    examrows: asNullableNumber(data.examrows),
    examcolumns: asNullableNumber(data.examcolumns),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  };

  if (roomId != null) {
    payload.roomId = roomId;
  }

  return payload;
}

export async function listRooms(): Promise<Room[]> {
  return domainList<Room>(
    ENTITIES.ROOM.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createRoom(
  data: Omit<Room, "roomId">,
): Promise<{ data: Room; message: string }> {
  const payload = buildAngularRoomPayload(data);
  return domainCreateResult<Room>(ENTITIES.ROOM.name, payload);
}

export async function updateRoom(
  roomId: number,
  data: Partial<Omit<Room, "roomId">>,
  existing?: Room,
): Promise<{ data: Room; message: string }> {
  const payload = buildAngularRoomPayload(data, roomId, existing);
  return domainUpdateResult<Room>(
    ENTITIES.ROOM.name,
    ENTITIES.ROOM.pk,
    roomId,
    payload,
  );
}

export async function listActiveBlocksForRooms(): Promise<Block[]> {
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ isActive: true }, { field: "createdDt", direction: "DESC" }),
  );
}

export async function listActiveRoomTypes(): Promise<RoomType[]> {
  return domainList<RoomType>(
    ENTITIES.ROOM_TYPE.name,
    buildQuery({ isActive: true }, { field: "createdDt", direction: "DESC" }),
  );
}
