"use client";

/**
 * Angular parity: placement-company-modal
 * Payload: companyName, placementId, companyId, contactDetails (''), form grades,
 * update adds placementCompanyId + createdDt.
 */

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import { createPlacementCompany, updatePlacementCompany } from "@/services";
import type { Campus } from "@/types/campus";
import type { Company, Placement, PlacementCompany } from "@/types/placements";

const schema = z
  .object({
    comapanyRequirements: z
      .string()
      .min(1, "Company requirements are required"),
    sscGrade: z.string().optional(),
    sscPercentage: z.string().optional(),
    interGrade: z.string().optional(),
    interPercentage: z.string().optional(),
    diplomaGrade: z.string().optional(),
    diplomaPercentage: z.string().optional(),
    ugGrade: z.string().optional(),
    ugPercentage: z.string().optional(),
    pgGrade: z.string().optional(),
    pgPercentage: z.string().optional(),
    skillSetIds: z.string().optional(),
    isBackLogAllowed: z.boolean(),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !String(values.reason ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when inactive",
        path: ["reason"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function asFormStr(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value);
}

function toNumberOrNull(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function getDefaults(edit?: PlacementCompany | null): FormValues {
  return {
    comapanyRequirements: edit?.comapanyRequirements ?? "",
    sscGrade: asFormStr(edit?.sscGrade),
    sscPercentage: asFormStr(edit?.sscPercentage),
    interGrade: asFormStr(edit?.interGrade),
    interPercentage: asFormStr(edit?.interPercentage),
    diplomaGrade: asFormStr(edit?.diplomaGrade),
    diplomaPercentage: asFormStr(edit?.diplomaPercentage),
    ugGrade: asFormStr(edit?.ugGrade),
    ugPercentage: asFormStr(edit?.ugPercentage),
    pgGrade: asFormStr(edit?.pgGrade),
    pgPercentage: asFormStr(edit?.pgPercentage),
    skillSetIds: edit?.skillSetIds ?? "",
    isBackLogAllowed: edit?.isBackLogAllowed ?? true,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

function ContextRow({
  label,
  value,
}: Readonly<{ label: string; value?: string | null }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm sm:grid-cols-[9rem_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span>
        : <span className="font-medium text-foreground">{value ?? ""}</span>
      </span>
    </div>
  );
}

export interface FilterContext {
  campus: Campus | null;
  placement: Placement | null;
  company: Company | null;
}

export interface PlacementCompanyModalProps {
  open: boolean;
  onClose: () => void;
  editData: PlacementCompany | null;
  context: FilterContext;
  onSaved: () => void;
}

export function PlacementCompanyModal({
  open,
  onClose,
  editData,
  context,
  onSaved,
}: Readonly<PlacementCompanyModalProps>) {
  const isEditing = editData != null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { campus, placement, company } = context;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubmitError(null);
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  async function onSubmit(values: FormValues) {
    if (!placement || !company) {
      setSubmitError("Select campus, placement, and company before saving.");
      return;
    }

    setSubmitError(null);

    // Angular submit — companyName (not companyname); contactDetails '' when no contact select
    const payload: Record<string, unknown> = {
      companyName: company.companyname,
      placementId: Number(placement.placementId),
      companyId: Number(company.companyId),
      contactDetails: "",
      comapanyRequirements: values.comapanyRequirements.trim(),
      sscGrade: toNumberOrNull(values.sscGrade),
      sscPercentage: toNumberOrNull(values.sscPercentage),
      interGrade: toNumberOrNull(values.interGrade),
      interPercentage: toNumberOrNull(values.interPercentage),
      diplomaGrade: toNumberOrNull(values.diplomaGrade),
      diplomaPercentage: toNumberOrNull(values.diplomaPercentage),
      ugGrade: toNumberOrNull(values.ugGrade),
      ugPercentage: toNumberOrNull(values.ugPercentage),
      pgGrade: toNumberOrNull(values.pgGrade),
      pgPercentage: toNumberOrNull(values.pgPercentage),
      skillSetIds: emptyToNull(values.skillSetIds),
      isBackLogAllowed: values.isBackLogAllowed,
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : (emptyToNull(values.reason) ?? "inactive"),
    };

    try {
      if (isEditing && editData?.placementCompanyId) {
        payload.placementCompanyId = editData.placementCompanyId;
        payload.createdDt = editData.createdDt ?? null;
        await updatePlacementCompany(
          editData.placementCompanyId,
          payload as Partial<PlacementCompany>,
        );
        toastSuccess("Placement requirements updated successfully");
      } else {
        await createPlacementCompany(payload as Partial<PlacementCompany>);
        toastSuccess("Placement requirements created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save placement requirements");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        isEditing ? "Edit Placement Requirements" : "Add Placement Requirements"
      }
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="xl"
    >
      <div className="mb-4 space-y-1 rounded-md border border-border p-3">
        {campus ? (
          <ContextRow
            label="Campus"
            value={`${campus.campusName} - ${campus.orgCode}`}
          />
        ) : null}
        <ContextRow label="Placement" value={placement?.plaecmentTitle} />
        <ContextRow label="Company" value={company?.companyname} />
        <ContextRow label="Contact Person" value="" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor="comapanyRequirements">Comapany Requirements *</Label>
          <Input
            id="comapanyRequirements"
            {...register("comapanyRequirements")}
          />
          {errors.comapanyRequirements ? (
            <p className="text-xs text-destructive">
              {errors.comapanyRequirements.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sscGrade">SSC Grade</Label>
          <Input
            id="sscGrade"
            type="number"
            step="any"
            {...register("sscGrade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sscPercentage">SSC Percentage</Label>
          <Input
            id="sscPercentage"
            type="number"
            step="any"
            {...register("sscPercentage")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="interGrade">Inter Grade</Label>
          <Input
            id="interGrade"
            type="number"
            step="any"
            {...register("interGrade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="interPercentage">Inter Percentage</Label>
          <Input
            id="interPercentage"
            type="number"
            step="any"
            {...register("interPercentage")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diplomaGrade">Diploma Grade</Label>
          <Input
            id="diplomaGrade"
            type="number"
            step="any"
            {...register("diplomaGrade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diplomaPercentage">Diploma Percentage</Label>
          <Input
            id="diplomaPercentage"
            type="number"
            step="any"
            {...register("diplomaPercentage")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ugGrade">UG Grade</Label>
          <Input
            id="ugGrade"
            type="number"
            step="any"
            {...register("ugGrade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ugPercentage">UG Percentage</Label>
          <Input
            id="ugPercentage"
            type="number"
            step="any"
            {...register("ugPercentage")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pgGrade">PG Grade</Label>
          <Input
            id="pgGrade"
            type="number"
            step="any"
            {...register("pgGrade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pgPercentage">PG Percentage</Label>
          <Input
            id="pgPercentage"
            type="number"
            step="any"
            {...register("pgPercentage")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="skillSetIds">Skills</Label>
          <Input id="skillSetIds" {...register("skillSetIds")} />
        </div>

        <div className="flex items-center gap-2 sm:col-span-1">
          <Controller
            name="isBackLogAllowed"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isBackLogAllowed"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <label htmlFor="isBackLogAllowed" className="text-sm">
                  BackLog Allowed
                </label>
              </div>
            )}
          />
        </div>

        <div className="sm:col-span-4">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
                reasonRequired={!isActive}
              />
            )}
          />
        </div>
      </div>

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
