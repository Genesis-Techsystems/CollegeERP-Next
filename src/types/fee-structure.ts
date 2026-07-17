export type CollegeFeeStructureRow = {
  feeStructureId?: number;
  collegeCode?: string;
  courseCode?: string;
  batchName?: string;
  academicYear?: string;
  classGroupName?: string;
  quotaDisplayName?: string;
  isLateral?: boolean;
  isActive?: boolean;
  isEditable?: boolean;
  academicYearId?: number;
  [key: string]: unknown;
};

export type UnivFeeStructureRow = {
  univFeeStructureId: number;
  universityCode?: string;
  courseCode?: string;
  courseGroupCode?: string;
  academicYear?: string;
  feeStructureName?: string;
  isActive: boolean;
  universitiesId?: number;
  courseId?: number;
  courseGroupId?: number;
  academicYearId?: number;
  reason?: string;
  [key: string]: unknown;
};

export type FeeStructureParticularLine = {
  feeCategoryId: number;
  feeParticularsId: number;
  feeAmount: number;
  priority: number;
  lateralFeeAmount?: number;
  categoryName?: string;
  particularName?: string;
  courseYearId?: number;
  courseYearName?: string;
  feeLabel?: string;
  collegeId?: number;
  fromDate?: string | Date;
  toDate?: string | Date;
  isActive?: boolean;
  bankAccountTypeId?: number | null;
  cashAccountTypeId?: number | null;
  mappingAccountTypeId?: number | null;
};

export type FeeStructureCourseYearTab = {
  yearNo: number;
  courseYearId: number;
  courseYearName: string;
  feeLabel: string;
  sortOrder: number;
  particulars: FeeStructureParticularLine[];
};

export type FeeStructureCourseGroupSelection = {
  courseGroupId: number;
  groupCode?: string;
  collegeId?: number;
  quotaId?: number;
  checked?: boolean;
  [key: string]: unknown;
};

export type CollegeFeeStructureCreatePayload = {
  collegeId: number;
  courseId: number;
  batchId?: number | null;
  academicYearId?: number | null;
  quotaId: number;
  classGroupName: string;
  isLateral: boolean;
  isActive: boolean;
  isAcademicFee: boolean;
  activefromdate: string | Date;
  activetodate: string | Date;
  feeStructureParticularDTOs: FeeStructureParticularLine[];
  feeStructureCourseyrDTOs: FeeStructureCourseGroupSelection[];
  college?: string;
  course?: string;
  batch?: string;
  academicYear?: string;
  description?: string | null;
  isMapped?: boolean;
};

export type UnivFeeStructureDetailRow = {
  univFeeStructureDetId?: number;
  univFeeStructureId?: number;
  collegeId?: number | null;
  collegeCode?: string;
  casteQuota?: string;
  casteQuotaId?: number;
  categoryName?: string;
  feeCategoryCatDetId?: number;
  feeCategoryCatDetCode?: string;
  feestructureName?: string;
  feeAmount?: number;
  lateFeeAmount?: number;
  lastDayOfPayment?: string | Date;
  lastDayOfLatePayment?: string | Date;
  isActive?: boolean;
  reason?: string;
  [key: string]: unknown;
};
