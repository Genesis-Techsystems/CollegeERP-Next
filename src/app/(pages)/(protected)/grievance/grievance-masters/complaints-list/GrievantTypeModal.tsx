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
  createGrievantType,
  listActiveGrievanceCategoriesForTypes,
  updateGrievantType,
  type GrievanceCategory,
  type GrievantType,
} from "@/services";

const schema = z.object({
  grvCategoryId: z.number().min(1, "Grievance Category is required"),
  complaintShortDesc: z.string().min(1, "Complaint Short Desc is required"),
  complaintDesc: z.string().optional(),
  instructionsNotes: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GrievantTypeModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: GrievantType | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [categories, setCategories] = useState<GrievanceCategory[]>([]);
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
      grvCategoryId: undefined,
      complaintShortDesc: "",
      complaintDesc: "",
      instructionsNotes: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveGrievanceCategoriesForTypes()
      .then(setCategories)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (row) {
      reset({
        grvCategoryId: row.grvCategoryId,
        complaintShortDesc: row.complaintShortDesc ?? "",
        complaintDesc: row.complaintDesc ?? "",
        instructionsNotes: row.instructionsNotes ?? "",
        isActive: row.isActive !== false,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        grvCategoryId: undefined,
        complaintShortDesc: "",
        complaintDesc: "",
        instructionsNotes: "",
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [row, open, reset]);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.categoryId),
        label: c.grievanceCategory,
      })),
    [categories],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateGrievantType(row!.complaintListId, data);
      else await createGrievantType(data);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save grievant type",
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
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            {isEditing ? "Edit Grievant Type" : "Add Grievant Type"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="grvCategoryId"
            control={control}
            render={({ field }) => (
              <Select
                label="Grievance Category"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) =>
                  field.onChange(value ? Number(value) : undefined)
                }
                options={categoryOptions}
                placeholder="Select category"
                searchable
                error={errors.grvCategoryId?.message}
              />
            )}
          />
          <div>
            <Label htmlFor="complaintShortDesc">Complaint Short Desc *</Label>
            <Input
              id="complaintShortDesc"
              {...register("complaintShortDesc")}
            />
            {errors.complaintShortDesc && (
              <p className="text-xs text-red-500">
                {errors.complaintShortDesc.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="complaintDesc">Complaint Desc</Label>
            <Textarea
              id="complaintDesc"
              rows={3}
              {...register("complaintDesc")}
            />
          </div>
          <div>
            <Label htmlFor="instructionsNotes">Instruction Notes</Label>
            <Textarea
              id="instructionsNotes"
              rows={3}
              {...register("instructionsNotes")}
            />
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(value) => setValue("reason", value)}
                reasonError={errors.reason?.message}
              />
            )}
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
