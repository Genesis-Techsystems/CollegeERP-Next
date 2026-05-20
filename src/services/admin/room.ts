import { ENTITIES } from '@/config/constants/entities'
import type { Block } from '@/types/block'
import type { Room } from '@/types/room'
import type { RoomType } from '@/types/room-type'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listRooms(): Promise<Room[]> {
  return domainList<Room>(
    ENTITIES.ROOM.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createRoom(data: Omit<Room, 'roomId'>): Promise<Room> {
  return domainCreate<Room>(ENTITIES.ROOM.name, data)
}

export async function updateRoom(
  roomId: number,
  data: Partial<Omit<Room, 'roomId'>>,
): Promise<Room> {
  return domainUpdate<Room>(ENTITIES.ROOM.name, ENTITIES.ROOM.pk, roomId, {
    roomId,
    ...data,
  })
}

export async function listActiveBlocksForRooms(): Promise<Block[]> {
  return domainList<Block>(
    ENTITIES.BLOCK.name,
    buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveRoomTypes(): Promise<RoomType[]> {
  return domainList<RoomType>(
    ENTITIES.ROOM_TYPE.name,
    buildQuery({ isActive: true }, { field: 'createdDt', direction: 'DESC' }),
  )
}
