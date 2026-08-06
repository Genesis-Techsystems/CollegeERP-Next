/** Finance module — AccountEntity, masters, bank & cheque (Angular `finance/`). */

export interface AccountEntity {
  accountEntityId: number;
  collegeId?: number;
  collegeCode?: string;
  entityName: string;
  entityCode: string;
  isActive: boolean;
  reason?: string;
  /** Required on Angular updateDetails payload */
  createdDt?: string | null;
}

export interface FinAccountType {
  accountTypeId: number;
  collegeId?: number;
  collegeCode?: string;
  accountEntityId?: number;
  /** Angular list cell: `row.accountEntityCode` */
  accountEntityCode?: string;
  entityCode?: string;
  accounttypeCode: string;
  accounttypeName: string;
  parentAccountTypeId?: number | null;
  parentAccounttypeCode?: string;
  majorAccountTypeId?: number;
  majorAccountTypeGDCode?: string;
  isGroupAccount?: boolean;
  isActive: boolean;
  reason?: string;
}

export interface FinCategory {
  finCategoryId: number;
  collegeId?: number;
  collegeCode?: string;
  accountTypeId?: number;
  accounttypeCode?: string;
  categoryName: string;
  categoryCode: string;
  isActive: boolean;
  reason?: string;
  /** Required on Angular updateDetails payload */
  createdDt?: string | null;
}

export interface FinSubCategory {
  finSubCategoryId?: number;
  id?: number;
  collegeId?: number;
  collegeCode?: string;
  finCategoryId?: number;
  accountTypeId?: number;
  subCategoryName: string;
  subCategoryDescription?: string;
  isActive: boolean;
  isUnderIncome?: boolean;
  reason?: string;
}

export interface FinBankAccount {
  bankAccountId: number;
  collegeId?: number;
  accountEntityId?: number;
  entityName?: string;
  bankId?: number;
  bankCode?: string;
  bankName?: string;
  branchCode?: string;
  bankAccountNo?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountDescription?: string;
  isActive: boolean;
  reason?: string;
}

export interface FinChequeBook {
  chequeBookId: number;
  finBankAccountId?: number;
  bankAccountId?: number;
  bankName?: string;
  bankAccountNo?: string;
  chequebookSerialNo?: string;
  noOfChequeleafs?: number;
  startNumber?: number;
  endNumber?: number;
  noOfChequeLeafsIssued?: number;
  isActive: boolean;
  reason?: string;
}

export type GeneralDetailOption = {
  generalDetailId: number;
  generalDetailCode?: string;
  generalDetailName?: string;
  generalDetailDisplayName?: string;
};

/** Row from `s_get_financialdetails_bycode` with `in_flag=fin_entity_filter`. */
export type FinanceEntityFilterRow = {
  fk_college_id?: number;
  college_code?: string;
  clg_sort_order?: number;
  pk_acc_entity_id?: number;
  entity_code?: string;
  pk_financial_year_id?: number;
  financial_year?: string;
  pk_account_type_id?: number;
  accounttype_name?: string;
  accounttype_code?: string;
  /** Major / transaction type category (budget estimations filter). */
  fk_major_accounttype_catdet_id?: number;
  transaction_type?: string;
  fin_order?: number;
};

export type FinBudgetReportRow = Record<string, unknown> & {
  pk_finbudgetallocation_id?: number;
  accounttype_name?: string;
  /** Angular budget-approval Name Of The Account column. */
  accounttype_code?: string;
  fin_category_name?: string;
  sub_category_name?: string;
  transaction_type?: string;
  actuals_for_the_prv_yr?: number | null;
  approved_amount?: number | null;
  actual_amount?: number | null;
  probablesfornext_n_months?: number | null;
  nextyr_proposed_amount?: number | null;
  nextyr_proposed_amountt?: number | null;
  fk_acc_entity_id?: number;
  fk_fin_category_id?: number;
  fk_fin_sub_categoory_id?: number;
  pk_account_type_id?: number;
  nxtfy_fk_financial_year_id?: number;
  actual_tilldate?: number | null;
  pk_finbudgetmidyrestimation_id?: number;
  estimation_fromdate?: string;
  estimation_todate?: string;
  cr_fin_startdate?: string;
  cr_fin_enddate?: string;
  /** Angular report header meta (from first row). */
  Pr_Yr?: string;
  financial_year?: string;
  f_8month_date?: string;
  t_8month_date?: string;
  f_4month_date?: string;
  t_4month_date?: string;
  nxt_yr?: string;
};

/** Row from `s_get_income_expense_summary` (management Income & Expense Report). */
export type IncomeExpenseSummaryRow = Record<string, unknown> & {
  district_name?: string;
  college_shortname?: string;
  Year?: string | number;
  Month?: string;
  TotalIncome?: number | null;
  TotalExpense?: number | null;
  /** Client-only stable AG Grid row id. */
  __rowKey?: string;
};

/** Row from `s_get_expense_summary` (management Expense Report). */
export type ExpenseSummaryRow = Record<string, unknown> & {
  college_shortname?: string;
  Year?: string | number;
  Month?: string;
  Category?: string;
  TotalExpense?: number | null;
  /** Client-only stable AG Grid row id. */
  __rowKey?: string;
};

/**
 * Row from `s_school_wise_salaries` (management Salary Report / school-wise salaries chart).
 * Column headers are derived from response keys (Angular HTML still shows stale fee columns).
 */
export type SchoolWiseSalaryRow = Record<string, unknown> & {
  district_name?: string;
  college_shortname?: string;
  Year?: string | number;
  month?: string | number;
  Month?: string | number;
  Amount?: number | null;
  pk_district_id?: number;
  pk_college_id?: number;
  /** Client-only stable AG Grid row id. */
  __rowKey?: string;
};

/** Row from `s_get_library_summary` (management Library Report). */
export type LibrarySummaryRow = Record<string, unknown> & {
  college_shortname?: string;
  Year?: string | number;
  Title?: string;
  Publisher?: string;
  Author?: string;
  /** API returns spaced key; also accept camel/Pascal without space. */
  "Total Books"?: number | null;
  TotalBooks?: number | null;
  __rowKey?: string;
};

/** Row from `s_get_transport_summary` (management Transport Report). */
export type TransportSummaryRow = Record<string, unknown> & {
  college_code?: string;
  district_name?: string;
  Type?: string;
  Count?: number | null;
  __rowKey?: string;
};

export interface FinBudgetMidyearEstimation {
  finBudgetMidyrEstimationId: number;
  accountEntityId?: number;
  financialYearId?: number;
  finCategoryId?: number;
  finSubCategoryId?: number;
  accountTypeId?: number;
  /** List may return Angular camelCase (`accountTypeName`) or snake_case. */
  accounttype_name?: string;
  accountTypeName?: string;
  accounttype_code?: string;
  fin_category_name?: string;
  finCategoryName?: string;
  sub_category_name?: string;
  finSubCategoryName?: string;
  actualAmount?: number | null;
  estimatedAmount?: number | null;
  nextyrProposedAmount?: number | null;
  estimationFromDate?: string;
  estimationToDate?: string;
  estimatedByEmpId?: number;
  nextyrProposedByEmpId?: number;
  isActive?: boolean;
  reason?: string | null;
}

export interface FinTransaction {
  finTransactionId: number;
  collegeId?: number;
  accountEntityId?: number;
  accountentityName?: string;
  financialYearId?: number;
  accountTypeId?: number;
  finCategoryId?: number;
  finSubCategoryId?: number;
  finCategoryCode?: string;
  finSubCategoryCode?: string;
  vouchertypeCatdetId?: number;
  vouchertypeCatdetCode?: string;
  transactionNumber?: string;
  title?: string;
  amount?: number;
  transactionDate?: string;
  description?: string;
  voucherUrl?: string;
  isActive?: boolean;
  reason?: string;
}
