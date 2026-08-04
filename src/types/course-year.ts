export interface CourseYear {
  courseYearId: number;
  universityId: number;
  courseId: number;
  universityCode?: string;
  courseCode?: string;
  yearNo?: number;
  semNo?: number;
  sortOrder?: number;
  courseYearCode: string;
  courseYearName?: string;
  feeLabel?: string;
  minFeePercent?: number;
  isFeeYear?: boolean;
  isActive: boolean;
  reason?: string;
}
