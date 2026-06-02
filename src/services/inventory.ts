import type {
  InvStore,
  InvUom,
  InvSupplier,
  InvItemCategory,
  InvItemSubCategory,
  InvBrand,
  InvItem,
  InvOpeningStock,
  InvPurchaseOrderListRow,
  InvStockReceiptVoucher,
  InvSrvItemRow,
  InvPurchaseReturn,
  InvPurchaseReturnItemRow,
  InvInternalIndentListRow,
  InvInternalIssue,
  InvInternalIssueDetail,
  InvInternalReturn,
  InvInternalReturnDetail,
  InvStockLedger,
} from '@/types/inventory'
import { ENTITIES } from '@/config/constants/entities'
import { E_OFFICE_API } from '@/config/constants/api'
import { buildQuery, domainList, domainCreate, domainUpdate, postDetails } from './crud'

type AnyRow = Record<string, unknown>

const ES = ENTITIES.INV_STORES_MASTER
const EU = ENTITIES.INV_UOM_MASTER
const ESP = ENTITIES.INV_SUPPLIER_MASTER
const EIC = ENTITIES.INV_ITEM_CATEGORY
const EISC = ENTITIES.INV_ITEM_SUB_CATEGORY
const EB = ENTITIES.INV_BRAND_MASTER
const EI = ENTITIES.INV_ITEM_MASTER
const EOS = ENTITIES.INV_ITEM_OPENING_STOCK
const EPO = ENTITIES.INV_PURCHASE_ORDER
const EII = ENTITIES.INV_INTERNAL_INDENT
const ESRV = ENTITIES.INV_SRV
const EPR = ENTITIES.INV_PURCHASE_RETURN
const EISS = ENTITIES.INV_INTERNAL_ISSUE
const ERET = ENTITIES.INV_INTERNAL_RETURN
const ESL = ENTITIES.INV_STOCK_LEDGER

const sortDesc = { field: 'createdDt', direction: 'DESC' as const }

// ─── Store Master ─────────────────────────────────────────────────────────────

export async function listInvStoresMaster(): Promise<InvStore[]> {
  return domainList<InvStore>(ES.name, buildQuery({}, sortDesc))
}

export async function createInvStore(data: Partial<InvStore>): Promise<InvStore> {
  return domainCreate<InvStore>(ES.name, data)
}

export async function updateInvStore(id: number, data: Partial<InvStore>): Promise<InvStore> {
  return domainUpdate<InvStore>(ES.name, ES.pk, id, data)
}

// ─── UOM Master ───────────────────────────────────────────────────────────────

export async function listInvUoms(): Promise<InvUom[]> {
  return domainList<InvUom>(EU.name, buildQuery({}, sortDesc))
}

export async function createInvUom(data: Partial<InvUom>): Promise<InvUom> {
  return domainCreate<InvUom>(EU.name, data)
}

export async function updateInvUom(id: number, data: Partial<InvUom>): Promise<InvUom> {
  return domainUpdate<InvUom>(EU.name, EU.pk, id, data)
}

// ─── Supplier Master ──────────────────────────────────────────────────────────

export async function listInvSuppliersMaster(): Promise<InvSupplier[]> {
  return domainList<InvSupplier>(ESP.name, buildQuery({}, sortDesc))
}

export async function createInvSupplier(data: Partial<InvSupplier>): Promise<InvSupplier> {
  return domainCreate<InvSupplier>(ESP.name, data)
}

export async function updateInvSupplier(id: number, data: Partial<InvSupplier>): Promise<InvSupplier> {
  return domainUpdate<InvSupplier>(ESP.name, ESP.pk, id, data)
}

// ─── Item Category ────────────────────────────────────────────────────────────

export async function listInvItemCategories(): Promise<InvItemCategory[]> {
  return domainList<InvItemCategory>(EIC.name, buildQuery({}, sortDesc))
}

export async function createInvItemCategory(data: Partial<InvItemCategory>): Promise<InvItemCategory> {
  return domainCreate<InvItemCategory>(EIC.name, data)
}

export async function updateInvItemCategory(id: number, data: Partial<InvItemCategory>): Promise<InvItemCategory> {
  return domainUpdate<InvItemCategory>(EIC.name, EIC.pk, id, data)
}

// ─── Item Sub Category ────────────────────────────────────────────────────────

export async function listInvItemSubCategories(): Promise<InvItemSubCategory[]> {
  return domainList<InvItemSubCategory>(EISC.name, buildQuery({}, sortDesc))
}

export async function createInvItemSubCategory(data: Partial<InvItemSubCategory>): Promise<InvItemSubCategory> {
  return domainCreate<InvItemSubCategory>(EISC.name, data)
}

export async function updateInvItemSubCategory(
  id: number,
  data: Partial<InvItemSubCategory>,
): Promise<InvItemSubCategory> {
  return domainUpdate<InvItemSubCategory>(EISC.name, EISC.pk, id, data)
}

// ─── Brand Master ─────────────────────────────────────────────────────────────

export async function listInvBrands(): Promise<InvBrand[]> {
  return domainList<InvBrand>(EB.name, buildQuery({}, sortDesc))
}

export async function createInvBrand(data: Partial<InvBrand>): Promise<InvBrand> {
  return domainCreate<InvBrand>(EB.name, data)
}

export async function updateInvBrand(id: number, data: Partial<InvBrand>): Promise<InvBrand> {
  return domainUpdate<InvBrand>(EB.name, EB.pk, id, data)
}

// ─── Item Master ──────────────────────────────────────────────────────────────

export async function listInvItemsMaster(): Promise<InvItem[]> {
  return domainList<InvItem>(EI.name, buildQuery({ isActive: true }, sortDesc))
}

export async function createInvItem(data: Partial<InvItem>): Promise<InvItem> {
  return domainCreate<InvItem>(EI.name, data)
}

export async function updateInvItem(id: number, data: Partial<InvItem>): Promise<InvItem> {
  return domainUpdate<InvItem>(EI.name, EI.pk, id, data)
}

// ─── Opening Stock ────────────────────────────────────────────────────────────

export async function listInvOpeningStocks(): Promise<InvOpeningStock[]> {
  return domainList<InvOpeningStock>(EOS.name, buildQuery({}, sortDesc))
}

export async function createInvOpeningStock(data: Partial<InvOpeningStock>): Promise<InvOpeningStock> {
  return domainCreate<InvOpeningStock>(EOS.name, data)
}

export async function updateInvOpeningStock(
  id: number,
  data: Partial<InvOpeningStock>,
): Promise<InvOpeningStock> {
  return domainUpdate<InvOpeningStock>(EOS.name, EOS.pk, id, data)
}

// ─── Transaction lists ────────────────────────────────────────────────────────

export async function listInvPurchaseOrders(): Promise<InvPurchaseOrderListRow[]> {
  return domainList<InvPurchaseOrderListRow>(
    EPO.name,
    buildQuery({ isActive: true }, sortDesc),
  )
}

export async function listInvInternalIndents(): Promise<InvInternalIndentListRow[]> {
  return domainList<InvInternalIndentListRow>(EII.name, buildQuery({}, sortDesc))
}

export async function listInvStockReceiptVouchers(): Promise<InvStockReceiptVoucher[]> {
  return domainList<InvStockReceiptVoucher>(ESRV.name, buildQuery({}, sortDesc))
}

export async function getInvSrvById(srvId: number): Promise<InvStockReceiptVoucher | null> {
  if (!srvId) return null
  const rows = await domainList<InvStockReceiptVoucher>(
    ESRV.name,
    buildQuery({ [ESRV.pk]: srvId }),
  )
  return rows[0] ?? null
}

export async function createInvSrv(payload: Record<string, unknown>): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_SRV, payload)
}

export async function updateInvSrv(payload: Record<string, unknown>): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_SRV, payload)
}

export async function listInvPurchaseReturns(): Promise<InvPurchaseReturn[]> {
  return domainList<InvPurchaseReturn>(EPR.name, buildQuery({}, sortDesc))
}

export async function getInvPurchaseReturnById(
  purchaseReturnId: number,
): Promise<InvPurchaseReturn | null> {
  if (!purchaseReturnId) return null
  const rows = await domainList<InvPurchaseReturn>(
    EPR.name,
    buildQuery({ [EPR.pk]: purchaseReturnId }),
  )
  return rows[0] ?? null
}

export async function createInvPurchaseReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_PURCHASE_RETURN, payload)
}

export async function updateInvPurchaseReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_PURCHASE_RETURN, payload)
}

export async function listInvInternalIssues(): Promise<InvInternalIssue[]> {
  return domainList<InvInternalIssue>(EISS.name, buildQuery({}, sortDesc))
}

export async function getInvInternalIssueById(
  interIssueId: number,
): Promise<InvInternalIssueDetail | null> {
  if (!interIssueId) return null
  const rows = await domainList<InvInternalIssueDetail>(
    EISS.name,
    buildQuery({ [EISS.pk]: interIssueId }),
  )
  return rows[0] ?? null
}

export async function createInvInternalIssue(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_ISSUE, payload)
}

export async function updateInvInternalIssue(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_ISSUE, payload)
}

export async function listInvInternalReturns(): Promise<InvInternalReturn[]> {
  return domainList<InvInternalReturn>(ERET.name, buildQuery({}, sortDesc))
}

export async function getInvInternalReturnById(
  interReturnId: number,
): Promise<InvInternalReturnDetail | null> {
  if (!interReturnId) return null
  const rows = await domainList<InvInternalReturnDetail>(
    ERET.name,
    buildQuery({ [ERET.pk]: interReturnId }),
  )
  return rows[0] ?? null
}

export async function createInvInternalReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_RETURN, payload)
}

export async function updateInvInternalReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_RETURN, payload)
}

export async function listInvStockLedgers(): Promise<InvStockLedger[]> {
  return domainList<InvStockLedger>(ESL.name, buildQuery({}, sortDesc))
}

export async function createInvStockLedger(data: Partial<InvStockLedger>): Promise<InvStockLedger> {
  return domainCreate<InvStockLedger>(ESL.name, data)
}

export async function updateInvStockLedger(
  id: number,
  data: Partial<InvStockLedger>,
): Promise<InvStockLedger> {
  return domainUpdate<InvStockLedger>(ESL.name, ESL.pk, id, data)
}

// Re-exports used by inventory modals (already in e-office)
export { listInvStores, listInvItems, listInvSuppliers } from './e-office'

export async function listEmployeesForInvStore(
  organizationId: number,
  collegeId?: number,
): Promise<AnyRow[]> {
  if (collegeId && collegeId > 0) {
    const { listEmployeesByCollege } = await import('./pre-examination')
    return listEmployeesByCollege(collegeId)
  }
  if (!organizationId) return []
  const queries = [
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
    buildQuery({ organizationId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('Employee', query)
      if (rows.length > 0) return rows
    } catch {
      // try next variant
    }
  }
  return []
}
