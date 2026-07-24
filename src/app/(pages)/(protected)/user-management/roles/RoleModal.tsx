"use client";

/**
 * Angular parity: user-management/roles role-modal
 * Required: organizationId, roleName
 * Optional: isEditable; Active + reason; collegeId from session (hidden)
 * No print.
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createRole,
  listActiveOrganizations,
  updateRole,
  type Role,
} from "@/services";
import type { Organization } from "@/types/organization";

const schema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    roleName: z.string().min(1, "Role name is required"),
    isEditable: z.boolean(),
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

function getDefaults(edit?: Role | null): FormValues {
  return {
    organizationId:
      edit?.organizationId != null ? String(edit.organizationId) : "",
    roleName: edit?.roleName ?? "",
    isEditable: edit?.isEditable ?? false,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface RoleModalProps {
  open: boolean;
  onClose: () => void;
  editData: Role | null;
  onSaved: () => void;
}

export function RoleModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<RoleModalProps>) {
  const isEditing = editData != null;
  const { user } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);
    void listActiveOrganizations().then(setOrganizations).catch(console.error);
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  const organizationOptions = useMemo<SelectOption[]>(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode || o.orgName || String(o.organizationId),
      })),
    [organizations],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload: Partial<Role> = {
      organizationId: Number(values.organizationId),
      // Angular: collegeId from localStorage
      collegeId: Number(user?.collegeId ?? editData?.collegeId ?? 0) || null,
      roleName: values.roleName.trim(),
      description: "",
      isEditable: values.isEditable,
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : String(values.reason ?? "").trim() || "inactive",
    };

    try {
      if (isEditing && editData?.roleId) {
        payload.roleId = editData.roleId;
        await updateRole(editData.roleId, payload);
        toastSuccess("Role updated successfully");
      } else {
        await createRole(payload);
        toastSuccess("Role created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save role");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Role" : "Add Role"}
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
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization"
              required
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={organizationOptions}
              placeholder="Organization"
              searchable
              error={errors.organizationId?.message}
            />
          )}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="roleName">Role Name *</Label>
          <Input id="roleName" {...register("roleName")} />
          {errors.roleName ? (
            <p className="text-xs text-destructive">
              {errors.roleName.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="isEditable"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="isEditable"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isEditable">Editable</Label>
              </>
            )}
          />
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

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
