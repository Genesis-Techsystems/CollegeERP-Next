"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
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
  createBudgetAllocation,
  listActiveBudgetPrograms,
  updateBudgetAllocation,
  budgetAllocationNowIso,
} from "@/services";
import type {
  BudgetAllocation,
  BudgetAllocationWritePayload,
  BudgetProgram,
} from "@/types/budget";
import { useSession } from "@/hooks";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";

/** Angular hardcodes — `budget-allocation-modal.component.ts`. */
const DEFAULT_EMP_ID = 11373;
const DEFAULT_PAYMENT_MODE_CAT_DET_ID = 133;

const BTN_NAVY =
  "bg-[#001f3f] text-white hover:bg-[#002a54] disabled:opacity-60";

const schema = z.object({
  /** Form control name; option values are `program.budgetProgramId`. */
  budgetProgramsId: z.number().min(1, "Course is required"),
  budgetTitle: z.string().min(1, "Budget title is required"),
  proposedAmount: z.number().min(0, "Proposed Amount is required"),
  budgetallocationDate: z.string().min(1, "Allocation date is required"),
  proposedByByEmpId: z.number(),
  sanctionedAmount: z.number().min(0, "Sanctioned Amount is required"),
  sanctionedDate: z.string().min(1, "Sanctioned date is required"),
  inchargeEmpId: z.number(),
  /** Angular formControlName spelling (capital D in Det). */
  paymentModeCatDetId: z.number(),
  referenceNo: z.string().min(1, "Reference number is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function asDateInputValue(value: string | Date | undefined | null): string {
  if (value == null || value === "") return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface BudgetAllocationModalProps {
  open: boolean;
  onClose: () => void;
  row: BudgetAllocation | null;
  onSaved: () => void;
}

export default function BudgetAllocationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<BudgetAllocationModalProps>) {
  const isEditing = Boolean(row);
  const [programs, setPrograms] = useState<BudgetProgram[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId: loginEmpId } = useLoginEmployeeId(user, sessionLoading);
  const empId = loginEmpId > 0 ? loginEmpId : DEFAULT_EMP_ID;

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
      budgetProgramsId: undefined,
      budgetTitle: "",
      proposedAmount: undefined,
      budgetallocationDate: "",
      proposedByByEmpId: DEFAULT_EMP_ID,
      sanctionedAmount: undefined,
      sanctionedDate: "",
      inchargeEmpId: DEFAULT_EMP_ID,
      paymentModeCatDetId: DEFAULT_PAYMENT_MODE_CAT_DET_ID,
      referenceNo: "",
      isActive: true,
      reason: "Budget Allocated",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveBudgetPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, [open]);

  useEffect(() => {
    if (row) {
      const raw = row as BudgetAllocation & {
        paymentModeCatdetId?: number;
        paymentModeCatDetId?: number;
      };
      reset({
        budgetProgramsId: row.budgetProgramsId,
        budgetTitle: row.budgetTitle,
        proposedAmount: row.proposedAmount,
        budgetallocationDate: asDateInputValue(row.budgetallocationDate),
        proposedByByEmpId: row.proposedByByEmpId ?? DEFAULT_EMP_ID,
        sanctionedAmount: row.sanctionedAmount ?? 0,
        sanctionedDate: asDateInputValue(row.sanctionedDate),
        inchargeEmpId: row.inchargeEmpId ?? DEFAULT_EMP_ID,
        paymentModeCatDetId:
          raw.paymentModeCatDetId ??
          raw.paymentModeCatdetId ??
          DEFAULT_PAYMENT_MODE_CAT_DET_ID,
        referenceNo: row.referenceNo ?? "",
        isActive: row.isActive,
        reason: row.reason ?? "Budget Allocated",
      });
    } else {
      reset({
        budgetProgramsId: undefined,
        budgetTitle: "",
        proposedAmount: undefined,
        budgetallocationDate: "",
        proposedByByEmpId: DEFAULT_EMP_ID,
        sanctionedAmount: undefined,
        sanctionedDate: "",
        inchargeEmpId: DEFAULT_EMP_ID,
        paymentModeCatDetId: DEFAULT_PAYMENT_MODE_CAT_DET_ID,
        referenceNo: "",
        isActive: true,
        reason: "Budget Allocated",
      });
    }
    setSubmitError(null);
  }, [row, open, reset]);

  const programOptions = useMemo(
    () =>
      programs.map((p) => ({
        value: String(p.budgetProgramId),
        label: p.budgetTitle,
      })),
    [programs],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      // Same emp id for proposedBy / sanctionedBy / incharge (Angular hardcodes; we use login emp).
      const proposedByByEmpId = empId;
      const inchargeEmpId = empId;
      const sanctionedByEmpId = empId;
      const paymentModeCatDetId =
        (isEditing
          ? (row?.paymentModeCatDetId ?? row?.paymentModeCatdetId)
          : undefined) ?? DEFAULT_PAYMENT_MODE_CAT_DET_ID;
      const now = budgetAllocationNowIso();

      const payload: BudgetAllocationWritePayload = {
        budgetAllocationId: isEditing ? row!.budgetAllocationId : null,
        budgetProgramsId: data.budgetProgramsId,
        budgetTitle: data.budgetTitle,
        proposedAmount: Number(data.proposedAmount),
        budgetallocationDate: data.budgetallocationDate,
        proposedByByEmpId,
        sanctionedAmount: Number(data.sanctionedAmount),
        sanctionedByEmpId,
        sanctionedDate: data.sanctionedDate,
        inchargeEmpId,
        paymentModeCatDetId,
        referenceNo: data.referenceNo,
        isActive: Boolean(data.isActive),
        reason: data.reason ?? "Budget Allocated",
        createdDt: isEditing ? (row?.createdDt ?? now) : now,
        createdUser: isEditing ? (row?.createdUser ?? empId) : empId,
        updatedDt: isEditing ? now : null,
        updatedUser: isEditing ? empId : null,
      };

      if (isEditing) {
        await updateBudgetAllocation(row!.budgetAllocationId, payload);
      } else {
        await createBudgetAllocation(payload);
      }
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save budget allocation",
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Allocations" : "Add Programs"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Controller
              name="budgetProgramsId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={programOptions}
                  placeholder="Course"
                  searchable
                  error={errors.budgetProgramsId?.message}
                />
              )}
            />

            <div>
              <Label htmlFor="budgetTitle" className="text-[12px] font-medium">
                Budget title <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="budgetTitle"
                className="mt-1.5 min-h-[40px]"
                placeholder="Budget title"
                rows={2}
                {...register("budgetTitle")}
              />
              {errors.budgetTitle && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.budgetTitle.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="proposedAmount"
                className="text-[12px] font-medium"
              >
                Proposed Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proposedAmount"
                className="mt-1.5"
                type="number"
                step="0.01"
                placeholder="Proposed Amount"
                {...register("proposedAmount", { valueAsNumber: true })}
              />
              {errors.proposedAmount && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.proposedAmount.message}
                </p>
              )}
            </div>

            <Controller
              name="budgetallocationDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Allocation date"
                  required
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? asDateInputValue(d) : "")}
                  placeholder="Allocation date"
                  displayFormat="dd/MM/yyyy"
                  error={errors.budgetallocationDate?.message}
                />
              )}
            />

            <div>
              <Label
                htmlFor="sanctionedAmount"
                className="text-[12px] font-medium"
              >
                Sanctioned Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sanctionedAmount"
                className="mt-1.5"
                type="number"
                step="0.01"
                placeholder="Sanctioned Amount"
                {...register("sanctionedAmount", { valueAsNumber: true })}
              />
              {errors.sanctionedAmount && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.sanctionedAmount.message}
                </p>
              )}
            </div>

            <Controller
              name="sanctionedDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Sanctioned date"
                  required
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? asDateInputValue(d) : "")}
                  placeholder="Sanctioned date"
                  displayFormat="dd/MM/yyyy"
                  error={errors.sanctionedDate?.message}
                />
              )}
            />

            <div>
              <Label htmlFor="referenceNo" className="text-[12px] font-medium">
                Reference number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="referenceNo"
                className="mt-1.5"
                placeholder="Reference number"
                {...register("referenceNo")}
              />
              {errors.referenceNo && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.referenceNo.message}
                </p>
              )}
            </div>

            <div className="flex min-h-[60px] items-end pb-2 sm:col-span-2">
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor="isActive"
              >
                <input
                  id="isActive"
                  type="checkbox"
                  checked={watch("isActive")}
                  onChange={(e) => setValue("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="border-slate-300 text-[#001f3f]"
            >
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting} className={BTN_NAVY}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
