/** TC & No Due Approval — mirrors Angular `apps/certificates/` subset. */

export interface FeeCertificateIssueRow {
  feeCertificateIssueId: number
  collegeCertificateId?: number
  studentId?: number
  collegeId?: number
  academicYearId?: number
  applicationStatusId?: number
  applicationStatusCode?: string
  applicationStatusName?: string
  applicationComments?: string
  certifcateCode?: string
  certificateName?: string
  certificateFor?: string
  certificateForValue?: string
  appliedOn?: string
  updatedDt?: string
  collectedAmount?: number
  isActive?: boolean
  remarks?: string
  studentDetailListDTO?: {
    studentId?: number
    firstName?: string
    rollNumber?: string
    hallticketNumber?: string
  }
}

export interface FeeCertificateWorkflowRow {
  feeCertificateWorkflowId?: number
  feeCertificateIssueId?: number
  approvalStatusCode?: string
  approvalStatusName?: string
  workflowStageName?: string
  remarks?: string
  isActive?: boolean
}

export interface TcClearanceRow {
  name: string
  isDue: boolean
}

export interface TcApplyCertificatePayload {
  collegeCertificateId: number
  applicationStatusId: number
  collegeId: number
  academicYearId: number
  studentId: number
  appliedOn: string
  courseGroupId?: number
  isWorkFlowFlag?: boolean
}

export interface TcStudentCertificatePrintRow {
  admission_number?: string
  roll_number?: string
  student_name?: string
  father_name?: string
  mother_name?: string
  date_of_birth?: string
  gender?: string
  adminssion_Date?: string
  Date_of_Leaving?: string
  Class_at_the_time_of_leaving?: string
  Branch?: string
  [key: string]: unknown
}

export interface CertificateSummaryReportRow {
  id?: number
  [key: string]: unknown
}
