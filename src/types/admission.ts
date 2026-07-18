/** University student application workflow status (GeneralDetail IDs — Angular CONSTANTS). */
export const UNIV_APP_STATUS = {
  SUBMITTED: 694,
  APPROVED: 695,
  REJECTED: 696,
} as const

export type StudentApplicationFormRow = {
  studentAppId?: number
  applicationNumber?: string
  admissionNumber?: string
  firstName?: string
  adminssionDate?: string
  courseName?: string
  genderName?: string
  mobile?: string
  currentWorkflowStatusName?: string
  studentPhotoPath?: string
  collegeId?: number
  courseId?: number
  academicYearId?: number
  isActive?: boolean
}

export type StudentEnquiryRow = {
  enquiryId?: number
  studentName?: string
  parentname?: string
  enquiryDate?: string
  returnDate?: string
  sourceofenquiry?: string
  counseledBy?: string
  remarks?: string
  mobileNumber?: string
  mobileNumber1?: string
  enquirystatusName?: string
  modeofenquiryId?: number
  knowaboutusId?: number
  organizationId?: number
  collegeId?: number
  courseId?: number
  countryId?: number
  stateId?: number
  districtId?: number
  resultstatus?: string
  enquirystatusId?: number
  qualificationId?: number
  qualificationGroupId?: number
  genderId?: number
  percentage?: number
  emcetrank?: number
  parentmobile?: string
  emailid?: string
  orgName?: string
  collegeName?: string
  courseName?: string
  isActive?: boolean
  createdDt?: string
  updatedDt?: string
}

export type StudentEnquiryPayload = {
  enquiryId?: number
  mobileNumber: string
  modeofenquiryId: number
  organizationId: number
  collegeId: number
  courseId: number
  studentName: string
  enquiryDate?: string | null
  knowaboutusId?: number | null
  sourceofenquiry?: string | null
  counseledBy?: string | null
  parentname?: string | null
  parentmobile?: string | null
  emailid?: string | null
  genderId?: number | null
  qualificationId?: number | null
  qualificationGroupId?: number | null
  countryId?: number | null
  stateId?: number | null
  districtId?: number | null
  enquirystatusId?: number | null
  resultstatus?: string | null
  returnDate?: string | null
  remarks?: string | null
  percentage?: number | null
  emcetrank?: number | null
  mobileNumber1?: string | null
  isActive?: boolean
  createdDt?: string
  updatedDt?: string
}

export type CasteQuotaRow = {
  casteQuotaId?: number
  organizationId?: number
  orgName?: string
  casteQuota?: string
  caste?: string
  casteQuotaDescription?: string
  sortOrder?: number
  isActive?: boolean
  reason?: string
}

export type CasteQuotaPayload = {
  casteQuotaId?: number
  organizationId: number
  casteQuota: string
  casteQuotaDescription?: string
  sortOrder?: number
  isActive: boolean
  reason?: string
}

export type CollegeCounsellingRow = {
  univCollegeCounsellingId?: number
  casteQuotaId?: number
  casteQuota?: string
  genderCatDetailId?: number
  genderCatDetailName?: string
  totalNoOfIntakes?: number
  tutionFee?: number
  totalFilled?: number
  cutoffMarks?: number
  cutoffRank?: number
  minMarks?: number
  maxMarks?: number
  minRank?: number
  maxRank?: number
  isActive?: boolean
  reason?: string
  collegeId?: number
  courseId?: number
  batchId?: number
  courseGroupId?: number
}

export type CollegeCounsellingPayload = {
  univCollegeCounsellingId?: number
  collegeId: number
  courseId?: number
  batchId: number
  courseGroupId: number
  casteQuotaId: number
  genderCatDetailId: number
  totalNoOfIntakes: number
  tutionFee?: number
  totalFilled?: number
  cutoffMarks?: number
  cutoffRank?: number
  minMarks?: number
  maxMarks?: number
  minRank?: number
  maxRank?: number
  isActive: boolean
  reason?: string
}

export type UnivStdApplicationRow = {
  univAppId?: number
  universityCode?: string
  applicationNo?: string
  firstName?: string
  stdEmailId?: string
  mobile?: string
  applicationStatusName?: string
  applicationStatusCatdetId?: number
  dateOfRegistration?: string
  dateOfApprovedRegistration?: string
  college?: string
  course?: string
  CourseGroup?: string
}

export type FeePaidApplicationRow = {
  id?: number
  university_code?: string
  college_code?: string
  course_code?: string
  group_code?: string
  application_no?: string
  first_name?: string
  mobile?: string
  std_email_id?: string
  tracking_id?: string
  trans_date?: string
  payment_mode?: string
  payment_status?: string
  amount?: number
}

export type AdmissionAllotmentRow = {
  univAdmissionAllotmentId?: number
  collegeCode?: string
  courseCode?: string
  courseGroup?: string
  courseGroupCode?: string
  batchName?: string
  totalIntake?: number
  totalFilled?: number
  isActive?: boolean
  collegeId?: number
  courseId?: number
  courseGroupId?: number
  batchId?: number
  reason?: string
}

export type AdmissionAllotmentPayload = {
  univAdmissionAllotmentId?: number
  collegeId: number
  courseId: number
  courseGroupId: number
  batchId: number
  totalIntake?: number
  totalFilled?: number
  isActive: boolean
  reason?: string
}

export type AdmissionAllotmentDetailRow = {
  univAdmissionAllotmentDetailsId?: number
  /** Legacy/alias PK some API payloads still return */
  univAdmissionAllotmentDetId?: number
  univAdmissionAllotmentId?: number
  collegeId?: number
  collegeCode?: string
  courseCode?: string
  courseGroup?: string
  courseGroupCode?: string
  batchName?: string
  quotaCatdetId?: number
  quotaCatdetName?: string
  quotaCatdetCode?: string
  allocatedSeats?: number
  filledSeats?: number
  lastdayOfCounselling?: string
  isCounselling?: boolean
  isActive?: boolean
  reason?: string
}
