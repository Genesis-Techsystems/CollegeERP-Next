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
  createFeeParticular,
  listActiveCollegesForGeneralSettings,
  updateFeeParticular,
} from "@/services";
import { toastSuccess } from "@/lib/toast";
import type { College } from "@/types/college";
import type { FeeParticular } from "@/types/fee-particular";

const schema = z.object({
  collegeId: z.number().min(1, "College is required"),
  particularsName: z.string().trim().min(1, "Particular name is required"),
  particularsCode: z.string().trim().min(1, "Particular code is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function FeeParticularModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: FeeParticular | null;
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
      collegeId: 0,
      particularsName: "",
      particularsCode: "",
      description: "",
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
        particularsName: row.particularsName,
        particularsCode: row.particularsCode,
        description: row.description ?? "",
        isActive: row.isActive,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        collegeId: 0,
        particularsName: "",
        particularsCode: "",
        description: "",
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
      const message = isEditing
        ? await updateFeeParticular(row!.feeParticularsId, payload)
        : await createFeeParticular(payload);
      toastSuccess(message);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to save fee particular",
      );
    }
  }

  const dialogTitle = isEditing ? "Edit Fee Particular" : "Add Fee Particular";
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
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : 0)}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                error={errors.collegeId?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="particularsName">Particular Name *</Label>
              <Input
                id="particularsName"
                placeholder="Enter particular name"
                {...register("particularsName")}
              />
              {errors.particularsName ? (
                <p className="text-xs text-destructive">
                  {errors.particularsName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="particularsCode">Particular Code *</Label>
              <Input
                id="particularsCode"
                placeholder="Enter particular code"
                {...register("particularsCode")}
              />
              {errors.particularsCode ? (
                <p className="text-xs text-destructive">
                  {errors.particularsCode.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Enter description"
              {...register("description")}
            />
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
            <p className="text-sm text-destructive">{submitError}</p>
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
