export interface Room {
  roomId: number
  blockId: number
  floorId: number
  roomTypeId: number
  blockName?: string
  floorName?: string
  roomType?: string
  roomName: string
  roomCode: string
  occupancy: number
  examrows?: number
  examcolumns?: number
  isActive: boolean
  reason?: string
}
