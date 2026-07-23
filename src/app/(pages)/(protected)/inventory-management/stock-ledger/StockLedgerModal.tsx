"use client";

/**
 * Angular `AddLedgerComponent` parity — Add/Edit Stock Ledger modal.
 */

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusField } from "@/common/components/forms";
import { QK } from "@/lib/query-keys";
import { toDateOnlyISO } from "@/common/generic-functions";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvStockLedger,
  listInvItemsMaster,
  listInvStoresMaster,
  listTransTypesForInternalIndent,
  updateInvStockLedger,
} from "@/services";
import type { InvStockLedger } from "@/types/inventory";

const schema = z.object({
  storeId: z.coerce.number().min(1, "Store is required"),
  itemId: z.coerce.number().min(1, "Item is required"),
  costprice: z.coerce.number().min(0, "Item price is required"),
  itemQty: z.coerce.number().min(0, "Quantity is required"),
  transactionno: z.string().min(1, "Transaction No. is required"),
  transactionDate: z.date({ message: "Transaction Date is required" }),
  invTranstypeCatdetId: z.coerce
    .number()
    .min(1, "Transaction Type is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvStockLedger | null): FormValues {
  let transactionDate = new Date();
  if (edit?.transactionDate) {
    const d = new Date(edit.transactionDate);
    if (!Number.isNaN(d.getTime())) transactionDate = d;
  }
  return {
    storeId: edit?.storeId ?? 0,
    itemId: edit?.itemId ?? 0,
    costprice: Number(edit?.costprice) || 0,
    itemQty: Number(edit?.itemQty) || 0,
    transactionno: edit?.transactionno ?? "",
    transactionDate,
    invTranstypeCatdetId: edit?.invTranstypeCatdetId ?? 0,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvStockLedger | null;
  onSaved: () => void;
}

export default function StockLedgerModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const costprice = watch("costprice");
  const itemQty = watch("itemQty");
  /** Angular `enteredQty`: totalprice = costprice * itemQty */
  const totalprice = useMemo(
    () => (Number(costprice) || 0) * (Number(itemQty) || 0),
    [costprice, itemQty],
  );

  const { data: stores = [] } = useQuery({
    queryKey: QK.invStoresMaster.list(),
    queryFn: listInvStoresMaster,
    enabled: open,
  });

  const { data: items = [] } = useQuery({
    queryKey: QK.invItemsMaster.list(),
    queryFn: listInvItemsMaster,
    enabled: open,
  });

  /** Angular: GeneralMaster.generalMasterCode==TRANSTYPE.and.isActive==true */
  const { data: transTypes = [] } = useQuery({
    queryKey: [...QK.invStockLedgers.all, "transTypes"],
    queryFn: listTransTypesForInternalIndent,
    enabled: open,
  });

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        value: String(s.storeId),
        label: s.storeCode ?? s.storeName ?? String(s.storeId),
        title: s.storeName,
      })),
    [stores],
  );

  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        value: String(it.itemId),
        label: it.itemName ?? it.itemCode ?? String(it.itemId),
      })),
    [items],
  );

  const transTypeOptions = useMemo(
    () =>
      transTypes.map((t) => ({
        value: String(t.generalDetailId),
        label: String(t.generalDetailDisplayName ?? t.generalDetailId ?? ""),
      })),
    [transTypes],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvStockLedger> = {
      storeId: values.storeId,
      itemId: values.itemId,
      costprice: values.costprice,
      itemQty: values.itemQty,
      totalprice: values.costprice * values.itemQty,
      transactionno: values.transactionno.trim(),
      transactionDate: toDateOnlyISO(values.transactionDate),
      invTranstypeCatdetId: values.invTranstypeCatdetId,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        await updateInvStockLedger(editData.stockledgerId, {
          ...payload,
          stockledgerId: editData.stockledgerId,
          createdDt: editData.createdDt,
        });
        toastSuccess("Stock ledger updated successfully.");
      } else {
        await createInvStockLedger(payload);
        toastSuccess("Stock ledger created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Stock Ledger" : "Add Stock Ledger"}
      titleClassName="text-[hsl(var(--primary))] text-base font-semibold"
      size="lg"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      formClassName="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Controller
          name="storeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Store *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={storeOptions}
              searchable
              placeholder="Store"
              error={errors.storeId?.message}
            />
          )}
        />
        <Controller
          name="itemId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={itemOptions}
              searchable
              placeholder="Item"
              error={errors.itemId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Item price *</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            step="any"
            placeholder="Item price"
            {...register("costprice")}
          />
          {errors.costprice ? (
            <p className="text-xs text-destructive">
              {errors.costprice.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Quantity *</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            step="any"
            placeholder="Quantity"
            {...register("itemQty")}
          />
          {errors.itemQty ? (
            <p className="text-xs text-destructive">{errors.itemQty.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Total price</Label>
          <Input
            className="h-9 text-sm"
            type="number"
            step="any"
            placeholder="Total price"
            value={totalprice}
            disabled
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction No. *</Label>
          <Input
            className="h-9 text-sm"
            placeholder="Transaction No."
            {...register("transactionno")}
          />
          {errors.transactionno ? (
            <p className="text-xs text-destructive">
              {errors.transactionno.message}
            </p>
          ) : null}
        </div>
        <Controller
          name="transactionDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Transaction Date"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? new Date())}
              placeholder="Transaction Date"
              displayFormat="dd/MM/yyyy"
              error={errors.transactionDate?.message}
            />
          )}
        />
        <Controller
          name="invTranstypeCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              label="Transaction Type *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={transTypeOptions}
              searchable
              placeholder="Transaction Type"
              error={errors.invTranstypeCatdetId?.message}
            />
          )}
        />
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <ActiveStatusField
            isActive={field.value}
            reason={watch("reason") ?? ""}
            onActiveChange={field.onChange}
            onReasonChange={(v) => setValue("reason", v)}
            reasonError={errors.reason?.message}
          />
        )}
      />
    </FormModal>
  );
}
