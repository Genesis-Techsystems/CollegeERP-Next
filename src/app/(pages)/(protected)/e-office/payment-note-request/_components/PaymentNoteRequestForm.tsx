"use client";

/**
 * Angular `add-payment-note-request` parity — New / Edit Purchase Order.
 * Reuses existing e-office services only (no new APIs).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  EyeIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { QK } from "@/lib/query-keys";
import { resolveOrganizationId } from "@/lib/user-context";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import { cn } from "@/lib/utils";
import {
  createPurchaseOrderMultipart,
  getEOfficeContextIds,
  getFinanceBudgetDetails,
  getFinanceEntityFilters,
  getInvOpeningStockByItemId,
  getPurchaseOrderById,
  listIndentsForPaymentNote,
  listInvItems,
  listInvStores,
  listInvSuppliers,
  listPoTypes,
  listTransactionTypes,
  updatePurchaseOrderMultipart,
} from "@/services";
import type { InvPoItemRow } from "@/types/e-office";
import {
  PaymentNotePreviewDialog,
  type PaymentNotePreviewData,
} from "./PaymentNotePreviewDialog";

const PO_TYPE_WITH_INDENT = 463;

/** Angular-style file picker: blue "Choose File" + filename / "No file chosen". */
function FileChooseField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center text-sm">
      <span className="mr-4 shrink-0 font-medium text-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        className="h-8 bg-[hsl(var(--primary))] px-3 text-xs text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
        onClick={() => inputRef.current?.click()}
      >
        Choose File
      </Button>
      <span className="ml-2 truncate text-xs text-muted-foreground">
        {file?.name ?? "No file chosen"}
      </span>
    </div>
  );
}

type ItemLine = InvPoItemRow & { key: string; isActive?: boolean };

type OrderTotals = {
  poActualAmount: number;
  sgst: number;
  igst: number;
  shippingCharges: number;
  otherCharges: number;
  poNetCost: number;
  termsconditions: string;
  subjectText: string;
  requestText: string;
  requestText2: string;
  requestText3: string;
  poComments: string;
};

function newLine(): ItemLine {
  return {
    key: crypto.randomUUID(),
    isActive: true,
    unitPrice: 0,
    orderQuantity: 0,
    itemDiscountPercentage: 0,
    itemTotalCost: 0,
  };
}

function calcLine(row: ItemLine): ItemLine {
  let cost = (Number(row.unitPrice) || 0) * (Number(row.orderQuantity) || 0);
  const disc = Number(row.itemDiscountPercentage) || 0;
  if (disc > 0) cost -= (cost * disc) / 100;
  return { ...row, itemTotalCost: cost };
}

/** Strip UI-only `key` — Spring rejects unknown fields with 422. */
function toInvPoItemPayload(l: ItemLine, employeeId: number) {
  return {
    isActive: l.isActive !== false,
    itemCode: l.itemCode ?? "TEST",
    itemId: Number(l.itemId) || 0,
    unitPrice: Number(l.unitPrice) || 0,
    orderQuantity: Number(l.orderQuantity) || 0,
    receivedQty: Number(l.receivedQty ?? l.orderQuantity) || 0,
    isReqTracking: true,
    itemTotalActualAmount:
      Number(l.itemTotalActualAmount) ||
      (Number(l.unitPrice) || 0) * (Number(l.orderQuantity) || 0),
    itemDiscountPercentage: Number(l.itemDiscountPercentage) || 0,
    itemTaxPercentage: Number(l.itemTaxPercentage) || 0,
    itemTotalDiscountAmount: Number(l.itemTotalDiscountAmount) || 0,
    itemTotalCost: Number(l.itemTotalCost) || 0,
    itemName: l.itemName ?? "",
    authorizedByEmpId: Number(l.authorizedByEmpId) || employeeId,
    reason: l.reason ?? "",
    igst: Number(l.igst) || 0,
  };
}

/** Angular selectedAccountType paymentNoteFlag rules. */
function resolvePaymentNoteFlag(
  templateName: string,
  subjectTextCode: string,
): number {
  const zeroTemplates = [
    "Telephone Charges",
    "Electricity Charges",
    "General Maintenance & Repairs Up Keep",
    "Imprest",
    "Printing & Stationery",
  ];
  if (zeroTemplates.includes(templateName)) return 0;
  if (subjectTextCode === "SPLACCT") return 2;
  return 1;
}

function calcTotals(lines: ItemLine[], totals: OrderTotals): OrderTotals {
  const poActualAmount = lines
    .filter((l) => l.isActive !== false)
    .reduce((s, l) => s + (Number(l.itemTotalCost) || 0), 0);
  // Angular: igst stays 0 until calGst runs; when sgst>0, igst = gross + gst%
  let igst =
    Number(totals.sgst) > 0
      ? poActualAmount + (poActualAmount * totals.sgst) / 100
      : 0;
  let poNetCost = Number(totals.sgst) > 0 ? igst : poActualAmount;
  poNetCost += Number(totals.shippingCharges) || 0;
  poNetCost += Number(totals.otherCharges) || 0;
  return { ...totals, poActualAmount, igst, poNetCost };
}

/** Angular numToWords for purchaseOrderAmount / budget words. */
function numToWords(num: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const nStr = Math.floor(Math.abs(num)).toString();
  if (nStr.length > 9) return "overflow";
  const n = `000000000${nStr}`
    .slice(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    Number(n[1]) !== 0
      ? `${a[Number(n[1])] || `${b[Number(n[1][0])]} ${a[Number(n[1][1])]}`}crore `
      : "";
  str +=
    Number(n[2]) !== 0
      ? `${a[Number(n[2])] || `${b[Number(n[2][0])]} ${a[Number(n[2][1])]}`}lakh `
      : "";
  str +=
    Number(n[3]) !== 0
      ? `${a[Number(n[3])] || `${b[Number(n[3][0])]} ${a[Number(n[3][1])]}`}thousand `
      : "";
  str +=
    Number(n[4]) !== 0
      ? `${a[Number(n[4])] || `${b[Number(n[4][0])]} ${a[Number(n[4][1])]}`}hundred `
      : "";
  str +=
    Number(n[5]) !== 0
      ? `${str !== "" ? "and " : ""}${a[Number(n[5])] || `${b[Number(n[5][0])]} ${a[Number(n[5][1])]}`}`
      : "";
  return str;
}

export function PaymentNoteRequestForm({
  poId,
  listPath = "/e-office/payment-note-request",
}: {
  poId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const orgId = resolveOrganizationId(user) || 1;
  const { employeeId } = useLoginEmployeeId(user, sessionLoading);
  const ctx = getEOfficeContextIds();
  const isEdit = Boolean(poId && poId > 0);

  const [poTypeId, setPoTypeId] = useState<string | null>(null);
  const [indentId, setIndentId] = useState<string | null>(null);
  const [transTypeId, setTransTypeId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState<string | null>(null);
  const [accountTypeId, setAccountTypeId] = useState<string | null>(null);
  const [poDate, setPoDate] = useState<Date | undefined>(new Date());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");
  const [lines, setLines] = useState<ItemLine[]>([newLine()]);
  const [originalPoItems, setOriginalPoItems] = useState<InvPoItemRow[]>([]);
  const [totals, setTotals] = useState<OrderTotals>({
    poActualAmount: 0,
    sgst: 0,
    igst: 0,
    shippingCharges: 0,
    otherCharges: 0,
    poNetCost: 0,
    termsconditions: "",
    subjectText: "",
    requestText: "",
    requestText2: "",
    requestText3: "",
    poComments: "",
  });
  const [comparativeFile, setComparativeFile] = useState<File | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [storeCollegeId, setStoreCollegeId] = useState(0);
  const [budget, setBudget] = useState<Record<string, unknown> | null>(null);
  const [paymentNoteFlag, setPaymentNoteFlag] = useState(1);
  const [templateName, setTemplateName] = useState("");
  const [subjectTextCode, setSubjectTextCode] = useState("");
  const [entityType, setEntityType] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [paymentNoteOpen, setPaymentNoteOpen] = useState(true);
  /** Skip cascade clears while hydrating edit payload. */
  const hydratingEditRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<{
    poTypeId?: string;
    indentId?: string;
    transTypeId?: string;
    storeId?: string;
    supplierId?: string;
    entityId?: string;
    financialYearId?: string;
    accountTypeId?: string;
    items?: string;
  }>({});

  // Angular init: POTYPE + Indents + Itemmaster (always)
  const { data: poTypes = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "poTypes"],
    queryFn: listPoTypes,
  });
  const { data: indents = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "indentsForPo"],
    queryFn: listIndentsForPaymentNote,
  });
  const { data: items = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "items"],
    queryFn: listInvItems,
  });

  // Angular selectedPoType → TRANSTYPE
  const { data: transTypes = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "transTypes", "purchase", poTypeId],
    queryFn: listTransactionTypes,
    enabled: Boolean(poTypeId),
  });

  // Angular selectedTransactionType → InvStoresmaster (refetch whenever PO type changes)
  const { data: stores = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "stores", poTypeId, transTypeId],
    queryFn: listInvStores,
    enabled: Boolean(transTypeId),
  });

  // Angular selectedStore → InvSuppliermaster
  const { data: suppliers = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "suppliers", storeId],
    queryFn: listInvSuppliers,
    enabled: Boolean(storeId),
  });

  // Angular selectedSupplier → fin_entity_filter
  const financeEnabled = Boolean(supplierId && storeCollegeId);
  const { data: financeData } = useQuery({
    queryKey: [
      ...QK.eOffice.lookup(),
      "financeEntities",
      orgId,
      employeeId,
      supplierId,
      storeCollegeId,
    ],
    queryFn: () => getFinanceEntityFilters(orgId, employeeId),
    enabled: financeEnabled,
  });
  const finRows = financeEnabled ? (financeData ?? []) : [];

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.eOffice.purchaseOrder(poId ?? 0),
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: isEdit,
  });

  const showIndent = Number(poTypeId) === PO_TYPE_WITH_INDENT;

  /** Angular getTransactionGeneralDetails: auto-pick PURCHASE INDENT after TRANSTYPE loads. */
  useEffect(() => {
    if (!poTypeId || transTypes.length === 0) return;
    if (isEdit && hydratingEditRef.current && transTypeId) return;
    const purchase = transTypes.find((t) => {
      const code = String(t.generalDetailCode ?? "").toUpperCase();
      const name = String(t.generalDetailDisplayName ?? "").toUpperCase();
      return code === "PURCHASE INDENT" || name === "PURCHASE INDENT";
    });
    if (purchase?.generalDetailId != null) {
      setTransTypeId(String(purchase.generalDetailId));
    }
  }, [poTypeId, transTypes, isEdit, transTypeId]);

  const clearDownstreamFromPoType = useCallback(() => {
    if (hydratingEditRef.current) return;
    setIndentId(null);
    setStoreId(null);
    setSupplierId(null);
    setEntityId(null);
    setFinancialYearId(null);
    setAccountTypeId(null);
    setBudget(null);
    setStoreCollegeId(0);
  }, []);

  const clearDownstreamFromStore = useCallback(() => {
    if (hydratingEditRef.current) return;
    setSupplierId(null);
    setEntityId(null);
    setFinancialYearId(null);
    setAccountTypeId(null);
    setBudget(null);
  }, []);

  const clearDownstreamFromSupplier = useCallback(() => {
    if (hydratingEditRef.current) return;
    setEntityId(null);
    setFinancialYearId(null);
    setAccountTypeId(null);
    setBudget(null);
  }, []);

  useEffect(() => {
    if (!existing) return;
    hydratingEditRef.current = true;
    setPoTypeId(
      existing.potypeCatdetId ? String(existing.potypeCatdetId) : null,
    );
    setTransTypeId(
      existing.invTranstypeCatdetId
        ? String(existing.invTranstypeCatdetId)
        : null,
    );
    setStoreId(existing.storeId ? String(existing.storeId) : null);
    setSupplierId(existing.supplierId ? String(existing.supplierId) : null);
    setFinancialYearId(
      existing.financialYearId ? String(existing.financialYearId) : null,
    );
    setAccountTypeId(
      existing.accountTypeId ? String(existing.accountTypeId) : null,
    );
    // Angular edit: accountEntityId form ← editdata.entityTypeId
    const entId = existing.entityTypeId ?? existing.accountEntityId;
    if (entId != null && Number(entId) > 0) {
      setEntityId(String(entId));
    }
    setInvoiceNo(existing.invoiceNo ?? "");
    setIsActive(existing.isActive ?? true);
    if (existing.poDate) {
      const d = new Date(existing.poDate);
      if (!Number.isNaN(d.getTime())) setPoDate(d);
    }
    if (existing.invInternalIndentIds) {
      setIndentId(String(existing.invInternalIndentIds));
    }
    const rawItems = existing.invPoItems ?? [];
    setOriginalPoItems(rawItems);
    const itemRows = rawItems.map((it) => ({
      ...it,
      key: String(it.poItemId ?? crypto.randomUUID()),
      isActive: true,
    }));
    setLines(itemRows.length ? itemRows : [newLine()]);
    setTotals((t) => ({
      ...t,
      poActualAmount: Number(existing.poActualAmount) || 0,
      sgst: Number(existing.sgst) || 0,
      igst: Number(existing.igst) || 0,
      shippingCharges: Number(existing.shippingCharges) || 0,
      otherCharges: Number(existing.otherCharges) || 0,
      poNetCost: Number(existing.poNetCost) || 0,
      termsconditions: String(existing.termsconditions ?? ""),
      subjectText: String(existing.subjectText ?? ""),
      requestText: String(existing.requestText ?? ""),
      requestText2: String(existing.requestText2 ?? ""),
      requestText3: String(existing.requestText3 ?? ""),
      poComments: String(existing.poComments ?? ""),
    }));
    setTemplateName(
      String(existing.templateName ?? existing.accounttypeName ?? ""),
    );
    setSubjectTextCode(
      String(existing.subjectTextCode ?? existing.accounttypeCode ?? ""),
    );
    setEntityType(String(existing.entityType ?? ""));
    setPaymentNoteFlag(
      resolvePaymentNoteFlag(
        String(existing.templateName ?? existing.accounttypeName ?? ""),
        String(existing.subjectTextCode ?? existing.accounttypeCode ?? ""),
      ),
    );
    // Keep hydrate flag until finance cascade can apply (Angular sets entity after filters load)
    const t = window.setTimeout(() => {
      hydratingEditRef.current = false;
    }, 2500);
    return () => window.clearTimeout(t);
  }, [existing]);

  // Edit: once stores load, set college id for finance (Angular store.collegeIds)
  useEffect(() => {
    if (!isEdit || !storeId || stores.length === 0) return;
    const st = stores.find((s) => String(s.storeId) === storeId);
    const clg = Number(st?.collegeIds ?? st?.collegeId ?? 0);
    if (clg) setStoreCollegeId(clg);
  }, [isEdit, storeId, stores]);

  // Angular: after fin_entity_filter loads → set entityTypeId, then FY, then accountType
  useEffect(() => {
    if (!isEdit || !existing || finRows.length === 0 || !storeCollegeId) return;
    const entId = existing.entityTypeId ?? existing.accountEntityId;
    if (entId != null && Number(entId) > 0) {
      setEntityId(String(entId));
      const ent = finRows.find(
        (r) => Number(r.pk_acc_entity_id) === Number(entId),
      );
      setEntityType(
        String(
          ent?.entity_name ?? ent?.entity_code ?? existing.entityType ?? "",
        ),
      );
    }
    if (existing.financialYearId != null) {
      setFinancialYearId(String(existing.financialYearId));
    }
    if (existing.accountTypeId != null) {
      setAccountTypeId(String(existing.accountTypeId));
      const name = String(
        existing.accounttypeName ?? existing.templateName ?? "",
      );
      const code = String(
        existing.accounttypeCode ?? existing.subjectTextCode ?? "",
      );
      if (name) setTemplateName(name);
      if (code) setSubjectTextCode(code);
      setPaymentNoteFlag(resolvePaymentNoteFlag(name, code));
    }
  }, [isEdit, existing, finRows, storeCollegeId]);

  // Angular selectedAccountType → budget API (in_acc_entity_id always 0)
  useEffect(() => {
    if (!financialYearId || !accountTypeId || !storeCollegeId) return;
    void (async () => {
      try {
        const row = await getFinanceBudgetDetails({
          in_flag: "financial_accounttype_budget",
          in_org_id: orgId,
          in_college_id: storeCollegeId,
          in_financial_year_id: Number(financialYearId),
          in_budgetdate: "1990-01-01",
          in_loginuser_empid: ctx.employeeId || employeeId || 0,
          in_loginuser_roleid: 0,
          in_account_type_id: Number(accountTypeId),
          in_fin_category_id: 0,
          in_fin_subcategory_id: 0,
          in_acc_entity_id: 0,
          in_major_accounttype: 0,
        });
        setBudget(row);
        const approved = Number(row?.approved_amount ?? 0);
        if (!hydratingEditRef.current && !approved) {
          toastError("No Approved Amount for selected Financial year!");
        }
      } catch {
        setBudget(null);
      }
    })();
  }, [
    financialYearId,
    accountTypeId,
    storeCollegeId,
    orgId,
    ctx.employeeId,
    employeeId,
  ]);

  const onSelectPoType = useCallback(
    (v: string | null) => {
      setPoTypeId(v);
      setTransTypeId(null);
      setFieldErrors((e) => ({ ...e, poTypeId: undefined }));
      clearDownstreamFromPoType();
      if (!isEdit && Number(v) !== PO_TYPE_WITH_INDENT) {
        setLines([newLine()]);
      }
    },
    [clearDownstreamFromPoType, isEdit],
  );

  const onSelectStore = useCallback(
    (v: string | null) => {
      setStoreId(v);
      setFieldErrors((e) => ({ ...e, storeId: undefined }));
      clearDownstreamFromStore();
      const st = stores.find((s) => String(s.storeId) === v);
      // Angular selectedStore: storeClgId = store.collegeIds
      const clg = Number(st?.collegeIds ?? st?.collegeId ?? 0);
      setStoreCollegeId(clg || 0);
    },
    [stores, clearDownstreamFromStore],
  );

  const onSelectSupplier = useCallback(
    (v: string | null) => {
      setSupplierId(v);
      setFieldErrors((e) => ({ ...e, supplierId: undefined }));
      clearDownstreamFromSupplier();
    },
    [clearDownstreamFromSupplier],
  );

  const storeOptions = useMemo(() => {
    if (showIndent && indentId) {
      const ind = indents.find((i) => String(i.internalIndId) === indentId);
      if (ind) {
        return [
          {
            value: String(ind.storeId),
            label: ind.storeName ?? ind.storeCode ?? String(ind.storeId),
          },
        ];
      }
    }
    return stores.map((s) => ({
      value: String(s.storeId),
      label: s.storeCode ?? s.storeName ?? String(s.storeId),
    }));
  }, [showIndent, indentId, indents, stores]);

  const itemOptions = useMemo(() => {
    if (showIndent && indentId) {
      const ind = indents.find((i) => String(i.internalIndId) === indentId);
      const indentItems = ind?.invInternalIndentitems ?? [];
      if (indentItems.length > 0) {
        return indentItems.map((it) => ({
          value: String(it.itemId),
          label: `${it.itemName ?? ""} (${it.itemCode ?? ""})`.trim(),
        }));
      }
    }
    return items.map((it) => ({
      value: String(it.itemId),
      label: `${it.itemName ?? ""} (${it.itemCode ?? ""})`.trim(),
    }));
  }, [showIndent, indentId, indents, items]);

  const entityOptions = useMemo(() => {
    const list = finRows.filter(
      (r) => Number(r.fk_college_id) === storeCollegeId,
    );
    const seen = new Set<number>();
    return list
      .filter((r) => {
        const id = Number(r.pk_acc_entity_id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((r) => ({
        value: String(r.pk_acc_entity_id),
        label: String(r.entity_code ?? r.entity_name ?? r.pk_acc_entity_id),
      }));
  }, [finRows, storeCollegeId]);

  const yearOptions = useMemo(() => {
    if (!entityId) return [];
    const list = finRows.filter(
      (r) =>
        Number(r.fk_college_id) === storeCollegeId &&
        Number(r.pk_acc_entity_id) === Number(entityId),
    );
    const seen = new Set<number>();
    return list
      .filter((r) => {
        const id = Number(r.pk_financial_year_id);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((r) => ({
        value: String(r.pk_financial_year_id),
        label: String(r.financial_year ?? r.pk_financial_year_id),
      }));
  }, [finRows, storeCollegeId, entityId]);

  const accountOptions = useMemo(() => {
    if (!entityId || !financialYearId) return [];
    return finRows
      .filter(
        (r) =>
          Number(r.fk_college_id) === storeCollegeId &&
          Number(r.pk_acc_entity_id) === Number(entityId) &&
          Number(r.pk_financial_year_id) === Number(financialYearId),
      )
      .map((r) => ({
        value: String(r.pk_account_type_id),
        label: String(r.accounttype_name ?? r.pk_account_type_id),
      }));
  }, [finRows, storeCollegeId, entityId, financialYearId]);

  const recalc = useCallback(
    (nextLines: ItemLine[], nextTotals?: Partial<OrderTotals>) => {
      const computedLines = nextLines.map(calcLine);
      setLines(computedLines);
      setTotals((prev) => {
        const next = calcTotals(computedLines, { ...prev, ...nextTotals });
        // Angular calChange
        const words = numToWords(next.poNetCost);
        return {
          ...next,
          requestText: `We are request your to kindly sanction an amount of Rs.${next.poNetCost}/-  (Rupees ${words}only)towards imprest amount. `,
        };
      });
    },
    [],
  );

  /** Angular selectedItem → InvItemopeningStock by itemId */
  const onSelectItem = useCallback(
    async (lineKey: string, itemId: number | undefined) => {
      const master = items.find((m) => m.itemId === itemId);
      setLines((prev) => {
        let next = prev.map((l) =>
          l.key === lineKey
            ? calcLine({
                ...l,
                itemId,
                itemCode: master?.itemCode ?? l.itemCode,
                itemName: master?.itemName ?? l.itemName,
              })
            : l,
        );
        setTotals((t) => calcTotals(next, t));
        return next;
      });
      setFieldErrors((e) => ({ ...e, items: undefined }));
      if (!itemId) return;
      try {
        const stock = await getInvOpeningStockByItemId(itemId);
        if (!stock) return;
        setLines((prev) => {
          const next = prev.map((l) =>
            l.key === lineKey
              ? calcLine({
                  ...l,
                  unitPrice: Number(stock.itemPrice) || 0,
                  orderQuantity: Number(stock.qty) || 0,
                })
              : l,
          );
          setTotals((t) => calcTotals(next, t));
          return next;
        });
      } catch {
        // keep defaults when opening stock missing
      }
    },
    [items],
  );

  const applyIndent = useCallback(
    (v: string | null) => {
      setIndentId(v);
      setFieldErrors((e) => ({ ...e, indentId: undefined }));
      const ind = indents.find((i) => String(i.internalIndId) === v);
      if (ind?.storeId) {
        setStoreId(String(ind.storeId));
        clearDownstreamFromStore();
      }
      if (ind?.collegeId) setStoreCollegeId(Number(ind.collegeId));
      if (!isEdit && ind?.invInternalIndentitems?.length) {
        const mapped = ind.invInternalIndentitems.map((it) =>
          calcLine({
            ...newLine(),
            itemId: it.itemId,
            itemCode: it.itemCode,
            itemName: it.itemName,
            unitPrice: it.unitPrice ?? 0,
            orderQuantity:
              it.issuedQty ?? it.orderQuantity ?? it.indentQuantity ?? 0,
            itemDiscountPercentage: it.itemDiscountPercentage ?? 0,
            itemTotalCost: it.itemTotalCost ?? 0,
            isActive: it.isActive ?? true,
          }),
        );
        recalc(mapped.length ? mapped : [newLine()]);
      }
    },
    [indents, isEdit, clearDownstreamFromStore, recalc],
  );

  const validate = useCallback(() => {
    const next: typeof fieldErrors = {};
    if (!poTypeId) next.poTypeId = "P.O. Type is required";
    if (showIndent && !indentId) next.indentId = "Indent Number is required";
    if (!transTypeId) next.transTypeId = "Transaction Type is required";
    if (!storeId) next.storeId = "Store is required";
    if (!supplierId) next.supplierId = "Supplier is required";
    if (!entityId) next.entityId = "Entity is required";
    if (!financialYearId) next.financialYearId = "Financial Year is required";
    if (!accountTypeId) next.accountTypeId = "Account Type is required";
    const active = lines.filter((l) => l.isActive !== false && l.itemId);
    if (active.length === 0) next.items = "At least one item is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [
    poTypeId,
    showIndent,
    indentId,
    transTypeId,
    storeId,
    supplierId,
    entityId,
    financialYearId,
    accountTypeId,
    lines,
  ]);

  const previewData = useMemo((): PaymentNotePreviewData => {
    const approved = Number(budget?.approved_amount ?? 0);
    const actual = Number(budget?.actual_amount ?? 0);
    const balance = Number(budget?.balance_in_account ?? 0);
    const current = Number(totals.poNetCost) || 0;
    return {
      subjectText: totals.subjectText,
      requestText: totals.requestText,
      requestText2: totals.requestText2,
      paymentNoteFlag,
      subjectTextCode:
        subjectTextCode ||
        String(budget?.accounttype_code ?? budget?.account_type_code ?? ""),
      budgetAlloted: approved,
      soFarExpenditure: actual,
      balance,
      currentExpenditure: current,
      balanceAvailable: Number.isFinite(balance - current)
        ? balance - current
        : 0,
    };
  }, [budget, totals, paymentNoteFlag, subjectTextCode]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error("Please fill required fields");

      const supplierName =
        suppliers.find((s) => s.supplierId === Number(supplierId))
          ?.supplierName ?? "";
      const store = stores.find((s) => s.storeId === Number(storeId));
      // Angular: collegeId = storeClgId (store college)
      const collegeId =
        storeCollegeId ||
        Number(store?.collegeIds ?? store?.collegeId ?? ctx.collegeId) ||
        ctx.collegeId;

      const activeLines = lines.filter((l) => l.isActive !== false && l.itemId);
      const invPoItems = activeLines.map((l) => {
        const master = items.find((m) => m.itemId === Number(l.itemId));
        return toInvPoItemPayload(
          {
            ...l,
            itemCode: master?.itemCode ?? l.itemCode ?? "TEST",
            itemName: master?.itemName ?? l.itemName ?? "",
            receivedQty: l.orderQuantity,
          },
          ctx.employeeId || employeeId || 0,
        );
      });

      const approved = Number(budget?.approved_amount ?? 0);
      const actual = Number(budget?.actual_amount ?? 0);
      const balance = Number(budget?.balance_in_account ?? 0);
      const poNetCost = Number(totals.poNetCost) || 0;
      const amountInWords = numToWords(poNetCost);
      const budgetWords = numToWords(approved);
      const poDateIso = poDate ? toDateOnlyISO(poDate) : undefined;

      const now = new Date();
      const prevYear = now.getFullYear() - 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prev2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const monthName = (d: Date) =>
        d.toLocaleString("en-US", { month: "long" });

      const purchaseItem =
        (showIndent &&
          indents.find((i) => String(i.internalIndId) === indentId)
            ?.invInternalIndentitems?.[0]?.itemName) ||
        activeLines[0]?.itemName ||
        "Prurchase Item";

      const files = {
        poRefFileDoc1: comparativeFile,
        poRefFileDoc2: noteFile,
      };

      if (isEdit && poId) {
        const updateItems: Record<string, unknown>[] = [];
        for (const orig of originalPoItems) {
          const cur = activeLines.find(
            (l) => Number(l.itemId) === Number(orig.itemId),
          );
          if (cur && orig.poItemId) {
            updateItems.push({
              poItemId: orig.poItemId,
              itemId: cur.itemId,
              unitPrice: cur.unitPrice,
              orderQuantity: cur.orderQuantity,
              itemDiscountPercentage: cur.itemDiscountPercentage,
              itemTotalCost: cur.itemTotalCost,
            });
          }
        }
        await updatePurchaseOrderMultipart(
          {
            collegeId,
            academicYearId: ctx.academicYearId,
            storeId: Number(storeId),
            supplierId: Number(supplierId),
            potypeCatdetId: Number(poTypeId),
            invTranstypeCatdetId: Number(transTypeId),
            financialYearId: Number(financialYearId),
            accountTypeId: Number(accountTypeId),
            poDate: poDateIso,
            authorizedByEmployeeId: ctx.employeeId,
            poRaisedEmpId: ctx.employeeId,
            invoiceNo,
            templateName,
            indentApprovedDate: poDateIso,
            purchaseOrderAmount: poNetCost,
            amountInWords,
            supplierName,
            supplierBillNo: "0",
            budgetAlloted: approved,
            soFarExpenditure: actual,
            balance,
            balanceAvailable: balance - poNetCost,
            accountNumber: 10911051050083,
            telephoneChargesForTheMonth: `${monthName(prev2Month)} and ${monthName(prevMonth)} ${prevYear}`,
            telephoneNo: "040-27098811,04027070471",
            budgetAllotedInWords: budgetWords,
            requestorName: supplierName,
            purchaseItem,
            suplierName: supplierName,
            previousImprestAmountDate: "31-05-2023",
            previousImprestAmount: 2455,
            previousBalAmount: 45,
            totalBalAvailable: 2500,
            totalBalAvailableDate: 2770,
            electricityChargesPaidTo: supplierName,
            electricityChargesMonth: `${monthName(prevMonth)} ${prevYear}`,
            budgetAllotedAmountInWords: budgetWords,
            entityType,
            paymentNoteFlag,
            subjectTextCode,
            poId,
            invPoItems: updateItems,
            ...totals,
            igst: Number(totals.sgst) > 0 ? totals.igst : 0,
            totalTax: 0,
            isActive,
          },
          files,
        );
        return;
      }

      // Angular add-payment-note-request saveOrder → addOrder({ ...Obj, ...orderDetails })
      const notificationDTOList = [
        {
          isActive: true,
          notificationTitle: templateName,
          notificationEnddate: "",
          publishDate: poDateIso,
          isPublished: true,
          description: null,
          isAnnouncement: false,
          reason: "active",
          notificationAudiences: [
            {
              audienceTypeId: 6047,
              audienceTypeCode: "PRINCIPAL",
              collegeId,
              courseId: null,
              courseName: null,
              categoryName: "all",
              categoryValue: "all",
              isActive: true,
            },
          ],
          collegeId,
          academicYearId: ctx.academicYearId,
          notificationDocAvatar: {
            nativeElement: {
              __zone_symbol__changefalse: [
                {
                  type: "eventTask",
                  state: "scheduled",
                  source: "HTMLInputElement.addEventListener:change",
                  zone: "angular",
                  runCount: 2,
                },
              ],
            },
          },
          startDate: null,
          endDate: null,
        },
      ];

      const payload: Record<string, unknown> = {
        collegeId,
        academicYearId: ctx.academicYearId,
        storeId: Number(storeId),
        supplierId: Number(supplierId),
        potypeCatdetId: Number(poTypeId),
        invTranstypeCatdetId: Number(transTypeId),
        financialYearId: Number(financialYearId),
        accountTypeId: Number(accountTypeId),
        poDate: poDateIso,
        authorizedByEmployeeId: ctx.employeeId,
        poRaisedEmpId: ctx.employeeId,
        invoiceNo,
        templateName,
        indentApprovedDate: poDateIso,
        purchaseOrderAmount: poNetCost,
        amountInWords,
        supplierName,
        supplierBillNo: "0",
        budgetAlloted: approved,
        soFarExpenditure: actual,
        balance,
        balanceAvailable: balance - poNetCost,
        accountNumber: 10911051050083,
        telephoneChargesForTheMonth: `${monthName(prev2Month)} and ${monthName(prevMonth)} ${prevYear}`,
        telephoneNo: "040-27098811,04027070471",
        budgetAllotedInWords: budgetWords,
        requestorName: supplierName,
        purchaseItem,
        suplierName: supplierName,
        previousImprestAmountDate: "31-05-2023",
        previousImprestAmount: 2455,
        previousBalAmount: 45,
        totalBalAvailable: 2500,
        totalBalAvailableDate: 2770,
        electricityChargesPaidTo: supplierName,
        electricityChargesMonth: `${monthName(prevMonth)} ${prevYear}`,
        budgetAllotedAmountInWords: budgetWords,
        entityType,
        paymentNoteFlag,
        subjectTextCode,
        subjectText: totals.subjectText,
        requestText: totals.requestText,
        notificationDTOList,
        invPoItems,
        // orderDetails merge (Angular)
        igst: Number(totals.sgst) > 0 ? totals.igst : 0,
        poActualAmount: totals.poActualAmount,
        poNetCost,
        sgst: totals.sgst,
        shippingCharges: totals.shippingCharges,
        otherCharges: totals.otherCharges,
        termsconditions: totals.termsconditions,
        poComments: totals.poComments,
        totalTax: 0,
        isActive,
        requestText2: totals.requestText2,
        requestText3: totals.requestText3,
      };
      if (showIndent && indentId) {
        payload.invInternalIndentIds = String(indentId);
      }

      await createPurchaseOrderMultipart(payload, files);
    },
    onSuccess: async () => {
      toastSuccess(
        isEdit ? "Purchase order updated." : "Purchase order created.",
      );
      await queryClient.invalidateQueries({ queryKey: QK.eOffice.all });
      router.push(listPath);
    },
    onError: (err) => {
      if (
        err instanceof Error &&
        err.message === "Please fill required fields"
      ) {
        return;
      }
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit ? "Edit Purchase Order" : "New Purchase Order";
  const canSave = lines.some((l) => l.isActive !== false);

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileTextIcon className="h-4 w-4 text-[#5da394]" aria-hidden />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {title}
            </h1>
          </div>

          {loadingExisting && isEdit ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="P.O. Type"
                  required
                  value={poTypeId}
                  onChange={onSelectPoType}
                  options={poTypes.map((t) => ({
                    value: String(t.generalDetailId),
                    label:
                      t.generalDetailDisplayName ?? String(t.generalDetailId),
                  }))}
                  placeholder="P.O. Type"
                  error={fieldErrors.poTypeId}
                />
                {showIndent && (
                  <Select
                    label="Indent. No"
                    required
                    value={indentId}
                    onChange={applyIndent}
                    options={indents.map((i) => ({
                      value: String(i.internalIndId),
                      label: i.internalIndNo ?? String(i.internalIndId),
                    }))}
                    searchable
                    placeholder="Indent Number"
                    error={fieldErrors.indentId}
                    disabled={isEdit}
                  />
                )}
                <Select
                  label="Transaction Type"
                  required
                  value={transTypeId}
                  onChange={setTransTypeId}
                  options={transTypes.map((t) => ({
                    value: String(t.generalDetailId),
                    label:
                      t.generalDetailDisplayName ?? String(t.generalDetailId),
                  }))}
                  placeholder="Transaction Type"
                  error={fieldErrors.transTypeId}
                  disabled
                />
                <Select
                  label="Store"
                  required
                  value={storeId}
                  onChange={onSelectStore}
                  options={storeOptions}
                  placeholder="Store"
                  error={fieldErrors.storeId}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  label="Supplier"
                  required
                  value={supplierId}
                  onChange={onSelectSupplier}
                  options={suppliers.map((s) => ({
                    value: String(s.supplierId),
                    label: s.supplierName ?? String(s.supplierId),
                  }))}
                  searchable
                  placeholder="Supplier"
                  error={fieldErrors.supplierId}
                />
                <Select
                  label="Entity"
                  required
                  value={entityId}
                  onChange={(v) => {
                    setEntityId(v);
                    setFinancialYearId(null);
                    setAccountTypeId(null);
                    setTemplateName("");
                    setSubjectTextCode("");
                    setPaymentNoteFlag(1);
                    const ent = finRows.find(
                      (r) => String(r.pk_acc_entity_id) === v,
                    );
                    setEntityType(
                      String(ent?.entity_name ?? ent?.entity_code ?? ""),
                    );
                    setFieldErrors((e) => ({ ...e, entityId: undefined }));
                  }}
                  options={entityOptions}
                  placeholder="Entity"
                  error={fieldErrors.entityId}
                />
                <Select
                  label="Financial Year"
                  required
                  value={financialYearId}
                  onChange={(v) => {
                    setFinancialYearId(v);
                    setAccountTypeId(null);
                    setTemplateName("");
                    setSubjectTextCode("");
                    setPaymentNoteFlag(1);
                    setFieldErrors((e) => ({
                      ...e,
                      financialYearId: undefined,
                    }));
                  }}
                  options={yearOptions}
                  placeholder="Financial Year"
                  error={fieldErrors.financialYearId}
                />
                <Select
                  label="Account Type"
                  required
                  value={accountTypeId}
                  onChange={(v) => {
                    setAccountTypeId(v);
                    setFieldErrors((e) => ({
                      ...e,
                      accountTypeId: undefined,
                    }));
                    const row = finRows.find(
                      (r) => String(r.pk_account_type_id) === v,
                    );
                    const name = String(row?.accounttype_name ?? "");
                    const code = String(row?.accounttype_code ?? "");
                    setTemplateName(name);
                    setSubjectTextCode(code);
                    setPaymentNoteFlag(resolvePaymentNoteFlag(name, code));
                    setTotals((t) => ({
                      ...t,
                      subjectText:
                        isEdit && t.subjectText ? t.subjectText : code,
                      requestText2: `Budget details for ${code} for the financial year 2024-25 are as follows:`,
                      requestText3:
                        "Pending Approval from Principal & Hon.Secretary & correspondent.Above Payment is to be made from the UG account 060410011111902(Unaided Section)",
                    }));
                  }}
                  options={accountOptions}
                  searchable
                  placeholder="Account Type"
                  error={fieldErrors.accountTypeId}
                />
                <DatePicker
                  label="P.O. Date"
                  value={poDate ?? null}
                  onChange={(d) => setPoDate(d ?? undefined)}
                  placeholder="P.O. Date"
                  displayFormat="dd/MM/yyyy"
                />
                <div className="space-y-1.5">
                  <Label>Invoice No</Label>
                  <Input
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="Invoice No"
                  />
                </div>
              </div>

              <Collapsible open={itemsOpen} onOpenChange={setItemsOpen}>
                <div className="rounded-md border border-border">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]">
                        <FileTextIcon
                          className="h-4 w-4 text-[hsl(var(--primary))]"
                          aria-hidden
                        />
                        Add Items
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          itemsOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border">
                    <div className="overflow-x-auto p-3">
                      <table className="w-full min-w-[720px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[hsl(var(--primary)/0.12)] bg-[hsl(var(--primary)/0.06)]">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                              Items
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                              Unit Price
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                              Quantity
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                              Discount(%)
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                              Total cost
                            </th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {lines
                            .filter((l) => l.isActive !== false)
                            .map((line) => (
                              <tr key={line.key} className="border-t">
                                <td className="px-2 py-1.5 align-bottom">
                                  <Select
                                    value={
                                      line.itemId ? String(line.itemId) : null
                                    }
                                    onChange={(v) => {
                                      void onSelectItem(
                                        line.key,
                                        v ? Number(v) : undefined,
                                      );
                                    }}
                                    options={itemOptions}
                                    searchable
                                    placeholder="Item"
                                    disabled={isEdit && showIndent}
                                  />
                                </td>
                                <td className="px-2 py-1.5 align-bottom">
                                  <Input
                                    type="number"
                                    step="any"
                                    className="h-8 text-right text-xs"
                                    placeholder="Unit Price"
                                    value={line.unitPrice ?? 0}
                                    onChange={(e) => {
                                      const next = lines.map((l) =>
                                        l.key === line.key
                                          ? calcLine({
                                              ...l,
                                              unitPrice:
                                                Number(e.target.value) || 0,
                                            })
                                          : l,
                                      );
                                      recalc(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1.5 align-bottom">
                                  <Input
                                    type="number"
                                    step="any"
                                    className="h-8 text-right text-xs"
                                    placeholder="Quantity"
                                    value={line.orderQuantity ?? 0}
                                    disabled={isEdit && showIndent}
                                    onChange={(e) => {
                                      const next = lines.map((l) =>
                                        l.key === line.key
                                          ? calcLine({
                                              ...l,
                                              orderQuantity:
                                                Number(e.target.value) || 0,
                                            })
                                          : l,
                                      );
                                      recalc(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1.5 align-bottom">
                                  <Input
                                    type="number"
                                    step="any"
                                    className="h-8 text-right text-xs"
                                    placeholder="Discount"
                                    value={line.itemDiscountPercentage ?? 0}
                                    onChange={(e) => {
                                      const next = lines.map((l) =>
                                        l.key === line.key
                                          ? calcLine({
                                              ...l,
                                              itemDiscountPercentage:
                                                Number(e.target.value) || 0,
                                            })
                                          : l,
                                      );
                                      recalc(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1.5 align-bottom">
                                  <Input
                                    type="number"
                                    className="h-8 text-right text-xs"
                                    placeholder="Total cost"
                                    value={line.itemTotalCost ?? 0}
                                    disabled
                                  />
                                </td>
                                <td className="px-2 py-1.5 align-bottom">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    aria-label="Remove row"
                                    onClick={() => {
                                      const next = lines.filter(
                                        (l) => l.key !== line.key,
                                      );
                                      recalc(next.length ? next : [newLine()]);
                                    }}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}

                          {/* Angular: + under Items; Gross Amt label+input right-aligned under Discount / Total */}
                          <tr className="border-t">
                            <td colSpan={3} className="px-2 py-2">
                              {!showIndent && (
                                <Button
                                  type="button"
                                  size="icon"
                                  className="h-8 w-8"
                                  aria-label="Add item"
                                  onClick={() => recalc([...lines, newLine()])}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-medium">
                              Gross Amt
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                className="h-8 text-right text-xs"
                                value={totals.poActualAmount}
                                disabled
                              />
                            </td>
                            <td />
                          </tr>
                          <tr>
                            <td colSpan={3} />
                            <td className="px-2 py-2 text-right font-medium">
                              GST %
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 text-right text-xs"
                                placeholder="GST %"
                                value={totals.sgst}
                                onChange={(e) =>
                                  recalc(lines, {
                                    sgst: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td />
                          </tr>
                          <tr>
                            <td colSpan={3} />
                            <td className="px-2 py-2 text-right font-medium">
                              Shipping Charges
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 text-right text-xs"
                                placeholder="Shipping charges"
                                value={totals.shippingCharges}
                                onChange={(e) =>
                                  recalc(lines, {
                                    shippingCharges:
                                      Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td />
                          </tr>
                          <tr>
                            <td colSpan={3} />
                            <td className="px-2 py-2 text-right font-medium">
                              Other Charges
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 text-right text-xs"
                                placeholder="Other charges"
                                value={totals.otherCharges}
                                onChange={(e) =>
                                  recalc(lines, {
                                    otherCharges: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>
                            <td />
                          </tr>
                          <tr>
                            <td colSpan={3} />
                            <td className="px-2 py-2 text-right font-medium">
                              Total Amt
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                className="h-8 text-right text-sm font-bold text-blue-600"
                                value={totals.poNetCost}
                                disabled
                              />
                            </td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                      {fieldErrors.items ? (
                        <p className="mt-2 text-xs text-destructive">
                          {fieldErrors.items}
                        </p>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <div className="space-y-1.5">
                <Label
                  htmlFor="po-terms"
                  className="text-sm font-medium text-[hsl(var(--primary))]"
                >
                  Notes / Terms
                </Label>
                <Textarea
                  id="po-terms"
                  value={totals.termsconditions}
                  onChange={(e) =>
                    setTotals((t) => ({
                      ...t,
                      termsconditions: e.target.value,
                    }))
                  }
                  placeholder="Terms and conditions"
                  className="min-h-[100px] resize-y"
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10">
                <FileChooseField
                  label="P.O. Ref. File 1"
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  file={noteFile}
                  onChange={setNoteFile}
                />
                <FileChooseField
                  label="Comparative Statement"
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  file={comparativeFile}
                  onChange={setComparativeFile}
                />
              </div>

              <Collapsible
                open={paymentNoteOpen}
                onOpenChange={setPaymentNoteOpen}
              >
                <div className="rounded-md border border-border">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]">
                        <FileTextIcon className="h-4 w-4" aria-hidden />
                        Create Payment Note
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          paymentNoteOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 border-t border-border px-3 pb-3 pt-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="note-subject"
                        className="text-sm font-medium text-[hsl(var(--primary))]"
                      >
                        Payment Note Subject
                      </Label>
                      <Textarea
                        id="note-subject"
                        value={totals.subjectText}
                        onChange={(e) =>
                          setTotals((t) => ({
                            ...t,
                            subjectText: e.target.value,
                          }))
                        }
                        placeholder="Note Subject"
                        className="min-h-[58px] resize-y text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="note-request"
                        className="text-sm font-medium text-[hsl(var(--primary))]"
                      >
                        Payment Note Request
                      </Label>
                      <Textarea
                        id="note-request"
                        value={totals.requestText}
                        onChange={(e) =>
                          setTotals((t) => ({
                            ...t,
                            requestText: e.target.value,
                          }))
                        }
                        placeholder="Note Request"
                        className="min-h-[100px] resize-y text-sm"
                      />
                    </div>
                    {paymentNoteFlag !== 2 ? (
                      <>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="note-request-2"
                            className="text-sm font-medium text-[hsl(var(--primary))]"
                          >
                            Payment Note Request
                          </Label>
                          <Textarea
                            id="note-request-2"
                            value={totals.requestText2}
                            onChange={(e) =>
                              setTotals((t) => ({
                                ...t,
                                requestText2: e.target.value,
                              }))
                            }
                            placeholder="Note Request"
                            className="min-h-[100px] resize-y text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="note-request-3"
                            className="text-sm font-medium text-[hsl(var(--primary))]"
                          >
                            Payment Note Request
                          </Label>
                          <Textarea
                            id="note-request-3"
                            value={totals.requestText3}
                            onChange={(e) =>
                              setTotals((t) => ({
                                ...t,
                                requestText3: e.target.value,
                              }))
                            }
                            placeholder="Note Request"
                            className="min-h-[100px] resize-y text-sm"
                          />
                        </div>
                      </>
                    ) : null}
                    {/* Angular: eye preview bottom-right of Create Payment Note panel */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-[hsl(var(--primary))]"
                        aria-label="Preview payment note"
                        title="Preview"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <ActiveStatusField
                isActive={isActive}
                onActiveChange={(v) => setIsActive(v === true)}
                reason={reason}
                onReasonChange={setReason}
              />

              {canSave ? (
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 min-w-[5.5rem]"
                    onClick={() => router.push(listPath)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="h-9 min-w-[5.5rem]"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || loadingExisting}
                  >
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <PaymentNotePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
      />
    </PageContainer>
  );
}
