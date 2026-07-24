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
import {
  createInvItemCategory,
  listActiveOrganizationsForInventory,
  updateInvItemCategory,
} from "@/services";
import type { InvItemCategory } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  categoryName: z.string().min(1, "Item Category Name is required"),
  categoryCode: z.string().min(1, "Item Category Code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvItemCategory | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    categoryName: edit?.categoryName ?? "",
    categoryCode: edit?.categoryCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvItemCategory | null;
  onSaved: () => void;
}

export default function ItemCategoryModal({
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

  const organizationOptions: SelectOption[] = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId ?? ""),
        label: String(o.orgCode ?? o.orgName ?? o.organizationId ?? ""),
      })),
    [organizations],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvItemCategory> = {
      organizationId: values.organizationId,
      categoryName: values.categoryName.trim(),
      categoryCode: values.categoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets details.itemCategoryId before updateDetails(..., itemCategoryId, 'itemCategoryId')
        await updateInvItemCategory(editData.itemCategoryId, {
          ...payload,
          itemCategoryId: editData.itemCategoryId,
        });
        toastSuccess("Item category updated successfully.");
      } else {
        await createInvItemCategory(payload);
        toastSuccess("Item category created successfully.");
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
      title={editData ? "Edit Item Category" : "Add Item Category"}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5">
          <Label className="text-xs">Item Category Name *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Category Name"
            {...register("categoryName")}
          />
          {errors.categoryName && (
            <p className="text-xs text-red-500">
              {errors.categoryName.message}
            </p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Item Category Code *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Item Category Code"
            {...register("categoryCode")}
          />
          {errors.categoryCode && (
            <p className="text-xs text-red-500">
              {errors.categoryCode.message}
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
                id="itemCategoryIsActive"
                checked={field.value}
                onCheckedChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
              />
              <Label
                htmlFor="itemCategoryIsActive"
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
