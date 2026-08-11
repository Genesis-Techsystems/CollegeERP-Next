"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants/ui";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createFbQuestion,
  listActiveCollegesForGeneralSettings,
  listFbOptionGroupsByCollege,
  listGeneralDetailsByMaster,
  updateFbQuestion,
} from "@/services";
import type { College } from "@/types/college";
import type { FbOptionGroup } from "@/types/feedback-option-group";
import type { FbQuestion } from "@/types/feedback-question";
import type { GeneralDetail } from "@/types/exam-master";

const schema = z
  .object({
    collegeId: z.coerce.number().min(1, "College is required"),
    fbOptionGroupId: z.coerce.number().min(1, "Option Group is required"),
    generalDetailId: z.coerce.number().min(1, "Input Type is required"),
    fbQuestion: z.string().trim().min(1, "Question is required"),
    fbDiscription: z.string().min(1, "Description is required"),
    isAnswerrequired: z.boolean(),
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
  row: FbQuestion | null;
  onSaved: () => void;
};

export function FeedbackQuestionModal({ open, onClose, row, onSaved }: Props) {
  const isEditing = Boolean(row);
  const [colleges, setColleges] = useState<College[]>([]);
  const [optionGroups, setOptionGroups] = useState<FbOptionGroup[]>([]);
  const [inputTypes, setInputTypes] = useState<GeneralDetail[]>([]);
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
      generalDetailId: 0,
      fbQuestion: "",
      fbDiscription: "",
      isAnswerrequired: true,
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
    listGeneralDetailsByMaster(GM_CODES.FB_INPUT_TYPE)
      .then(setInputTypes)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (row) {
      reset({
        collegeId: row.collegeId,
        fbOptionGroupId: row.fbOptionGroupId ?? 0,
        generalDetailId: row.generalDetailId ?? 0,
        fbQuestion: row.fbQuestion ?? "",
        fbDiscription: row.fbDiscription ?? "",
        isAnswerrequired: row.isAnswerrequired ?? true,
        isActive: row.isActive ?? true,
        reason: row.reason ?? (row.isActive ? "active" : ""),
      });
    } else {
      reset({
        collegeId: 0,
        fbOptionGroupId: 0,
        generalDetailId: 0,
        fbQuestion: "",
        fbDiscription: "",
        isAnswerrequired: true,
        isActive: true,
        reason: "active",
      });
      setOptionGroups([]);
    }
  }, [open, row, reset]);

  // Angular `selectedCollege(collegeId)`
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
      generalDetailId: values.generalDetailId,
      fbQuestion: values.fbQuestion.trim(),
      fbDiscription: values.fbDiscription.trim(),
      isAnswerrequired: values.isAnswerrequired,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || null,
    };
    try {
      if (isEditing && row) {
        await updateFbQuestion(row.fbQuestionId, {
          ...payload,
          fbQuestionId: row.fbQuestionId,
        });
      } else {
        await createFbQuestion(payload as Omit<FbQuestion, "fbQuestionId">);
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
            {isEditing ? "Edit Question" : "Add Question"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Angular: College | Option Group | Input Type */}
          <div className="grid gap-3 sm:grid-cols-3">
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
            <Controller
              name="generalDetailId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Input Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : 0)}
                  options={inputTypes.map((t) => ({
                    value: String(t.generalDetailId),
                    label:
                      t.generalDetailDisplayName ||
                      t.generalDetailName ||
                      String(t.generalDetailId),
                  }))}
                  placeholder="Enter Input Type"
                  error={errors.generalDetailId?.message}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Question <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Enter Question"
              className="min-h-[115px]"
              {...register("fbQuestion")}
            />
            {errors.fbQuestion ? (
              <p className="text-xs text-destructive">
                {errors.fbQuestion.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Enter Description"
              className="min-h-[115px]"
              {...register("fbDiscription")}
            />
            {errors.fbDiscription ? (
              <p className="text-xs text-destructive">
                {errors.fbDiscription.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <Controller
              name="isAnswerrequired"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="isAnswerrequired"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <Label htmlFor="isAnswerrequired" className="cursor-pointer">
                    Answer Required
                  </Label>
                </div>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex-1 min-w-[220px]">
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
                </div>
              )}
            />
          </div>

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
