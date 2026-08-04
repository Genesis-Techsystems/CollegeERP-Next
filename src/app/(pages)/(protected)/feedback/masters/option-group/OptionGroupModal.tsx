"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
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
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createFbOptionGroup,
  listActiveCollegesForGeneralSettings,
  updateFbOptionGroup,
} from "@/services";
import type { College } from "@/types/college";
import type { FbOptionGroup } from "@/types/feedback-option-group";

const schema = z
  .object({
    collegeId: z.coerce.number().min(1, "College is required"),
    optiongroupName: z.string().trim().min(1, "Option Group Name is required"),
    optiongroupCode: z.string().trim().min(1, "Option Group Code is required"),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.isActive && !v.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Reason is required when inactive",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  row: FbOptionGroup | null;
  onSaved: () => void;
};

export function OptionGroupModal({ open, onClose, row, onSaved }: Props) {
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId: 0,
      optiongroupName: "",
      optiongroupCode: "",
      isActive: true,
      reason: "active",
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    listActiveCollegesForGeneralSettings()
      .then(setColleges)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (row) {
      reset({
        collegeId: row.collegeId,
        optiongroupName: row.optiongroupName ?? "",
        optiongroupCode: row.optiongroupCode ?? "",
        isActive: row.isActive ?? true,
        reason: row.reason ?? (row.isActive ? "active" : ""),
      });
    } else {
      reset({
        collegeId: 0,
        optiongroupName: "",
        optiongroupCode: "",
        isActive: true,
        reason: "active",
      });
    }
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload = {
      collegeId: values.collegeId,
      optiongroupName: values.optiongroupName.trim(),
      optiongroupCode: values.optiongroupCode.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || null,
    };
    try {
      if (isEditing && row) {
        // Angular updateDetails body includes pk: details.fbOptionGroupId = data.fbOptionGroupId
        await updateFbOptionGroup(row.fbOptionGroupId, {
          ...payload,
          fbOptionGroupId: row.fbOptionGroupId,
        });
      } else {
        await createFbOptionGroup(
          payload as Omit<FbOptionGroup, "fbOptionGroupId">,
        );
      }
      toastSuccess(isEditing ? "Updated successfully." : "Saved successfully.");
      onSaved();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setSubmitError(msg);
      toastError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Option Group" : "Add Option Group"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Angular: College on row 1; Name + Code side-by-side on row 2 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : 0)}
                  options={colleges.map((c) => ({
                    value: String(c.collegeId),
                    label: c.collegeCode,
                  }))}
                  placeholder="Enter College"
                  error={errors.collegeId?.message}
                />
              )}
            />
            <div className="hidden sm:block" aria-hidden />
            <div className="space-y-1.5">
              <Label>
                Option Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Enter Option Group Name"
                {...register("optiongroupName")}
              />
              {errors.optiongroupName ? (
                <p className="text-xs text-destructive">
                  {errors.optiongroupName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>
                Option Group Code <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Enter Option Group Code"
                {...register("optiongroupCode")}
              />
              {errors.optiongroupCode ? (
                <p className="text-xs text-destructive">
                  {errors.optiongroupCode.message}
                </p>
              ) : null}
            </div>
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  // Angular keeps existing reason on deactivate (often still "active")
                  if (active) setValue("reason", "active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
