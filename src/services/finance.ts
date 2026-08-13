import type {
  AccountEntity,
  FinAccountType,
  FinBankAccount,
  FinBudgetMidyearEstimation,
  FinBudgetReportRow,
  FinCategory,
  FinChequeBook,
  FinSubCategory,
  FinTransaction,
  GeneralDetailOption,
  IncomeExpenseSummaryRow,
  ExpenseSummaryRow,
  SchoolWiseSalaryRow,
  LibrarySummaryRow,
  TransportSummaryRow,
} from "@/types/finance";
import { DASHBOARD_API, FINANCE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import { AppError } from "@/lib/errors";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  getAllRecords,
  getAllRecordsEnvelope,
  postDetails,
  putDetails,
  uploadFile,
} from "./crud";
import { getFinanceEntityFilters } from "./e-office";
import { listGeneralDetailsByMaster } from "./examination";

export { getFinanceEntityFilters };

const EA = ENTITIES.FIN_ACCOUNT_ENTITY;
const AT = ENTITIES.FIN_ACCOUNT_TYPE;
const FC = ENTITIES.FIN_CATEGORY;
const FSC = ENTITIES.FIN_SUB_CATEGORY;
const FBA = ENTITIES.FIN_BANK_ACCOUNT;
const FCB = ENTITIES.FIN_CHEQUE_BOOK;
const FT = ENTITIES.FIN_TRANSACTION;
const FBM = ENTITIES.FIN_BUDGET_MIDYEAR;
const FBA_ALLOC = ENTITIES.FIN_BUDGET_ALLOCATION;

const sortDesc = { field: "createdDt", direction: "DESC" as const };

type StoredProcRows = { result?: unknown[][] };

function firstResultSet<T>(data: StoredProcRows | null | undefined): T[] {
  const block = data?.result?.[0];
  return Array.isArray(block) ? (block as T[]) : [];
}

// ─── Account Entity ───────────────────────────────────────────────────────────

export async function listAccountEntities(): Promise<AccountEntity[]> {
  return domainList<AccountEntity>(EA.name, buildQuery({}, sortDesc));
}

export async function listAccountEntitiesByCollege(
  collegeId: number,
): Promise<AccountEntity[]> {
  if (!collegeId) return [];
  return domainList<AccountEntity>(
    EA.name,
    buildQuery(
      { "College.collegeId": collegeId, isActive: true },
      { field: "entityName", direction: "ASC" },
    ),
  );
}

export async function createAccountEntity(
  data: Partial<AccountEntity>,
): Promise<AccountEntity> {
  return domainCreate<AccountEntity>(EA.name, data);
}

export async function updateAccountEntity(
  id: number,
  data: Partial<AccountEntity>,
): Promise<AccountEntity> {
  return domainUpdate<AccountEntity>(EA.name, EA.pk, id, data);
}

// ─── Account Types ────────────────────────────────────────────────────────────

export async function listFinAccountTypes(): Promise<FinAccountType[]> {
  return domainList<FinAccountType>(AT.name, buildQuery({}, sortDesc));
}

export async function listFinAccountTypesByCollege(
  collegeId: number,
): Promise<FinAccountType[]> {
  if (!collegeId) return [];
  return domainList<FinAccountType>(
    AT.name,
    buildQuery(
      { "College.collegeId": collegeId, isActive: true },
      { field: "accounttypeCode", direction: "ASC" },
    ),
  );
}

export async function createFinAccountType(
  data: Partial<FinAccountType>,
): Promise<FinAccountType> {
  return domainCreate<FinAccountType>(AT.name, data);
}

export async function updateFinAccountType(
  id: number,
  data: Partial<FinAccountType>,
): Promise<FinAccountType> {
  return domainUpdate<FinAccountType>(AT.name, AT.pk, id, data);
}

export async function listFinMajorAccountTypes(): Promise<
  GeneralDetailOption[]
> {
  const rows = await listGeneralDetailsByMaster(GM_CODES.MAJOR_ACCOUNT_TYPE);
  return rows.map((r) => ({
    generalDetailId: r.generalDetailId,
    generalDetailCode: r.generalDetailCode,
    generalDetailName: r.generalDetailName,
    generalDetailDisplayName:
      (r as { generalDetailDisplayName?: string }).generalDetailDisplayName ??
      r.generalDetailName,
  }));
}

// ─── Finance Categories ─────────────────────────────────────────────────────────

export async function listFinCategories(): Promise<FinCategory[]> {
  return domainList<FinCategory>(FC.name, buildQuery({}, sortDesc));
}

export async function listFinCategoriesByCollegeAndAccountType(
  collegeId: number,
  accountTypeId: number,
): Promise<FinCategory[]> {
  if (!collegeId || !accountTypeId) return [];
  return domainList<FinCategory>(
    FC.name,
    buildQuery(
      {
        "College.collegeId": collegeId,
        "accountTypeId.accountTypeId": accountTypeId,
        isActive: true,
      },
      { field: "finCategoryId", direction: "DESC" },
    ),
  );
}

export async function createFinCategory(
  data: Partial<FinCategory>,
): Promise<FinCategory> {
  return domainCreate<FinCategory>(FC.name, data);
}

export async function updateFinCategory(
  id: number,
  data: Partial<FinCategory>,
): Promise<FinCategory> {
  return domainUpdate<FinCategory>(FC.name, FC.pk, id, data);
}

// ─── Finance Sub Categories ───────────────────────────────────────────────────

export async function listFinSubCategories(): Promise<FinSubCategory[]> {
  return domainList<FinSubCategory>(FSC.name, buildQuery({}, sortDesc));
}

export async function listFinSubCategoriesByCategory(
  finCategoryId: number,
): Promise<FinSubCategory[]> {
  if (!finCategoryId) return [];
  return domainList<FinSubCategory>(
    FSC.name,
    buildQuery(
      { "FinCategory.finCategoryId": finCategoryId, isActive: true },
      { field: "finSubCategoryId", direction: "DESC" },
    ),
  );
}

export async function createFinSubCategory(
  data: Partial<FinSubCategory>,
): Promise<FinSubCategory> {
  return domainCreate<FinSubCategory>(FSC.name, data);
}

export async function updateFinSubCategory(
  id: number,
  data: Partial<FinSubCategory>,
): Promise<FinSubCategory> {
  return domainUpdate<FinSubCategory>(FSC.name, FSC.pk, id, data);
}

/** Angular `addMasterDetails(finMasterSubCategoryUrl, details)` → POST `finSubCategories` */
export async function saveFinMasterSubCategories(
  rows: Partial<FinSubCategory>[],
): Promise<void> {
  await postDetails(FINANCE_API.FIN_MASTER_SUB_CATEGORY, rows);
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function listFinBankAccounts(): Promise<FinBankAccount[]> {
  return domainList<FinBankAccount>(FBA.name, buildQuery({}, sortDesc));
}

export async function createFinBankAccount(
  data: Partial<FinBankAccount>,
): Promise<FinBankAccount> {
  return domainCreate<FinBankAccount>(FBA.name, data);
}

export async function updateFinBankAccount(
  id: number,
  data: Partial<FinBankAccount>,
): Promise<FinBankAccount> {
  return domainUpdate<FinBankAccount>(FBA.name, FBA.pk, id, data);
}

// ─── Cheque Books ───────────────────────────────────────────────────────────────

export async function listFinChequeBooks(): Promise<FinChequeBook[]> {
  return domainList<FinChequeBook>(FCB.name, buildQuery({}, sortDesc));
}

export async function createFinChequeBook(
  data: Partial<FinChequeBook>,
): Promise<FinChequeBook> {
  return domainCreate<FinChequeBook>(FCB.name, data);
}

export async function updateFinChequeBook(
  id: number,
  data: Partial<FinChequeBook>,
): Promise<FinChequeBook> {
  return domainUpdate<FinChequeBook>(FCB.name, FCB.pk, id, data);
}

// ─── Transactions (Income & Expenses) ─────────────────────────────────────────

// ─── Check Issues ───────────────────────────────────────────────────────────────

export async function listFinChequeIssuesByEntity(
  accountEntityId: number,
): Promise<FinChequeIssue[]> {
  if (!accountEntityId) return [];
  // Using standard domainList; adjust if backend requires a specific endpoint
  return domainList<FinChequeIssue>(
    "FinChequeIssue",
    buildQuery(
      { "AccountEntity.accountEntityId": accountEntityId },
      { field: "chequeIssueId", direction: "DESC" },
    ),
  );
}

export async function createFinChequeIssue(
  data: Partial<FinChequeIssue>,
): Promise<FinChequeIssue> {
  return domainCreate<FinChequeIssue>("FinChequeIssue", data);
}

export async function updateFinChequeIssue(
  id: number,
  data: Partial<FinChequeIssue>,
): Promise<FinChequeIssue> {
  return domainUpdate<FinChequeIssue>(
    "FinChequeIssue",
    "chequeIssueId",
    id,
    data,
  );
}

export async function listFinTransactions(): Promise<FinTransaction[]> {
  return domainList<FinTransaction>(FT.name, buildQuery({}, sortDesc));
}

export async function createFinTransaction(
  data: Partial<FinTransaction>,
): Promise<FinTransaction> {
  return domainCreate<FinTransaction>(FT.name, data);
}

export async function updateFinTransaction(
  id: number,
  data: Partial<FinTransaction>,
): Promise<FinTransaction> {
  return domainUpdate<FinTransaction>(FT.name, FT.pk, id, data);
}

export async function uploadFinTransactionVoucher(
  finTransactionId: number,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("finTransactionId", String(finTransactionId));
  formData.append("file", file, file.name);
  await uploadFile(FINANCE_API.UPLOAD_TRANSACTION_VOUCHER, formData);
}

export async function listIncomeExpenseTypes(): Promise<GeneralDetailOption[]> {
  const rows = await listGeneralDetailsByMaster(GM_CODES.INCOME_EXPENSES_TYPES);
  return rows.map((r) => ({
    generalDetailId: r.generalDetailId,
    generalDetailCode: r.generalDetailCode,
    generalDetailName: r.generalDetailName,
    generalDetailDisplayName:
      r.generalDetailDisplayName != null
        ? String(r.generalDetailDisplayName)
        : undefined,
  }));
}

// ─── Finance reports (books, budget) ────────────────────────────────────────────

export async function fetchFinanceBookReport(
  reportFlag: string,
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  const data = await getAllRecords<StoredProcRows>(FINANCE_API.FIN_REPORTS, {
    in_flag: reportFlag,
    ...params,
  });
  return firstResultSet<FinBudgetReportRow>(data);
}

export async function fetchFinanceBudgetReport(
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  // Angular budget-estimations / budget-approval getDetailsList:
  // in_flag=financial_budget_report with org/college/emp always 0 (filters use entity + FY + major type).
  // Defaults must win over cascade.toBudgetParams so those ids are not overridden.
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    FINANCE_API.FIN_BUDGET_DETAILS,
    {
      ...params,
      in_flag: "financial_budget_report",
      in_org_id: 0,
      in_college_id: 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
      in_fin_category_id: 0,
      in_fin_subcategory_id: 0,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError("API_ERROR", message || "Failed to load budget report");
  }
  return firstResultSet<FinBudgetReportRow>(envelope.data);
}

export async function fetchFinanceBudgetDetails(
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  // Angular treats HTTP 200 + empty / "No Record(s) found." as a success toast, not an error.
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    FINANCE_API.FIN_BUDGET_DETAILS,
    {
      in_flag: "financial_budget_details",
      in_org_id: 0,
      in_college_id: 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
      in_fin_category_id: 0,
      in_fin_subcategory_id: 0,
      ...params,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError("API_ERROR", message || "Failed to load budget details");
  }
  return firstResultSet<FinBudgetReportRow>(envelope.data);
}

// ─── Budget mid-year estimations ──────────────────────────────────────────────

/** Normalize Angular domain field names onto the React table column keys. */
function normalizeMidyearEstimation(
  row: FinBudgetMidyearEstimation,
): FinBudgetMidyearEstimation {
  return {
    ...row,
    accounttype_name:
      row.accounttype_name ?? row.accountTypeName ?? row.accounttype_code,
    fin_category_name: row.fin_category_name ?? row.finCategoryName,
    sub_category_name: row.sub_category_name ?? row.finSubCategoryName,
  };
}

export async function listFinBudgetMidyearEstimations(
  accountEntityId: number,
  financialYearId: number,
): Promise<FinBudgetMidyearEstimation[]> {
  if (!accountEntityId || !financialYearId) return [];
  const rows = await domainList<FinBudgetMidyearEstimation>(
    FBM.name,
    buildQuery({
      "accountEntity.accountEntityId": accountEntityId,
      "financialYear.financialYearId": financialYearId,
    }),
  );
  return rows.map(normalizeMidyearEstimation);
}

export async function createFinBudgetMidyearEstimation(
  data: Partial<FinBudgetMidyearEstimation>,
): Promise<FinBudgetMidyearEstimation> {
  return domainCreate<FinBudgetMidyearEstimation>(FBM.name, data);
}

export async function updateFinBudgetMidyearEstimation(
  id: number,
  data: Partial<FinBudgetMidyearEstimation>,
): Promise<FinBudgetMidyearEstimation> {
  return domainUpdate<FinBudgetMidyearEstimation>(FBM.name, FBM.pk, id, data);
}

export async function addMultipleFinBudgetMidyearEstimations(
  rows: Partial<FinBudgetMidyearEstimation>[],
): Promise<void> {
  await postDetails(FINANCE_API.ADD_MULTIPLE_FIN_BUDGET_MIDYEAR, rows);
}

export async function bulkUpdateFinBudgetAllocations(
  rows: { finBudgetAllocationId: number; approvedAmount: number }[],
): Promise<void> {
  await putDetails(FINANCE_API.UPDATE_FIN_BUDGET_ALLOC, rows);
}

export async function addFinBudgetAllocationList(
  rows: Record<string, unknown>[],
): Promise<void> {
  await postDetails(FINANCE_API.ADD_FIN_BUDGET_ALLOC_LIST, rows);
}

/** Angular `addDetails(FinBudgetAllocationUrl, …)` — Budget Proposal Save. */
export async function createFinBudgetAllocation(
  data: Record<string, unknown>,
): Promise<void> {
  await domainCreate(FBA_ALLOC.name, data);
}

export async function updateFinBudgetAllocation(
  id: number,
  data: Partial<Record<string, unknown>>,
): Promise<void> {
  await domainUpdate(FBA_ALLOC.name, FBA_ALLOC.pk, id, data);
}

/**
 * Angular `update(updateFinBudgetAllocationUrl, list)` — Budget Proposal
 * row Update / bulk Save (allocation + midyear pairs).
 */
export async function putUpdateFinBudgetAllocation(
  rows: Record<string, unknown>[],
): Promise<void> {
  await putDetails(FINANCE_API.UPDATE_FIN_BUDGET_ALLOCATION, rows);
}

/**
 * Angular management-reports/income-expense-report getReport:
 * GET `getAllRecords/s_get_income_expense_summary`
 * `in_district_id=0&in_clg_id=&in_year=&in_month=0`
 *
 * Note: Angular mat-option binds `academic_year` string into the form as `academicYearId`
 * and sends that string as `in_year`.
 */
export async function fetchIncomeExpenseSummary(params: {
  collegeId: number;
  /** Academic year label (e.g. "2026-2027") — Angular form `academicYearId` option value. */
  year: string | number;
}): Promise<IncomeExpenseSummaryRow[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.INCOME_EXPENSE_SUMMARY,
    {
      in_district_id: 0,
      in_clg_id: params.collegeId,
      in_year: params.year,
      in_month: 0,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError(
      "API_ERROR",
      message || "Failed to load income & expense summary",
    );
  }
  return firstResultSet<IncomeExpenseSummaryRow>(envelope.data);
}

/**
 * Angular management-reports/expense-report getReport:
 * GET `getAllRecords/s_get_expense_summary`
 * `in_district_id=0&in_clg_id=&in_year=&in_month=0`
 *
 * Angular mat-option binds `academic_year` string as `academicYearId` → `in_year`.
 */
export async function fetchExpenseSummary(params: {
  collegeId: number;
  year: string | number;
}): Promise<ExpenseSummaryRow[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.EXPENSE_SUMMARY,
    {
      in_district_id: 0,
      in_clg_id: params.collegeId,
      in_year: params.year,
      in_month: 0,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError("API_ERROR", message || "Failed to load expense report");
  }
  return firstResultSet<ExpenseSummaryRow>(envelope.data);
}

/**
 * Angular management-reports/salary-report getReport:
 * GET `getAllRecords/s_school_wise_salaries`
 * `in_districtId=0&in_collegeId=&in_year=&in_month=0`
 *
 * Chart + other management reports use `result[0]` (row set). Angular salary-report
 * incorrectly assigns `result` itself; React uses the first result set of row objects.
 */
export async function fetchSchoolWiseSalaries(params: {
  collegeId: number;
  /** Academic year label (e.g. "2026-2027") — Angular mat-option `academic_year`. */
  year: string | number;
}): Promise<SchoolWiseSalaryRow[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.SCHOOL_WISE_SALARIES,
    {
      in_districtId: 0,
      in_collegeId: params.collegeId,
      in_year: params.year,
      in_month: 0,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError("API_ERROR", message || "Failed to load salary report");
  }
  const result = envelope.data?.result;
  if (!Array.isArray(result) || result.length === 0) return [];

  // Standard stored-proc shape: result[0] = rows[]
  const first = result[0];
  if (Array.isArray(first)) {
    if (
      first.length === 0 ||
      (typeof first[0] === "object" &&
        first[0] !== null &&
        !Array.isArray(first[0]))
    ) {
      return first as SchoolWiseSalaryRow[];
    }
  }
  // Flat list of row objects (defensive)
  if (typeof first === "object" && first !== null && !Array.isArray(first)) {
    return result as unknown as SchoolWiseSalaryRow[];
  }
  return [];
}

/**
 * Angular management-reports/library-report getReport:
 * GET `getAllRecords/s_get_library_summary`
 * `in_districtId=0&in_collegeId=&in_year=`
 */
export async function fetchLibrarySummary(params: {
  collegeId: number;
}): Promise<LibrarySummaryRow[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.LIBRARY_SUMMARY,
    {
      in_districtId: 0,
      in_collegeId: params.collegeId,
      in_year: "",
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError("API_ERROR", message || "Failed to load library report");
  }
  return firstResultSet<LibrarySummaryRow>(envelope.data);
}

/**
 * Angular management-reports/transport-report getReport:
 * GET `getAllRecords/s_get_transport_summary`
 * `in_districtId=0&in_collegeId=&in_year=`
 */
export async function fetchTransportSummary(params: {
  collegeId: number;
}): Promise<TransportSummaryRow[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.TRANSPORT_SUMMARY,
    {
      in_districtId: 0,
      in_collegeId: params.collegeId,
      in_year: "",
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError(
      "API_ERROR",
      message || "Failed to load transport report",
    );
  }
  return firstResultSet<TransportSummaryRow>(envelope.data);
}

/**
 * Angular management-reports/inventory-stock-report:
 * GET `getAllRecords/s_get_inventory_stock_summary`
 * `in_district_id=0&in_clg_id=`
 */
export async function fetchInventoryStockSummary(params: {
  collegeId: number;
}): Promise<Record<string, unknown>[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.INVENTORY_STOCK_SUMMARY,
    {
      in_district_id: 0,
      in_clg_id: params.collegeId,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError(
      "API_ERROR",
      message || "Failed to load inventory stock report",
    );
  }
  return firstResultSet<Record<string, unknown>>(envelope.data);
}

/**
 * Angular fee-reports/day-wise-expenses:
 * GET `getAllRecords/s_get_daywsie_expense_report`
 * `in_from_date=&in_to_date=&in_clg_id=`
 */
export async function fetchDayWiseExpenseReport(params: {
  collegeId: number;
  fromDate: string;
  toDate: string;
}): Promise<Record<string, unknown>[]> {
  const envelope = await getAllRecordsEnvelope<StoredProcRows>(
    DASHBOARD_API.DAY_WISE_EXPENSE,
    {
      in_from_date: params.fromDate,
      in_to_date: params.toDate,
      in_clg_id: params.collegeId,
    },
  );
  const message = envelope.message ?? "";
  if (!envelope.success) {
    if (/no\s+record(?:\(s\)|s)?/i.test(message)) return [];
    throw new AppError(
      "API_ERROR",
      message || "Failed to load day-wise expense report",
    );
  }
  return firstResultSet<Record<string, unknown>>(envelope.data);
}
