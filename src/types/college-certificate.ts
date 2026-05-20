export interface CollegeCertificate {
  collegeCertificateId: number
  organizationId?: number
  campusId: number
  collegeId: number
  certifcateCode: string
  certificateName: string
  certificateTypeId?: number
  amount: number
  duplicateCertificateAmount?: number
  fromDate: string
  toDate: string
  isApprovalReq?: boolean
  campusCode?: string
  collegeCode?: string
  isActive: boolean
  reason?: string
}
