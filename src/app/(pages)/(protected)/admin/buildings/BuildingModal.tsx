"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
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
import { createBuilding, listActiveCampuses, updateBuilding } from "@/services";
import type { Building } from "@/types/building";
import type { Campus } from "@/types/campus";
import { applyRequiredFieldError, requiredNumber } from "@/lib/zod-fields";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";

const schema = z
  .object({
    organizationId: z.number().optional(),
    campusId: requiredNumber("Campus is required"),
    buildingName: z.string().min(1, "Building Name is required"),
    buildingCode: z.string().min(1, "Building Code is required"),
    landMark: z.string().optional(),
    noOfFloors: z.preprocess(
      (value) =>
        value === "" || value == null || Number.isNaN(value)
          ? undefined
          : value,
      z.number().min(0, "No. of floors cannot be negative").optional(),
    ),
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

interface BuildingModalProps {
  open: boolean;
  onClose: () => void;
  building: Building | null;
  onSaved: () => void;
}

function asOptions<T>(
  rows: T[],
  getValue: (row: T) => number,
  getLabel: (row: T) => string,
): SelectOption[] {
  return rows.map((row) => ({
    value: String(getValue(row)),
    label: getLabel(row),
  }));
}

export default function BuildingModal({
  open,
  onClose,
  building,
  onSaved,
}: Readonly<BuildingModalProps>) {
  const isEditing = building != null;
  const [campuses, setCampuses] = useState<Campus[]>([]);
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    defaultValues: {
      organizationId: undefined,
      campusId: undefined,
      buildingName: "",
      buildingCode: "",
      landMark: "",
      noOfFloors: undefined,
      isActive: true,
      reason: "",
    },
  });

  const campusOptions = useMemo(
    () =>
      asOptions(
        campuses,
        (r) => r.campusId,
        (r) => r.campusName,
      ),
    [campuses],
  );

  useEffect(() => {
    if (!open) return;
    listActiveCampuses().then(setCampuses).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (building) {
      const raw = building as unknown as Record<string, unknown>;
      reset({
        organizationId: building.organizationId,
        campusId: building.campusId,
        buildingName: building.buildingName,
        buildingCode: building.buildingCode,
        landMark:
          building.landMark ??
          (typeof raw.landmark === "string" ? raw.landmark : "") ??
          "",
        noOfFloors: building.noOfFloors ?? undefined,
        isActive: building.isActive,
        reason: building.isActive ? "" : (building.reason ?? ""),
      });
    } else {
      reset();
    }
    setSubmitError(null);
  }, [building, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) {
        await updateBuilding(building!.buildingId, data, building!);
      } else {
        await createBuilding(data as Omit<Building, "buildingId">);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save building";
      if (
        applyRequiredFieldError(message, setError, {
          campus: "campusId",
          "building name": "buildingName",
          "building code": "buildingCode",
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Building" : "Add Building"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-2 py-1"
        >
          <FormField label="Campus" required error={errors.campusId?.message}>
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={campusOptions}
                  placeholder="Campus"
                  searchable
                />
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
            <FormField
              label="Building Name"
              required
              htmlFor="buildingName"
              error={errors.buildingName?.message}
            >
              <Input
                id="buildingName"
                className={INPUT_CLASS}
                placeholder="Building Name"
                {...register("buildingName")}
              />
            </FormField>
            <FormField
              label="Building Code"
              required
              htmlFor="buildingCode"
              error={errors.buildingCode?.message}
            >
              <Input
                id="buildingCode"
                className={INPUT_CLASS}
                placeholder="Building Code"
                {...register("buildingCode")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
            <FormField label="Land Mark" htmlFor="landMark">
              <Input
                id="landMark"
                className={INPUT_CLASS}
                placeholder="Land Mark"
                {...register("landMark")}
              />
            </FormField>
            <FormField
              label="No. of Floors"
              htmlFor="noOfFloors"
              error={errors.noOfFloors?.message}
            >
              <Input
                id="noOfFloors"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="No Of Floors"
                {...register("noOfFloors", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          {isEditing && (
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
          )}

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
