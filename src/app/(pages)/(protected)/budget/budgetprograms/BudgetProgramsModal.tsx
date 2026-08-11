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
import { Textarea } from "@/components/ui/textarea";
import {
  createBudgetProgram,
  listActiveBudgetCategories,
  listActiveCollegesForBudget,
  listActiveFinancialYearsForBudget,
  listActiveOrganizationsForBudget,
  updateBudgetProgram,
} from "@/services";
import type { BudgetCategory, BudgetProgram } from "@/types/budget";
import type { College } from "@/types/college";
import type { FinancialYear } from "@/types/financial-year";
import type { Organization } from "@/types/organization";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  collegeId: z.number().min(1, "College is required"),
  financialYearId: z.number().min(1, "Financial year is required"),
  budgetCategoryId: z.number().min(1, "Budget category is required"),
  budgetTitle: z.string().min(1, "Title is required"),
  budgetDescription: z.string().min(1, "Description is required"),
  budgetOutcome: z.string().min(1, "Outcome is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  proposalAmount: z.number().min(0, "Proposal amount is required"),
  actualTotalAllotedAmount: z.number().min(0, "Allotted amount is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function asDateInputValue(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

interface BudgetProgramsModalProps {
  open: boolean;
  onClose: () => void;
  row: BudgetProgram | null;
  onSaved: () => void;
}

export default function BudgetProgramsModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<BudgetProgramsModalProps>) {
  const isEditing = Boolean(row);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
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
      collegeId: undefined,
      financialYearId: undefined,
      budgetCategoryId: undefined,
      budgetTitle: "",
      budgetDescription: "",
      budgetOutcome: "",
      startDate: "",
      endDate: "",
      proposalAmount: undefined,
      actualTotalAllotedAmount: undefined,
      isActive: true,
      reason: "Budget Allocated",
    },
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      listActiveOrganizationsForBudget(),
      listActiveCollegesForBudget(),
      listActiveFinancialYearsForBudget(),
      listActiveBudgetCategories(),
    ])
      .then(([orgRows, collegeRows, fyRows, categoryRows]) => {
        setOrganizations(orgRows);
        setColleges(collegeRows);
        setFinancialYears(fyRows);
        setCategories(categoryRows);
      })
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (row) {
      const raw = row as BudgetProgram & { actualTotalAllottedAmount?: number };
      const allotted = Number(
        raw.actualTotalAllotedAmount ?? raw.actualTotalAllottedAmount ?? 0,
      );
      reset({
        organizationId: row.organizationId,
        collegeId: row.collegeId,
        financialYearId: row.financialYearId,
        budgetCategoryId: row.budgetCategoryId,
        budgetTitle: row.budgetTitle,
        budgetDescription: row.budgetDescription ?? "",
        budgetOutcome: row.budgetOutcome ?? "",
        startDate: asDateInputValue(row.startDate),
        endDate: asDateInputValue(row.endDate),
        proposalAmount: row.proposalAmount,
        actualTotalAllotedAmount: Number.isFinite(allotted) ? allotted : 0,
        isActive: row.isActive,
        reason: row.reason ?? "Budget Allocated",
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
  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [colleges],
  );
  const financialYearOptions = useMemo(
    () =>
      financialYears.map((f) => ({
        value: String(f.financialYearId),
        label: f.financialYear,
      })),
    [financialYears],
  );
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.budgetCategoryId),
        label: c.budgetCategoryName,
      })),
    [categories],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      const allotted = Number(data.actualTotalAllotedAmount);
      const payload: FormValues = {
        ...data,
        proposalAmount: Number(data.proposalAmount),
        actualTotalAllotedAmount: Number.isFinite(allotted) ? allotted : 0,
      };
      if (isEditing) await updateBudgetProgram(row!.budgetProgramId, payload);
      else await createBudgetProgram(payload);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save budget program",
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Budget Program" : "Add Budget Program"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            <Controller
              name="financialYearId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Financial Year"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={financialYearOptions}
                  placeholder="Select financial year"
                  searchable
                  error={errors.financialYearId?.message}
                />
              )}
            />
            <Controller
              name="budgetCategoryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Budget Category"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={categoryOptions}
                  placeholder="Select category"
                  searchable
                  error={errors.budgetCategoryId?.message}
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="budgetTitle">Title *</Label>
            <Input id="budgetTitle" {...register("budgetTitle")} />
            {errors.budgetTitle && (
              <p className="text-xs text-red-500">
                {errors.budgetTitle.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="budgetDescription">Description *</Label>
            <Textarea
              id="budgetDescription"
              {...register("budgetDescription")}
            />
            {errors.budgetDescription && (
              <p className="text-xs text-red-500">
                {errors.budgetDescription.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="budgetOutcome">Outcome *</Label>
            <Textarea id="budgetOutcome" {...register("budgetOutcome")} />
            {errors.budgetOutcome && (
              <p className="text-xs text-red-500">
                {errors.budgetOutcome.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-xs text-red-500">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                min={watch("startDate") || undefined}
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500">{errors.endDate.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="proposalAmount">Proposal Amount *</Label>
              <Input
                id="proposalAmount"
                type="number"
                step="0.01"
                {...register("proposalAmount", { valueAsNumber: true })}
              />
              {errors.proposalAmount && (
                <p className="text-xs text-red-500">
                  {errors.proposalAmount.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="actualTotalAllotedAmount">Alloted Amount *</Label>
              <Input
                id="actualTotalAllotedAmount"
                type="number"
                step="0.01"
                {...register("actualTotalAllotedAmount", {
                  valueAsNumber: true,
                })}
              />
              {errors.actualTotalAllotedAmount && (
                <p className="text-xs text-red-500">
                  {errors.actualTotalAllotedAmount.message}
                </p>
              )}
            </div>
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
