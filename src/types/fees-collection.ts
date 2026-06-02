export type FeeDueNotificationRow = {
  pk_fee_stdduepayment_id?: number
  first_name?: string
  hallticket_number?: string
  structure_name?: string
  group_code?: string
  fee_due_year?: string
  due_amount?: number
  is_sms_sent?: boolean
  [key: string]: unknown
}

export type StudentFeeDueRow = {
  studentId?: number
  hallticketNumber?: string
  rollNumber?: string
  firstName?: string
  courseName?: string
  groupCode?: string
  groupName?: string
  courseYearName?: string
  section?: string
  academicYear?: string
  grossAmount?: number
  discountAmount?: number
  fineAmount?: number
  netAmount?: number
  paidAmount?: number
  balanceAmount?: number
  feeStructureId?: number
  quotaName?: string
  isLateral?: boolean
  structureName?: string
  classGroupName?: string
  [key: string]: unknown
}

export type StudentFeeStructureRow = {
  studentId?: number
  feeStructureId?: number
  classGroupName?: string
  structureName?: string
  grossAmount?: number
  discountAmount?: number
  netAmount?: number
  paidAmount?: number
  balanceAmount?: number
  academicYearId?: number
  academicYear?: string
  courseName?: string
  groupName?: string
  courseYearName?: string
  courseYearNo?: number
  section?: string
  firstName?: string
  feeStudentDataDTO?: { isActive?: boolean }
  isActive?: boolean
  [key: string]: unknown
}

export type FeeStudentParticularRow = {
  feeCategoryId?: number
  feeParticularsId?: number
  feeStructureId?: number
  feeStructureParticularId?: number
  categoryName?: string
  particularsName?: string
  grossAmount?: number
  discountAmount?: number
  scholarshipAmount?: number
  fineAmount?: number
  paidAmount?: number
  balanceAmount?: number
  amount?: number
  isFromStructure?: boolean
  isFromStdwise?: boolean
  [key: string]: unknown
}

export type FeeStudentData = {
  feeStdDataId?: number
  feeStructureId?: number
  firstName?: string
  studentPhotoPath?: string
  studentAcademicYear?: string
  studentGroupCode?: string
  studentCourseYearName?: string
  studentSection?: string
  mobile?: string
  academicYear?: string
  netAmount?: number
  paidAmount?: number
  balanceAmount?: number
  scholarshipHoldAmount?: number
  scholarshipAmount?: number
  feeStudentDataParticulars?: FeeStudentParticularRow[]
  feeStudentWiseParticulars?: FeeStudentParticularRow[]
  feeStudentwiseDiscounts?: unknown[]
  feeStudentwiseFines?: unknown[]
  feeStudentwiseScholorshipDTOS?: unknown[]
  [key: string]: unknown
}

export type FinancialYearRow = {
  financialYearId: number
  financialYear?: string
  [key: string]: unknown
}

export type FeeReceiptPaymentPayload = {
  paymentFor?: string
  fineReason?: string
  receiptDt: string | Date
  amount: number
  paymentTypeId: number
  paymentModeId: number
  transactionNo?: string
  otherPaymentNumber?: string
  referenceNumber?: string
  ddno?: string
  chequeNo?: string
  collegeId: number
  academicYearId: number
  studentId: number
  financialYearId: number
  isFeeRefund: boolean
  receiptAmount: number
  feeStdDataId: number
  revertbByEmployeeId?: number | string
  feeParticularwisePayments: FeeStudentParticularRow[]
  payerTypeId?: number
}

export type StudentFeeSearchRow = {
  studentId: number
  firstName?: string
  hallticketNumber?: string
  rollNumber?: string
  collegeId?: number
  collegeCode?: string
  academicYear?: string
  courseCode?: string
  groupCode?: string
  courseYearName?: string
  mobile?: string
  studentPhotoPath?: string
  section?: string
  quotaDisplayName?: string
  studentStatusCode?: string
  studentStatusDisplayName?: string
  isLateral?: boolean
  [key: string]: unknown
}

export type FeeManagementStdDetailDto = {
  feeParticularsId?: number
  feeCategoryId?: number
  payScheduleId?: number
  grossAmount?: number | string
  paidAmount?: number | null
  courseAmount?: number | null
  dueAmount?: number | null
  instructions?: string | null
  isProcessed?: boolean | null
  enquiryId?: number | null
  feeStdDataParticularsId?: number | null
}

export type FeeManagementStudentRow = StudentFeeSearchRow & {
  fatherName?: string
  studentAppId?: number
  academicYearId?: number
  courseGroupId?: number
  courseYearId?: number
  admissionNumber?: string
  checked?: boolean
  feeManagmentStdDetailsDtos?: FeeManagementStdDetailDto[]
}

export type FeeManagementSavePayload = {
  allotementDate: string
  feeParticularsId?: number
  feeCategoryId?: number
  payScheduleId?: number
  employeeId: number
  studentId: number
  studentName?: string
  mobileNo?: string
  fatherName?: string
  collegeId?: number
  academicYearId?: number
  courseGroupId?: number
  courseYearId?: number
  isActive: boolean
  grossAmount?: number | null
  paidAmount?: number | null
  courseAmount?: number | null
  dueAmount?: number | null
  instructions?: string | null
  isProcessed?: boolean | null
  enquiryId?: number | null
  studentAppId?: number | null
  feeStdDataParticularsId?: number | null
}

export type FeeReceiptRow = {
  feeReceiptsId?: number
  studentId?: number
  academicYear?: string
  classGroupName?: string
  structureName?: string
  feeReceiptsId_display?: string
  createdDt?: string
  paymentFor?: string
  referenceNumber?: string
  receiptAmount?: number
  paymentReceiptsNo?: string
  studentName?: string
  updatedUser?: string
  [key: string]: unknown
}

export type FeeStudentWiseDiscountPayload = {
  feeCategoryId: number
  feeParticularsId?: number
  value: number
  isActive: boolean
  authComments: string
  requestedEmployeeId: number
  authorizedEmployeeId: number
  collegeId: number
  studentId: number
  feeStructureId: number
  feeStdDataId: number
}

export type FeeConcessionRow = {
  studentRollNo?: string
  studentFirstName?: string
  quotaName?: string
  course?: string
  requestedEmployeeFirstName?: string
  categoryName?: string
  value?: number
  [key: string]: unknown
}

export type EmployeeSearchRow = {
  employeeId: number
  firstName?: string
  empNumber?: string
  photoPath?: string
  collegeCode?: string
  empDeptName?: string
  designation?: string
  empStatus?: string
  empState?: string
  [key: string]: unknown
}

export type EmployeeProfileRow = {
  employeeId?: number
  firstName?: string
  empNumber?: string
  collegeCode?: string
  deptName?: string
  mobile?: string
  photoPath?: string
  collegeId?: number
  [key: string]: unknown
}

export type TransportAllocationRow = {
  transportAllocationId?: number
  employeeId?: number
  feeStructureId?: number
  classGroupName?: string
  structureName?: string
  grossAmount?: number
  discountAmount?: number
  netAmount?: number
  paidAmount?: number
  balanceAmount?: number
  academicYearId?: number
  academicYear?: string
  routePickupPlace?: string
  routeDropPlace?: string
  routeCode?: string
  pickupRouteStopName?: string
  dropRoutestopName?: string
  pickTime?: string
  dropTime?: string
  [key: string]: unknown
}
