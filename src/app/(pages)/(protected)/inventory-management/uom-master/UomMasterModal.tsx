"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectOption } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvUom,
  listActiveInvUomsForParent,
  listActiveOrganizationsForInventory,
  updateInvUom,
} from "@/services";
import type { InvUom } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  uomName: z.string().min(1, "Unit of measurement name is required"),
  uomCode: z.string().min(1, "Unit of measurement code is required"),
  conversionqty: z
    .any()
    .refine(
      (v) => {
        if (v === "" || v === null || v === undefined) return false;
        if (typeof v === "number" && Number.isNaN(v)) return false;
        return Number.isFinite(Number(v));
      },
      { message: "Conversion Qty is required" },
    )
    .transform((v) => Number(v)),
  parentUomId: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvUom | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    uomCode: edit?.uomCode ?? "",
    uomName: edit?.uomName ?? "",
    conversionqty: edit?.conversionqty ?? Number.NaN,
    parentUomId: edit?.parentUomId ? String(edit.parentUomId) : "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvUom | null;
  onSaved: () => void;
}

export default function UomMasterModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  /** Angular: listDetailsById(Organization, 'true', 'isActive') */
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
    enabled: open,
  });

  /** Angular: listDetailsByIdWithSort(InvUommaster, true, DESC, isActive, uomId) */
  const { data: parentUoms = [], isLoading: uomsLoading } = useQuery({
    queryKey: ["InvUommaster", "activeForParent"],
    queryFn: listActiveInvUomsForParent,
    enabled: open,
  });

  const organizationOptions: SelectOption[] = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId ?? ""),
        label: String(o.orgCode ?? o.orgName ?? o.organizationId ?? ""),
      })),
    [organizations],
  );

  // Angular maps parentUomId = uomId, parentUomName = uomName for the dropdown
  const parentUomOptions: SelectOption[] = useMemo(
    () =>
      parentUoms.map((u) => ({
        value: String(u.uomId),
        label: u.uomName ?? u.uomCode ?? String(u.uomId),
      })),
    [parentUoms],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvUom> = {
      organizationId: values.organizationId,
      uomCode: values.uomCode.trim(),
      uomName: values.uomName.trim(),
      conversionqty: values.conversionqty,
      parentUomId: values.parentUomId ? Number(values.parentUomId) : undefined,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets details.uomId before updateDetails(..., uomId, 'uomId')
        await updateInvUom(editData.uomId, {
          ...payload,
          uomId: editData.uomId,
        });
        toastSuccess("Unit of measurement updated successfully.");
      } else {
        await createInvUom(payload);
        toastSuccess("Unit of measurement created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? "Edit Unit Of Measurement" : "Add Unit Of Measurement"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={organizationOptions}
                placeholder="Organization"
                isLoading={orgsLoading}
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-0.5 sm:col-span-2">
              <Label className="text-xs">Unit Of Measurement Name *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Unit Of Measurement Name"
                {...register("uomName")}
              />
              {errors.uomName && (
                <p className="text-xs text-red-500">{errors.uomName.message}</p>
              )}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Unit Of Measurement Code *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Unit Of Measurement Code"
                {...register("uomCode")}
              />
              {errors.uomCode && (
                <p className="text-xs text-red-500">{errors.uomCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-0.5">
              <Label className="text-xs">Conversion Qty *</Label>
              <Input
                type="number"
                step="any"
                className="h-8 text-xs"
                placeholder="Conversion Qty"
                {...register("conversionqty", { valueAsNumber: true })}
              />
              {errors.conversionqty && (
                <p className="text-xs text-red-500">
                  {errors.conversionqty.message}
                </p>
              )}
            </div>
            <Controller
              name="parentUomId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Parent UOM"
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  options={parentUomOptions}
                  placeholder="Parent UOM"
                  clearable
                  searchable
                  isLoading={uomsLoading}
                />
              )}
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(active) => {
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
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
