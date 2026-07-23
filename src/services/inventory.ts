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
} from "@/types/inventory";
import { ENTITIES } from "@/config/constants/entities";
import { E_OFFICE_API } from "@/config/constants/api";
import {
  buildQuery,
  domainList,
  domainListRawQuery,
  domainGetRawQuery,
  domainCreate,
  domainUpdate,
  fetchDetails,
  postDetails,
  putDetails,
} from "./crud";

type AnyRow = Record<string, unknown>;

const ES = ENTITIES.INV_STORES_MASTER;
const EU = ENTITIES.INV_UOM_MASTER;
const ESP = ENTITIES.INV_SUPPLIER_MASTER;
const EIC = ENTITIES.INV_ITEM_CATEGORY;
const EISC = ENTITIES.INV_ITEM_SUB_CATEGORY;
const EB = ENTITIES.INV_BRAND_MASTER;
const EI = ENTITIES.INV_ITEM_MASTER;
const EOS = ENTITIES.INV_ITEM_OPENING_STOCK;
const EPO = ENTITIES.INV_PURCHASE_ORDER;
const EII = ENTITIES.INV_INTERNAL_INDENT;
const ESRV = ENTITIES.INV_SRV;
const EPR = ENTITIES.INV_PURCHASE_RETURN;
const EISS = ENTITIES.INV_INTERNAL_ISSUE;
const ERET = ENTITIES.INV_INTERNAL_RETURN;
const ESL = ENTITIES.INV_STOCK_LEDGER;

/** Used by inventory lists that still go through encoded `domainList` + buildQuery. */
const sortDesc = { field: "createdDt", direction: "DESC" as const };

/**
 * Angular `listAllDetails(entity)`:
 * `GET domain/list/{entity}?query=order(createdDt=desc)&size=99999`
 */
function listAllDetailsAngular<T>(entity: string): Promise<T[]> {
  return domainListRawQuery<T>(entity, "order(createdDt=desc)", true);
}

/**
 * Angular modal org dropdown:
 * `listDetailsById(Organization, 'true', 'isActive')`
 * → `GET domain/list/Organization?size=99999&query=isActive==true`
 */
export async function listActiveOrganizationsForInventory(): Promise<AnyRow[]> {
  return domainListRawQuery<AnyRow>("Organization", "isActive==true", false);
}

// ─── Store Master ─────────────────────────────────────────────────────────────

export async function listInvStoresMaster(): Promise<InvStore[]> {
  return listAllDetailsAngular<InvStore>(ES.name);
}

export async function createInvStore(
  data: Partial<InvStore>,
): Promise<InvStore> {
  return domainCreate<InvStore>(ES.name, data);
}

export async function updateInvStore(
  id: number,
  data: Partial<InvStore>,
): Promise<InvStore> {
  return domainUpdate<InvStore>(ES.name, ES.pk, id, data);
}

// ─── UOM Master ───────────────────────────────────────────────────────────────

/** Angular `listAllDetails(InvUommaster)` → query=order(createdDt=desc)&size=99999 */
export async function listInvUoms(): Promise<InvUom[]> {
  return listAllDetailsAngular<InvUom>(EU.name);
}

/**
 * Angular modal parent-UOM dropdown:
 * `listDetailsByIdWithSort(InvUommaster, 'true', 'DESC', 'isActive', 'uomId')`
 * → `domain/list/InvUommaster?size=99999&query=isActive==true.order(uomId=DESC)`
 */
export async function listActiveInvUomsForParent(): Promise<InvUom[]> {
  return domainListRawQuery<InvUom>(
    EU.name,
    "isActive==true.order(uomId=DESC)",
    false,
  );
}

export async function createInvUom(data: Partial<InvUom>): Promise<InvUom> {
  return domainCreate<InvUom>(EU.name, data);
}

export async function updateInvUom(
  id: number,
  data: Partial<InvUom>,
): Promise<InvUom> {
  return domainUpdate<InvUom>(EU.name, EU.pk, id, data);
}

// ─── Supplier Master ──────────────────────────────────────────────────────────

/** Angular `listAllDetails(InvSuppliermaster)` → query=order(createdDt=desc)&size=99999 */
export async function listInvSuppliersMaster(): Promise<InvSupplier[]> {
  return listAllDetailsAngular<InvSupplier>(ESP.name);
}

/** Angular `listAllDetails(State)` for supplier modal state dropdown. */
export async function listStatesForInvSupplier(): Promise<AnyRow[]> {
  return listAllDetailsAngular<AnyRow>("State");
}

/**
 * Angular `listDetailsById(District, stateId, 'State.stateId')`
 * → `domain/list/District?size=99999&query=State.stateId=={id}`
 */
export async function listDistrictsForInvSupplier(
  stateId: number,
): Promise<AnyRow[]> {
  if (!stateId) return [];
  return domainListRawQuery<AnyRow>(
    "District",
    `State.stateId==${stateId}`,
    false,
  );
}

/**
 * Angular `listDetailsById(City, districtId, 'District.districtId')`
 * → `domain/list/City?size=99999&query=District.districtId=={id}`
 */
export async function listCitiesForInvSupplier(
  districtId: number,
): Promise<AnyRow[]> {
  if (!districtId) return [];
  return domainListRawQuery<AnyRow>(
    "City",
    `District.districtId==${districtId}`,
    false,
  );
}

export async function createInvSupplier(
  data: Partial<InvSupplier>,
): Promise<InvSupplier> {
  return domainCreate<InvSupplier>(ESP.name, data);
}

export async function updateInvSupplier(
  id: number,
  data: Partial<InvSupplier>,
): Promise<InvSupplier> {
  return domainUpdate<InvSupplier>(ESP.name, ESP.pk, id, data);
}

// ─── Item Category ────────────────────────────────────────────────────────────

export async function listInvItemCategories(): Promise<InvItemCategory[]> {
  return listAllDetailsAngular<InvItemCategory>(EIC.name);
}

export async function createInvItemCategory(
  data: Partial<InvItemCategory>,
): Promise<InvItemCategory> {
  return domainCreate<InvItemCategory>(EIC.name, data);
}

export async function updateInvItemCategory(
  id: number,
  data: Partial<InvItemCategory>,
): Promise<InvItemCategory> {
  return domainUpdate<InvItemCategory>(EIC.name, EIC.pk, id, data);
}

// ─── Item Sub Category ────────────────────────────────────────────────────────

export async function listInvItemSubCategories(): Promise<
  InvItemSubCategory[]
> {
  return listAllDetailsAngular<InvItemSubCategory>(EISC.name);
}

export async function createInvItemSubCategory(
  data: Partial<InvItemSubCategory>,
): Promise<InvItemSubCategory> {
  return domainCreate<InvItemSubCategory>(EISC.name, data);
}

export async function updateInvItemSubCategory(
  id: number,
  data: Partial<InvItemSubCategory>,
): Promise<InvItemSubCategory> {
  return domainUpdate<InvItemSubCategory>(EISC.name, EISC.pk, id, data);
}

// ─── Brand Master ─────────────────────────────────────────────────────────────

/** Angular `listAllDetails(InvBrandmaster)` → query=order(createdDt=desc)&size=99999 */
export async function listInvBrands(): Promise<InvBrand[]> {
  return listAllDetailsAngular<InvBrand>(EB.name);
}

export async function createInvBrand(
  data: Partial<InvBrand>,
): Promise<InvBrand> {
  return domainCreate<InvBrand>(EB.name, data);
}

export async function updateInvBrand(
  id: number,
  data: Partial<InvBrand>,
): Promise<InvBrand> {
  return domainUpdate<InvBrand>(EB.name, EB.pk, id, data);
}

// ─── Item Master ──────────────────────────────────────────────────────────────

/** Angular `listAllDetails(InvItemmaster)` → query=order(createdDt=desc)&size=99999 */
export async function listInvItemsMaster(): Promise<InvItem[]> {
  return listAllDetailsAngular<InvItem>(EI.name);
}

/**
 * Angular item-type dropdown:
 * `listDetailsByTwoIds(GeneralDetail, 'ITEMCATTYPE', 'true', 'GeneralMaster.generalMasterCode', 'isActive')`
 * → `domain/list/GeneralDetail?size=99999&query=GeneralMaster.generalMasterCode==ITEMCATTYPE.and.isActive==true`
 */
export async function listInvItemTypes(): Promise<AnyRow[]> {
  return domainListRawQuery<AnyRow>(
    "GeneralDetail",
    "GeneralMaster.generalMasterCode==ITEMCATTYPE.and.isActive==true",
    false,
  );
}

/**
 * Angular subcategory dropdown on category change:
 * `listDetailsByTwoIds(InvItemsubcategory, itemCategoryId, 'true', 'InvItemcategory.itemCategoryId', 'isActive')`
 * → `…?size=99999&query=InvItemcategory.itemCategoryId=={id}.and.isActive==true`
 */
export async function listInvItemSubCategoriesByCategory(
  itemCategoryId: number,
): Promise<InvItemSubCategory[]> {
  if (!itemCategoryId) return [];
  return domainListRawQuery<InvItemSubCategory>(
    EISC.name,
    `InvItemcategory.itemCategoryId==${itemCategoryId}.and.isActive==true`,
    false,
  );
}

export async function createInvItem(data: Partial<InvItem>): Promise<InvItem> {
  return domainCreate<InvItem>(EI.name, data);
}

export async function updateInvItem(
  id: number,
  data: Partial<InvItem>,
): Promise<InvItem> {
  return domainUpdate<InvItem>(EI.name, EI.pk, id, data);
}

// ─── Opening Stock ────────────────────────────────────────────────────────────

/** Angular `listAllDetails(InvItemopeningStock)` → query=order(createdDt=desc)&size=99999 */
export async function listInvOpeningStocks(): Promise<InvOpeningStock[]> {
  return listAllDetailsAngular<InvOpeningStock>(EOS.name);
}

/**
 * Angular opening-stock academic-year dropdown:
 * `listDetailsByIdWithSort(AcademicYear, 'true', 'DESC', 'isActive', 'fromDate')`
 * → `domain/list/AcademicYear?size=99999&query=isActive==true.order(fromDate=DESC)`
 */
export async function listAcademicYearsForInvOpeningStock(): Promise<AnyRow[]> {
  return domainListRawQuery<AnyRow>(
    "AcademicYear",
    "isActive==true.order(fromDate=DESC)",
    false,
  );
}

export async function createInvOpeningStock(
  data: Partial<InvOpeningStock>,
): Promise<InvOpeningStock> {
  return domainCreate<InvOpeningStock>(EOS.name, data);
}

export async function updateInvOpeningStock(
  id: number,
  data: Partial<InvOpeningStock>,
): Promise<InvOpeningStock> {
  return domainUpdate<InvOpeningStock>(EOS.name, EOS.pk, id, data);
}

// ─── Transaction lists ────────────────────────────────────────────────────────

export async function listInvPurchaseOrders(): Promise<
  InvPurchaseOrderListRow[]
> {
  /**
   * Angular `listDetailsByIdWithSort(InvPurchaseOrder, true, 'DESC', 'isActive', 'createdDt')`
   * → `domain/list/InvPurchaseOrder?size=99999&query=isActive==true.order(createdDt=DESC)`
   */
  return domainListRawQuery<InvPurchaseOrderListRow>(
    EPO.name,
    "isActive==true.order(createdDt=DESC)",
    false,
  );
}

/**
 * Angular add-PO account types:
 * `listDetailsByTwoIdsWithSort(FinAccountType, collegeId, 'true', 'desc', 'College.collegeId', 'isActive', 'accountTypeId')`
 */
export async function listFinAccountTypesForInvPo(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  return domainListRawQuery<AnyRow>(
    "FinAccountType",
    `College.collegeId==${collegeId}.and.isActive==true.order(accountTypeId=desc)`,
    false,
  );
}

/**
 * FinancialYear for inventory PO:
 * `Universities.universityId=={id}.and.isActive==true.order(financialYearId=desc)`
 *
 * Resolves universityId from localStorage / College when not passed (session often
 * has collegeId but empty universityId, which previously skipped this call).
 */
export async function listFinancialYearsForInvPo(
  universityId: number,
  collegeId = 0,
): Promise<AnyRow[]> {
  let uid = Number(universityId) || 0;
  if (
    !uid &&
    typeof globalThis !== "undefined" &&
    "localStorage" in globalThis
  ) {
    uid = Number(globalThis.localStorage.getItem("universityId") ?? 0) || 0;
  }
  if (!uid && collegeId > 0) {
    const colleges = await domainList<AnyRow>(
      ENTITIES.COLLEGE.name,
      buildQuery({ [ENTITIES.COLLEGE.pk]: collegeId }),
    );
    uid = Number(colleges[0]?.universityId ?? 0) || 0;
    if (
      uid > 0 &&
      typeof globalThis !== "undefined" &&
      "localStorage" in globalThis
    ) {
      globalThis.localStorage.setItem("universityId", String(uid));
    }
  }
  if (!uid) return [];
  return domainListRawQuery<AnyRow>(
    "FinancialYear",
    `Universities.universityId==${uid}.and.isActive==true.order(financialYearId=desc)`,
    false,
  );
}

/**
 * Angular item select:
 * `getDetailsById(InvItemopeningStock, itemId, 'InvItemmaster.itemId')`
 * → `domain/get/InvItemopeningStock?query=InvItemmaster.itemId=={id}`
 */
export async function getInvOpeningStockByItemId(
  itemId: number,
): Promise<{ itemPrice?: number; qty?: number } | null> {
  if (!itemId) return null;
  const url = `/api/proxy/domain/get/${EOS.name}?query=${encodeURIComponent(`InvItemmaster.itemId==${itemId}`)}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    success?: boolean;
    data?: { itemPrice?: number; qty?: number };
  };
  if (!body.success || !body.data) return null;
  return body.data;
}

/** Angular edit: `PUT updateInvPurchaseOrder` with JSON body (not multipart). */
export async function updateInvPurchaseOrderJson(
  data: Record<string, unknown>,
): Promise<unknown> {
  return putDetails(E_OFFICE_API.UPDATE_INV_PURCHASE_ORDER, data);
}

/** Angular `listAllDetails(InvInternalIndent)` → query=order(createdDt=desc)&size=99999 */
export async function listInvInternalIndents(): Promise<
  InvInternalIndentListRow[]
> {
  return listAllDetailsAngular<InvInternalIndentListRow>(EII.name);
}

/**
 * Angular `getDetailsById(InvInternalIndent, id, 'internalIndId')`
 * → `domain/get/InvInternalIndent?query=internalIndId=={id}`
 */
export async function getInvInternalIndentById(
  internalIndId: number,
): Promise<InvInternalIndentListRow | null> {
  if (!internalIndId) return null;
  try {
    const data = await domainGetRawQuery<InvInternalIndentListRow>(
      EII.name,
      `internalIndId==${internalIndId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Angular create: `POST invInternalIndent` with JSON body
 * (`postDetailsByRequest(invInternalIndentCrudUrl, '', details)`).
 */
export async function createInvInternalIndent(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_INDENT, payload);
}

/**
 * Angular edit: `PUT updateInvInternalIndent` with JSON body
 * (`update(internalIUndentUrl, updateData)`).
 */
export async function updateInvInternalIndent(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return putDetails(E_OFFICE_API.UPDATE_INV_INTERNAL_INDENT, payload);
}

/**
 * Angular form Trans. Type dropdown:
 * `listDetailsByTwoIds(GeneralDetail, 'TRANSTYPE', 'true', GeneralMaster.generalMasterCode, isActive)`
 * → all active TRANSTYPE details (not filtered to INTERNAL INDENT).
 */
export async function listTransTypesForInternalIndent(): Promise<AnyRow[]> {
  return domainListRawQuery<AnyRow>(
    "GeneralDetail",
    "GeneralMaster.generalMasterCode==TRANSTYPE.and.isActive==true",
    false,
  );
}

export async function listInvStockReceiptVouchers(): Promise<
  InvStockReceiptVoucher[]
> {
  /** Angular `listAllDetails(InvSrv)` → query=order(createdDt=desc)&size=99999 */
  return listAllDetailsAngular<InvStockReceiptVoucher>(ESRV.name);
}

/**
 * Angular add-SRV PO dropdown:
 * `listDetailsByIdWithSort(InvPurchaseOrder, 'true', 'DESC', 'isActive', 'poId')`
 * → `isActive==true.order(poId=DESC)`
 */
export async function listPurchaseOrdersForSrv(): Promise<
  InvPurchaseOrderListRow[]
> {
  return domainListRawQuery<InvPurchaseOrderListRow>(
    EPO.name,
    "isActive==true.order(poId=DESC)",
    false,
  );
}

export async function getInvSrvById(
  srvId: number,
): Promise<InvStockReceiptVoucher | null> {
  if (!srvId) return null;
  /** Angular `getDetailsById(InvSrv, id, 'srvId')` → domain/get/InvSrv?query=srvId=={id} */
  try {
    const data = await domainGetRawQuery<InvStockReceiptVoucher>(
      ESRV.name,
      `srvId==${srvId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function createInvSrv(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_SRV, payload);
}

export async function updateInvSrv(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_SRV, payload);
}

export async function listInvPurchaseReturns(): Promise<InvPurchaseReturn[]> {
  /** Angular `listAllDetails(InvPurchasereturn)` → query=order(createdDt=desc)&size=99999 */
  return listAllDetailsAngular<InvPurchaseReturn>(EPR.name);
}

/**
 * Angular add-PR SRV dropdown:
 * `listDetailsByIdWithSort(InvSrv, 'true', 'DESC', 'isActive', 'srvId')`
 * → `isActive==true.order(srvId=DESC)`
 */
export async function listActiveSrvsForPurchaseReturn(): Promise<
  InvStockReceiptVoucher[]
> {
  return domainListRawQuery<InvStockReceiptVoucher>(
    ESRV.name,
    "isActive==true.order(srvId=DESC)",
    false,
  );
}

export async function getInvPurchaseReturnById(
  purchaseReturnId: number,
): Promise<InvPurchaseReturn | null> {
  if (!purchaseReturnId) return null;
  /** Angular `getDetailsById(InvPurchasereturn, id, 'purchasereturnId')` */
  try {
    const data = await domainGetRawQuery<InvPurchaseReturn>(
      EPR.name,
      `purchasereturnId==${purchaseReturnId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function createInvPurchaseReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_PURCHASE_RETURN, payload);
}

export async function updateInvPurchaseReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_PURCHASE_RETURN, payload);
}

export async function listInvInternalIssues(): Promise<InvInternalIssue[]> {
  /** Angular `listAllDetails(InvInternalIssue)` → query=order(createdDt=desc)&size=99999 */
  return listAllDetailsAngular<InvInternalIssue>(EISS.name);
}

/**
 * Angular add-issue indent dropdown:
 * `listDetailsByIdWithSort(InvInternalIndent, 'true', 'DESC', 'isActive', 'internalIndId')`
 * → `isActive==true.order(internalIndId=DESC)`
 */
export async function listActiveIndentsForInternalIssue(): Promise<
  InvInternalIndentListRow[]
> {
  return domainListRawQuery<InvInternalIndentListRow>(
    EII.name,
    "isActive==true.order(internalIndId=DESC)",
    false,
  );
}

/**
 * Angular `getDetailsById(InvInternalIssue, id, 'interIssueId')`
 * → `domain/get/InvInternalIssue?query=interIssueId=={id}`
 */
export async function getInvInternalIssueById(
  interIssueId: number,
): Promise<InvInternalIssueDetail | null> {
  if (!interIssueId) return null;
  try {
    const data = await domainGetRawQuery<InvInternalIssueDetail>(
      EISS.name,
      `interIssueId==${interIssueId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Angular create/edit: `addMasterDetails('invinternalissue', details)` → POST
 */
export async function createInvInternalIssue(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_ISSUE, payload);
}

export async function updateInvInternalIssue(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_ISSUE, payload);
}

/**
 * Angular To Employee typeahead:
 * `listByTwoIds(employeesearch, term, 'ACTV', 'q', 'empStatus')`
 * → `GET employeesearch?q={term}&empStatus=ACTV`
 */
export async function searchEmployeesForInternalIssue(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length < 4) return [];

  const paths = ["employeesearch", "cms/employeesearch"] as const;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, { q, empStatus: "ACTV" });
      if (Array.isArray(data)) return data as AnyRow[];
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
        if (Array.isArray(obj.content)) return obj.content as AnyRow[];
        if (Array.isArray(obj.result)) return obj.result as AnyRow[];
      }
    } catch {
      // try next path
    }
  }
  return [];
}

export async function listInvInternalReturns(): Promise<InvInternalReturn[]> {
  /** Angular `listAllDetails(InvInternalReturn)` → query=order(createdDt=desc)&size=99999 */
  return listAllDetailsAngular<InvInternalReturn>(ERET.name);
}

/**
 * Angular add-return Issue No dropdown:
 * `listDetailsByIdWithSort(InvInternalIssue, 'true', 'DESC', 'isActive', 'interIssueId')`
 * → `isActive==true.order(interIssueId=DESC)`
 */
export async function listActiveIssuesForInternalReturn(): Promise<
  InvInternalIssue[]
> {
  return domainListRawQuery<InvInternalIssue>(
    EISS.name,
    "isActive==true.order(interIssueId=DESC)",
    false,
  );
}

/**
 * Angular `getDetailsById(InvInternalReturn, id, 'interReturnId')`
 * → `domain/get/InvInternalReturn?query=interReturnId=={id}`
 */
export async function getInvInternalReturnById(
  interReturnId: number,
): Promise<InvInternalReturnDetail | null> {
  if (!interReturnId) return null;
  try {
    const data = await domainGetRawQuery<InvInternalReturnDetail>(
      ERET.name,
      `interReturnId==${interReturnId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Angular create/edit: `addMasterDetails('invinternalreturn', details)` → POST
 */
export async function createInvInternalReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_RETURN, payload);
}

export async function updateInvInternalReturn(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_RETURN, payload);
}

/** Angular `listAllDetails(InvStockledger)` → query=order(createdDt=desc)&size=99999 */
export async function listInvStockLedgers(): Promise<InvStockLedger[]> {
  return listAllDetailsAngular<InvStockLedger>(ESL.name);
}

/** Angular create: `addDetails(InvStockledger, details)` → POST domain/create/InvStockledger */
export async function createInvStockLedger(
  data: Partial<InvStockLedger>,
): Promise<InvStockLedger> {
  return domainCreate<InvStockLedger>(ESL.name, data);
}

/**
 * Angular update: `updateDetails(InvStockledger, details, stockledgerId, 'stockledgerId')`
 * → PUT domain/update/InvStockledger?query=stockledgerId=={id}
 */
export async function updateInvStockLedger(
  id: number,
  data: Partial<InvStockLedger>,
): Promise<InvStockLedger> {
  return domainUpdate<InvStockLedger>(ESL.name, ESL.pk, id, data);
}

// Re-exports used by inventory modals (already in e-office)
export { listInvStores, listInvItems, listInvSuppliers } from "./e-office";

/**
 * Angular stores-master modal:
 * `listDetailsById(collegeCrudUrl, organizationId, getDetailsByOrganizationIdUrl)`
 * → `domain/list/College?size=99999&query=Organization.organizationId=={id}`
 */
export async function listCollegesForInvStore(
  organizationId: number,
): Promise<AnyRow[]> {
  if (!organizationId) return [];
  return domainList<AnyRow>(
    "College",
    buildQuery({ "Organization.organizationId": organizationId }),
  );
}

/**
 * Angular stores-master modal:
 * `listByIds(employeeSearchUrl, term, 'q')` when term length > 4
 * → `GET employeesearch?q={term}`
 */
export async function searchEmployeesForInvStore(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length < 4) return [];

  const paths = ["employeesearch", "cms/employeesearch"] as const;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, { q });
      if (Array.isArray(data)) return data as AnyRow[];
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
        if (Array.isArray(obj.content)) return obj.content as AnyRow[];
        if (Array.isArray(obj.result)) return obj.result as AnyRow[];
      }
    } catch {
      // try next path
    }
  }
  return [];
}
