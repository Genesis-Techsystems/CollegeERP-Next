"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/common/components/select";
import { toastError, toastSuccess } from "@/lib/toast";
import { QK } from "@/lib/query-keys";
import {
  createFinCategory,
  listCollegesActive,
  listFinAccountTypesByCollege,
  updateFinCategory,
} from "@/services";
import type { FinCategory } from "@/types/finance";

const requiredId = (message: string) =>
  z.preprocess(
    (v) =>
      v === "" || v == null || Number.isNaN(Number(v)) ? undefined : Number(v),
    z.number({ error: message }).min(1, message),
  );

const schema = z.object({
  collegeId: requiredId("College is required"),
  accountTypeId: requiredId("Account type is required"),
  categoryName: z.string().min(1, "Category name is required"),
  categoryCode: z.string().min(1, "Category code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: FinCategory | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    accountTypeId: edit?.accountTypeId ?? 0,
    categoryName: edit?.categoryName ?? "",
    categoryCode: edit?.categoryCode ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: FinCategory | null;
  onSaved: () => void;
}

export default function FinanceCategoryModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const collegeId = watch("collegeId");
  const isActive = watch("isActive");

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["College", "active"],
    queryFn: listCollegesActive,
    enabled: open,
  });

  const { data: accountTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: QK.finAccountTypes.byCollege(collegeId),
    queryFn: () => listFinAccountTypesByCollege(collegeId),
    enabled: open && collegeId > 0,
  });

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const accountTypeOptions = useMemo<SelectOption[]>(
    () =>
      accountTypes.map((t) => ({
        value: String(t.accountTypeId),
        label: String(t.accounttypeCode),
      })),
    [accountTypes],
  );

  useEffect(() => {
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinCategory> = {
      collegeId: values.collegeId,
      accountTypeId: values.accountTypeId,
      categoryName: values.categoryName.trim(),
      categoryCode: values.categoryCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };
    try {
      if (editData) {
        // Angular editDialog: details.finCategoryId + details.createdDt before updateDetails
        await updateFinCategory(editData.finCategoryId, {
          ...payload,
          finCategoryId: editData.finCategoryId,
          createdDt: editData.createdDt ?? null,
        });
        toastSuccess("Category updated successfully");
      } else {
        await createFinCategory(payload);
        toastSuccess("Category created successfully");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        editData ? "Update category failed" : "Create category failed",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          {/* Angular order: College, Account Type, Category Name, Category Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College *"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => {
                      field.onChange(Number(v));
                      setValue("accountTypeId", 0);
                    }}
                    options={collegeOptions}
                    placeholder="Enter College"
                    isLoading={collegesLoading}
                    searchable
                  />
                )}
              />
              {errors.collegeId && (
                <p className="text-xs text-red-500">
                  {errors.collegeId.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Controller
                name="accountTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Account Type *"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => field.onChange(Number(v))}
                    options={accountTypeOptions}
                    placeholder="Enter Account Type"
                    isLoading={typesLoading}
                    disabled={!collegeId}
                    searchable
                  />
                )}
              />
              {errors.accountTypeId && (
                <p className="text-xs text-red-500">
                  {errors.accountTypeId.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Category Name *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Category Name"
                {...register("categoryName")}
              />
              {errors.categoryName && (
                <p className="text-xs text-red-500">
                  {errors.categoryName.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Category Code *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Category Code"
                {...register("categoryCode")}
              />
              {errors.categoryCode && (
                <p className="text-xs text-red-500">
                  {errors.categoryCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-1">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  Is Active
                </label>
              )}
            />
          </div>

          {!isActive && (
            <div className="space-y-0.5">
              <Label className="text-xs">Reason</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Reason"
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-xs text-red-500">{errors.reason.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editData ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
