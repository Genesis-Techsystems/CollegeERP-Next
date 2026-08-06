"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGrievanceCommittee,
  listActiveOrganizationsForGrievanceMasters,
  updateGrievanceCommittee,
  type GrievanceCommittee,
} from "@/services";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  committeeName: z.string().min(1, "Committee Name is required"),
  committeeCode: z.string().min(1, "Committee Code is required"),
  escalateInDays: z.union([z.number(), z.nan()]).optional().nullable(),
  hierarchyLevel: z.union([z.number(), z.nan()]).optional().nullable(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GrievanceCommitteeModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: GrievanceCommittee | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [organizations, setOrganizations] = useState<
    Array<{ organizationId: number; orgCode?: string; orgName?: string }>
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      committeeName: "",
      committeeCode: "",
      escalateInDays: null,
      hierarchyLevel: null,
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    listActiveOrganizationsForGrievanceMasters()
      .then(setOrganizations)
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (row) {
      reset({
        organizationId: row.organizationId,
        committeeName: row.committeeName ?? "",
        committeeCode: row.committeeCode ?? "",
        escalateInDays: row.escalateInDays ?? null,
        hierarchyLevel: row.hierarchyLevel ?? null,
        isActive: row.isActive !== false,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        organizationId: undefined,
        committeeName: "",
        committeeCode: "",
        escalateInDays: null,
        hierarchyLevel: null,
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [row, open, reset]);

  const organizationOptions = useMemo(
    () =>
      organizations.map((org) => ({
        value: String(org.organizationId),
        label: org.orgCode ?? org.orgName ?? String(org.organizationId),
      })),
    [organizations],
  );

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    const payload = {
      organizationId: data.organizationId,
      committeeName: data.committeeName,
      committeeCode: data.committeeCode,
      escalateInDays:
        data.escalateInDays != null &&
        !Number.isNaN(Number(data.escalateInDays))
          ? Number(data.escalateInDays)
          : null,
      hierarchyLevel:
        data.hierarchyLevel != null &&
        !Number.isNaN(Number(data.hierarchyLevel))
          ? Number(data.hierarchyLevel)
          : null,
      isActive: data.isActive,
      reason: data.reason,
    };
    try {
      if (isEditing)
        await updateGrievanceCommittee(row!.grvCommitteeId, payload);
      else await createGrievanceCommittee(payload);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save committee",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold text-[hsl(var(--primary))]">
            {isEditing ? "Edit Committee" : "Add Committee"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) =>
                  field.onChange(value ? Number(value) : undefined)
                }
                options={organizationOptions}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="committeeName">Committee Name *</Label>
              <Input id="committeeName" {...register("committeeName")} />
              {errors.committeeName && (
                <p className="text-xs text-red-500">
                  {errors.committeeName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="committeeCode">Committee Code *</Label>
              <Input id="committeeCode" {...register("committeeCode")} />
              {errors.committeeCode && (
                <p className="text-xs text-red-500">
                  {errors.committeeCode.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="escalateInDays">Escalate In Days</Label>
              <Input
                id="escalateInDays"
                type="number"
                {...register("escalateInDays", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="hierarchyLevel">Hierarchy Level</Label>
              <Input
                id="hierarchyLevel"
                type="number"
                {...register("hierarchyLevel", { valueAsNumber: true })}
              />
            </div>
          </div>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(value) => setValue("reason", value)}
                reasonError={errors.reason?.message}
              />
            )}
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
