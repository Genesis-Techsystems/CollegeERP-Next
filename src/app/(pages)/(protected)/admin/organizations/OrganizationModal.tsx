"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  Controller,
  type Resolver,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
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
import { MINIO_URL } from "@/config/constants/api";
import noImgLogo from "@/assets/images/no-img-logo.png";

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

const FORM_ROW =
  "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4";

function parseYmd(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const LOGO_ACCEPT = ".png,.jpg,.jpeg,image/png,image/jpeg";
const LOGO_ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
const LOGO_ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const LOGO_INVALID_MESSAGE = "Logo must be a .png, .jpg, or .jpeg file only.";

function isAllowedLogoFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (LOGO_ALLOWED_EXTENSIONS.has(extension)) return true;
  if (file.type && LOGO_ALLOWED_MIME_TYPES.has(file.type.toLowerCase()))
    return true;
  return false;
}

function resolveOrgLogoUrl(logoPath?: string | null): string | null {
  if (!logoPath) return null;
  if (/^(https?:\/\/|data:)/i.test(logoPath)) return logoPath;
  const base = String(MINIO_URL ?? "").replace(/\/?$/, "/");
  return `${base}${logoPath.replace(/^\/+/, "")}`;
}

function toDigitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return maxLength != null ? digits.slice(0, maxLength) : digits;
}

function bindDigitsField(
  register: UseFormRegister<FormValues>,
  name:
    | "pincode"
    | "mobileNumber"
    | "landlineNumber"
    | "fax"
    | "noIssuedLicenses",
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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: String(c.countryId),
        label: c.countryName,
      })),
    [countries],
  );
  const stateOptions = useMemo(
    () => states.map((s) => ({ value: String(s.stateId), label: s.stateName })),
    [states],
  );
  const districtOptions = useMemo(
    () =>
      districts.map((d) => ({
        value: String(d.districtId),
        label: d.districtName,
      })),
    [districts],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: String(c.cityId), label: c.cityName })),
    [cities],
  );

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
    if (organization) {
      setLogoPreview(
        resolveOrgLogoUrl(organization.logoPath ?? organization.logoFilename),
      );
    } else {
      setLogoPreview(null);
    }
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

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }

  function clearSelectedLogo() {
    setLogoPreview(null);
    setLogoError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

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
        savedOrg = await updateOrganization(
          organization!.organizationId,
          data,
          organization!,
        );
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
        className="w-[calc(70vw-2rem)] overflow-x-hidden sm:max-w-3xl"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Organization" : "Add Organization"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Org Name, Org Code, Logo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <FormField
              label="Organization Name"
              required
              error={errors.orgName?.message}
              htmlFor="orgName"
              className="min-w-0 sm:col-span-5"
            >
              <Input
                id="orgName"
                {...register("orgName")}
                placeholder="e.g. ABC University"
              />
            </FormField>
            <FormField
              label="Organization Code"
              required
              error={errors.orgCode?.message}
              htmlFor="orgCode"
              className="min-w-0 sm:col-span-3"
            >
              <Input
                id="orgCode"
                {...register("orgCode")}
                placeholder="e.g. ABCU"
              />
            </FormField>
            <FormField
              label="Logo (.png, .jpg, .jpeg)"
              error={logoError ?? undefined}
              className="min-w-0 sm:col-span-4"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative shrink-0">
                  <img
                    src={logoPreview ?? noImgLogo.src}
                    alt="Organization logo preview"
                    className="h-10 w-10 rounded-full border border-[#d7dce5] bg-white object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = noImgLogo.src;
                    }}
                  />
                  {logoPreview ? (
                    <button
                      type="button"
                      title="Remove logo"
                      aria-label="Remove logo"
                      onClick={clearSelectedLogo}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-red-600"
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
                <Input
                  type="file"
                  accept={LOGO_ACCEPT}
                  ref={fileRef}
                  onChange={handleLogoChange}
                  className="min-w-0 flex-1 cursor-pointer py-1.5 file:mr-2 file:rounded-md file:border-0 file:bg-[#eef2f7] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-600"
                />
              </div>
            </FormField>
          </div>

          {/* Row 2: Address, Country, State */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <FormField
              label="Address"
              required
              error={errors.address?.message}
              htmlFor="address"
              className="min-w-0 sm:col-span-12"
            >
              <Input
                id="address"
                {...register("address")}
                placeholder="Street, area, city"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="min-w-0 sm:col-span-4">
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Country"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("stateId", undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined);
                    }}
                    options={countryOptions}
                    placeholder="Select country"
                    searchable
                  />
                )}
              />
            </div>

            <div className="min-w-0 sm:col-span-4">
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="State"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined);
                    }}
                    options={stateOptions}
                    placeholder="Select state"
                    searchable
                    disabled={!countryId}
                  />
                )}
              />
            </div>
            <div className="min-w-0 sm:col-span-4">
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="District"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("cityId", undefined);
                    }}
                    options={districtOptions}
                    placeholder="Select district"
                    searchable
                    disabled={!stateId}
                    error={errors.districtId?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Row 3: District to Pincode in one line */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="min-w-0 sm:col-span-4">
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="City"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={cityOptions}
                    placeholder="Select city"
                    searchable
                    disabled={!districtId}
                  />
                )}
              />
            </div>
            <div className="min-w-0 sm:col-span-4">
              <FormField
                label="Mandal"
                required
                error={errors.mandal?.message}
                htmlFor="mandal"
              >
                <Input
                  id="mandal"
                  {...register("mandal")}
                  placeholder="e.g. Kukatpally"
                />
              </FormField>
            </div>
            <div className="min-w-0 sm:col-span-4">
              <FormField
                label="Pincode"
                required
                error={errors.pincode?.message}
                htmlFor="pincode"
              >
                <Input
                  id="pincode"
                  {...bindDigitsField(register, "pincode", 6)}
                  placeholder="6-digit pincode"
                />
              </FormField>
            </div>
          </div>

          {/* Row 4: Mobile No, Landline No, Email, Fax */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <FormField
              label="Mobile Number"
              error={errors.mobileNumber?.message}
              htmlFor="mobileNumber"
            >
              <Input
                id="mobileNumber"
                {...bindDigitsField(register, "mobileNumber", 10)}
                placeholder="10-digit number"
              />
            </FormField>
            <FormField
              label="Landline Number"
              error={errors.landlineNumber?.message}
              htmlFor="landlineNumber"
            >
              <Input
                id="landlineNumber"
                {...bindDigitsField(register, "landlineNumber", 15)}
                placeholder="Landline number"
              />
            </FormField>
            <FormField
              label="Email"
              error={errors.email?.message}
              htmlFor="email"
            >
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="org@example.com"
              />
            </FormField>
            <FormField label="Fax" error={errors.fax?.message} htmlFor="fax">
              <Input
                id="fax"
                {...bindDigitsField(register, "fax", 15)}
                placeholder="Fax number"
              />
            </FormField>
          </div>

          {/* Row 5: Google URL, Facebook URL, LinkedIn URL, Website URL */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <FormField label="Google URL" htmlFor="googleUrl">
              <Input
                id="googleUrl"
                {...register("googleUrl")}
                placeholder="https://maps.google.com/..."
              />
            </FormField>
            <FormField label="Facebook URL" htmlFor="facebookUrl">
              <Input
                id="facebookUrl"
                {...register("facebookUrl")}
                placeholder="https://facebook.com/..."
              />
            </FormField>
            <FormField label="LinkedIn URL" htmlFor="linkedinUrl">
              <Input
                id="linkedinUrl"
                {...register("linkedinUrl")}
                placeholder="https://linkedin.com/..."
              />
            </FormField>
            <FormField label="Website URL" htmlFor="url">
              <Input
                id="url"
                {...register("url")}
                placeholder="https://www.example.com"
              />
            </FormField>
          </div>

          {/* Row 6: License From Date, License To Date, No. of Licenses */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Controller
              name="licenseFdate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="License From Date"
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? toDateStr(d) : "")}
                />
              )}
            />
            <Controller
              name="licenseTdate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="License To Date"
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? toDateStr(d) : "")}
                  minDate={parseYmd(licenseFdate) ?? undefined}
                />
              )}
            />
            <FormField
              label="No. of Issued Licenses"
              error={errors.noIssuedLicenses?.message}
              htmlFor="noIssuedLicenses"
            >
              <Input
                id="noIssuedLicenses"
                {...bindDigitsField(register, "noIssuedLicenses", 6)}
                placeholder="e.g. 100"
              />
            </FormField>
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                // label="Active"
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-3 sm:justify-end">
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
