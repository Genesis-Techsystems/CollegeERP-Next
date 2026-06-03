import { ENTITIES } from '@/config/constants/entities'
import type { RoomType } from '@/types/room-type'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listRoomTypes(): Promise<RoomType[]> {
  return domainList<RoomType>(
    ENTITIES.ROOM_TYPE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createRoomType(data: Omit<RoomType, 'roomTypeId'>): Promise<RoomType> {
  return domainCreate<RoomType>(ENTITIES.ROOM_TYPE.name, data)
}

export async function updateRoomType(
  roomTypeId: number,
  data: Partial<Omit<RoomType, 'roomTypeId'>>,
): Promise<RoomType> {
  return domainUpdate<RoomType>(ENTITIES.ROOM_TYPE.name, ENTITIES.ROOM_TYPE.pk, roomTypeId, {
    roomTypeId,
    ...data,
  })
}
