"use client";

/**
 * Angular parity: user-management/modules module-modal
 * Required: moduleName, displayName, url, iconName, sortOrder
 * isActive checkbox (default true); reason always sent as 'NA' (hidden field).
 * No print.
 */

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/lib/toast";
import { createModule, updateModule, type NavModule } from "@/services";

const schema = z.object({
  moduleName: z.string().min(1, "Module Name is required"),
  displayName: z.string().min(1, "Display Name is required"),
  url: z.string().min(1, "URL is required"),
  iconName: z.string().min(1, "Icon Name is required"),
  sortOrder: z.string().min(1, "Sort Order is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: NavModule | null): FormValues {
  return {
    moduleName: edit?.moduleName ?? "",
    displayName: edit?.displayName ?? "",
    url: edit?.url ?? "",
    iconName: edit?.iconName ?? "",
    sortOrder: edit?.sortOrder != null ? String(edit.sortOrder) : "",
    isActive: edit?.isActive ?? true,
  };
}

export interface ModuleModalProps {
  open: boolean;
  onClose: () => void;
  editData: NavModule | null;
  onSaved: () => void;
}

export function ModuleModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<ModuleModalProps>) {
  const isEditing = editData != null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<NavModule> = {
      moduleName: values.moduleName.trim(),
      displayName: values.displayName.trim(),
      url: values.url.trim(),
      iconName: values.iconName.trim(),
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      reason: "NA",
    };

    try {
      if (isEditing && editData?.moduleId) {
        payload.moduleId = editData.moduleId;
        await updateModule(editData.moduleId, payload);
        toastSuccess("Module updated successfully");
      } else {
        await createModule(payload);
        toastSuccess("Module created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, "Failed to save module");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Module" : "Add Module"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="moduleName">Module Name *</Label>
          <Input id="moduleName" {...register("moduleName")} />
          {errors.moduleName ? (
            <p className="text-xs text-destructive">
              {errors.moduleName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name *</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName ? (
            <p className="text-xs text-destructive">
              {errors.displayName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="url">URL *</Label>
          <Input id="url" {...register("url")} />
          {errors.url ? (
            <p className="text-xs text-destructive">{errors.url.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="iconName">Icon Name *</Label>
          <Input id="iconName" {...register("iconName")} />
          {errors.iconName ? (
            <p className="text-xs text-destructive">
              {errors.iconName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order *</Label>
          <Input id="sortOrder" type="number" {...register("sortOrder")} />
          {errors.sortOrder ? (
            <p className="text-xs text-destructive">
              {errors.sortOrder.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
              </>
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
