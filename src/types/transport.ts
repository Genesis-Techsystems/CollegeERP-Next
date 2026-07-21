/** Transport module types — mirrors Angular models under `main/models/`. */

export interface TransportDetail {
  transportDetailId?: number
  organizationId?: number
  orgName?: string
  orgCode?: string
  transportName?: string
  campusId?: number
  campusName?: string
  campusCode?: string
  collegeId?: number
  collegeName?: string
  collegeCode?: string
  isActive?: boolean
  reason?: string
}

export type TransportDetailPayload = Pick<
  TransportDetail,
  'organizationId' | 'campusId' | 'collegeId' | 'transportName' | 'isActive' | 'reason'
>

export interface VehicleDetail {
  vehicleDetailId?: number
  organizationId?: number
  orgName?: string
  orgCode?: string
  transportDetailId?: number
  transportName?: string
  vehicleName?: string
  vehicleNumber?: string
  vehicleModel?: string
  vehicleMaker?: string
  generalDetailId?: number
  trackId?: string
  speedometerReading?: number
  roadTaxAmount?: number
  registrationDate?: string
  registrationAuthority?: string
  rcNumber?: string
  pollutionCheckRenewalDate?: string
  noOfSeats?: number
  nextServiceDate?: string
  maximumAllowed?: number
  insuranceRenewalDate?: string
  insuranceProvider?: string
  engineNo?: string
  currentAddress?: string
  contactPersonName?: string
  chasisNo?: string
  availableSeats?: number
  yearOfManufacture?: string
  isActive?: boolean
  reason?: string
}

export interface Driver {
  driverId?: number
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  driverName?: string
  mobileNumber?: string
  phone?: string
  emailId?: string
  licenseNumber?: string
  licenseValidUpto?: string
  dateOfBirth?: string
  dateOfJoining?: string
  experience?: string
  presentAddress?: string
  permanentAddress?: string
  photoPath?: string
  drivingLicencePath?: string
  genderId?: number
  bloodgroupId?: number
  maritalStatusId?: number
  isActive?: boolean
  reason?: string
}

export interface Helper {
  helperId?: number
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  helperName?: string
  mobileNumber?: string
  phone?: string
  emailId?: string
  dateOfBirth?: string
  dateOfJoining?: string
  experience?: string
  presentAddress?: string
  permanentAddress?: string
  photoPath?: string
  genderId?: number
  bloodgroupId?: number
  maritalStatusId?: number
  isActive?: boolean
  reason?: string
}

export interface TransportRoute {
  routeId?: number
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  serviceNumber?: string
  routeCode?: string
  routePickupPlace?: string
  routeDropPlace?: string
  routeStops?: RouteStop[]
  isActive?: boolean
  reason?: string
}

export interface RouteStop {
  routeStopId?: number
  routeId?: number
  routeCode?: string
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  stopName?: string
  distanceFromSchoolKm?: number
  distanceFeeId?: number
  pickTime?: string
  dropTime?: string
  amount?: number
  feeFrequencyId?: number
  feeFrequencyCode?: string
  feeFrequencyDisplayName?: string
  isActive?: boolean
  reason?: string
}

export interface VehicleDriver {
  vehicleDriverId?: number
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  vehicleDetailId?: number
  vehicleName?: string
  driverId?: number
  driverName?: string
  helperId?: number
  helperName?: string
  isActive?: boolean
  reason?: string
}

export interface VehicleRoute {
  vechicleRouteId?: number
  organizationId?: number
  orgCode?: string
  orgName?: string
  transportDetailId?: number
  routeId?: number
  routeCode?: string
  vehicleDetailId?: number
  vehicleName?: string
  driverId?: number
  driverName?: string
  helperId?: number
  helperName?: string
  serviceNumber?: string
  fromDate?: string
  toDate?: string
  status?: string
  isActive?: boolean
  reason?: string
}

export interface DistanceFee {
  distanceFeeId?: number
  organizationId?: number
  orgName?: string
  transportDetailId?: number
  transportName?: string
  fromKm?: number
  toKm?: number
  amount?: number
  fromDate?: string
  toDate?: string
  feeFrequencyId?: number
  feeFrequencyDisplayName?: string
  isActive?: boolean
  reason?: string
}

export interface TransportAllocation {
  transportAllocationId?: number
  allocationFor?: string
  organizationId?: number
  orgName?: string
  studentId?: number
  firstName?: string
  stdFirstName?: string
  rollNumber?: string
  employeeId?: number
  empNumber?: string
  transportDetailId?: number
  routeId?: number
  routeCode?: string
  pickupRouteStopId?: number
  pickupRouteStopName?: string
  dropRouteStopId?: number
  dropRoutestopName?: string
  fromDate?: string
  toDate?: string
  academicYear?: string
  isActive?: boolean
  reason?: string
}

export type TransportAllocationFor = 'S' | 'E'
