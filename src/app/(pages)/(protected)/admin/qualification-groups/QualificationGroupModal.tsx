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
  createQualificationGroup,
  listActiveQualificationsForGroups,
  updateQualificationGroup,
} from "@/services";
import type { Qualification } from "@/types/qualification";
import type { QualificationGroup } from "@/types/qualification-group";

const schema = z.object({
  qualificationId: z.number().min(1, "Qualification is required"),
  qualificationGroupName: z
    .string()
    .trim()
    .min(1, "Qualification group name is required"),
  qualificationGroupCode: z
    .string()
    .trim()
    .min(1, "Qualification group code is required"),
  sortOrder: z.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function QualificationGroupModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: QualificationGroup | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
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
      qualificationId: undefined,
      qualificationGroupName: "",
      qualificationGroupCode: "",
      sortOrder: 0,
      isActive: true,
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveQualificationsForGroups()
      .then(setQualifications)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset({
      qualificationId: row?.qualificationId,
      qualificationGroupName: row?.qualificationGroupName ?? "",
      qualificationGroupCode: row?.qualificationGroupCode ?? "",
      sortOrder: row?.sortOrder ?? 0,
      isActive: row?.isActive ?? true,
      reason: row?.reason ?? "",
    });
    setSubmitError(null);
  }, [row, open, reset]);

  const qualificationOptions = useMemo(
    () =>
      qualifications.map((q) => ({
        value: String(q.qualificationId),
        label: `${q.qualificationCode} - ${q.qualificationName}`,
      })),
    [qualifications],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing)
        await updateQualificationGroup(row!.qualificationGroupId, data);
      else
        await createQualificationGroup(
          data as Omit<QualificationGroup, "qualificationGroupId">,
        );
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save qualification group",
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Qualification Group" : "Add Qualification Group"}
      onSubmit={() => void handleSubmit(onSubmit)()}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="lg"
      contentClassName="sm:max-w-[48rem]"
      showHeaderDivider
    >
      <Controller
        name="qualificationId"
        control={control}
        render={({ field }) => (
          <Select
            label="Qualification"
            required
            value={field.value ? String(field.value) : null}
            onChange={(value) =>
              field.onChange(value ? Number(value) : undefined)
            }
            options={qualificationOptions}
            placeholder="Select qualification"
            error={errors.qualificationId?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
        <FormField
          label="Qualification Group Name"
          required
          htmlFor="qualificationGroupName"
          error={errors.qualificationGroupName?.message}
        >
          <Input
            id="qualificationGroupName"
            {...register("qualificationGroupName")}
          />
        </FormField>
        <FormField
          label="Qualification Group Code"
          required
          htmlFor="qualificationGroupCode"
          error={errors.qualificationGroupCode?.message}
        >
          <Input
            id="qualificationGroupCode"
            {...register("qualificationGroupCode")}
          />
        </FormField>
        <FormField
          label="Sort Order"
          htmlFor="sortOrder"
          error={errors.sortOrder?.message}
        >
          <Input
            id="sortOrder"
            inputMode="numeric"
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
