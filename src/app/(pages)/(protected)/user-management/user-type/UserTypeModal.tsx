"use client";

/**
 * Angular parity: user-management/user-type modal
 * Required: userTypeName, userTypeCode
 * isActive default true; reason default 'Active' (shown when inactive; not required)
 * organizationId stamped by parent from filter.
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
import { createUserType, updateUserType, type UserType } from "@/services";

const schema = z.object({
  userTypeName: z.string().min(1, "User Type Name is required"),
  userTypeCode: z.string().min(1, "User Type Code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: UserType | null): FormValues {
  return {
    userTypeName: edit?.userTypeName ?? "",
    userTypeCode: edit?.userTypeCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "Active",
  };
}

export interface UserTypeModalProps {
  open: boolean;
  onClose: () => void;
  editData: UserType | null;
  organizationId: number;
  onSaved: () => void;
}

export function UserTypeModal({
  open,
  onClose,
  editData,
  organizationId,
  onSaved,
}: Readonly<UserTypeModalProps>) {
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

  async function onSubmit(values: FormValues) {
    const payload: Partial<UserType> = {
      userTypeName: values.userTypeName.trim(),
      userTypeCode: values.userTypeCode.trim(),
      isActive: values.isActive,
      reason: values.isActive
        ? "Active"
        : String(values.reason ?? "").trim() || "Active",
      organizationId: organizationId || null,
    };

    try {
      if (isEditing) {
        const id =
          Number(editData?.userTypeId ?? editData?.usertypeId ?? 0) || 0;
        if (!id) {
          toastError("User type id is missing");
          return;
        }
        payload.userTypeId = id;
        await updateUserType(id, payload);
        toastSuccess("User Type updated successfully");
      } else {
        await createUserType(payload);
        toastSuccess("User Type created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, "Failed to save user type");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit User Type" : "Add User Type"}
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
          <Label htmlFor="userTypeName">User Type Name *</Label>
          <Input id="userTypeName" {...register("userTypeName")} />
          {errors.userTypeName ? (
            <p className="text-xs text-destructive">
              {errors.userTypeName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="userTypeCode">User Type Code *</Label>
          <Input id="userTypeCode" {...register("userTypeCode")} />
          {errors.userTypeCode ? (
            <p className="text-xs text-destructive">
              {errors.userTypeCode.message}
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
                onActiveChange={(v) => {
                  field.onChange(v === true);
                  if (v === true) setValue("reason", "Active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonRequired={false}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
