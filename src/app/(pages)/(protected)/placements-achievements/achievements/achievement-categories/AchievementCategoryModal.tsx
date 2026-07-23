"use client";

/**
 * Angular parity: placement-categories-modal
 * Required: organizationId, achievementCategory, achievementCategoryCode
 * Organizations: active only (orgCode labels). Update includes categoryId.
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
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createAchievementCategory,
  listActiveOrganizations,
  updateAchievementCategory,
} from "@/services";
import type { AchievementCategory } from "@/types/placements";
import type { Organization } from "@/types/organization";

const schema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    achievementCategory: z.string().min(1, "Achievement category is required"),
    achievementCategoryCode: z
      .string()
      .min(1, "Achievement category code is required"),
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

function getDefaults(edit?: AchievementCategory | null): FormValues {
  return {
    organizationId:
      edit?.organizationId != null ? String(edit.organizationId) : "",
    achievementCategory: edit?.achievementCategory ?? "",
    achievementCategoryCode: edit?.achievementCategoryCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface AchievementCategoryModalProps {
  open: boolean;
  onClose: () => void;
  editData: AchievementCategory | null;
  onSaved: () => void;
}

export function AchievementCategoryModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<AchievementCategoryModalProps>) {
  const isEditing = editData != null;
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
    // Angular: listDetailsById(Organization, true, isActive)
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

    const payload: Record<string, unknown> = {
      organizationId: Number(values.organizationId),
      achievementCategory: values.achievementCategory.trim(),
      achievementCategoryCode: values.achievementCategoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : String(values.reason ?? "").trim() || "inactive",
    };

    try {
      if (isEditing && editData?.categoryId) {
        // Angular parent: details.categoryId = data.categoryId
        payload.categoryId = editData.categoryId;
        await updateAchievementCategory(
          editData.categoryId,
          payload as Partial<AchievementCategory>,
        );
        toastSuccess("Achievement category updated successfully");
      } else {
        await createAchievementCategory(
          payload as Partial<AchievementCategory>,
        );
        toastSuccess("Achievement category created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save achievement category");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        isEditing ? "Edit Achievement Category" : "Add Achievement Category"
      }
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

        <div className="space-y-1.5">
          <Label htmlFor="achievementCategory">Achievement Category *</Label>
          <Input
            id="achievementCategory"
            {...register("achievementCategory")}
          />
          {errors.achievementCategory ? (
            <p className="text-xs text-destructive">
              {errors.achievementCategory.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="achievementCategoryCode">
            Achievement Category Code *
          </Label>
          <Input
            id="achievementCategoryCode"
            {...register("achievementCategoryCode")}
          />
          {errors.achievementCategoryCode ? (
            <p className="text-xs text-destructive">
              {errors.achievementCategoryCode.message}
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

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
