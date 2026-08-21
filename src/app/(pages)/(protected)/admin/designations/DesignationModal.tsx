"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import {
  createDesignation,
  listActiveOrganizationsForDesignations,
  updateDesignation,
} from "@/services";
import type { Designation } from "@/types/designation";
import type { Organization } from "@/types/organization";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  designationName: z.string().trim().min(1, "Designation name is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function DesignationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: Designation | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      designationName: "",
      isActive: true,
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveOrganizationsForDesignations()
      .then(setOrganizations)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset({
      organizationId: row?.organizationId,
      designationName: row?.designationName ?? "",
      isActive: row?.isActive ?? true,
      reason: row?.reason ?? "",
    });
    setSubmitError(null);
  }, [row, open, reset]);

  const organizationOptions = useMemo(
    () =>
      organizations.map((org) => ({
        value: String(org.organizationId),
        label: org.orgCode ?? org.orgName,
      })),
    [organizations],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateDesignation(row!.designationId, data);
      else await createDesignation(data);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save designation",
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Designation" : "Add Designation"}
      onSubmit={() => void handleSubmit(onSubmit)()}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="md"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization"
              required
              value={field.value ? String(field.value) : null}
              onChange={(value) =>
                field.onChange(value ? Number(value) : undefined)
              }
              options={organizationOptions}
              placeholder="Select organization"
              error={errors.organizationId?.message}
            />
          )}
        />
        <FormField
          label="Designation"
          required
          htmlFor="designationName"
          error={errors.designationName?.message}
        >
          <Input id="designationName" {...register("designationName")} />
        </FormField>
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <ActiveStatusField
            label="Active"
            isActive={field.value}
            reason={watch("reason") ?? ""}
            onActiveChange={field.onChange}
            onReasonChange={(value) => setValue("reason", value)}
            reasonError={errors.reason?.message}
          />
        )}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
    </FormModal>
  );
}
