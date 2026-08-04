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
  createFbOptionChoice,
  listActiveCollegesForGeneralSettings,
  listFbOptionGroupsByCollege,
  updateFbOptionChoice,
} from "@/services";
import type { College } from "@/types/college";
import type { FbOptionChoice } from "@/types/feedback-option-choice";
import type { FbOptionGroup } from "@/types/feedback-option-group";

const schema = z
  .object({
    collegeId: z.coerce.number().min(1, "College is required"),
    fbOptionGroupId: z.coerce.number().min(1, "Option Group is required"),
    optionchoice: z.string().trim().min(1, "Option Choice Name is required"),
    optionchoiceRating: z.coerce
      .number({ message: "Rating is required" })
      .refine((n) => !Number.isNaN(n), { message: "Rating is required" }),
    sortOrder: z.coerce
      .number({ message: "Sort Order is required" })
      .refine((n) => !Number.isNaN(n), { message: "Sort Order is required" }),
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
  row: FbOptionChoice | null;
  onSaved: () => void;
};

export function OptionChoiceModal({ open, onClose, row, onSaved }: Props) {
  const isEditing = Boolean(row);
  const [colleges, setColleges] = useState<College[]>([]);
  const [optionGroups, setOptionGroups] = useState<FbOptionGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
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
      fbOptionGroupId: 0,
      optionchoice: "",
      optionchoiceRating: undefined as unknown as number,
      sortOrder: undefined as unknown as number,
      isActive: true,
      reason: "active",
    },
  });

  const collegeId = watch("collegeId");

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
        fbOptionGroupId: row.fbOptionGroupId,
        optionchoice: row.optionchoice ?? "",
        optionchoiceRating: row.optionchoiceRating,
        sortOrder: row.sortOrder,
        isActive: row.isActive ?? true,
        reason: row.reason ?? (row.isActive ? "active" : ""),
      });
    } else {
      reset({
        collegeId: 0,
        fbOptionGroupId: 0,
        optionchoice: "",
        optionchoiceRating: undefined as unknown as number,
        sortOrder: undefined as unknown as number,
        isActive: true,
        reason: "active",
      });
      setOptionGroups([]);
    }
  }, [open, row, reset]);

  // Angular `selectedCollege(collegeId)` — load option groups for college
  useEffect(() => {
    if (!open || !collegeId) {
      if (!collegeId) setOptionGroups([]);
      return;
    }
    let cancelled = false;
    setGroupsLoading(true);
    listFbOptionGroupsByCollege(collegeId)
      .then((rows) => {
        if (!cancelled) setOptionGroups(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setOptionGroups([]);
        }
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, collegeId]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const payload = {
      collegeId: values.collegeId,
      fbOptionGroupId: values.fbOptionGroupId,
      optionchoice: values.optionchoice.trim(),
      optionchoiceRating: values.optionchoiceRating,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || null,
    };
    try {
      if (isEditing && row) {
        await updateFbOptionChoice(row.fbOptionchoiceId, {
          ...payload,
          fbOptionchoiceId: row.fbOptionchoiceId,
        });
      } else {
        await createFbOptionChoice(
          payload as Omit<FbOptionChoice, "fbOptionchoiceId">,
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
            {isEditing ? "Edit Option Choice" : "Add Option Choice"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Angular: College | Option Group */}
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    const next = v ? Number(v) : 0;
                    field.onChange(next);
                    setValue("fbOptionGroupId", 0);
                  }}
                  options={colleges.map((c) => ({
                    value: String(c.collegeId),
                    label: c.collegeCode,
                  }))}
                  placeholder="Enter College"
                  error={errors.collegeId?.message}
                />
              )}
            />
            <Controller
              name="fbOptionGroupId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Option Group"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : 0)}
                  options={optionGroups.map((g) => ({
                    value: String(g.fbOptionGroupId),
                    label: g.optiongroupCode,
                  }))}
                  placeholder="Enter Option Group"
                  isLoading={groupsLoading}
                  disabled={!collegeId}
                  error={errors.fbOptionGroupId?.message}
                />
              )}
            />
            {/* Angular: Option Choice Name | Rating */}
            <div className="space-y-1.5">
              <Label>
                Option Choice Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Enter Option Choice Name"
                {...register("optionchoice")}
              />
              {errors.optionchoice ? (
                <p className="text-xs text-destructive">
                  {errors.optionchoice.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>
                Rating <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="Enter Rating"
                {...register("optionchoiceRating")}
              />
              {errors.optionchoiceRating ? (
                <p className="text-xs text-destructive">
                  {errors.optionchoiceRating.message}
                </p>
              ) : null}
            </div>
            {/* Angular: Sort Order on its own row (left) */}
            <div className="space-y-1.5">
              <Label>
                Sort Order <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="Enter Sort Order"
                {...register("sortOrder")}
              />
              {errors.sortOrder ? (
                <p className="text-xs text-destructive">
                  {errors.sortOrder.message}
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
