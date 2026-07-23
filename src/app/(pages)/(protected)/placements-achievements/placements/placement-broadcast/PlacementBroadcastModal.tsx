"use client";

/**
 * Angular parity: placement-broadcast-modal
 * Active companies only; parent injects yearName + posttypeCatdetId on create;
 * approvedOn as YYYY-MM-DD; update includes placementBroadcastId + createdDt.
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createPlacementBroadcast,
  listActiveCompaniesForBroadcast,
  updatePlacementBroadcast,
} from "@/services";
import type { Company, PlacementBroadcast } from "@/types/placements";

const schema = z
  .object({
    companyId: z.string().min(1, "Company is required"),
    postHeader: z.string().optional(),
    post: z.string().optional(),
    postSignature: z.string().optional(),
    isApproved: z.boolean(),
    approvedOn: z.date().nullable().optional(),
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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Angular `momentWithDateFormatYMD`. */
function toYmd(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
}

function emptyToNull(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function getDefaults(edit?: PlacementBroadcast | null): FormValues {
  return {
    companyId: edit?.companyId != null ? String(edit.companyId) : "",
    postHeader: edit?.postHeader ?? "",
    post: edit?.post ?? "",
    postSignature: edit?.postSignature ?? "",
    isApproved: edit?.isApproved ?? false,
    approvedOn: edit ? parseDate(edit.approvedOn) : new Date(),
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface FilterContext {
  yearName: string;
  posttypeCatdetId: string;
}

export interface PlacementBroadcastModalProps {
  open: boolean;
  onClose: () => void;
  editData: PlacementBroadcast | null;
  filterContext: FilterContext;
  onSaved: () => void;
}

export function PlacementBroadcastModal({
  open,
  onClose,
  editData,
  filterContext,
  onSaved,
}: Readonly<PlacementBroadcastModalProps>) {
  const isEditing = editData != null;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    // Angular: listDetailsById(Company, true, isActive)
    void listActiveCompaniesForBroadcast()
      .then(setCompanies)
      .catch(console.error);
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  const companyOptions = useMemo<SelectOption[]>(
    () =>
      companies.map((c) => ({
        value: String(c.companyId),
        label: c.companyname,
      })),
    [companies],
  );

  async function onSubmit(values: FormValues) {
    if (!filterContext.yearName || !filterContext.posttypeCatdetId) {
      setSubmitError("Select year and post type before saving.");
      return;
    }

    setSubmitError(null);

    // Angular modal closes with form value; parent adds yearName + posttypeCatdetId on create
    const payload: Record<string, unknown> = {
      companyId: Number(values.companyId),
      postHeader: emptyToNull(values.postHeader),
      post: emptyToNull(values.post),
      postSignature: emptyToNull(values.postSignature),
      isApproved: values.isApproved,
      approvedOn: toYmd(values.approvedOn ?? null),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : (emptyToNull(values.reason) ?? "inactive"),
    };

    try {
      if (isEditing && editData?.placementBroadcastId) {
        payload.placementBroadcastId = editData.placementBroadcastId;
        payload.createdDt = editData.createdDt ?? null;
        payload.yearName = editData.yearName ?? filterContext.yearName;
        payload.posttypeCatdetId =
          editData.posttypeCatdetId ?? Number(filterContext.posttypeCatdetId);
        await updatePlacementBroadcast(
          editData.placementBroadcastId,
          payload as Partial<PlacementBroadcast>,
        );
        toastSuccess("Placement broadcast updated successfully");
      } else {
        payload.yearName = filterContext.yearName;
        payload.posttypeCatdetId = Number(filterContext.posttypeCatdetId);
        await createPlacementBroadcast(payload as Partial<PlacementBroadcast>);
        toastSuccess("Placement broadcast created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save placement broadcast");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Placement Broadcast" : "Add Placement Broadcast"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Controller
          name="companyId"
          control={control}
          render={({ field }) => (
            <Select
              label="Company"
              required
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={companyOptions}
              placeholder="Company"
              searchable
              error={errors.companyId?.message}
            />
          )}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="postHeader">Post Header</Label>
          <Input id="postHeader" {...register("postHeader")} />
        </div>

        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="post">Post</Label>
          <Textarea id="post" rows={4} {...register("post")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="postSignature">Post Signature</Label>
          <Input id="postSignature" {...register("postSignature")} />
        </div>

        <div className="flex items-end pb-1">
          <Controller
            name="isApproved"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isApproved"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <label htmlFor="isApproved" className="text-sm">
                  Approve
                </label>
              </div>
            )}
          />
        </div>

        <Controller
          name="approvedOn"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Approve Date"
              value={field.value ?? null}
              onChange={(d) => field.onChange(d)}
              displayFormat="dd/MM/yyyy"
            />
          )}
        />

        <div className="sm:col-span-3">
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
