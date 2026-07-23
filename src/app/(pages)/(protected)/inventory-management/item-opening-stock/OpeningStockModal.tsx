"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/common/components/select";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { QK } from "@/lib/query-keys";
import {
  createInvOpeningStock,
  listAcademicYearsForInvOpeningStock,
  listInvItemsMaster,
  listInvStoresMaster,
  updateInvOpeningStock,
} from "@/services";
import type { InvOpeningStock } from "@/types/inventory";

const schema = z.object({
  academicYearId: z.coerce.number().min(1, "Academic year is required"),
  storeId: z.coerce.number().min(1, "Store is required"),
  itemId: z.coerce.number().min(1, "Item is required"),
  itemPrice: z.coerce.number({ message: "Item price is required" }),
  qty: z.coerce.number({ message: "Quantity is required" }),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvOpeningStock | null): FormValues {
  return {
    academicYearId: edit?.academicYearId ?? 0,
    storeId: edit?.storeId ?? 0,
    itemId: edit?.itemId ?? 0,
    itemPrice: edit?.itemPrice ?? 0,
    qty: edit?.qty ?? 0,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvOpeningStock | null;
  onSaved: () => void;
}

export default function OpeningStockModal({
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

  const isActive = watch("isActive");
  const itemPrice = watch("itemPrice");
  const qty = watch("qty");
  const totalPrice = (Number(itemPrice) || 0) * (Number(qty) || 0);

  /** Angular: listDetailsByIdWithSort(AcademicYear, 'true', 'DESC', 'isActive', 'fromDate') */
  const { data: academicYears = [], isLoading: yearsLoading } = useQuery({
    queryKey: ["AcademicYear", "activeForInvOpeningStock"],
    queryFn: listAcademicYearsForInvOpeningStock,
    enabled: open,
  });

  /** Angular: listAllDetails(InvStoresmaster) */
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: QK.invStoresMaster.list(),
    queryFn: listInvStoresMaster,
    enabled: open,
  });

  /** Angular: listAllDetails(InvItemmaster) */
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: QK.invItemsMaster.list(),
    queryFn: listInvItemsMaster,
    enabled: open,
  });

  const academicYearOptions: SelectOption[] = useMemo(
    () =>
      academicYears.map((y) => {
        const year = String(y.academicYear ?? y.academicYearId ?? "");
        const college =
          y.collegeCode != null && String(y.collegeCode).trim() !== ""
            ? String(y.collegeCode)
            : "";
        // Angular: `{{academic.academicYear}}- {{academic.collegeCode}}`
        return {
          value: String(y.academicYearId ?? ""),
          label: college ? `${year}- ${college}` : year,
        };
      }),
    [academicYears],
  );

  // Angular option text is storeCode; tooltip shows storeName
  const storeOptions: SelectOption[] = useMemo(
    () =>
      stores.map((s) => ({
        value: String(s.storeId),
        label: s.storeCode ?? s.storeName ?? String(s.storeId),
        title: s.storeName ?? s.storeCode ?? undefined,
      })),
    [stores],
  );

  // Angular option text is itemName
  const itemOptions: SelectOption[] = useMemo(
    () =>
      items.map((i) => ({
        value: String(i.itemId),
        label: i.itemName ?? i.itemCode ?? String(i.itemId),
      })),
    [items],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    // Angular submit: Obj.totalPrice = Obj.itemPrice * Obj.qty
    const payload: Partial<InvOpeningStock> = {
      academicYearId: values.academicYearId,
      storeId: values.storeId,
      itemId: values.itemId,
      itemPrice: values.itemPrice,
      qty: values.qty,
      totalPrice: values.itemPrice * values.qty,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets itemopeningStockId + createdDt before updateDetails
        await updateInvOpeningStock(editData.itemopeningStockId, {
          ...payload,
          itemopeningStockId: editData.itemopeningStockId,
          createdDt: editData.createdDt,
        });
        toastSuccess("Item opening stock updated successfully.");
      } else {
        await createInvOpeningStock(payload);
        toastSuccess("Item opening stock created successfully.");
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
      title={editData ? "Edit Item Opening Stock" : "Add Item Opening Stock"}
      titleClassName="text-[hsl(var(--primary))] text-base font-semibold"
      size="lg"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      showFooterDivider={false}
      formClassName="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Controller
          name="academicYearId"
          control={control}
          render={({ field }) => (
            <Select
              label="Academic year *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={academicYearOptions}
              placeholder="Academic year"
              isLoading={yearsLoading}
              searchable
              error={errors.academicYearId?.message}
            />
          )}
        />
        <Controller
          name="storeId"
          control={control}
          render={({ field }) => (
            <Select
              label="Store *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={storeOptions}
              placeholder="Store"
              isLoading={storesLoading}
              searchable
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
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={itemOptions}
              placeholder="Item"
              isLoading={itemsLoading}
              searchable
              error={errors.itemId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Item price *</Label>
          <Input
            type="number"
            step="any"
            className="h-8 text-xs"
            placeholder="Item price"
            {...register("itemPrice")}
          />
          {errors.itemPrice && (
            <p className="text-xs text-red-500">{errors.itemPrice.message}</p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Quantity *</Label>
          <Input
            type="number"
            step="any"
            className="h-8 text-xs"
            placeholder="Quantity"
            {...register("qty")}
          />
          {errors.qty && (
            <p className="text-xs text-red-500">{errors.qty.message}</p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Total price</Label>
          <Input
            type="number"
            step="any"
            className="h-8 text-xs"
            placeholder="Total price"
            value={Number.isFinite(totalPrice) ? totalPrice : 0}
            readOnly
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="openingStockIsActive"
                checked={field.value}
                onCheckedChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
              />
              <Label
                htmlFor="openingStockIsActive"
                className="text-xs font-normal cursor-pointer"
              >
                Active
              </Label>
            </div>
          )}
        />
        {!isActive && (
          <div className="space-y-0.5">
            <Label className="text-xs">Reason</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Reason"
              {...register("reason")}
            />
          </div>
        )}
      </div>
    </FormModal>
  );
}
