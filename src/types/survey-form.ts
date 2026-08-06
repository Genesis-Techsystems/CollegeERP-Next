/** Angular SurveyForm / survey-form list + edit payload. */

export type SurveyFormDetailDto = {
  surveyDetailsId?: number
  fbQuestionId?: number
  questionSortOrder?: number | string
  isActive?: boolean
  isPresent?: boolean
  checked?: boolean
  fbQuestion?: string
  optiongroupCode?: string
  feedbackQuestionDTO?: {
    fbQuestionId?: number
    fbQuestion?: string
  }
}

export type SurveyFormRow = {
  surveyFormId?: number
  surveyName?: string
  surveyStartDate?: string
  surveyEndDate?: string
  fbfromId?: number
  fbforId?: number
  fbfromCode?: string
  fbforCode?: string
  collegeId?: number
  collegeCode?: string
  headerinfo?: string
  headerinfo1?: string
  footerinfo?: string
  footerinfo1?: string
  instructions?: string
  isActive?: boolean
  isHtml?: boolean
  surveyDetailDTOs?: SurveyFormDetailDto[]
}
