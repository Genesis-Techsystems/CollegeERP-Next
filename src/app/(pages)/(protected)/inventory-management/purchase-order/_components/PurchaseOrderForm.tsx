"use client";

/**
 * Inventory Add/Edit Purchase Order — Angular `add-purchaseorder` parity.
 * (E-office payment-note form remains separate.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, FileTextIcon, PlusIcon, XIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toDateOnlyISO } from "@/common/generic-functions";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createPurchaseOrderMultipart,
  getEOfficeContextIds,
  getFinanceBudgetDetails,
  getInvOpeningStockByItemId,
  getPurchaseOrderById,
  listFinAccountTypesForInvPo,
  listFinancialYearsForInvPo,
  listIndentsForPaymentNote,
  listInvItemsMaster,
  listInvStoresMaster,
  listInvSuppliersMaster,
  listPoTypes,
  listTransactionTypes,
  updateInvPurchaseOrderJson,
} from "@/services";
import type { InvPoItemRow } from "@/types/e-office";

const PO_TYPE_WITH_INDENT = 463;
const LIST_PATH = "/inventory-management/purchase-orders";

type ItemLine = InvPoItemRow & {
  key: string;
  isActive?: boolean;
  itemTotalDiscountAmount?: number;
  authorizedByEmpId?: number;
  receivedQty?: number;
  isReqTracking?: boolean;
  igst?: number;
  reason?: string;
};

type OrderTotals = {
  poActualAmount: number;
  sgst: number;
  igst: number;
  shippingCharges: number;
  otherCharges: number;
  poNetCost: number;
  termsconditions: string;
  poComments: string;
  totalTax: number;
  isActive: boolean;
};

function newLine(employeeId: number): ItemLine {
  return {
    key: crypto.randomUUID(),
    isActive: true,
    itemCode: "TEST",
    itemId: undefined,
    unitPrice: 0,
    orderQuantity: 0,
    receivedQty: 2,
    isReqTracking: true,
    itemDiscountPercentage: 0,
    itemTotalDiscountAmount: 0,
    itemTotalCost: 0,
    itemName: "",
    authorizedByEmpId: employeeId,
    reason: "",
    igst: 0,
  };
}

function calcLine(row: ItemLine): ItemLine {
  const unit = Number(row.unitPrice) || 0;
  const qty = Number(row.orderQuantity) || 0;
  const discPct = Number(row.itemDiscountPercentage) || 0;
  let cost = unit * qty;
  if (discPct > 0) cost -= (cost * discPct) / 100;
  return {
    ...row,
    itemTotalDiscountAmount: discPct > 0 ? (unit * qty * discPct) / 100 : 0,
    itemTotalCost: cost,
  };
}

function calcTotals(lines: ItemLine[], totals: OrderTotals): OrderTotals {
  const poActualAmount = lines
    .filter((l) => l.isActive !== false)
    .reduce((s, l) => s + (Number(l.itemTotalCost) || 0), 0);
  let igst = poActualAmount;
  let poNetCost = poActualAmount;
  if (totals.sgst > 0) {
    igst = poActualAmount + (poActualAmount * totals.sgst) / 100;
    poNetCost = igst;
  }
  poNetCost += Number(totals.shippingCharges) || 0;
  poNetCost += Number(totals.otherCharges) || 0;
  return { ...totals, poActualAmount, igst, poNetCost };
}

function numToWords(num: number): string {
  const a = [
    "",
    "one ",
    "two ",
    "three ",
    "four ",
    "five ",
    "six ",
    "seven ",
    "eight ",
    "nine ",
    "ten ",
    "eleven ",
    "twelve ",
    "thirteen ",
    "fourteen ",
    "fifteen ",
    "sixteen ",
    "seventeen ",
    "eighteen ",
    "nineteen ",
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

/** Angular-style file picker: blue "Choose File" button + "No file chosen" / filename. */
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

interface Props {
  poId?: number;
}

export function PurchaseOrderForm({ poId }: Props) {
  const router = useRouter();
  const ctx = getEOfficeContextIds();
  const isEdit = Boolean(poId && poId > 0);
  const collegeId = ctx.collegeId;
  const universityId = ctx.universityId;

  const [poTypeId, setPoTypeId] = useState<string | null>(null);
  const [indentId, setIndentId] = useState<string | null>(null);
  const [transTypeId, setTransTypeId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [accountTypeId, setAccountTypeId] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState<string | null>(null);
  const [poDate, setPoDate] = useState<Date | undefined>(new Date());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lines, setLines] = useState<ItemLine[]>([newLine(ctx.employeeId)]);
  const [deletedLines, setDeletedLines] = useState<ItemLine[]>([]);
  const [totals, setTotals] = useState<OrderTotals>({
    poActualAmount: 0,
    sgst: 0,
    igst: 0,
    shippingCharges: 0,
    otherCharges: 0,
    poNetCost: 0,
    termsconditions: "",
    poComments: "",
    totalTax: 0,
    isActive: true,
  });
  const [comparativeFile, setComparativeFile] = useState<File | null>(null);
  const [noteFile, setNoteFile] = useState<File | null>(null);
  /** Angular mat-expansion-panel [expanded]="true" */
  const [itemsOpen, setItemsOpen] = useState(true);
  const [budget, setBudget] = useState<Record<string, unknown> | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [indentItemNames, setIndentItemNames] = useState("");
  const [createdDt, setCreatedDt] = useState<string | undefined>();
  const [originalPoItems, setOriginalPoItems] = useState<InvPoItemRow[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    transTypeId?: string;
    storeId?: string;
    supplierId?: string;
    accountTypeId?: string;
    financialYearId?: string;
    indentId?: string;
  }>({});

  const { data: poTypes = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "poTypes"],
    queryFn: listPoTypes,
  });
  const { data: transTypes = [], isFetching: transLoading } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "transTypes"],
    queryFn: listTransactionTypes,
    enabled: Boolean(poTypeId),
  });
  const { data: stores = [] } = useQuery({
    queryKey: QK.invStoresMaster.list(),
    queryFn: listInvStoresMaster,
    enabled: Boolean(transTypeId) || isEdit,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: QK.invSuppliersMaster.list(),
    queryFn: listInvSuppliersMaster,
    enabled: Boolean(storeId) || isEdit,
  });
  const { data: items = [] } = useQuery({
    queryKey: QK.invItemsMaster.list(),
    queryFn: listInvItemsMaster,
  });
  const { data: allIndents = [] } = useQuery({
    queryKey: [...QK.eOffice.lookup(), "indentsForInvPo"],
    queryFn: listIndentsForPaymentNote,
  });
  // Angular filters internalIndWfStage == 4
  const indents = useMemo(
    () => allIndents.filter((i) => i.internalIndWfStage === 4),
    [allIndents],
  );

  const { data: accountTypes = [] } = useQuery({
    queryKey: ["FinAccountType", "invPo", collegeId],
    queryFn: () => listFinAccountTypesForInvPo(collegeId),
    enabled: Boolean(supplierId) && collegeId > 0,
  });
  const { data: financialYears = [] } = useQuery({
    queryKey: ["FinancialYear", "invPo", universityId, collegeId],
    queryFn: () => listFinancialYearsForInvPo(universityId, collegeId),
    // Angular loads FY when Account Type is selected; resolve university via college if needed
    enabled: Boolean(accountTypeId) && (universityId > 0 || collegeId > 0),
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: QK.eOffice.purchaseOrder(poId ?? 0),
    queryFn: () => getPurchaseOrderById(poId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
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
    setAccountTypeId(
      existing.accountTypeId ? String(existing.accountTypeId) : null,
    );
    setFinancialYearId(
      existing.financialYearId ? String(existing.financialYearId) : null,
    );
    setInvoiceNo(existing.invoiceNo ?? "");
    setCreatedDt(existing.createdDt);
    if (existing.poDate) {
      const d = new Date(existing.poDate);
      if (!Number.isNaN(d.getTime())) setPoDate(d);
    }
    if (existing.invInternalIndentIds)
      setIndentId(String(existing.invInternalIndentIds));
    const itemRows = (existing.invPoItems ?? []).map((it) => ({
      ...it,
      key: String(it.poItemId ?? crypto.randomUUID()),
      isActive: true,
    }));
    setOriginalPoItems(existing.invPoItems ?? []);
    setLines(itemRows.length ? itemRows : [newLine(ctx.employeeId)]);
    setTotals((t) => ({
      ...t,
      poActualAmount: Number(existing.poActualAmount) || 0,
      sgst: Number(existing.sgst) || 0,
      igst: Number(existing.igst) || 0,
      shippingCharges: Number(existing.shippingCharges) || 0,
      otherCharges: Number(existing.otherCharges) || 0,
      poNetCost: Number(existing.poNetCost) || 0,
      termsconditions: String(existing.termsconditions ?? ""),
      poComments: String(existing.poComments ?? ""),
      isActive: true,
    }));
    if (existing.supplierName) setSupplierName(existing.supplierName);
  }, [existing, ctx.employeeId]);

  const showIndent = Number(poTypeId) === PO_TYPE_WITH_INDENT;

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

  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        value: String(it.itemId),
        label: `${it.itemName ?? ""} (${it.itemCode ?? ""})`.trim(),
      })),
    [items],
  );

  const recalc = useCallback(
    (nextLines: ItemLine[], nextTotals?: Partial<OrderTotals>) => {
      const computed = nextLines.map(calcLine);
      setLines(computed);
      setTotals((prev) => calcTotals(computed, { ...prev, ...nextTotals }));
    },
    [],
  );

  const onSelectItem = async (lineKey: string, itemId: number | undefined) => {
    const master = items.find((m) => m.itemId === itemId);
    let next = lines.map((l) =>
      l.key === lineKey
        ? calcLine({
            ...l,
            itemId,
            itemCode: master?.itemCode ?? l.itemCode,
            itemName: master?.itemName ?? l.itemName,
          })
        : l,
    );
    if (itemId) {
      try {
        const stock = await getInvOpeningStockByItemId(itemId);
        if (stock) {
          next = next.map((l) =>
            l.key === lineKey
              ? calcLine({
                  ...l,
                  unitPrice: Number(stock.itemPrice) || 0,
                  orderQuantity: Number(stock.qty) || 0,
                })
              : l,
          );
        }
      } catch {
        // keep defaults when opening stock missing
      }
    }
    recalc(next);
  };

  useEffect(() => {
    if (!supplierId) return;
    const s = suppliers.find((x) => String(x.supplierId) === supplierId);
    if (s?.supplierName) setSupplierName(s.supplierName);
  }, [supplierId, suppliers]);

  useEffect(() => {
    if (!accountTypeId) return;
    const a = accountTypes.find(
      (x) => String(x.accountTypeId) === accountTypeId,
    );
    if (a?.accounttypeName) setTemplateName(String(a.accounttypeName));
  }, [accountTypeId, accountTypes]);

  useEffect(() => {
    if (!financialYearId || !accountTypeId || !collegeId) return;
    void (async () => {
      try {
        const row = await getFinanceBudgetDetails({
          in_flag: "financial_accounttype_budget",
          in_org_id:
            Number(globalThis.localStorage?.getItem("organizationId") ?? 0) ||
            0,
          in_college_id: collegeId,
          in_financial_year_id: Number(financialYearId),
          in_budgetdate: "1990-01-01",
          in_loginuser_empid: ctx.employeeId,
          in_loginuser_roleid: 0,
          in_account_type_id: Number(accountTypeId),
          in_fin_category_id: 0,
          in_fin_subcategory_id: 0,
        });
        setBudget(row);
      } catch {
        setBudget(null);
      }
    })();
  }, [financialYearId, accountTypeId, collegeId, ctx.employeeId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: typeof fieldErrors = {};
      if (!transTypeId) nextErrors.transTypeId = "Transaction Type is required";
      if (!storeId) nextErrors.storeId = "Store is required";
      if (!supplierId) nextErrors.supplierId = "Supplier is required";
      if (!accountTypeId) nextErrors.accountTypeId = "Account Type is required";
      if (!financialYearId)
        nextErrors.financialYearId = "Financial Year is required";
      if (showIndent && !indentId)
        nextErrors.indentId = "Indent Number is required";
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("VALIDATION");
      }

      const activeLines = lines.filter((l) => l.isActive !== false && l.itemId);
      const invPoItems = activeLines.map((l) => {
        const master = items.find((m) => m.itemId === Number(l.itemId));
        return {
          ...l,
          itemCode: master?.itemCode ?? l.itemCode,
          itemName: master?.itemName ?? l.itemName,
          receivedQty: l.orderQuantity,
          isReqTracking: true,
          authorizedByEmpId: ctx.employeeId,
        };
      });

      if (isEdit && poId) {
        const updateItems: Record<string, unknown>[] = [];
        for (const orig of originalPoItems) {
          for (const cur of activeLines) {
            if (cur.itemId === orig.itemId) {
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
        }
        await updateInvPurchaseOrderJson({
          poId,
          potypeCatdetId: Number(poTypeId),
          invInternalIndentIds: showIndent ? indentId : undefined,
          invTranstypeCatdetId: Number(transTypeId),
          storeId: Number(storeId),
          supplierId: Number(supplierId),
          poDate: poDate ? toDateOnlyISO(poDate) : undefined,
          poActualAmount: totals.poActualAmount,
          sgst: totals.sgst,
          shippingCharges: totals.shippingCharges,
          otherCharges: totals.otherCharges,
          igst: totals.igst,
          termsconditions: totals.termsconditions,
          invPoItems: updateItems,
          poNetCost: totals.poNetCost,
          isActive: true,
        });
        return;
      }

      const approved = Number(budget?.approved_amount ?? 0);
      const actual = Number(budget?.actual_amount ?? 0);
      const balance = Number(budget?.balance_in_account ?? 0);
      const now = new Date();
      const prevYear = now.getFullYear() - 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prev2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const monthName = (d: Date) =>
        d.toLocaleString("en-US", { month: "long" });

      const payload: Record<string, unknown> = {
        storeId: Number(storeId),
        supplierId: Number(supplierId),
        potypeCatdetId: Number(poTypeId),
        invTranstypeCatdetId: Number(transTypeId),
        financialYearId: Number(financialYearId),
        accountTypeId: Number(accountTypeId),
        poDate: poDate ? toDateOnlyISO(poDate) : undefined,
        authorizedByEmployeeId: ctx.employeeId,
        poRaisedEmpId: ctx.employeeId,
        invoiceNo,
        templateName,
        indentApprovedDate: poDate ? toDateOnlyISO(poDate) : undefined,
        purchaseOrderAmount: totals.poNetCost,
        amountInWords: numToWords(totals.poNetCost),
        supplierName,
        supplierBillNo: "0",
        budgetAlloted: approved,
        soFarExpenditure: actual,
        balance,
        balanceAvailable: balance - totals.poNetCost,
        accountNumber: 10911051050083,
        telephoneChargesForTheMonth: `${monthName(prev2Month)} and ${monthName(prevMonth)} ${prevYear}`,
        telephoneNo: "040-27098811,04027070471",
        budgetAllotedInWords: balance - totals.poNetCost,
        requestorName: supplierName,
        purchaseItem: indentItemNames,
        suplierName: supplierName,
        previousImprestAmountDate: "31-05-2023",
        previousImprestAmount: 2455,
        previousBalAmount: 45,
        totalBalAvailable: 2500,
        totalBalAvailableDate: 2770,
        electricityChargesPaidTo: supplierName,
        electricityChargesMonth: `${monthName(prevMonth)} ${prevYear}`,
        budgetAllotedAmountInWords: numToWords(approved),
        invPoItems: [...invPoItems, ...deletedLines],
        ...totals,
        createdDt,
        isActive: true,
      };
      if (showIndent && indentId)
        payload.invInternalIndentIds = String(indentId);

      await createPurchaseOrderMultipart(payload, {
        comparative: comparativeFile,
        note: noteFile,
      });
    },
    onSuccess: () => {
      toastSuccess(
        isEdit ? "Purchase order updated." : "Purchase order created.",
      );
      router.push(LIST_PATH);
    },
    onError: (err) => {
      if (getErrorMessage(err) === "VALIDATION") return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit ? "Edit Purchase Order" : "New Purchase Order";

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="space-y-4 p-4 md:p-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileTextIcon
              className="h-4 w-4 text-[hsl(var(--primary))]"
              aria-hidden
            />
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {title}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="P.O. Type"
              value={poTypeId}
              onChange={(v) => {
                setPoTypeId(v);
                if (!isEdit) {
                  setTransTypeId(null);
                  setIndentId(null);
                  setStoreId(null);
                  setSupplierId(null);
                }
              }}
              options={poTypes.map((t) => ({
                value: String(t.generalDetailId),
                label: t.generalDetailDisplayName ?? String(t.generalDetailId),
              }))}
              placeholder="P.O. Type"
              disabled={isEdit}
            />
            {showIndent && (
              <Select
                label="Indent. No"
                value={indentId}
                onChange={(v) => {
                  setFieldErrors((e) => ({ ...e, indentId: undefined }));
                  setIndentId(v);
                  const ind = indents.find(
                    (i) => String(i.internalIndId) === v,
                  );
                  if (ind?.storeId) setStoreId(String(ind.storeId));
                  const names = (ind?.invInternalIndentitems ?? [])
                    .map((x) => x.itemName)
                    .filter(Boolean)
                    .join(", ");
                  setIndentItemNames(names);
                  if (!isEdit && ind?.invInternalIndentitems?.length) {
                    const mapped = ind.invInternalIndentitems.map((it) =>
                      calcLine({
                        ...newLine(ctx.employeeId),
                        itemId: it.itemId,
                        itemCode: it.itemCode,
                        itemName: it.itemName,
                        unitPrice: it.unitPrice ?? 0,
                        orderQuantity:
                          it.issuedQty ??
                          it.orderQuantity ??
                          it.indentQuantity ??
                          0,
                        itemDiscountPercentage: it.itemDiscountPercentage ?? 0,
                        itemTotalCost: it.itemTotalCost ?? 0,
                        isActive: it.isActive ?? true,
                        isReqTracking: it.isReqTracking ?? true,
                      }),
                    );
                    recalc(mapped.length ? mapped : [newLine(ctx.employeeId)]);
                  }
                }}
                options={indents.map((i) => ({
                  value: String(i.internalIndId),
                  label: i.internalIndNo ?? String(i.internalIndId),
                }))}
                placeholder="Indent Number"
                searchable
                disabled={isEdit}
                error={fieldErrors.indentId}
              />
            )}
            <Select
              label="Transaction Type *"
              value={transTypeId}
              onChange={(v) => {
                setFieldErrors((e) => ({ ...e, transTypeId: undefined }));
                setTransTypeId(v);
              }}
              options={transTypes.map((t) => ({
                value: String(t.generalDetailId),
                label: t.generalDetailDisplayName ?? String(t.generalDetailId),
              }))}
              placeholder="Transaction Type"
              isLoading={transLoading}
              disabled={isEdit || !poTypeId}
              error={fieldErrors.transTypeId}
            />
            <Select
              label="Store *"
              value={storeId}
              onChange={(v) => {
                setFieldErrors((e) => ({ ...e, storeId: undefined }));
                setStoreId(v);
              }}
              options={storeOptions}
              placeholder="Store"
              disabled={isEdit}
              error={fieldErrors.storeId}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Supplier *"
              value={supplierId}
              onChange={(v) => {
                setFieldErrors((e) => ({ ...e, supplierId: undefined }));
                setSupplierId(v);
              }}
              options={suppliers.map((s) => ({
                value: String(s.supplierId),
                label: s.supplierName ?? String(s.supplierId),
              }))}
              placeholder="Supplier"
              searchable
              disabled={isEdit}
              error={fieldErrors.supplierId}
            />
            <Select
              label="Account Type *"
              value={accountTypeId}
              onChange={(v) => {
                setFieldErrors((e) => ({ ...e, accountTypeId: undefined }));
                setAccountTypeId(v);
              }}
              options={accountTypes.map((a) => ({
                value: String(a.accountTypeId ?? ""),
                label: String(
                  a.accounttypeCode ??
                    a.accounttypeName ??
                    a.accountTypeId ??
                    "",
                ),
              }))}
              placeholder="Account Type"
              disabled={isEdit || !supplierId}
              error={fieldErrors.accountTypeId}
            />
            <Select
              label="Financial Year *"
              value={financialYearId}
              onChange={(v) => {
                setFieldErrors((e) => ({ ...e, financialYearId: undefined }));
                setFinancialYearId(v);
              }}
              options={financialYears.map((y) => ({
                value: String(y.financialYearId ?? ""),
                label: String(y.financialYear ?? y.financialYearId ?? ""),
              }))}
              placeholder="Financial Year"
              disabled={isEdit || !accountTypeId}
              error={fieldErrors.financialYearId}
            />
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice No</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Invoice No"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                disabled={isEdit}
              />
            </div>
            <DatePicker
              label="P.O. Date"
              placeholder="P.O. Date"
              value={poDate ?? null}
              onChange={(d) => setPoDate(d ?? undefined)}
              disabled={isEdit}
            />
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-card">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 bg-muted/40 px-3 py-2.5 text-left",
                "border-t-2 border-t-[hsl(var(--primary))]",
                itemsOpen && "border-b border-border",
              )}
              aria-expanded={itemsOpen}
              onClick={() => setItemsOpen((open) => !open)}
            >
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                  itemsOpen ? "rotate-0" : "-rotate-90",
                )}
                aria-hidden
              />
              <FileTextIcon
                className="h-4 w-4 text-[hsl(var(--primary))]"
                aria-hidden
              />
              <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                Add Items
              </span>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                itemsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
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
                                value={line.itemId ? String(line.itemId) : null}
                                onChange={(v) =>
                                  void onSelectItem(
                                    line.key,
                                    v ? Number(v) : undefined,
                                  )
                                }
                                options={itemOptions}
                                placeholder="Item"
                                searchable
                                disabled={isEdit && showIndent}
                              />
                            </td>
                            <td className="px-2 py-1.5 align-bottom">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 text-xs text-right"
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
                                className="h-8 text-xs text-right"
                                placeholder="Quantity"
                                value={line.orderQuantity ?? 0}
                                disabled={isEdit}
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
                                className="h-8 text-xs text-right"
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
                                className="h-8 text-xs text-right"
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
                                onClick={() => {
                                  if (line.poItemId) {
                                    setDeletedLines((d) => [
                                      ...d,
                                      { ...line, isActive: false },
                                    ]);
                                  }
                                  recalc(
                                    lines.filter((l) => l.key !== line.key),
                                  );
                                }}
                              >
                                <XIcon className="h-4 w-4" strokeWidth={2.5} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      <tr className="border-t">
                        <td colSpan={3} className="px-2 py-2">
                          {/* Angular: mat-mini-fab + only when potype != With Indent (463) */}
                          {!showIndent && (
                            <Button
                              type="button"
                              size="icon"
                              className="h-8 w-8 bg-[hsl(var(--primary))] text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
                              onClick={() =>
                                recalc([...lines, newLine(ctx.employeeId)])
                              }
                              aria-label="Add item"
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
                            className="h-8 text-xs text-right"
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
                            className="h-8 text-xs text-right"
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
                            className="h-8 text-xs text-right"
                            placeholder="Shipping charges"
                            value={totals.shippingCharges}
                            onChange={(e) =>
                              recalc(lines, {
                                shippingCharges: Number(e.target.value) || 0,
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
                            className="h-8 text-xs text-right"
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
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-blue-600">Notes / Terms</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              placeholder="Terms and conditions"
              value={totals.termsconditions}
              onChange={(e) =>
                setTotals((t) => ({ ...t, termsconditions: e.target.value }))
              }
            />
          </div>

          {/* Angular: label + Choose File + No file chosen, side by side */}
          <div className="mt-4 flex flex-col gap-4 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10 sm:gap-y-3">
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

          {lines.length > 0 && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 min-w-[5.5rem]"
                onClick={() => router.push(LIST_PATH)}
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
          )}
        </div>
      </div>
    </PageContainer>
  );
}
