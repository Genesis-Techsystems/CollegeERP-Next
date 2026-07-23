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
import {
  MultiSelect,
  Select,
  type SelectOption,
} from "@/common/components/select";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvItem,
  listActiveOrganizationsForInventory,
  listInvBrands,
  listInvItemCategories,
  listInvItemSubCategoriesByCategory,
  listInvItemTypes,
  listInvSuppliersMaster,
  updateInvItem,
} from "@/services";
import { QK } from "@/lib/query-keys";
import type { InvItem } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  itemName: z.string().min(1, "Item Name is required"),
  itemCode: z.string().min(1, "Item Code is required"),
  itemAliasname: z.string().optional(),
  itemTypeCatdetId: z.coerce.number().optional(),
  itemCategoryId: z.coerce.number().min(1, "Item Category is required"),
  itemSubcategoryId: z.coerce.number().optional(),
  brandmasterId: z.coerce.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  supplierIds: z.array(z.string()),
  isReqTracking: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function parseSupplierIds(edit?: InvItem | null): string[] {
  if (!edit?.supplierIds) return [];
  return edit.supplierIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && Number.isFinite(Number(s)) && Number(s) > 0);
}

function getDefaults(edit?: InvItem | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    itemName: edit?.itemName ?? "",
    itemCode: edit?.itemCode ?? "",
    itemAliasname: edit?.itemAliasname ?? "",
    // Coerce null from API → undefined (optional selects)
    itemTypeCatdetId: edit?.itemTypeCatdetId ?? undefined,
    itemCategoryId: edit?.itemCategoryId ?? 0,
    itemSubcategoryId: edit?.itemSubcategoryId ?? undefined,
    brandmasterId: edit?.brandmasterId ?? undefined,
    make: edit?.make ?? "",
    model: edit?.model ?? "",
    supplierIds: parseSupplierIds(edit),
    // Angular defaults: isReqTracking=true, isActive=true, reason='active'
    isReqTracking: edit?.isReqTracking ?? true,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvItem | null;
  onSaved: () => void;
}

export default function ItemMasterModal({
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

  const selectedCategoryId = watch("itemCategoryId");
  const isActive = watch("isActive");

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
    enabled: open,
  });

  const { data: itemTypes = [], isLoading: itemTypesLoading } = useQuery({
    queryKey: ["GeneralDetail", "ITEMCATTYPE", "forInvItem"],
    queryFn: listInvItemTypes,
    enabled: open,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QK.invItemCategories.list(),
    queryFn: listInvItemCategories,
    enabled: open,
  });

  const { data: subCategories = [], isLoading: subCategoriesLoading } =
    useQuery({
      queryKey: ["InvItemsubcategory", "byCategory", selectedCategoryId],
      queryFn: () => listInvItemSubCategoriesByCategory(selectedCategoryId),
      enabled: open && selectedCategoryId > 0,
    });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: QK.invBrands.list(),
    queryFn: listInvBrands,
    enabled: open,
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QK.invSuppliersMaster.list(),
    queryFn: listInvSuppliersMaster,
    enabled: open,
  });

  const organizationOptions: SelectOption[] = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId ?? ""),
        label: String(o.orgCode ?? o.orgName ?? o.organizationId ?? ""),
      })),
    [organizations],
  );

  const itemTypeOptions: SelectOption[] = useMemo(
    () =>
      itemTypes.map((t) => ({
        value: String(t.generalDetailId ?? ""),
        label: String(
          t.generalDetailDisplayName ??
            t.generalDetailName ??
            t.generalDetailCode ??
            t.generalDetailId ??
            "",
        ),
      })),
    [itemTypes],
  );

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.itemCategoryId),
        label: c.categoryName ?? c.categoryCode ?? String(c.itemCategoryId),
      })),
    [categories],
  );

  const subCategoryOptions: SelectOption[] = useMemo(
    () =>
      subCategories.map((s) => ({
        value: String(s.itemSubcategoryId),
        label:
          s.subcategoryName ?? s.subcategoryCode ?? String(s.itemSubcategoryId),
      })),
    [subCategories],
  );

  const brandOptions: SelectOption[] = useMemo(
    () =>
      brands.map((b) => ({
        value: String(b.brandmasterId),
        label: b.brandName ?? b.brandCode ?? String(b.brandmasterId),
      })),
    [brands],
  );

  // Angular displays supplierName; filter also matches supplierCode (ngx-mat-select-search)
  const supplierOptions: SelectOption[] = useMemo(
    () =>
      suppliers.map((s) => {
        const name = s.supplierName?.trim() || String(s.supplierId);
        const code = s.supplierCode?.trim();
        return {
          value: String(s.supplierId),
          label: code ? `${name} (${code})` : name,
        };
      }),
    [suppliers],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const supplierIds =
      values.supplierIds.length > 0 ? values.supplierIds.join(",") : undefined;

    const payload: Partial<InvItem> = {
      organizationId: values.organizationId,
      itemCode: values.itemCode.trim(),
      itemName: values.itemName.trim(),
      itemAliasname: values.itemAliasname?.trim() || undefined,
      itemTypeCatdetId: values.itemTypeCatdetId || undefined,
      itemCategoryId: values.itemCategoryId,
      itemSubcategoryId: values.itemSubcategoryId || undefined,
      brandmasterId: values.brandmasterId || undefined,
      make: values.make?.trim() || undefined,
      model: values.model?.trim() || undefined,
      supplierIds,
      isReqTracking: values.isReqTracking,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets itemId + createdDt before updateDetails
        await updateInvItem(editData.itemId, {
          ...payload,
          itemId: editData.itemId,
          createdDt: editData.createdDt,
        });
        toastSuccess("Item master updated successfully.");
      } else {
        await createInvItem(payload);
        toastSuccess("Item master created successfully.");
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
      title={editData ? "Edit Master Item" : "Add Master Item"}
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
      <Controller
        name="organizationId"
        control={control}
        render={({ field }) => (
          <Select
            label="Organization *"
            value={field.value > 0 ? String(field.value) : null}
            onChange={(v) => field.onChange(v ? Number(v) : 0)}
            options={organizationOptions}
            placeholder="Organization"
            isLoading={orgsLoading}
            searchable
            error={errors.organizationId?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Item Name *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Name"
            {...register("itemName")}
          />
          {errors.itemName && (
            <p className="text-xs text-red-500">{errors.itemName.message}</p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Item Code *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Code"
            {...register("itemCode")}
          />
          {errors.itemCode && (
            <p className="text-xs text-red-500">{errors.itemCode.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Item Alias Name</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Alias Name"
            {...register("itemAliasname")}
          />
        </div>
        <Controller
          name="itemTypeCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Type"
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : null
              }
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={itemTypeOptions}
              placeholder="Item Type"
              isLoading={itemTypesLoading}
              searchable
              clearable
            />
          )}
        />
        <Controller
          name="itemCategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Category *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0);
                setValue("itemSubcategoryId", undefined);
              }}
              options={categoryOptions}
              placeholder="Item Category"
              isLoading={categoriesLoading}
              searchable
              error={errors.itemCategoryId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Controller
          name="itemSubcategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Sub Category"
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : null
              }
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={subCategoryOptions}
              placeholder="Item Sub Category"
              isLoading={subCategoriesLoading}
              searchable
              clearable
              disabled={!selectedCategoryId}
            />
          )}
        />
        <Controller
          name="brandmasterId"
          control={control}
          render={({ field }) => (
            <Select
              label="Brand"
              value={
                field.value != null && field.value > 0
                  ? String(field.value)
                  : null
              }
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={brandOptions}
              placeholder="Brand"
              isLoading={brandsLoading}
              searchable
              clearable
            />
          )}
        />
        <div className="space-y-0.5">
          <Label className="text-xs">Make</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Make"
            {...register("make")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Model</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Model"
            {...register("model")}
          />
        </div>
        <Controller
          name="supplierIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Supplier"
              value={field.value ?? []}
              onChange={field.onChange}
              options={supplierOptions}
              placeholder="Supplier"
              isLoading={suppliersLoading}
              searchable
              showSelectAll={false}
            />
          )}
        />
        <Controller
          name="isReqTracking"
          control={control}
          render={({ field }) => (
            <div className="flex h-full items-end pb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isReqTracking"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(Boolean(checked))
                  }
                />
                <Label
                  htmlFor="isReqTracking"
                  className="text-xs font-normal cursor-pointer"
                >
                  Is Trackable
                </Label>
              </div>
            </div>
          )}
        />
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="itemIsActive"
              checked={field.value}
              onCheckedChange={(checked) => {
                const active = Boolean(checked);
                field.onChange(active);
                if (active) setValue("reason", "active");
              }}
            />
            <Label
              htmlFor="itemIsActive"
              className="text-xs font-normal cursor-pointer"
            >
              Active
            </Label>
          </div>
        )}
      />

      {!isActive && (
        <div className="space-y-0.5 sm:max-w-md">
          <Label className="text-xs">Reason</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Reason"
            {...register("reason")}
          />
          {errors.reason && (
            <p className="text-xs text-red-500">{errors.reason.message}</p>
          )}
        </div>
      )}
    </FormModal>
  );
}
