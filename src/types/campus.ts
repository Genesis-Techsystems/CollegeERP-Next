export interface Campus {
  campusId: number
  organizationId: number
  organizationName: string
  orgCode: string
  campusName: string
  campusCode: string
  districtId: number
  isActive: boolean
  districtName: string
  stateId: number | null
  countryId: number | null
  stateName: string
  countryName: string
  reason?: string
}
