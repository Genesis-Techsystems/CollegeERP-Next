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
import { createBlock, listActiveBuildings, updateBlock } from "@/services";
import type { Block } from "@/types/block";
import type { Building } from "@/types/building";
import { applyRequiredFieldError, requiredNumber } from "@/lib/zod-fields";
import { toastApiSuccess, toastError } from "@/lib/toast";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";

const schema = z
  .object({
    campusId: z.number().optional(),
    buildingId: requiredNumber("Building is required"),
    blockName: z.string().min(1, "Block Name is required"),
    blockCode: z.string().min(1, "Block Code is required"),
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
  campusId: undefined,
  buildingId: undefined as unknown as number,
  blockName: "",
  blockCode: "",
  noOfFloors: undefined,
  isActive: true,
  reason: "",
};

interface BlockModalProps {
  open: boolean;
  onClose: () => void;
  block: Block | null;
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

export default function BlockModal({
  open,
  onClose,
  block,
  onSaved,
}: Readonly<BlockModalProps>) {
  const isEditing = block != null;
  const [buildings, setBuildings] = useState<Building[]>([]);

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

  const buildingOptions = useMemo(
    () =>
      asOptions(
        buildings,
        (r) => r.buildingId,
        (r) => `${r.buildingCode ?? ""} - ${r.buildingName}`.trim(),
      ),
    [buildings],
  );

  useEffect(() => {
    if (!open) return;
    listActiveBuildings().then(setBuildings).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (block) {
      reset({
        campusId: block.campusId,
        buildingId: block.buildingId,
        blockName: block.blockName,
        blockCode: block.blockCode,
        noOfFloors: block.noOfFloors ?? undefined,
        isActive: block.isActive,
        reason: block.isActive ? "" : (block.reason ?? ""),
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [block, open, reset]);

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const result = await updateBlock(block!.blockId, data, block!);
        toastApiSuccess(result.message, "Record(s) updated successfully!");
      } else {
        const result = await createBlock(data as Omit<Block, "blockId">);
        toastApiSuccess(result.message, "Record(s) created successfully!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save block";
      applyRequiredFieldError(message, setError, {
        building: "buildingId",
        "block name": "blockName",
        "block code": "blockCode",
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
            {isEditing ? "Edit Block" : "Add Block"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 py-1"
        >
          {/* Row 1: Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Building"
              required
              error={errors.buildingId?.message}
            >
              <Controller
                name="buildingId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={buildingOptions}
                    placeholder="Building"
                    searchable
                  />
                )}
              />
            </FormField>
          </div>

          {/* Row 2: Block Name, Block Code, No. of Floors (3 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
            <FormField
              label="Block Name"
              required
              htmlFor="blockName"
              error={errors.blockName?.message}
            >
              <Input
                id="blockName"
                className={INPUT_CLASS}
                placeholder="Block Name"
                {...register("blockName")}
              />
            </FormField>

            <FormField
              label="Block Code"
              required
              htmlFor="blockCode"
              error={errors.blockCode?.message}
            >
              <Input
                id="blockCode"
                className={INPUT_CLASS}
                placeholder="Block Code"
                {...register("blockCode")}
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
