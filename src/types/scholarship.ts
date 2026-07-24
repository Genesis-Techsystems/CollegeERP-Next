/** Scholarship type master row. */
export type ScholarshipType = {
  scholarshipTypeId: number;
  organizationId: number;
  universityId: number;
  orgCode?: string;
  universityCode?: string;
  scholarshipTypeCode: string;
  scholarshipTypeDesc: string;
  sortOrder?: number;
  isActive: boolean;
  reason?: string;
};

export type ScholarshipTypePayload = Omit<
  ScholarshipType,
  "scholarshipTypeId" | "orgCode" | "universityCode"
>;

/** Student scholarship application row. */
export type ScholarshipApplication = {
  schStdApplicationId: number;
  schApplicationNo?: string;
  studentId: number;
  firstName: string;
  applicantName?: string;
  rollNumber?: string;
  collegeId: number;
  collegeCode?: string;
  collegeName?: string;
  academicYearId: number;
  academicYear?: string;
  courseId?: number;
  courseCode?: string;
  courseGroupId?: number;
  groupCode?: string;
  courseYearId?: number;
  courseYearCode?: string;
  courseYearName?: string;
  groupSectionId?: number;
  section?: string;
  appliedOn?: string;
  docColelctedOn?: string;
  docCollectionComments?: string;
  statusComments?: string;
  submittedToGovtOn?: string;
  govtApprovedOn?: string;
  scholarshipAmount?: number;
  totalAmountReceived?: number;
  dueAmount?: number;
  balanceAmount?: number;
  clgApprovalStatusAr?: string;
  govtApprovalStatusAr?: string;
  isActive: boolean;
  isSubmittedToGovt?: boolean;
  isAllDocsCollected?: boolean;
  isRenewaled?: boolean;
  isCompleted?: boolean;
  reason?: string;
};

export type ScholarshipApplicationPayload = Record<string, unknown>;

/** Government/scholarship proceeding header. */
export type SchPreceeding = {
  schPreceedingId: number;
  preceedingNo?: string;
  preceedingTitle?: string;
  preceedingAmount?: number;
  preceedingDate?: string;
  collegeId?: number;
  collegeCode?: string;
  academicYearId?: number;
  financialYearId?: number;
  bankId?: number;
  casteId?: number;
  studentCount?: number;
  isActive?: boolean;
};

export type SchPreceedingPayload = Record<string, unknown>;

/** Account-level proceeding (cheque batch). */
export type SchAccountsPreceeding = {
  schAccountsPreceedingId: number;
  title?: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeAmount?: number;
  bankId?: number;
  bankName?: string;
  collegeId?: number;
  collegeCode?: string;
  schPreceedingIds?: string;
  comments?: string;
  isHandOvertoAcc?: boolean;
  isActive?: boolean;
  reason?: string;
};

/** Student line under a proceeding. */
export type SchStdPreceeding = {
  schStdPreceedingId: number;
  schPreceedingId: number;
  studentId: number;
  firstName?: string;
  rollNumber?: string;
  scholarshipAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  isPaid?: boolean;
};

/** Fee scholarship structure list row. */
export type FeeSchStructureRow = {
  feeSchStructureId: number;
  collegeId?: number;
  courseId?: number;
  batchId?: number;
  academicYearId?: number;
  universityId?: number;
  scholarshipTypeId?: number;
  collegeCode?: string;
  courseCode?: string;
  academicYear?: string;
  batchName?: string;
  scholarshipType?: string;
  scholarshipTypeDesc?: string;
  scholarshipAmount?: number;
  isForLateral?: boolean;
  isActive?: boolean;
};

/** Scholarship value line (fee category / particular per course year). */
export type ScholarshipValueRow = {
  scholarshipValueId: number;
  feeSchStructureId?: number;
  feeCategoryId?: number;
  feeParticularsId?: number;
  courseYearId?: number;
  yearNo?: number;
  scholarshipAmount?: number;
  feeAmount?: number;
  categoryName?: string;
  particularName?: string;
  particularsName?: string;
  isActive?: boolean;
};

export type ScholarshipValuePayload = {
  feeSchStructureId: number;
  collegeId: number;
  courseId: number;
  batchId?: number;
  academicYearId?: number;
  feeCategoryId: number;
  feeParticularsId: number;
  courseYearId: number;
  scholarshipAmount: number;
  isActive: boolean;
  reason?: string;
};

export type FeeSchStructurePayload = {
  universityId?: number;
  collegeId: number;
  courseId: number;
  batchId?: number;
  academicYearId?: number;
  scholarshipTypeId: number;
  scholarshipAmount: number;
  scholarshipTypeDesc?: string;
  isForLateral?: boolean;
  isActive: boolean;
  reason?: string;
};

/** Assign scholarship student row (flattened from Angular nested DTO). */
export type AssignScholarshipStudent = {
  studentId: number;
  firstName?: string;
  rollNumber?: string;
  studentPhotoPath?: string;
  isAssigned?: boolean;
  scholarshipTypeId?: number;
  scholarshipValueId?: number;
  studentScholarshipId?: number;
  scholarshipAmount?: number;
  assignedType?: string;
  courseName?: string;
  courseGroupName?: string;
  courseYearName?: string;
  batchName?: string;
  checked?: boolean;
};

export type ScholarshipTypeAndValue = {
  scholarshipTypeId: number;
  scholarshipTypeCode: string;
  scholarshipAmount: number;
};

export type UpdateStdStudentScholarshipPayload = {
  studentScholarshipId: number | null;
  collegeId: number;
  studentDetailId: number;
  scholarshipTypesId: number;
  amount: number;
  isStdFeeUpdated: boolean;
  feeParticularId?: number | null;
  unAssigned: boolean;
  isActive: boolean;
  assignedType: "ASSIGNED" | "UNASSIGNED";
};

export const SCHOLARSHIP_STATUS_OPTIONS = [
  { value: "L", label: "Applied" },
  { value: "A", label: "Approved" },
  { value: "P", label: "Pending" },
  { value: "R", label: "Rejected" },
] as const;
