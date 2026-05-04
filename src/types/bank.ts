export interface Bank {
  bankId: number
  collegeId: number
  collegeCode?: string
  bankCode: string
  bankName: string
  branchCode: string
  accountNo: string
  ifscCode: string
  address: string
  isActive: boolean
  reason?: string
}
