export interface Block {
  blockId: number
  campusId: number
  buildingId: number
  buildingName?: string
  buildingCode?: string
  blockName: string
  blockCode: string
  noOfFloors?: number
  isActive: boolean
  reason?: string
}
