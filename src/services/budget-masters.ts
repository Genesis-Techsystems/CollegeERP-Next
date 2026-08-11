/**
 * Budget module — Angular `app/main/apps/budget/*`.
 *
 * Entities: BudgetCategory, BudgetPrograms, BudgetAllocation.
 * (Not to be confused with the separate Finance `FinBudgetAllocation` /
 * `FinBudgetMidyearEstimations` entities in `src/services/finance.ts`.)
 */

import { BUDGET_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type {
  BudgetAllocation,
  BudgetAllocationWritePayload,
  BudgetCategory,
  BudgetProgram,
} from "@/types/budget";
import type { College } from "@/types/college";
import type { FinancialYear } from "@/types/financial-year";
import type { Organization } from "@/types/organization";
import { buildQuery, domainCreate, domainList, domainUpdate } from "./crud";

const CREATED_DESC = { field: "createdDt", direction: "DESC" as const };

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Angular `listDetailsById(organizationsCrudUrl, 'true', 'isActive')`. */
export async function listActiveOrganizationsForBudget(): Promise<
  Organization[]
> {
  return domainList<Organization>(
    ENTITIES.ORGANIZATION.name,
    buildQuery({ isActive: true }),
  );
}

/** Angular `listDetailsById(collegeCrudUrl, 'true', 'isActive')`. */
export async function listActiveCollegesForBudget(): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ isActive: true }),
  );
}

/** Angular `listDetailsById(financialYearCrudUrl, 'true', 'isActive')`. */
export async function listActiveFinancialYearsForBudget(): Promise<
  FinancialYear[]
> {
  return domainList<FinancialYear>(
    ENTITIES.FINANCIAL_YEAR.name,
    buildQuery({ isActive: true }),
  );
}

// ─── BudgetCategory ─────────────────────────────────────────────────────────

/** Angular `listAllDetails(budgetcategoryCrudUrl)` — `query=order(createdDt=desc)&size=99999`. */
export async function listBudgetCategories(): Promise<BudgetCategory[]> {
  return domainList<BudgetCategory>(
    BUDGET_API.CATEGORY,
    buildQuery({}, CREATED_DESC),
  );
}

/** Angular `listDetailsById(budgetcategoryCrudUrl, 'true', 'isActive')` — Budget Programs modal lookup. */
export async function listActiveBudgetCategories(): Promise<BudgetCategory[]> {
  return domainList<BudgetCategory>(
    BUDGET_API.CATEGORY,
    buildQuery({ isActive: true }),
  );
}

/** Angular `addBudgetcategories(budgetcategoryCrudUrl, details)`. */
export async function createBudgetCategory(
  data: Partial<BudgetCategory>,
): Promise<BudgetCategory> {
  return domainCreate<BudgetCategory>(BUDGET_API.CATEGORY, data);
}

/**
 * Angular `updateDetails(budgetcategoryCrudUrl, details, details.budgetCategoryId, budgetcategoryCrudUrl)`
 * sends `query=BudgetCategory==<id>` (the 4th arg is the crud URL, not a field name — a bug). The
 * correct primary key field is `budgetCategoryId`, which is what this update targets.
 */
export async function updateBudgetCategory(
  budgetCategoryId: number,
  data: Partial<BudgetCategory>,
): Promise<BudgetCategory> {
  return domainUpdate<BudgetCategory>(
    BUDGET_API.CATEGORY,
    "budgetCategoryId",
    budgetCategoryId,
    { budgetCategoryId, ...data },
  );
}

// ─── BudgetPrograms ─────────────────────────────────────────────────────────

/** Angular `listAllDetails(budgetprogramsCrudUrl)` — `query=order(createdDt=desc)&size=99999`. */
export async function listBudgetPrograms(): Promise<BudgetProgram[]> {
  return domainList<BudgetProgram>(
    BUDGET_API.PROGRAMS,
    buildQuery({}, CREATED_DESC),
  );
}

/** Angular `listDetailsById(budgetprogramsCrudUrl, 'true', 'isActive')` — Budget Allocation modal lookup. */
export async function listActiveBudgetPrograms(): Promise<BudgetProgram[]> {
  return domainList<BudgetProgram>(
    BUDGET_API.PROGRAMS,
    buildQuery({ isActive: true }),
  );
}

/** Angular `addBudgetprograms(budgetprogramsCrudUrl, details)`. */
export async function createBudgetProgram(
  data: Partial<BudgetProgram>,
): Promise<BudgetProgram> {
  const {
    actualTotalAllotedAmount: allotted,
    actualTotalAllottedAmount: typo,
    ...rest
  } = data as Partial<BudgetProgram> & { actualTotalAllottedAmount?: number };
  return domainCreate<BudgetProgram>(BUDGET_API.PROGRAMS, {
    ...rest,
    actualTotalAllotedAmount: Number(allotted ?? typo ?? 0),
  });
}

/** Angular / API primary key is `budgetProgramId` (singular). */
export async function updateBudgetProgram(
  budgetProgramId: number,
  data: Partial<BudgetProgram>,
): Promise<BudgetProgram> {
  const {
    actualTotalAllotedAmount: allotted,
    actualTotalAllottedAmount: typo,
    ...rest
  } = data as Partial<BudgetProgram> & { actualTotalAllottedAmount?: number };
  return domainUpdate<BudgetProgram>(
    BUDGET_API.PROGRAMS,
    "budgetProgramId",
    budgetProgramId,
    {
      budgetProgramId,
      ...rest,
      actualTotalAllotedAmount: Number(allotted ?? typo ?? 0),
    },
  );
}

// ─── BudgetAllocation ───────────────────────────────────────────────────────

/** Angular `listAllDetails(budgetallocationCrudUrl)` — `query=order(createdDt=desc)&size=99999`. */
export async function listBudgetAllocations(): Promise<BudgetAllocation[]> {
  return domainList<BudgetAllocation>(
    BUDGET_API.ALLOCATION,
    buildQuery({}, CREATED_DESC),
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Angular `addBudgetallocations` body — same shape as update, with
 * `budgetAllocationId` / `updatedDt` / `updatedUser` set to `null`.
 */
export async function createBudgetAllocation(
  data: BudgetAllocationWritePayload,
): Promise<BudgetAllocation> {
  const body: BudgetAllocationWritePayload = {
    ...data,
    budgetAllocationId: null,
    updatedDt: null,
    updatedUser: null,
  };
  return domainCreate<BudgetAllocation>(BUDGET_API.ALLOCATION, body);
}

/**
 * Angular `updateDetails(..., budgetAllocationId, 'budgetAllocationId')` —
 * full payload including ids and audit fields.
 */
export async function updateBudgetAllocation(
  budgetAllocationId: number,
  data: BudgetAllocationWritePayload,
): Promise<BudgetAllocation> {
  const body: BudgetAllocationWritePayload = {
    ...data,
    budgetAllocationId,
  };
  return domainUpdate<BudgetAllocation>(
    BUDGET_API.ALLOCATION,
    "budgetAllocationId",
    budgetAllocationId,
    body,
  );
}

export { nowIso as budgetAllocationNowIso };
