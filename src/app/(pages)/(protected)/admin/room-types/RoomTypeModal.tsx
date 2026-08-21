"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  createRoomType,
  listActiveOrganizations,
  updateRoomType,
} from "@/services";
import type { Organization } from "@/types/organization";
import type { RoomType } from "@/types/room-type";
import { applyRequiredFieldError, requiredNumber } from "@/lib/zod-fields";
import { toastApiSuccess, toastError } from "@/lib/toast";

const INPUT_CLASS =
  "min-h-9 placeholder:text-muted-foreground placeholder:opacity-100";

const schema = z
  .object({
    organizationId: requiredNumber("Organization is required"),
    roomType: z.string().min(1, "Room Type is required"),
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
  organizationId: undefined as unknown as number,
  roomType: "",
  isActive: true,
  reason: "",
};

interface RoomTypeModalProps {
  open: boolean;
  onClose: () => void;
  roomType: RoomType | null;
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

export default function RoomTypeModal({
  open,
  onClose,
  roomType,
  onSaved,
}: Readonly<RoomTypeModalProps>) {
  const isEditing = roomType != null;
  const [organizations, setOrganizations] = useState<Organization[]>([]);

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
    defaultValues: EMPTY_DEFAULTS,
  });

  const organizationOptions = useMemo(
    () =>
      asOptions(
        organizations,
        (r) => r.organizationId,
        (r) => r.orgCode ?? r.orgName,
      ),
    [organizations],
  );

  useEffect(() => {
    if (!open) return;
    listActiveOrganizations().then(setOrganizations).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (roomType) {
      reset({
        organizationId: roomType.organizationId,
        roomType: roomType.roomType,
        isActive: roomType.isActive,
        reason: roomType.isActive ? "" : (roomType.reason ?? ""),
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [roomType, open, reset]);

  async function onSubmit(data: FormValues) {
    try {
      if (isEditing) {
        const result = await updateRoomType(
          roomType.roomTypeId,
          data,
          roomType,
        );
        toastApiSuccess(result.message, "Record(s) updated successfully!");
      } else {
        const result = await createRoomType(data);
        toastApiSuccess(result.message, "Record(s) created successfully!");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save room type";
      applyRequiredFieldError(message, setError, {
        organization: "organizationId",
        "room type": "roomType",
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Room Type" : "Add Room Type"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 py-1"
        >
          {/* Side-by-side grid container for Organization and Room Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end [&>*]:min-w-0">
            <FormField
              label="Organization"
              required
              error={errors.organizationId?.message}
            >
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={organizationOptions}
                    placeholder="Organization"
                    searchable
                  />
                )}
              />
            </FormField>

            <FormField
              label="Room Type"
              required
              htmlFor="roomType"
              error={errors.roomType?.message}
            >
              <Input
                id="roomType"
                className={INPUT_CLASS}
                placeholder="Room Type"
                {...register("roomType")}
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

          <DialogFooter className="gap-2 pt-2 sm:justify-end">
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
