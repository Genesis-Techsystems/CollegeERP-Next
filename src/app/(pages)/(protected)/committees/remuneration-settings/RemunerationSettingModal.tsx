"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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
import {
  createRemunerationSetting,
  updateRemunerationSetting,
  listRemunerationDesignations,
  listColleges,
  listAffiliations,
} from "@/services";
import type { UnivRemunerationSetting } from "@/types/committees";

const BTN_NAVY =
  "bg-[#001f3f] text-white hover:bg-[#002a54] disabled:opacity-60";

/** Angular hardcodes these three role options (not the Role domain list). */
const ROLE_OPTIONS = [
  { value: "64", label: "Evaluator" },
  { value: "67", label: "Moderator" },
  { value: "70", label: "Question Paper Setter" },
];

/** Angular designation GM filter: Evaluator→653, QP Setter→651, else→654. */
function designationCatDetIdForRole(roleId: number): number {
  if (roleId === 64) return 653;
  if (roleId === 70) return 651;
  return 654;
}

const schema = z.object({
  evaluatorroleId: z.number().min(1, "Role is required"),
  remunerationDesignationCatDetId: z.number().min(1, "Designation is required"),
  amount: z.number().min(0, "Amount is required"),
  collegeId: z.number().optional(),
  affiliatedToCatDetId: z.number().optional(),
  fromDate: z.string().min(1, "From Date is required"),
  toDate: z.string().min(1, "To Date is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function asDateInputValue(value: string | Date | undefined): string {
  if (!value) return "";
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

function todayYmd(): string {
  return asDateInputValue(new Date());
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: UnivRemunerationSetting | null;
  organizationId: number;
  onSaved: () => void;
}

export default function RemunerationSettingModal({
  open,
  onClose,
  editData,
  organizationId,
  onSaved,
}: Readonly<Props>) {
  const isEditing = Boolean(editData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const orgCode =
    globalThis?.localStorage?.getItem("orgCode") ??
    globalThis?.localStorage?.getItem("organizationCode") ??
    "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      evaluatorroleId: undefined,
      remunerationDesignationCatDetId: undefined,
      amount: undefined,
      collegeId: undefined,
      affiliatedToCatDetId: undefined,
      fromDate: todayYmd(),
      toDate: "",
      isActive: true,
      reason: "",
    },
  });

  const selectedRoleId = Number(watch("evaluatorroleId") || 0);
  const isActive = watch("isActive");

  const { data: designations = [] } = useQuery({
    queryKey: ["RemunerationDesignation", "gm"],
    queryFn: listRemunerationDesignations,
    enabled: open,
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ["College", "active-for-remuneration"],
    queryFn: listColleges,
    enabled: open,
  });

  const { data: affiliationOptions = [] } = useQuery({
    queryKey: ["Affiliation", "AFFL"],
    queryFn: listAffiliations,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editData) {
      reset({
        evaluatorroleId: editData.evaluatorroleId ?? undefined,
        remunerationDesignationCatDetId:
          editData.remunerationDesignationCatDetId ?? undefined,
        amount: editData.amount ?? undefined,
        collegeId: editData.collegeId ?? undefined,
        affiliatedToCatDetId: editData.affiliatedToCatDetId ?? undefined,
        fromDate: asDateInputValue(editData.fromDate) || todayYmd(),
        toDate: asDateInputValue(editData.toDate),
        isActive: editData.isActive ?? true,
        reason: editData.reason ?? "",
      });
    } else {
      reset({
        evaluatorroleId: undefined,
        remunerationDesignationCatDetId: undefined,
        amount: undefined,
        collegeId: undefined,
        affiliatedToCatDetId: undefined,
        fromDate: todayYmd(),
        toDate: "",
        isActive: true,
        reason: "",
      });
    }
    setSubmitError(null);
  }, [open, editData, reset]);

  const designationOptions = useMemo(() => {
    const allowedId =
      selectedRoleId > 0 ? designationCatDetIdForRole(selectedRoleId) : 0;
    return designations
      .map((row) => {
        const id = Number(
          row.generalDetailId ?? row.remunerationDesignationCatDetId ?? 0,
        );
        return {
          value: String(id),
          label: String(
            row.generalDetailDisplayName ??
              row.remunerationDesignationName ??
              row.name ??
              id,
          ),
          id,
        };
      })
      .filter((o) => {
        if (!o.id) return false;
        if (allowedId <= 0) return true;
        return o.id === allowedId;
      })
      .map(({ value, label }) => ({ value, label }));
  }, [designations, selectedRoleId]);

  useEffect(() => {
    if (!selectedRoleId) return;
    const current = watch("remunerationDesignationCatDetId");
    if (
      current &&
      !designationOptions.some((o) => Number(o.value) === Number(current))
    ) {
      setValue(
        "remunerationDesignationCatDetId",
        undefined as unknown as number,
      );
    }
  }, [selectedRoleId, designationOptions, setValue, watch]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [colleges],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      // Angular `submit()` Obj (+ parent injects organizationId / PK on edit).
      const payload: Partial<UnivRemunerationSetting> = {
        organizationId,
        evaluatorroleId: values.evaluatorroleId,
        remunerationDesignationCatDetId: values.remunerationDesignationCatDetId,
        amount: Number(values.amount),
        collegeId: values.collegeId || undefined,
        affiliatedToCatDetId: values.affiliatedToCatDetId || undefined,
        fromDate: values.fromDate,
        toDate: values.toDate,
        isActive: Boolean(values.isActive),
      };
      if (isEditing) {
        await updateRemunerationSetting(editData!.univRemunerationSettingId, {
          ...payload,
          organizationId: editData!.organizationId ?? organizationId,
        });
      } else {
        await createRemunerationSetting(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save remuneration setting.",
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit Remuneration Settings"
              : "Create Remuneration Settings"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">Organisation : </span>
            <span className="font-medium text-[#0c51a4]">{orgCode || "—"}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              name="evaluatorroleId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={ROLE_OPTIONS}
                  placeholder="Role"
                  searchable={false}
                  error={errors.evaluatorroleId?.message}
                />
              )}
            />
            <Controller
              name="remunerationDesignationCatDetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Designation"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={designationOptions}
                  placeholder="Designation"
                  searchable
                  disabled={!selectedRoleId}
                  error={errors.remunerationDesignationCatDetId?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="amount" className="text-[12px] font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                className="mt-1.5"
                type="number"
                step="0.01"
                placeholder="Amount"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="fromDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="From Date"
                  required
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? asDateInputValue(d) : "")}
                  placeholder="From Date"
                  displayFormat="dd/MM/yyyy"
                  error={errors.fromDate?.message}
                />
              )}
            />
            <Controller
              name="toDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="To Date"
                  required
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? asDateInputValue(d) : "")}
                  placeholder="To Date"
                  displayFormat="dd/MM/yyyy"
                  error={errors.toDate?.message}
                />
              )}
            />
            {/* Angular: College + Affiliated to are disabled */}
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={collegeOptions}
                  placeholder="College"
                  searchable
                />
              )}
            />
            <Controller
              name="affiliatedToCatDetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Affilated to"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={affiliationOptions}
                  placeholder="Affilated to"
                  searchable
                />
              )}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label
              className="flex items-center gap-2 text-sm"
              htmlFor="isActive"
            >
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setValue("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
            {!isActive ? (
              <div className="min-w-[220px] flex-1">
                <Label htmlFor="reason" className="text-[12px] font-medium">
                  Reason
                </Label>
                <Input
                  id="reason"
                  className="mt-1.5"
                  placeholder="Reason"
                  {...register("reason")}
                />
              </div>
            ) : null}
          </div>

          {submitError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-300 text-[#001f3f]"
            >
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting} className={BTN_NAVY}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
