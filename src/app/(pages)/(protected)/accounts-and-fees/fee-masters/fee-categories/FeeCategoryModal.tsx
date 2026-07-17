"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  createFeeCategory,
  listActiveCollegesForGeneralSettings,
  updateFeeCategory,
} from "@/services";
import type { College } from "@/types/college";
import type { FeeCategory } from "@/types/fee-category";

const schema = z.object({
  collegeId: z.number().min(1, "College is required"),
  feeCategoryCode: z.string().min(1, "Category code is required"),
  categoryName: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  isMaster: z.boolean(),
  isHostel: z.boolean(),
  isTransport: z.boolean(),
  includeInLedger: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function FeeCategoryModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: FeeCategory | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [colleges, setColleges] = useState<College[]>([]);
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
      collegeId: undefined,
      feeCategoryCode: "",
      categoryName: "",
      description: "",
      isMaster: false,
      isHostel: false,
      isTransport: false,
      includeInLedger: false,
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveCollegesForGeneralSettings()
      .then(setColleges)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        feeCategoryCode: row.feeCategoryCode,
        categoryName: row.categoryName,
        description: row.description ?? "",
        isMaster: Boolean(row.isMaster),
        isHostel: Boolean(row.isHostel),
        isTransport: Boolean(row.isTransport),
        includeInLedger: Boolean(row.includeInLedger),
        isActive: row.isActive,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        collegeId: undefined,
        feeCategoryCode: "",
        categoryName: "",
        description: "",
        isMaster: false,
        isHostel: false,
        isTransport: false,
        includeInLedger: false,
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [open, row, reset]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((college) => ({
        value: String(college.collegeId),
        label:
          college.collegeCode ??
          college.collegeName ??
          String(college.collegeId),
      })),
    [colleges],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        description: data.description || null,
        reason: data.isActive ? "active" : data.reason || "",
      };
      if (isEditing) {
        await updateFeeCategory(row!.feeCategoryId, payload);
      } else {
        await createFeeCategory(payload);
      }
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save fee category",
      );
    }
  }

  const dialogTitle = isEditing ? "Edit Fee Category" : "Add Fee Category";
  let submitLabel = "Save";
  if (isSubmitting) submitLabel = "Saving...";
  else if (isEditing) submitLabel = "Update";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  error={errors.collegeId?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="feeCategoryCode">Category Code *</Label>
              <Input id="feeCategoryCode" {...register("feeCategoryCode")} />
              {errors.feeCategoryCode ? (
                <p className="text-xs text-red-500">
                  {errors.feeCategoryCode.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input id="categoryName" {...register("categoryName")} />
              {errors.categoryName ? (
                <p className="text-xs text-red-500">
                  {errors.categoryName.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register("description")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["isMaster", "Master"],
                ["isHostel", "Hostel"],
                ["isTransport", "Transport"],
                ["includeInLedger", "Ledger"],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    {label}
                  </label>
                )}
              />
            ))}
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={field.onChange}
                onReasonChange={(value) => setValue("reason", value)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
