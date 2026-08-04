import { E_OFFICE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { AppError, parseApiError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";
import type {
  GeneralDetailOption,
  InvInternalIndentRow,
  InvItemMasterRow,
  InvPurchaseOrderRow,
  InvStoreRow,
  InvSupplierRow,
  OfficeLetterFormatRow,
} from "@/types/e-office";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  getAllRecords,
  postDetails,
  putDetails,
} from "./crud";
import { listCollegesByOrganization } from "./student-information";
import { listGeneralDetailsByMaster } from "./examination";

type AnyRow = Record<string, unknown>;

const PROXY = "/api/proxy";

function readStorageId(key: string): number {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis))
    return 0;
  const n = Number(globalThis.localStorage.getItem(key) ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function domainGet<T>(
  entity: string,
  pkField: string,
  pkValue: number,
): Promise<T | null> {
  const url = `${PROXY}/domain/get/${entity}?query=${encodeURIComponent(`${pkField}==${pkValue}`)}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new AppError("API_ERROR", body.message ?? `GET ${entity} failed`);
  }
  return (body.data as T) ?? null;
}

async function putMultipart(path: string, formData: FormData): Promise<void> {
  const res = await fetch(`${PROXY}/${path}`, {
    method: "PUT",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const text = await res.text();
  if (!text) return;
  const body = JSON.parse(text) as ApiResponse<unknown>;
  if (body?.success === false) {
    throw new AppError("API_ERROR", body.message ?? `PUT ${path} failed`);
  }
}

async function postMultipart(
  path: string,
  formData: FormData,
): Promise<unknown> {
  const res = await fetch(`${PROXY}/${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw parseApiError(res, body);
  }
  const text = await res.text();
  if (!text) return undefined;
  const body = JSON.parse(text) as ApiResponse<unknown>;
  if (body?.success === false) {
    throw new AppError("API_ERROR", body.message ?? `POST ${path} failed`);
  }
  return body.data;
}

// ─── Letter formats ───────────────────────────────────────────────────────────

export async function listOfficeLetterFormats(
  organizationId: number,
  collegeId: number,
): Promise<OfficeLetterFormatRow[]> {
  return domainList<OfficeLetterFormatRow>(
    ENTITIES.OFFICE_LETTER_FORMATS.name,
    buildQuery({
      "organization.organizationId": organizationId,
      "college.collegeId": collegeId,
    }),
  );
}

export async function createOfficeLetterFormat(
  data: OfficeLetterFormatRow,
): Promise<OfficeLetterFormatRow> {
  return domainCreate<OfficeLetterFormatRow>(
    ENTITIES.OFFICE_LETTER_FORMATS.name,
    data,
  );
}

export async function updateOfficeLetterFormat(
  id: number,
  data: OfficeLetterFormatRow,
): Promise<OfficeLetterFormatRow> {
  return domainUpdate<OfficeLetterFormatRow>(
    ENTITIES.OFFICE_LETTER_FORMATS.name,
    ENTITIES.OFFICE_LETTER_FORMATS.pk,
    id,
    data,
  );
}

export async function listCollegesForEOffice(organizationId: number) {
  return listCollegesByOrganization(organizationId);
}

// ─── Internal indents (item request) ─────────────────────────────────────────

export async function listInternalIndents(): Promise<InvInternalIndentRow[]> {
  return domainList<InvInternalIndentRow>(
    ENTITIES.INV_INTERNAL_INDENT.name,
    buildQuery({ isActive: true }, { field: "createdDt", direction: "DESC" }),
  );
}

export async function getInternalIndentById(
  internalIndId: number,
): Promise<InvInternalIndentRow | null> {
  return domainGet<InvInternalIndentRow>(
    ENTITIES.INV_INTERNAL_INDENT.name,
    ENTITIES.INV_INTERNAL_INDENT.pk,
    internalIndId,
  );
}

export async function createInternalIndent(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(E_OFFICE_API.INV_INTERNAL_INDENT, payload);
}

export async function updateInternalIndent(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return putDetails(E_OFFICE_API.UPDATE_INV_INTERNAL_INDENT, payload);
}

export async function listInvStores(): Promise<InvStoreRow[]> {
  return domainList<InvStoreRow>(ENTITIES.INV_STORES_MASTER.name);
}

export async function listInvSuppliers(): Promise<InvSupplierRow[]> {
  return domainList<InvSupplierRow>(ENTITIES.INV_SUPPLIER_MASTER.name);
}

export async function listInvItems(): Promise<InvItemMasterRow[]> {
  return domainList<InvItemMasterRow>(ENTITIES.INV_ITEM_MASTER.name);
}

export async function listInternalIndentTransactionTypes(): Promise<
  GeneralDetailOption[]
> {
  const rows = await listGeneralDetailsByMaster("TRANSTYPE");
  return rows.filter(
    (r) =>
      String(r.generalDetailCode ?? "").toUpperCase() === "INTERNAL INDENT",
  ) as GeneralDetailOption[];
}

// ─── Purchase orders (payment note) ──────────────────────────────────────────

export async function listPurchaseOrders(): Promise<InvPurchaseOrderRow[]> {
  return domainList<InvPurchaseOrderRow>(
    ENTITIES.INV_PURCHASE_ORDER.name,
    buildQuery({ isActive: true }, { field: "createdDt", direction: "DESC" }),
  );
}

export async function getPurchaseOrderById(
  poId: number,
): Promise<InvPurchaseOrderRow | null> {
  return domainGet<InvPurchaseOrderRow>(
    ENTITIES.INV_PURCHASE_ORDER.name,
    ENTITIES.INV_PURCHASE_ORDER.pk,
    poId,
  );
}

export async function listPoTypes(): Promise<GeneralDetailOption[]> {
  return listGeneralDetailsByMaster("POTYPE") as Promise<GeneralDetailOption[]>;
}

export async function listTransactionTypes(): Promise<GeneralDetailOption[]> {
  return listGeneralDetailsByMaster("TRANSTYPE") as Promise<
    GeneralDetailOption[]
  >;
}

/** Indents approved for PO linkage (workflow stage 3 or 4). */
export async function listIndentsForPaymentNote(): Promise<
  InvInternalIndentRow[]
> {
  const rows = await listInternalIndents();
  return rows.filter(
    (r) => r.internalIndWfStage === 3 || r.internalIndWfStage === 4,
  );
}

type PoRefFiles = {
  poRefFileDoc1?: File | null;
  poRefFileDoc2?: File | null;
  /** Comparative statement → `poRefFileDoc1` */
  comparative?: File | null;
  /** Note document → `poRefFileDoc2` */
  note?: File | null;
};

function resolvePoRefFiles(files?: PoRefFiles): {
  poRefFileDoc1: File | null;
  poRefFileDoc2: File | null;
} {
  return {
    poRefFileDoc1: files?.poRefFileDoc1 ?? files?.comparative ?? null,
    poRefFileDoc2: files?.poRefFileDoc2 ?? files?.note ?? null,
  };
}

function buildInvPurchaseOrderFormData(
  payload: Record<string, unknown>,
  files?: PoRefFiles,
): FormData {
  const { poRefFileDoc1: file1, poRefFileDoc2: file2 } =
    resolvePoRefFiles(files);
  const dto = payload;
  const formData = new FormData();

  formData.append(
    "data",
    new Blob([JSON.stringify(dto)], {
      type: "application/json",
    }),
  );

  // required=false — append only when selected
  if (file1) formData.append("poRefFileDoc1", file1);
  if (file2) formData.append("poRefFileDoc2", file2);

  return formData;
}

/**
 * Angular `addOrder`: always multipart
 * `data` = Blob JSON (`application/json`)
 * `poRefFileDoc1` = Comparative Statement (optional)
 * `poRefFileDoc2` = P.O. Ref / note document (optional)
 */
export async function createPurchaseOrderMultipart(
  payload: Record<string, unknown>,
  files?: PoRefFiles,
): Promise<unknown> {
  return postMultipart(
    E_OFFICE_API.INV_PO,
    buildInvPurchaseOrderFormData(payload, files),
  );
}

export async function updatePurchaseOrderMultipart(
  payload: Record<string, unknown>,
  files?: PoRefFiles,
): Promise<void> {
  await putMultipart(
    E_OFFICE_API.UPDATE_INV_PURCHASE_ORDER,
    buildInvPurchaseOrderFormData(payload, files),
  );
}

export async function completePurchaseOrder(
  poId: number,
  poStatusCatdetId: number,
): Promise<void> {
  await updatePurchaseOrderMultipart({ poId, poStatusCatdetId });
}

export async function getFinanceBudgetDetails(
  params: Record<string, string | number>,
): Promise<AnyRow> {
  const groups = await getAllRecords<AnyRow[][]>(
    E_OFFICE_API.FIN_BUDGET_DETAILS,
    params,
  );
  return groups?.[0]?.[0] ?? {};
}

export async function getFinanceDetailsByCode(
  params: Record<string, string | number>,
): Promise<AnyRow[]> {
  const data = await getAllRecords<AnyRow[][] | { result?: unknown[][] }>(
    E_OFFICE_API.FIN_DETAILS,
    params,
  );
  const flat: AnyRow[] = [];

  if (
    data &&
    typeof data === "object" &&
    "result" in data &&
    Array.isArray(data.result)
  ) {
    for (const g of data.result) {
      if (Array.isArray(g)) flat.push(...(g as AnyRow[]));
    }
    return flat;
  }

  for (const g of (data as AnyRow[][]) ?? []) {
    if (Array.isArray(g)) flat.push(...g);
  }
  return flat;
}

/** Finance entity / year / account-type rows for payment note (Angular `fin_entity_filter`). */
export async function getFinanceEntityFilters(
  orgId: number,
  employeeId: number,
): Promise<AnyRow[]> {
  return getFinanceDetailsByCode({
    in_flag: "fin_entity_filter",
    in_org_id: orgId || 0,
    in_college_id: 0,
    in_financial_year_id: 0,
    in_academic_year_id: 0,
    in_account_type_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: "",
    in_employee: "",
    in_gm_codes: "",
  });
}

/** Context ids from session storage (Angular localStorage parity). */
export function getEOfficeContextIds() {
  return {
    collegeId: readStorageId("collegeId"),
    universityId: readStorageId("universityId"),
    academicYearId: readStorageId("academicYearId"),
    employeeId: readStorageId("employeeId"),
    empDeptId: readStorageId("empDeptId"),
  };
}
