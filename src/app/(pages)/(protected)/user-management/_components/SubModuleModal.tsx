"use client";

/**
 * Angular parity: user-management/sub-modules sub-module-modal
 * Required: submoduleName, displayName
 * Optional: iconName, sortOrder (default '0'); isActive (default true) + reason
 * (default reason 'isActive' when active, like Angular).
 * moduleId / moduleName are stamped from the parent route's query params, not
 * user editable here.
 * No print.
 */

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createSubModule,
  updateSubModule,
  type NavSubModule,
} from "@/services";

const schema = z
  .object({
    submoduleName: z.string().min(1, "Sub Module Name is required"),
    displayName: z.string().min(1, "Display Name is required"),
    iconName: z.string().min(1, "Icon Name is required"),
    sortOrder: z.string().min(1, "Sort Order is required"),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !String(values.reason ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when inactive",
        path: ["reason"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: NavSubModule | null): FormValues {
  return {
    submoduleName: edit?.submoduleName ?? "",
    displayName: edit?.displayName ?? "",
    iconName: edit?.iconName ?? "",
    sortOrder: edit?.sortOrder != null ? String(edit.sortOrder) : "0",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "isActive",
  };
}

export interface SubModuleModalProps {
  open: boolean;
  onClose: () => void;
  editData: NavSubModule | null;
  onSaved: () => void;
  moduleId: number;
  moduleName: string;
}

export function SubModuleModal({
  open,
  onClose,
  editData,
  onSaved,
  moduleId,
  moduleName,
}: Readonly<SubModuleModalProps>) {
  const isEditing = editData != null;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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

  const isActive = watch("isActive");

  async function onSubmit(values: FormValues) {
    const payload: Partial<NavSubModule> = {
      submoduleName: values.submoduleName.trim(),
      displayName: values.displayName.trim(),
      iconName: (values.iconName ?? "").trim(),
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      reason: values.isActive
        ? "isActive"
        : String(values.reason ?? "").trim() || "inactive",
      // parent stamps moduleId/moduleName from the query-param scope
      moduleId: isEditing ? (editData?.moduleId ?? moduleId) : moduleId,
      moduleName: isEditing ? (editData?.moduleName ?? moduleName) : moduleName,
    };

    try {
      if (isEditing && editData?.subModuleId) {
        payload.subModuleId = editData.subModuleId;
        await updateSubModule(editData.subModuleId, payload);
        toastSuccess("Sub Module updated successfully");
      } else {
        await createSubModule(payload);
        toastSuccess("Sub Module created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, "Failed to save sub module");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Sub Module" : "Add Sub Module"}
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
          <Label htmlFor="submoduleName">Sub Module Name *</Label>
          <Input id="submoduleName" {...register("submoduleName")} />
          {errors.submoduleName ? (
            <p className="text-xs text-destructive">
              {errors.submoduleName.message}
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

        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
                reasonRequired={!isActive}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
