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
import { ActiveStatusField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvBrand,
  listActiveOrganizationsForInventory,
  updateInvBrand,
} from "@/services";
import type { InvBrand } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  brandName: z.string().min(1, "Brand Name is required"),
  brandCode: z.string().min(1, "Brand Code is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: InvBrand | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    brandCode: edit?.brandCode ?? "",
    brandName: edit?.brandName ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvBrand | null;
  onSaved: () => void;
}

export default function BrandMasterModal({
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

  /** Angular: listDetailsById(Organization, 'true', 'isActive') → size=99999&query=isActive==true */
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
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

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvBrand> = {
      organizationId: values.organizationId,
      brandCode: values.brandCode.trim(),
      brandName: values.brandName.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets details.brandmasterId before updateDetails(..., brandmasterId, 'brandmasterId')
        await updateInvBrand(editData.brandmasterId, {
          ...payload,
          brandmasterId: editData.brandmasterId,
        });
        toastSuccess("Brand master updated successfully.");
      } else {
        await createInvBrand(payload);
        toastSuccess("Brand master created successfully.");
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
            {editData ? "Edit Brand" : "Add Brand"}
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
              <Label className="text-xs">Brand Name *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Brand Name"
                {...register("brandName")}
              />
              {errors.brandName && (
                <p className="text-xs text-red-500">
                  {errors.brandName.message}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Brand Code *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Brand Code"
                {...register("brandCode")}
              />
              {errors.brandCode && (
                <p className="text-xs text-red-500">
                  {errors.brandCode.message}
                </p>
              )}
            </div>
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
