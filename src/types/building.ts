export interface Building {
  buildingId: number;
  organizationId: number;
  orgCode?: string;
  organizationName?: string;
  campusId: number;
  campusName?: string;
  buildingName: string;
  buildingCode: string;
  /** UI / legacy camelCase */
  landMark?: string;
  /** Spring/API field name */
  landmark?: string | null;
  noOfFloors?: number;
  isActive: boolean;
  reason?: string;
}
