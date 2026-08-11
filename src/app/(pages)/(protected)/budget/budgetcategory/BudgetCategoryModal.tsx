"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
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
  createBudgetCategory,
  listActiveOrganizationsForBudget,
  updateBudgetCategory,
} from "@/services";
import type { BudgetCategory } from "@/types/budget";
import type { Organization } from "@/types/organization";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  budgetCategoryName: z.string().min(1, "Category name is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface BudgetCategoryModalProps {
  open: boolean;
  onClose: () => void;
  row: BudgetCategory | null;
  onSaved: () => void;
}

export default function BudgetCategoryModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<BudgetCategoryModalProps>) {
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
      budgetCategoryName: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveOrganizationsForBudget()
      .then(setOrganizations)
      .catch(() => setOrganizations([]));
  }, [open]);

  useEffect(() => {
    if (row) {
      reset({
        organizationId: row.organizationId,
        budgetCategoryName: row.budgetCategoryName,
        isActive: row.isActive,
        reason: row.reason ?? "",
      });
    } else {
      reset();
    }
    setSubmitError(null);
  }, [row, open, reset]);

  const organizationOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName,
      })),
    [organizations],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateBudgetCategory(row!.budgetCategoryId, data);
      else await createBudgetCategory(data);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save budget category",
      );
    }
  }

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Budget Category" : "Add Budget Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
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
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <div>
            <Label htmlFor="budgetCategoryName">Category Name *</Label>
            <Input
              id="budgetCategoryName"
              {...register("budgetCategoryName")}
            />
            {errors.budgetCategoryName && (
              <p className="text-xs text-red-500">
                {errors.budgetCategoryName.message}
              </p>
            )}
          </div>
          {isEditing && (
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
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
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
