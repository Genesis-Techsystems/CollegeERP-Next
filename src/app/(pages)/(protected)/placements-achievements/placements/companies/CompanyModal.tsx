"use client";

/**
 * Angular parity: company-modal
 * Required: companyname, location, website, lastParticipatedDate, phoneNumber (pattern [6-9][0-9]{9})
 * Optional: linkedin, companydescription, primaryContactDetails
 * Active + conditional reason
 */

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompany, updateCompany } from "@/services";
import type { Company } from "@/types/placements";
import { toastError, toastSuccess } from "@/lib/toast";

/** Angular CONSTANTS.patterns.phNo */
const PHONE_PATTERN = /^[6-9][0-9]{9}$/;

const schema = z
  .object({
    companyname: z.string().min(1, "Company name is required"),
    location: z.string().min(1, "Location is required"),
    website: z.string().min(1, "Website is required"),
    linkedin: z.string().optional(),
    companydescription: z.string().optional(),
    lastParticipatedDate: z.date({
      message: "Last participated date is required",
    }),
    phoneNumber: z
      .string()
      .min(1, "Phone number is required")
      .regex(PHONE_PATTERN, "Enter 10 digit number"),
    primaryContactDetails: z.string().optional(),
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

export interface CompanyModalProps {
  open: boolean;
  onClose: () => void;
  editData: Company | null;
  onSaved: () => void;
}

export function CompanyModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<CompanyModalProps>) {
  const isEditing = editData != null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      companyname: "",
      location: "",
      website: "",
      linkedin: "",
      companydescription: "",
      lastParticipatedDate: new Date(),
      phoneNumber: "",
      primaryContactDetails: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    // Angular: defaults isActive=true, reason='active', lastParticipatedDate=moment()
    reset(
      editData
        ? {
            companyname: editData.companyname ?? "",
            location: editData.location ?? "",
            website: editData.website ?? "",
            linkedin: editData.linkedin ?? "",
            companydescription: editData.companydescription ?? "",
            lastParticipatedDate: parseDate(editData.lastParticipatedDate),
            phoneNumber: String(editData.phoneNumber ?? ""),
            primaryContactDetails: editData.primaryContactDetails ?? "",
            isActive: editData.isActive ?? true,
            reason: editData.reason ?? "active",
          }
        : {
            companyname: "",
            location: "",
            website: "",
            linkedin: "",
            companydescription: "",
            lastParticipatedDate: new Date(),
            phoneNumber: "",
            primaryContactDetails: "",
            isActive: true,
            reason: "active",
          },
    );
  }, [open, editData, reset]);

  const isActive = watch("isActive");

  async function onSubmit(values: FormValues) {
    const payload: Partial<Company> = {
      companyname: values.companyname.trim(),
      location: values.location.trim(),
      website: values.website.trim(),
      linkedin: values.linkedin?.trim() || undefined,
      companydescription: values.companydescription?.trim() || undefined,
      // Angular momentWithDateFormatYMD
      lastParticipatedDate: format(values.lastParticipatedDate, "yyyy-MM-dd"),
      phoneNumber: values.phoneNumber.trim(),
      primaryContactDetails: values.primaryContactDetails?.trim() || undefined,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    // Angular edit: preserve createdDt on update payload
    if (isEditing && editData?.createdDt) {
      payload.createdDt = editData.createdDt;
    }

    try {
      if (isEditing && editData?.companyId) {
        await updateCompany(editData.companyId, {
          ...payload,
          companyId: editData.companyId,
        });
        toastSuccess("Company updated successfully");
      } else {
        await createCompany(payload);
        toastSuccess("Company created successfully");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} company`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Company" : "Add Company"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="companyname">Company Name *</Label>
          <Input id="companyname" {...register("companyname")} />
          {errors.companyname ? (
            <p className="text-xs text-destructive">
              {errors.companyname.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location *</Label>
          <Input id="location" {...register("location")} />
          {errors.location ? (
            <p className="text-xs text-destructive">
              {errors.location.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website">Website *</Label>
          <Input id="website" {...register("website")} />
          {errors.website ? (
            <p className="text-xs text-destructive">{errors.website.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedin">Linkedin</Label>
          <Input id="linkedin" {...register("linkedin")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <Input
            id="phoneNumber"
            type="tel"
            maxLength={10}
            inputMode="numeric"
            {...register("phoneNumber")}
          />
          {errors.phoneNumber ? (
            <p className="text-xs text-destructive">
              {errors.phoneNumber.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="companydescription">Company Description</Label>
          <Textarea
            id="companydescription"
            rows={3}
            {...register("companydescription")}
          />
        </div>

        <div className="space-y-1.5">
          <Controller
            name="lastParticipatedDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Last Participated Date *"
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? new Date())}
                displayFormat="dd/MM/yyyy"
                clearable={false}
                error={errors.lastParticipatedDate?.message}
              />
            )}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="primaryContactDetails">Primary Contact Details</Label>
          <Textarea
            id="primaryContactDetails"
            rows={3}
            {...register("primaryContactDetails")}
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
    </FormModal>
  );
}
