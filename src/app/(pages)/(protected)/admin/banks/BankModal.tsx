"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import {
  createBank,
  listActiveCampusesForBanks,
  listActiveCollegesForBanks,
  updateBank,
} from "@/services";
import type { Bank } from "@/types/bank";
import type { Campus } from "@/types/campus";
import type { College } from "@/types/college";

const schema = z.object({
  campusId: z.number().min(1, "Campus is required"),
  collegeId: z.number().min(1, "College is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  bankCode: z.string().trim().min(1, "Bank code is required"),
  accountNo: z.string().trim().min(1, "Account number is required"),
  ifscCode: z.string().trim().min(1, "IFSC code is required"),
  micrCode: z.string().optional(),
  branchCode: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function BankModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: Bank | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [campuses, setCampuses] = useState<Campus[]>([]);
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
      campusId: undefined,
      collegeId: undefined,
      bankName: "",
      bankCode: "",
      accountNo: "",
      ifscCode: "",
      micrCode: "",
      branchCode: "",
      address: "",
      isActive: true,
      reason: "",
    },
  });

  const selectedCampusId = watch("campusId");

  useEffect(() => {
    if (!open) return;
    Promise.all([listActiveCampusesForBanks(), listActiveCollegesForBanks()])
      .then(([campusRows, collegeRows]) => {
        setCampuses(campusRows);
        setColleges(collegeRows);
      })
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset({
      campusId: row?.campusId,
      collegeId: row?.collegeId,
      bankName: row?.bankName ?? "",
      bankCode: row?.bankCode ?? "",
      accountNo: row?.accountNo ?? "",
      ifscCode: row?.ifscCode ?? "",
      micrCode: row?.micrCode ?? "",
      branchCode: row?.branchCode ?? "",
      address: row?.address ?? "",
      isActive: row?.isActive ?? true,
      reason: row?.reason ?? "",
    });
    setSubmitError(null);
  }, [row, open, reset]);

  const campusOptions = useMemo(
    () =>
      campuses.map((c) => ({
        value: String(c.campusId),
        label: c.campusCode ?? c.campusName,
      })),
    [campuses],
  );
  const collegeOptions = useMemo(
    () =>
      colleges
        .filter((c) => !selectedCampusId || c.campusId === selectedCampusId)
        .map((c) => ({
          value: String(c.collegeId),
          label: c.collegeCode ?? c.collegeName,
        })),
    [colleges, selectedCampusId],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateBank(row!.bankId, data);
      else await createBank(data);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save bank",
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Bank" : "Add Bank"}
      onSubmit={() => void handleSubmit(onSubmit)()}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="campusId"
          control={control}
          render={({ field }) => (
            <Select
              label="Campus"
              required
              value={field.value ? String(field.value) : null}
              onChange={(value) => {
                const next = value ? Number(value) : undefined;
                if (next === field.value) return;
                field.onChange(next);
                setValue("collegeId", undefined as unknown as number);
              }}
              options={campusOptions}
              placeholder="Select campus"
              error={errors.campusId?.message}
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
              disabled={!selectedCampusId}
              error={errors.collegeId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Bank Name"
          required
          htmlFor="bankName"
          error={errors.bankName?.message}
        >
          <Input id="bankName" {...register("bankName")} />
        </FormField>
        <FormField
          label="Bank Code"
          required
          htmlFor="bankCode"
          error={errors.bankCode?.message}
        >
          <Input id="bankCode" {...register("bankCode")} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          label="Account No"
          required
          htmlFor="accountNo"
          error={errors.accountNo?.message}
        >
          <Input id="accountNo" {...register("accountNo")} />
        </FormField>
        <FormField
          label="IFSC Code"
          required
          htmlFor="ifscCode"
          error={errors.ifscCode?.message}
        >
          <Input id="ifscCode" {...register("ifscCode")} />
        </FormField>
        <FormField
          label="MICR Code"
          htmlFor="micrCode"
          error={errors.micrCode?.message}
        >
          <Input id="micrCode" {...register("micrCode")} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <FormField
          label="Branch Code"
          htmlFor="branchCode"
          error={errors.branchCode?.message}
        >
          <Input id="branchCode" {...register("branchCode")} />
        </FormField>
        <FormField
          label="Address"
          htmlFor="address"
          error={errors.address?.message}
        >
          <Input id="address" {...register("address")} />
        </FormField>
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <ActiveStatusField
            label="Active"
            isActive={field.value}
            reason={watch("reason") ?? ""}
            onActiveChange={field.onChange}
            onReasonChange={(value) => setValue("reason", value)}
            reasonError={errors.reason?.message}
          />
        )}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
    </FormModal>
  );
}
