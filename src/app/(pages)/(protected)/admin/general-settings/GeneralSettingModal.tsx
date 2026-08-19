"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createGeneralSetting,
  listActiveCollegesForGeneralSettings,
  updateGeneralSetting,
} from "@/services";
import type { College } from "@/types/college";
import type { GeneralSetting } from "@/types/general-setting";
import { applyRequiredFieldError, requiredNumber } from "@/lib/zod-fields";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";

const schema = z
  .object({
    collegeId: requiredNumber("College is required"),
    settingName: z.string().min(1, "Setting Name is required"),
    settingCode: z.string().min(1, "Setting Code is required"),
    settingValue: z.string().min(1, "Setting Value is required"),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !values.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Reason is required",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface GeneralSettingModalProps {
  open: boolean;
  onClose: () => void;
  setting: GeneralSetting | null;
  onSaved: () => void;
}

function toCollegeOptions(rows: College[]): SelectOption[] {
  return rows.map((row) => ({
    value: String(row.collegeId),
    label: row.collegeCode ?? row.collegeName,
  }));
}

export default function GeneralSettingModal({
  open,
  onClose,
  setting,
  onSaved,
}: Readonly<GeneralSettingModalProps>) {
  const isEditing = setting != null;
  const [colleges, setColleges] = useState<College[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    defaultValues: {
      collegeId: undefined,
      settingName: "",
      settingCode: "",
      settingValue: "",
      isActive: true,
      reason: "",
    },
  });

  const collegeOptions = useMemo(() => toCollegeOptions(colleges), [colleges]);

  useEffect(() => {
    if (!open) return;
    listActiveCollegesForGeneralSettings()
      .then(setColleges)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (setting) {
      reset({
        collegeId: setting.collegeId,
        settingName: setting.settingName,
        settingCode: setting.settingCode,
        settingValue: setting.settingValue,
        isActive: setting.isActive,
        reason: setting.reason ?? "",
      });
    } else {
      reset();
    }
    setSubmitError(null);
  }, [setting, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        reason: data.reason?.trim() ? data.reason.trim() : null,
      };
      if (isEditing)
        await updateGeneralSetting(setting!.generalSettingId, payload);
      else
        await createGeneralSetting(
          payload as Omit<GeneralSetting, "generalSettingId">,
        );
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save setting";
      if (
        applyRequiredFieldError(message, setError, {
          college: "collegeId",
          "setting name": "settingName",
          "setting code": "settingCode",
          "setting value": "settingValue",
          reason: "reason",
        })
      ) {
        return;
      }
      setSubmitError(message);
    }
  }

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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit General Setting" : "Add General Setting"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-2 py-1"
        >
          <FormField label="College" required error={errors.collegeId?.message}>
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={collegeOptions}
                  placeholder="College"
                  searchable
                />
              )}
            />
          </FormField>

          <FormField
            label="Setting Name"
            required
            htmlFor="settingName"
            error={errors.settingName?.message}
          >
            <Input
              id="settingName"
              className={INPUT_CLASS}
              placeholder="Setting Name"
              {...register("settingName")}
            />
          </FormField>
          <FormField
            label="Setting Code"
            required
            htmlFor="settingCode"
            error={errors.settingCode?.message}
          >
            <Input
              id="settingCode"
              className={INPUT_CLASS}
              placeholder="Setting Code"
              {...register("settingCode")}
            />
          </FormField>
          <FormField
            label="Setting Value"
            required
            htmlFor="settingValue"
            error={errors.settingValue?.message}
          >
            <Input
              id="settingValue"
              className={INPUT_CLASS}
              placeholder="Setting Value"
              {...register("settingValue")}
            />
          </FormField>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={field.onChange}
                onReasonChange={(value) => setValue("reason", value)}
                reasonRequired={!field.value}
                reasonPlaceholder="Reason"
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
              {submitError}
            </p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
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
