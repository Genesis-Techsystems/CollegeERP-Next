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
  organizationId?: number
  hstlRoomAllotId?: number
  studentId?: number
  employeeId?: number
  stdFirstName?: string
  empFirstName?: string
  attendeesName?: string
  relationCatdetId?: number
  relationCatdetDisplayName?: string
  inDate?: string
  outDate?: string
  inTime?: string
  outTime?: string
  inTiming?: string
  outTiming?: string
  mobileNumber?: string
  isActive: boolean
  reason?: string
}

/** Search result row from `roomAllocationSearch` (hostel register / visitor modals). */
export interface HostelRoomAllocationSearchRow {
  hstlRoomAllotId: number
  studentId?: number
  employeeId?: number
  stdFirstName?: string
  empFirstName?: string
  rollNumber?: string
  empNumber?: string
}

export interface HostelVisitor {
  hstlVisitorId: number
  hostelId?: number
  organizationId?: number
  studentId?: number
  employeeId?: number
  stdFirstName?: string
  empFirstName?: string
  visitorName?: string
  relationCatdetId?: number
  relationCatdetDisplayName?: string
  inDate?: string
  outDate?: string
  inTime?: string
  outTime?: string
  inTiming?: string
  outTiming?: string
  mobileNumber?: string
  isActive: boolean
  reason?: string
  otherRelation?: string
  purpose?: string
}

export interface HostelRoomAllocationRow {
  hstlRoomAllotId?: number
  hostelId?: number
  hstlRoomId?: number
  studentId?: number
  employeeId?: number
  firstName?: string
  rollNumber?: string
  hallticketNumber?: string
  parentName?: string
  fatherName?: string
  paymentDueDate?: string
  isAmountSetteled?: boolean
  orgCode?: string
  orgName?: string
  organizationName?: string
  studentPhotoPath?: string
  [key: string]: unknown
}
