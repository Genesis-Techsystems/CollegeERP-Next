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
      campusId: undefined,
      buildingId: undefined,
      blockName: "",
      blockCode: "",
      noOfFloors: undefined,
      isActive: true,
      reason: "",
    },
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
      reset();
    }
    setSubmitError(null);
  }, [block, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) {
        await updateBlock(block!.blockId, data, block!);
      } else {
        await createBlock(data as Omit<Block, "blockId">);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save block";
      if (
        applyRequiredFieldError(message, setError, {
          building: "buildingId",
          "block name": "blockName",
          "block code": "blockCode",
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
            {isEditing ? "Edit Block" : "Add Block"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-2 py-1"
        >
          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
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
