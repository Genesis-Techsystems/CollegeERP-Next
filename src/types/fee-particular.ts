export interface FeeParticular {
  feeParticularsId: number
  collegeId: number
  particularsName: string
  particularsCode: string
  description?: string | null
  isActive: boolean
  reason?: string
  collegeCode?: string
  collegeName?: string
}

export type FeeParticularPayload = Omit<FeeParticular, 'feeParticularsId' | 'collegeCode' | 'collegeName'>
