/** Angular `FbQuestion` model — FeedbackQuestion domain entity. */
export interface FbQuestion {
  fbQuestionId: number
  collegeId: number
  fbQuestion: string
  /** Angular field spelling (API parity). */
  fbDiscription: string
  generalDetailId: number
  fbOptionGroupId: number
  isAnswerrequired: boolean
  isQuestionrequired?: boolean
  isAllowMultipleAnswers?: boolean | null
  dependentQuestionId?: number | null
  isActive: boolean
  reason?: string | null
  collegeCode?: string
  collegeName?: string
  generalDetailDisplayName?: string
  generalDetailCode?: string
  optiongroupName?: string
  optiongroupCode?: string
  createdDt?: string
  createdUser?: string
  updatedDt?: string
  updatedUser?: string
}
