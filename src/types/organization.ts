// ─── Geo hierarchy ────────────────────────────────────────────────────────────

export interface Country {
  countryId: number
  countryName: string
}

export interface State {
  stateId: number
  stateName: string
  countryId: number
}

export interface District {
  districtId: number
  districtName: string
  stateId: number
}

export interface City {
  cityId: number
  cityName: string
  districtId: number
}

// ─── Organization ─────────────────────────────────────────────────────────────

export interface Organization {
  organizationId: number
  orgName: string
  orgCode: string
  districtId: number
  districtName: string
  stateId: number | null
  countryId: number | null
  stateName: string
  countryName: string
  cityName: string
  cityId: number | null
  isActive: boolean
  address: string
  pincode: string
  mandal: string
  logoPath?: string
  logoFilename?: string
  landlineNumber?: string
  mobileNumber: string
  fax?: string
  email: string
  facebookUrl?: string
  googleUrl?: string
  linkedinUrl?: string
  licenseFdate?: string
  licenseTdate?: string
  noIssuedLicenses?: number
  url?: string
  reason?: string
}
