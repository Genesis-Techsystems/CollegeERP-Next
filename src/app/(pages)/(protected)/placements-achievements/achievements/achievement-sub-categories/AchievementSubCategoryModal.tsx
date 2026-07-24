"use client";

/**
 * Angular parity: placement-sub-category-modal
 * Required: categoryId, achievementSubcategory, achievementSubcategoryCode
 * Category dropdown: achievementCategoryCode - orgCode (active categories only)
 * Payload includes organizationId from selected category; update includes subCategoryId.
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
  createAchievementSubCategory,
  listActiveAchievementCategories,
  updateAchievementSubCategory,
} from "@/services";
import type {
  AchievementCategory,
  AchievementSubCategory,
} from "@/types/placements";

const schema = z
  .object({
    categoryId: z.string().min(1, "Achievement category is required"),
    achievementSubcategory: z
      .string()
      .min(1, "Achievement sub category is required"),
    achievementSubcategoryCode: z
      .string()
      .min(1, "Achievement sub category code is required"),
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

function getDefaults(edit?: AchievementSubCategory | null): FormValues {
  return {
    categoryId: edit?.categoryId != null ? String(edit.categoryId) : "",
    achievementSubcategory: edit?.achievementSubcategory ?? "",
    achievementSubcategoryCode: edit?.achievementSubcategoryCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface AchievementSubCategoryModalProps {
  open: boolean;
  onClose: () => void;
  editData: AchievementSubCategory | null;
  onSaved: () => void;
}

export function AchievementSubCategoryModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<AchievementSubCategoryModalProps>) {
  const isEditing = editData != null;
  const [categories, setCategories] = useState<AchievementCategory[]>([]);
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
    // Angular: listDetailsById(Category, true, isActive)
    void listActiveAchievementCategories()
      .then(setCategories)
      .catch(console.error);
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories.map((c) => ({
        value: String(c.categoryId),
        label: `${c.achievementCategoryCode} - ${c.orgCode ?? ""}`.trim(),
      })),
    [categories],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const cat = categories.find(
      (c) => c.categoryId === Number(values.categoryId),
    );
    if (!cat) {
      setSubmitError("Selected achievement category is invalid.");
      return;
    }

    const payload: Record<string, unknown> = {
      categoryId: Number(values.categoryId),
      organizationId: cat.organizationId,
      achievementSubcategory: values.achievementSubcategory.trim(),
      achievementSubcategoryCode: values.achievementSubcategoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : String(values.reason ?? "").trim() || "inactive",
    };

    try {
      if (isEditing && editData?.subCategoryId) {
        // Angular parent: details.subCategoryId = data.subCategoryId
        payload.subCategoryId = editData.subCategoryId;
        await updateAchievementSubCategory(
          editData.subCategoryId,
          payload as Partial<AchievementSubCategory>,
        );
        toastSuccess("Achievement sub category updated successfully");
      } else {
        await createAchievementSubCategory(
          payload as Partial<AchievementSubCategory>,
        );
        toastSuccess("Achievement sub category created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save achievement sub category");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        isEditing
          ? "Edit Achievement Sub Category"
          : "Add Achievement Sub Category"
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
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Achievement Category"
              required
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={categoryOptions}
              placeholder="Achievement Category"
              searchable
              error={errors.categoryId?.message}
            />
          )}
        />

        <div className="space-y-1.5">
          <Label htmlFor="achievementSubcategory">
            Achievement Sub Category *
          </Label>
          <Input
            id="achievementSubcategory"
            {...register("achievementSubcategory")}
          />
          {errors.achievementSubcategory ? (
            <p className="text-xs text-destructive">
              {errors.achievementSubcategory.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="achievementSubcategoryCode">
            Achievement Sub Category Code *
          </Label>
          <Input
            id="achievementSubcategoryCode"
            {...register("achievementSubcategoryCode")}
          />
          {errors.achievementSubcategoryCode ? (
            <p className="text-xs text-destructive">
              {errors.achievementSubcategoryCode.message}
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
