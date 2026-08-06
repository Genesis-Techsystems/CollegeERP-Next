"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGrievanceCategory,
  updateGrievanceCategory,
  type GrievanceCategory,
} from "@/services";

const schema = z.object({
  grievanceCategory: z.string().min(1, "Grievance Category Name is required"),
  grievanceCategoryCode: z
    .string()
    .min(1, "Grievance Category Code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GrievanceCategoryModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: GrievanceCategory | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
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
      grievanceCategory: "",
      grievanceCategoryCode: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (row) {
      reset({
        grievanceCategory: row.grievanceCategory ?? "",
        grievanceCategoryCode: row.grievanceCategoryCode ?? "",
        isActive: row.isActive !== false,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        grievanceCategory: "",
        grievanceCategoryCode: "",
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [row, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateGrievanceCategory(row!.categoryId, data);
      else await createGrievanceCategory(data);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save category",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            {isEditing ? "Edit Grievance Category" : "Add Grievance Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <Label htmlFor="grievanceCategory">
                Grievance Category Name *
              </Label>
              <Input
                id="grievanceCategory"
                {...register("grievanceCategory")}
              />
              {errors.grievanceCategory && (
                <p className="text-xs text-red-500">
                  {errors.grievanceCategory.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="grievanceCategoryCode">
                Grievance Category Code *
              </Label>
              <Input
                id="grievanceCategoryCode"
                {...register("grievanceCategoryCode")}
              />
              {errors.grievanceCategoryCode && (
                <p className="text-xs text-red-500">
                  {errors.grievanceCategoryCode.message}
                </p>
              )}
            </div>
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(value) => setValue("reason", value)}
                reasonError={errors.reason?.message}
              />
            )}
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
