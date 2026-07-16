"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import noImgLogo from "@/assets/images/no-img-logo.png";
import { Select, type SelectOption } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
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
  createCollege,
  listActiveCampuses,
  listActiveOrganizations,
  listActiveUniversities,
  listAffiliations,
  listCitiesByDistrict,
  listCollegeTypes,
  listCountries,
  listDistrictsByState,
  listStatesByCountry,
  updateCollege,
  uploadCollegeLogo,
} from "@/services";
import type { College } from "@/types/college";
import type { Campus } from "@/types/campus";
import type {
  Organization,
  Country,
  State,
  District,
  City,
} from "@/types/organization";
import type { University } from "@/types/university";
import { requiredNumber } from "@/lib/zod-fields";

const schema = z.object({
  organizationId: requiredNumber("Organization is required"),
  universityId: requiredNumber("University is required"),
  campusId: requiredNumber("Campus is required"),
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  districtId: requiredNumber("District is required"),
  cityId: requiredNumber("City is required"),
  collegeName: z.string().min(1, "College name is required"),
  collegeShortName: z.string().optional(),
  collegeCode: z.string().min(1, "College code is required"),
  affiliatedTo: requiredNumber("Affiliated to is required"),
  address: z.string().min(1, "Address is required"),
  mandal: z.string().min(1, "Mandal is required"),
  pincode: z.string().min(1, "Pincode is required"),
  sortOrder: requiredNumber("Sort order is required"),
  collegeType: z.number().optional(),
  approvedBy: z.string().optional(),
  mobileNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
      "Enter a valid 10-digit mobile number",
    ),
  landlineNumber: z.string().optional(),
  fax: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Enter a valid email address",
    ),
  facebookUrl: z.string().optional(),
  googleUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  isActive: z.boolean(),
  isUniversity: z.boolean().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELD_INPUT =
  "h-9 min-w-0 w-full rounded-lg border border-[#d7dce5] bg-white px-3 text-[13px] font-medium text-foreground shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-500 placeholder:font-normal focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/12 disabled:bg-muted/40";
const FIELD_LABEL =
  "text-[12px] font-semibold leading-tight tracking-wide text-[hsl(218_32%_22%)]";
const FORM_ROW =
  "grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4";
const SELECT_FIELD =
  "gap-0 [&>button]:h-9 [&>button]:rounded-lg [&>button]:border-[#d7dce5] [&>button]:bg-white [&>button]:px-3 [&>button]:text-[13px] [&>button]:font-medium [&>button]:shadow-none [&>button]:focus-visible:border-primary/45 [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-primary/12";

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
    <div className={className ?? "min-w-0 space-y-1"}>
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

interface CollegeModalProps {
  open: boolean;
  onClose: () => void;
  college: College | null;
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

export default function CollegeModal({
  open,
  onClose,
  college,
  onSaved,
}: Readonly<CollegeModalProps>) {
  const isEditing = college != null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [affiliations, setAffiliations] = useState<SelectOption[]>([]);
  const [collegeTypes, setCollegeTypes] = useState<SelectOption[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      universityId: undefined,
      campusId: undefined,
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      collegeName: "",
      collegeShortName: "",
      collegeCode: "",
      affiliatedTo: undefined,
      address: "",
      mandal: "",
      pincode: "",
      sortOrder: undefined,
      collegeType: undefined,
      approvedBy: "",
      mobileNumber: "",
      landlineNumber: "",
      fax: "",
      email: "",
      facebookUrl: "",
      googleUrl: "",
      linkedinUrl: "",
      isActive: true,
      isUniversity: false,
      reason: "",
    },
  });

  const countryId = watch("countryId");
  const stateId = watch("stateId");
  const districtId = watch("districtId");

  const organizationOptions = useMemo(
    () =>
      asOptions(
        organizations,
        (r) => r.organizationId,
        (r) => r.orgName,
      ),
    [organizations],
  );
  const universityOptions = useMemo(
    () =>
      asOptions(
        universities,
        (r) => r.universityId,
        (r) => r.universityName,
      ),
    [universities],
  );
  const campusOptions = useMemo(
    () =>
      asOptions(
        campuses,
        (r) => r.campusId,
        (r) => r.campusName,
      ),
    [campuses],
  );
  const countryOptions = useMemo(
    () =>
      asOptions(
        countries,
        (r) => r.countryId,
        (r) => r.countryName,
      ),
    [countries],
  );
  const stateOptions = useMemo(
    () =>
      asOptions(
        states,
        (r) => r.stateId,
        (r) => r.stateName,
      ),
    [states],
  );
  const districtOptions = useMemo(
    () =>
      asOptions(
        districts,
        (r) => r.districtId,
        (r) => r.districtName,
      ),
    [districts],
  );
  const cityOptions = useMemo(
    () =>
      asOptions(
        cities,
        (r) => r.cityId,
        (r) => r.cityName,
      ),
    [cities],
  );

  useEffect(() => {
    if (!open) return;
    Promise.all([
      listActiveOrganizations(),
      listActiveUniversities(),
      listActiveCampuses(),
      listCountries(),
      listAffiliations(),
      listCollegeTypes(),
    ])
      .then(
        ([
          orgRows,
          univRows,
          campusRows,
          countryRows,
          affiliationRows,
          typeRows,
        ]) => {
          setOrganizations(orgRows);
          setUniversities(univRows);
          setCampuses(campusRows);
          setCountries(countryRows);
          setAffiliations(affiliationRows);
          setCollegeTypes(typeRows);
        },
      )
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (college) {
      reset({
        organizationId: college.organizationId,
        universityId: college.universityId,
        campusId: college.campusId,
        countryId: college.countryId ?? undefined,
        stateId: college.stateId ?? undefined,
        districtId: college.districtId,
        cityId: college.cityId,
        collegeName: college.collegeName,
        collegeShortName: college.collegeShortName ?? "",
        collegeCode: college.collegeCode,
        affiliatedTo: college.affiliatedTo,
        address: college.address,
        mandal: college.mandal,
        pincode: college.pincode,
        sortOrder: Number(college.sortOrder ?? 0),
        collegeType: college.collegeType ?? undefined,
        approvedBy: college.approvedBy ?? "",
        mobileNumber: college.mobileNumber ?? "",
        landlineNumber: college.landlineNumber ?? "",
        fax: college.fax ?? "",
        email: college.email ?? "",
        facebookUrl: college.facebookUrl ?? "",
        googleUrl: college.googleUrl ?? "",
        linkedinUrl: college.linkedinUrl ?? "",
        isActive: college.isActive,
        isUniversity: college.isUniversity ?? false,
        reason: college.isActive ? "" : (college.reason ?? ""),
      });
      setLogoPreview(college.logo ?? null);
    } else {
      reset();
      setLogoPreview(null);
    }
    setStates([]);
    setDistricts([]);
    setCities([]);
    setSubmitError(null);
  }, [college, open, reset]);

  useEffect(() => {
    if (countryId == null) {
      setStates([]);
      setDistricts([]);
      setCities([]);
      return;
    }
    listStatesByCountry(countryId).then(setStates).catch(console.error);
  }, [countryId]);

  useEffect(() => {
    if (stateId == null) {
      setDistricts([]);
      setCities([]);
      return;
    }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error);
  }, [stateId]);

  useEffect(() => {
    if (districtId == null) {
      setCities([]);
      return;
    }
    listCitiesByDistrict(districtId).then(setCities).catch(console.error);
  }, [districtId]);

  useEffect(() => {
    if (!college || !open) return;
    if (college.countryId)
      listStatesByCountry(college.countryId)
        .then(setStates)
        .catch(console.error);
    if (college.stateId)
      listDistrictsByState(college.stateId)
        .then(setDistricts)
        .catch(console.error);
    if (college.districtId)
      listCitiesByDistrict(college.districtId)
        .then(setCities)
        .catch(console.error);
  }, [college, open]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      let savedCollege: College;
      if (isEditing) {
        savedCollege = await updateCollege(college!.collegeId, data, college!);
      } else {
        savedCollege = await createCollege(data as Omit<College, "collegeId">);
      }

      const file = fileRef.current?.files?.[0];
      if (file) {
        await uploadCollegeLogo(
          savedCollege.collegeId,
          savedCollege.universityId,
          savedCollege.collegeCode,
          file,
        );
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save college",
      );
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
      <DialogContent
        closeOnOutsideClick={false}
        className="w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-6xl"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit College" : "Add College"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className={FORM_ROW}>
            <Field
              label="Organization"
              required
              error={errors.organizationId?.message}
              className="min-w-0 space-y-1"
            >
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={organizationOptions}
                    placeholder="Select organization"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="University"
              required
              error={errors.universityId?.message}
              className="min-w-0 space-y-1"
            >
              <Controller
                name="universityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={universityOptions}
                    placeholder="Select university"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="Campus"
              required
              error={errors.campusId?.message}
              className="min-w-0 space-y-1"
            >
              <Controller
                name="campusId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={campusOptions}
                    placeholder="Select campus"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="College Name"
              required
              error={errors.collegeName?.message}
              htmlFor="collegeName"
              className="min-w-0 space-y-1"
            >
              <Input
                id="collegeName"
                className={FIELD_INPUT}
                placeholder="College name"
                {...register("collegeName")}
              />
            </Field>
          </div>

          <div className={`${FORM_ROW} lg:grid-cols-12`}>
            <Field
              label="College Code"
              required
              error={errors.collegeCode?.message}
              htmlFor="collegeCode"
              className="min-w-0 space-y-1 lg:col-span-3"
            >
              <Input
                id="collegeCode"
                className={FIELD_INPUT}
                placeholder="e.g. COE01"
                {...register("collegeCode")}
              />
            </Field>
            <Field
              label="Short Name"
              htmlFor="collegeShortName"
              className="min-w-0 space-y-1 lg:col-span-3"
            >
              <Input
                id="collegeShortName"
                className={FIELD_INPUT}
                placeholder="Short name"
                {...register("collegeShortName")}
              />
            </Field>
            <Field
              label="Affiliated To"
              required
              error={errors.affiliatedTo?.message}
              className="min-w-0 space-y-1 lg:col-span-3"
            >
              <Controller
                name="affiliatedTo"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={affiliations}
                    placeholder="Select affiliation"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="Sort Order"
              required
              error={errors.sortOrder?.message}
              htmlFor="sortOrder"
              className="min-w-0 space-y-1 lg:col-span-3"
            >
              <Input
                id="sortOrder"
                type="number"
                className={FIELD_INPUT}
                placeholder="1"
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className={`${FORM_ROW} lg:grid-cols-12`}>
            <Field
              label="Logo (.png, .jpg, .jpeg)"
              className="min-w-0 space-y-1 lg:col-span-5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={logoPreview ?? noImgLogo.src}
                  alt="College logo preview"
                  className="h-9 w-9 shrink-0 rounded-md border border-[#d7dce5] object-contain bg-white"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = noImgLogo.src;
                  }}
                />
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  ref={fileRef}
                  onChange={handleLogoChange}
                  className={`${FIELD_INPUT} min-w-0 flex-1 cursor-pointer py-1.5 file:mr-2 file:rounded-md file:border-0 file:bg-[#eef2f7] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-600`}
                />
              </div>
            </Field>
            <Field
              label="Address"
              required
              error={errors.address?.message}
              htmlFor="address"
              className="min-w-0 space-y-1 lg:col-span-7"
            >
              <Input
                id="address"
                className={FIELD_INPUT}
                placeholder="Street, area, city"
                {...register("address")}
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field label="Country" className="min-w-0 space-y-1">
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("stateId", undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined as unknown as number);
                    }}
                    options={countryOptions}
                    placeholder="Select country"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field label="State" className="min-w-0 space-y-1">
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("districtId", undefined as unknown as number);
                      setValue("cityId", undefined as unknown as number);
                    }}
                    options={stateOptions}
                    placeholder="Select state"
                    disabled={!countryId || stateOptions.length === 0}
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="District"
              required
              error={errors.districtId?.message}
              className="min-w-0 space-y-1"
            >
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("cityId", undefined as unknown as number);
                    }}
                    options={districtOptions}
                    placeholder="Select district"
                    disabled={!stateId || districtOptions.length === 0}
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="City"
              required
              error={errors.cityId?.message}
              className="min-w-0 space-y-1"
            >
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={cityOptions}
                    placeholder="Select city"
                    disabled={!districtId || cityOptions.length === 0}
                    searchable
                    className={SELECT_FIELD}
                  />
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
              className="min-w-0 space-y-1"
            >
              <Input
                id="mandal"
                className={FIELD_INPUT}
                placeholder="Mandal"
                {...register("mandal")}
              />
            </Field>
            <Field
              label="Pincode"
              required
              error={errors.pincode?.message}
              htmlFor="pincode"
              className="min-w-0 space-y-1"
            >
              <Input
                id="pincode"
                className={FIELD_INPUT}
                placeholder="6-digit pincode"
                {...register("pincode")}
              />
            </Field>
            <Field label="College Type" className="min-w-0 space-y-1">
              <Controller
                name="collegeType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={collegeTypes}
                    placeholder="Select type"
                    searchable
                    className={SELECT_FIELD}
                  />
                )}
              />
            </Field>
            <Field
              label="Approved By"
              htmlFor="approvedBy"
              className="min-w-0 space-y-1"
            >
              <Input
                id="approvedBy"
                className={FIELD_INPUT}
                placeholder="Approving body"
                {...register("approvedBy")}
              />
            </Field>
          </div>

          <div className={FORM_ROW}>
            <Field
              label="Mobile No"
              error={errors.mobileNumber?.message}
              htmlFor="mobileNumber"
              className="min-w-0 space-y-1"
            >
              <Input
                id="mobileNumber"
                className={FIELD_INPUT}
                placeholder="10-digit mobile"
                {...register("mobileNumber")}
              />
            </Field>
            <Field
              label="Landline No"
              htmlFor="landlineNumber"
              className="min-w-0 space-y-1"
            >
              <Input
                id="landlineNumber"
                className={FIELD_INPUT}
                placeholder="Landline number"
                {...register("landlineNumber")}
              />
            </Field>
            <Field
              label="Email"
              error={errors.email?.message}
              htmlFor="email"
              className="min-w-0 space-y-1"
            >
              <Input
                id="email"
                className={FIELD_INPUT}
                placeholder="email@college.edu"
                {...register("email")}
              />
            </Field>
            <Field label="Fax" htmlFor="fax" className="min-w-0 space-y-1">
              <Input
                id="fax"
                className={FIELD_INPUT}
                placeholder="Fax number"
                {...register("fax")}
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
                  onReasonChange={(value) => setValue("reason", value)}
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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
