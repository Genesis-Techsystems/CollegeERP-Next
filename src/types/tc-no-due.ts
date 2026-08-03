/** TC & No Due Approval — mirrors Angular `apps/certificates/` subset. */

export interface FeeCertificateIssueRow {
  feeCertificateIssueId: number;
  collegeCertificateId?: number;
  studentId?: number;
  collegeId?: number;
  academicYearId?: number;
  applicationStatusId?: number;
  applicationStatusCode?: string;
  applicationStatusName?: string;
  applicationStatusDisplayName?: string;
  applicationComments?: string;
  certifcateCode?: string;
  certificateName?: string;
  certificateFor?: string;
  certificateForValue?: string;
  academicYear?: string;
  certificateNumber?: string | null;
  conduct?: string | null;
  refDocumentPath?: string | null;
  appliedOn?: string;
  updatedDt?: string;
  createdDt?: string;
  collectedAmount?: number;
  isActive?: boolean;
  remarks?: string;
  academicEndDate?: string;
  studentStatusId?: number;
  reason?: string;
  campusId?: number;
  certificateTypeId?: number;
  firstName?: string;
  /** Present on issued rows used by print-certificate-receipt (Angular parity). */
  orgLogo?: string | null;
  paymentReceiptsNo?: string | null;
  paymentType?: string | null;
  payment_mode?: string | null;
  card_name?: string | null;
  receiptDt?: string | null;
  studentDetailListDTO?: {
    studentId?: number;
    firstName?: string;
    fatherName?: string;
    rollNumber?: string;
    hallticketNumber?: string;
    collegeCode?: string;
    academicYear?: string;
    courseCode?: string;
    groupCode?: string;
    courseYearCode?: string;
    courseYearName?: string;
    section?: string;
    mobile?: string;
    studentPhotoPath?: string;
    quotaDisplayName?: string;
  };
  /** Nested workflows on issue rows (Angular View Certificate Flows). */
  feeCertificateWorkflows?: FeeCertificateWorkflowRow[];
}

/** Apply-certificate dialog payload posted to `feeCertificateIssueAmount`. */
export type ApplyCertificateRequestPayload = {
  studentId: number;
  collegeCertificateId: number;
  collegeId: number;
  academicYearId: number;
  applicationStatusId: number;
  appliedOn: string;
  certifcateCode?: string;
  certificateName?: string;
  certificateFor?: string | null;
  certificateForValue?: string | null;
  applicationComments?: string | null;
  campusId?: number;
  certificateTypeId?: number;
  for?: string;
  forOther?: string;
  financialYearId?: number;
};

export interface FeeCertificateWorkflowRow {
  feeCertificateWorkflowId?: number;
  feeCertificateIssueId?: number;
  /** Angular domain field alias used by principal no-due status edit. */
  feeCertificateWfId?: number;
  approvalStatusId?: number | null;
  approvalStatusCode?: string | null;
  approvalStatusName?: string;
  approvalStatusDisplayName?: string | null;
  workflowStageName?: string;
  remarks?: string;
  comments?: string | null;
  isActive?: boolean;
  deptCode?: string;
  deptName?: string;
  courseGroupId?: number | null;
  titleCode?: string;
  firstName?: string;
  employeeMobile?: string | null;
  updatedDt?: string | null;
  collegeName?: string;
}

/** Angular `s_get_fee_emp_certificate_approval` row (principal TC No Due Approvals). */
export interface EmpCertificateApprovalRow {
  pk_fee_certificate_wf_id?: number;
  pk_fee_certificate_issue_id?: number;
  fk_approval_status_catdet_id?: number | null;
  student_photo_path?: string | null;
  student_name?: string | null;
  roll_number?: string | null;
  student_mobile?: string | null;
  academic_details?: string | null;
  batch_name?: string | null;
  dept_name?: string | null;
  certificate_name?: string | null;
  Detail_Name?: string | null;
  comments?: string | null;
  reason?: string | null;
  [key: string]: unknown;
}

export interface TcClearanceRow {
  name: string;
  isDue: boolean;
}

export interface TcApplyCertificatePayload {
  collegeCertificateId: number;
  applicationStatusId: number;
  collegeId: number;
  academicYearId: number;
  studentId: number;
  appliedOn: string;
  courseGroupId?: number;
  isWorkFlowFlag?: boolean;
  /** Angular student no-due apply confirm dialog reason. */
  reason?: string;
}

export interface TcStudentCertificatePrintRow {
  admission_number?: string;
  roll_number?: string;
  student_name?: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  adminssion_Date?: string;
  Date_of_Leaving?: string;
  Class_at_the_time_of_leaving?: string;
  Branch?: string;
  [key: string]: unknown;
}

export interface CertificateSummaryReportRow {
  id?: number;
  [key: string]: unknown;
}
