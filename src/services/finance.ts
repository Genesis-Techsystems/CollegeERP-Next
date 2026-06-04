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
} from '@/types/finance'
import { FINANCE_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { GM_CODES } from '@/config/constants/ui'
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  getAllRecords,
  postDetails,
  putDetails,
  uploadFile,
} from './crud'
import { getFinanceEntityFilters } from './e-office'
import { listGeneralDetailsByMaster } from './examination'

export { getFinanceEntityFilters }

const EA = ENTITIES.FIN_ACCOUNT_ENTITY
const AT = ENTITIES.FIN_ACCOUNT_TYPE
const FC = ENTITIES.FIN_CATEGORY
const FSC = ENTITIES.FIN_SUB_CATEGORY
const FBA = ENTITIES.FIN_BANK_ACCOUNT
const FCB = ENTITIES.FIN_CHEQUE_BOOK
const FT = ENTITIES.FIN_TRANSACTION
const FBM = ENTITIES.FIN_BUDGET_MIDYEAR
const FBA_ALLOC = ENTITIES.FIN_BUDGET_ALLOCATION

const sortDesc = { field: 'createdDt', direction: 'DESC' as const }

type StoredProcRows = { result?: unknown[][] }

function firstResultSet<T>(data: StoredProcRows | null | undefined): T[] {
  const block = data?.result?.[0]
  return Array.isArray(block) ? (block as T[]) : []
}

// ─── Account Entity ───────────────────────────────────────────────────────────

export async function listAccountEntities(): Promise<AccountEntity[]> {
  return domainList<AccountEntity>(EA.name, buildQuery({}, sortDesc))
}

export async function listAccountEntitiesByCollege(collegeId: number): Promise<AccountEntity[]> {
  if (!collegeId) return []
  return domainList<AccountEntity>(
    EA.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }, { field: 'entityName', direction: 'ASC' }),
  )
}

export async function createAccountEntity(data: Partial<AccountEntity>): Promise<AccountEntity> {
  return domainCreate<AccountEntity>(EA.name, data)
}

export async function updateAccountEntity(
  id: number,
  data: Partial<AccountEntity>,
): Promise<AccountEntity> {
  return domainUpdate<AccountEntity>(EA.name, EA.pk, id, data)
}

// ─── Account Types ────────────────────────────────────────────────────────────

export async function listFinAccountTypes(): Promise<FinAccountType[]> {
  return domainList<FinAccountType>(AT.name, buildQuery({}, sortDesc))
}

export async function listFinAccountTypesByCollege(collegeId: number): Promise<FinAccountType[]> {
  if (!collegeId) return []
  return domainList<FinAccountType>(
    AT.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }, { field: 'accounttypeCode', direction: 'ASC' }),
  )
}

export async function createFinAccountType(data: Partial<FinAccountType>): Promise<FinAccountType> {
  return domainCreate<FinAccountType>(AT.name, data)
}

export async function updateFinAccountType(
  id: number,
  data: Partial<FinAccountType>,
): Promise<FinAccountType> {
  return domainUpdate<FinAccountType>(AT.name, AT.pk, id, data)
}

export async function listFinMajorAccountTypes(): Promise<GeneralDetailOption[]> {
  const rows = await listGeneralDetailsByMaster(GM_CODES.MAJOR_ACCOUNT_TYPE)
  return rows.map((r) => ({
    generalDetailId: r.generalDetailId,
    generalDetailCode: r.generalDetailCode,
    generalDetailName: r.generalDetailName,
  }))
}

// ─── Finance Categories ─────────────────────────────────────────────────────────

export async function listFinCategories(): Promise<FinCategory[]> {
  return domainList<FinCategory>(FC.name, buildQuery({}, sortDesc))
}

export async function listFinCategoriesByCollegeAndAccountType(
  collegeId: number,
  accountTypeId: number,
): Promise<FinCategory[]> {
  if (!collegeId || !accountTypeId) return []
  return domainList<FinCategory>(
    FC.name,
    buildQuery(
      {
        'College.collegeId': collegeId,
        'accountTypeId.accountTypeId': accountTypeId,
        isActive: true,
      },
      { field: 'finCategoryId', direction: 'DESC' },
    ),
  )
}

export async function createFinCategory(data: Partial<FinCategory>): Promise<FinCategory> {
  return domainCreate<FinCategory>(FC.name, data)
}

export async function updateFinCategory(id: number, data: Partial<FinCategory>): Promise<FinCategory> {
  return domainUpdate<FinCategory>(FC.name, FC.pk, id, data)
}

// ─── Finance Sub Categories ───────────────────────────────────────────────────

export async function listFinSubCategories(): Promise<FinSubCategory[]> {
  return domainList<FinSubCategory>(FSC.name, buildQuery({}, sortDesc))
}

export async function listFinSubCategoriesByCategory(finCategoryId: number): Promise<FinSubCategory[]> {
  if (!finCategoryId) return []
  return domainList<FinSubCategory>(
    FSC.name,
    buildQuery(
      { 'FinCategory.finCategoryId': finCategoryId, isActive: true },
      { field: 'finSubCategoryId', direction: 'DESC' },
    ),
  )
}

export async function createFinSubCategory(data: Partial<FinSubCategory>): Promise<FinSubCategory> {
  return domainCreate<FinSubCategory>(FSC.name, data)
}

export async function updateFinSubCategory(
  id: number,
  data: Partial<FinSubCategory>,
): Promise<FinSubCategory> {
  return domainUpdate<FinSubCategory>(FSC.name, FSC.pk, id, data)
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function listFinBankAccounts(): Promise<FinBankAccount[]> {
  return domainList<FinBankAccount>(FBA.name, buildQuery({}, sortDesc))
}

export async function createFinBankAccount(data: Partial<FinBankAccount>): Promise<FinBankAccount> {
  return domainCreate<FinBankAccount>(FBA.name, data)
}

export async function updateFinBankAccount(
  id: number,
  data: Partial<FinBankAccount>,
): Promise<FinBankAccount> {
  return domainUpdate<FinBankAccount>(FBA.name, FBA.pk, id, data)
}

// ─── Cheque Books ───────────────────────────────────────────────────────────────

export async function listFinChequeBooks(): Promise<FinChequeBook[]> {
  return domainList<FinChequeBook>(FCB.name, buildQuery({}, sortDesc))
}

export async function createFinChequeBook(data: Partial<FinChequeBook>): Promise<FinChequeBook> {
  return domainCreate<FinChequeBook>(FCB.name, data)
}

export async function updateFinChequeBook(
  id: number,
  data: Partial<FinChequeBook>,
): Promise<FinChequeBook> {
  return domainUpdate<FinChequeBook>(FCB.name, FCB.pk, id, data)
}

// ─── Transactions (Income & Expenses) ─────────────────────────────────────────

export async function listFinTransactions(): Promise<FinTransaction[]> {
  return domainList<FinTransaction>(FT.name, buildQuery({}, sortDesc))
}

export async function createFinTransaction(data: Partial<FinTransaction>): Promise<FinTransaction> {
  return domainCreate<FinTransaction>(FT.name, data)
}

export async function updateFinTransaction(
  id: number,
  data: Partial<FinTransaction>,
): Promise<FinTransaction> {
  return domainUpdate<FinTransaction>(FT.name, FT.pk, id, data)
}

export async function uploadFinTransactionVoucher(
  finTransactionId: number,
  file: File,
): Promise<void> {
  const formData = new FormData()
  formData.append('finTransactionId', String(finTransactionId))
  formData.append('file', file, file.name)
  await uploadFile(FINANCE_API.UPLOAD_TRANSACTION_VOUCHER, formData)
}

export async function listIncomeExpenseTypes(): Promise<GeneralDetailOption[]> {
  const rows = await listGeneralDetailsByMaster(GM_CODES.INCOME_EXPENSES_TYPES)
  return rows.map((r) => ({
    generalDetailId: r.generalDetailId,
    generalDetailCode: r.generalDetailCode,
    generalDetailName: r.generalDetailName,
    generalDetailDisplayName:
      r.generalDetailDisplayName != null ? String(r.generalDetailDisplayName) : undefined,
  }))
}

// ─── Finance reports (books, budget) ────────────────────────────────────────────

export async function fetchFinanceBookReport(
  reportFlag: string,
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  const data = await getAllRecords<StoredProcRows>(FINANCE_API.FIN_REPORTS, {
    in_flag: reportFlag,
    ...params,
  })
  return firstResultSet<FinBudgetReportRow>(data)
}

export async function fetchFinanceBudgetReport(
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  const data = await getAllRecords<StoredProcRows>(FINANCE_API.FIN_BUDGET_DETAILS, {
    in_flag: 'financial_budget_report',
    in_org_id: 0,
    in_college_id: 0,
    in_loginuser_empid: 0,
    in_loginuser_roleid: 0,
    in_fin_category_id: 0,
    in_fin_subcategory_id: 0,
    ...params,
  })
  return firstResultSet<FinBudgetReportRow>(data)
}

export async function fetchFinanceBudgetDetails(
  params: Record<string, string | number>,
): Promise<FinBudgetReportRow[]> {
  const data = await getAllRecords<StoredProcRows>(FINANCE_API.FIN_BUDGET_DETAILS, {
    in_flag: 'financial_budget_details',
    in_org_id: 0,
    in_college_id: 0,
    in_loginuser_empid: 0,
    in_loginuser_roleid: 0,
    in_fin_category_id: 0,
    in_fin_subcategory_id: 0,
    ...params,
  })
  return firstResultSet<FinBudgetReportRow>(data)
}

// ─── Budget mid-year estimations ──────────────────────────────────────────────

export async function listFinBudgetMidyearEstimations(
  accountEntityId: number,
  financialYearId: number,
): Promise<FinBudgetMidyearEstimation[]> {
  if (!accountEntityId || !financialYearId) return []
  return domainList<FinBudgetMidyearEstimation>(
    FBM.name,
    buildQuery({
      'accountEntity.accountEntityId': accountEntityId,
      'financialYear.financialYearId': financialYearId,
    }),
  )
}

export async function createFinBudgetMidyearEstimation(
  data: Partial<FinBudgetMidyearEstimation>,
): Promise<FinBudgetMidyearEstimation> {
  return domainCreate<FinBudgetMidyearEstimation>(FBM.name, data)
}

export async function updateFinBudgetMidyearEstimation(
  id: number,
  data: Partial<FinBudgetMidyearEstimation>,
): Promise<FinBudgetMidyearEstimation> {
  return domainUpdate<FinBudgetMidyearEstimation>(FBM.name, FBM.pk, id, data)
}

export async function addMultipleFinBudgetMidyearEstimations(
  rows: Partial<FinBudgetMidyearEstimation>[],
): Promise<void> {
  await postDetails(FINANCE_API.ADD_MULTIPLE_FIN_BUDGET_MIDYEAR, rows)
}

export async function bulkUpdateFinBudgetAllocations(
  rows: { finBudgetAllocationId: number; approvedAmount: number }[],
): Promise<void> {
  await putDetails(FINANCE_API.UPDATE_FIN_BUDGET_ALLOC, rows)
}

export async function addFinBudgetAllocationList(
  rows: Record<string, unknown>[],
): Promise<void> {
  await postDetails(FINANCE_API.ADD_FIN_BUDGET_ALLOC_LIST, rows)
}

export async function updateFinBudgetAllocation(
  id: number,
  data: Partial<Record<string, unknown>>,
): Promise<void> {
  await domainUpdate(FBA_ALLOC.name, FBA_ALLOC.pk, id, data)
}
