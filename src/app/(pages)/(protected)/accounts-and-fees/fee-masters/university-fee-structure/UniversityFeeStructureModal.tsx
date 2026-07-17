"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import { createUnivFeeStructure, updateUnivFeeStructure } from "@/services";
import type { UnivFeeStructureRow } from "@/types/fee-structure";

const schema = z.object({
  feeStructureName: z.string().min(1, "Fee structure name is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type UnivFeeStructureModalContext = {
  universitiesId: number;
  courseId: number;
  courseGroupId: number;
  academicYearId: number;
  universityCode?: string;
  courseCode?: string;
  courseGroup?: string;
  academicYearCode?: string;
};

interface UniversityFeeStructureModalProps {
  open: boolean;
  onClose: () => void;
  row: UnivFeeStructureRow | null;
  context: UnivFeeStructureModalContext;
  onSaved: () => void;
}

export function UniversityFeeStructureModal({
  open,
  onClose,
  row,
  context,
  onSaved,
}: Readonly<UniversityFeeStructureModalProps>) {
  const isEditing = row != null;
  const contextLabel = [
    context.universityCode,
    context.courseCode,
    context.courseGroup,
    context.academicYearCode,
  ]
    .filter(Boolean)
    .join(" / ");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      feeStructureName: "",
      isActive: true,
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            feeStructureName: row.feeStructureName ?? "",
            isActive: row.isActive ?? true,
            reason: row.reason ?? "",
          }
        : {
            feeStructureName: "",
            isActive: true,
            reason: "",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const reason = data.isActive
      ? data.reason?.trim() || "active"
      : data.reason?.trim() || "";
    try {
      if (isEditing && row?.univFeeStructureId) {
        await updateUnivFeeStructure(row.univFeeStructureId, {
          feeStructureName: data.feeStructureName.trim(),
          isActive: data.isActive,
          reason,
        });
        toastSuccess("University fee structure updated");
      } else {
        await createUnivFeeStructure({
          feeStructureName: data.feeStructureName.trim(),
          isActive: data.isActive,
          reason,
          universitiesId: context.universitiesId,
          courseId: context.courseId,
          courseGroupId: context.courseGroupId,
          academicYearId: context.academicYearId,
        } as Omit<UnivFeeStructureRow, "univFeeStructureId">);
        toastSuccess("University fee structure created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        `Failed to ${isEditing ? "update" : "create"} university fee structure`,
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        isEditing
          ? "Edit University Fee Structure"
          : "Add University Fee Structure"
      }
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="grid grid-cols-1 gap-3">
        {contextLabel ? (
          <span className="inline-flex w-fit max-w-full items-center truncate rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {contextLabel}
          </span>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="feeStructureName">Fee Structure Name</Label>
          <Input id="feeStructureName" {...register("feeStructureName")} />
          {errors.feeStructureName && (
            <p className="text-xs text-destructive">
              {errors.feeStructureName.message}
            </p>
          )}
        </div>
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <ActiveStatusField
              isActive={field.value}
              reason={watch("reason") ?? ""}
              onActiveChange={field.onChange}
              onReasonChange={(v) => setValue("reason", String(v))}
              reasonError={errors.reason?.message}
            />
          )}
        />
      </div>
    </FormModal>
  );
}
