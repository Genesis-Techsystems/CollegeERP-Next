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
import { toastApiSuccess, toastError } from "@/lib/toast";

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

const EMPTY_DEFAULTS: FormValues = {
  organizationId: undefined,
  campusId: undefined as unknown as number,
  buildingName: "",
  buildingCode: "",
  landMark: "",
  noOfFloors: undefined,
  isActive: true,
  reason: "",
};

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
    defaultValues: EMPTY_DEFAULTS,
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
    if (!open) return;
    if (building) {
      reset({
        organizationId: building.organizationId,
        campusId: building.campusId,
        buildingName: building.buildingName,
        buildingCode: building.buildingCode,
        landMark: building.landMark ?? building.landmark ?? "",
        noOfFloors: building.noOfFloors ?? undefined,
        isActive: building.isActive,
        reason: building.isActive ? "" : (building.reason ?? ""),
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [building, open, reset]);

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const result = await updateBuilding(
          building!.buildingId,
          data,
          building!,
        );
        toastApiSuccess(result.message, "Record(s) updated successfully!");
      } else {
        const result = await createBuilding(
          data as Omit<Building, "buildingId">,
        );
        toastApiSuccess(result.message, "Record(s) created successfully!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save building";
      applyRequiredFieldError(message, setError, {
        campus: "campusId",
        "building name": "buildingName",
        "building code": "buildingCode",
        reason: "reason",
      });
      toastError(err);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Building" : "Add Building"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 py-1"
        >
          {/* Row 1: Campus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Row 2: Building Name, Building Code, Landmark (3 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
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

            <FormField label="Landmark" htmlFor="landMark">
              <Input
                id="landMark"
                className={INPUT_CLASS}
                placeholder="Landmark"
                {...register("landMark")}
              />
            </FormField>
          </div>

          {/* Row 3: No. of Floors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
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
                placeholder="No. of Floors"
                {...register("noOfFloors", { valueAsNumber: true })}
              />
            </FormField>
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
                reasonRequired={!field.value}
                reasonPlaceholder="Reason"
                reasonError={errors.reason?.message}
              />
            )}
          />

          <DialogFooter className="pt-2">
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
