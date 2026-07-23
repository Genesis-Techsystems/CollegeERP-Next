"use client";

/**
 * Inventory Stock Receipt Voucher add/edit — Angular `add-srv` parity.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { toDateOnlyISO } from "@/common/generic-functions";
import {
  createInvSrv,
  getInvSrvById,
  listInvStockReceiptVouchers,
  listPurchaseOrdersForSrv,
  getPurchaseOrderById,
  updateInvSrv,
} from "@/services";
import type { InvPoItemRow, InvPurchaseOrderRow } from "@/types/e-office";
import type { InvSrvItemRow } from "@/types/inventory";

const SRV_LIST = "/inventory-management/stock-receipt-voucher";

type PoWithTax = InvPurchaseOrderRow & {
  sgst?: number;
  igst?: number;
  discountAmount?: number;
  totalTax?: number;
  invTranstypeCatdetDisplayName?: string;
};

/** Angular-style file picker (UI only — not sent on save). */
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

function mapPoItemsToSrvItems(items: InvPoItemRow[]): InvSrvItemRow[] {
  return items
    .filter((row) => row.isActive !== false)
    .map((row) => {
      const unitPrice = Number(row.unitPrice) || 0;
      const qty = Number(row.orderQuantity) || 0;
      const discPct = Number(row.itemDiscountPercentage) || 0;
      return {
        ...row,
        unitPrice,
        orderQuantity: qty,
        itemDiscountPercentage: discPct,
        receivedQty: qty,
        itemUnitAmount: unitPrice,
        itemTotalDiscountAmount: (unitPrice * qty * discPct) / 100,
        isReqTracking: true,
        isActive: true,
      };
    });
}

export function StockReceiptVoucherForm({
  srvId,
  listPath = SRV_LIST,
}: {
  srvId?: number;
  listPath?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(srvId && srvId > 0);

  const [poId, setPoId] = useState<string | null>(null);
  const [purchaseOrder, setPurchaseOrder] = useState<PoWithTax | null>(null);
  const [itemList, setItemList] = useState<InvSrvItemRow[]>([]);
  const [srvNo, setSrvNo] = useState("");
  const [srvDate, setSrvDate] = useState<Date | null>(new Date());
  const [deliveryChallanNo, setDeliveryChallanNo] = useState("");
  const [deliveryChallanDate, setDeliveryChallanDate] = useState<Date | null>(
    new Date(),
  );
  const [refFile1, setRefFile1] = useState<File | null>(null);
  const [refFile2, setRefFile2] = useState<File | null>(null);
  const [srvSeeded, setSrvSeeded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    poId?: string;
    srvNo?: string;
    deliveryChallanNo?: string;
  }>({});

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: [...QK.invPurchaseOrders.list(), "forSrv"],
    queryFn: listPurchaseOrdersForSrv,
  });

  const { data: existingSrv, isLoading: loadingSrv } = useQuery({
    queryKey: QK.invStockReceiptVouchers.detail(srvId ?? 0),
    queryFn: () => getInvSrvById(srvId!),
    enabled: isEdit,
  });

  const { data: existingSrvList = [] } = useQuery({
    queryKey: QK.invStockReceiptVouchers.list(),
    queryFn: listInvStockReceiptVouchers,
    enabled: !isEdit,
  });

  const poOptions = useMemo(
    () =>
      purchaseOrders.map((po) => ({
        value: String(po.poId),
        label: po.pono ?? String(po.poId),
      })),
    [purchaseOrders],
  );

  // Angular getSrvById: patch form, selectedPO, then overwrite items from invSrvItemDTOs
  useEffect(() => {
    if (!existingSrv || srvSeeded) return;
    setSrvNo(existingSrv.srvNo ?? "");
    setPoId(existingSrv.poId ? String(existingSrv.poId) : null);
    setDeliveryChallanNo(existingSrv.deliverychallanno ?? "");
    if (existingSrv.srvDate) {
      const d = new Date(existingSrv.srvDate);
      if (!Number.isNaN(d.getTime())) setSrvDate(d);
    }
    if (existingSrv.deliverychallandate) {
      const d = new Date(existingSrv.deliverychallandate);
      if (!Number.isNaN(d.getTime())) setDeliveryChallanDate(d);
    }
    const items = (existingSrv.invSrvItemDTOs ?? []).map((row) => ({
      ...row,
      unitPrice: row.itemUnitAmount ?? row.unitPrice,
    }));
    setItemList(items);
    setSrvSeeded(true);
  }, [existingSrv, srvSeeded]);

  // Angular selectedPO: load PO header display + items (create), or header only after edit seed
  useEffect(() => {
    if (!poId) {
      setPurchaseOrder(null);
      if (!isEdit) {
        setItemList([]);
      }
      return;
    }
    const id = Number(poId);
    if (!id) return;
    void getPurchaseOrderById(id)
      .then((po) => {
        if (!po) return;
        setPurchaseOrder(po as PoWithTax);
        // On create, or when user changes PO after edit load — items come from PO
        if (!isEdit || !srvSeeded) {
          setItemList(mapPoItemsToSrvItems(po.invPoItems ?? []));
        } else if (isEdit && srvSeeded && Number(existingSrv?.poId) !== id) {
          setItemList(mapPoItemsToSrvItems(po.invPoItems ?? []));
        }
      })
      .catch((err) => toastError(getErrorMessage(err)));
  }, [poId, isEdit, srvSeeded, existingSrv?.poId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextErrors: typeof fieldErrors = {};
      if (!poId) nextErrors.poId = "P.O. Number is required";
      if (!srvNo.trim()) nextErrors.srvNo = "SRV Number is required";
      if (!deliveryChallanNo.trim()) {
        nextErrors.deliveryChallanNo = "Delivery Challan No. is required";
      }
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("VALIDATION");
      }
      if (!purchaseOrder) {
        throw new Error("Please select a purchase order.");
      }

      // Angular create soft-duplicates (exact messages)
      if (!isEdit) {
        if (existingSrvList.some((s) => s.srvNo === srvNo.trim())) {
          throw new Error("SrvNo Already Existed");
        }
        if (
          existingSrvList.some(
            (s) => s.deliverychallanno === deliveryChallanNo.trim(),
          )
        ) {
          throw new Error("DeliveryChallanNo Already Existed");
        }
      }

      const invSrvItemDTOs = itemList.map((row) => {
        const unitPrice = Number(row.unitPrice) || 0;
        const qty = Number(row.orderQuantity) || 0;
        const discPct = Number(row.itemDiscountPercentage) || 0;
        return {
          ...row,
          receivedQty: qty,
          itemUnitAmount: unitPrice,
          itemTotalDiscountAmount: (unitPrice * qty * discPct) / 100,
          isReqTracking: true,
        };
      });

      const payload: Record<string, unknown> = {
        srvNo: srvNo.trim(),
        poId: Number(poId),
        srvDate: srvDate ? toDateOnlyISO(srvDate) : undefined,
        deliverychallanno: deliveryChallanNo.trim(),
        deliverychallandate: deliveryChallanDate
          ? toDateOnlyISO(deliveryChallanDate)
          : undefined,
        storeId: purchaseOrder.storeId,
        supplierId: purchaseOrder.supplierId,
        igst: purchaseOrder.igst,
        srvActualAmount: purchaseOrder.poActualAmount,
        srvDiscount: purchaseOrder.discountAmount,
        srvTax: purchaseOrder.totalTax,
        invTranstypeCatdetId: purchaseOrder.invTranstypeCatdetId,
        invSrvItemDTOs,
      };

      if (isEdit && srvId) {
        payload.srvId = srvId;
        payload.isActive = existingSrv?.isActive ?? true;
        payload.createdDt = existingSrv?.createdDt;
        await updateInvSrv(payload);
      } else {
        await createInvSrv(payload);
      }

      // Angular file inputs are UI-only (not appended to payload)
      void refFile1;
      void refFile2;
    },
    onSuccess: () => {
      toastSuccess(
        isEdit
          ? "Stock receipt voucher updated."
          : "Stock receipt voucher created.",
      );
      router.push(listPath);
    },
    onError: (err) => {
      if (getErrorMessage(err) === "VALIDATION") return;
      toastError(getErrorMessage(err));
    },
  });

  const title = isEdit
    ? "Edit Stock Receipt Voucher"
    : "New Stock Receipt Voucher";
  const grossAmt = purchaseOrder?.poActualAmount;
  const gstPct = purchaseOrder?.sgst;
  const totalAmt = purchaseOrder?.poNetCost;

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

          {/* Form layout like React image 1 — labels above fields */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Select
                label="P.O. Number *"
                value={poId}
                onChange={(v) => {
                  setFieldErrors((e) => ({ ...e, poId: undefined }));
                  setPoId(v);
                }}
                options={poOptions}
                placeholder="P.O"
                searchable
                error={fieldErrors.poId}
              />
              {purchaseOrder && (
                <>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {purchaseOrder.storeName ?? ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {purchaseOrder.supplierName ?? ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground">Trans. Type</span>
                    <span className="font-semibold text-[#3F51B5]">
                      {purchaseOrder.invTranstypeCatdetDisplayName ??
                        purchaseOrder.invTranstypeCatdetCode ??
                        ""}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label className="text-xs">SRV Number *</Label>
                <Input
                  className="h-8 text-xs"
                  value={srvNo}
                  onChange={(e) => {
                    setFieldErrors((err) => ({ ...err, srvNo: undefined }));
                    setSrvNo(e.target.value);
                  }}
                  placeholder="SRV Number"
                  aria-invalid={Boolean(fieldErrors.srvNo)}
                />
                {fieldErrors.srvNo && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldErrors.srvNo}
                  </p>
                )}
              </div>
              <DatePicker
                label="Date"
                placeholder="P.O. Date"
                value={srvDate}
                onChange={setSrvDate}
              />
              <div className="space-y-0.5">
                <Label className="text-xs">Delivery Challan No. *</Label>
                <Input
                  className="h-8 text-xs"
                  value={deliveryChallanNo}
                  onChange={(e) => {
                    setFieldErrors((err) => ({
                      ...err,
                      deliveryChallanNo: undefined,
                    }));
                    setDeliveryChallanNo(e.target.value);
                  }}
                  placeholder="Delivery Challan Number"
                  aria-invalid={Boolean(fieldErrors.deliveryChallanNo)}
                />
                {fieldErrors.deliveryChallanNo && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldErrors.deliveryChallanNo}
                  </p>
                )}
              </div>
              <DatePicker
                label="Delivery Challan Date"
                placeholder="P.O. Date"
                value={deliveryChallanDate}
                onChange={setDeliveryChallanDate}
              />
            </div>
          </div>

          {/* Angular table layout: cell borders + Gross Amt under Discount column.
              Headers use React list-table style (uppercase). */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-[20%] border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                    Items
                  </th>
                  <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                    Unit Price
                  </th>
                  <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                    Quantity
                  </th>
                  <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                    Discount
                  </th>
                  <th className="border border-border bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                    Total cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemList.map(
                  (row, idx) =>
                    row.isActive !== false && (
                      <tr key={row.poItemId ?? row.itemId ?? idx}>
                        <td className="border border-border px-3 py-2">
                          {row.itemName ?? row.itemCode ?? ""}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {row.unitPrice ?? ""}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {row.orderQuantity ?? ""}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {row.itemDiscountPercentage ?? ""}
                        </td>
                        <td className="border border-border px-3 py-2 text-right">
                          {row.itemTotalCost ?? ""}
                        </td>
                      </tr>
                    ),
                )}
                {/* Angular: colspan cells border:0; Gross Amt / value keep borders */}
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-3 py-2 text-right font-medium">
                    Gross Amt
                  </td>
                  <td className="border border-border px-3 py-2 text-right">
                    {grossAmt ?? ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-3 py-2 text-right font-medium">
                    GST %
                  </td>
                  <td className="border border-border px-3 py-2 text-right">
                    {gstPct ?? ""}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-border px-3 py-2 text-right font-medium">
                    Total Amt
                  </td>
                  <td className="border border-border px-3 py-2 text-right">
                    {totalAmt ?? ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10">
            <FileChooseField
              label="SRV Ref. File 1"
              accept=".png,.jpg,.jpeg,.pdf,.doc"
              file={refFile1}
              onChange={setRefFile1}
            />
            <FileChooseField
              label="SRV Ref. File 2"
              accept=".png,.jpg,.jpeg,.pdf,.doc"
              file={refFile2}
              onChange={setRefFile2}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[5.5rem]"
              onClick={() => router.push(listPath)}
            >
              Back
            </Button>
            {itemList.length > 0 && (
              <Button
                type="button"
                className="h-9 min-w-[5.5rem]"
                disabled={saveMutation.isPending || loadingSrv}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Received"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
