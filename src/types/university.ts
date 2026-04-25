export interface University {
  universityId: number
  universityName: string
  universityShortName?: string
  universityCode: string
  printPrefix?: string
  address: string
  mandal: string
  pinCode: string
  mobileNumber?: string
  landlineNumber?: string
  fax?: string
  email?: string
  facebookUrl?: string
  googleUrl?: string
  linkedinUrl?: string
  countryId?: number | null
  stateId?: number | null
  districtId: number
  cityId: number
  districtName?: string
  cityName?: string
  stateName?: string
  countryName?: string
  logoFileName?: string
  reportLine1?: string
  reportLine2?: string
  reportLine3?: string
  isActive: boolean
  reason?: string
}
