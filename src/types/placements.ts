// ─── Placement ───────────────────────────────────────────────────────────────

export interface Placement {
  placementId: number;
  plaecmentTitle: string; // Angular typo preserved
  campusId?: number | null;
  campusCode?: string | null;
  campusName?: string | null;
  orgCode?: string | null;
  placementCatId?: number | null;
  placementCatCode?: string | null;
  description?: string | null;
  placementStartDate: string;
  placementEndDate: string;
  contactPerson?: string | null;
  contactDetails?: string | null;
  address?: string | null;
  city?: string | null;
  isOffcampus?: boolean | null;
  offcampusLocation?: string | null;
  placementStatusComments?: string | null;
  organizationId?: number | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  companyId: number;
  companyname: string; // Angular lowercase-n typo preserved
  location?: string | null;
  website?: string | null;
  linkedin?: string | null;
  companydescription?: string | null;
  lastParticipatedDate?: string | null;
  phoneNumber?: string | null;
  primaryContactDetails?: string | null;
  companyContactDTOs?: CompanyContact[];
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

export interface CompanyContact {
  companyContactId: number;
  companyId?: number | null;
  companyname?: string | null;
  personName: string;
  mobile?: string | null;
  designation?: string | null;
  landline?: string | null;
  details?: string | null;
  emailid?: string | null;
  lastContactedOn?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Company Meeting ─────────────────────────────────────────────────────────

export interface CompanyMeeting {
  companyMeetingId: number;
  collegeId?: number | null;
  collegeCode?: string | null;
  collegeName?: string | null;
  companyId?: number | null;
  companyname?: string | null;
  companyContactId?: number | null;
  poEmpId?: number | null;
  poEmpName?: string | null;
  poEmpNumber?: string | null;
  meetingTitle: string;
  meetingDescription?: string | null;
  meetingOn?: string | null;
  meetingOutput?: string | null;
  meetingTypeCatdetId?: number | null;
  /** Angular list column field */
  meetingTypeCatDisplayName?: string | null;
  meetingTypeCatdetName?: string | null;
  attendeesNames?: string | null;
  meetingFromTime?: string | null;
  meetingToTime?: string | null;
  followupMeetingOn?: string | null;
  followupPoints?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Placement Broadcast ─────────────────────────────────────────────────────

export interface PlacementBroadcast {
  placementBroadcastId: number;
  companyId?: number | null;
  companyname?: string | null;
  companyName?: string | null;
  posttypeCatdetId?: number | null;
  posttypeCatdetName?: string | null;
  yearName?: string | null;
  postHeader?: string | null;
  post?: string | null;
  postSignature?: string | null;
  isApproved?: boolean | null;
  approvedOn?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Placement Company (requirements per placement) ───────────────────────────

export interface PlacementCompany {
  placementCompanyId: number;
  placementId?: number | null;
  plaecmentTitle?: string | null;
  placementTitle?: string | null;
  companyId?: number | null;
  companyname?: string | null;
  /** Angular modal submit field */
  companyName?: string | null;
  companyContactId?: number | null;
  contactDetails?: string | null;
  comapanyRequirements?: string | null; // Angular typo preserved
  sscGrade?: string | number | null;
  sscPercentage?: number | null;
  interPercentage?: number | null;
  interGrade?: string | number | null;
  diplomaGrade?: string | number | null;
  diplomaPercentage?: number | null;
  ugGrade?: string | number | null;
  ugPercentage?: number | null;
  pgGrade?: string | number | null;
  pgPercentage?: number | null;
  isBackLogAllowed?: boolean | null;
  skillSetIds?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Placement Student Registration ──────────────────────────────────────────

export interface PlacementStudentRegistration {
  placementStdRegId: number;
  placementId?: number | null;
  companyId?: number | null;
  companyname?: string | null;
  studentId?: number | null;
  firstName?: string | null;
  rollNumber?: string | null;
  courseName?: string | null;
  mobile?: string | null;
  studentPhotoPath?: string | null;
  registeredDate?: string | null;
  isRegistered?: boolean | null;
  isCVShortlisted?: boolean | null;
  isClearedGD?: boolean | null;
  isClearedHR?: boolean | null;
  isClearedManagerRound?: boolean | null;
  isClearedPreHR?: boolean | null;
  isClearedSecondTech?: boolean | null;
  isClearedFirstTech?: boolean | null;
  isClearedThirdTech?: boolean | null;
  isClearedWritten?: boolean | null;
  isJoined?: boolean | null;
  isOfferRollOut?: boolean | null;
  isPlaced?: boolean | null;
  joinedOn?: string | null;
  joiningDate?: string | null;
  offerDate?: string | null;
  interviewerComments?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Achievement Category ─────────────────────────────────────────────────────

export interface AchievementCategory {
  categoryId: number;
  organizationId?: number | null;
  organizationName?: string | null;
  orgCode?: string | null;
  achievementCategory: string;
  achievementCategoryCode: string;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Achievement Sub-Category ─────────────────────────────────────────────────

export interface AchievementSubCategory {
  subCategoryId: number;
  categoryId?: number | null;
  achievementCategoryName?: string | null;
  achievementCategoryCode?: string | null;
  orgCode?: string | null;
  achievementSubcategory: string;
  achievementSubcategoryCode: string;
  organizationId?: number | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}

// ─── Achievement ──────────────────────────────────────────────────────────────

export interface Achievement {
  achievementId: number;
  organizationId?: number | null;
  organizationName?: string | null;
  orgCode?: string | null;
  achivementTitle: string; // Angular typo preserved
  subcategoryId?: number | null;
  subcategoryName?: string | null;
  specialization?: string | null;
  fkParticipatedStdIds?: string | null; // comma-separated studentIds
  fkParticipatedEmpIds?: string | null; // comma-separated employeeIds
  prizeCatId?: number | null;
  prizeCatName?: string | null;
  prizeCatCode?: string | null;
  achivementDescription?: string | null;
  ranks?: string | null;
  grade?: string | null;
  percentage?: number | null;
  durationFrom?: string | null;
  durationTo?: string | null;
  referenceNo?: string | null;
  achievementLevelCatId?: number | null;
  achievementLevelCatName?: string | null;
  achievementLevelCatCode?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdDt?: string;
  updatedDt?: string;
}
