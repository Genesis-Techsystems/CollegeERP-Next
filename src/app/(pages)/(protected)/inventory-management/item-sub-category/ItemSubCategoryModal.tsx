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
  createInvItemSubCategory,
  listActiveOrganizationsForInventory,
  listInvItemCategories,
  updateInvItemSubCategory,
} from "@/services";
import type { InvItemSubCategory } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  itemCategoryId: z.coerce.number().min(1, "Item Category is required"),
  subcategoryName: z.string().min(1, "Item Sub Category Name is required"),
  subcategoryCode: z.string().min(1, "Item Sub Category Code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvItemSubCategory | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    itemCategoryId: edit?.itemCategoryId ?? 0,
    subcategoryName: edit?.subcategoryName ?? "",
    subcategoryCode: edit?.subcategoryCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvItemSubCategory | null;
  onSaved: () => void;
}

export default function ItemSubCategoryModal({
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

  /** Angular: listDetailsById(Organization, 'true', 'isActive') → size=99999&query=isActive==true */
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
    enabled: open,
  });

  /** Angular: listAllDetails(InvItemcategory) → query=order(createdDt=desc)&size=99999 */
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QK.invItemCategories.list(),
    queryFn: listInvItemCategories,
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

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.itemCategoryId),
        label: c.categoryName ?? c.categoryCode ?? String(c.itemCategoryId),
      })),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvItemSubCategory> = {
      organizationId: values.organizationId,
      itemCategoryId: values.itemCategoryId,
      subcategoryName: values.subcategoryName.trim(),
      subcategoryCode: values.subcategoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets details.itemSubcategoryId before updateDetails(..., itemSubcategoryId, 'itemSubcategoryId')
        await updateInvItemSubCategory(editData.itemSubcategoryId, {
          ...payload,
          itemSubcategoryId: editData.itemSubcategoryId,
        });
        toastSuccess("Item sub category updated successfully.");
      } else {
        await createInvItemSubCategory(payload);
        toastSuccess("Item sub category created successfully.");
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
      title={editData ? "Edit Item Sub Category" : "Add Item Sub Category"}
      titleClassName="text-[hsl(var(--primary))] text-base font-semibold"
      size="lg"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      formClassName="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Controller
          name="itemCategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Category *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={categoryOptions}
              placeholder="Item Category"
              isLoading={categoriesLoading}
              searchable
              error={errors.itemCategoryId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5">
          <Label className="text-xs">Item Sub Category Name *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Sub Category Name"
            {...register("subcategoryName")}
          />
          {errors.subcategoryName && (
            <p className="text-xs text-red-500">
              {errors.subcategoryName.message}
            </p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Item Sub Category Code *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Sub Category Code"
            {...register("subcategoryCode")}
          />
          {errors.subcategoryCode && (
            <p className="text-xs text-red-500">
              {errors.subcategoryCode.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="itemSubCategoryIsActive"
                checked={field.value}
                onCheckedChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
              />
              <Label
                htmlFor="itemSubCategoryIsActive"
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
