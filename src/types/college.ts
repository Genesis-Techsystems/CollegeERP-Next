export interface College {
  collegeId: number
  organizationId: number
  universityId: number
  campusId: number
  countryId?: number | null
  stateId?: number | null
  districtId: number
  cityId: number
  orgCode?: string
  universityCode?: string
  campusCode?: string
  collegeName: string
  collegeShortName?: string
  collegeCode: string
  affiliatedTo: number
  printPrefix?: string
  address: string
  mandal: string
  pincode: string
  sortOrder: number
  collegeType?: number | null
  approvedBy?: string
  mobileNumber?: string
  landlineNumber?: string
  fax?: string
  email?: string
  facebookUrl?: string
  googleUrl?: string
  linkedinUrl?: string
  logo?: string
  isUniversity?: boolean
  isActive: boolean
  reason?: string
}
