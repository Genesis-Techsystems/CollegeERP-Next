"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller, type Resolver, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusField } from "@/common/components/forms";
import { toDateStr } from "@/common/generic-functions";
import type {
  Organization,
  Country,
  State,
  District,
  City,
} from "@/types/organization";
import {
  createOrganization,
  updateOrganization,
  uploadOrganizationLogo,
  listCountries,
  listStatesByCountry,
  listDistrictsByState,
  listCitiesByDistrict,
} from "@/services/admin/organization";
import { requiredNumber } from "@/lib/zod-fields";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  orgCode: z.string().min(1, "Organization code is required"),
  address: z.string().min(1, "Address is required"),
  countryId: z.number().optional().nullable(),
  stateId: z.number().optional().nullable(),
  districtId: requiredNumber("District is required"),
  cityId: z.number().optional().nullable(),
  mandal: z.string().min(1, "Mandal is required"),
  pincode: z
    .string()
    .min(1, "Pincode is required")
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  mobileNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
      "Enter a valid 10-digit mobile number",
    ),
  landlineNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d+$/.test(val),
      "Landline number must contain digits only",
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Enter a valid email address",
    ),
  fax: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), "Fax must contain digits only"),
  googleUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  url: z.string().optional(),
  licenseFdate: z.string().optional(),
  licenseTdate: z.string().optional(),
  noIssuedLicenses: z.preprocess(
    (val) => (val === "" || val == null ? undefined : Number(val)),
    z
      .number()
      .int("No. of licenses must be a whole number")
      .nonnegative("No. of licenses cannot be negative")
      .optional(),
  ),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELD_INPUT =
  "h-9 min-w-0 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-[13px] font-medium text-foreground shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 placeholder:font-normal focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/12 disabled:bg-muted/40";
const FIELD_SELECT = `${FIELD_INPUT} [&>span]:text-left [&>span[data-placeholder]]:font-normal [&>span[data-placeholder]]:text-slate-500`;
const FIELD_DATE = `${FIELD_INPUT} org-modal-date-input pr-10`;
const FIELD_LABEL =
  "text-[12px] font-semibold leading-tight tracking-wide text-[hsl(218_32%_22%)]";
const FORM_ROW =
  "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4";

const LOGO_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg";
const LOGO_ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
const LOGO_ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const LOGO_INVALID_MESSAGE = "Logo must be a .png, .jpg, or .jpeg file only.";

function isAllowedLogoFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (LOGO_ALLOWED_EXTENSIONS.has(extension)) return true;
  if (file.type && LOGO_ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) return true;
  return false;
}

function toDigitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return maxLength != null ? digits.slice(0, maxLength) : digits;
}

function bindDigitsField(
  register: UseFormRegister<FormValues>,
  name: "pincode" | "mobileNumber" | "landlineNumber" | "fax" | "noIssuedLicenses",
  maxLength?: number,
) {
  const { onChange, ...rest } = register(name);
  return {
    ...rest,
    inputMode: "numeric" as const,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = toDigitsOnly(e.target.value, maxLength);
      onChange(e);
    },
  };
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "min-w-0 space-y-1.5"}>
      <Label htmlFor={htmlFor} className={FIELD_LABEL}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrganizationModalProps {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSaved: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function OrganizationModal({
  open,
  onClose,
  organization,
  onSaved,
}: OrganizationModalProps) {
  const isEditing = organization != null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      orgName: "",
      orgCode: "",
      address: "",
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      mandal: "",
      pincode: "",
      mobileNumber: "",
      landlineNumber: "",
      email: "",
      fax: "",
      googleUrl: "",
      facebookUrl: "",
      linkedinUrl: "",
      url: "",
      licenseFdate: "",
      licenseTdate: "",
      noIssuedLicenses: undefined,
      isActive: true,
      reason: "",
    },
  });

  const countryId = watch("countryId");
  const stateId = watch("stateId");
  const districtId = watch("districtId");

  // Load countries when modal opens
  useEffect(() => {
    if (!open) return;
    listCountries().then(setCountries).catch(console.error);
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (organization) {
      reset({
        orgName: organization.orgName,
        orgCode: organization.orgCode,
        address: organization.address,
        countryId: organization.countryId ?? undefined,
        stateId: organization.stateId ?? undefined,
        districtId: organization.districtId,
        cityId: organization.cityId ?? undefined,
        mandal: organization.mandal || "",
        pincode: String(organization.pincode || ""),
        mobileNumber: organization.mobileNumber || "",
        landlineNumber: organization.landlineNumber || "",
        email: organization.email || "",
        fax: organization.fax || "",
        googleUrl: organization.googleUrl || "",
        facebookUrl: organization.facebookUrl || "",
        linkedinUrl: organization.linkedinUrl || "",
        url: organization.url || "",
        licenseFdate: toDateStr(organization.licenseFdate),
        licenseTdate: toDateStr(organization.licenseTdate),
        noIssuedLicenses: organization.noIssuedLicenses ?? undefined,
        isActive: organization.isActive,
        reason: organization.reason || "",
      });
    } else {
      reset({
        orgName: "",
        orgCode: "",
        address: "",
        countryId: undefined,
        stateId: undefined,
        districtId: undefined,
        cityId: undefined,
        mandal: "",
        pincode: "",
        mobileNumber: "",
        landlineNumber: "",
        email: "",
        fax: "",
        googleUrl: "",
        facebookUrl: "",
        linkedinUrl: "",
        url: "",
        licenseFdate: "",
        licenseTdate: "",
        noIssuedLicenses: undefined,
        isActive: true,
        reason: "",
      });
    }
    setStates([]);
    setDistricts([]);
    setCities([]);
    setSubmitError(null);
    setLogoError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [organization, open, reset]);

  // Cascade: load states when countryId changes
  useEffect(() => {
    if (countryId == null) {
      setStates([]);
      setDistricts([]);
      setCities([]);
      return;
    }
    listStatesByCountry(countryId).then(setStates).catch(console.error);
  }, [countryId]);

  // Cascade: load districts when stateId changes
  useEffect(() => {
    if (stateId == null) {
      setDistricts([]);
      setCities([]);
      return;
    }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error);
  }, [stateId]);

  // Cascade: load cities when districtId changes
  useEffect(() => {
    if (districtId == null) {
      setCities([]);
      return;
    }
    listCitiesByDistrict(districtId).then(setCities).catch(console.error);
  }, [districtId]);

  // Load dependent data when editing (cascade from saved IDs)
  useEffect(() => {
    if (!organization || !open) return;
    if (organization.countryId) {
      listStatesByCountry(organization.countryId)
        .then(setStates)
        .catch(console.error);
    }
    if (organization.stateId) {
      listDistrictsByState(organization.stateId)
        .then(setDistricts)
        .catch(console.error);
    }
    if (organization.districtId) {
      listCitiesByDistrict(organization.districtId)
        .then(setCities)
        .catch(console.error);
    }
  }, [organization, open]);

  // Mirror Angular's calDays(): auto-correct licenseTdate if it falls before licenseFdate
  const licenseFdate = watch("licenseFdate");
  useEffect(() => {
    const tdate = watch("licenseTdate");
    if (licenseFdate && tdate && tdate < licenseFdate) {
      setValue("licenseTdate", licenseFdate);
    }
  }, [licenseFdate]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);

    const file = fileRef.current?.files?.[0];
    if (file && !isAllowedLogoFile(file)) {
      setLogoError(LOGO_INVALID_MESSAGE);
      return;
    }

    try {
      let savedOrg: Organization;
      if (isEditing) {
        savedOrg = await updateOrganization(organization!.organizationId, data, organization!);
      } else {
        savedOrg = await createOrganization(
          data as Omit<Organization, "organizationId">,
        );
      }

      // Upload logo if a valid file was selected (add + edit)
      if (file) {
        await uploadOrganizationLogo(
          savedOrg.organizationId,
          savedOrg.orgCode,
          file,
        );
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save organization",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        closeOnOutsideClick={false}
        className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-6xl"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Organization" : "Add Organization"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className={`${FORM_ROW} lg:grid-cols-12`}>
            <Field
              label="Organization Name"
              required
              error={errors.orgName?.message}
              htmlFor="orgName"
              className="min-w-0 space-y-1.5 lg:col-span-5"
            >
              <Input
                id="orgName"
                className={FIELD_INPUT}
                {...register("orgName")}
                placeholder="e.g. ABC University"
              />
            </Field>
            <Field
              label="Organization Code"
              required
              error={errors.orgCode?.message}
              htmlFor="orgCode"
              className="min-w-0 space-y-1.5 lg:col-span-3"
            >
              <Input
                id="orgCode"
                className={FIELD_INPUT}
                {...register("orgCode")}
                placeholder="e.g. ABCU"
              />
            </Field>
            <Field
              label="Logo (.png, .jpg, .jpeg)"
              error={logoError ?? undefined}
              className="min-w-0 space-y-1.5 lg:col-span-4"
            >
              <Input
                type="file"
                accept={LOGO_ACCEPT}
                ref={fileRef}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (!selected) {
                    setLogoError(null);
                    return;
                  }
                  if (!isAllowedLogoFile(selected)) {
                    setLogoError(LOGO_INVALID_MESSAGE);
                    e.target.value = "";
                    return;
                  }
                  setLogoError(null);
                }}
                className={`${FIELD_INPUT} cursor-pointer py-1.5 file:mr-2 file:rounded-md file:border-0 file:bg-[#eef2f7] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-600`}
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field label="Country" className="min-w-0 space-y-1.5">
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("stateId", undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined);
                    }}
                  >
                    <SelectTrigger className={FIELD_SELECT}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem
                          key={c.countryId}
                          value={String(c.countryId)}
                        >
                          {c.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="State" className="min-w-0 space-y-1.5">
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined);
                    }}
                  >
                    <SelectTrigger className={FIELD_SELECT}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.stateId} value={String(s.stateId)}>
                          {s.stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="District"
              required
              error={errors.districtId?.message}
              className="min-w-0 space-y-1.5"
            >
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("cityId", undefined);
                    }}
                  >
                    <SelectTrigger className={FIELD_SELECT}>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem
                          key={d.districtId}
                          value={String(d.districtId)}
                        >
                          {d.districtName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="City" className="min-w-0 space-y-1.5">
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) =>
                      field.onChange(v ? Number(v) : undefined)
                    }
                  >
                    <SelectTrigger className={FIELD_SELECT}>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.cityId} value={String(c.cityId)}>
                          {c.cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field
              label="Mandal"
              required
              error={errors.mandal?.message}
              htmlFor="mandal"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="mandal"
                className={FIELD_INPUT}
                {...register("mandal")}
                placeholder="e.g. Kukatpally"
              />
            </Field>
            <Field
              label="Pincode"
              required
              error={errors.pincode?.message}
              htmlFor="pincode"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="pincode"
                className={FIELD_INPUT}
                {...bindDigitsField(register, "pincode", 6)}
                placeholder="6-digit pincode"
              />
            </Field>
            <Field
              label="License From Date"
              htmlFor="licenseFdate"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="licenseFdate"
                type="date"
                className={FIELD_DATE}
                {...register("licenseFdate")}
              />
            </Field>
            <Field
              label="License To Date"
              htmlFor="licenseTdate"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="licenseTdate"
                type="date"
                className={FIELD_DATE}
                {...register("licenseTdate")}
                min={licenseFdate || undefined}
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field
              label="Mobile No"
              error={errors.mobileNumber?.message}
              htmlFor="mobileNumber"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="mobileNumber"
                className={FIELD_INPUT}
                {...bindDigitsField(register, "mobileNumber", 10)}
                placeholder="10-digit number"
              />
            </Field>
            <Field
              label="Landline No"
              error={errors.landlineNumber?.message}
              htmlFor="landlineNumber"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="landlineNumber"
                className={FIELD_INPUT}
                {...bindDigitsField(register, "landlineNumber", 15)}
                placeholder="Landline number"
              />
            </Field>
            <Field
              label="Email"
              error={errors.email?.message}
              htmlFor="email"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="email"
                type="email"
                className={FIELD_INPUT}
                {...register("email")}
                placeholder="org@example.com"
              />
            </Field>
            <Field
              label="Fax"
              error={errors.fax?.message}
              htmlFor="fax"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="fax"
                className={FIELD_INPUT}
                {...bindDigitsField(register, "fax", 15)}
                placeholder="Fax number"
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field
              label="Google URL"
              htmlFor="googleUrl"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="googleUrl"
                className={FIELD_INPUT}
                {...register("googleUrl")}
                placeholder="https://maps.google.com/..."
              />
            </Field>
            <Field
              label="Facebook URL"
              htmlFor="facebookUrl"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="facebookUrl"
                className={FIELD_INPUT}
                {...register("facebookUrl")}
                placeholder="https://facebook.com/..."
              />
            </Field>
            <Field
              label="LinkedIn URL"
              htmlFor="linkedinUrl"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="linkedinUrl"
                className={FIELD_INPUT}
                {...register("linkedinUrl")}
                placeholder="https://linkedin.com/..."
              />
            </Field>
            <Field
              label="Website URL"
              htmlFor="url"
              className="min-w-0 space-y-1.5"
            >
              <Input
                id="url"
                className={FIELD_INPUT}
                {...register("url")}
                placeholder="https://www.example.com"
              />
            </Field>
          </div>

          <div className={`${FORM_ROW} lg:grid-cols-12`}>
            <Field
              label="No. of Licenses"
              error={errors.noIssuedLicenses?.message}
              htmlFor="noIssuedLicenses"
              className="min-w-0 space-y-1.5 lg:col-span-3"
            >
              <Input
                id="noIssuedLicenses"
                className={FIELD_INPUT}
                {...bindDigitsField(register, "noIssuedLicenses", 6)}
                placeholder="e.g. 100"
              />
            </Field>
            <Field
              label="Address"
              required
              error={errors.address?.message}
              htmlFor="address"
              className="min-w-0 space-y-1.5 lg:col-span-9"
            >
              <Input
                id="address"
                className={FIELD_INPUT}
                {...register("address")}
                placeholder="Street, area, city"
              />
            </Field>
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
                  onReasonChange={(v) => setValue("reason", v)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 border-t border-border/60 pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[5.5rem]"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 min-w-[5.5rem]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : isEditing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
