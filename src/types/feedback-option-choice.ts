/** Angular `OptionChoice` model — FbOptionchoice domain entity. */
export interface FbOptionChoice {
  fbOptionchoiceId: number;
  collegeId: number;
  fbOptionGroupId: number;
  optionchoice: string;
  optionchoiceRating: number;
  sortOrder: number;
  isActive: boolean;
  reason?: string | null;
  collegeCode?: string;
  collegeName?: string;
  optiongroupName?: string;
  optiongroupCode?: string;
  createdDt?: string;
  createdUser?: string;
  updatedDt?: string;
  updatedUser?: string;
}
