export type AffiliatedCollegeFilterRow = Record<string, unknown>

export type AffiliatedSummaryRow = Record<string, unknown>

export type UnivCollegeWisePaymentRow = {
  univCollegeWisePaymentId?: number
  collegeId?: number
  collegeCode?: string
  academicYear?: string
  academicYearId?: number
  financialYear?: string
  totalStudents?: number
  totalAmount?: number
  paymentDate?: string
  paymentFor?: string
  paymentForCatDetId?: number
  paymentMode?: string
  paymodeCatDetId?: number
  paymentDescription?: string
  paymentDes?: string
  isActive?: boolean
  reason?: string
  examMasterId?: number
  universityId?: number
  paymentMadeByEmpId?: number
}

export type UnivCollegeWisePaymentPayload = {
  totalStudents: number
  totalAmount: number
  paymentDate: string
  paymentForCatDetId: number
  paymodeCatDetId: number
  paymentDescription: string
  isActive: boolean
  reason?: string
  collegeId: number
  academicYearId: number
  examMasterId: number
  universityId: number
  paymentMadeByEmpId: number
}
