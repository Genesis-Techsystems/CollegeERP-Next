"use client";

/**
 * Angular parity: comapny-contacts-modal + parent updateCompanyContacts payload.
 * Update body must include companyContactId, companyId, nullables, emailid, ISO lastContactedOn.
 */

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompanyContact, updateCompanyContact } from "@/services";
import type { CompanyContact } from "@/types/placements";
import { toastError, toastSuccess } from "@/lib/toast";

/** Angular CONSTANTS.patterns.phNo */
const PHONE_PATTERN = /^[6-9][0-9]{9}$/;

const schema = z.object({
  personName: z.string().min(1, "Person name is required"),
  mobile: z
    .string()
    .min(1, "Mobile is required")
    .regex(PHONE_PATTERN, "Enter 10 digit number"),
  designation: z.string().min(1, "Designation is required"),
  landline: z.string().optional(),
  details: z.string().optional(),
  emailid: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email",
    ),
  lastContactedOn: z.date().nullable().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Match Angular mat-datepicker JSON: local midnight → ISO (e.g. IST → prior day 18:30Z). */
function toAngularDateIso(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const local = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
  return local.toISOString();
}

function emptyToNull(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : raw;
}

function getDefaults(edit?: CompanyContact | null): FormValues {
  return {
    personName: edit?.personName ?? "",
    mobile: String(edit?.mobile ?? ""),
    designation: edit?.designation ?? "",
    landline: edit?.landline ?? "",
    details: edit?.details ?? "",
    emailid: edit?.emailid ?? "",
    lastContactedOn: edit ? parseDate(edit.lastContactedOn) : new Date(),
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: CompanyContact | null;
  companyId: number;
  onSaved: () => void;
}

export function CompanyContactModal({
  open,
  onClose,
  editData,
  companyId,
  onSaved,
}: Readonly<Props>) {
  const isEditing = editData != null;
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
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubmitError(null);
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    // Angular dialog closes with form value; parent adds companyContactId + companyId on edit.
    const payload: Record<string, unknown> = {
      personName: values.personName.trim(),
      mobile: values.mobile.trim(),
      designation: values.designation.trim(),
      landline: emptyToNull(values.landline),
      details: emptyToNull(values.details),
      emailid: emptyToNull(values.emailid),
      lastContactedOn: toAngularDateIso(values.lastContactedOn ?? null),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : (emptyToNull(values.reason) ?? "inactive"),
      companyId,
    };

    try {
      if (isEditing && editData?.companyContactId) {
        payload.companyContactId = editData.companyContactId;
        await updateCompanyContact(
          editData.companyContactId,
          payload as Partial<CompanyContact>,
        );
        toastSuccess("Company contact updated successfully");
      } else {
        await createCompanyContact(payload as Partial<CompanyContact>);
        toastSuccess("Company contact created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save company contact");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Company Contact" : "Add Company Contact"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="personName">Person Name *</Label>
          <Input id="personName" {...register("personName")} />
          {errors.personName ? (
            <p className="text-xs text-destructive">
              {errors.personName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="designation">Designation *</Label>
          <Input id="designation" {...register("designation")} />
          {errors.designation ? (
            <p className="text-xs text-destructive">
              {errors.designation.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile Number *</Label>
          <Input
            id="mobile"
            type="tel"
            maxLength={10}
            inputMode="numeric"
            {...register("mobile")}
          />
          {errors.mobile ? (
            <p className="text-xs text-destructive">{errors.mobile.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="emailid">Email ID</Label>
          <Input id="emailid" type="email" {...register("emailid")} />
          {errors.emailid ? (
            <p className="text-xs text-destructive">{errors.emailid.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="landline">Landline</Label>
          <Input id="landline" {...register("landline")} />
        </div>

        <div className="space-y-1.5">
          <Controller
            name="lastContactedOn"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date"
                value={field.value ?? null}
                onChange={(d) => field.onChange(d)}
                displayFormat="dd/MM/yyyy"
              />
            )}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="details">Details</Label>
          <Textarea id="details" rows={3} {...register("details")} />
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

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
