/** University committee module types — mirrors Angular `committe/` entities. */

export interface UnivCommittee {
  univCommitteeId: number
  organizationId?: number
  organizationName?: string
  departmentCatdetId?: number
  departmentCatdetName?: string
  committeeName: string
  universityExamId?: number
  universityExamName?: string
  subjectCode?: string
  profileRoleIds?: string
  univParentCommitteeId?: number
  committeeResponsibilities?: string
  isActive: boolean
  reason?: string
}

export interface UnivCommitteePosition {
  univCommitteePositionId: number
  organizationId?: number
  organizationName?: string
  committeePossitoinName: string
  isActive: boolean
  reason?: string
}

export interface UnivCommitteeMember {
  univCommitteeMemberId: number
  univCommitteesId?: number
  committeeName?: string
  univCommitteesName?: string
  univCommitteePositionsId?: number
  committeePossitoinName?: string
  univCommitteePositionsName?: string
  committeeMemberEmpId?: number
  committeeMemberEmployeeFirstName?: string
  fromDate?: string
  toDate?: string
  isActive: boolean
  reason?: string
}

export interface UnivZoomMeetingDetails {
  zoomStartUrl?: string
  zoomJoinUrl?: string
}

export interface UnivCommitteeMeeting {
  univCommitteeMeetingId?: number
  committeeMeetingId?: number
  meetingTitle?: string
  meetingDate?: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  meetingFromTime?: string
  meetingToTime?: string
  zoomLink?: string
  zoomMeetingId?: string
  zoomPassword?: string
  univZoomMeetingDetailsDTO?: UnivZoomMeetingDetails
}

export interface UnivRemunerationSetting {
  univRemunerationSettingId: number
  organizationId?: number
  organizationName?: string
  collegeId?: number
  collegeCode?: string
  evaluatorroleId?: number
  evaluatorRoleName?: string
  remunerationDesignationCatDetId?: number
  remunerationDesignationName?: string
  amount?: number
  affiliatedToCatDetId?: number
  fromDate?: string
  toDate?: string
  isActive: boolean
  reason?: string
}

export interface UnivProfileRecruitment {
  univProfileRecruitmentId: number
  organizationId?: number
  organizationName?: string
  univCommitteesId?: number
  universityExamId?: number
  subjectCode?: string
  examEvaluatorProfilesId?: number
  profileEmployeeDetailId?: number
  profileEmployeeName?: string
  evaluatorRoleId?: number
  evaluatorRoleName?: string
  committeeMeetingId?: number
  meetingTitle?: string
  isOfferReleased?: boolean | string
  isActive: boolean
  reason?: string
}

export interface UnivExaminationRemuneration {
  univExaminationRemunerationId: number
  examEvaluatorProfileId?: number
  profileEmployeeName?: string
  omrSerialNo?: string
  remunerationStatusCatDetId?: number
  remunerationStatusName?: string
  universityExamId?: number
  evaluatorRoleId?: number
  employeeId?: number
  isActive: boolean
  checked?: boolean
}

export interface RemunerationPaymentSummary {
  role_name?: string
  remuneration_to?: string
  exam_month_yr?: string
  total_nos?: number
  total_amount?: number
  fk_univ_remuneration_trsansaction_id?: number
  pk_univ_examinationremuneration_ids?: string
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  upi_id?: string
}

/** Stored-proc row from `s_get_committeedetails_bycodes`. */
export interface CommitteeFilterRow {
  pk_univ_committee_id?: number
  committee_name?: string
  fk_university_exam_id?: number
  exam_name?: string
  subject_code?: string
  subject_name?: string
  academic_year?: string
}

/** Stored-proc row from `s_get_examevaluation_bycodes` (`list_univ_exams`). */
export interface UnivExamFilterRow {
  org_code?: string
  fk_org_id?: number
  exam_month_yr?: string
  exam_name?: string
  pk_university_exam_id?: number
  from_date?: string
  to_date?: string
}

export interface EvaluatorProfileRow {
  pk_exam_evaluator_profile_id?: number
  evaluator_name?: string
  fk_evaluatorrole_id?: number
  is_confiured?: number
  isSelected?: boolean
  checked?: boolean
  exam_month_yr?: string
  profile_valid_fromdate?: string
  profile_valid_todate?: string
}
