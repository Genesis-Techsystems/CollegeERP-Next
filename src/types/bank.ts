export interface Bank {
  bankId: number
  campusId: number
  campusCode?: string
  collegeId: number
  collegeCode?: string
  bankCode: string
  bankName: string
  branchCode?: string
  accountNo: string
  ifscCode: string
  micrCode?: string
  address?: string
  isActive: boolean
  reason?: string
}
