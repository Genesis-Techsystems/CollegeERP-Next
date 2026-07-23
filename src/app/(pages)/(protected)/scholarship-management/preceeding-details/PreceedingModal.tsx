"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBanks, listCastes } from "@/services";
import type { SchPreceeding } from "@/types/scholarship";

const schema = z.object({
  collegeId: z.coerce.number().min(1),
  academicYearId: z.coerce.number().min(1),
  financialYearId: z.coerce.number().min(1),
  preceedingNo: z.string().min(1, "Preceeding No is required"),
  preceedingTitle: z.string().min(1, "Preceeding Title is required"),
  preceedingDescription: z.string().optional(),
  preceedingDate: z.date().nullable().optional(),
  casteId: z.coerce.number().optional().nullable(),
  bankId: z.coerce.number().min(1, "Bank is required"),
  noOfStudents: z.coerce.number().min(0).optional(),
  preceedingAmount: z.coerce.number().min(0).optional(),
  bankAmountCreditedOn: z.date().nullable().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type PreceedingModalResult = {
  collegeId: number;
  academicYearId: number;
  financialYearId: number;
  preceedingNo: string;
  preceedingTitle: string;
  preceedingDescription?: string;
  preceedingDate?: string | null;
  casteId?: number | null;
  bankId: number;
  noOfStudents?: number;
  preceedingAmount?: number;
  bankAmountCreditedOn?: string | null;
  isActive: boolean;
  reason?: string;
};

type PreceedingRow = SchPreceeding & Record<string, unknown>;

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

interface PreceedingModalProps {
  open: boolean;
  onClose: () => void;
  mode: "new" | "edit";
  collegeId: number;
  academicYearId: number;
  financialYearId: number;
  collegeCode?: string;
  academicYearCode?: string;
  financialYearCode?: string;
  row?: PreceedingRow | null;
  onSubmit: (payload: PreceedingModalResult) => Promise<void>;
}

export function PreceedingModal({
  open,
  onClose,
  mode,
  collegeId,
  academicYearId,
  financialYearId,
  collegeCode,
  academicYearCode,
  financialYearCode,
  row,
  onSubmit,
}: Readonly<PreceedingModalProps>) {
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId,
      academicYearId,
      financialYearId,
      preceedingNo: "",
      preceedingTitle: "",
      preceedingDescription: "",
      preceedingDate: new Date(),
      casteId: null,
      bankId: 0,
      noOfStudents: 0,
      preceedingAmount: 0,
      bankAmountCreditedOn: new Date(),
      isActive: true,
      reason: "",
    },
  });

  const { data: banks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ["Bank", "list", "preceeding-modal"],
    queryFn: listBanks,
    enabled: open,
  });

  const { data: castes = [], isLoading: loadingCastes } = useQuery({
    queryKey: ["Caste", "list", "preceeding-modal"],
    queryFn: listCastes,
    enabled: open,
  });

  const bankOptions = useMemo(
    () =>
      banks
        .filter((b) => !collegeId || Number(b.collegeId) === collegeId)
        .filter((b) => b.isActive !== false)
        .map((b) => ({
          value: String(b.bankId),
          label: b.bankName || b.bankCode || String(b.bankId),
        })),
    [banks, collegeId],
  );

  const casteOptions = useMemo(
    () =>
      castes
        .filter((c) => c.isActive !== false)
        .map((c) => ({
          value: String(c.casteId),
          label: c.caste || String(c.casteId),
        })),
    [castes],
  );

  useEffect(() => {
    if (!open) return;
    if (isEdit && row) {
      reset({
        collegeId: Number(row.collegeId ?? collegeId),
        academicYearId: Number(row.academicYearId ?? academicYearId),
        financialYearId: Number(row.financialYearId ?? financialYearId),
        preceedingNo: String(row.preceedingNo ?? ""),
        preceedingTitle: String(row.preceedingTitle ?? ""),
        preceedingDescription: String(row.preceedingDescription ?? ""),
        preceedingDate: toDate(row.preceedingDate) ?? new Date(),
        casteId: Number(row.casteId) || null,
        bankId: Number(row.bankId) || 0,
        noOfStudents: Number(row.noOfStudents ?? row.studentCount ?? 0),
        preceedingAmount: Number(row.preceedingAmount ?? 0),
        bankAmountCreditedOn:
          toDate(row.bankAmountCreditedOn) ?? new Date(),
        isActive: row.isActive !== false,
        reason: String(row.reason ?? ""),
      });
      return;
    }
    reset({
      collegeId,
      academicYearId,
      financialYearId,
      preceedingNo: "",
      preceedingTitle: "",
      preceedingDescription: "",
      preceedingDate: new Date(),
      casteId: null,
      bankId: 0,
      noOfStudents: 0,
      preceedingAmount: 0,
      bankAmountCreditedOn: new Date(),
      isActive: true,
      reason: "",
    });
  }, [
    open,
    isEdit,
    row,
    collegeId,
    academicYearId,
    financialYearId,
    reset,
  ]);

  const contextLabel = [collegeCode, academicYearCode, financialYearCode]
    .filter(Boolean)
    .join(" / ");

  const submitForm = async (values: FormValues) => {
    await onSubmit({
      collegeId: values.collegeId,
      academicYearId: values.academicYearId,
      financialYearId: values.financialYearId,
      preceedingNo: values.preceedingNo.trim(),
      preceedingTitle: values.preceedingTitle.trim(),
      preceedingDescription: values.preceedingDescription?.trim() || undefined,
      preceedingDate: toIso(values.preceedingDate),
      casteId: values.casteId || null,
      bankId: values.bankId,
      noOfStudents: Number(values.noOfStudents ?? 0),
      preceedingAmount: Number(values.preceedingAmount ?? 0),
      bankAmountCreditedOn: toIso(values.bankAmountCreditedOn),
      isActive: values.isActive,
      reason: values.isActive ? undefined : values.reason?.trim() || undefined,
    });
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Preceedings"
      description={contextLabel ? `For : ${contextLabel}` : undefined}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(submitForm)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="preceedingNo">Preceeding No</Label>
          <Input id="preceedingNo" {...register("preceedingNo")} />
          {errors.preceedingNo ? (
            <p className="text-xs text-destructive">
              {errors.preceedingNo.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="preceedingTitle">Preceeding Title</Label>
          <Input id="preceedingTitle" {...register("preceedingTitle")} />
          {errors.preceedingTitle ? (
            <p className="text-xs text-destructive">
              {errors.preceedingTitle.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="preceedingDescription">Description</Label>
          <Input
            id="preceedingDescription"
            {...register("preceedingDescription")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preceeding Date</Label>
          <Controller
            name="preceedingDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? null)}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Controller
            name="casteId"
            control={control}
            render={({ field }) => (
              <Select
                label="Caste"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : null)}
                options={casteOptions}
                placeholder="Select caste"
                isLoading={loadingCastes}
                clearable
                searchable
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Controller
            name="bankId"
            control={control}
            render={({ field }) => (
              <Select
                label="Bank"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={bankOptions}
                placeholder="Select bank"
                isLoading={loadingBanks}
                searchable
              />
            )}
          />
          {errors.bankId ? (
            <p className="text-xs text-destructive">{errors.bankId.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="noOfStudents">No of Students</Label>
          <Input
            id="noOfStudents"
            type="number"
            {...register("noOfStudents")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preceedingAmount">Preceeding Amount</Label>
          <Input
            id="preceedingAmount"
            type="number"
            {...register("preceedingAmount")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Amount Credited Date</Label>
          <Controller
            name="bankAmountCreditedOn"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? null)}
              />
            )}
          />
        </div>
        <div className="sm:col-span-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field: activeField }) => (
              <Controller
                name="reason"
                control={control}
                render={({ field: reasonField }) => (
                  <ActiveStatusField
                    isActive={activeField.value}
                    onActiveChange={activeField.onChange}
                    reason={reasonField.value ?? ""}
                    onReasonChange={reasonField.onChange}
                  />
                )}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
