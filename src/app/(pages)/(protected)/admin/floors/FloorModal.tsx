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
import {
  createFloor,
  listActiveBlocksForFloors,
  updateFloor,
} from "@/services";
import type { Block } from "@/types/block";
import type { Floor } from "@/types/floor";
import { applyRequiredFieldError, requiredNumber } from "@/lib/zod-fields";
import { toastApiSuccess, toastError } from "@/lib/toast";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";

const schema = z
  .object({
    blockId: requiredNumber("Block is required"),
    floorName: z.string().min(1, "Floor Name is required"),
    floorNo: z.preprocess(
      (value) =>
        value === "" || value == null || Number.isNaN(value)
          ? undefined
          : value,
      z
        .number({ error: "Floor No is required" })
        .min(0, "Floor No cannot be negative"),
    ),
    noOfRooms: z.preprocess(
      (value) =>
        value === "" || value == null || Number.isNaN(value)
          ? undefined
          : value,
      z.number().min(0, "No. of rooms cannot be negative").optional(),
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
  blockId: undefined as unknown as number,
  floorName: "",
  floorNo: undefined as unknown as number,
  noOfRooms: undefined,
  isActive: true,
  reason: "",
};

interface FloorModalProps {
  open: boolean;
  onClose: () => void;
  floor: Floor | null;
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

export default function FloorModal({
  open,
  onClose,
  floor,
  onSaved,
}: Readonly<FloorModalProps>) {
  const isEditing = floor != null;
  const [blocks, setBlocks] = useState<Block[]>([]);

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

  const blockOptions = useMemo(
    () =>
      asOptions(
        blocks,
        (r) => r.blockId,
        (r) => `${r.blockCode ?? ""} - ${r.blockName ?? ""}`.trim(),
      ),
    [blocks],
  );

  useEffect(() => {
    if (!open) return;
    listActiveBlocksForFloors().then(setBlocks).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (floor) {
      reset({
        blockId: floor.blockId,
        floorName: floor.floorName,
        floorNo: floor.floorNo,
        noOfRooms: floor.noOfRooms ?? undefined,
        isActive: floor.isActive,
        reason: floor.isActive ? "" : (floor.reason ?? ""),
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [floor, open, reset]);

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const result = await updateFloor(floor.floorId, data, floor);
        toastApiSuccess(result.message, "Record(s) updated successfully!");
      } else {
        const result = await createFloor(data);
        toastApiSuccess(result.message, "Record(s) created successfully!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save floor";
      applyRequiredFieldError(message, setError, {
        block: "blockId",
        "floor name": "floorName",
        "floor no": "floorNo",
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
            {isEditing ? "Edit Floor" : "Add Floor"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 py-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&>*]:min-w-0">
            <FormField label="Block" required error={errors.blockId?.message}>
              <Controller
                name="blockId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={blockOptions}
                    placeholder="Select block"
                    searchable
                  />
                )}
              />
            </FormField>

            <FormField
              label="Floor Name"
              required
              htmlFor="floorName"
              error={errors.floorName?.message}
            >
              <Input
                id="floorName"
                className={INPUT_CLASS}
                placeholder="Floor Name"
                {...register("floorName")}
              />
            </FormField>

            <FormField
              label="Floor No"
              required
              htmlFor="floorNo"
              error={errors.floorNo?.message}
            >
              <Input
                id="floorNo"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="Floor No"
                {...register("floorNo", { valueAsNumber: true })}
              />
            </FormField>

            <FormField
              label="No. of Rooms"
              htmlFor="noOfRooms"
              error={errors.noOfRooms?.message}
            >
              <Input
                id="noOfRooms"
                type="number"
                min={0}
                className={INPUT_CLASS}
                placeholder="No. of Rooms"
                {...register("noOfRooms", { valueAsNumber: true })}
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
