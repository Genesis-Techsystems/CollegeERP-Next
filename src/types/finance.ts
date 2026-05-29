/** Finance module — AccountEntity, masters, bank & cheque (Angular `finance/`). */

export interface AccountEntity {
  accountEntityId: number
  collegeId?: number
  collegeCode?: string
  entityName: string
  entityCode: string
  isActive: boolean
  reason?: string
}

export interface FinAccountType {
  accountTypeId: number
  collegeId?: number
  collegeCode?: string
  accountEntityId?: number
  entityCode?: string
  accounttypeCode: string
  accounttypeName: string
  parentAccountTypeId?: number | null
  parentAccounttypeCode?: string
  majorAccountTypeId?: number
  majorAccountTypeGDCode?: string
  isGroupAccount?: boolean
  isActive: boolean
  reason?: string
}

export interface FinCategory {
  finCategoryId: number
  collegeId?: number
  collegeCode?: string
  accountTypeId?: number
  accounttypeCode?: string
  categoryName: string
  categoryCode: string
  isActive: boolean
  reason?: string
}

export interface FinSubCategory {
  finSubCategoryId: number
  collegeId?: number
  collegeCode?: string
  finCategoryId?: number
  subCategoryName: string
  subCategoryDescription?: string
  isActive: boolean
  reason?: string
}

export interface FinBankAccount {
  bankAccountId: number
  collegeId?: number
  accountEntityId?: number
  entityName?: string
  bankId?: number
  bankCode?: string
  bankName?: string
  branchCode?: string
  bankAccountNo?: string
  accountNumber?: string
  ifscCode?: string
  accountDescription?: string
  isActive: boolean
  reason?: string
}

export interface FinChequeBook {
  chequeBookId: number
  finBankAccountId?: number
  bankAccountId?: number
  bankName?: string
  bankAccountNo?: string
  chequebookSerialNo?: string
  noOfChequeleafs?: number
  startNumber?: number
  endNumber?: number
  noOfChequeLeafsIssued?: number
  isActive: boolean
  reason?: string
}

export type GeneralDetailOption = {
  generalDetailId: number
  generalDetailCode?: string
  generalDetailName?: string
  generalDetailDisplayName?: string
}

/** Row from `s_get_financialdetails_bycode` with `in_flag=fin_entity_filter`. */
export type FinanceEntityFilterRow = {
  fk_college_id?: number
  college_code?: string
  clg_sort_order?: number
  pk_acc_entity_id?: number
  entity_code?: string
  pk_financial_year_id?: number
  financial_year?: string
  pk_account_type_id?: number
  accounttype_name?: string
}

export type FinBudgetReportRow = Record<string, unknown> & {
  pk_finbudgetallocation_id?: number
  accounttype_name?: string
  fin_category_name?: string
  sub_category_name?: string
  actuals_for_the_prv_yr?: number | null
  approved_amount?: number | null
  actual_amount?: number | null
  probablesfornext_n_months?: number | null
  nextyr_proposed_amount?: number | null
  nextyr_proposed_amountt?: number | null
  fk_acc_entity_id?: number
  fk_fin_category_id?: number
  fk_fin_sub_categoory_id?: number
  pk_account_type_id?: number
  nxtfy_fk_financial_year_id?: number
  actual_tilldate?: number | null
}

export interface FinBudgetMidyearEstimation {
  finBudgetMidyrEstimationId: number
  accountEntityId?: number
  financialYearId?: number
  finCategoryId?: number
  finSubCategoryId?: number
  accountTypeId?: number
  accounttype_name?: string
  accounttype_code?: string
  fin_category_name?: string
  sub_category_name?: string
  actualAmount?: number | null
  estimatedAmount?: number | null
  nextyrProposedAmount?: number | null
  estimationFromDate?: string
  estimationToDate?: string
  isActive?: boolean
  reason?: string | null
}

export interface FinTransaction {
  finTransactionId: number
  collegeId?: number
  accountEntityId?: number
  accountentityName?: string
  financialYearId?: number
  accountTypeId?: number
  finCategoryId?: number
  finSubCategoryId?: number
  finCategoryCode?: string
  finSubCategoryCode?: string
  vouchertypeCatdetId?: number
  vouchertypeCatdetCode?: string
  transactionNumber?: string
  title?: string
  amount?: number
  transactionDate?: string
  description?: string
  voucherUrl?: string
  isActive?: boolean
  reason?: string
}
