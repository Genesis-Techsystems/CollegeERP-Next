"use client";

/**
 * Angular parity: placement-modal
 * Required: campusId, plaecmentTitle, placementCatId
 * Submit adds organizationId from selected campus; dates as YYYY-MM-DD;
 * edit includes createdDt; start>end resets end date (calDays).
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
import { GM_CODES } from "@/config/constants/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createPlacement,
  listActiveCampuses,
  listGeneralDetailsByCode,
  updatePlacement,
} from "@/services";
import type { Campus } from "@/types/campus";
import type { Placement } from "@/types/placements";

type AnyRow = Record<string, unknown>;

const schema = z
  .object({
    campusId: z.string().min(1, "Campus is required"),
    plaecmentTitle: z.string().min(1, "Placement title is required"),
    placementCatId: z.string().min(1, "Placement status is required"),
    description: z.string().optional(),
    placementStartDate: z.date({ message: "Start date is required" }),
    placementEndDate: z.date({ message: "End date is required" }),
    contactPerson: z.string().optional(),
    contactDetails: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    isOffcampus: z.boolean(),
    offcampusLocation: z.string().optional(),
    placementStatusComments: z.string().optional(),
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

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Angular `momentWithDateFormatYMD` → YYYY-MM-DD. */
function toYmd(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
}

function emptyToNull(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function getDefaults(edit?: Placement | null): FormValues {
  return {
    campusId: edit?.campusId != null ? String(edit.campusId) : "",
    plaecmentTitle: edit?.plaecmentTitle ?? "",
    placementCatId:
      edit?.placementCatId != null ? String(edit.placementCatId) : "",
    description: edit?.description ?? "",
    placementStartDate: parseDate(edit?.placementStartDate),
    placementEndDate: parseDate(edit?.placementEndDate),
    contactPerson: edit?.contactPerson ?? "",
    contactDetails: edit?.contactDetails ?? "",
    address: edit?.address ?? "",
    city: edit?.city ?? "",
    isOffcampus: edit?.isOffcampus ?? false,
    offcampusLocation: edit?.offcampusLocation ?? "",
    placementStatusComments: edit?.placementStatusComments ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

export interface PlacementModalProps {
  open: boolean;
  onClose: () => void;
  editData: Placement | null;
  onSaved: () => void;
}

export function PlacementModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<PlacementModalProps>) {
  const isEditing = editData != null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dateInfo, setDateInfo] = useState<string | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [statusList, setStatusList] = useState<AnyRow[]>([]);

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

  const isOffcampus = watch("isOffcampus");
  const isActive = watch("isActive");
  const startDate = watch("placementStartDate");
  const endDate = watch("placementEndDate");

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubmitError(null);
    setDateInfo(null);

    void listActiveCampuses().then(setCampuses).catch(console.error);
    void listGeneralDetailsByCode(GM_CODES.PLACEMENT_STATUS)
      .then(setStatusList)
      .catch(console.error);
  }, [open, editData, reset]);

  // Angular calDays: start > end → info + set end = start
  useEffect(() => {
    if (!open || !startDate || !endDate) return;
    if (startDate.getTime() > endDate.getTime()) {
      setDateInfo("From date should be less then To date.");
      setValue("placementEndDate", startDate);
    } else {
      setDateInfo(null);
    }
  }, [open, startDate, endDate, setValue]);

  const campusOptions = useMemo<SelectOption[]>(
    () =>
      campuses.map((c) => ({
        value: String(c.campusId),
        label: `${c.campusName} - ${c.orgCode}`,
      })),
    [campuses],
  );

  const statusOptions = useMemo<SelectOption[]>(
    () =>
      statusList.map((s) => ({
        value: String(s.generalDetailId ?? s.gd_id ?? ""),
        label: String(s.generalDetailDisplayName ?? s.gd_name ?? "Status"),
      })),
    [statusList],
  );

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const campus = campuses.find((c) => c.campusId === Number(values.campusId));
    if (!campus) {
      setSubmitError("Selected campus is invalid.");
      return;
    }

    // Angular submit: form value + organizationId + YMD dates (+ createdDt on edit)
    const payload: Record<string, unknown> = {
      campusId: Number(values.campusId),
      organizationId: campus.organizationId,
      plaecmentTitle: values.plaecmentTitle.trim(),
      placementCatId: Number(values.placementCatId),
      description: emptyToNull(values.description),
      placementStartDate: toYmd(values.placementStartDate),
      placementEndDate: toYmd(values.placementEndDate),
      contactPerson: emptyToNull(values.contactPerson),
      contactDetails: emptyToNull(values.contactDetails),
      address: emptyToNull(values.address),
      city: emptyToNull(values.city),
      isOffcampus: values.isOffcampus,
      offcampusLocation: values.isOffcampus
        ? emptyToNull(values.offcampusLocation)
        : null,
      placementStatusComments: emptyToNull(values.placementStatusComments),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : (emptyToNull(values.reason) ?? "inactive"),
    };

    try {
      if (isEditing && editData?.placementId) {
        payload.placementId = editData.placementId;
        payload.createdDt = editData.createdDt ?? null;
        await updatePlacement(
          editData.placementId,
          payload as Partial<Placement>,
        );
        toastSuccess("Placement updated successfully");
      } else {
        await createPlacement(payload as Partial<Placement>);
        toastSuccess("Placement created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save placement");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Placement" : "Add Placement"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="xl"
    >
      <div className="space-y-4">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Campus Details</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Controller
                name="campusId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Campus"
                    required
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? "")}
                    options={campusOptions}
                    placeholder="Campus"
                    error={errors.campusId?.message}
                  />
                )}
              />
            </div>
            <div className="flex items-end pb-1">
              <Controller
                name="isOffcampus"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isOffcampus"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <label htmlFor="isOffcampus" className="text-sm">
                      Off Campus
                    </label>
                  </div>
                )}
              />
            </div>
            {isOffcampus ? (
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="offcampusLocation">Location</Label>
                <Textarea
                  id="offcampusLocation"
                  rows={2}
                  {...register("offcampusLocation")}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Placement Details</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plaecmentTitle">Placement Title *</Label>
              <Input id="plaecmentTitle" {...register("plaecmentTitle")} />
              {errors.plaecmentTitle ? (
                <p className="text-xs text-destructive">
                  {errors.plaecmentTitle.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                {...register("description")}
              />
            </div>
            <Controller
              name="placementStartDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Start Date"
                  value={field.value ?? null}
                  onChange={(d) => field.onChange(d ?? new Date())}
                  displayFormat="dd/MM/yyyy"
                  clearable={false}
                  error={errors.placementStartDate?.message}
                />
              )}
            />
            <Controller
              name="placementEndDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="End Date"
                  value={field.value ?? null}
                  onChange={(d) => field.onChange(d ?? new Date())}
                  displayFormat="dd/MM/yyyy"
                  minDate={startDate}
                  clearable={false}
                  error={errors.placementEndDate?.message}
                />
              )}
            />
            {dateInfo ? (
              <p className="text-xs text-amber-700 sm:col-span-2">{dateInfo}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold">Contact Details</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" {...register("contactPerson")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactDetails">Contact Details</Label>
              <Input id="contactDetails" {...register("contactDetails")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <Controller
              name="placementCatId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Placement Status"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  options={statusOptions}
                  placeholder="Placement Status"
                  error={errors.placementCatId?.message}
                />
              )}
            />
            <div className="space-y-1.5">
              <Label htmlFor="placementStatusComments">Status Comments</Label>
              <Input
                id="placementStatusComments"
                {...register("placementStatusComments")}
              />
            </div>
            <div className="sm:col-span-2">
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
        </section>
      </div>

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
