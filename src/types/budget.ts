/** Angular `app/main/apps/budget/*` — entity `BudgetCategory`. */
export interface BudgetCategory {
  budgetCategoryId: number;
  organizationId: number;
  orgCode?: string;
  budgetCategoryName: string;
  isActive: boolean;
  reason?: string;
}

/** Angular `app/main/apps/budget/*` — entity `BudgetPrograms`. */
export interface BudgetProgram {
  /** API / Angular PK is singular `budgetProgramId` (not `budgetProgramsId`). */
  budgetProgramId: number;
  organizationId: number;
  orgCode?: string;
  collegeId: number;
  collegeCode?: string;
  financialYearId: number;
  financialYear?: string;
  budgetCategoryId: number;
  budgetCategoryName?: string;
  budgetTitle: string;
  budgetDescription?: string;
  budgetOutcome?: string;
  startDate: string;
  endDate: string;
  proposalAmount: number;
  /**
   * Angular table + form + payload key (`budget-programs.component.html`,
   * `budget-programs-modal`): `actualTotalAllotedAmount` (single "l").
   */
  actualTotalAllotedAmount: number;
  isActive: boolean;
  reason?: string;
}

/** Angular `app/main/apps/budget/*` — entity `BudgetAllocation`. */
export interface BudgetAllocation {
  budgetAllocationId: number;
  /** FK form field; options use `BudgetProgram.budgetProgramId`. */
  budgetProgramsId: number;
  budgetTitle: string;
  proposedAmount: number;
  /** Angular / API date field casing. */
  budgetallocationDate: string;
  proposedByByEmpId?: number;
  sanctionedAmount?: number;
  sanctionedByEmpId?: number;
  sanctionedDate?: string;
  inchargeEmpId?: number;
  /** Angular formControlName: `paymentModeCatDetId`. */
  paymentModeCatDetId?: number;
  /** Legacy alias if API returns lowercase `det`. */
  paymentModeCatdetId?: number;
  referenceNo?: string;
  isActive: boolean;
  reason?: string;
  createdDt?: string | null;
  createdUser?: number | null;
  updatedDt?: string | null;
  updatedUser?: number | null;
}

/**
 * Exact write body for POST/PUT `BudgetAllocation`
 * (`budgetAllocationId` / `updatedDt` / `updatedUser` are null on create).
 */
export interface BudgetAllocationWritePayload {
  budgetAllocationId: number | null;
  budgetProgramsId: number;
  budgetTitle: string;
  proposedAmount: number;
  budgetallocationDate: string;
  proposedByByEmpId: number;
  sanctionedAmount: number;
  sanctionedByEmpId: number;
  sanctionedDate: string;
  inchargeEmpId: number;
  paymentModeCatDetId: number;
  referenceNo: string;
  isActive: boolean;
  reason: string;
  createdDt: string | null;
  createdUser: number | null;
  updatedDt: string | null;
  updatedUser: number | null;
}
