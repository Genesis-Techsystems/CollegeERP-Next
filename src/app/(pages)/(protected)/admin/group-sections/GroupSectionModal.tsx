"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { createGroupSection, updateGroupSection } from "@/services";
import type { GroupSection } from "@/types/group-section";

/** Selected page filters — the modal inherits them instead of repeating the cascade. */
export type GroupSectionContext = {
  collegeId?: number | null;
  academicYearId?: number | null;
  courseId?: number | null;
  courseGroupId?: number | null;
  courseYearId?: number | null;
  /** e.g. `2025-2026` */
  academicYearLabel?: string;
  /** e.g. `MECS / B.E / CSE / I YEAR I SEM` */
  courseLabel?: string;
};

const schema = z.object({
  section: z.string().trim().min(1, "Section name is required"),
  sortOrder: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Sort order must be a whole number"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function GroupSectionModal({
  open,
  onClose,
  row,
  onSaved,
  context = {},
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: GroupSection | null;
  onSaved: () => void;
  context?: GroupSectionContext;
}>) {
  const isEditing = Boolean(row);
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
    defaultValues: { section: "", sortOrder: "", isActive: true, reason: "" },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    reset({
      section: row?.groupSectionName ?? "",
      sortOrder: row?.sortOrder ? String(row.sortOrder) : "",
      isActive: row?.isActive ?? true,
      reason: row?.reason ?? "",
    });
  }, [row, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);

    const collegeId = row?.collegeId || context.collegeId || 0;
    const courseGroupId = row?.courseGroupId || context.courseGroupId || 0;
    const courseYearId = row?.courseYearId || context.courseYearId || 0;
    const academicYearId = context.academicYearId || 0;
    const courseId = context.courseId || 0;

    if (
      !collegeId ||
      !academicYearId ||
      !courseId ||
      !courseGroupId ||
      !courseYearId
    ) {
      setSubmitError(
        "Select college, academic year, course, course group and course year first",
      );
      return;
    }

    const payload = {
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      // Angular/backend uses `section` (single field) for GroupSection create/update
      section: data.section,
      groupSectionName: data.section,
      groupSectionCode: data.section,
      sortOrder: Number(data.sortOrder || 0),
      isActive: data.isActive,
      reason: data.reason,
    };

    try {
      if (isEditing)
        await updateGroupSection(row!.groupSectionId, payload, row!);
      else await createGroupSection(payload);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save section");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Section" : "Add Section"}
      onSubmit={() => void handleSubmit(onSubmit)()}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
    >
      <div className="grid gap-1 rounded-sm border border-[#9ec5e8] px-3 py-2 text-[13px] sm:grid-cols-2">
        <p>
          <span className="font-semibold">Academic Year : </span>
          <span className="font-medium text-[#0c51a4]">
            {context.academicYearLabel || "—"}
          </span>
        </p>
        <p>
          <span className="font-semibold">Course : </span>
          <span className="font-medium text-[#0c51a4]">
            {context.courseLabel || "—"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Section Name"
          required
          htmlFor="section"
          error={errors.section?.message}
        >
          <Input id="section" variant="standard" {...register("section")} />
        </FormField>
        <FormField
          label="Sort Order"
          htmlFor="sortOrder"
          error={errors.sortOrder?.message}
        >
          <Input
            id="sortOrder"
            variant="standard"
            inputMode="numeric"
            {...register("sortOrder")}
          />
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
            onReasonChange={(v) => setValue("reason", v)}
            reasonError={errors.reason?.message}
          />
        )}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
    </FormModal>
  );
}
