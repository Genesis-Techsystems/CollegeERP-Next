/** Hostel module — mirrors Angular `apps/hostel/`. */

export interface HostelType {
  hostelTypeId: number
  organizationId: number
  hostelTypeCode: string
  hostelTypeName: string
  orgCode?: string
  orgName?: string
  isActive: boolean
  reason?: string
}

export interface HostelDetail {
  hostelId: number
  organizationId: number
  hostelTypeId: number
  hostelCode: string
  hostelName: string
  noOfFloors?: number
  phoneNumber?: string
  hstlForCatdetId?: number
  hstlForCatdetCode?: string
  hostelTypeCode?: string
  orgCode?: string
  hostelAddress?: string
  otherInfo?: string
  isActive: boolean
  reason?: string
}

export interface HostelRoomCharge {
  hstlRoomChargesId: number
  organizationId?: number
  hostelId: number
  roomTypeCatdetId?: number
  roomTypeCatdetCode?: string
  paymentFrequencyCatdetId?: number
  paymentFrequencyCatdetCode?: string
  hostelCode?: string
  fromDate?: string
  toDate?: string
  isActive: boolean
  reason?: string
}

export interface HostelRoom {
  hstlRoomId: number
  hostelId?: number
  floorName?: string
  floorNo?: number | string
  roomNumber?: string
  roomTypeId?: number
  roomTypeCode?: string
  noOfBeds?: number
  allotedBeds?: number
  availableBeds?: number
  amount?: number
  isActive: boolean
}

export interface HostelDiscount {
  hstlDiscountId: number
  organizationId?: number
  hostelId?: number
  hstlDiscountName?: string
  discountType?: string
  discountValue?: number
  hostelCode?: string
  validFrom?: string
  validTo?: string
  isActive: boolean
  reason?: string
}

export interface HostelRegister {
  hstlRegisterId: number
  hostelId?: number
  stdFirstName?: string
  attendeesName?: string
  relationCatdetDisplayName?: string
  inTiming?: string
  outTiming?: string
  mobileNumber?: string
  isActive: boolean
}

export interface HostelVisitor {
  hstlVisitorId: number
  hostelId?: number
  stdFirstName?: string
  visitorName?: string
  relationCatdetDisplayName?: string
  inTiming?: string
  outTiming?: string
  mobileNumber?: string
  isActive: boolean
}

export interface HostelRoomAllocationRow {
  hstlRoomAllotId?: number
  studentId?: number
  firstName?: string
  rollNumber?: string
  studentPhotoPath?: string
  [key: string]: unknown
}
