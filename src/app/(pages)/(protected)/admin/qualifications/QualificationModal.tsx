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
  createQualification,
  listActiveOrganizationsForQualifications,
  updateQualification,
} from "@/services";
import type { Organization } from "@/types/organization";
import type { Qualification } from "@/types/qualification";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  qualificationName: z.string().trim().min(1, "Qualification name is required"),
  qualificationCode: z.string().trim().min(1, "Qualification code is required"),
  sortOrder: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function QualificationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: Qualification | null;
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
      qualificationName: "",
      qualificationCode: "",
      sortOrder: 0,
      isActive: true,
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveOrganizationsForQualifications()
      .then(setOrganizations)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset({
      organizationId: row?.organizationId,
      qualificationName: row?.qualificationName ?? "",
      qualificationCode: row?.qualificationCode ?? "",
      sortOrder: row?.sortOrder ?? 0,
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
      if (isEditing) await updateQualification(row!.qualificationId, data);
      else
        await createQualification(
          data as Omit<Qualification, "qualificationId">,
        );
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save qualification",
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Qualification" : "Add Qualification"}
      onSubmit={() => void handleSubmit(onSubmit)()}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
    >
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <FormField
          className="sm:col-span-2"
          label="Qualification Name"
          required
          htmlFor="qualificationName"
          error={errors.qualificationName?.message}
        >
          <Input id="qualificationName" {...register("qualificationName")} />
        </FormField>
        <FormField
          label="Qualification Code"
          required
          htmlFor="qualificationCode"
          error={errors.qualificationCode?.message}
        >
          <Input id="qualificationCode" {...register("qualificationCode")} />
        </FormField>
        <FormField
          label="Sort Order"
          htmlFor="sortOrder"
          error={errors.sortOrder?.message}
        >
          <Input
            id="sortOrder"
            type="number"
            {...register("sortOrder", { valueAsNumber: true })}
          />
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
