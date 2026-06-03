export interface Building {
  buildingId: number
  organizationId: number
  orgCode?: string
  organizationName?: string
  campusId: number
  campusName?: string
  buildingName: string
  buildingCode: string
  landMark?: string
  noOfFloors?: number
  isActive: boolean
  reason?: string
}
