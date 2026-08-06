/** Angular `OptionGroup` model — FbOptionGroup domain entity. */
export interface FbOptionGroup {
  fbOptionGroupId: number;
  collegeId: number;
  optiongroupName: string;
  optiongroupCode: string;
  isActive: boolean;
  reason?: string | null;
  collegeCode?: string;
  collegeName?: string;
  createdDt?: string;
  createdUser?: string;
  updatedDt?: string;
  updatedUser?: string;
}
