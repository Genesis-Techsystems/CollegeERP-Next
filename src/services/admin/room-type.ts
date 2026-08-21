import { ENTITIES } from "@/config/constants/entities";
import type { RoomType } from "@/types/room-type";
import { angularLowerActiveReason, asString } from "../angular-payload";
import {
  buildQuery,
  domainCreateResult,
  domainList,
  domainUpdateResult,
} from "../crud";

type RoomTypeWriteInput = Partial<Omit<RoomType, "roomTypeId">> &
  Record<string, unknown>;

function buildAngularRoomTypePayload(
  data: RoomTypeWriteInput,
  roomTypeId?: number,
  existing?: RoomType,
): Record<string, unknown> {
  const isActive = data.isActive !== false;

  const payload: Record<string, unknown> = {
    organizationId: data.organizationId ?? existing?.organizationId,
    roomType: asString(data.roomType),
    isActive,
    reason: angularLowerActiveReason(isActive, data.reason, existing?.reason),
  };

  if (roomTypeId != null) {
    payload.roomTypeId = roomTypeId;
  }

  return payload;
}

export async function listRoomTypes(): Promise<RoomType[]> {
  return domainList<RoomType>(
    ENTITIES.ROOM_TYPE.name,
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

export async function createRoomType(
  data: Omit<RoomType, "roomTypeId">,
): Promise<{ data: RoomType; message: string }> {
  const payload = buildAngularRoomTypePayload(data);
  return domainCreateResult<RoomType>(ENTITIES.ROOM_TYPE.name, payload);
}

export async function updateRoomType(
  roomTypeId: number,
  data: Partial<Omit<RoomType, "roomTypeId">>,
  existing?: RoomType,
): Promise<{ data: RoomType; message: string }> {
  const payload = buildAngularRoomTypePayload(data, roomTypeId, existing);
  return domainUpdateResult<RoomType>(
    ENTITIES.ROOM_TYPE.name,
    ENTITIES.ROOM_TYPE.pk,
    roomTypeId,
    payload,
  );
}
